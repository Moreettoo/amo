-- Exclusao de conta, auditoria, expiracao e guarda (spec 9.3, 12 e 14.6).
--
-- A exclusao aqui roda como o dono do banco (postgres). O Supabase Auth
-- apaga como supabase_auth_admin, papel que o postgres nao pode assumir; por
-- isso o teste tambem confere que os dois gatilhos em auth.users sao
-- SECURITY DEFINER (rodam como o dono, seja quem for que apague). A prova de
-- ponta a ponta pela API do Auth fica para a etapa 2, com a chave secreta.

insert into _v values
  ('a', pg_temp.nova_cliente('a@teste.invalid')),
  ('b', pg_temp.nova_cliente('b@teste.invalid')),
  ('c', pg_temp.nova_cliente('c@teste.invalid'));

-- a: pedido entregue, comentario, endereco, cotacao e um pedido aguardando
insert into _v values ('a_entregue', pg_temp.pedido_de_exemplo(pg_temp.id('a'), 'entregue'));
insert into _v values ('a_aguardando', pg_temp.pedido_de_exemplo(pg_temp.id('a')));
with nova as (
  insert into public.pagamentos (pedido_id, forma, valor_centavos)
  values (pg_temp.id('a_aguardando'), 'pix', 2880) returning id
)
insert into _v select 'a_pix', id from nova;
select pg_temp.como('authenticated', pg_temp.id('a'),
  $$select public.enviar_comentario('prestigio', 5, 'Chegou perfeito, muito gostoso.')$$);
insert into public.enderecos (user_id, cep, logradouro, numero, bairro, cidade, uf)
values (pg_temp.id('a'), '04567000', 'Rua Siqueira Bueno', '120', 'Belenzinho', 'São Paulo', 'SP');
select privado.registrar_cotacao(pg_temp.id('a'), '04567000', 'Rua Siqueira Bueno', '120', '', 'Belenzinho',
  'São Paulo', 'SP', 990, 35, 'exemplo', null);

-- b: pedido pago, ainda nao entregue
select pg_temp.pedido_de_exemplo(pg_temp.id('b'), 'pago');

select pg_temp.verificar('pode excluir: com pedido em aberto, nao',
  pg_temp.valor('authenticated', pg_temp.id('b'),
    'select pode || ''/'' || coalesce(motivo, ''-'') from public.pode_excluir_conta()') = 'false/pedido_em_aberto');
select pg_temp.verificar('pode excluir: sem pedido em aberto, sim',
  pg_temp.valor('authenticated', pg_temp.id('a'),
    'select pode || ''/'' || coalesce(motivo, ''-'') from public.pode_excluir_conta()') = 'true/-');

select pg_temp.verificar('exclusao com pedido pago e nao entregue e recusada',
  pg_temp.como('postgres', null, format('delete from auth.users where id = %L', pg_temp.id('b')))
  like '%pedido_em_aberto%');

select pg_temp.verificar('exclusao da conta passa',
  pg_temp.como('postgres', null, format('delete from auth.users where id = %L', pg_temp.id('a'))) = 'ok');

select pg_temp.verificar('perfil, enderecos, comentarios e cotacoes somem',
  not exists (select 1 from public.perfis where id = pg_temp.id('a'))
  and not exists (select 1 from public.enderecos where user_id = pg_temp.id('a'))
  and not exists (select 1 from public.comentarios where user_id = pg_temp.id('a'))
  and not exists (select 1 from privado.cotacoes where user_id = pg_temp.id('a')));

select pg_temp.verificar('o pedido entregue fica sem dona e sem retrato',
  (select user_id is null and cliente_nome is null and cliente_celular is null and cliente_email is null
     and entrega_logradouro is null and entrega_numero is null and entrega_complemento is null
     and entrega_cep = '04567' and entrega_bairro = 'Belenzinho' and entrega_cidade = 'São Paulo'
     and anonimizado_em is not null and total_centavos = 2880
   from public.pedidos where id = pg_temp.id('a_entregue')));
select pg_temp.verificar('os itens do pedido ficam',
  (select count(*) = 1 from public.itens_do_pedido where pedido_id = pg_temp.id('a_entregue')));

select pg_temp.verificar('o pedido que aguardava e cancelado pela cliente',
  (select status = 'cancelado' and motivo_cancelamento = 'cliente' and user_id is null
   from public.pedidos where id = pg_temp.id('a_aguardando')));
