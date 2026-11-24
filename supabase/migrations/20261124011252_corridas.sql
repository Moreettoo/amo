-- AMO: a corrida no banco (spec 8 da entrega pelo Uber Direct).
--
-- A corrida nasce com o pagamento: o gatilho pedido_e_corrida grava a linha
-- a_criar na mesma transacao em que o pedido vira pago, por qualquer caminho.
-- O servidor reserva (reservar_corridas), cria na Uber e marca criada ou
-- falhou. O pedido cancelado pede o cancelamento da corrida; a data fechada
-- chama a equipe. aplicar_entrega passa a achar a corrida pelo id da Uber e
-- aceita a partir de pago.
--
-- Estados da corrida:
--   a_criar            esperando o servidor criar na Uber
--   criando            reservada; volta a ser reservada se parar 2 minutos
--   criada             a Uber tem a corrida (uber_entrega_id)
--   a_cancelar         o pedido foi cancelado; o servidor cancela na Uber
--   cancelada          fim, sem corrida ativa na Uber
--   precisa_da_equipe  a equipe resolve (motivo diz por que)
--
-- Codigos de erro novos (mensagem da excecao, SQLSTATE P0001):
--   corrida_invalida  pedido sem corrida, ou id da Uber que nao confere
--   motivo_invalido   motivo fora do formato de codigo

alter table privado.entregas
  add column estado text not null default 'a_criar' check (estado in (
    'a_criar', 'criando', 'criada', 'a_cancelar', 'cancelada', 'precisa_da_equipe')),
  add column chave uuid not null default gen_random_uuid(),
  add column tentativas integer not null default 0,
  add column cancelamentos_uber integer not null default 0,
  add column valor_uber_centavos integer check (valor_uber_centavos between 0 and 100000),
  add column motivo text check (motivo ~ '^[a-z0-9_]{1,60}$'),
  add column reservado_em timestamptz,
  add column criado_em timestamptz not null default now();

-- uma linha de antes, com o id da Uber, ja e uma corrida criada
update privado.entregas e set estado = 'criada' where e.uber_entrega_id is not null;

create index entregas_estado on privado.entregas (estado, atualizado_em);

-- O pedido virou pago: nasce a corrida (uma so; repetir nao grava outra).
-- Virou cancelado: a corrida que a Uber tem (ou pode ter) vai a a_cancelar,
-- tambem a que estava com a equipe e segue viva na Uber; a que ainda nao foi
-- a Uber, a cancelada.
create function privado.pedido_e_corrida()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pago' and old.status is distinct from 'pago' then
    insert into privado.entregas (pedido_id) values (new.id)
    on conflict (pedido_id) do nothing;
  elsif new.status = 'cancelado' and old.status is distinct from 'cancelado' then
    update privado.entregas e set estado = 'a_cancelar', atualizado_em = now()
    where e.pedido_id = new.id
      and (e.estado in ('criada', 'criando')
           or (e.estado = 'precisa_da_equipe' and e.uber_entrega_id is not null
               and coalesce(e.status_uber, '') not in ('delivered', 'canceled', 'returned')));
    update privado.entregas e set estado = 'cancelada', atualizado_em = now()
    where e.pedido_id = new.id and e.estado in ('a_criar', 'precisa_da_equipe') and e.uber_entrega_id is null;
  end if;
  return null;
end
$$;

create trigger pedido_e_corrida
  after update of status on public.pedidos
  for each row execute function privado.pedido_e_corrida();

-- Uma data fechada depois da venda: as corridas agendadas para ela (dia de
-- Sao Paulo) vao para a equipe.
create function privado.data_fechada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update privado.entregas e set estado = 'precisa_da_equipe', motivo = 'data_fechada', atualizado_em = now()
  from public.pedidos p
  where p.id = e.pedido_id
    and p.entrega_modo = 'agendado'
    and (p.entrega_janela_inicio at time zone 'America/Sao_Paulo')::date = new.data
    and e.estado in ('a_criar', 'criando', 'criada');
  return null;
end
$$;

create trigger data_fechada
  after insert on public.dias_fechados
  for each row execute function privado.data_fechada();

