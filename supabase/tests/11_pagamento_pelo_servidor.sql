-- O banco do pagamento pelo servidor: as tentativas a cancelar no Mercado
-- Pago (todas, as de um pedido e as de uma cliente) e o pedido de uma
-- tentativa.

insert into _v values ('a', pg_temp.nova_cliente('a@teste.invalid'));
insert into _v values ('p1', pg_temp.pedido_de_exemplo(pg_temp.id('a')));
insert into _v values ('p2', pg_temp.pedido_de_exemplo(pg_temp.id('a')));
insert into _v values ('p3', pg_temp.pedido_de_exemplo(pg_temp.id('a')));

create function pg_temp.tentativa(p_pedido uuid, p_status text, p_mp text, p_status_mp text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.pagamentos (pedido_id, forma, valor_centavos) values (p_pedido, 'pix', 2880) returning id into v_id;
  if p_status <> 'pendente' then
    update public.pagamentos set status = p_status where id = v_id;
  end if;
  if p_status_mp is not null then
    insert into privado.pagamentos_mp (pagamento_id, mp_pedido_id, status_mp) values (v_id, p_mp, p_status_mp);
  end if;
  return v_id;
end
$$;

insert into _v values ('cancelada', pg_temp.tentativa(pg_temp.id('p1'), 'cancelado', 'ORD_A', 'pendente'));
insert into _v values ('expirada', pg_temp.tentativa(pg_temp.id('p2'), 'expirado', 'ORD_B', 'pendente'));
insert into _v values ('ja_cancelada_la', pg_temp.tentativa(pg_temp.id('p1'), 'cancelado', 'ORD_C', 'cancelado'));
insert into _v values ('sem_mp_pedido', pg_temp.tentativa(pg_temp.id('p1'), 'cancelado', null, 'pendente'));
insert into _v values ('ainda_pendente', pg_temp.tentativa(pg_temp.id('p3'), 'pendente', 'ORD_D', 'pendente'));
insert into _v values ('sem_linha', pg_temp.tentativa(pg_temp.id('p2'), 'cancelado', null, null));

select pg_temp.verificar('cancelada com status pendente no MP aparece',
  exists (select 1 from privado.pagamentos_a_cancelar_no_mp() where pagamento_id = pg_temp.id('cancelada') and mp_pedido_id = 'ORD_A'));
select pg_temp.verificar('expirada com status pendente no MP aparece',
  exists (select 1 from privado.pagamentos_a_cancelar_no_mp() where pagamento_id = pg_temp.id('expirada')));
select pg_temp.verificar('ja cancelada no MP nao aparece',
  not exists (select 1 from privado.pagamentos_a_cancelar_no_mp() where pagamento_id = pg_temp.id('ja_cancelada_la')));
select pg_temp.verificar('sem mp_pedido_id nao aparece',
  not exists (select 1 from privado.pagamentos_a_cancelar_no_mp() where pagamento_id = pg_temp.id('sem_mp_pedido')));
select pg_temp.verificar('ainda pendente aqui nao aparece',
  not exists (select 1 from privado.pagamentos_a_cancelar_no_mp() where pagamento_id = pg_temp.id('ainda_pendente')));
select pg_temp.verificar('sem linha no privado nao aparece',
  not exists (select 1 from privado.pagamentos_a_cancelar_no_mp() where pagamento_id = pg_temp.id('sem_linha')));
select pg_temp.verificar('o filtro por pedido traz so as dele',
  (select count(*) = 1 and bool_and(pagamento_id = pg_temp.id('cancelada'))
   from privado.pagamentos_a_cancelar_no_mp(pg_temp.id('p1'))));
select pg_temp.verificar('pedido sem tentativa a cancelar: vazio',
  not exists (select 1 from privado.pagamentos_a_cancelar_no_mp(gen_random_uuid())));

select pg_temp.verificar('mp_pedido_da_tentativa devolve o id',
  privado.mp_pedido_da_tentativa(pg_temp.id('cancelada')) = 'ORD_A');
select pg_temp.verificar('sem linha no privado: nulo',
  privado.mp_pedido_da_tentativa(pg_temp.id('sem_linha')) is null);

select pg_temp.verificar('visitante nao executa a lista',
  pg_temp.como('anon', null, $$select * from privado.pagamentos_a_cancelar_no_mp()$$) like '42501%');
select pg_temp.verificar('cliente nao executa a lista',
  pg_temp.como('authenticated', pg_temp.id('a'), $$select * from privado.pagamentos_a_cancelar_no_mp()$$) like '42501%');
select pg_temp.verificar('visitante nao executa mp_pedido_da_tentativa',
  pg_temp.como('anon', null, format($$select privado.mp_pedido_da_tentativa(%L)$$, pg_temp.id('cancelada'))) like '42501%');
select pg_temp.verificar('cliente nao executa mp_pedido_da_tentativa',
  pg_temp.como('authenticated', pg_temp.id('a'), format($$select privado.mp_pedido_da_tentativa(%L)$$, pg_temp.id('cancelada'))) like '42501%');
select pg_temp.verificar('a chave secreta executa a lista',
  pg_temp.como('service_role', null, $$select * from privado.pagamentos_a_cancelar_no_mp()$$) = 'ok');
select pg_temp.verificar('a chave secreta executa mp_pedido_da_tentativa',
  pg_temp.como('service_role', null, format($$select privado.mp_pedido_da_tentativa(%L)$$, pg_temp.id('cancelada'))) = 'ok');

-- as da cliente: de todos os pedidos dela, nunca de outra
insert into _v values ('b', pg_temp.nova_cliente('b@teste.invalid'));
insert into _v values ('pb', pg_temp.pedido_de_exemplo(pg_temp.id('b')));
insert into _v values ('da_outra', pg_temp.tentativa(pg_temp.id('pb'), 'cancelado', 'ORD_E', 'pendente'));

select pg_temp.verificar('da cliente: as canceladas e expiradas pendentes no MP, de todos os pedidos dela',
  (select array_agg(pagamento_id order by pagamento_id) from privado.tentativas_a_cancelar_da_cliente(pg_temp.id('a')))
  = (select array_agg(id order by id) from unnest(array[pg_temp.id('cancelada'), pg_temp.id('expirada')]) id));
select pg_temp.verificar('da cliente: com o mp_pedido_id de cada uma',
  exists (select 1 from privado.tentativas_a_cancelar_da_cliente(pg_temp.id('a'))
          where pagamento_id = pg_temp.id('expirada') and mp_pedido_id = 'ORD_B'));
select pg_temp.verificar('da cliente: nao traz a tentativa de outra cliente',
  not exists (select 1 from privado.tentativas_a_cancelar_da_cliente(pg_temp.id('a')) where pagamento_id = pg_temp.id('da_outra')));
select pg_temp.verificar('da outra cliente: so a dela',
  (select count(*) = 1 and bool_and(pagamento_id = pg_temp.id('da_outra') and mp_pedido_id = 'ORD_E')
   from privado.tentativas_a_cancelar_da_cliente(pg_temp.id('b'))));
select pg_temp.verificar('cliente sem tentativa a cancelar: vazio',
  not exists (select 1 from privado.tentativas_a_cancelar_da_cliente(gen_random_uuid())));
select pg_temp.verificar('da cliente: ja cancelada no MP, sem mp_pedido_id ou ainda pendente aqui ficam de fora',
  not exists (select 1 from privado.tentativas_a_cancelar_da_cliente(pg_temp.id('a'))
              where pagamento_id in (pg_temp.id('ja_cancelada_la'), pg_temp.id('sem_mp_pedido'), pg_temp.id('ainda_pendente'), pg_temp.id('sem_linha'))));

insert into _v values ('c', pg_temp.nova_cliente('c@teste.invalid'));
insert into _v values ('pc', pg_temp.pedido_de_exemplo(pg_temp.id('c')));
select pg_temp.tentativa(pg_temp.id('pc'), 'cancelado', 'ORD_X' || g, 'pendente') from generate_series(1, 201) g;
select pg_temp.verificar('da cliente: no maximo 200',
  (select count(*) = 200 from privado.tentativas_a_cancelar_da_cliente(pg_temp.id('c'))));

select pg_temp.verificar('visitante nao executa a lista da cliente',
  pg_temp.como('anon', null, format($$select * from privado.tentativas_a_cancelar_da_cliente(%L)$$, pg_temp.id('a'))) like '42501%');
select pg_temp.verificar('cliente nao executa a lista da cliente, nem a propria',
  pg_temp.como('authenticated', pg_temp.id('a'), format($$select * from privado.tentativas_a_cancelar_da_cliente(%L)$$, pg_temp.id('a'))) like '42501%');
select pg_temp.verificar('a chave secreta executa a lista da cliente',
  pg_temp.como('service_role', null, format($$select * from privado.tentativas_a_cancelar_da_cliente(%L)$$, pg_temp.id('a'))) = 'ok');

select * from pg_temp.relatorio();
rollback;
