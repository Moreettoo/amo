-- AMO: comentarios com nota (spec 7.2, 8 e 9.1).
--
-- So comenta quem recebeu o produto; um comentario por produto por cliente
-- (reenviar substitui e volta para a moderacao). O comentario so aparece
-- depois de aprovado pela equipe. Quem escreveu nao e exposto: user_id nao e
-- legivel por ninguem pela API, e o nome exibido e "Carla M.".
--
-- Codigos de erro (mensagem da excecao, SQLSTATE P0001):
--   sem_sessao, comentario_nao_permitido, nota_invalida, texto_invalido

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  produto text not null references public.produtos (slug),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome_exibido text not null check (char_length(nome_exibido) between 2 and 40 and nome_exibido !~ '[[:cntrl:]<>]'),
  nota smallint not null check (nota between 1 and 5),
  -- quebra de linha pode; outros caracteres de controle e < > nao
  texto text not null check (char_length(texto) between 10 and 1000 and texto !~ '[\x01-\x09\x0B-\x1F\x7F<>]'),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  criado_em timestamptz not null default now(),
  moderado_em timestamptz,
  unique (produto, user_id)
);

create index comentarios_produto on public.comentarios (produto, status);
create index comentarios_user_id on public.comentarios (user_id);

alter table public.comentarios enable row level security;

create policy ler_os_aprovados on public.comentarios
  for select to anon, authenticated using (status = 'aprovado');
create policy ler_os_proprios on public.comentarios
  for select to authenticated using (user_id = (select auth.uid()));

grant select (id, produto, nome_exibido, nota, texto, criado_em) on public.comentarios to anon;
grant select (id, produto, nome_exibido, nota, texto, criado_em, status) on public.comentarios to authenticated;

-- A equipe modera pelo painel: aprovar ou recusar carimba a data.
create function privado.moderar_comentario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.moderado_em := case when new.status = 'pendente' then null else now() end;
  end if;
  return new;
end
$$;

create trigger moderar_comentario
  before update on public.comentarios
  for each row execute function privado.moderar_comentario();

create function public.enviar_comentario(p_produto text, p_nota integer, p_texto text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_texto text := btrim(replace(coalesce(p_texto, ''), E'\r\n', E'\n'));
  v_partes text[];
  v_nome_exibido text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'sem_sessao';
  end if;
  if p_nota is null or p_nota not between 1 and 5 then
    raise exception using errcode = 'P0001', message = 'nota_invalida';
  end if;
  if char_length(v_texto) not between 10 and 1000 or v_texto ~ '[\x01-\x09\x0B-\x1F\x7F<>]' then
    raise exception using errcode = 'P0001', message = 'texto_invalido';
  end if;
  if p_produto is null or char_length(p_produto) > 80 or p_produto !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or not exists (
       select 1
       from public.pedidos p
       join public.itens_do_pedido i on i.pedido_id = p.id
       where p.user_id = v_uid and p.status = 'entregue' and i.produto = p_produto) then
    raise exception using errcode = 'P0001', message = 'comentario_nao_permitido';
  end if;

  -- "Maria José D'Ávila" vira "Maria D."; um nome so fica como esta
  select regexp_split_to_array(pf.nome, '\s+') into v_partes from public.perfis pf where pf.id = v_uid;
  if v_partes is null then
    raise exception using errcode = 'P0001', message = 'sem_sessao';
  end if;
  v_nome_exibido := left(v_partes[1], 36);
  if cardinality(v_partes) > 1 then
    v_nome_exibido := v_nome_exibido || ' ' || upper(left(v_partes[cardinality(v_partes)], 1)) || '.';
  end if;

  insert into public.comentarios (produto, user_id, nome_exibido, nota, texto)
  values (p_produto, v_uid, v_nome_exibido, p_nota, v_texto)
  on conflict (produto, user_id) do update set
    nome_exibido = excluded.nome_exibido,
    nota = excluded.nota,
    texto = excluded.texto,
    status = 'pendente',
    criado_em = now()
  returning public.comentarios.id into v_id;

  return v_id;
end
$$;

grant execute on function public.enviar_comentario(text, integer, text) to authenticated;
