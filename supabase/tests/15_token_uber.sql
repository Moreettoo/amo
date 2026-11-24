-- O token da Uber no cofre (spec 8): guardar e ler devolve o mesmo token;
-- guardar de novo troca sem criar outro segredo; a vez de renovar vale para
-- um chamador a cada 60 s; so a chave secreta chama as funcoes.

select pg_temp.preparar($$delete from privado.uber_token$$);
select pg_temp.preparar($$delete from vault.secrets where name = 'amo_uber_token'$$);

select pg_temp.verificar('sem token guardado, ler nao devolve linha',
  not exists (select 1 from privado.ler_token_uber()));

select privado.guardar_token_uber('tok-um', now() + interval '30 days');
select pg_temp.verificar('guardar e ler devolve o mesmo token',
  (select token = 'tok-um' from privado.ler_token_uber()));
select pg_temp.verificar('a validade volta como foi guardada',
  (select expira_em > now() + interval '29 days' from privado.ler_token_uber()));

select privado.guardar_token_uber('tok-dois', now() + interval '10 days');
select pg_temp.verificar('guardar de novo troca o token',
  (select token = 'tok-dois' and expira_em < now() + interval '11 days' from privado.ler_token_uber()));
select pg_temp.verificar('e nao cria outro segredo',
  (select count(*) = 1 from vault.secrets where name = 'amo_uber_token'));
select pg_temp.verificar('a tabela tem uma linha so',
  (select count(*) = 1 from privado.uber_token));

select pg_temp.verificar('reservar renovacao: o primeiro leva a vez',
  privado.reservar_renovacao_token() is true);
select pg_temp.verificar('reservar renovacao: logo depois, falso',
  privado.reservar_renovacao_token() is false);
select pg_temp.preparar($$update privado.uber_token set renovando_ate = now() - interval '1 second'$$);
select pg_temp.verificar('passada a vez, outro chamador leva',
  privado.reservar_renovacao_token() is true);

select pg_temp.preparar($$delete from privado.uber_token$$);
select pg_temp.preparar($$delete from vault.secrets where name = 'amo_uber_token'$$);
select pg_temp.verificar('sem linha nenhuma, reservar tambem funciona uma vez',
  privado.reservar_renovacao_token() is true and privado.reservar_renovacao_token() is false);

select pg_temp.verificar('anon nao le o token',
  pg_temp.como('anon', null, 'select * from privado.ler_token_uber()') like '42501%');
select pg_temp.verificar('authenticated nao le o token',
  pg_temp.como('authenticated', pg_temp.nova_cliente('t15@teste.invalid'), 'select * from privado.ler_token_uber()') like '42501%');
select pg_temp.verificar('authenticated nao guarda o token',
  pg_temp.como('authenticated', null, $$select privado.guardar_token_uber('x', now())$$) like '42501%');
select pg_temp.verificar('anon nao reserva a vez',
  pg_temp.como('anon', null, 'select privado.reservar_renovacao_token()') like '42501%');
select pg_temp.verificar('a chave secreta chama as tres',
  pg_temp.como('service_role', null, 'select * from privado.ler_token_uber()') = 'ok'
  and pg_temp.como('service_role', null, $$select privado.guardar_token_uber('tok-tres', now() + interval '1 day')$$) = 'ok'
  and pg_temp.como('service_role', null, 'select privado.reservar_renovacao_token()') = 'ok');
select pg_temp.verificar('a chave secreta nao le a tabela',
  pg_temp.como('service_role', null, 'select * from privado.uber_token') like '42501%');

select * from pg_temp.relatorio();
rollback;
