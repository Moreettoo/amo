-- AMO: pagamento, avisos, entrega e limites (spec 9.2, 10.3, 10.4 e 10.5).
--
-- Funcoes chamadas so pelo servidor, com a chave secreta (service_role, que
-- nao le nenhuma tabela). O servidor nunca acredita no corpo de um aviso: ele
-- busca o pagamento no Mercado Pago e passa aqui o que a API respondeu, ja
-- traduzido para os estados da spec 10.3.
--
-- Codigos de erro (mensagem da excecao, SQLSTATE P0001):
--   status_invalido, pagamento_invalido, pedido_invalido, rastreio_invalido,
--   limite_invalido, passagem_invalida (vindo do gatilho)

-- Cada aviso recebido, uma vez so. Nada de corpo, cabecalho ou dado pessoal:
-- so os identificadores.
create table privado.eventos_webhook (
  id bigint generated always as identity primary key,
  origem text not null check (origem in ('mercadopago', 'uber')),
  evento_id text not null check (evento_id ~ '^[A-Za-z0-9_.:-]{1,200}$'),
  tipo text check (tipo ~ '^[a-z0-9_.]{1,60}$'),
  recurso_id text check (recurso_id ~ '^[A-Za-z0-9_.:-]{1,200}$'),
  recebido_em timestamptz not null default now(),
  tentativas integer not null default 1,
  processado_em timestamptz,
  erro text check (char_length(erro) <= 500 and erro !~ '[[:cntrl:]]'),
  unique (origem, evento_id)
);

create index eventos_webhook_recebido_em on privado.eventos_webhook (recebido_em);

-- Contagem de uso por janela de tempo. A chave chega como texto (ex.:
-- "entrar:<ip>:<email>") e e guardada so como hash: nem IP nem e-mail ficam
-- legiveis aqui.
create table privado.limites (
  chave text not null check (chave ~ '^[0-9a-f]{64}$'),
  janela timestamptz not null,
  contagem integer not null default 1,
  primary key (chave, janela)
);

create index limites_janela on privado.limites (janela);

alter table privado.eventos_webhook enable row level security;
alter table privado.limites enable row level security;

