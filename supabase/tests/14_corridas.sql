-- A corrida no banco (spec 8 da entrega pelo Uber Direct): a intencao nasce
-- com o pagamento, uma so por pedido; a reserva nao entrega o mesmo pedido
-- duas vezes; a falha conta tentativas; o pedido cancelado pede o
-- cancelamento da corrida; a remarcacao grava a faixa; o que a Uber diz anda
-- o pedido sem voltar; a Uber cancelar cria uma segunda corrida, e so uma; a
-- data fechada chama a equipe; o rastreio so aceita https da Uber.
--
-- O relogio nao e fixo: as faixas usadas sao amanha e depois de amanha, das
-- 12h as 13h de Sao Paulo, com a cozinha aberta o dia todo.

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
  ('amanha_10_30', (((now() at time zone 'America/Sao_Paulo')::date + 1) + time '10:30') at time zone 'America/Sao_Paulo'),
  ('amanha_11_30', (((now() at time zone 'America/Sao_Paulo')::date + 1) + time '11:30') at time zone 'America/Sao_Paulo'),
  ('depois_12', (((now() at time zone 'America/Sao_Paulo')::date + 2) + time '12:00') at time zone 'America/Sao_Paulo'),
  ('depois_13', (((now() at time zone 'America/Sao_Paulo')::date + 2) + time '13:00') at time zone 'America/Sao_Paulo');

create function pg_temp.h(p_nome text)
returns timestamptz
language sql
stable
as $$
  select valor from _h where nome = p_nome;
$$;

insert into _v values ('a', pg_temp.nova_cliente('a@teste.invalid'));

-- um pedido pago pelo caminho do Mercado Pago (aplicar_pagamento); a
-- tentativa fica em _v como 't:<pedido>'
create function pg_temp.pedido_pago(p_usuario uuid)
returns uuid
language plpgsql
as $$
declare
  v_pedido uuid;
  v_tentativa uuid;
begin
  v_pedido := pg_temp.pedido_de_exemplo(p_usuario);
  insert into public.pagamentos (pedido_id, forma, valor_centavos)
  values (v_pedido, 'pix', 2880) returning id into v_tentativa;
  perform * from privado.aplicar_pagamento(v_tentativa, 'ORD' || replace(v_tentativa::text, '-', ''), 'PAY1',
    'aprovado', 'accredited', 2880);
  insert into _v values ('t:' || v_pedido::text, v_tentativa);
  return v_pedido;
end
$$;

-- o estado da corrida de um pedido
create function pg_temp.estado(p_pedido uuid)
returns text
language plpgsql
stable
as $$
declare
  v_estado text;
begin
  select e.estado into v_estado from privado.entregas e where e.pedido_id = p_pedido;
  return coalesce(v_estado, '<sem corrida>');
end
$$;

-- o que cada reserva devolveu, com a rodada
create temp table _reservas (
  rodada integer, pedido uuid, numero text, chave uuid, cliente_nome text, cliente_celular text,
  cep text, logradouro text, numero_casa text, complemento text, bairro text, cidade text, uf text,
  modo text, janela_inicio timestamptz, janela_fim timestamptz, subtotal_centavos integer,
  frete_centavos integer, origem text, uber_cotacao_id text, cotacao_expira_em timestamptz, itens jsonb);

create function pg_temp.reservar(p_rodada integer, p_maximo integer)
returns integer
language plpgsql
as $$
declare
  v_quantos integer;
begin
  insert into _reservas select p_rodada, r.* from privado.reservar_corridas(p_maximo) r;
  get diagnostics v_quantos = row_count;
  return v_quantos;
end
$$;

create function pg_temp.reservado(p_rodada integer, p_pedido uuid)
returns boolean
language sql
stable
as $$
  select exists (select 1 from _reservas where rodada = p_rodada and pedido = p_pedido);
$$;

-- reserva tudo o que esta a criar e marca a corrida do pedido como criada
create function pg_temp.criar(p_pedido uuid, p_uber text)
returns text
language plpgsql
as $$
begin
  perform pg_temp.reservar(99, 50);
  return privado.marcar_corrida_criada(p_pedido, p_uber, 990, null, 'pending');
end
$$;

