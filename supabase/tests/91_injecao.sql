-- Injecao (spec 14, teste 7, e 19.1). Cada parametro de texto das funcoes
-- chamaveis pela API recebe uma lista de entradas hostis. O resultado tem de
-- ser uma recusa por validacao ou o texto guardado ao pe da letra; nunca um
-- efeito. No fim, o banco tem de estar inteiro. (Que nenhuma funcao usa SQL
-- dinamico e conferido em 90_permissoes.sql.)

create temp table _hostis (texto text);
insert into _hostis (texto) values
  (''''),
  (''' or 1=1 --'),
  ('''; drop table public.produtos; --'),
  ('prestigio'' --'),
  ('/* comentario */'),
  ('$$; select 1; $$'),
  ('\'),
  ('%'),
  ('*'),
  ('eq.1'),
  ('or=(id.eq.1)'),
  ('select=*,perfis(*)'),
  ('<script>alert(1)</script>'),
  ('javascript:alert(1)'),
  ('../../etc/passwd'),
  (repeat('a', 1048576));

-- recusa conhecida (validacao, formato, tipo, tamanho) ou sucesso
create function pg_temp.recusa_ou_ok(p_resultado text)
returns boolean
language sql
immutable
as $$
  select p_resultado = 'ok'
      or p_resultado ~ '^[0-9a-f-]{36}$'
      or p_resultado ~ '^(erro )?(23514|P0001|22P02|22P05|22001|54000) ';
$$;

insert into _v values ('a', pg_temp.nova_cliente('a@teste.invalid'));
insert into _v values ('a_entregue', pg_temp.pedido_de_exemplo(pg_temp.id('a'), 'entregue'));
insert into _v values ('a_aguardando', pg_temp.pedido_de_exemplo(pg_temp.id('a')));
select pg_temp.preparar($$insert into public.horarios (dia_da_semana, abre, fecha)
  select dia, '00:00', '24:00' from generate_series(0, 6) as dia
  on conflict (dia_da_semana) do update set abre = excluded.abre, fecha = excluded.fecha$$);
insert into _v values ('cot', privado.registrar_cotacao(pg_temp.id('a'), '04567000', 'Rua Siqueira Bueno', '120', '',
  'Belenzinho', 'São Paulo', 'SP', 990, 35, 'exemplo', null));

-- criar_pedido: o produto dentro da lista
select pg_temp.verificar('criar_pedido recusa produto hostil: ' || left(texto, 30),
  pg_temp.valor('authenticated', pg_temp.id('a'), format(
    'select id::text from public.criar_pedido(%L::jsonb, %L, 2880, false)',
    jsonb_build_array(jsonb_build_object('produto', texto, 'quantos', 1))::text, pg_temp.id('cot')))
  like '%itens_invalidos%')
from _hostis;

select pg_temp.verificar('criar_pedido recusa byte nulo no JSON',
  pg_temp.recusa_ou_ok(pg_temp.valor('authenticated', pg_temp.id('a'), format(
    $$select id::text from public.criar_pedido('[{"produto":"a\u0000b","quantos":1}]'::jsonb, %L, 2880, false)$$,
    pg_temp.id('cot')))));

-- iniciar_pagamento: a forma
select pg_temp.verificar('iniciar_pagamento recusa forma hostil: ' || left(texto, 30),
  pg_temp.valor('authenticated', pg_temp.id('a'), format(
    'select public.iniciar_pagamento(%L, %L)::text', pg_temp.id('a_aguardando'), texto))
  like '%forma_invalida%')
from _hostis;

-- parametros uuid: o proprio tipo recusa
select pg_temp.verificar('cancelar_pedido recusa id hostil: ' || left(texto, 30),
  pg_temp.como('authenticated', pg_temp.id('a'), format('select public.cancelar_pedido(%L)', texto))
  like '22P02%')
from _hostis;

-- enviar_comentario: o produto e o texto
select pg_temp.verificar('enviar_comentario recusa produto hostil: ' || left(texto, 30),
  pg_temp.valor('authenticated', pg_temp.id('a'), format(
    'select public.enviar_comentario(%L, 5, %L)::text', texto, 'Texto valido de teste.'))
  like '%comentario_nao_permitido%')
from _hostis;

select pg_temp.verificar('enviar_comentario com texto hostil: recusa ou guarda: ' || left(texto, 30),
  pg_temp.recusa_ou_ok(pg_temp.valor('authenticated', pg_temp.id('a'), format(
    'select public.enviar_comentario(%L, 5, %L)::text', 'prestigio', texto))))
from _hostis;

select pg_temp.valor('authenticated', pg_temp.id('a'), format(
  'select public.enviar_comentario(%L, 5, %L)::text', 'prestigio', '''; drop table public.produtos; -- gostei'));
select pg_temp.verificar('texto com SQL fica guardado ao pe da letra',
  (select texto = '''; drop table public.produtos; -- gostei' from public.comentarios where user_id = pg_temp.id('a')));

-- funcoes do servidor: cotacao, aviso e limite
select pg_temp.verificar('registrar_cotacao com logradouro hostil: recusa ou guarda: ' || left(texto, 30),
  pg_temp.recusa_ou_ok(pg_temp.como('service_role', null, format(
    $$select privado.registrar_cotacao(null, '04567000', %L, '1', '', 'Centro', 'São Paulo', 'SP', 990, 35, 'exemplo', null)$$,
    texto))))
from _hostis;

insert into _v values ('cot_sql', privado.registrar_cotacao(null, '04567000', 'Rua D''Ávila''; drop table public.produtos; --',
  '1', '', 'Centro', 'São Paulo', 'SP', 990, 35, 'exemplo', null));
select pg_temp.verificar('logradouro com SQL fica guardado ao pe da letra',
  (select logradouro = 'Rua D''Ávila''; drop table public.produtos; --' from privado.cotacoes where id = pg_temp.id('cot_sql')));

select pg_temp.verificar('registrar_cotacao recusa modo hostil: ' || left(texto, 30),
  pg_temp.como('service_role', null, format(
    $$select privado.registrar_cotacao(null, '04567000', 'Rua X', '1', '', 'Centro', 'São Paulo', 'SP', 990, 35, 'exemplo', null, %L)$$,
    texto)) = 'P0001 modo_invalido')
from (select texto from _hostis
      union all select unnest(array['Agora', 'AGENDADO', ' agora', 'agora ', 'agendado''; --', 'agora,agendado'])) m;

select pg_temp.verificar('registrar_cotacao recusa modo nulo',
  pg_temp.como('service_role', null,
    $$select privado.registrar_cotacao(null, '04567000', 'Rua X', '1', '', 'Centro', 'São Paulo', 'SP', 990, 35, 'exemplo', null, null)$$)
  = 'P0001 modo_invalido');

select pg_temp.verificar('registrar_evento_webhook com id hostil: recusa ou guarda: ' || left(texto, 30),
  pg_temp.recusa_ou_ok(pg_temp.como('service_role', null, format(
    $$select * from privado.registrar_evento_webhook('mercadopago', %L, 'order', 'ORD1')$$, texto))))
from _hostis;

select pg_temp.verificar('consumir_limite com chave hostil: recusa ou conta: ' || left(texto, 30),
  pg_temp.recusa_ou_ok(pg_temp.como('service_role', null, format(
    'select privado.consumir_limite(%L, 5, 60)', texto))))
from _hostis;

-- a corrida: o id, o estado e o rastreio da Uber, e o motivo da falha
insert into _v values ('a_pago', pg_temp.pedido_de_exemplo(pg_temp.id('a'), 'pago'));
select pg_temp.preparar(format($$update privado.entregas set estado = 'criada', uber_entrega_id = 'del_ok'
  where pedido_id = %L$$, pg_temp.id('a_pago')));

select pg_temp.verificar('aplicar_entrega com id hostil: recusa ou nada: ' || left(texto, 30),
  pg_temp.recusa_ou_ok(pg_temp.como('service_role', null, format(
    $$select * from privado.aplicar_entrega(%L, 'pending', null, null)$$, texto))))
from _hostis;

select pg_temp.verificar('aplicar_entrega recusa estado hostil: ' || left(texto, 30),
  pg_temp.como('service_role', null, format(
    $$select * from privado.aplicar_entrega('del_ok', %L, null, null)$$, texto)) = 'P0001 status_invalido')
from _hostis;

select pg_temp.verificar('aplicar_entrega recusa rastreio hostil: ' || left(texto, 30),
  pg_temp.como('service_role', null, format(
    $$select * from privado.aplicar_entrega('del_ok', 'pending', %L, null)$$, texto)) = 'P0001 rastreio_invalido')
from (select texto from _hostis
      union all select unnest(array['http://www.uber.com/x', 'https://uber.com.evil.com/x', 'https://evil-uber.com/x',
        'https://www.uber.com/x"><script>', 'https://www.uber.com/x y'])) r;

select pg_temp.verificar('marcar_corrida_criada com id hostil: recusa ou guarda: ' || left(texto, 30),
  pg_temp.recusa_ou_ok(pg_temp.como('service_role', null, format(
    $$select privado.marcar_corrida_criada(%L, %L, 990, null, 'pending')$$, pg_temp.id('a_pago'), texto))))
from _hostis;

select pg_temp.verificar('marcar_corrida_falhou recusa motivo hostil: ' || left(texto, 30),
  pg_temp.como('service_role', null, format(
    $$select privado.marcar_corrida_falhou(%L, %L, false)$$, pg_temp.id('a_pago'), texto)) = 'P0001 motivo_invalido')
from _hostis;

select pg_temp.verificar('corrida_nao_cancelavel recusa id hostil: ' || left(texto, 30),
  pg_temp.como('service_role', null, format('select privado.corrida_nao_cancelavel(%L)', texto)) like '22P02%')
from _hostis;

select pg_temp.verificar('a corrida continua inteira',
  (select estado = 'criada' and uber_entrega_id = 'del_ok' and tentativas = 0
   from privado.entregas where pedido_id = pg_temp.id('a_pago')));

-- o banco continua inteiro
select pg_temp.verificar('o banco continua inteiro',
  to_regclass('public.produtos') is not null and to_regclass('public.perfis') is not null
  and to_regclass('public.pedidos') is not null
  and (select count(*) from public.produtos) = 7
  and (select count(*) from public.categorias) = 1);

select * from pg_temp.relatorio();
rollback;
