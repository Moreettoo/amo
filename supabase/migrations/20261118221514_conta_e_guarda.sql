-- AMO: exclusao de conta, auditoria, expiracao e guarda (spec 9.1, 9.3 e 12).
--
-- Exclusao de conta: acontece dentro do proprio delete de auth.users. O
-- gatilho recusa se houver pedido pago e ainda nao entregue; cancela o que
-- aguarda pagamento; apaga o retrato pessoal dos pedidos. As chaves
-- estrangeiras fazem o resto: perfil, enderecos, comentarios e cotacoes
-- somem; pedidos.user_id vira nulo. Sem estado intermediario.
--
-- Codigos de erro (mensagem da excecao, SQLSTATE P0001):
--   sem_sessao, pedido_em_aberto

-- Uma funcao so apaga o retrato, para a exclusao e para a guarda de 180
-- dias: ficam bairro, cidade, UF e os 5 primeiros digitos do CEP.
create function privado.anonimizar_retrato(p_pedido uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.pedidos p
  set cliente_nome = null,
      cliente_celular = null,
      cliente_email = null,
      entrega_logradouro = null,
      entrega_numero = null,
      entrega_complemento = null,
      entrega_cep = left(p.entrega_cep, 5),
      anonimizado_em = now()
  where p.id = p_pedido and p.anonimizado_em is null;
$$;

create function privado.antes_de_excluir_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.pedidos p
    where p.user_id = old.id and p.status in ('pago', 'em_preparo', 'a_caminho')) then
    raise exception using errcode = 'P0001', message = 'pedido_em_aberto';
  end if;

  update public.pagamentos pg set status = 'cancelado'
  where pg.status = 'pendente'
    and pg.pedido_id in (
      select p.id from public.pedidos p where p.user_id = old.id and p.status = 'aguardando_pagamento');
  update public.pedidos p set status = 'cancelado', motivo_cancelamento = 'cliente'
  where p.user_id = old.id and p.status = 'aguardando_pagamento';

  perform privado.anonimizar_retrato(p.id) from public.pedidos p where p.user_id = old.id;
  return old;
end
$$;

create trigger amo_antes_de_excluir_conta
  before delete on auth.users
  for each row execute function privado.antes_de_excluir_conta();

-- Para a tela dizer antes se da para excluir, e por que nao.
create function public.pode_excluir_conta()
returns table (pode boolean, motivo text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'sem_sessao';
  end if;
  if exists (
    select 1 from public.pedidos p
    where p.user_id = v_uid and p.status in ('pago', 'em_preparo', 'a_caminho')) then
    return query select false, 'pedido_em_aberto'::text;
  else
    return query select true, null::text;
  end if;
end
$$;

grant execute on function public.pode_excluir_conta() to authenticated;

-- Quem mexeu em que: nomes das colunas alteradas, nunca os valores.
create table privado.auditoria (
  id bigint generated always as identity primary key,
  quando timestamptz not null default now(),
  ator uuid,
  papel text not null,
  acao text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  tabela text not null,
  registro text,
  colunas text[]
);

create index auditoria_quando on privado.auditoria (quando);
alter table privado.auditoria enable row level security;

create function privado.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo jsonb;
  v_velho jsonb;
  v_colunas text[];
  v_papel text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_velho := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_novo := to_jsonb(new);
  end if;
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_colunas
    from jsonb_object_keys(v_novo) k
    where (v_novo -> k) is distinct from (v_velho -> k);
    if v_colunas is null then
      return null;
    end if;
  end if;

  v_papel := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    session_user::text);

  insert into privado.auditoria (ator, papel, acao, tabela, registro, colunas)
  values (
    auth.uid(), v_papel, tg_op, tg_table_name,
    coalesce(v_novo, v_velho) ->> case when tg_table_name = 'produtos' then 'slug' else 'id' end,
    v_colunas);
  return null;
end
$$;

create trigger auditar after insert or update or delete on public.perfis
  for each row execute function privado.auditar();
create trigger auditar after insert or update or delete on public.enderecos
  for each row execute function privado.auditar();
create trigger auditar after insert or update or delete on public.pedidos
  for each row execute function privado.auditar();
create trigger auditar after insert or update or delete on public.pagamentos
  for each row execute function privado.auditar();
create trigger auditar after insert or update or delete on public.comentarios
  for each row execute function privado.auditar();
create trigger auditar after insert or update or delete on public.produtos
  for each row execute function privado.auditar();

-- Pedido que aguarda pagamento ha mais de 60 minutos expira, e a tentativa
-- pendente dele tambem. p_agora existe para os testes.
create function privado.expirar_pedidos(p_agora timestamptz default now())
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_quantos integer;
begin
  update public.pagamentos pg set status = 'expirado'
  where pg.status = 'pendente'
    and pg.pedido_id in (
      select p.id from public.pedidos p
      where p.status = 'aguardando_pagamento' and p.criado_em < p_agora - interval '60 minutes');

  update public.pedidos p set status = 'cancelado', motivo_cancelamento = 'expirado'
  where p.status = 'aguardando_pagamento' and p.criado_em < p_agora - interval '60 minutes';
  get diagnostics v_quantos = row_count;
  return v_quantos;
end
$$;

-- Os prazos da spec 12. p_agora existe para os testes.
create function privado.aplicar_guarda(p_agora timestamptz default now())
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from privado.cotacoes c where c.criado_em < p_agora - interval '24 hours';
  delete from privado.limites l where l.janela < p_agora - interval '1 day';
  delete from privado.eventos_webhook e where e.recebido_em < p_agora - interval '90 days';
  perform privado.anonimizar_retrato(p.id)
  from public.pedidos p
  where p.anonimizado_em is null
    and p.status in ('entregue', 'cancelado')
    and coalesce(p.entregue_em, p.cancelado_em) < p_agora - interval '180 days';
  delete from privado.auditoria a where a.quando < p_agora - interval '12 months';
end
$$;

-- As tarefas agendadas rodam dentro do banco, como o dono.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- a cada 5 minutos; a guarda todo dia as 6h UTC (3h em Sao Paulo)
select cron.schedule('amo-expirar-pedidos', '*/5 * * * *', 'select privado.expirar_pedidos()');
select cron.schedule('amo-guarda', '0 6 * * *', 'select privado.aplicar_guarda()');
