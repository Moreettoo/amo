-- AMO: pedidos, itens e pagamentos (spec 7.2, 7.3, 8, 9.3, 10.1 e 10.3).
--
-- A cliente so le os proprios; ninguem da API escreve. Quem escreve sao as
-- funcoes das proximas migrations. As passagens de estado e os campos que
-- nunca mudam sao guardados por gatilho, e valem para qualquer papel,
-- inclusive pelo painel.
--
-- Codigos de erro (mensagem da excecao, SQLSTATE P0001):
--   passagem_invalida  estado que nao pode vir depois do atual
--   campo_imutavel     campo que nao muda, ou so pode ser apagado

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique check (numero ~ '^AMO-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$'),
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'aguardando_pagamento' check (status in (
    'aguardando_pagamento', 'pago', 'em_preparo', 'a_caminho', 'entregue', 'cancelado')),
  criado_em timestamptz not null default now(),
  pago_em timestamptz,
  em_preparo_em timestamptz,
  a_caminho_em timestamptz,
  entregue_em timestamptz,
  cancelado_em timestamptz,
  motivo_cancelamento text check (motivo_cancelamento in ('cliente', 'pagamento', 'expirado', 'loja')),
  subtotal_centavos integer not null check (subtotal_centavos > 0),
  frete_centavos integer not null check (frete_centavos >= 0),
  total_centavos integer not null,
  -- retrato da cliente e da entrega no momento do pedido
  cliente_nome text check (char_length(cliente_nome) between 2 and 80 and cliente_nome !~ '[[:cntrl:]<>]'),
  cliente_celular text check (cliente_celular ~ '^[0-9]{10,11}$'),
  cliente_email text check (char_length(cliente_email) between 3 and 320 and cliente_email !~ '[[:cntrl:][:space:]<>]'),
  entrega_cep text not null check (entrega_cep ~ '^[0-9]{5}([0-9]{3})?$'),
  entrega_logradouro text check (char_length(entrega_logradouro) between 2 and 120 and entrega_logradouro !~ '[[:cntrl:]<>]'),
  entrega_numero text check (entrega_numero ~ '^[0-9A-Za-z][0-9A-Za-z /-]{0,9}$'),
  entrega_complemento text check (char_length(entrega_complemento) <= 60 and entrega_complemento !~ '[[:cntrl:]<>]'),
  entrega_bairro text not null check (char_length(entrega_bairro) between 1 and 60 and entrega_bairro !~ '[[:cntrl:]<>]'),
  entrega_cidade text not null check (char_length(entrega_cidade) between 2 and 60 and entrega_cidade !~ '[[:cntrl:]<>]'),
  entrega_uf text not null check (entrega_uf in (
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')),
  entrega_minutos integer not null check (entrega_minutos between 1 and 600),
  -- so vira link se for https de um dominio do Uber
  rastreio_url text check (char_length(rastreio_url) <= 500
    and rastreio_url ~ '^https://([a-z0-9-]+\.)*uber\.com/[^[:space:][:cntrl:]<>"'']*$'),
  anonimizado_em timestamptz,
  constraint total_e_subtotal_mais_frete check (total_centavos = subtotal_centavos + frete_centavos),
  constraint cancelado_tem_motivo check ((status = 'cancelado') = (motivo_cancelamento is not null)),
  constraint retrato_completo check (anonimizado_em is not null or (
    cliente_nome is not null and cliente_celular is not null and cliente_email is not null
    and entrega_logradouro is not null and entrega_numero is not null and entrega_complemento is not null
    and char_length(entrega_cep) = 8))
);

create index pedidos_user_id on public.pedidos (user_id, criado_em desc);
create index pedidos_status on public.pedidos (status, criado_em);

create table public.itens_do_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete restrict,
  produto text not null references public.produtos (slug),
  nome text not null check (char_length(nome) between 1 and 80 and nome !~ '[[:cntrl:]<>]'),
  tipo text not null check (char_length(tipo) between 1 and 80 and tipo !~ '[[:cntrl:]<>]'),
  preco_centavos integer not null check (preco_centavos > 0),
  quantos integer not null check (quantos between 1 and 20),
  total_centavos integer not null,
  constraint total_do_item check (total_centavos = preco_centavos * quantos),
  unique (pedido_id, produto)
);

create index itens_do_pedido_produto on public.itens_do_pedido (produto);

-- Uma linha por tentativa. O id tambem e a chave de idempotencia enviada ao
-- Mercado Pago. Do cartao fica so a bandeira e os ultimos 4 digitos.
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete restrict,
  forma text not null check (forma in ('pix', 'cartao')),
  status text not null default 'pendente' check (status in (
    'pendente', 'aprovado', 'recusado', 'cancelado', 'expirado', 'a_estornar', 'estornado', 'contestado')),
  valor_centavos integer not null check (valor_centavos > 0),
  parcelas integer check (parcelas between 1 and 12),
  cartao_bandeira text check (cartao_bandeira ~ '^[a-z_]{2,20}$'),
  cartao_final text check (cartao_final ~ '^[0-9]{4}$'),
  pix_copia_e_cola text check (char_length(pix_copia_e_cola) between 1 and 1000 and pix_copia_e_cola !~ '[[:cntrl:]<>]'),
  pix_qr_base64 text check (char_length(pix_qr_base64) <= 40000 and pix_qr_base64 ~ '^[A-Za-z0-9+/=]+$'),
  pix_expira_em timestamptz,
  recusa text check (recusa ~ '^[a-z0-9_]{1,60}$'),
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create unique index pagamentos_um_aprovado on public.pagamentos (pedido_id) where status = 'aprovado';
create unique index pagamentos_um_pendente on public.pagamentos (pedido_id) where status = 'pendente';
create index pagamentos_status on public.pagamentos (status, criado_em);

