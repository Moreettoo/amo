-- A revisao final da corrida (spec 8.2 a 8.4).
--
-- 1. A cotacao guardada vence quando deixa de valer para o pedido: a Uber
--    cancelou e a corrida volta a a_criar (a segunda corrida cota de novo,
--    spec 8.3), ou a corrida foi remarcada (a cotacao do agora nao serve
--    para a faixa). O servidor ja cota de novo quando a cotacao venceu.
-- 2. O pedido cancelado depois de uma tentativa de criar: a Uber pode ter a
--    corrida (falha incerta), entao a_criar e precisa_da_equipe sem id e com
--    tentativas vao a a_cancelar, e escalar_cancelamentos_incertos as leva a
--    equipe depois de 10 minutos. Sem tentativa, continuam indo a cancelada.
-- 3. corrida_nao_cancelavel: a Uber respondeu 409 ao cancelamento e a
--    corrida nao esta cancelada (ja anda); a equipe resolve.
--
-- As funcoes mudam por create or replace, com as mesmas assinaturas, e os
-- grants refeitos.

-- O pedido virou pago: nasce a corrida (uma so; repetir nao grava outra).
-- Virou cancelado: a corrida que a Uber tem (ou pode ter) vai a a_cancelar,
-- tambem a que estava com a equipe e segue viva na Uber, e a sem id que ja
-- teve uma tentativa de criar; a que nunca foi a Uber, a cancelada.
create or replace function privado.pedido_e_corrida()
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
               and coalesce(e.status_uber, '') not in ('delivered', 'canceled', 'returned'))
           or (e.estado in ('a_criar', 'precisa_da_equipe') and e.uber_entrega_id is null and e.tentativas > 0));
    update privado.entregas e set estado = 'cancelada', atualizado_em = now()
    where e.pedido_id = new.id and e.estado in ('a_criar', 'precisa_da_equipe') and e.uber_entrega_id is null
      and e.tentativas = 0;
  end if;
  return null;
end
$$;

-- O que a Uber disse da corrida, achada pelo id dela. Sem corrida com esse
-- id, devolve zero linhas. pickup_complete e dropoff levam pago ou em_preparo
-- a a_caminho; delivered passa por a_caminho e chega a entregue. Um estado
-- velho nunca volta o pedido. canceled pedido por nos fecha a corrida; sem
-- termos pedido, a primeira vez volta a a_criar com chave nova e a cotacao
-- vencida (a segunda corrida cota de novo), e a segunda chama a equipe.
-- returned chama a equipe.
create or replace function privado.aplicar_entrega(
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
      -- a cotacao ja virou a primeira corrida: a segunda cota de novo
      update privado.cotacoes c set expira_em = least(c.expira_em, now()) where c.pedido_id = v_pedido;
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

-- A corrida remarcada (spec 8.2, passo 2): o pedido pago passa a agendado
-- na faixa dada, que tem de valer agora (sem olhar a pausa das vendas). A
-- marca amo.remarcando so fica ligada durante o update. A cotacao guardada
-- era do horario antigo e vence: a corrida cota de novo com a faixa.
create or replace function privado.remarcar_entrega(p_pedido uuid, p_inicio timestamptz, p_fim timestamptz)
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

  update privado.cotacoes c set expira_em = least(c.expira_em, now()) where c.pedido_id = p_pedido;
end
$$;

-- A Uber recusou o cancelamento (409) e a corrida nao esta cancelada: ela
-- ja anda. a_cancelar vai a equipe, com o id, para resolver com a Uber.
create function privado.corrida_nao_cancelavel(p_pedido uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update privado.entregas e set estado = 'precisa_da_equipe', motivo = 'nao_cancelavel', atualizado_em = now()
  where e.pedido_id = p_pedido and e.estado = 'a_cancelar';
$$;

revoke all on function privado.corrida_nao_cancelavel(uuid) from public, anon, authenticated;
grant execute on function privado.aplicar_entrega(text, text, text, integer) to service_role;
grant execute on function privado.remarcar_entrega(uuid, timestamptz, timestamptz) to service_role;
grant execute on function privado.corrida_nao_cancelavel(uuid) to service_role;
