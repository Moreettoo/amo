-- AMO: o modo e a faixa da entrega na cotacao, no pedido e no pagamento
-- (spec 6 e 7 da entrega pelo Uber Direct).
--
-- agora: a corrida sai ja, so com a loja aberta. agendado: uma faixa de 1
-- hora que privado.faixa_valida aceita; pode ser escolhida com a loja
-- fechada, nunca com as vendas pausadas.
--
-- Codigos de erro novos (mensagem da excecao, SQLSTATE P0001):
--   faixa_indisponivel  a faixa nao vale (mais)
--   modo_invalido       modo que nao e agora nem agendado

alter table privado.cotacoes
  add column modo text not null default 'agora' check (modo in ('agora', 'agendado')),
  add column janela_inicio timestamptz,
  add column janela_fim timestamptz,
  add constraint modo_e_janela check (
    (modo = 'agora' and janela_inicio is null and janela_fim is null)
    or (modo = 'agendado' and janela_inicio is not null and janela_fim > janela_inicio));

alter table public.pedidos
  add column entrega_modo text not null default 'agora' check (entrega_modo in ('agora', 'agendado')),
  add column entrega_janela_inicio timestamptz,
  add column entrega_janela_fim timestamptz,
  add constraint entrega_modo_e_janela check (
    (entrega_modo = 'agora' and entrega_janela_inicio is null and entrega_janela_fim is null)
    or (entrega_modo = 'agendado' and entrega_janela_inicio is not null
        and entrega_janela_fim > entrega_janela_inicio));

-- A cotacao ganha o modo e a faixa. Os tres parametros novos tem padrao: a
-- chamada de 12 argumentos continua valendo (agora, sem faixa).
drop function privado.registrar_cotacao(uuid, text, text, text, text, text, text, text, integer, integer, text, text);

