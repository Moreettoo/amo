-- Base fechada (spec 5, regras 1 e 2): o que nasce em public nasce sem acesso
-- para os papeis da API, e privado so e visivel para a chave secreta.

create table public._sonda (x int);
create sequence public._sonda_seq;
create function public._sonda_f() returns int language sql as 'select 1';
create function privado._sonda_g() returns int language sql as 'select 1';

select pg_temp.verificar('tabela nova em public: nenhum papel da API le ou escreve',
  not has_table_privilege('anon', 'public._sonda', 'select')
  and not has_table_privilege('authenticated', 'public._sonda', 'select')
  and not has_table_privilege('authenticated', 'public._sonda', 'insert')
  and not has_table_privilege('service_role', 'public._sonda', 'select'));

select pg_temp.verificar('sequencia nova em public: nenhum papel da API usa',
  not has_sequence_privilege('anon', 'public._sonda_seq', 'usage')
  and not has_sequence_privilege('authenticated', 'public._sonda_seq', 'usage')
  and not has_sequence_privilege('service_role', 'public._sonda_seq', 'usage'));

select pg_temp.verificar('funcao nova em public: nenhum papel da API executa',
  not has_function_privilege('anon', 'public._sonda_f()', 'execute')
  and not has_function_privilege('authenticated', 'public._sonda_f()', 'execute')
  and not has_function_privilege('service_role', 'public._sonda_f()', 'execute'));

select pg_temp.verificar('funcao nova em privado: nenhum papel da API executa',
  not has_function_privilege('anon', 'privado._sonda_g()', 'execute')
  and not has_function_privilege('authenticated', 'privado._sonda_g()', 'execute')
  and not has_function_privilege('service_role', 'privado._sonda_g()', 'execute'));

select pg_temp.verificar('privado: visitante e cliente nem enxergam o schema',
  not has_schema_privilege('anon', 'privado', 'usage')
  and not has_schema_privilege('authenticated', 'privado', 'usage'));

select pg_temp.verificar('privado: a chave secreta enxerga o schema',
  has_schema_privilege('service_role', 'privado', 'usage'));

select pg_temp.verificar('versao vigente dos termos', privado.versao_termos() = '2026-11-18');

select * from pg_temp.relatorio();
rollback;
