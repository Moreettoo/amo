-- O banco do pagamento pelo servidor: as tentativas a cancelar no Mercado
-- Pago e o pedido de uma tentativa.

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

select * from pg_temp.relatorio();
rollback;