-- So o servidor: a cotacao emitida, o que o Mercado Pago sabe de cada
-- tentativa e a corrida no Uber.
create table privado.cotacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  cep text not null check (cep ~ '^[0-9]{8}$'),
  logradouro text not null check (char_length(logradouro) between 2 and 120 and logradouro !~ '[[:cntrl:]<>]'),
  numero text not null check (numero ~ '^[0-9A-Za-z][0-9A-Za-z /-]{0,9}$'),
  complemento text not null default '' check (char_length(complemento) <= 60 and complemento !~ '[[:cntrl:]<>]'),
  bairro text not null check (char_length(bairro) between 1 and 60 and bairro !~ '[[:cntrl:]<>]'),
  cidade text not null check (char_length(cidade) between 2 and 60 and cidade !~ '[[:cntrl:]<>]'),
  uf text not null check (uf in (
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')),
  valor_centavos integer not null check (valor_centavos between 0 and 100000),
  minutos integer not null check (minutos between 1 and 600),
  origem text not null check (origem in ('uber', 'exemplo')),
  uber_cotacao_id text check (uber_cotacao_id ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  pedido_id uuid references public.pedidos (id) on delete set null
);

create index cotacoes_criado_em on privado.cotacoes (criado_em);
create index cotacoes_pedido_id on privado.cotacoes (pedido_id);

create table privado.pagamentos_mp (
  pagamento_id uuid primary key references public.pagamentos (id) on delete restrict,
  mp_pedido_id text unique check (mp_pedido_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  mp_pagamento_id text check (mp_pagamento_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  status_mp text check (status_mp ~ '^[a-z_]{1,40}$'),
  detalhe_mp text check (detalhe_mp ~ '^[a-z0-9_]{1,100}$'),
  atualizado_em timestamptz not null default now()
);

create table privado.entregas (
  pedido_id uuid primary key references public.pedidos (id) on delete restrict,
  uber_entrega_id text unique check (uber_entrega_id ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  status_uber text check (status_uber ~ '^[a-z_]{1,40}$'),
  atualizado_em timestamptz not null default now()
);

alter table public.pedidos enable row level security;
alter table public.itens_do_pedido enable row level security;
alter table public.pagamentos enable row level security;
alter table privado.cotacoes enable row level security;
alter table privado.pagamentos_mp enable row level security;
alter table privado.entregas enable row level security;

create policy ler_os_proprios on public.pedidos
  for select to authenticated using (user_id = (select auth.uid()));

create policy ler_os_de_pedido_proprio on public.itens_do_pedido
  for select to authenticated using (exists (
    select 1 from public.pedidos p where p.id = pedido_id and p.user_id = (select auth.uid())));

create policy ler_os_de_pedido_proprio on public.pagamentos
  for select to authenticated using (exists (
    select 1 from public.pedidos p where p.id = pedido_id and p.user_id = (select auth.uid())));

grant select on public.pedidos, public.itens_do_pedido, public.pagamentos to authenticated;

-- O pedido: passagens de estado (spec 10.1), datas carimbadas, valores e
-- numero imutaveis. Dona e retrato so podem ser apagados (exclusao da conta
-- e guarda de 180 dias); o CEP, so encurtado para os 5 primeiros digitos.
create function privado.guardar_pedido()
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
      'pago>em_preparo', 'pago>cancelado',
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

create trigger guardar_pedido
  before insert or update on public.pedidos
  for each row execute function privado.guardar_pedido();

create function privado.itens_imutaveis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = 'campo_imutavel';
end
$$;

create trigger itens_imutaveis
  before update or delete on public.itens_do_pedido
  for each row execute function privado.itens_imutaveis();

-- A tentativa de pagamento: passagens da spec 10.3.
create function privado.guardar_pagamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pendente' or new.aprovado_em is not null then
      raise exception using errcode = 'P0001', message = 'passagem_invalida';
    end if;
    return new;
  end if;

  if new.id <> old.id or new.pedido_id <> old.pedido_id or new.forma <> old.forma
     or new.valor_centavos <> old.valor_centavos or new.criado_em <> old.criado_em then
    raise exception using errcode = 'P0001', message = 'campo_imutavel';
  end if;

  new.aprovado_em := old.aprovado_em;
  if new.status is distinct from old.status then
    if old.status || '>' || new.status not in (
      'pendente>aprovado', 'pendente>recusado', 'pendente>cancelado', 'pendente>expirado', 'pendente>a_estornar',
      'aprovado>estornado', 'aprovado>contestado',
      'cancelado>aprovado', 'cancelado>a_estornar',
      'expirado>aprovado', 'expirado>a_estornar',
      'a_estornar>estornado',
      'contestado>aprovado', 'contestado>estornado') then
      raise exception using errcode = 'P0001', message = 'passagem_invalida';
    end if;
    if new.status = 'aprovado' then
      new.aprovado_em := coalesce(old.aprovado_em, now());
    end if;
  end if;
  new.atualizado_em := now();
  return new;
end
$$;

create trigger guardar_pagamento
  before insert or update on public.pagamentos
  for each row execute function privado.guardar_pagamento();