create function privado.registrar_cotacao(
  p_user_id uuid,
  p_cep text,
  p_logradouro text,
  p_numero text,
  p_complemento text,
  p_bairro text,
  p_cidade text,
  p_uf text,
  p_valor_centavos integer,
  p_minutos integer,
  p_origem text,
  p_uber_cotacao_id text,
  p_modo text default 'agora',
  p_janela_inicio timestamptz default null,
  p_janela_fim timestamptz default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_modo is null or p_modo not in ('agora', 'agendado') then
    raise exception using errcode = 'P0001', message = 'modo_invalido';
  end if;
  if p_modo = 'agendado' and not privado.faixa_valida(p_janela_inicio, p_janela_fim) then
    raise exception using errcode = 'P0001', message = 'faixa_indisponivel';
  end if;

  insert into privado.cotacoes (
    user_id, cep, logradouro, numero, complemento, bairro, cidade, uf,
    valor_centavos, minutos, origem, uber_cotacao_id, modo, janela_inicio, janela_fim, expira_em
  ) values (
    p_user_id, p_cep, p_logradouro, p_numero, coalesce(p_complemento, ''), p_bairro, p_cidade, p_uf,
    p_valor_centavos, p_minutos, p_origem, p_uber_cotacao_id, p_modo, p_janela_inicio, p_janela_fim,
    now() + interval '15 minutes'
  )
  returning id into v_id;
  return v_id;
end
$$;

grant execute on function privado.registrar_cotacao(
  uuid, text, text, text, text, text, text, text, integer, integer, text, text, text, timestamptz, timestamptz)
  to service_role;

-- p_itens: [{"produto": "<slug>", "quantos": 1..20}, ...], de 1 a 30, sem repetir.
-- A regra da loja depende do modo da cotacao: agora exige a loja aberta;
-- agendado exige vendas nao pausadas e a faixa ainda valida.
create or replace function public.criar_pedido(
  p_itens jsonb,
  p_cotacao uuid,
  p_total_visto integer,
  p_guardar_endereco boolean default false
)
returns table (id uuid, numero text, total_centavos integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_perfil public.perfis%rowtype;
  v_cotacao privado.cotacoes%rowtype;
  v_item jsonb;
  v_subtotal integer;
  v_existente public.pedidos%rowtype;
  v_pedido uuid;
  v_numero text;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'sem_sessao';
  end if;

  -- um pedido por cliente de cada vez: clique duplo nao vira dois pedidos
  perform pg_advisory_xact_lock(hashtextextended('pedido:' || v_uid::text, 0));

  select u.email into v_email
  from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then
    raise exception using errcode = 'P0001', message = 'email_nao_confirmado';
  end if;

  -- a lista de itens, conferida campo a campo antes de qualquer conta. Cada
  -- passo so roda depois que o anterior garantiu o tipo: o Postgres nao
  -- garante a ordem dentro de um "or".
  if jsonb_typeof(p_itens) is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'itens_invalidos';
  end if;
  if jsonb_array_length(p_itens) not between 1 and 30 then
    raise exception using errcode = 'P0001', message = 'itens_invalidos';
  end if;
  for v_item in select e.value from jsonb_array_elements(p_itens) e loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using errcode = 'P0001', message = 'itens_invalidos';
    end if;
    if (select count(*) from jsonb_object_keys(v_item)) <> 2
       or jsonb_typeof(v_item -> 'produto') is distinct from 'string'
       or jsonb_typeof(v_item -> 'quantos') is distinct from 'number' then
      raise exception using errcode = 'P0001', message = 'itens_invalidos';
    end if;
    if char_length(v_item ->> 'produto') > 80
       or (v_item ->> 'produto') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or (v_item ->> 'quantos') !~ '^[0-9]{1,2}$' then
      raise exception using errcode = 'P0001', message = 'itens_invalidos';
    end if;
    if (v_item ->> 'quantos')::integer not between 1 and 20 then
      raise exception using errcode = 'P0001', message = 'itens_invalidos';
    end if;
  end loop;
  if (select count(distinct e.value ->> 'produto') from jsonb_array_elements(p_itens) e)
     <> jsonb_array_length(p_itens) then
    raise exception using errcode = 'P0001', message = 'itens_invalidos';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_itens) e
    left join public.produtos p on p.slug = e.value ->> 'produto'
    where p.slug is null or not p.a_venda or p.preco_centavos is null
  ) then
    raise exception using errcode = 'P0001', message = 'produto_indisponivel';
  end if;

  select * into v_cotacao from privado.cotacoes c where c.id = p_cotacao for update;
  if not found or (v_cotacao.user_id is not null and v_cotacao.user_id <> v_uid) then
    raise exception using errcode = 'P0001', message = 'cotacao_invalida';
  end if;

  -- a loja, pelo modo da cotacao
  if v_cotacao.modo = 'agendado' then
    if coalesce((select l.vendas_pausadas from public.loja l), true) then
      raise exception using errcode = 'P0001', message = 'loja_fechada';
    end if;
    if not privado.faixa_valida(v_cotacao.janela_inicio, v_cotacao.janela_fim) then
      raise exception using errcode = 'P0001', message = 'faixa_indisponivel';
    end if;
  elsif not privado.loja_aberta() then
    raise exception using errcode = 'P0001', message = 'loja_fechada';
  end if;

  -- reenviar a mesma cotacao com os mesmos itens devolve o pedido ja criado
  if v_cotacao.pedido_id is not null then
    select * into v_existente
    from public.pedidos p
    where p.id = v_cotacao.pedido_id and p.user_id = v_uid and p.status = 'aguardando_pagamento';
    if found
       and v_existente.total_centavos = p_total_visto
       and not exists (
         select i.produto, i.quantos from public.itens_do_pedido i where i.pedido_id = v_existente.id
         except
         select e.value ->> 'produto', (e.value ->> 'quantos')::integer from jsonb_array_elements(p_itens) e)
       and not exists (
         select e.value ->> 'produto', (e.value ->> 'quantos')::integer from jsonb_array_elements(p_itens) e
         except
         select i.produto, i.quantos from public.itens_do_pedido i where i.pedido_id = v_existente.id) then
      return query select v_existente.id, v_existente.numero, v_existente.total_centavos;
      return;
    end if;
  end if;

  if v_cotacao.expira_em <= now() then
    raise exception using errcode = 'P0001', message = 'cotacao_vencida';
  end if;

  if (select count(*) from public.pedidos p where p.user_id = v_uid and p.criado_em > now() - interval '1 hour') >= 10 then
    raise exception using errcode = 'P0001', message = 'muitos_pedidos';
  end if;

  select sum(p.preco_centavos * (e.value ->> 'quantos')::integer) into v_subtotal
  from jsonb_array_elements(p_itens) e
  join public.produtos p on p.slug = e.value ->> 'produto';

  if v_subtotal + v_cotacao.valor_centavos is distinct from p_total_visto then
    raise exception using errcode = 'P0001', message = 'total_mudou';
  end if;

  select * into v_perfil from public.perfis pf where pf.id = v_uid;
  if not found then
    raise exception using errcode = 'P0001', message = 'sem_sessao';
  end if;

  -- uma cliente tem no maximo um pedido aguardando pagamento
  update public.pagamentos pg
  set status = 'cancelado'
  where pg.status = 'pendente'
    and pg.pedido_id in (
      select p.id from public.pedidos p where p.user_id = v_uid and p.status = 'aguardando_pagamento');
  update public.pedidos p
  set status = 'cancelado', motivo_cancelamento = 'cliente'
  where p.user_id = v_uid and p.status = 'aguardando_pagamento';

  v_numero := privado.novo_numero_pedido();

  insert into public.pedidos (
    numero, user_id, subtotal_centavos, frete_centavos, total_centavos,
    cliente_nome, cliente_celular, cliente_email,
    entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento,
    entrega_bairro, entrega_cidade, entrega_uf, entrega_minutos,
    entrega_modo, entrega_janela_inicio, entrega_janela_fim
  ) values (
    v_numero, v_uid, v_subtotal, v_cotacao.valor_centavos, v_subtotal + v_cotacao.valor_centavos,
    v_perfil.nome, v_perfil.celular, v_email,
    v_cotacao.cep, v_cotacao.logradouro, v_cotacao.numero, v_cotacao.complemento,
    v_cotacao.bairro, v_cotacao.cidade, v_cotacao.uf, v_cotacao.minutos,
    v_cotacao.modo, v_cotacao.janela_inicio, v_cotacao.janela_fim
  )
  returning public.pedidos.id into v_pedido;

  insert into public.itens_do_pedido (pedido_id, produto, nome, tipo, preco_centavos, quantos, total_centavos)
  select v_pedido, p.slug, p.nome, l.tipo, p.preco_centavos, (e.value ->> 'quantos')::integer,
         p.preco_centavos * (e.value ->> 'quantos')::integer
  from jsonb_array_elements(p_itens) e
  join public.produtos p on p.slug = e.value ->> 'produto'
  join public.linhas l on l.slug = p.linha;

  update privado.cotacoes c set user_id = v_uid, pedido_id = v_pedido where c.id = v_cotacao.id;

  -- guardar o endereco nunca derruba a compra: no limite, ou repetido, nao guarda
  if coalesce(p_guardar_endereco, false)
     and (select count(*) from public.enderecos en where en.user_id = v_uid) < 5
     and not exists (
       select 1 from public.enderecos en
       where en.user_id = v_uid and en.cep = v_cotacao.cep and en.numero = v_cotacao.numero
         and en.complemento = v_cotacao.complemento) then
    insert into public.enderecos (user_id, cep, logradouro, numero, complemento, bairro, cidade, uf, principal)
    values (
      v_uid, v_cotacao.cep, v_cotacao.logradouro, v_cotacao.numero, v_cotacao.complemento,
      v_cotacao.bairro, v_cotacao.cidade, v_cotacao.uf,
      not exists (select 1 from public.enderecos en where en.user_id = v_uid and en.principal));
  end if;

  return query select v_pedido, v_numero, v_subtotal + v_cotacao.valor_centavos;
