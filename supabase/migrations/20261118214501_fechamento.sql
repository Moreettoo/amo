-- AMO: o fechamento do pedido (spec 9.1, 9.2 e 10.2).
--
-- A cliente nao escreve pedido nem pagamento: chama estas funcoes, que
-- calculam tudo a partir do banco. O navegador nunca diz o preco, o frete
-- nem o total que vale; total_visto so serve para recusar quando o que a
-- cliente viu nao e mais o que seria cobrado.
--
-- Codigos de erro (mensagem da excecao, SQLSTATE P0001):
--   sem_sessao, email_nao_confirmado, loja_fechada, itens_invalidos,
--   produto_indisponivel, cotacao_invalida, cotacao_vencida, muitos_pedidos,
--   total_mudou, pedido_invalido, forma_invalida, muitas_tentativas

-- A loja aceita pedido agora? Hora de Sao Paulo, horario do dia e vendas
-- nao pausadas. p_quando existe para os testes.
create function privado.loja_aberta(p_quando timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    not (select l.vendas_pausadas from public.loja l)
    and exists (
      select 1 from public.horarios h
      where h.dia_da_semana = extract(dow from (p_quando at time zone 'America/Sao_Paulo'))
        and h.abre <= (p_quando at time zone 'America/Sao_Paulo')::time
        and (p_quando at time zone 'America/Sao_Paulo')::time < h.fecha),
    false);
$$;

-- AMO- e 8 caracteres aleatorios, sem sequencia e sem letras que confundem.
create function privado.novo_numero_pedido()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_bytes bytea;
  v_numero text;
begin
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_numero := 'AMO-';
    for i in 0..7 loop
      v_numero := v_numero || substr(v_alfabeto, 1 + (get_byte(v_bytes, i) % 31), 1);
    end loop;
    exit when not exists (select 1 from public.pedidos p where p.numero = v_numero);
  end loop;
  return v_numero;
end
$$;

-- A cotacao que o servidor emitiu (Uber Direct, ou a de exemplo enquanto a
-- conta nao existe). Vale 15 minutos. A cliente pode ainda nao ter conta.
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
  p_uber_cotacao_id text
)
returns uuid
language sql
volatile
security definer
set search_path = ''
as $$
  insert into privado.cotacoes (
    user_id, cep, logradouro, numero, complemento, bairro, cidade, uf,
    valor_centavos, minutos, origem, uber_cotacao_id, expira_em
  ) values (
    p_user_id, p_cep, p_logradouro, p_numero, coalesce(p_complemento, ''), p_bairro, p_cidade, p_uf,
    p_valor_centavos, p_minutos, p_origem, p_uber_cotacao_id, now() + interval '15 minutes'
  )
  returning id;
$$;

-- p_itens: [{"produto": "<slug>", "quantos": 1..20}, ...], de 1 a 30, sem repetir.
create function public.criar_pedido(
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

  if not privado.loja_aberta() then
    raise exception using errcode = 'P0001', message = 'loja_fechada';
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
    entrega_bairro, entrega_cidade, entrega_uf, entrega_minutos
  ) values (
    v_numero, v_uid, v_subtotal, v_cotacao.valor_centavos, v_subtotal + v_cotacao.valor_centavos,
    v_perfil.nome, v_perfil.celular, v_email,
    v_cotacao.cep, v_cotacao.logradouro, v_cotacao.numero, v_cotacao.complemento,
    v_cotacao.bairro, v_cotacao.cidade, v_cotacao.uf, v_cotacao.minutos
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
-- anterior; o id devolvido e a chave de idempotencia do Mercado Pago.
create function public.iniciar_pagamento(p_pedido uuid, p_forma text)
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

-- A cliente desiste do proprio pedido enquanto ele aguarda pagamento.
create function public.cancelar_pedido(p_pedido uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'sem_sessao';
  end if;

  select p.status into v_status from public.pedidos p where p.id = p_pedido and p.user_id = v_uid for update;
  if v_status is distinct from 'aguardando_pagamento' then
    raise exception using errcode = 'P0001', message = 'pedido_invalido';
  end if;

  update public.pagamentos pg set status = 'cancelado'
  where pg.pedido_id = p_pedido and pg.status = 'pendente';
  update public.pedidos p set status = 'cancelado', motivo_cancelamento = 'cliente'
  where p.id = p_pedido;
end
$$;

grant execute on function public.criar_pedido(jsonb, uuid, integer, boolean) to authenticated;
grant execute on function public.iniciar_pagamento(uuid, text) to authenticated;
grant execute on function public.cancelar_pedido(uuid) to authenticated;
grant execute on function privado.registrar_cotacao(uuid, text, text, text, text, text, text, text, integer, integer, text, text)
  to service_role;
