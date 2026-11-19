-- Catalogo, horario e loja (spec 7.1 e 8): leitura publica, ninguem da API
-- escreve, e as regras de formato valem para a equipe tambem.

select pg_temp.verificar('visitante le os 7 produtos',
  pg_temp.valor('anon', null, 'select count(*) from public.produtos') = '7');

select pg_temp.verificar('visitante le a categoria e a linha',
  pg_temp.valor('anon', null,
    $$select string_agg(slug, ',') from (select slug from public.categorias union all select slug from public.linhas) x$$)
  = 'doces,bolos-no-pote');

select pg_temp.verificar('visitante le os 7 selos e as 5 vontades',
  pg_temp.valor('anon', null,
    'select (select count(*) from public.selos) || ''/'' || (select count(*) from public.vontades)') = '7/5');

select pg_temp.verificar('cliente le os produtos',
  pg_temp.valor('authenticated', gen_random_uuid(), 'select count(*) from public.produtos') = '7');

select pg_temp.verificar('preco de exemplo do prestigio, a venda',
  pg_temp.valor('anon', null,
    $$select preco_centavos || '/' || a_venda from public.produtos where slug = 'prestigio'$$) = '1890/true');

select pg_temp.verificar('preco de exemplo do ninho com frutas vermelhas',
  pg_temp.valor('anon', null,
    $$select preco_centavos from public.produtos where slug = 'ninho-com-frutas-vermelhas'$$) = '2190');

select pg_temp.verificar('todo produto tem descricao',
  pg_temp.valor('anon', null, 'select count(*) from public.produtos where descricao is null') = '0');

select pg_temp.verificar('horario: 9h as 18h de segunda a sabado',
  pg_temp.valor('anon', null,
    $$select string_agg(dia_da_semana::text, ',' order by dia_da_semana) from public.horarios where abre = '09:00' and fecha = '18:00'$$) = '1,2,3,4,5,6');

select pg_temp.verificar('domingo a loja nao abre',
  pg_temp.valor('anon', null, 'select count(*) from public.horarios where dia_da_semana = 0') = '0'
  and not privado.loja_aberta('2026-11-22 12:00:00-03'));

select pg_temp.verificar('loja: uma linha, vendas abertas',
  pg_temp.valor('anon', null,
    $$select count(*) || '/' || bool_or(vendas_pausadas) from public.loja$$) = '1/false');

select pg_temp.verificar('visitante nao altera produto',
  pg_temp.como('anon', null, $$update public.produtos set preco_centavos = 1 where slug = 'prestigio'$$) like '42501%');

select pg_temp.verificar('cliente nao cria categoria',
  pg_temp.como('authenticated', gen_random_uuid(),
    $$insert into public.categorias (slug, nome, ordem) values ('x', 'X', 9)$$) like '42501%');

select pg_temp.verificar('cliente nao pausa as vendas',
  pg_temp.como('authenticated', gen_random_uuid(), 'update public.loja set vendas_pausadas = true where id') like '42501%');

select pg_temp.verificar('chave secreta nao le tabela',
  pg_temp.como('service_role', null, 'select 1 from public.produtos limit 1') like '42501%');

select pg_temp.verificar('produto a venda sem preco e recusado',
  pg_temp.como('postgres', null,
    $$update public.produtos set preco_centavos = null where slug = 'prestigio'$$) like '23514%');

select pg_temp.verificar('preco zero e recusado',
  pg_temp.como('postgres', null,
    $$update public.produtos set preco_centavos = 0 where slug = 'prestigio'$$) like '23514%');

select pg_temp.verificar('identificador fora do formato e recusado',
  pg_temp.como('postgres', null,
    $$insert into public.selos (id, nome, ordem) values ('Zero Açúcar', 'x', 99)$$) like '23514%');

select pg_temp.verificar('nome com sinal de tag e recusado',
  pg_temp.como('postgres', null,
    $$update public.produtos set nome = '<b>Prestigio</b>' where slug = 'prestigio'$$) like '23514%');

select pg_temp.verificar('segunda linha em loja e recusada',
  pg_temp.como('postgres', null, 'insert into public.loja (vendas_pausadas) values (true)') ~ '^(23505|23514)');

select pg_temp.verificar('horario que abre depois de fechar e recusado',
  pg_temp.como('postgres', null,
    $$update public.horarios set abre = '19:00' where dia_da_semana = 1$$) like '23514%');

select pg_temp.verificar('os selos tem ordem, sem repetir',
  (select count(*) = 7 and count(distinct ordem) = 7 from public.selos));

select * from pg_temp.relatorio();
rollback;