select pg_temp.verificar('e a tentativa pendente dele tambem',
  (select status = 'cancelado' from public.pagamentos where id = pg_temp.id('a_pix')));

select pg_temp.verificar('Pix pago depois da exclusao: a_estornar',
  (select r.pagamento_status || '/' || r.pedido_status
   from privado.aplicar_pagamento(pg_temp.id('a_pix'), 'ORDX', 'PAYX', 'aprovado', 'accredited', 2880) r)
  = 'a_estornar/cancelado');

select pg_temp.verificar('os gatilhos em auth.users rodam como o dono',
  (select count(*) = 2 and bool_and(f.prosecdef)
   from pg_trigger t join pg_proc f on f.oid = t.tgfoid
   where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal and t.tgname like 'amo\_%'));

-- auditoria
select pg_temp.como('authenticated', pg_temp.id('c'),
  format($$update public.perfis set nome = 'Nome Novo Secreto' where id = %L$$, pg_temp.id('c')));
select pg_temp.verificar('a troca de nome e auditada: quem, o que, quais colunas',
  exists (select 1 from privado.auditoria
    where tabela = 'perfis' and acao = 'UPDATE' and ator = pg_temp.id('c') and papel = 'authenticated'
      and registro = pg_temp.id('c')::text and 'nome' = any(colunas)));
select pg_temp.verificar('a auditoria nao guarda os valores',
  not exists (select 1 from privado.auditoria a where a::text like '%Nome Novo Secreto%'));
select pg_temp.verificar('a exclusao da conta tambem fica na auditoria',
  exists (select 1 from privado.auditoria where tabela = 'perfis' and acao = 'DELETE' and registro = pg_temp.id('a')::text));
select pg_temp.verificar('cliente nao le a auditoria',
  pg_temp.como('authenticated', pg_temp.id('c'), 'select 1 from privado.auditoria') like '42501%');
select pg_temp.verificar('a chave secreta nao le a auditoria',
  pg_temp.como('service_role', null, 'select 1 from privado.auditoria') like '42501%');

-- expiracao
insert into _v values ('c_aguardando', pg_temp.pedido_de_exemplo(pg_temp.id('c')));
with nova as (
  insert into public.pagamentos (pedido_id, forma, valor_centavos)
  values (pg_temp.id('c_aguardando'), 'pix', 2880) returning id
)
insert into _v select 'c_pix', id from nova;

select privado.expirar_pedidos(now() + interval '59 minutes');
select pg_temp.verificar('com 59 minutos o pedido ainda aguarda',
  (select status = 'aguardando_pagamento' from public.pedidos where id = pg_temp.id('c_aguardando')));
select privado.expirar_pedidos(now() + interval '61 minutes');
select pg_temp.verificar('com 61 minutos o pedido expira',
  (select status = 'cancelado' and motivo_cancelamento = 'expirado' from public.pedidos where id = pg_temp.id('c_aguardando')));
select pg_temp.verificar('e a tentativa pendente expira junto',
  (select status = 'expirado' from public.pagamentos where id = pg_temp.id('c_pix')));

-- o pedido espera o Pix pendente ainda valido (o Pix vive no minimo 30 minutos)
insert into _v values ('c_pix_valido', pg_temp.pedido_de_exemplo(pg_temp.id('c')));
insert into _v values ('c_pix_vencido', pg_temp.pedido_de_exemplo(pg_temp.id('c')));
insert into _v values ('c_cartao', pg_temp.pedido_de_exemplo(pg_temp.id('c')));
insert into _v values ('c_pix_cancelado', pg_temp.pedido_de_exemplo(pg_temp.id('c')));
with nova as (
  insert into public.pagamentos (pedido_id, forma, valor_centavos, pix_expira_em)
  values (pg_temp.id('c_pix_valido'), 'pix', 2880, now() + interval '80 minutes') returning id
)
insert into _v select 't_pix_valido', id from nova;
with nova as (
  insert into public.pagamentos (pedido_id, forma, valor_centavos, pix_expira_em)
  values (pg_temp.id('c_pix_vencido'), 'pix', 2880, now() + interval '50 minutes') returning id
)
insert into _v select 't_pix_vencido', id from nova;
with nova as (
  insert into public.pagamentos (pedido_id, forma, valor_centavos)
  values (pg_temp.id('c_cartao'), 'cartao', 2880) returning id
)
insert into _v select 't_cartao', id from nova;
with nova as (
  insert into public.pagamentos (pedido_id, forma, valor_centavos, pix_expira_em)
  values (pg_temp.id('c_pix_cancelado'), 'pix', 2880, now() + interval '80 minutes') returning id
)
insert into _v select 't_pix_cancelado', id from nova;
update public.pagamentos set status = 'cancelado' where id = pg_temp.id('t_pix_cancelado');

