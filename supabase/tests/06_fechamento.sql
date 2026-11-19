-- O fechamento (spec 9.1, 9.2 e 10.2): o banco calcula o total, recusa o que
-- nao confere e nunca cria dois pedidos por um clique duplo.

create temp table _t (nome text primary key, valor text);

insert into _v values
  ('a', pg_temp.nova_cliente('a@teste.invalid')),
  ('b', pg_temp.nova_cliente('b@teste.invalid')),
  ('c', pg_temp.nova_cliente('c@teste.invalid')),
  ('nao_confirmada', pg_temp.nova_cliente('n@teste.invalid', null, false));

create function pg_temp.cotacao(p_usuario uuid, p_valor integer default 990)
returns uuid
language sql
as $$
  select privado.registrar_cotacao(p_usuario, '04567000', 'Rua Siqueira Bueno', '120', 'ap 52',
    'Belenzinho', 'São Paulo', 'SP', p_valor, 35, 'exemplo', null);
$$;

-- devolve o id do pedido como texto, ou 'erro ...'
create function pg_temp.pedir(p_usuario uuid, p_itens text, p_cotacao uuid, p_total integer,
  p_guardar boolean default false)
returns text
language sql
as $$
  select pg_temp.valor('authenticated', p_usuario, format(
    'select id::text from public.criar_pedido(%L::jsonb, %L::uuid, %s, %L)',
    p_itens, p_cotacao, p_total, p_guardar));
$$;

-- horario (o seed abre 9h e fecha 18h; 2026-11-18 e uma quarta)
select pg_temp.verificar('fechada as 8:59:59 de Sao Paulo', not privado.loja_aberta('2026-11-18 08:59:59-03'));
select pg_temp.verificar('aberta as 9:00 de Sao Paulo', privado.loja_aberta('2026-11-18 09:00:00-03'));
select pg_temp.verificar('aberta as 17:59:59 de Sao Paulo', privado.loja_aberta('2026-11-18 17:59:59-03'));
select pg_temp.verificar('fechada as 18:00 de Sao Paulo', not privado.loja_aberta('2026-11-18 18:00:00-03'));
select pg_temp.verificar('o fuso conta: 11:59 UTC e 8:59 em Sao Paulo', not privado.loja_aberta('2026-11-18 11:59:00Z'));
select pg_temp.verificar('o fuso conta: 12:00 UTC e 9:00 em Sao Paulo', privado.loja_aberta('2026-11-18 12:00:00Z'));

select pg_temp.preparar('update public.loja set vendas_pausadas = true where id');
select pg_temp.verificar('vendas pausadas fecham a loja', not privado.loja_aberta('2026-11-18 12:00:00-03'));
select pg_temp.preparar('update public.loja set vendas_pausadas = false where id');

select pg_temp.preparar('delete from public.horarios where dia_da_semana = 3');
select pg_temp.verificar('dia sem horario e dia fechado', not privado.loja_aberta('2026-11-18 12:00:00-03'));

-- daqui em diante a loja fica aberta o dia todo, para o teste nao depender do relogio
insert into public.horarios (dia_da_semana, abre, fecha) values (3, '00:00', '24:00');
select pg_temp.preparar($$update public.horarios set abre = '00:00', fecha = '24:00' where true$$);

-- o pedido
insert into _v values ('cot1', pg_temp.cotacao(pg_temp.id('a')));
insert into _t values ('p1', pg_temp.pedir(pg_temp.id('a'), '[{"produto":"prestigio","quantos":2}]', pg_temp.id('cot1'), 4770));

select pg_temp.verificar('pedido criado', (select valor ~ '^[0-9a-f-]{36}$' from _t where nome = 'p1'),
  (select valor from _t where nome = 'p1'));

select pg_temp.verificar('valores calculados pelo banco',
  (select numero ~ '^AMO-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$' and subtotal_centavos = 3780
     and frete_centavos = 990 and total_centavos = 4770 and status = 'aguardando_pagamento'
   from public.pedidos where id = (select valor::uuid from _t where nome = 'p1')));

select pg_temp.verificar('retrato da cliente e da entrega',
  (select cliente_nome = 'Cliente Teste' and cliente_email = 'a@teste.invalid' and cliente_celular = '11987654321'
     and entrega_cep = '04567000' and entrega_logradouro = 'Rua Siqueira Bueno' and entrega_minutos = 35
   from public.pedidos where id = (select valor::uuid from _t where nome = 'p1')));