end
$$;

-- Uma tentativa de pagamento para o pedido da cliente. Cancela a pendente
-- anterior; o id devolvido e a chave de idempotencia do Mercado Pago. No
-- agendado, a faixa e conferida de novo (sem olhar a pausa: ela so barra
-- pedido novo).
create or replace function public.iniciar_pagamento(p_pedido uuid, p_forma text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_pedido public.pedidos%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'sem_sessao';
  end if;
  if p_forma is null or p_forma not in ('pix', 'cartao') then
    raise exception using errcode = 'P0001', message = 'forma_invalida';
  end if;

  select * into v_pedido from public.pedidos p where p.id = p_pedido and p.user_id = v_uid for update;
  if not found or v_pedido.status <> 'aguardando_pagamento' then
    raise exception using errcode = 'P0001', message = 'pedido_invalido';
  end if;

  if v_pedido.entrega_modo = 'agendado'
     and not privado.faixa_valida(v_pedido.entrega_janela_inicio, v_pedido.entrega_janela_fim, now(), false) then
    raise exception using errcode = 'P0001', message = 'faixa_indisponivel';
  end if;

  if (select count(*) from public.pagamentos pg where pg.pedido_id = p_pedido) >= 5 then
    raise exception using errcode = 'P0001', message = 'muitas_tentativas';
  end if;

  update public.pagamentos pg set status = 'cancelado'
  where pg.pedido_id = p_pedido and pg.status = 'pendente';

  insert into public.pagamentos (pedido_id, forma, valor_centavos)
  values (p_pedido, p_forma, v_pedido.total_centavos)
  returning id into v_id;
  return v_id;
end
$$;

-- O pedido: passagens de estado (spec 10.1, e pago>a_caminho quando a equipe
-- nao marca "em preparo"), datas carimbadas, valores e numero imutaveis. Dona
-- e retrato so podem ser apagados (exclusao da conta e guarda de 180 dias); o
-- CEP, so encurtado para os 5 primeiros digitos. O modo e a faixa da entrega
-- so mudam pela remarcacao (amo.remarcando = 'sim', numa funcao de privado):
-- com o pedido pago, para agendado com faixa.
create or replace function privado.guardar_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'aguardando_pagamento' or new.motivo_cancelamento is not null
       or new.pago_em is not null or new.em_preparo_em is not null or new.a_caminho_em is not null
       or new.entregue_em is not null or new.cancelado_em is not null or new.anonimizado_em is not null then
      raise exception using errcode = 'P0001', message = 'passagem_invalida';
    end if;
    return new;
  end if;

  if new.id <> old.id or new.numero <> old.numero or new.criado_em <> old.criado_em
     or new.subtotal_centavos <> old.subtotal_centavos or new.frete_centavos <> old.frete_centavos
     or new.total_centavos <> old.total_centavos
     or new.entrega_bairro <> old.entrega_bairro or new.entrega_cidade <> old.entrega_cidade
     or new.entrega_uf <> old.entrega_uf or new.entrega_minutos <> old.entrega_minutos then
    raise exception using errcode = 'P0001', message = 'campo_imutavel';
  end if;

  if (new.entrega_modo is distinct from old.entrega_modo
      or new.entrega_janela_inicio is distinct from old.entrega_janela_inicio
      or new.entrega_janela_fim is distinct from old.entrega_janela_fim)
     and not (
       coalesce(current_setting('amo.remarcando', true), '') = 'sim'
       and old.status = 'pago' and new.status = 'pago'
       and new.entrega_modo = 'agendado'
       and new.entrega_janela_inicio is not null and new.entrega_janela_fim is not null
       and new.entrega_janela_fim > new.entrega_janela_inicio) then
    raise exception using errcode = 'P0001', message = 'campo_imutavel';
  end if;

  if (new.user_id is distinct from old.user_id and new.user_id is not null)
     or (new.cliente_nome is distinct from old.cliente_nome and new.cliente_nome is not null)
     or (new.cliente_celular is distinct from old.cliente_celular and new.cliente_celular is not null)
     or (new.cliente_email is distinct from old.cliente_email and new.cliente_email is not null)
     or (new.entrega_logradouro is distinct from old.entrega_logradouro and new.entrega_logradouro is not null)
     or (new.entrega_numero is distinct from old.entrega_numero and new.entrega_numero is not null)
     or (new.entrega_complemento is distinct from old.entrega_complemento and new.entrega_complemento is not null)
     or (new.entrega_cep is distinct from old.entrega_cep and new.entrega_cep is distinct from left(old.entrega_cep, 5))
     or (old.anonimizado_em is not null and new.anonimizado_em is distinct from old.anonimizado_em) then
    raise exception using errcode = 'P0001', message = 'campo_imutavel';
  end if;

  new.pago_em := old.pago_em;
  new.em_preparo_em := old.em_preparo_em;
  new.a_caminho_em := old.a_caminho_em;
  new.entregue_em := old.entregue_em;
  new.cancelado_em := old.cancelado_em;

  if new.status is distinct from old.status then
    if old.status || '>' || new.status not in (
      'aguardando_pagamento>pago', 'aguardando_pagamento>cancelado',
      'pago>em_preparo', 'pago>a_caminho', 'pago>cancelado',
      'em_preparo>a_caminho', 'em_preparo>cancelado',
      'a_caminho>entregue') then
      raise exception using errcode = 'P0001', message = 'passagem_invalida';
    end if;
    case new.status
      when 'pago' then new.pago_em := now();
      when 'em_preparo' then new.em_preparo_em := now();
      when 'a_caminho' then new.a_caminho_em := now();
      when 'entregue' then new.entregue_em := now();
      when 'cancelado' then new.cancelado_em := now();
    end case;
  elsif new.motivo_cancelamento is distinct from old.motivo_cancelamento then
    raise exception using errcode = 'P0001', message = 'campo_imutavel';
  end if;

  return new;
end
$$;