-- Reserva ate p_maximo (no maximo 50) corridas a criar, e as criando paradas
-- ha mais de 2 minutos, e devolve so o que a Uber precisa. A linha travada
-- por outra chamada fica de fora (skip locked); a reservada agora nao volta
-- antes de 2 minutos.
create function privado.reservar_corridas(p_maximo integer)
returns table (
  pedido uuid,
  numero text,
  chave uuid,
  cliente_nome text,
  cliente_celular text,
  cep text,
  logradouro text,
  numero_casa text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  modo text,
  janela_inicio timestamptz,
  janela_fim timestamptz,
  subtotal_centavos integer,
  frete_centavos integer,
  origem text,
  uber_cotacao_id text,
  cotacao_expira_em timestamptz,
  itens jsonb
)
language sql
volatile
security definer
set search_path = ''
as $$
  with escolhidas as (
    select e.pedido_id
    from privado.entregas e
    where e.estado = 'a_criar'
       or (e.estado = 'criando' and e.reservado_em < now() - interval '2 minutes')
    order by e.criado_em, e.pedido_id
    limit least(greatest(coalesce(p_maximo, 0), 0), 50)
    for update skip locked
  ),
  reservadas as (
    update privado.entregas e
    set estado = 'criando', reservado_em = now(), atualizado_em = now()
    from escolhidas x
    where e.pedido_id = x.pedido_id
    returning e.pedido_id, e.chave
  )
  select
    p.id, p.numero, r.chave, p.cliente_nome, p.cliente_celular,
    p.entrega_cep, p.entrega_logradouro, p.entrega_numero, p.entrega_complemento,
    p.entrega_bairro, p.entrega_cidade, p.entrega_uf,
    p.entrega_modo, p.entrega_janela_inicio, p.entrega_janela_fim,
    p.subtotal_centavos, p.frete_centavos,
    c.origem, c.uber_cotacao_id, c.expira_em,
    coalesce((
      select jsonb_agg(jsonb_build_object('nome', i.nome, 'quantos', i.quantos, 'preco_centavos', i.preco_centavos)
        order by i.nome, i.produto)
      from public.itens_do_pedido i
      where i.pedido_id = p.id), '[]'::jsonb)
  from reservadas r
  join public.pedidos p on p.id = r.pedido_id
  left join lateral (
    select ct.origem, ct.uber_cotacao_id, ct.expira_em
    from privado.cotacoes ct
    where ct.pedido_id = p.id
    order by ct.criado_em desc
    limit 1
  ) c on true;
$$;

-- O que a Uber disse da corrida, achada pelo id dela. Sem corrida com esse
-- id, devolve zero linhas. pickup_complete e dropoff levam pago ou em_preparo
-- a a_caminho; delivered passa por a_caminho e chega a entregue. Um estado
-- velho nunca volta o pedido. canceled pedido por nos fecha a corrida; sem
-- termos pedido, a primeira vez volta a a_criar com chave nova e a segunda
-- chama a equipe. returned chama a equipe.
drop function privado.aplicar_entrega(uuid, text, text, text);

