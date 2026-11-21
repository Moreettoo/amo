-- Tentativas encerradas aqui que o Mercado Pago ainda tem como pendentes: o
-- servidor as cancela la.
create function privado.pagamentos_a_cancelar_no_mp(p_pedido uuid default null)
returns table (pagamento_id uuid, mp_pedido_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select pg.id, m.mp_pedido_id
  from public.pagamentos pg
  join privado.pagamentos_mp m on m.pagamento_id = pg.id
  where pg.status in ('cancelado', 'expirado')
    and m.status_mp = 'pendente'
    and m.mp_pedido_id is not null
    and (p_pedido is null or pg.pedido_id = p_pedido)
  order by pg.criado_em
  limit 200;
$$;

-- O pedido do Mercado Pago de uma tentativa, ou nulo.
create function privado.mp_pedido_da_tentativa(p_pagamento uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.mp_pedido_id from privado.pagamentos_mp m where m.pagamento_id = p_pagamento;
$$;

grant execute on function privado.pagamentos_a_cancelar_no_mp(uuid) to service_role;
grant execute on function privado.mp_pedido_da_tentativa(uuid) to service_role;
