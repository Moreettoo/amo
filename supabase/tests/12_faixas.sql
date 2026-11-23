-- As faixas de entrega e as datas fechadas (decisao 1 e spec 5.2): faixa de 1
-- hora, retirada 30 min antes, dentro do horario, a 90 min de agora, ate 7 dias
-- a frente, fora de dias_fechados. agora = 2026-11-24T12:00:00Z (terca, 9h em
-- Sao Paulo).

-- horario conhecido: segunda a sabado, 9h as 18h
select pg_temp.preparar('delete from public.horarios');
select pg_temp.preparar($$insert into public.horarios (dia_da_semana, abre, fecha)
  select dia, '09:00', '18:00' from generate_series(1, 6) as dia$$);
select pg_temp.preparar('update public.loja set vendas_pausadas = false where id');

create function pg_temp.faixa(p_inicio text, p_fim text, p_respeitar boolean default true)
returns boolean
language sql
as $$
  select privado.faixa_valida(p_inicio::timestamptz, p_fim::timestamptz, '2026-11-24T12:00:00Z', p_respeitar);
$$;

select pg_temp.verificar('11h de hoje vale', pg_temp.faixa('2026-11-24T14:00:00Z', '2026-11-24T15:00:00Z'));
select pg_temp.verificar('10h de hoje fica a menos de 90 min', not pg_temp.faixa('2026-11-24T13:00:00Z', '2026-11-24T14:00:00Z'));
select pg_temp.verificar('10h30 amanha nao esta na grade', not pg_temp.faixa('2026-11-25T13:30:00Z', '2026-11-25T14:30:00Z'));
select pg_temp.verificar('59 minutos nao vale', not pg_temp.faixa('2026-11-25T13:00:00Z', '2026-11-25T13:59:00Z'));
select pg_temp.verificar('61 minutos nao vale', not pg_temp.faixa('2026-11-25T13:00:00Z', '2026-11-25T14:01:00Z'));
select pg_temp.verificar('9h amanha nao vale (retirada antes de abrir)', not pg_temp.faixa('2026-11-25T12:00:00Z', '2026-11-25T13:00:00Z'));
select pg_temp.verificar('10h amanha vale', pg_temp.faixa('2026-11-25T13:00:00Z', '2026-11-25T14:00:00Z'));
select pg_temp.verificar('17h amanha vale (fecha as 18h)', pg_temp.faixa('2026-11-25T20:00:00Z', '2026-11-25T21:00:00Z'));
select pg_temp.verificar('18h amanha nao vale', not pg_temp.faixa('2026-11-25T21:00:00Z', '2026-11-25T22:00:00Z'));
select pg_temp.verificar('as 17h30 termina depois de fechar', not pg_temp.faixa('2026-11-25T20:30:00Z', '2026-11-25T21:30:00Z'));
select pg_temp.verificar('domingo nao tem faixa', not pg_temp.faixa('2026-11-29T13:00:00Z', '2026-11-29T14:00:00Z'));
select pg_temp.verificar('dia 1/12 (7 dias a frente) vale', pg_temp.faixa('2026-12-01T13:00:00Z', '2026-12-01T14:00:00Z'));
select pg_temp.verificar('dia 2/12 passa do horizonte', not pg_temp.faixa('2026-12-02T13:00:00Z', '2026-12-02T14:00:00Z'));

select pg_temp.preparar($$insert into public.dias_fechados (data, motivo) values ('2026-11-25', 'feriado de teste')$$);
select pg_temp.verificar('data fechada nao tem faixa', not pg_temp.faixa('2026-11-25T13:00:00Z', '2026-11-25T14:00:00Z'));
select pg_temp.verificar('data fechada fecha a loja', not privado.loja_aberta('2026-11-25 12:00:00-03'));
select pg_temp.verificar('a vespera continua aberta', privado.loja_aberta('2026-11-24 12:00:00-03'));
select pg_temp.verificar('o dia depois continua aberto', privado.loja_aberta('2026-11-26 12:00:00-03'));

select pg_temp.preparar('update public.loja set vendas_pausadas = true where id');
select pg_temp.verificar('pausada: sem faixa', not pg_temp.faixa('2026-11-26T13:00:00Z', '2026-11-26T14:00:00Z'));
select pg_temp.verificar('pausada ignorada: ha faixa', pg_temp.faixa('2026-11-26T13:00:00Z', '2026-11-26T14:00:00Z', false));
select pg_temp.preparar('update public.loja set vendas_pausadas = false where id');

select pg_temp.verificar('anon le dias_fechados',
  pg_temp.valor('anon', null, 'select count(*) from public.dias_fechados') = '1');
select pg_temp.verificar('authenticated le dias_fechados',
  pg_temp.valor('authenticated', gen_random_uuid(), 'select count(*) from public.dias_fechados') = '1');
select pg_temp.verificar('anon nao insere em dias_fechados',
  pg_temp.como('anon', null, $$insert into public.dias_fechados (data) values ('2026-12-24')$$) like '42501%');
select pg_temp.verificar('authenticated nao insere em dias_fechados',
  pg_temp.como('authenticated', gen_random_uuid(), $$insert into public.dias_fechados (data) values ('2026-12-24')$$) like '42501%');
select pg_temp.verificar('authenticated nao apaga de dias_fechados',
  pg_temp.como('authenticated', gen_random_uuid(), 'delete from public.dias_fechados') like '42501%');
select pg_temp.verificar('motivo com sinal de menor e recusado',
  pg_temp.como('postgres', null, $$insert into public.dias_fechados (data, motivo) values ('2026-12-24', 'a<b')$$) like '23514%');
select pg_temp.verificar('motivo comprido demais e recusado',
  pg_temp.como('postgres', null, format($$insert into public.dias_fechados (data, motivo) values ('2026-12-24', %L)$$, repeat('x', 81))) like '23514%');
select pg_temp.verificar('a mesma data duas vezes e recusada',
  pg_temp.como('postgres', null, $$insert into public.dias_fechados (data) values ('2026-11-25')$$) like '23505%');
select pg_temp.verificar('a inclusao foi auditada',
  exists (select 1 from privado.auditoria where tabela = 'dias_fechados' and registro = '2026-11-25'));
select pg_temp.verificar('faixa_valida so para service_role',
  pg_temp.como('anon', null, $$select privado.faixa_valida(now(), now())$$) like '42501%'
  and pg_temp.como('authenticated', gen_random_uuid(), $$select privado.faixa_valida(now(), now())$$) like '42501%'
  and pg_temp.como('service_role', null, $$select privado.faixa_valida(now(), now())$$) = 'ok');

select * from pg_temp.relatorio();
rollback;
