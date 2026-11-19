-- Pedidos, itens e pagamentos (spec 7.2, 8, 9.3, 10.1 e 10.3): estados que
-- so andam para a frente, campos que nao mudam, e a cliente so le o seu.

insert into _v values
  ('a', pg_temp.nova_cliente('a@teste.invalid')),
  ('b', pg_temp.nova_cliente('b@teste.invalid'));
insert into _v values
  ('aguardando', pg_temp.pedido_de_exemplo(pg_temp.id('a'))),
  ('entregue', pg_temp.pedido_de_exemplo(pg_temp.id('a'), 'entregue')),
  ('anonimizar', pg_temp.pedido_de_exemplo(pg_temp.id('a'), 'entregue'));

-- estados do pedido
select pg_temp.verificar('pedido nao nasce pago',
  pg_temp.como('postgres', null, $$
    insert into public.pedidos (numero, status, subtotal_centavos, frete_centavos, total_centavos,
      cliente_nome, cliente_celular, cliente_email, entrega_cep, entrega_logradouro, entrega_numero,
      entrega_complemento, entrega_bairro, entrega_cidade, entrega_uf, entrega_minutos)
    values ('AMO-ABCDEFGH', 'pago', 1890, 0, 1890, 'Ana Souza', '11987654321', 'a@b.c', '04567000',
      'Rua X', '1', '', 'Centro', 'São Paulo', 'SP', 30)$$) like '%passagem_invalida%');

select pg_temp.verificar('aguardando nao pula para entregue',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set status = 'entregue' where id = %L$$, pg_temp.id('aguardando'))) like '%passagem_invalida%');

select pg_temp.verificar('o caminho completo carimba as datas',
  (select pago_em is not null and em_preparo_em is not null and a_caminho_em is not null
     and entregue_em is not null and cancelado_em is null
   from public.pedidos where id = pg_temp.id('entregue')));

select pg_temp.verificar('entregue nao volta a cancelado',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set status = 'cancelado', motivo_cancelamento = 'loja' where id = %L$$,
    pg_temp.id('entregue'))) like '%passagem_invalida%');

select pg_temp.verificar('cancelar exige motivo',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set status = 'cancelado' where id = %L$$, pg_temp.id('aguardando'))) like '23514%');

select pg_temp.verificar('data carimbada nao se escreve a mao',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set pago_em = '2000-01-01' where id = %L$$, pg_temp.id('entregue'))) = 'ok');
select pg_temp.verificar('data carimbada continua a do banco',
  (select pago_em <> '2000-01-01' from public.pedidos where id = pg_temp.id('entregue')));

-- campos que nao mudam
select pg_temp.verificar('total nao muda',
  pg_temp.como('postgres', null, format(
    'update public.pedidos set total_centavos = 1, subtotal_centavos = 1, frete_centavos = 0 where id = %L',
    pg_temp.id('aguardando'))) like '%campo_imutavel%');

select pg_temp.verificar('numero nao muda',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set numero = 'AMO-ZZZZZZZZ' where id = %L$$, pg_temp.id('aguardando'))) like '%campo_imutavel%');

select pg_temp.verificar('dona nao passa para outra',
  pg_temp.como('postgres', null, format(
    'update public.pedidos set user_id = %L where id = %L', pg_temp.id('b'), pg_temp.id('aguardando'))) like '%campo_imutavel%');

select pg_temp.verificar('retrato nao e reescrito',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set cliente_nome = 'Outra Pessoa' where id = %L$$, pg_temp.id('aguardando'))) like '%campo_imutavel%');

select pg_temp.verificar('retrato apagado exige a data da anonimizacao',
  pg_temp.como('postgres', null, format(
    'update public.pedidos set cliente_nome = null where id = %L', pg_temp.id('anonimizar'))) like '23514%');

select pg_temp.verificar('retrato e dona podem ser apagados, CEP encurtado',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set user_id = null, cliente_nome = null, cliente_celular = null,
        cliente_email = null, entrega_logradouro = null, entrega_numero = null,
        entrega_complemento = null, entrega_cep = '04567', anonimizado_em = now()
      where id = %L$$, pg_temp.id('anonimizar'))) = 'ok');

select pg_temp.verificar('data da anonimizacao nao muda depois',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set anonimizado_em = now() + interval '1 day' where id = %L$$,
    pg_temp.id('anonimizar'))) like '%campo_imutavel%');

select pg_temp.verificar('rastreio so https do Uber: javascript recusado',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set rastreio_url = 'javascript:alert(1)' where id = %L$$, pg_temp.id('aguardando'))) like '23514%');

select pg_temp.verificar('rastreio so https do Uber: dominio parecido recusado',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set rastreio_url = 'https://uber.com.golpe.example/x' where id = %L$$,
    pg_temp.id('aguardando'))) like '23514%');

select pg_temp.verificar('rastreio so https do Uber: aceito',
  pg_temp.como('postgres', null, format(
    $$update public.pedidos set rastreio_url = 'https://www.uber.com/track/abc123' where id = %L$$,
    pg_temp.id('aguardando'))) = 'ok');

