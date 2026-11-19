-- Perfis e cadastro (spec 7.2, 8 e 9.3): o gatilho de cadastro nao confia no
-- que vem do navegador, e a cliente so le e altera o proprio nome e celular.

insert into _v values
  ('a', pg_temp.nova_cliente('a@teste.invalid')),
  ('b', pg_temp.nova_cliente('b@teste.invalid')),
  ('c', pg_temp.nova_cliente('c@teste.invalid',
    '{"nome":"Carla","celular":"(11) 98765-4321","aceite_termos":true,"versao_termos":"2026-11-18"}')),
  ('d', pg_temp.nova_cliente('d@teste.invalid',
    $${"nome":"  Maria   José D'Ávila ","celular":"11987654321","aceite_termos":true,"versao_termos":"2026-11-18"}$$)),
  ('e', pg_temp.nova_cliente('e@teste.invalid',
    '{"nome":"Eva","celular":"11987654321","aceite_termos":true,"versao_termos":"2026-11-18",
      "aceite_marketing":true,"termos_aceitos_em":"2000-01-01T00:00:00Z","marketing_aceito_em":"2000-01-01T00:00:00Z"}'));

-- cadastro
select pg_temp.verificar('cadastro cria o perfil com os dados e o aceite',
  (select nome = 'Cliente Teste' and celular = '11987654321' and versao_termos = '2026-11-18'
     and termos_aceitos_em = now() and marketing_aceito_em is null
   from public.perfis where id = pg_temp.id('a')));

select pg_temp.verificar('celular com mascara vira so digitos',
  (select celular from public.perfis where id = pg_temp.id('c')) = '11987654321');

select pg_temp.verificar('nome com acento e apostrofo, espacos sobrando aparados',
  (select nome from public.perfis where id = pg_temp.id('d')) = $$Maria José D'Ávila$$);

select pg_temp.verificar('datas enviadas no cadastro sao ignoradas; vale a hora do banco',
  (select termos_aceitos_em = now() and marketing_aceito_em = now()
   from public.perfis where id = pg_temp.id('e')));

select pg_temp.verificar('sem aceite dos termos nao existe conta',
  pg_temp.como('postgres', null, $$select pg_temp.nova_cliente('f1@teste.invalid',
    '{"nome":"Fabi","celular":"11987654321","versao_termos":"2026-11-18"}')$$) like '%termos_nao_aceitos%');

select pg_temp.verificar('aceite como texto nao vale',
  pg_temp.como('postgres', null, $$select pg_temp.nova_cliente('f2@teste.invalid',
    '{"nome":"Fabi","celular":"11987654321","aceite_termos":"true","versao_termos":"2026-11-18"}')$$) like '%termos_nao_aceitos%');

select pg_temp.verificar('cadastro sem nenhum dado e recusado',
  pg_temp.como('postgres', null, $$select pg_temp.nova_cliente('f3@teste.invalid', '{}')$$) like '%termos_nao_aceitos%');

select pg_temp.verificar('versao de termos inventada e recusada',
  pg_temp.como('postgres', null, $$select pg_temp.nova_cliente('f4@teste.invalid',
    '{"nome":"Fabi","celular":"11987654321","aceite_termos":true,"versao_termos":"2020-01-01"}')$$) like '%termos_desatualizados%');

select pg_temp.verificar('nome de uma letra e recusado',
  pg_temp.como('postgres', null, $$select pg_temp.nova_cliente('f5@teste.invalid',
    '{"nome":"A","celular":"11987654321","aceite_termos":true,"versao_termos":"2026-11-18"}')$$) like '%nome_invalido%');

select pg_temp.verificar('nome com tag e recusado',
  pg_temp.como('postgres', null, $$select pg_temp.nova_cliente('f6@teste.invalid',
    '{"nome":"<b>Ana</b>","celular":"11987654321","aceite_termos":true,"versao_termos":"2026-11-18"}')$$) like '%nome_invalido%');

select pg_temp.verificar('celular curto e recusado',
  pg_temp.como('postgres', null, $$select pg_temp.nova_cliente('f7@teste.invalid',
    '{"nome":"Fabi","celular":"123","aceite_termos":true,"versao_termos":"2026-11-18"}')$$) like '%celular_invalido%');

select pg_temp.verificar('celular com letras e recusado',
  pg_temp.como('postgres', null, $$select pg_temp.nova_cliente('f8@teste.invalid',
    '{"nome":"Fabi","celular":"liga 11987654321","aceite_termos":true,"versao_termos":"2026-11-18"}')$$) like '%celular_invalido%');

-- leitura
select pg_temp.verificar('cliente le o proprio perfil',
  pg_temp.valor('authenticated', pg_temp.id('a'), 'select count(*) from public.perfis') = '1');

select pg_temp.verificar('cliente nao le o perfil de outra',
  pg_temp.valor('authenticated', pg_temp.id('a'),
    format('select count(*) from public.perfis where id = %L', pg_temp.id('b'))) = '0');

select pg_temp.verificar('visitante nao le perfis',
  pg_temp.como('anon', null, 'select 1 from public.perfis') like '42501%');

-- escrita. A acao e a conferencia ficam em comandos separados: um comando
-- nao enxerga o que uma funcao chamada por ele mesmo gravou.
select pg_temp.verificar('cliente troca o proprio nome: aceito',
  pg_temp.como('authenticated', pg_temp.id('a'),
    format($$update public.perfis set nome = 'Ana Souza' where id = %L$$, pg_temp.id('a'))) = 'ok');
select pg_temp.verificar('cliente troca o proprio nome: gravado',
  (select nome from public.perfis where id = pg_temp.id('a')) = 'Ana Souza');

select pg_temp.verificar('cliente tenta trocar o nome de outra: sem erro',
  pg_temp.como('authenticated', pg_temp.id('a'),
    format($$update public.perfis set nome = 'Invasora' where id = %L$$, pg_temp.id('b'))) = 'ok');
select pg_temp.verificar('cliente tenta trocar o nome de outra: nada muda',
  (select nome from public.perfis where id = pg_temp.id('b')) = 'Cliente Teste');

select pg_temp.verificar('cliente nao mexe no aceite dos termos',
  pg_temp.como('authenticated', pg_temp.id('a'),
    format('update public.perfis set termos_aceitos_em = now() where id = %L', pg_temp.id('a'))) like '42501%');

select pg_temp.verificar('cliente nao mexe no marketing direto',
  pg_temp.como('authenticated', pg_temp.id('a'),
    format('update public.perfis set marketing_aceito_em = now() where id = %L', pg_temp.id('a'))) like '42501%');

select pg_temp.verificar('cliente nao cria perfil',
  pg_temp.como('authenticated', pg_temp.id('a'),
    format($$insert into public.perfis (id, nome, celular, termos_aceitos_em, versao_termos)
             values (%L, 'X Y', '11987654321', now(), '2026-11-18')$$, gen_random_uuid())) like '42501%');

select pg_temp.verificar('cliente nao apaga perfil',
  pg_temp.como('authenticated', pg_temp.id('a'),
    format('delete from public.perfis where id = %L', pg_temp.id('a'))) like '42501%');

select pg_temp.verificar('nome invalido pela cliente e recusado',
  pg_temp.como('authenticated', pg_temp.id('a'),
    format($$update public.perfis set nome = 'X' where id = %L$$, pg_temp.id('a'))) like '23514%');

-- marketing
select pg_temp.verificar('cliente aceita o marketing: aceito',
  pg_temp.como('authenticated', pg_temp.id('a'), 'select public.definir_marketing(true)') = 'ok');
select pg_temp.verificar('cliente aceita o marketing: gravado',
  (select marketing_aceito_em is not null from public.perfis where id = pg_temp.id('a')));

select pg_temp.verificar('cliente revoga o marketing: aceito',
  pg_temp.como('authenticated', pg_temp.id('a'), 'select public.definir_marketing(false)') = 'ok');
select pg_temp.verificar('cliente revoga o marketing: gravado',
  (select marketing_aceito_em is null from public.perfis where id = pg_temp.id('a')));

select pg_temp.verificar('visitante nao chama definir_marketing',
  pg_temp.como('anon', null, 'select public.definir_marketing(true)') like '42501%');

select * from pg_temp.relatorio();
rollback;