select pg_temp.verificar('item com nome, tipo e preco do banco',
  (select count(*) = 1 and bool_and(produto = 'prestigio' and nome = 'Prestígio' and tipo = 'Bolo no pote'
     and preco_centavos = 1890 and quantos = 2 and total_centavos = 3780)
   from public.itens_do_pedido where pedido_id = (select valor::uuid from _t where nome = 'p1')));

select pg_temp.verificar('a cotacao fica ligada ao pedido',
  (select user_id = pg_temp.id('a') and pedido_id = (select valor::uuid from _t where nome = 'p1')
   from privado.cotacoes where id = pg_temp.id('cot1')));

select pg_temp.verificar('clique duplo devolve o mesmo pedido',
  pg_temp.pedir(pg_temp.id('a'), '[{"produto":"prestigio","quantos":2}]', pg_temp.id('cot1'), 4770)
  = (select valor from _t where nome = 'p1'));

insert into _t values ('p2', pg_temp.pedir(pg_temp.id('a'),
  '[{"produto":"prestigio","quantos":1},{"produto":"ninho-com-frutas-vermelhas","quantos":1}]', pg_temp.id('cot1'), 5070));

select pg_temp.verificar('trocar os potes cria outro pedido',
  (select valor ~ '^[0-9a-f-]{36}$' and valor <> (select valor from _t where nome = 'p1') from _t where nome = 'p2'),
  (select valor from _t where nome = 'p2'));

select pg_temp.verificar('o pedido anterior e cancelado pela cliente',
  (select status = 'cancelado' and motivo_cancelamento = 'cliente'
   from public.pedidos where id = (select valor::uuid from _t where nome = 'p1')));

select pg_temp.verificar('um pedido aguardando por cliente',
  (select count(*) from public.pedidos where user_id = pg_temp.id('a') and status = 'aguardando_pagamento') = 1);

-- recusas
select pg_temp.verificar('total diferente do visto e recusado',
  pg_temp.pedir(pg_temp.id('a'), '[{"produto":"prestigio","quantos":1}]', pg_temp.cotacao(pg_temp.id('a')), 2879)
  like '%total_mudou%');

select pg_temp.preparar($$update public.produtos set a_venda = false where slug = 'pacoca'$$);
select pg_temp.verificar('produto fora de venda e recusado',
  pg_temp.pedir(pg_temp.id('a'), '[{"produto":"pacoca","quantos":1}]', pg_temp.cotacao(pg_temp.id('a')), 2880)
  like '%produto_indisponivel%');
select pg_temp.verificar('produto que nao existe e recusado',
  pg_temp.pedir(pg_temp.id('a'), '[{"produto":"bolo-inexistente","quantos":1}]', pg_temp.cotacao(pg_temp.id('a')), 2880)
  like '%produto_indisponivel%');

select pg_temp.verificar('itens invalidos: ' || itens,
  pg_temp.pedir(pg_temp.id('a'), itens, pg_temp.cotacao(pg_temp.id('a')), 2880) like '%itens_invalidos%',
  pg_temp.pedir(pg_temp.id('a'), itens, pg_temp.cotacao(pg_temp.id('a')), 2880))
from unnest(array[
  '[]',
  '{}',
  '"prestigio"',
  'null',
  '[1]',
  '[{"produto":"prestigio"}]',
  '[{"produto":"prestigio","quantos":0}]',
  '[{"produto":"prestigio","quantos":21}]',
  '[{"produto":"prestigio","quantos":"2"}]',
  '[{"produto":"prestigio","quantos":2.5}]',
  '[{"produto":"prestigio","quantos":-1}]',
  '[{"produto":"prestigio","quantos":2},{"produto":"prestigio","quantos":1}]',
  '[{"produto":"prestigio","quantos":1,"preco_centavos":1}]',
  '[{"produto":"Prestigio; drop table public.produtos","quantos":1}]',
  (select jsonb_agg(jsonb_build_object('produto', 'p' || g, 'quantos', 1))::text from generate_series(1, 31) g)
]) as itens;