-- O que o Mercado Pago disse de uma tentativa, aplicado numa transacao so.
-- p_status e o estado da spec 10.3 que o servidor traduziu da resposta da API.
create function privado.aplicar_pagamento(
  p_pagamento uuid,
  p_mp_pedido_id text,
  p_mp_pagamento_id text,
  p_status text,
  p_detalhe text,
  p_valor_centavos integer,
  p_cartao_bandeira text default null,
  p_cartao_final text default null,
  p_parcelas integer default null,
  p_pix_copia_e_cola text default null,
  p_pix_qr_base64 text default null,
  p_pix_expira_em timestamptz default null,
  p_recusa text default null
)
returns table (pagamento_status text, pedido_status text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pedido_id uuid;
  v_pedido public.pedidos%rowtype;
  v_pagamento public.pagamentos%rowtype;
  v_novo text;
begin
  if p_status is null or p_status not in (
    'pendente', 'aprovado', 'recusado', 'cancelado', 'expirado', 'estornado', 'contestado') then
    raise exception using errcode = 'P0001', message = 'status_invalido';
  end if;

  -- trava o pedido antes da tentativa, na mesma ordem de iniciar_pagamento
  select pg.pedido_id into v_pedido_id from public.pagamentos pg where pg.id = p_pagamento;
  if v_pedido_id is null then
    raise exception using errcode = 'P0001', message = 'pagamento_invalido';
  end if;
  select * into v_pedido from public.pedidos p where p.id = v_pedido_id for update;
  select * into v_pagamento from public.pagamentos pg where pg.id = p_pagamento for update;

  insert into privado.pagamentos_mp (pagamento_id, mp_pedido_id, mp_pagamento_id, status_mp, detalhe_mp)
  values (p_pagamento, p_mp_pedido_id, p_mp_pagamento_id, p_status, p_detalhe)
  on conflict (pagamento_id) do update set
    mp_pedido_id = coalesce(excluded.mp_pedido_id, privado.pagamentos_mp.mp_pedido_id),
    mp_pagamento_id = coalesce(excluded.mp_pagamento_id, privado.pagamentos_mp.mp_pagamento_id),
    status_mp = excluded.status_mp,
    detalhe_mp = coalesce(excluded.detalhe_mp, privado.pagamentos_mp.detalhe_mp),
    atualizado_em = now();

  -- o que a tela mostra: so preenche, nunca apaga
  update public.pagamentos pg set
    cartao_bandeira = coalesce(p_cartao_bandeira, pg.cartao_bandeira),
    cartao_final = coalesce(p_cartao_final, pg.cartao_final),
    parcelas = coalesce(p_parcelas, pg.parcelas),
    pix_copia_e_cola = coalesce(p_pix_copia_e_cola, pg.pix_copia_e_cola),
    pix_qr_base64 = coalesce(p_pix_qr_base64, pg.pix_qr_base64),
    pix_expira_em = coalesce(p_pix_expira_em, pg.pix_expira_em),
    recusa = coalesce(p_recusa, pg.recusa)
  where pg.id = p_pagamento;

  v_novo := v_pagamento.status;

  if p_status = 'aprovado' then
    if v_pagamento.status = 'recusado' then
      -- incoerente; o aviso fica com erro e a equipe olha
      raise exception using errcode = 'P0001', message = 'passagem_invalida';
    elsif v_pagamento.status = 'contestado' then
      v_novo := 'aprovado';
    elsif v_pagamento.status in ('pendente', 'cancelado', 'expirado') then
      if v_pedido.status = 'aguardando_pagamento'
         and p_valor_centavos = v_pagamento.valor_centavos
         and v_pagamento.valor_centavos = v_pedido.total_centavos then
        update public.pedidos p set status = 'pago' where p.id = v_pedido.id;
        v_novo := 'aprovado';
      else
        -- recebemos um dinheiro que nao deviamos: fica a divida ate o estorno
        v_novo := 'a_estornar';
      end if;
    end if;
  elsif p_status = 'estornado' then
    if v_pagamento.status in ('aprovado', 'a_estornar', 'contestado') then
      v_novo := 'estornado';
      if v_pagamento.status in ('aprovado', 'contestado') and v_pedido.status in ('pago', 'em_preparo') then
        update public.pedidos p set status = 'cancelado', motivo_cancelamento = 'pagamento' where p.id = v_pedido.id;
      end if;
    end if;
  elsif p_status = 'contestado' then
    if v_pagamento.status = 'aprovado' then
      v_novo := 'contestado';
    end if;
  elsif p_status in ('recusado', 'cancelado', 'expirado') then
    if v_pagamento.status = 'pendente' then
      v_novo := p_status;
    end if;
  end if;
  -- 'pendente', ou um aviso fora de ordem: nada anda para tras

  if v_novo <> v_pagamento.status then
    update public.pagamentos pg set status = v_novo where pg.id = p_pagamento;
  end if;

  return query
  select v_novo, (select p.status from public.pedidos p where p.id = v_pedido.id);
end
$$;

-- O que a reconciliacao confere no Mercado Pago: tentativas pendentes ha mais
-- de 10 minutos (aviso perdido) e estornos devidos.
create function privado.pagamentos_a_reconciliar()
returns table (pagamento_id uuid, mp_pedido_id text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select pg.id, m.mp_pedido_id, pg.status
  from public.pagamentos pg
  left join privado.pagamentos_mp m on m.pagamento_id = pg.id
  where (pg.status = 'pendente' and pg.criado_em < now() - interval '10 minutes')
     or pg.status = 'a_estornar'
  order by pg.criado_em
  limit 200;
$$;

-- 'novo', 'ja_tratado' ou 'tratar_de_novo' (chegou antes e nao foi concluido).
create function privado.registrar_evento_webhook(
  p_origem text,
  p_evento_id text,
  p_tipo text,
  p_recurso_id text
)
returns table (evento bigint, situacao text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_processado_em timestamptz;
  v_novo boolean;
begin
  insert into privado.eventos_webhook (origem, evento_id, tipo, recurso_id)
  values (p_origem, p_evento_id, p_tipo, p_recurso_id)
  on conflict (origem, evento_id) do update
    set tentativas = privado.eventos_webhook.tentativas + 1
  returning privado.eventos_webhook.id, privado.eventos_webhook.processado_em, (privado.eventos_webhook.xmax = 0)
  into v_id, v_processado_em, v_novo;

  return query select v_id,
    case when v_novo then 'novo' when v_processado_em is not null then 'ja_tratado' else 'tratar_de_novo' end;
end
$$;

-- Sem erro: tratado. Com erro: guarda o erro e deixa em aberto.
create function privado.concluir_evento_webhook(p_evento bigint, p_erro text default null)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update privado.eventos_webhook e
  set processado_em = case when p_erro is null then now() end,
      erro = left(regexp_replace(p_erro, '[[:cntrl:]]', ' ', 'g'), 500)
  where e.id = p_evento;
$$;

-- A corrida no Uber. Leva o pedido a 'a_caminho' e 'entregue'; o resto so
-- fica registrado.
create function privado.aplicar_entrega(
  p_pedido uuid,
  p_uber_entrega_id text,
  p_status_uber text,
  p_rastreio_url text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select p.status into v_status from public.pedidos p where p.id = p_pedido for update;
  if v_status is null then
    raise exception using errcode = 'P0001', message = 'pedido_invalido';
  end if;
  if p_rastreio_url is not null and (char_length(p_rastreio_url) > 500
     or p_rastreio_url !~ '^https://([a-z0-9-]+\.)*uber\.com/[^[:space:][:cntrl:]<>"'']*$') then
    raise exception using errcode = 'P0001', message = 'rastreio_invalido';
  end if;

  insert into privado.entregas (pedido_id, uber_entrega_id, status_uber)
  values (p_pedido, p_uber_entrega_id, p_status_uber)
  on conflict (pedido_id) do update set
    uber_entrega_id = excluded.uber_entrega_id,
    status_uber = excluded.status_uber,
    atualizado_em = now();

  if p_rastreio_url is not null then
    update public.pedidos p set rastreio_url = p_rastreio_url where p.id = p_pedido;
  end if;

  if p_status_uber in ('pickup_complete', 'dropoff', 'delivered') and v_status = 'em_preparo' then
    update public.pedidos p set status = 'a_caminho' where p.id = p_pedido;
    v_status := 'a_caminho';
  end if;
  if p_status_uber = 'delivered' and v_status = 'a_caminho' then
    update public.pedidos p set status = 'entregue' where p.id = p_pedido;
    v_status := 'entregue';
  end if;

  return v_status;
end
$$;

-- Conta um uso e diz se ainda cabe: no maximo p_maximo por janela de
-- p_janela_segundos.
create function privado.consumir_limite(p_chave text, p_maximo integer, p_janela_segundos integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_janela timestamptz;
  v_contagem integer;
begin
  if p_chave is null or char_length(p_chave) not between 1 and 500
     or p_maximo is null or p_maximo < 1
     or p_janela_segundos is null or p_janela_segundos not between 1 and 86400 then
    raise exception using errcode = 'P0001', message = 'limite_invalido';
  end if;

  v_janela := to_timestamp(floor(extract(epoch from now()) / p_janela_segundos) * p_janela_segundos);

  insert into privado.limites (chave, janela)
  values (encode(sha256(convert_to(p_chave, 'UTF8')), 'hex'), v_janela)
  on conflict (chave, janela) do update set contagem = privado.limites.contagem + 1
  returning privado.limites.contagem into v_contagem;

  return v_contagem <= p_maximo;
end
$$;

grant execute on function privado.aplicar_pagamento(uuid, text, text, text, text, integer, text, text, integer, text, text, timestamptz, text)
  to service_role;
grant execute on function privado.pagamentos_a_reconciliar() to service_role;
grant execute on function privado.registrar_evento_webhook(text, text, text, text) to service_role;
grant execute on function privado.concluir_evento_webhook(bigint, text) to service_role;
grant execute on function privado.aplicar_entrega(uuid, text, text, text) to service_role;
grant execute on function privado.consumir_limite(text, integer, integer) to service_role;
