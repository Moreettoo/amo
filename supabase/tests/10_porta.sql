-- A porta do banco (spec 5, regra 6, e 14.0), por dentro. O teste HTTP de
-- verdade e scripts/testar-porta.mjs. Aqui um segredo de teste e posto na
-- porta so dentro da transacao, e o cabecalho e simulado como o Supabase o
-- entrega (request.headers).

insert into _v values ('a', pg_temp.nova_cliente('a@teste.invalid'));
insert into privado.porta (hash) values (sha256(convert_to('segredo-de-teste', 'UTF8')));

create function pg_temp.na_porta(p_papel text, p_usuario uuid, p_cabecalhos json)
returns text
language plpgsql
as $$
begin
  perform set_config('request.headers', coalesce(p_cabecalhos::text, ''), true);
  return pg_temp.como(p_papel, p_usuario, 'select public.conferir_porta()');
end
$$;

select pg_temp.verificar('visitante com o segredo passa',
  pg_temp.na_porta('anon', null, '{"x-amo-porta":"segredo-de-teste"}') = 'ok');
select pg_temp.verificar('cliente com o segredo passa',
  pg_temp.na_porta('authenticated', pg_temp.id('a'), '{"x-amo-porta":"segredo-de-teste"}') = 'ok');
select pg_temp.verificar('chave secreta com o segredo passa',
  pg_temp.na_porta('service_role', null, '{"x-amo-porta":"segredo-de-teste"}') = 'ok');

select pg_temp.verificar('visitante sem o segredo e barrado',
  pg_temp.na_porta('anon', null, '{"user-agent":"curl"}') like 'PGRST%AMO401%');
select pg_temp.verificar('cliente logada sem o segredo e barrada',
  pg_temp.na_porta('authenticated', pg_temp.id('a'), '{"user-agent":"curl"}') like 'PGRST%AMO401%');
select pg_temp.verificar('chave secreta sem o segredo e barrada',
  pg_temp.na_porta('service_role', null, '{}') like 'PGRST%AMO401%');
select pg_temp.verificar('segredo errado e barrado',
  pg_temp.na_porta('anon', null, '{"x-amo-porta":"segredo-de-teste "}') like 'PGRST%AMO401%');
select pg_temp.verificar('segredo vazio e barrado',
  pg_temp.na_porta('anon', null, '{"x-amo-porta":""}') like 'PGRST%AMO401%');
select pg_temp.verificar('segredo enorme e barrado',
  pg_temp.na_porta('anon', null, json_build_object('x-amo-porta', repeat('a', 5000))) like 'PGRST%AMO401%');
select pg_temp.verificar('sem cabecalho nenhum e barrado',
  pg_temp.na_porta('anon', null, null) like 'PGRST%AMO401%');

select pg_temp.verificar('a porta guarda so o hash',
  not exists (select 1 from privado.porta where encode(hash, 'escape') like '%segredo%'));
select pg_temp.verificar('ninguem da API le a porta',
  pg_temp.como('service_role', null, 'select 1 from privado.porta') like '42501%'
  and pg_temp.como('anon', null, 'select 1 from privado.porta') like '42501%');

select pg_temp.verificar('a API roda a porta antes de toda chamada',
  (select 'pgrst.db_pre_request=public.conferir_porta' = any(rolconfig) from pg_roles where rolname = 'authenticator'));

select * from pg_temp.relatorio();
rollback;