insert into _v values ('vencida', gen_random_uuid());
insert into privado.cotacoes (id, user_id, cep, logradouro, numero, bairro, cidade, uf, valor_centavos, minutos, origem, expira_em)
values (pg_temp.id('vencida'), pg_temp.id('a'), '04567000', 'Rua X', '1', 'Centro', 'São Paulo', 'SP', 990, 35, 'exemplo',
  now() - interval '1 minute');
select pg_temp.verificar('cotacao vencida e recusada',
  pg_temp.pedir(pg_temp.id('a'), '[{"produto":"prestigio","quantos":1}]', pg_temp.id('vencida'), 2880)
  like '%cotacao_vencida%');

select pg_temp.verificar('cotacao de outra cliente e recusada',
  pg_temp.pedir(pg_temp.id('a'), '[{"produto":"prestigio","quantos":1}]', pg_temp.cotacao(pg_temp.id('b')), 2880)
  like '%cotacao_invalida%');

select pg_temp.verificar('cotacao inventada e recusada',
  pg_temp.pedir(pg_temp.id('a'), '[{"produto":"prestigio","quantos":1}]', gen_random_uuid(), 2880)
  like '%cotacao_invalida%');

insert into _v values ('sem_dona', pg_temp.cotacao(null));
select pg_temp.verificar('cotacao feita antes do login vira da cliente que a usa',
  pg_temp.pedir(pg_temp.id('c'), '[{"produto":"prestigio","quantos":1}]', pg_temp.id('sem_dona'), 2880) ~ '^[0-9a-f-]{36}$');
select pg_temp.verificar('e depois outra cliente nao a usa',
  pg_temp.pedir(pg_temp.id('b'), '[{"produto":"prestigio","quantos":1}]', pg_temp.id('sem_dona'), 2880)
  like '%cotacao_invalida%');

select pg_temp.preparar('update public.loja set vendas_pausadas = true where id');
select pg_temp.verificar('loja fechada recusa o pedido',
  pg_temp.pedir(pg_temp.id('a'), '[{"produto":"prestigio","quantos":1}]', pg_temp.cotacao(pg_temp.id('a')), 2880)
  like '%loja_fechada%');
select pg_temp.preparar('update public.loja set vendas_pausadas = false where id');

select pg_temp.verificar('e-mail nao confirmado nao compra',
  pg_temp.pedir(pg_temp.id('nao_confirmada'), '[{"produto":"prestigio","quantos":1}]',
    pg_temp.cotacao(pg_temp.id('nao_confirmada')), 2880) like '%email_nao_confirmado%');

select pg_temp.verificar('visitante nao chama criar_pedido',
  pg_temp.como('anon', null, format(
    $$select public.criar_pedido('[{"produto":"prestigio","quantos":1}]', %L, 2880, false)$$,
    pg_temp.cotacao(null))) like '42501%');

select pg_temp.pedido_de_exemplo(pg_temp.id('b')) from generate_series(1, 10);
select pg_temp.verificar('mais de 10 pedidos na hora e recusado',
  pg_temp.pedir(pg_temp.id('b'), '[{"produto":"prestigio","quantos":1}]', pg_temp.cotacao(pg_temp.id('b')), 2880)
  like '%muitos_pedidos%');

-- guardar o endereco
select pg_temp.verificar('guardar o endereco: pedido criado',
  pg_temp.pedir(pg_temp.id('a'), '[{"produto":"prestigio","quantos":1}]', pg_temp.cotacao(pg_temp.id('a')), 2880, true)
  ~ '^[0-9a-f-]{36}$');
select pg_temp.verificar('guardar o endereco: guardado como principal',
  (select count(*) = 1 and bool_and(principal and logradouro = 'Rua Siqueira Bueno')
   from public.enderecos where user_id = pg_temp.id('a')));

insert into public.enderecos (user_id, cep, logradouro, numero, bairro, cidade, uf)
select pg_temp.id('c'), '0100000' || g, 'Rua ' || g, g::text, 'Centro', 'São Paulo', 'SP'
from generate_series(1, 5) g;
select pg_temp.verificar('com 5 enderecos, guardar nao derruba a compra',
  pg_temp.pedir(pg_temp.id('c'), '[{"produto":"prestigio","quantos":1}]', pg_temp.cotacao(pg_temp.id('c')), 2880, true)
  ~ '^[0-9a-f-]{36}$');
select pg_temp.verificar('com 5 enderecos, continua com 5',
  (select count(*) from public.enderecos where user_id = pg_temp.id('c')) = 5);

