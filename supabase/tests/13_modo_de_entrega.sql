-- O modo e a faixa da entrega (spec 6 e 7): a cotacao guarda o modo e a
-- faixa; criar_pedido exige a loja aberta so no agora e, no agendado, vendas
-- nao pausadas e a faixa ainda valida; iniciar_pagamento confere a faixa de
-- novo; o gatilho aceita pago>a_caminho e a remarcacao marcada.
--
-- O relogio nao e fixo: a faixa usada e amanha das 12h as 13h de Sao Paulo,
-- que vale a qualquer hora de hoje com a cozinha aberta o dia todo.

create temp table _h (nome text primary key, valor timestamptz not null);
create temp table _t (nome text primary key, valor text);

-- a cozinha aberta o dia todo, nos 7 dias, sem data fechada nem pausa
select pg_temp.preparar($$insert into public.horarios (dia_da_semana, abre, fecha)
  select dia, '00:00', '24:00' from generate_series(0, 6) as dia
  on conflict (dia_da_semana) do update set abre = excluded.abre, fecha = excluded.fecha$$);
select pg_temp.preparar('delete from public.dias_fechados');
select pg_temp.preparar('update public.loja set vendas_pausadas = false where id');

insert into _h values
  ('amanha_12', (((now() at time zone 'America/Sao_Paulo')::date + 1) + time '12:00') at time zone 'America/Sao_Paulo'),
  ('amanha_13', (((now() at time zone 'America/Sao_Paulo')::date + 1) + time '13:00') at time zone 'America/Sao_Paulo'),
  ('amanha_14', (((now() at time zone 'America/Sao_Paulo')::date + 1) + time '14:00') at time zone 'America/Sao_Paulo'),
  ('amanha_15', (((now() at time zone 'America/Sao_Paulo')::date + 1) + time '15:00') at time zone 'America/Sao_Paulo'),
  ('amanha_10_30', (((now() at time zone 'America/Sao_Paulo')::date + 1) + time '10:30') at time zone 'America/Sao_Paulo'),
  ('amanha_11_30', (((now() at time zone 'America/Sao_Paulo')::date + 1) + time '11:30') at time zone 'America/Sao_Paulo');

create function pg_temp.h(p_nome text)
returns timestamptz
language sql
stable
as $$
  select valor from _h where nome = p_nome;
$$;

-- o dia da semana de hoje e o de amanha, em Sao Paulo
create function pg_temp.hoje() returns integer language sql stable as $$
  select extract(dow from now() at time zone 'America/Sao_Paulo')::integer;
$$;
create function pg_temp.amanha() returns integer language sql stable as $$
  select extract(dow from (now() at time zone 'America/Sao_Paulo') + interval '1 day')::integer;
$$;

insert into _v values
  ('a', pg_temp.nova_cliente('a@teste.invalid')),
  ('b', pg_temp.nova_cliente('b@teste.invalid')),
  ('c', pg_temp.nova_cliente('c@teste.invalid')),
  ('d', pg_temp.nova_cliente('d@teste.invalid')),
  ('e', pg_temp.nova_cliente('e@teste.invalid'));

-- a cotacao pela chave secreta: o id como texto, ou 'erro ...'
create function pg_temp.cotar(p_usuario uuid, p_modo text, p_inicio timestamptz, p_fim timestamptz)
returns text
language sql
as $$
  select pg_temp.valor('service_role', null, format(
    $f$select privado.registrar_cotacao(%L, '04567000', 'Rua Siqueira Bueno', '120', 'ap 52',
      'Belenzinho', 'São Paulo', 'SP', 990, 35, 'exemplo', null, %L, %L, %L)::text$f$,
    p_usuario, p_modo, p_inicio, p_fim));
$$;

-- o pedido de um pote de prestigio (1890 + 990): o id como texto, ou 'erro ...'
create function pg_temp.pedir(p_usuario uuid, p_cotacao text)
returns text
language sql
as $$
  select pg_temp.valor('authenticated', p_usuario, format(
    $f$select id::text from public.criar_pedido('[{"produto":"prestigio","quantos":1}]'::jsonb, %L::uuid, 2880, false)$f$,
    p_cotacao));
$$;

create function pg_temp.pagar(p_usuario uuid, p_pedido text)
returns text
language sql
as $$
  select pg_temp.valor('authenticated', p_usuario, format(
    $f$select public.iniciar_pagamento(%L, 'pix')::text$f$, p_pedido));
$$;

-- a cotacao
insert into _t values ('cot_ag', pg_temp.cotar(pg_temp.id('a'), 'agendado', pg_temp.h('amanha_12'), pg_temp.h('amanha_13')));
select pg_temp.verificar('cotacao agendada com faixa valida registra',
  (select valor ~ '^[0-9a-f-]{36}$' from _t where nome = 'cot_ag'), (select valor from _t where nome = 'cot_ag'));
