-- Comentarios (spec 7.2, 8 e 9.1): so quem recebeu o produto comenta; so o
-- aprovado aparece; quem escreveu nao e exposto.

insert into _v values
  ('a', pg_temp.nova_cliente('a@teste.invalid')),
  ('b', pg_temp.nova_cliente('b@teste.invalid')),
  ('d', pg_temp.nova_cliente('d@teste.invalid',
    $${"nome":"Maria José D'Ávila","celular":"11987654321","aceite_termos":true,"versao_termos":"2026-11-18"}$$));
select pg_temp.pedido_de_exemplo(pg_temp.id('a'), 'entregue');
select pg_temp.pedido_de_exemplo(pg_temp.id('d'), 'entregue');
select pg_temp.pedido_de_exemplo(pg_temp.id('b'), 'pago');

create function pg_temp.comentar(p_usuario uuid, p_produto text, p_nota integer, p_texto text)
returns text
language sql
as $$
  select pg_temp.valor('authenticated', p_usuario,
    format('select public.enviar_comentario(%L, %s, %L)::text', p_produto, p_nota, p_texto));
$$;

select pg_temp.verificar('quem nao recebeu o produto nao comenta',
  pg_temp.comentar(pg_temp.id('b'), 'prestigio', 5, 'Ainda nem chegou, mas deve ser bom.') like '%comentario_nao_permitido%');
select pg_temp.verificar('quem recebeu outro produto nao comenta este',
  pg_temp.comentar(pg_temp.id('a'), 'pacoca', 5, 'Nunca comprei, mas parece bom.') like '%comentario_nao_permitido%');

insert into _v values ('c1', pg_temp.comentar(pg_temp.id('a'), 'prestigio', 5, '  Molhadinho até o fundo do pote.  ')::uuid);
insert into _v values ('c2', pg_temp.comentar(pg_temp.id('d'), 'prestigio', 4,
  E'Gostei muito!\r\nVou pedir de novo, e a D''Ávila aprovou.')::uuid);

select pg_temp.verificar('comentario nasce pendente, com nome curto e texto aparado',
  (select status = 'pendente' and nome_exibido = 'Cliente T.' and texto = 'Molhadinho até o fundo do pote.' and nota = 5
   from public.comentarios where id = pg_temp.id('c1')));
select pg_temp.verificar('nome com acento e apostrofo vira primeiro nome e inicial',
  (select nome_exibido = 'Maria D.' and texto = E'Gostei muito!\nVou pedir de novo, e a D''Ávila aprovou.'
   from public.comentarios where id = pg_temp.id('c2')));

select pg_temp.verificar('pendente nao aparece para visitante',
  pg_temp.valor('anon', null, 'select count(id) from public.comentarios') = '0');
select pg_temp.verificar('a autora ve o proprio pendente',
  pg_temp.valor('authenticated', pg_temp.id('a'), $$select count(id) from public.comentarios where status = 'pendente'$$) = '1');
select pg_temp.verificar('outra cliente nao ve o pendente',
  pg_temp.valor('authenticated', pg_temp.id('b'), 'select count(id) from public.comentarios') = '0');

select pg_temp.preparar(format($$update public.comentarios set status = 'aprovado' where id = %L$$, pg_temp.id('c1')));
select pg_temp.verificar('aprovar carimba a moderacao',
  (select moderado_em is not null from public.comentarios where id = pg_temp.id('c1')));
select pg_temp.verificar('aprovado aparece para visitante',
  pg_temp.valor('anon', null, 'select string_agg(nome_exibido || '':'' || nota, '','') from public.comentarios') = 'Cliente T.:5');
select pg_temp.verificar('aprovado aparece para outra cliente',
  pg_temp.valor('authenticated', pg_temp.id('b'), 'select count(id) from public.comentarios') = '1');
select pg_temp.verificar('visitante nao le quem escreveu',
  pg_temp.como('anon', null, 'select user_id from public.comentarios') like '42501%');
select pg_temp.verificar('visitante nao le o estado da moderacao',
  pg_temp.como('anon', null, 'select status from public.comentarios') like '42501%');
select pg_temp.verificar('cliente nao le quem escreveu',
  pg_temp.como('authenticated', pg_temp.id('b'), 'select user_id from public.comentarios') like '42501%');

select pg_temp.verificar('reenviar substitui e volta para a moderacao',
  pg_temp.comentar(pg_temp.id('a'), 'prestigio', 3, 'Mudei de ideia, achei doce demais.') = pg_temp.id('c1')::text);
select pg_temp.verificar('continua um comentario so, pendente de novo',
  (select count(*) = 1 and bool_and(status = 'pendente' and nota = 3 and moderado_em is null)
   from public.comentarios where user_id = pg_temp.id('a')));

select pg_temp.verificar('texto com tag e recusado',
  pg_temp.comentar(pg_temp.id('a'), 'prestigio', 5, '<script>alert(1)</script> muito bom') like '%texto_invalido%');
select pg_temp.verificar('texto curto demais e recusado',
  pg_temp.comentar(pg_temp.id('a'), 'prestigio', 5, '   curto   ') like '%texto_invalido%');
select pg_temp.verificar('texto longo demais e recusado',
  pg_temp.comentar(pg_temp.id('a'), 'prestigio', 5, repeat('a', 1001)) like '%texto_invalido%');
select pg_temp.verificar('nota 6 e recusada',
  pg_temp.comentar(pg_temp.id('a'), 'prestigio', 6, 'Nota alta demais para existir.') like '%nota_invalida%');
select pg_temp.verificar('nota 0 e recusada',
  pg_temp.comentar(pg_temp.id('a'), 'prestigio', 0, 'Nota baixa demais para existir.') like '%nota_invalida%');

select pg_temp.verificar('cliente nao escreve comentario direto',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    $$insert into public.comentarios (produto, user_id, nome_exibido, nota, texto, status)
      values ('prestigio', %L, 'Eu Mesma', 5, 'Aprovado por mim mesma.', 'aprovado')$$, pg_temp.id('a'))) like '42501%');
select pg_temp.verificar('cliente nao aprova o proprio comentario',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    $$update public.comentarios set status = 'aprovado' where id = %L$$, pg_temp.id('c1'))) like '42501%');
select pg_temp.verificar('visitante nao chama enviar_comentario',
  pg_temp.como('anon', null, $$select public.enviar_comentario('prestigio', 5, 'Visitante sem conta.')$$) like '42501%');

select * from pg_temp.relatorio();
rollback;