-- o que aplicar_entrega devolveu: 'pedido_status/estado', '<nada>' ou o erro
create function pg_temp.uber(p_uber text, p_status text, p_rastreio text default null, p_valor integer default null)
returns text
language plpgsql
as $$
declare
  v_saida text;
begin
  select string_agg(r.pedido_status || '/' || r.estado, ';') into v_saida
  from privado.aplicar_entrega(p_uber, p_status, p_rastreio, p_valor) r;
  return coalesce(v_saida, '<nada>');
exception when others then
  return 'erro ' || sqlstate || ' ' || sqlerrm;
end
$$;

create function pg_temp.cancelar(p_pedido uuid)
returns void
language sql
as $$
  update public.pedidos set status = 'cancelado', motivo_cancelamento = 'loja' where id = p_pedido;
$$;

-- 1. a intencao nasce com o pagamento
insert into _v values ('p1', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.verificar('o pagamento grava a corrida a_criar',
  pg_temp.estado(pg_temp.id('p1')) = 'a_criar', pg_temp.estado(pg_temp.id('p1')));
select pg_temp.verificar('a corrida nasce com chave, sem tentativas e sem id da Uber',
  (select chave is not null and tentativas = 0 and cancelamentos_uber = 0 and uber_entrega_id is null
     and reservado_em is null and motivo is null and valor_uber_centavos is null and criado_em = now()
   from privado.entregas where pedido_id = pg_temp.id('p1')));
insert into _t values ('chave_p1', (select chave::text from privado.entregas where pedido_id = pg_temp.id('p1')));
select pg_temp.verificar('o mesmo pagamento de novo nao grava outra corrida',
  (select r.pedido_status = 'pago'
   from privado.aplicar_pagamento(pg_temp.id('t:' || pg_temp.id('p1')::text),
     'ORD' || replace(pg_temp.id('t:' || pg_temp.id('p1')::text)::text, '-', ''), 'PAY1', 'aprovado', 'accredited', 2880) r));
select pg_temp.verificar('continua uma corrida so, com a mesma chave',
  (select count(*) from privado.entregas where pedido_id = pg_temp.id('p1')) = 1
  and (select chave::text from privado.entregas where pedido_id = pg_temp.id('p1')) = (select valor from _t where nome = 'chave_p1'));

insert into _v values ('aguarda', pg_temp.pedido_de_exemplo(pg_temp.id('a')));
select pg_temp.verificar('pedido aguardando pagamento nao tem corrida',
  pg_temp.estado(pg_temp.id('aguarda')) = '<sem corrida>');

insert into _v values ('p_ex', pg_temp.pedido_de_exemplo(pg_temp.id('a'), 'pago'));
select pg_temp.verificar('pago por qualquer caminho grava a corrida',
  pg_temp.estado(pg_temp.id('p_ex')) = 'a_criar');

insert into _v values ('p2', pg_temp.pedido_pago(pg_temp.id('a')));

-- a cotacao do p1 veio da Uber
select pg_temp.preparar(format($$insert into privado.cotacoes (
    user_id, cep, logradouro, numero, complemento, bairro, cidade, uf, valor_centavos, minutos, origem,
    uber_cotacao_id, expira_em, pedido_id)
  values (%L, '04567000', 'Rua Siqueira Bueno', '120', 'ap 52', 'Belenzinho', 'São Paulo', 'SP', 990, 35, 'uber',
    'dqt_abc123', now() + interval '15 minutes', %L)$$, pg_temp.id('a'), pg_temp.id('p1')));

-- 2. a reserva
select pg_temp.verificar('reserva de zero ou nula nao devolve nada',
  pg_temp.reservar(0, 0) = 0 and pg_temp.reservar(0, null) = 0 and pg_temp.estado(pg_temp.id('p1')) = 'a_criar');
select pg_temp.verificar('reserva de 1 devolve uma corrida', pg_temp.reservar(1, 1) = 1);
select pg_temp.verificar('a segunda reserva de 1 devolve outra', pg_temp.reservar(2, 1) = 1);
select pg_temp.verificar('duas reservas seguidas nao devolvem o mesmo pedido',
  (select r1.pedido <> r2.pedido from _reservas r1, _reservas r2 where r1.rodada = 1 and r2.rodada = 2));
select pg_temp.reservar(3, 50);
select pg_temp.verificar('a terceira reserva nao repete as anteriores',
  not exists (select 1 from _reservas r3 join _reservas r on r.pedido = r3.pedido and r.rodada in (1, 2)
              where r3.rodada = 3));
select pg_temp.verificar('as tres reservas cobrem os tres pedidos pagos',
  (select count(distinct pedido) from _reservas
   where rodada in (1, 2, 3) and pedido in (pg_temp.id('p1'), pg_temp.id('p2'), pg_temp.id('p_ex'))) = 3);
select pg_temp.reservar(4, 50);
select pg_temp.verificar('corrida criando agora nao e reservada de novo',
  not pg_temp.reservado(4, pg_temp.id('p1')) and not pg_temp.reservado(4, pg_temp.id('p2'))
  and not pg_temp.reservado(4, pg_temp.id('p_ex')));
select pg_temp.verificar('a reserva passa a criando e carimba a hora',
  (select bool_and(estado = 'criando' and reservado_em = now()) from privado.entregas
   where pedido_id in (pg_temp.id('p1'), pg_temp.id('p2'), pg_temp.id('p_ex'))));

select pg_temp.verificar('a reserva devolve o retrato, a chave e os itens',
  (select numero = (select numero from public.pedidos where id = pg_temp.id('p1'))
     and chave::text = (select valor from _t where nome = 'chave_p1')
     and cliente_nome = 'Cliente Teste' and cliente_celular = '11987654321'
     and cep = '04567000' and logradouro = 'Rua Siqueira Bueno' and numero_casa = '120' and complemento = 'ap 52'
     and bairro = 'Belenzinho' and cidade = 'São Paulo' and uf = 'SP'
     and modo = 'agora' and janela_inicio is null and janela_fim is null
     and subtotal_centavos = 1890 and frete_centavos = 990
     and itens = '[{"nome": "Prestígio", "quantos": 1, "preco_centavos": 1890}]'::jsonb
   from _reservas where pedido = pg_temp.id('p1')),
  (select itens::text from _reservas where pedido = pg_temp.id('p1')));
select pg_temp.verificar('a reserva devolve a cotacao do pedido',
  (select origem = 'uber' and uber_cotacao_id = 'dqt_abc123' and cotacao_expira_em > now()
   from _reservas where pedido = pg_temp.id('p1')));
select pg_temp.verificar('sem cotacao, os campos dela vem nulos',
  (select origem is null and uber_cotacao_id is null and cotacao_expira_em is null
   from _reservas where pedido = pg_temp.id('p2')));

select pg_temp.preparar(format($$update privado.entregas set reservado_em = now() - interval '3 minutes'
  where pedido_id = %L$$, pg_temp.id('p1')));
select pg_temp.preparar(format($$update privado.entregas set reservado_em = now() - interval '1 minute'
  where pedido_id = %L$$, pg_temp.id('p2')));
select pg_temp.reservar(5, 50);
select pg_temp.verificar('criando parada ha 3 minutos volta a ser reservada', pg_temp.reservado(5, pg_temp.id('p1')));
select pg_temp.verificar('criando parada ha 1 minuto nao', not pg_temp.reservado(5, pg_temp.id('p2')));
select pg_temp.verificar('a nova reserva carimba a hora de novo',
  (select reservado_em = now() from privado.entregas where pedido_id = pg_temp.id('p1')));

-- 3. a falha
select pg_temp.verificar('falha 1: volta a a_criar',
  privado.marcar_corrida_falhou(pg_temp.id('p_ex'), 'erro_uber', false) = 'a_criar');
select pg_temp.verificar('falha conta a tentativa, grava o motivo e solta a reserva',
  (select tentativas = 1 and motivo = 'erro_uber' and reservado_em is null
   from privado.entregas where pedido_id = pg_temp.id('p_ex')));
select pg_temp.verificar('falha 2: a_criar', privado.marcar_corrida_falhou(pg_temp.id('p_ex'), 'erro_uber', false) = 'a_criar');
select pg_temp.verificar('falha 3: a_criar', privado.marcar_corrida_falhou(pg_temp.id('p_ex'), 'erro_uber', false) = 'a_criar');
select pg_temp.verificar('falha 4: a_criar', privado.marcar_corrida_falhou(pg_temp.id('p_ex'), 'erro_uber', false) = 'a_criar');
select pg_temp.verificar('falha 5: precisa_da_equipe',
  privado.marcar_corrida_falhou(pg_temp.id('p_ex'), 'erro_uber', false) = 'precisa_da_equipe');
select pg_temp.verificar('cinco tentativas contadas',
  (select tentativas = 5 from privado.entregas where pedido_id = pg_temp.id('p_ex')));
select pg_temp.verificar('falha definitiva vai direto a precisa_da_equipe',
  privado.marcar_corrida_falhou(pg_temp.id('p2'), 'parametro_invalido', true) = 'precisa_da_equipe');
select pg_temp.verificar('a falha definitiva conta uma tentativa e grava o motivo',
  (select tentativas = 1 and motivo = 'parametro_invalido' from privado.entregas where pedido_id = pg_temp.id('p2')));
select pg_temp.reservar(6, 50);
select pg_temp.verificar('precisa_da_equipe nao e reservada',
  not pg_temp.reservado(6, pg_temp.id('p2')) and not pg_temp.reservado(6, pg_temp.id('p_ex')));
select pg_temp.verificar('motivo fora do formato e recusado',
  pg_temp.valor('postgres', null, format($$select privado.marcar_corrida_falhou(%L, 'Erro da Uber!', false)$$,
    pg_temp.id('p1'))) like '%motivo_invalido%');
select pg_temp.verificar('falha de pedido sem corrida e recusada',
  pg_temp.valor('postgres', null, format($$select privado.marcar_corrida_falhou(%L, 'erro_uber', false)$$,
    pg_temp.id('aguarda'))) like '%corrida_invalida%');

-- 4. criada, cancelar e conferir
select pg_temp.verificar('marcar criada: criando vira criada',
  privado.marcar_corrida_criada(pg_temp.id('p1'), 'del_p1', 1234,
    'https://direct-order.uber.com/orders/del_p1', 'pending') = 'criada');
select pg_temp.verificar('a corrida criada guarda o id, o valor e o estado da Uber',
  (select uber_entrega_id = 'del_p1' and valor_uber_centavos = 1234 and status_uber = 'pending'
     and reservado_em is null and atualizado_em = now()
   from privado.entregas where pedido_id = pg_temp.id('p1')));
select pg_temp.verificar('o rastreio do host da Uber fica no pedido, que continua pago',
  (select rastreio_url = 'https://direct-order.uber.com/orders/del_p1' and status = 'pago'
   from public.pedidos where id = pg_temp.id('p1')));
select pg_temp.reservar(7, 50);
select pg_temp.verificar('criada nao e reservada', not pg_temp.reservado(7, pg_temp.id('p1')));
select pg_temp.verificar('marcar criada de novo com o mesmo id nao muda nada',
  privado.marcar_corrida_criada(pg_temp.id('p1'), 'del_p1', 1234, null, 'pending') = 'criada');
select pg_temp.verificar('marcar criada com outro id e recusado',
  pg_temp.valor('postgres', null, format($$select privado.marcar_corrida_criada(%L, 'del_outro', 1234, null, 'pending')$$,
    pg_temp.id('p1'))) like '%corrida_invalida%');

select pg_temp.verificar('criada recente nao entra na conferencia',
  not exists (select 1 from privado.corridas_a_conferir() c where c.uber_entrega_id = 'del_p1'));
select pg_temp.preparar(format($$update privado.entregas set atualizado_em = now() - interval '11 minutes'
  where pedido_id = %L$$, pg_temp.id('p1')));
select pg_temp.verificar('criada parada ha 11 minutos entra na conferencia',
  exists (select 1 from privado.corridas_a_conferir() c where c.uber_entrega_id = 'del_p1'));

select pg_temp.cancelar(pg_temp.id('p1'));
select pg_temp.verificar('cancelar pedido pago com corrida criada da a_cancelar', pg_temp.estado(pg_temp.id('p1')) = 'a_cancelar');
select pg_temp.verificar('a_cancelar entra na lista de cancelar',
  exists (select 1 from privado.corridas_a_cancelar() c where c.pedido = pg_temp.id('p1') and c.uber_entrega_id = 'del_p1'));
select pg_temp.verificar('a_cancelar sai da conferencia',
  not exists (select 1 from privado.corridas_a_conferir() c where c.uber_entrega_id = 'del_p1'));
select privado.corrida_cancelada(pg_temp.id('p1'));
select pg_temp.verificar('corrida_cancelada grava cancelada', pg_temp.estado(pg_temp.id('p1')) = 'cancelada');
select pg_temp.verificar('cancelada sai da lista de cancelar',
  not exists (select 1 from privado.corridas_a_cancelar() c where c.pedido = pg_temp.id('p1')));
select pg_temp.verificar('a Uber entregar um pedido cancelado nao muda o pedido',
  pg_temp.uber('del_p1', 'delivered') = 'cancelado/cancelada');

insert into _v values ('p3', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.reservar(8, 50);
select pg_temp.verificar('o preparo do cancelado no meio: p3 criando', pg_temp.estado(pg_temp.id('p3')) = 'criando');
select pg_temp.cancelar(pg_temp.id('p3'));
select pg_temp.verificar('pedido cancelado com a corrida criando vai a a_cancelar', pg_temp.estado(pg_temp.id('p3')) = 'a_cancelar');
select pg_temp.verificar('marcar criada com o pedido cancelado no meio deixa a_cancelar',
  privado.marcar_corrida_criada(pg_temp.id('p3'), 'del_p3', 990, null, 'pending') = 'a_cancelar');
select pg_temp.verificar('e ela entra na lista de cancelar com o id',
  exists (select 1 from privado.corridas_a_cancelar() c where c.pedido = pg_temp.id('p3') and c.uber_entrega_id = 'del_p3'));
select pg_temp.verificar('a Uber confirmar o cancelamento pedido grava cancelada',
  pg_temp.uber('del_p3', 'canceled') = 'cancelado/cancelada');

insert into _v values ('p4', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.cancelar(pg_temp.id('p4'));
select pg_temp.verificar('pedido cancelado com a corrida a_criar vai direto a cancelada',
  pg_temp.estado(pg_temp.id('p4')) = 'cancelada');

insert into _v values ('p5', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.reservar(9, 50);
select pg_temp.cancelar(pg_temp.id('p5'));
select pg_temp.verificar('a_cancelar que falha ao criar vira cancelada',
  privado.marcar_corrida_falhou(pg_temp.id('p5'), 'erro_uber', false) = 'cancelada');

-- 5. a remarcacao
insert into _v values ('p9', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.verificar('remarcar de agora para agendado passa',
  pg_temp.como('postgres', null, format($$select privado.remarcar_entrega(%L, %L, %L)$$,
    pg_temp.id('p9'), pg_temp.h('amanha_12'), pg_temp.h('amanha_13'))) = 'ok');
select pg_temp.verificar('o pedido mostra o modo e a faixa',
  (select entrega_modo = 'agendado' and entrega_janela_inicio = pg_temp.h('amanha_12')
     and entrega_janela_fim = pg_temp.h('amanha_13') and status = 'pago'
   from public.pedidos where id = pg_temp.id('p9')));
select pg_temp.verificar('a marca da remarcacao nao fica ligada',
  coalesce(current_setting('amo.remarcando', true), '') = '');
select pg_temp.verificar('remarcar para faixa invalida e recusado',
  pg_temp.como('postgres', null, format($$select privado.remarcar_entrega(%L, %L, %L)$$,
    pg_temp.id('p9'), pg_temp.h('amanha_10_30'), pg_temp.h('amanha_11_30'))) like '%faixa_indisponivel%');
select pg_temp.verificar('remarcar pedido que aguarda pagamento e recusado',
  pg_temp.como('postgres', null, format($$select privado.remarcar_entrega(%L, %L, %L)$$,
    pg_temp.id('aguarda'), pg_temp.h('amanha_12'), pg_temp.h('amanha_13'))) like '%pedido_invalido%');
select pg_temp.verificar('a marca continua desligada depois da recusa',
  coalesce(current_setting('amo.remarcando', true), '') = '');

insert into _v values ('p7', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.preparar('update public.loja set vendas_pausadas = true where id');
select pg_temp.verificar('remarcar ignora a pausa das vendas',
  pg_temp.como('postgres', null, format($$select privado.remarcar_entrega(%L, %L, %L)$$,
    pg_temp.id('p7'), pg_temp.h('depois_12'), pg_temp.h('depois_13'))) = 'ok');
select pg_temp.preparar('update public.loja set vendas_pausadas = false where id');

-- 6. a data fechada
select pg_temp.verificar('o preparo da data fechada: p9 agendado amanha criada',
  pg_temp.criar(pg_temp.id('p9'), 'del_p9') = 'criada');
insert into _v values ('p6', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.preparar(format($$select privado.remarcar_entrega(%L, %L, %L)$$,
  pg_temp.id('p6'), pg_temp.h('amanha_12'), pg_temp.h('amanha_13')));
insert into _v values ('p8', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.preparar(format($$insert into public.dias_fechados (data, motivo) values (%L, 'feriado')$$,
  ((now() at time zone 'America/Sao_Paulo')::date + 1)));
select pg_temp.verificar('fechar a data leva a corrida a criar dela a precisa_da_equipe',
  (select estado = 'precisa_da_equipe' and motivo = 'data_fechada' from privado.entregas where pedido_id = pg_temp.id('p6')));
select pg_temp.verificar('fechar a data leva a corrida criada dela a precisa_da_equipe',
  (select estado = 'precisa_da_equipe' and motivo = 'data_fechada' from privado.entregas where pedido_id = pg_temp.id('p9')));
select pg_temp.verificar('a corrida de outra data nao muda',
  pg_temp.estado(pg_temp.id('p7')) in ('a_criar', 'criando'), pg_temp.estado(pg_temp.id('p7')));
select pg_temp.verificar('a corrida agora nao muda',
  pg_temp.estado(pg_temp.id('p8')) = 'a_criar', pg_temp.estado(pg_temp.id('p8')));
select pg_temp.verificar('a corrida cancelada nao muda', pg_temp.estado(pg_temp.id('p4')) = 'cancelada');
select pg_temp.cancelar(pg_temp.id('p9'));
select pg_temp.verificar('cancelar pedido com corrida viva com a equipe pede o cancelamento na Uber',
  pg_temp.estado(pg_temp.id('p9')) = 'a_cancelar');
select pg_temp.cancelar(pg_temp.id('p6'));
select pg_temp.verificar('cancelar pedido com corrida com a equipe sem id da Uber cancela a corrida',
  pg_temp.estado(pg_temp.id('p6')) = 'cancelada');

-- 7. o que a Uber diz
select pg_temp.verificar('id desconhecido devolve zero linhas', pg_temp.uber('del_nao_existe', 'delivered') = '<nada>');

insert into _v values ('p10', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.verificar('o preparo do entregue: p10 criada', pg_temp.criar(pg_temp.id('p10'), 'del_p10') = 'criada');
select pg_temp.verificar('delivered direto de pago termina entregue',
  pg_temp.uber('del_p10', 'delivered', null, 1500) = 'entregue/criada');
select pg_temp.verificar('a_caminho_em e entregue_em carimbados',
  (select a_caminho_em is not null and entregue_em is not null from public.pedidos where id = pg_temp.id('p10')));
select pg_temp.verificar('o valor e o estado da Uber atualizados',
  (select valor_uber_centavos = 1500 and status_uber = 'delivered' from privado.entregas where pedido_id = pg_temp.id('p10')));
select pg_temp.verificar('dropoff depois de delivered nao volta',
  pg_temp.uber('del_p10', 'dropoff') = 'entregue/criada');
select pg_temp.verificar('o estado da Uber continua delivered',
  (select status_uber = 'delivered' from privado.entregas where pedido_id = pg_temp.id('p10')));
select pg_temp.preparar(format($$update privado.entregas set atualizado_em = now() - interval '11 minutes'
  where pedido_id = %L$$, pg_temp.id('p10')));
select pg_temp.verificar('entregue nao entra na conferencia',
  not exists (select 1 from privado.corridas_a_conferir() c where c.uber_entrega_id = 'del_p10'));

-- o caminho de hoje: em_preparo, retirada, entrega
insert into _v values ('p11', pg_temp.pedido_de_exemplo(pg_temp.id('a'), 'em_preparo'));
select pg_temp.verificar('o preparo do em_preparo: p11 criada', pg_temp.criar(pg_temp.id('p11'), 'del_p11') = 'criada');
select pg_temp.verificar('pending nao anda o pedido',
  (select status = 'em_preparo' from public.pedidos where id = pg_temp.id('p11')));
select pg_temp.verificar('em_preparo e pickup_complete: a caminho',
  pg_temp.uber('del_p11', 'pickup_complete', 'https://www.uber.com/track/del_p11') = 'a_caminho/criada');
select pg_temp.verificar('a caminho e delivered: entregue',
  pg_temp.uber('del_p11', 'delivered') = 'entregue/criada');
select pg_temp.verificar('pago e dropoff: a caminho',
  (select pg_temp.criar(pg_temp.id('p8'), 'del_p8')) = 'criada'
  and pg_temp.uber('del_p8', 'dropoff') = 'a_caminho/criada');
select pg_temp.verificar('a Uber cancelar depois da retirada chama a equipe',
  pg_temp.uber('del_p8', 'canceled') = 'a_caminho/precisa_da_equipe');
select pg_temp.verificar('sem segunda corrida: o id fica e o motivo e cancelada_pela_uber',
  (select motivo = 'cancelada_pela_uber' and uber_entrega_id = 'del_p8' from privado.entregas where pedido_id = pg_temp.id('p8')));

-- a Uber cancela duas vezes
insert into _v values ('p12', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.verificar('o preparo da Uber que cancela: p12 criada', pg_temp.criar(pg_temp.id('p12'), 'del_p12a') = 'criada');
select pg_temp.preparar(format($$update public.pedidos set rastreio_url = 'https://direct-order.uber.com/o/a' where id = %L$$,
  pg_temp.id('p12')));
insert into _t values ('chave_p12', (select chave::text from privado.entregas where pedido_id = pg_temp.id('p12')));
select pg_temp.verificar('a Uber cancelou a primeira: a_criar',
  pg_temp.uber('del_p12a', 'canceled') = 'pago/a_criar');
select pg_temp.verificar('a primeira cancelada pela Uber ganha chave nova e perde o id',
  (select chave::text <> (select valor from _t where nome = 'chave_p12') and uber_entrega_id is null
     and cancelamentos_uber = 1 and reservado_em is null
   from privado.entregas where pedido_id = pg_temp.id('p12')));
select pg_temp.verificar('o pedido continua pago e perde o rastreio da corrida cancelada',
  (select status = 'pago' and rastreio_url is null from public.pedidos where id = pg_temp.id('p12')));
select pg_temp.verificar('o id velho nao acha mais nada', pg_temp.uber('del_p12a', 'canceled') = '<nada>');
select pg_temp.verificar('a segunda corrida e criada', pg_temp.criar(pg_temp.id('p12'), 'del_p12b') = 'criada');
select pg_temp.verificar('a Uber cancelou a segunda: precisa_da_equipe',
  pg_temp.uber('del_p12b', 'canceled') = 'pago/precisa_da_equipe');
select pg_temp.verificar('o motivo e cancelada_pela_uber',
  (select motivo = 'cancelada_pela_uber' and cancelamentos_uber = 2 and uber_entrega_id = 'del_p12b'
   from privado.entregas where pedido_id = pg_temp.id('p12')));

insert into _v values ('p13', pg_temp.pedido_pago(pg_temp.id('a')));
select pg_temp.verificar('o preparo do devolvido: p13 criada', pg_temp.criar(pg_temp.id('p13'), 'del_p13') = 'criada');
select pg_temp.verificar('returned vai a precisa_da_equipe',
  pg_temp.uber('del_p13', 'returned') = 'pago/precisa_da_equipe');
select pg_temp.verificar('o motivo e devolvida',
  (select motivo = 'devolvida' from privado.entregas where pedido_id = pg_temp.id('p13')));

select pg_temp.verificar('estado da Uber fora do formato e recusado',
  pg_temp.uber('del_p13', 'Delivered!') like '%status_invalido%');
select pg_temp.verificar('estado da Uber nulo e recusado',
  pg_temp.uber('del_p13', null) like '%status_invalido%');
select pg_temp.verificar('valor da Uber fora da faixa e recusado',
  pg_temp.uber('del_p13', 'returned', null, -1) like 'erro 23514%');

-- 8. o rastreio
select pg_temp.verificar('rastreio https do host da Uber aceito',
  pg_temp.uber('del_p13', 'returned', 'https://direct-order.uber.com/orders/abc?x=1') = 'pago/precisa_da_equipe');
select pg_temp.verificar('o rastreio do host da Uber fica no pedido',
  (select rastreio_url = 'https://direct-order.uber.com/orders/abc?x=1' from public.pedidos where id = pg_temp.id('p13')));
select pg_temp.verificar('rastreio http recusado',
  pg_temp.uber('del_p13', 'returned', 'http://direct-order.uber.com/orders/abc') like '%rastreio_invalido%');
select pg_temp.verificar('rastreio de dominio parecido recusado (uber.com.evil.com)',
  pg_temp.uber('del_p13', 'returned', 'https://uber.com.evil.com/orders/abc') like '%rastreio_invalido%');
select pg_temp.verificar('rastreio de dominio parecido recusado (evil-uber.com)',
  pg_temp.uber('del_p13', 'returned', 'https://evil-uber.com/orders/abc') like '%rastreio_invalido%');
select pg_temp.verificar('rastreio de host da Uber como prefixo recusado',
  pg_temp.uber('del_p13', 'returned', 'https://direct-order.uber.com.evil.com/x') like '%rastreio_invalido%');
select pg_temp.verificar('rastreio javascript recusado',
  pg_temp.uber('del_p13', 'returned', 'javascript:alert(1)') like '%rastreio_invalido%');
select pg_temp.verificar('rastreio recusado nao muda o pedido',
  (select rastreio_url = 'https://direct-order.uber.com/orders/abc?x=1' from public.pedidos where id = pg_temp.id('p13')));
select pg_temp.verificar('o check do pedido aceita o host da Uber',
  pg_temp.como('postgres', null, format($$update public.pedidos set rastreio_url = 'https://direct-order.uber.com/o/1' where id = %L$$,
    pg_temp.id('p13'))) = 'ok');
select pg_temp.verificar('o check do pedido recusa http',
  pg_temp.como('postgres', null, format($$update public.pedidos set rastreio_url = 'http://direct-order.uber.com/o/1' where id = %L$$,
    pg_temp.id('p13'))) like '23514%');
select pg_temp.verificar('o check do pedido recusa dominio parecido',
  pg_temp.como('postgres', null, format($$update public.pedidos set rastreio_url = 'https://evil-uber.com/o/1' where id = %L$$,
    pg_temp.id('p13'))) like '23514%'
  and pg_temp.como('postgres', null, format($$update public.pedidos set rastreio_url = 'https://uber.com.evil.com/o/1' where id = %L$$,
    pg_temp.id('p13'))) like '23514%');
select pg_temp.verificar('marcar criada com rastreio http e recusado',
  pg_temp.valor('postgres', null, format(
    $$select privado.marcar_corrida_criada(%L, 'del_p7', 990, 'http://direct-order.uber.com/o/1', 'pending')$$,
    pg_temp.id('p7'))) like '%rastreio_invalido%');
select pg_temp.verificar('a corrida recusada continua criando e sem id',
  (select uber_entrega_id is null and estado = 'criando' from privado.entregas where pedido_id = pg_temp.id('p7')));

-- 9. so a chave secreta
select pg_temp.verificar('cliente nao reserva corrida',
  pg_temp.como('authenticated', pg_temp.id('a'), 'select * from privado.reservar_corridas(1)') like '42501%');
select pg_temp.verificar('cliente nao aplica entrega',
  pg_temp.como('authenticated', pg_temp.id('a'), $$select * from privado.aplicar_entrega('del_p13', 'delivered', null, null)$$)
  like '42501%');
select pg_temp.verificar('a chave secreta confere as listas',
  pg_temp.como('service_role', null, 'select * from privado.corridas_a_conferir()') = 'ok'
  and pg_temp.como('service_role', null, 'select * from privado.corridas_a_cancelar()') = 'ok');
select pg_temp.verificar('a chave secreta nao le a tabela das corridas',
  pg_temp.como('service_role', null, 'select * from privado.entregas') like '42501%');

select * from pg_temp.relatorio();
rollback;