select pg_temp.verificar('a cotacao guarda o modo e a faixa',
  (select modo = 'agendado' and janela_inicio = pg_temp.h('amanha_12') and janela_fim = pg_temp.h('amanha_13')
   from privado.cotacoes where id = (select valor::uuid from _t where nome = 'cot_ag')));
select pg_temp.verificar('faixa das 10h30 e recusada',
  pg_temp.cotar(pg_temp.id('a'), 'agendado', pg_temp.h('amanha_10_30'), pg_temp.h('amanha_11_30')) like '%faixa_indisponivel%');
select pg_temp.verificar('agendado sem faixa e recusado',
  pg_temp.cotar(pg_temp.id('a'), 'agendado', null, null) like '%faixa_indisponivel%');
select pg_temp.verificar('agora com faixa e recusado',
  pg_temp.cotar(pg_temp.id('a'), 'agora', pg_temp.h('amanha_12'), pg_temp.h('amanha_13')) like 'erro 23514%');
select pg_temp.verificar('modo inventado e recusado',
  pg_temp.cotar(pg_temp.id('a'), 'amanha', null, null) like '%modo_invalido%');
select pg_temp.verificar('modo nulo e recusado',
  pg_temp.cotar(pg_temp.id('a'), null, null, null) like '%modo_invalido%');

insert into _t values ('cot_12', pg_temp.valor('service_role', null,
  $$select privado.registrar_cotacao(null, '04567000', 'Rua X', '1', '', 'Centro', 'São Paulo', 'SP', 990, 35, 'exemplo', null)::text$$));
select pg_temp.verificar('a chamada de 12 argumentos continua valendo e e agora',
  (select modo = 'agora' and janela_inicio is null and janela_fim is null
   from privado.cotacoes where id = (select valor::uuid from _t where nome = 'cot_12')));

-- o pedido: o agora copia o modo sem faixa
insert into _t values ('ped_agora', pg_temp.pedir(pg_temp.id('b'), pg_temp.cotar(pg_temp.id('b'), 'agora', null, null)));
select pg_temp.verificar('agora com a loja aberta cria o pedido',
  (select valor ~ '^[0-9a-f-]{36}$' from _t where nome = 'ped_agora'), (select valor from _t where nome = 'ped_agora'));
select pg_temp.verificar('o pedido agora fica sem faixa',
  (select entrega_modo = 'agora' and entrega_janela_inicio is null and entrega_janela_fim is null
   from public.pedidos where id = (select valor::uuid from _t where nome = 'ped_agora')));

-- a loja fechada agora (o dia de hoje sem horario)
select pg_temp.preparar(format('delete from public.horarios where dia_da_semana = %s', pg_temp.hoje()));
select pg_temp.verificar('o preparo fecha a loja agora', not privado.loja_aberta());

insert into _t values ('ped_ag', pg_temp.pedir(pg_temp.id('a'), (select valor from _t where nome = 'cot_ag')));
select pg_temp.verificar('agendado com a loja fechada agora cria o pedido',
  (select valor ~ '^[0-9a-f-]{36}$' from _t where nome = 'ped_ag'), (select valor from _t where nome = 'ped_ag'));
select pg_temp.verificar('o pedido copia o modo e a faixa',
  (select entrega_modo = 'agendado' and entrega_janela_inicio = pg_temp.h('amanha_12')
     and entrega_janela_fim = pg_temp.h('amanha_13') and status = 'aguardando_pagamento'
   from public.pedidos where id = (select valor::uuid from _t where nome = 'ped_ag')));
select pg_temp.verificar('agora com a loja fechada e recusado',
  pg_temp.pedir(pg_temp.id('c'), pg_temp.cotar(pg_temp.id('c'), 'agora', null, null)) like '%loja_fechada%');

-- pausada: o agendado tambem para
insert into _t values ('cot_pausa', pg_temp.cotar(pg_temp.id('c'), 'agendado', pg_temp.h('amanha_12'), pg_temp.h('amanha_13')));
select pg_temp.preparar('update public.loja set vendas_pausadas = true where id');
select pg_temp.verificar('agendado com vendas pausadas e recusado com loja_fechada',
  pg_temp.pedir(pg_temp.id('c'), (select valor from _t where nome = 'cot_pausa')) like '%loja_fechada%');
select pg_temp.verificar('cotacao agendada com vendas pausadas e recusada',
  pg_temp.cotar(pg_temp.id('c'), 'agendado', pg_temp.h('amanha_12'), pg_temp.h('amanha_13')) like '%faixa_indisponivel%');