-- tentativas de pagamento
-- o pedido da cliente que aguarda pagamento agora (cada pedido novo cancela o anterior)
insert into _t
select 'pag', id::text from public.pedidos
where user_id = pg_temp.id('a') and status = 'aguardando_pagamento';

select pg_temp.verificar('primeira tentativa',
  pg_temp.valor('authenticated', pg_temp.id('a'), format(
    $$select public.iniciar_pagamento(%L, 'pix')$$, (select valor from _t where nome = 'pag'))) ~ '^[0-9a-f-]{36}$');
select pg_temp.verificar('tentativa com o valor do pedido',
  (select count(*) = 1 and bool_and(status = 'pendente' and valor_centavos = 2880 and forma = 'pix')
   from public.pagamentos where pedido_id = (select valor::uuid from _t where nome = 'pag')));

select pg_temp.verificar('segunda tentativa cancela a primeira',
  pg_temp.valor('authenticated', pg_temp.id('a'), format(
    $$select public.iniciar_pagamento(%L, 'cartao')$$, (select valor from _t where nome = 'pag'))) ~ '^[0-9a-f-]{36}$');
select pg_temp.verificar('segunda tentativa: uma pendente, uma cancelada',
  (select string_agg(status, ',' order by status) from public.pagamentos
   where pedido_id = (select valor::uuid from _t where nome = 'pag')) = 'cancelado,pendente');

select pg_temp.verificar('terceira a quinta tentativas',
  bool_and(pg_temp.valor('authenticated', pg_temp.id('a'), format(
    $$select public.iniciar_pagamento(%L, 'pix')$$, (select valor from _t where nome = 'pag'))) ~ '^[0-9a-f-]{36}$'))
from generate_series(3, 5);
select pg_temp.verificar('sexta tentativa e recusada',
  pg_temp.valor('authenticated', pg_temp.id('a'), format(
    $$select public.iniciar_pagamento(%L, 'pix')$$, (select valor from _t where nome = 'pag'))) like '%muitas_tentativas%');

select pg_temp.verificar('outra cliente nao paga o pedido',
  pg_temp.valor('authenticated', pg_temp.id('b'), format(
    $$select public.iniciar_pagamento(%L, 'pix')$$, (select valor from _t where nome = 'pag'))) like '%pedido_invalido%');
select pg_temp.verificar('forma inventada e recusada',
  pg_temp.valor('authenticated', pg_temp.id('a'), format(
    $$select public.iniciar_pagamento(%L, 'boleto')$$, (select valor from _t where nome = 'pag'))) like '%forma_invalida%');

-- cancelar
select pg_temp.verificar('outra cliente nao cancela o pedido',
  pg_temp.como('authenticated', pg_temp.id('b'), format(
    'select public.cancelar_pedido(%L)', (select valor from _t where nome = 'pag'))) like '%pedido_invalido%');
select pg_temp.verificar('a cliente cancela o proprio pedido',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    'select public.cancelar_pedido(%L)', (select valor from _t where nome = 'pag'))) = 'ok');
select pg_temp.verificar('cancelado pela cliente, sem tentativa pendente',
  (select status = 'cancelado' and motivo_cancelamento = 'cliente'
   from public.pedidos where id = (select valor::uuid from _t where nome = 'pag'))
  and not exists (select 1 from public.pagamentos
    where pedido_id = (select valor::uuid from _t where nome = 'pag') and status = 'pendente'));
select pg_temp.verificar('pedido cancelado nao se cancela de novo',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    'select public.cancelar_pedido(%L)', (select valor from _t where nome = 'pag'))) like '%pedido_invalido%');

-- quem chama registrar_cotacao
select pg_temp.verificar('cliente nao registra cotacao',
  pg_temp.como('authenticated', pg_temp.id('a'), $$select privado.registrar_cotacao(null, '04567000', 'Rua X', '1', '',
    'Centro', 'São Paulo', 'SP', 0, 30, 'exemplo', null)$$) like '42501%');
select pg_temp.verificar('a chave secreta registra cotacao',
  pg_temp.como('service_role', null, $$select privado.registrar_cotacao(null, '04567000', 'Rua X', '1', '',
    'Centro', 'São Paulo', 'SP', 0, 30, 'exemplo', null)$$) = 'ok');

select * from pg_temp.relatorio();
rollback;
