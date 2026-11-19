-- Enderecos (spec 7.2 e 8): a cliente le, cria, altera e apaga so os
-- proprios; no maximo 5; um so principal.

insert into _v values
  ('a', pg_temp.nova_cliente('a@teste.invalid')),
  ('b', pg_temp.nova_cliente('b@teste.invalid'));

create function pg_temp.inserir_endereco(p_usuario uuid, p_principal boolean default false)
returns text
language sql
as $$
  select pg_temp.como('authenticated', p_usuario, format(
    $c$insert into public.enderecos (cep, logradouro, numero, complemento, bairro, cidade, uf, principal)
       values ('04567000', 'Rua Siqueira Bueno', '120', 'ap 52', 'Belenzinho', 'São Paulo', 'SP', %L)$c$,
    p_principal));
$$;

select pg_temp.verificar('cliente cria endereco sem dizer de quem e',
  pg_temp.inserir_endereco(pg_temp.id('a'), true) = 'ok');
select pg_temp.verificar('o endereco fica com a dona da sessao',
  (select count(*) from public.enderecos where user_id = pg_temp.id('a')) = 1);

select pg_temp.verificar('cliente nao cria endereco em nome de outra',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    $$insert into public.enderecos (user_id, cep, logradouro, numero, bairro, cidade, uf)
      values (%L, '04567000', 'Rua X', '1', 'Centro', 'São Paulo', 'SP')$$, pg_temp.id('b'))) like '42501%');

select pg_temp.verificar('outra cliente nao ve o endereco',
  pg_temp.valor('authenticated', pg_temp.id('b'), 'select count(*) from public.enderecos') = '0');

select pg_temp.verificar('outra cliente tenta alterar: sem erro',
  pg_temp.como('authenticated', pg_temp.id('b'), format(
    $$update public.enderecos set logradouro = 'Rua Invasora' where user_id = %L$$, pg_temp.id('a'))) = 'ok');
select pg_temp.verificar('outra cliente tenta alterar: nada muda',
  (select logradouro from public.enderecos where user_id = pg_temp.id('a')) = 'Rua Siqueira Bueno');

select pg_temp.verificar('outra cliente tenta apagar: sem erro',
  pg_temp.como('authenticated', pg_temp.id('b'), format(
    'delete from public.enderecos where user_id = %L', pg_temp.id('a'))) = 'ok');
select pg_temp.verificar('outra cliente tenta apagar: nada sai',
  (select count(*) from public.enderecos where user_id = pg_temp.id('a')) = 1);

select pg_temp.verificar('cliente nao muda a dona do endereco',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    'update public.enderecos set user_id = %L where user_id = %L', pg_temp.id('b'), pg_temp.id('a'))) like '42501%');

select pg_temp.verificar('visitante nao le enderecos',
  pg_temp.como('anon', null, 'select 1 from public.enderecos') like '42501%');

select pg_temp.verificar('principal novo tira o principal anterior: aceito',
  pg_temp.inserir_endereco(pg_temp.id('a'), true) = 'ok');
select pg_temp.verificar('principal novo tira o principal anterior: um so',
  (select count(*) from public.enderecos where user_id = pg_temp.id('a') and principal) = 1
  and (select count(*) from public.enderecos where user_id = pg_temp.id('a')) = 2);

select pg_temp.verificar('terceiro, quarto e quinto enderecos',
  pg_temp.inserir_endereco(pg_temp.id('a')) = 'ok'
  and pg_temp.inserir_endereco(pg_temp.id('a')) = 'ok'
  and pg_temp.inserir_endereco(pg_temp.id('a')) = 'ok');
select pg_temp.verificar('sexto endereco e recusado',
  pg_temp.inserir_endereco(pg_temp.id('a')) like '%limite_de_enderecos%');

select pg_temp.verificar('a cliente apaga o proprio endereco: aceito',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    'delete from public.enderecos where id = (select id from public.enderecos where user_id = %L and not principal limit 1)',
    pg_temp.id('a'))) = 'ok');
select pg_temp.verificar('a cliente apaga o proprio endereco: saiu',
  (select count(*) from public.enderecos where user_id = pg_temp.id('a')) = 4);

select pg_temp.verificar('CEP com traco e recusado',
  pg_temp.como('authenticated', pg_temp.id('b'),
    $$insert into public.enderecos (cep, logradouro, numero, bairro, cidade, uf)
      values ('04567-000', 'Rua X', '1', 'Centro', 'São Paulo', 'SP')$$) like '23514%');

select pg_temp.verificar('UF inexistente e recusada',
  pg_temp.como('authenticated', pg_temp.id('b'),
    $$insert into public.enderecos (cep, logradouro, numero, bairro, cidade, uf)
      values ('04567000', 'Rua X', '1', 'Centro', 'São Paulo', 'XX')$$) like '23514%');

select pg_temp.verificar('logradouro com tag e recusado',
  pg_temp.como('authenticated', pg_temp.id('b'),
    $$insert into public.enderecos (cep, logradouro, numero, bairro, cidade, uf)
      values ('04567000', '<script>x</script>', '1', 'Centro', 'São Paulo', 'SP')$$) like '23514%');

select pg_temp.verificar('logradouro com apostrofo e aceito',
  pg_temp.como('authenticated', pg_temp.id('b'),
    $$insert into public.enderecos (cep, logradouro, numero, bairro, cidade, uf)
      values ('04567000', 'Rua D''Ávila', 'S/N', 'Centro', 'São Paulo', 'SP')$$) = 'ok');

select * from pg_temp.relatorio();
rollback;