-- itens
select pg_temp.verificar('item nao muda',
  pg_temp.como('postgres', null, format(
    'update public.itens_do_pedido set quantos = 2, total_centavos = 3780 where pedido_id = %L',
    pg_temp.id('aguardando'))) like '%campo_imutavel%');

select pg_temp.verificar('item nao sai',
  pg_temp.como('postgres', null, format(
    'delete from public.itens_do_pedido where pedido_id = %L', pg_temp.id('aguardando'))) like '%campo_imutavel%');

select pg_temp.verificar('item com total errado e recusado',
  pg_temp.como('postgres', null, format(
    $$insert into public.itens_do_pedido (pedido_id, produto, nome, tipo, preco_centavos, quantos, total_centavos)
      values (%L, 'pacoca', 'Paçoca', 'Bolo no pote', 1890, 2, 1890)$$, pg_temp.id('aguardando'))) like '23514%');

-- pagamentos
with novo as (
  insert into public.pagamentos (pedido_id, forma, valor_centavos)
  values (pg_temp.id('aguardando'), 'pix', 2880) returning id
)
insert into _v select 'pix', id from novo;

select pg_temp.verificar('pagamento nao nasce aprovado',
  pg_temp.como('postgres', null, format(
    $$insert into public.pagamentos (pedido_id, forma, status, valor_centavos) values (%L, 'cartao', 'aprovado', 2880)$$,
    pg_temp.id('aguardando'))) like '%passagem_invalida%');

select pg_temp.verificar('um pendente por pedido',
  pg_temp.como('postgres', null, format(
    $$insert into public.pagamentos (pedido_id, forma, valor_centavos) values (%L, 'cartao', 2880)$$,
    pg_temp.id('aguardando'))) like '23505%');

select pg_temp.verificar('valor da tentativa nao muda',
  pg_temp.como('postgres', null, format(
    'update public.pagamentos set valor_centavos = 1 where id = %L', pg_temp.id('pix'))) like '%campo_imutavel%');

select pg_temp.verificar('pendente vira recusado',
  pg_temp.como('postgres', null, format(
    $$update public.pagamentos set status = 'recusado' where id = %L$$, pg_temp.id('pix'))) = 'ok');

select pg_temp.verificar('recusado e final',
  pg_temp.como('postgres', null, format(
    $$update public.pagamentos set status = 'aprovado' where id = %L$$, pg_temp.id('pix'))) like '%passagem_invalida%');

-- leitura pela cliente
select pg_temp.verificar('cliente le os proprios pedidos, itens e pagamentos',
  pg_temp.valor('authenticated', pg_temp.id('a'),
    $$select (select count(*) from public.pedidos) || '/' || (select count(*) from public.itens_do_pedido)
       || '/' || (select count(*) from public.pagamentos)$$) = '2/2/1');

select pg_temp.verificar('outra cliente nao le nada disso',
  pg_temp.valor('authenticated', pg_temp.id('b'),
    $$select (select count(*) from public.pedidos) || '/' || (select count(*) from public.itens_do_pedido)
       || '/' || (select count(*) from public.pagamentos)$$) = '0/0/0');

select pg_temp.verificar('visitante nao le pedidos',
  pg_temp.como('anon', null, 'select 1 from public.pedidos') like '42501%');
select pg_temp.verificar('visitante nao le itens',
  pg_temp.como('anon', null, 'select 1 from public.itens_do_pedido') like '42501%');
select pg_temp.verificar('visitante nao le pagamentos',
  pg_temp.como('anon', null, 'select 1 from public.pagamentos') like '42501%');

-- escrita pela cliente
select pg_temp.verificar('cliente nao marca o proprio pedido como pago',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    $$update public.pedidos set status = 'pago' where id = %L$$, pg_temp.id('aguardando'))) like '42501%');

select pg_temp.verificar('cliente nao cria pedido direto',
  pg_temp.como('authenticated', pg_temp.id('a'), $$
    insert into public.pedidos (numero, subtotal_centavos, frete_centavos, total_centavos, entrega_cep,
      entrega_bairro, entrega_cidade, entrega_uf, entrega_minutos)
    values ('AMO-ABCDEFGH', 1, 0, 1, '04567000', 'Centro', 'São Paulo', 'SP', 30)$$) like '42501%');

select pg_temp.verificar('cliente nao cria pagamento direto',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    $$insert into public.pagamentos (pedido_id, forma, valor_centavos) values (%L, 'pix', 1)$$,
    pg_temp.id('aguardando'))) like '42501%');

select pg_temp.verificar('cliente nao altera item',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    'update public.itens_do_pedido set preco_centavos = 1 where pedido_id = %L', pg_temp.id('aguardando'))) like '42501%');

-- privado
select pg_temp.verificar('cliente nao le cotacoes',
  pg_temp.como('authenticated', pg_temp.id('a'), 'select 1 from privado.cotacoes') like '42501%');
select pg_temp.verificar('chave secreta nao le cotacoes',
  pg_temp.como('service_role', null, 'select 1 from privado.cotacoes') like '42501%');
select pg_temp.verificar('chave secreta nao le pagamentos_mp',
  pg_temp.como('service_role', null, 'select 1 from privado.pagamentos_mp') like '42501%');

select * from pg_temp.relatorio();
rollback;