-- iniciar_pagamento nao olha a pausa: ela so barra pedido novo
select pg_temp.verificar('iniciar_pagamento aceita o agendado com vendas pausadas',
  pg_temp.pagar(pg_temp.id('a'), (select valor from _t where nome = 'ped_ag')) ~ '^[0-9a-f-]{36}$');
select pg_temp.preparar('update public.loja set vendas_pausadas = false where id');

-- a faixa passa entre a cotacao e o pedido (amanha abre as 13h)
insert into _t values ('cot_passa', pg_temp.cotar(pg_temp.id('d'), 'agendado', pg_temp.h('amanha_12'), pg_temp.h('amanha_13')));
select pg_temp.verificar('o preparo da faixa que passa: cotacao registrada',
  (select valor ~ '^[0-9a-f-]{36}$' from _t where nome = 'cot_passa'));
select pg_temp.preparar(format($$update public.horarios set abre = '13:00' where dia_da_semana = %s$$, pg_temp.amanha()));
select pg_temp.verificar('faixa que passou entre a cotacao e o pedido e recusada',
  pg_temp.pedir(pg_temp.id('d'), (select valor from _t where nome = 'cot_passa')) like '%faixa_indisponivel%');
select pg_temp.verificar('iniciar_pagamento recusa a faixa que passou',
  pg_temp.pagar(pg_temp.id('a'), (select valor from _t where nome = 'ped_ag')) like '%faixa_indisponivel%');
select pg_temp.preparar(format($$update public.horarios set abre = '00:00' where dia_da_semana = %s$$, pg_temp.amanha()));

-- o agora pago depois de fechar segue como hoje (a corrida e remarcada depois)
select pg_temp.verificar('iniciar_pagamento do agora com a loja fechada continua aceito',
  pg_temp.pagar(pg_temp.id('b'), (select valor from _t where nome = 'ped_agora')) ~ '^[0-9a-f-]{36}$');

-- o gatilho: pago>a_caminho
insert into _v values ('pago1', pg_temp.pedido_de_exemplo(pg_temp.id('e'), 'pago'));
select pg_temp.verificar('pago>a_caminho passa',
  pg_temp.como('postgres', null, format($$update public.pedidos set status = 'a_caminho' where id = %L$$, pg_temp.id('pago1'))) = 'ok');
select pg_temp.verificar('pago>a_caminho carimba a data',
  (select status = 'a_caminho' and a_caminho_em is not null and em_preparo_em is null
   from public.pedidos where id = pg_temp.id('pago1')));

-- o gatilho: o modo e a faixa so mudam pela remarcacao marcada
insert into _v values ('pago2', pg_temp.pedido_de_exemplo(pg_temp.id('e'), 'pago'));
create function pg_temp.remarcar(p_pedido uuid, p_modo text, p_inicio timestamptz, p_fim timestamptz)
returns text
language sql
as $$
  select pg_temp.como('postgres', null, format(
    $f$update public.pedidos set entrega_modo = %L, entrega_janela_inicio = %L, entrega_janela_fim = %L where id = %L$f$,
    p_modo, p_inicio, p_fim, p_pedido));
$$;

select pg_temp.verificar('mudar o modo sem a marca e recusado',
  pg_temp.remarcar(pg_temp.id('pago2'), 'agendado', pg_temp.h('amanha_14'), pg_temp.h('amanha_15')) like 'P0001 campo_imutavel');

select set_config('amo.remarcando', 'sim', true);
select pg_temp.verificar('com a marca e o pedido pago, agora vira agendado',
  pg_temp.remarcar(pg_temp.id('pago2'), 'agendado', pg_temp.h('amanha_14'), pg_temp.h('amanha_15')) = 'ok');
select pg_temp.verificar('a remarcacao fica gravada',
  (select entrega_modo = 'agendado' and entrega_janela_inicio = pg_temp.h('amanha_14')
     and entrega_janela_fim = pg_temp.h('amanha_15') and status = 'pago'
   from public.pedidos where id = pg_temp.id('pago2')));
select pg_temp.verificar('com a marca, agendado remarca para outra faixa',
  pg_temp.remarcar(pg_temp.id('pago2'), 'agendado', pg_temp.h('amanha_12'), pg_temp.h('amanha_13')) = 'ok');
select pg_temp.verificar('com a marca, voltar para agora e recusado',
  pg_temp.remarcar(pg_temp.id('pago2'), 'agora', null, null) like 'P0001 campo_imutavel');
select pg_temp.verificar('com a marca, agendado sem faixa e recusado',
  pg_temp.remarcar(pg_temp.id('pago2'), 'agendado', pg_temp.h('amanha_12'), null) like 'P0001 campo_imutavel');