create function privado.aplicar_entrega(
  p_uber_entrega_id text,
  p_status_uber text,
  p_rastreio_url text,
  p_valor_uber_centavos integer
)
returns table (pedido uuid, pedido_status text, estado text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_pedido uuid;
  v_status text;
  v_entrega privado.entregas%rowtype;
  v_estado text;
begin
  if p_status_uber is null or p_status_uber !~ '^[a-z_]{1,40}$' then
    raise exception using errcode = 'P0001', message = 'status_invalido';
  end if;
  if p_rastreio_url is not null and (char_length(p_rastreio_url) > 500
     or p_rastreio_url !~ '^https://([a-z0-9-]+\.)*uber\.com/[^[:space:][:cntrl:]<>"'']*$') then
    raise exception using errcode = 'P0001', message = 'rastreio_invalido';
  end if;

  select e.pedido_id into v_pedido from privado.entregas e where e.uber_entrega_id = p_uber_entrega_id;
  if v_pedido is null then
    return;
  end if;

  -- trava o pedido antes da corrida, na mesma ordem do gatilho do pedido
  select p.status into v_status from public.pedidos p where p.id = v_pedido for update;
  select * into v_entrega from privado.entregas e where e.pedido_id = v_pedido for update;
  if v_entrega.uber_entrega_id is distinct from p_uber_entrega_id then
    return;
  end if;

  update privado.entregas e set
    status_uber = case when e.status_uber in ('delivered', 'canceled', 'returned') then e.status_uber
                       else p_status_uber end,
    valor_uber_centavos = coalesce(p_valor_uber_centavos, e.valor_uber_centavos),
    atualizado_em = now()
  where e.pedido_id = v_pedido;

  if p_rastreio_url is not null then
    update public.pedidos p set rastreio_url = p_rastreio_url where p.id = v_pedido;
  end if;

  if p_status_uber in ('pickup_complete', 'dropoff', 'delivered') and v_status in ('pago', 'em_preparo') then
    update public.pedidos p set status = 'a_caminho' where p.id = v_pedido;
    v_status := 'a_caminho';
  end if;
  if p_status_uber = 'delivered' and v_status = 'a_caminho' then
    update public.pedidos p set status = 'entregue' where p.id = v_pedido;
    v_status := 'entregue';
  end if;

  v_estado := v_entrega.estado;
  if p_status_uber = 'canceled' then
    if v_entrega.estado in ('a_cancelar', 'cancelada') then
      v_estado := 'cancelada';
      update privado.entregas e set estado = v_estado where e.pedido_id = v_pedido;
    elsif v_entrega.estado = 'criada' and v_entrega.cancelamentos_uber = 0
          and v_status in ('pago', 'em_preparo') then
      -- a Uber cancelou sem termos pedido: uma segunda corrida, do zero
      v_estado := 'a_criar';
      update privado.entregas e set
        estado = v_estado, chave = gen_random_uuid(), uber_entrega_id = null, status_uber = null,
        valor_uber_centavos = null, reservado_em = null, tentativas = 0, cancelamentos_uber = 1,
        motivo = 'cancelada_pela_uber'
      where e.pedido_id = v_pedido;
      update public.pedidos p set rastreio_url = null where p.id = v_pedido;
    elsif v_entrega.estado = 'criada' then
      v_estado := 'precisa_da_equipe';
      update privado.entregas e set
        estado = v_estado, cancelamentos_uber = v_entrega.cancelamentos_uber + 1, motivo = 'cancelada_pela_uber'
      where e.pedido_id = v_pedido;
    end if;
  elsif p_status_uber = 'returned' and v_entrega.estado <> 'cancelada' then
    v_estado := 'precisa_da_equipe';
    update privado.entregas e set estado = v_estado, motivo = 'devolvida' where e.pedido_id = v_pedido;
  end if;

  return query select v_pedido, v_status, v_estado;
end
$$;

-- A Uber criou a corrida: criando (ou a_criar) vira criada; a_cancelar
-- continua a_cancelar (o pedido foi cancelado no meio) e a cancelada volta
-- a a_cancelar (ha uma corrida viva para cancelar). Depois aplica o estado
-- que a Uber deu, como aplicar_entrega. Devolve o estado da corrida.
create function privado.marcar_corrida_criada(
  p_pedido uuid,
  p_uber_entrega_id text,
  p_valor_uber_centavos integer,
  p_rastreio_url text,
  p_status_uber text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_entrega privado.entregas%rowtype;
  v_estado text;
begin
  if p_uber_entrega_id is null then
    raise exception using errcode = 'P0001', message = 'corrida_invalida';
  end if;

  -- trava o pedido antes da corrida, na mesma ordem do gatilho do pedido
  perform 1 from public.pedidos p where p.id = p_pedido for update;
  select * into v_entrega from privado.entregas e where e.pedido_id = p_pedido for update;
  if not found or (v_entrega.uber_entrega_id is not null and v_entrega.uber_entrega_id <> p_uber_entrega_id) then
    raise exception using errcode = 'P0001', message = 'corrida_invalida';
  end if;

  v_estado := case v_entrega.estado
    when 'criando' then 'criada'
    when 'a_criar' then 'criada'
    when 'cancelada' then 'a_cancelar'
    else v_entrega.estado end;

  update privado.entregas e set
    uber_entrega_id = p_uber_entrega_id, estado = v_estado, reservado_em = null, atualizado_em = now()
  where e.pedido_id = p_pedido;

  select a.estado into v_estado
  from privado.aplicar_entrega(p_uber_entrega_id, p_status_uber, p_rastreio_url, p_valor_uber_centavos) a;
  return v_estado;
end
$$;

-- A criacao na Uber falhou: soma a tentativa e grava o motivo. a_cancelar
-- vira cancelada; falha definitiva ou a quinta tentativa chamam a equipe; o
-- resto volta a a_criar. Corrida ja criada, cancelada ou com a equipe nao
-- muda. Devolve o estado da corrida.
create function privado.marcar_corrida_falhou(p_pedido uuid, p_motivo text, p_definitiva boolean)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_entrega privado.entregas%rowtype;
  v_estado text;
begin
  if p_motivo is null or p_motivo !~ '^[a-z0-9_]{1,60}$' then
    raise exception using errcode = 'P0001', message = 'motivo_invalido';
  end if;

  select * into v_entrega from privado.entregas e where e.pedido_id = p_pedido for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'corrida_invalida';
  end if;
  if v_entrega.estado not in ('a_criar', 'criando', 'a_cancelar') then
    return v_entrega.estado;
  end if;

  v_estado := case
    when v_entrega.estado = 'a_cancelar' then 'cancelada'
    when coalesce(p_definitiva, false) or v_entrega.tentativas + 1 >= 5 then 'precisa_da_equipe'
    else 'a_criar' end;

  update privado.entregas e set
    estado = v_estado, tentativas = e.tentativas + 1, motivo = p_motivo, reservado_em = null, atualizado_em = now()
  where e.pedido_id = p_pedido;
  return v_estado;
end
$$;

-- A corrida remarcada (spec 8.2, passo 2): o pedido pago passa a agendado
-- na faixa dada, que tem de valer agora (sem olhar a pausa das vendas). A
-- marca amo.remarcando so fica ligada durante o update.
create function privado.remarcar_entrega(p_pedido uuid, p_inicio timestamptz, p_fim timestamptz)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if not privado.faixa_valida(p_inicio, p_fim, now(), false) then
    raise exception using errcode = 'P0001', message = 'faixa_indisponivel';
  end if;

  select p.status into v_status from public.pedidos p where p.id = p_pedido for update;
  if v_status is distinct from 'pago' then
    raise exception using errcode = 'P0001', message = 'pedido_invalido';
  end if;

  perform set_config('amo.remarcando', 'sim', true);
  update public.pedidos p
  set entrega_modo = 'agendado', entrega_janela_inicio = p_inicio, entrega_janela_fim = p_fim
  where p.id = p_pedido;
  perform set_config('amo.remarcando', '', true);
end
$$;

-- As corridas que o servidor cancela na Uber.
create function privado.corridas_a_cancelar()
returns table (pedido uuid, uber_entrega_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.pedido_id, e.uber_entrega_id
  from privado.entregas e
  where e.estado = 'a_cancelar' and e.uber_entrega_id is not null
  order by e.atualizado_em
  limit 200;
$$;

-- A Uber confirmou o cancelamento que pedimos.
create function privado.corrida_cancelada(p_pedido uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update privado.entregas e set estado = 'cancelada', atualizado_em = now()
  where e.pedido_id = p_pedido and e.estado = 'a_cancelar';
$$;

-- As corridas criadas sem estado final e sem noticia ha mais de 10 minutos:
-- o servidor pergunta a Uber (aviso perdido).
create function privado.corridas_a_conferir()
returns table (uber_entrega_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.uber_entrega_id
  from privado.entregas e
  where e.estado = 'criada'
    and e.uber_entrega_id is not null
    and (e.status_uber is null or e.status_uber not in ('delivered', 'canceled', 'returned'))
    and e.atualizado_em < now() - interval '10 minutes'
  order by e.atualizado_em
  limit 200;
$$;

grant execute on function privado.reservar_corridas(integer) to service_role;
grant execute on function privado.aplicar_entrega(text, text, text, integer) to service_role;
grant execute on function privado.marcar_corrida_criada(uuid, text, integer, text, text) to service_role;
grant execute on function privado.marcar_corrida_falhou(uuid, text, boolean) to service_role;
grant execute on function privado.remarcar_entrega(uuid, timestamptz, timestamptz) to service_role;
grant execute on function privado.corridas_a_cancelar() to service_role;
grant execute on function privado.corrida_cancelada(uuid) to service_role;
grant execute on function privado.corridas_a_conferir() to service_role;
