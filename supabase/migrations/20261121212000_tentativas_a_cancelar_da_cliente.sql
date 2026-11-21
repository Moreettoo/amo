-- As tentativas de todos os pedidos de uma cliente que terminaram aqui e que
-- o Mercado Pago ainda tem como pendentes. criar_pedido cancela so do lado de
-- ca o pedido que aguardava (e a tentativa dele): o servidor cancela estas la
-- quando a cliente fecha um pedido novo e antes de criar uma cobranca nova,
-- para o QR antigo deixar de valer.
create function privado.tentativas_a_cancelar_da_cliente(p_usuario uuid)
returns table (pagamento_id uuid, mp_pedido_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select pg.id, m.mp_pedido_id
  from public.pedidos p
  join public.pagamentos pg on pg.pedido_id = p.id
  join privado.pagamentos_mp m on m.pagamento_id = pg.id
  where p.user_id = p_usuario
    and pg.status in ('cancelado', 'expirado')
    and m.status_mp = 'pendente'
    and m.mp_pedido_id is not null
  order by pg.criado_em
  limit 200;
$$;

grant execute on function privado.tentativas_a_cancelar_da_cliente(uuid) to service_role;