select pg_temp.verificar('com a marca, faixa ao contrario e recusada',
  pg_temp.remarcar(pg_temp.id('pago2'), 'agendado', pg_temp.h('amanha_13'), pg_temp.h('amanha_12')) like 'P0001 campo_imutavel');
select pg_temp.verificar('a marca com o pedido aguardando e recusada',
  pg_temp.remarcar((select valor::uuid from _t where nome = 'ped_ag'), 'agendado', pg_temp.h('amanha_14'), pg_temp.h('amanha_15')) like 'P0001 campo_imutavel');
select pg_temp.verificar('a marca com o pedido a caminho e recusada',
  pg_temp.remarcar(pg_temp.id('pago1'), 'agendado', pg_temp.h('amanha_14'), pg_temp.h('amanha_15')) like 'P0001 campo_imutavel');
select set_config('amo.remarcando', '', true);

select pg_temp.verificar('sem a marca, a faixa do agendado nao muda',
  pg_temp.remarcar(pg_temp.id('pago2'), 'agendado', pg_temp.h('amanha_14'), pg_temp.h('amanha_15')) like 'P0001 campo_imutavel');
select pg_temp.verificar('outra marca nao vale',
  (select set_config('amo.remarcando', 'nao', true)) = 'nao'
  and pg_temp.remarcar(pg_temp.id('pago2'), 'agendado', pg_temp.h('amanha_14'), pg_temp.h('amanha_15')) like 'P0001 campo_imutavel');
select set_config('amo.remarcando', '', true);

-- a coerencia do modo e da faixa vale tambem para quem escreve direto
select pg_temp.verificar('cotacao agendada sem fim e recusada pelo check',
  pg_temp.como('postgres', null, format(
    $$insert into privado.cotacoes (cep, logradouro, numero, bairro, cidade, uf, valor_centavos, minutos, origem,
        expira_em, modo, janela_inicio, janela_fim)
      values ('04567000', 'Rua X', '1', 'Centro', 'São Paulo', 'SP', 990, 35, 'exemplo',
        now() + interval '15 minutes', 'agendado', %L, null)$$, pg_temp.h('amanha_12'))) like '23514%');
select pg_temp.verificar('cotacao agendada sem inicio e recusada pelo check',
  pg_temp.como('postgres', null, format(
    $$insert into privado.cotacoes (cep, logradouro, numero, bairro, cidade, uf, valor_centavos, minutos, origem,
        expira_em, modo, janela_inicio, janela_fim)
      values ('04567000', 'Rua X', '1', 'Centro', 'São Paulo', 'SP', 990, 35, 'exemplo',
        now() + interval '15 minutes', 'agendado', null, %L)$$, pg_temp.h('amanha_13'))) like '23514%');
select pg_temp.verificar('pedido agendado sem fim e recusado pelo check',
  pg_temp.como('postgres', null, format(
    $$insert into public.pedidos (
        numero, user_id, subtotal_centavos, frete_centavos, total_centavos,
        cliente_nome, cliente_celular, cliente_email,
        entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento,
        entrega_bairro, entrega_cidade, entrega_uf, entrega_minutos,
        entrega_modo, entrega_janela_inicio, entrega_janela_fim)
      values ('AMO-ZZZZ2345', %L, 1890, 990, 2880,
        'Cliente Teste', '11987654321', 'cliente@teste.invalid',
        '04567000', 'Rua Siqueira Bueno', '120', 'ap 52',
        'Belenzinho', 'São Paulo', 'SP', 35,
        'agendado', %L, null)$$, pg_temp.id('e'), pg_temp.h('amanha_12'))) like '23514%');
select pg_temp.verificar('pedido agendado sem inicio e recusado pelo check',
  pg_temp.como('postgres', null, format(
    $$insert into public.pedidos (
        numero, user_id, subtotal_centavos, frete_centavos, total_centavos,
        cliente_nome, cliente_celular, cliente_email,
        entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento,
        entrega_bairro, entrega_cidade, entrega_uf, entrega_minutos,
        entrega_modo, entrega_janela_inicio, entrega_janela_fim)
      values ('AMO-ZZZZ2346', %L, 1890, 990, 2880,
        'Cliente Teste', '11987654321', 'cliente@teste.invalid',
        '04567000', 'Rua Siqueira Bueno', '120', 'ap 52',
        'Belenzinho', 'São Paulo', 'SP', 35,
        'agendado', null, %L)$$, pg_temp.id('e'), pg_temp.h('amanha_13'))) like '23514%');

select pg_temp.verificar('a cliente nao altera o modo',
  pg_temp.como('authenticated', pg_temp.id('e'), format(
    $$update public.pedidos set entrega_modo = 'agendado' where id = %L$$, pg_temp.id('pago2'))) like '42501%');

select * from pg_temp.relatorio();
rollback;