select privado.expirar_pedidos(now() + interval '61 minutes');
select pg_temp.verificar('com 61 minutos e um Pix pendente que vale ate os 80, o pedido espera',
  (select status = 'aguardando_pagamento' from public.pedidos where id = pg_temp.id('c_pix_valido')));
select pg_temp.verificar('e o Pix segue pendente',
  (select status = 'pendente' from public.pagamentos where id = pg_temp.id('t_pix_valido')));
select pg_temp.verificar('Pix pendente ja vencido nao segura o pedido',
  (select p.status = 'cancelado' and p.motivo_cancelamento = 'expirado' and t.status = 'expirado'
   from public.pedidos p, public.pagamentos t
   where p.id = pg_temp.id('c_pix_vencido') and t.id = pg_temp.id('t_pix_vencido')));
select pg_temp.verificar('cartao pendente (sem Pix) expira com 60 minutos, como antes',
  (select p.status = 'cancelado' and t.status = 'expirado'
   from public.pedidos p, public.pagamentos t
   where p.id = pg_temp.id('c_cartao') and t.id = pg_temp.id('t_cartao')));
select pg_temp.verificar('Pix valido de tentativa cancelada nao segura o pedido',
  (select p.status = 'cancelado' and t.status = 'cancelado'
   from public.pedidos p, public.pagamentos t
   where p.id = pg_temp.id('c_pix_cancelado') and t.id = pg_temp.id('t_pix_cancelado')));

select privado.expirar_pedidos(now() + interval '81 minutes');
select pg_temp.verificar('passado o Pix, o pedido expira',
  (select status = 'cancelado' and motivo_cancelamento = 'expirado' from public.pedidos where id = pg_temp.id('c_pix_valido')));
select pg_temp.verificar('e o Pix expira junto',
  (select status = 'expirado' from public.pagamentos where id = pg_temp.id('t_pix_valido')));

select pg_temp.verificar('a expiracao segue so do dono: a chave secreta nao a executa',
  pg_temp.como('service_role', null, 'select privado.expirar_pedidos()') like '42501%');
select pg_temp.verificar('nem a cliente',
  pg_temp.como('authenticated', pg_temp.id('c'), 'select privado.expirar_pedidos()') like '42501%');

-- guarda
insert into _v values ('c_entregue', pg_temp.pedido_de_exemplo(pg_temp.id('c'), 'entregue'));
select privado.registrar_cotacao(pg_temp.id('c'), '04567000', 'Rua X', '1', '', 'Centro', 'São Paulo', 'SP',
  990, 35, 'exemplo', null);
select privado.consumir_limite('guarda:teste', 5, 60);

select privado.aplicar_guarda(now() + interval '179 days');
select pg_temp.verificar('guarda: cotacao com mais de 24 horas sai',
  not exists (select 1 from privado.cotacoes where user_id = pg_temp.id('c')));
select pg_temp.verificar('guarda: contagem de limite com mais de 1 dia sai',
  not exists (select 1 from privado.limites));
select pg_temp.verificar('guarda: com 179 dias o retrato fica',
  (select anonimizado_em is null and cliente_nome is not null from public.pedidos where id = pg_temp.id('c_entregue')));

select privado.aplicar_guarda(now() + interval '181 days');
select pg_temp.verificar('guarda: com 181 dias o retrato sai, a dona fica',
  (select anonimizado_em is not null and cliente_nome is null and entrega_cep = '04567' and user_id = pg_temp.id('c')
   from public.pedidos where id = pg_temp.id('c_entregue')));

select privado.aplicar_guarda(now() + interval '13 months');
select pg_temp.verificar('guarda: auditoria com mais de 12 meses sai',
  not exists (select 1 from privado.auditoria));

select pg_temp.verificar('tarefas agendadas',
  (select count(*) = 2 from cron.job
   where (jobname = 'amo-expirar-pedidos' and schedule = '*/5 * * * *')
      or (jobname = 'amo-guarda' and schedule = '0 6 * * *')));

select * from pg_temp.relatorio();
rollback;
