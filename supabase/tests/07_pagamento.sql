-- Pagamento, avisos, entrega e limites (spec 9.2, 10.3, 10.4 e 10.5).
-- Cada linha da tabela de estados do pagamento; repetir nao muda nada; o
-- dinheiro recebido sem pedido a pagar vira a_estornar.

insert into _v values ('a', pg_temp.nova_cliente('a@teste.invalid'));

create function pg_temp.tentativa(p_pedido uuid, p_valor integer default 2880)
returns uuid
language sql
as $$
  insert into public.pagamentos (pedido_id, forma, valor_centavos) values (p_pedido, 'pix', p_valor) returning id;
$$;

-- 'estado da tentativa/estado do pedido', ou o erro
create function pg_temp.aplicar(p_pagamento uuid, p_status text, p_valor integer default 2880)
returns text
language plpgsql
as $$
declare
  v_saida text;
begin
  select r.pagamento_status || '/' || r.pedido_status into v_saida
  from privado.aplicar_pagamento(p_pagamento, 'ORD' || replace(p_pagamento::text, '-', ''), 'PAY1',
    p_status, 'accredited', p_valor) r;
  return v_saida;
exception when others then
  return 'erro ' || sqlerrm;
end
$$;

-- um pedido aguardando pagamento e uma tentativa pendente para cada cenario
insert into _v
select 'p' || g, pg_temp.pedido_de_exemplo(pg_temp.id('a')) from generate_series(1, 9) g;
insert into _v
select 't' || g, pg_temp.tentativa(pg_temp.id('p' || g)) from generate_series(1, 9) g;

select pg_temp.verificar('aprovado com o valor certo paga o pedido',
  pg_temp.aplicar(pg_temp.id('t1'), 'aprovado') = 'aprovado/pago');
select pg_temp.verificar('o mesmo aviso de novo nao muda nada',
  pg_temp.aplicar(pg_temp.id('t1'), 'aprovado') = 'aprovado/pago');
select pg_temp.verificar('a aprovacao carimba a data',
  (select aprovado_em is not null from public.pagamentos where id = pg_temp.id('t1')));

select pg_temp.verificar('valor diferente nao paga: a_estornar',
  pg_temp.aplicar(pg_temp.id('t2'), 'aprovado', 2879) = 'a_estornar/aguardando_pagamento');

insert into _v values ('t1b', pg_temp.tentativa(pg_temp.id('p1')));
select pg_temp.verificar('segunda aprovacao do mesmo pedido: a_estornar',
  pg_temp.aplicar(pg_temp.id('t1b'), 'aprovado') = 'a_estornar/pago');

select pg_temp.preparar(format($$update public.pagamentos set status = 'cancelado' where id = %L$$, pg_temp.id('t4')));
select pg_temp.verificar('tentativa cancelada que e paga aprova o pedido que aguarda',
  pg_temp.aplicar(pg_temp.id('t4'), 'aprovado') = 'aprovado/pago');

select pg_temp.preparar(format($$update public.pagamentos set status = 'expirado' where id = %L$$, pg_temp.id('t5')));
select pg_temp.preparar(format(
  $$update public.pedidos set status = 'cancelado', motivo_cancelamento = 'expirado' where id = %L$$, pg_temp.id('p5')));
select pg_temp.verificar('pago depois de o pedido expirar: a_estornar',
  pg_temp.aplicar(pg_temp.id('t5'), 'aprovado') = 'a_estornar/cancelado');

select pg_temp.verificar('a_estornar vira estornado',
  pg_temp.aplicar(pg_temp.id('t2'), 'estornado') = 'estornado/aguardando_pagamento');

select pg_temp.verificar('estorno de um pagamento aprovado cancela o pedido',
  pg_temp.aplicar(pg_temp.id('t1'), 'estornado') = 'estornado/cancelado');
select pg_temp.verificar('cancelado por pagamento',
  (select motivo_cancelamento = 'pagamento' from public.pedidos where id = pg_temp.id('p1')));

select pg_temp.verificar('aprovado e contestado',
  pg_temp.aplicar(pg_temp.id('t6'), 'aprovado') = 'aprovado/pago'
  and pg_temp.aplicar(pg_temp.id('t6'), 'contestado') = 'contestado/pago');
select pg_temp.verificar('contestacao ganha volta a aprovado',
  pg_temp.aplicar(pg_temp.id('t6'), 'aprovado') = 'aprovado/pago');

select pg_temp.verificar('aviso fora de ordem nao anda para tras',
  pg_temp.aplicar(pg_temp.id('t7'), 'aprovado') = 'aprovado/pago'
  and pg_temp.aplicar(pg_temp.id('t7'), 'pendente') = 'aprovado/pago'
  and pg_temp.aplicar(pg_temp.id('t7'), 'recusado') = 'aprovado/pago');

select pg_temp.verificar('recusado deixa o pedido aguardando',
  (select r.pagamento_status || '/' || r.pedido_status
   from privado.aplicar_pagamento(pg_temp.id('t8'), 'ORD8', 'PAY8', 'recusado', 'cc_rejected_other_reason', 2880,
     p_recusa => 'cc_rejected_other_reason') r) = 'recusado/aguardando_pagamento');
select pg_temp.verificar('a recusa fica registrada para a mensagem',
  (select recusa = 'cc_rejected_other_reason' from public.pagamentos where id = pg_temp.id('t8')));
select pg_temp.verificar('aprovado depois de recusado e incoerente e vira erro',
  pg_temp.aplicar(pg_temp.id('t8'), 'aprovado') like '%passagem_invalida%');

select pg_temp.verificar('cartao: so bandeira, ultimos 4 e parcelas',
  (select r.pagamento_status from privado.aplicar_pagamento(pg_temp.id('t9'), 'ORD9', 'PAY9', 'aprovado',
     'accredited', 2880, p_cartao_bandeira => 'visa', p_cartao_final => '4242', p_parcelas => 1) r) = 'aprovado');
select pg_temp.verificar('cartao gravado',
  (select cartao_bandeira = 'visa' and cartao_final = '4242' and parcelas = 1
   from public.pagamentos where id = pg_temp.id('t9')));
select pg_temp.verificar('numero de cartao inteiro e recusado',
  pg_temp.como('postgres', null, format(
    $$select * from privado.aplicar_pagamento(%L, 'ORD9', 'PAY9', 'aprovado', 'accredited', 2880,
      p_cartao_final => '4111111111111111')$$, pg_temp.id('t9'))) like '23514%');

select pg_temp.verificar('pix: codigo e validade gravados',
  (select r.pagamento_status from privado.aplicar_pagamento(pg_temp.id('t3'), 'ORD3', 'PAY3', 'pendente',
     'pending_waiting_transfer', 2880, p_pix_copia_e_cola => '00020126580014br.gov.bcb.pix0136abc',
     p_pix_qr_base64 => 'iVBORw0KGgo=', p_pix_expira_em => now() + interval '30 minutes') r) = 'pendente');
select pg_temp.verificar('pix gravado',
  (select pix_copia_e_cola like '00020126%' and pix_qr_base64 = 'iVBORw0KGgo=' and pix_expira_em is not null
   from public.pagamentos where id = pg_temp.id('t3')));

select pg_temp.verificar('ids do Mercado Pago guardados no privado',
  (select mp_pedido_id = 'ORD3' and mp_pagamento_id = 'PAY3' and detalhe_mp = 'pending_waiting_transfer'
   from privado.pagamentos_mp where pagamento_id = pg_temp.id('t3')));

select pg_temp.verificar('estado inventado e recusado',
  pg_temp.aplicar(pg_temp.id('t3'), 'pago') like '%status_invalido%');
select pg_temp.verificar('tentativa inventada e recusada',
  pg_temp.aplicar(gen_random_uuid(), 'aprovado') like '%pagamento_invalido%');

select pg_temp.verificar('cliente nao aplica pagamento',
  pg_temp.como('authenticated', pg_temp.id('a'), format(
    $$select * from privado.aplicar_pagamento(%L, 'X', 'Y', 'aprovado', 'accredited', 2880)$$,
    pg_temp.id('t3'))) like '42501%');
select pg_temp.verificar('a chave secreta aplica pagamento',
  pg_temp.como('service_role', null, format(
    $$select * from privado.aplicar_pagamento(%L, 'ORD3', 'PAY3', 'pendente', 'pending_waiting_transfer', 2880)$$,
    pg_temp.id('t3'))) = 'ok');

-- reconciliacao
insert into _v values ('p_velho', pg_temp.pedido_de_exemplo(pg_temp.id('a')));
-- criado_em nao muda depois; a tentativa antiga ja nasce com a data antiga
with velha as (
  insert into public.pagamentos (pedido_id, forma, valor_centavos, criado_em)
  values (pg_temp.id('p_velho'), 'pix', 2880, now() - interval '11 minutes') returning id
)
insert into _v select 't_velho', id from velha;
select pg_temp.verificar('pendente ha mais de 10 minutos entra na reconciliacao',
  exists (select 1 from privado.pagamentos_a_reconciliar() where pagamento_id = pg_temp.id('t_velho')));
select pg_temp.verificar('pendente recente nao entra',
  not exists (select 1 from privado.pagamentos_a_reconciliar() where pagamento_id = pg_temp.id('t3')));
select pg_temp.verificar('a_estornar entra',
  exists (select 1 from privado.pagamentos_a_reconciliar() where pagamento_id = pg_temp.id('t5') and status = 'a_estornar'));

-- avisos
create function pg_temp.aviso(p_evento text)
returns text
language sql
as $$
  select situacao from privado.registrar_evento_webhook('mercadopago', p_evento, 'order', 'ORD123');
$$;

select pg_temp.verificar('aviso novo', pg_temp.aviso('evt-1') = 'novo');
select pg_temp.verificar('aviso repetido antes de concluir', pg_temp.aviso('evt-1') = 'tratar_de_novo');
select privado.concluir_evento_webhook(
  (select id from privado.eventos_webhook where evento_id = 'evt-1'), E'falhou\nna API');
select pg_temp.verificar('aviso com erro continua em aberto', pg_temp.aviso('evt-1') = 'tratar_de_novo');
select pg_temp.verificar('o erro fica guardado em uma linha',
  (select erro = 'falhou na API' and processado_em is null from privado.eventos_webhook where evento_id = 'evt-1'));
select privado.concluir_evento_webhook((select id from privado.eventos_webhook where evento_id = 'evt-1'));
select pg_temp.verificar('aviso tratado nao e tratado de novo', pg_temp.aviso('evt-1') = 'ja_tratado');
select pg_temp.verificar('as tentativas sao contadas',
  (select tentativas = 4 and erro is null from privado.eventos_webhook where evento_id = 'evt-1'));
select pg_temp.verificar('identificador de aviso fora do formato e recusado',
  pg_temp.como('postgres', null, $$select pg_temp.aviso('evt; drop table x')$$) like '23514%');

-- limites
select pg_temp.verificar('limite: primeiro uso', privado.consumir_limite('teste:203.0.113.9', 2, 60));
select pg_temp.verificar('limite: segundo uso', privado.consumir_limite('teste:203.0.113.9', 2, 60));
select pg_temp.verificar('limite: terceiro uso passa do limite', not privado.consumir_limite('teste:203.0.113.9', 2, 60));
select pg_temp.verificar('limite: outra chave conta separado', privado.consumir_limite('teste:198.51.100.7', 2, 60));
select pg_temp.verificar('limite: a chave fica so como hash',
  not exists (select 1 from privado.limites where chave like '%203.0.113%'));
select pg_temp.verificar('limite: parametros invalidos recusados',
  pg_temp.como('postgres', null, $$select privado.consumir_limite('x', 0, 60)$$) like '%limite_invalido%');

-- entrega
select pg_temp.preparar(format($$update public.pedidos set status = 'em_preparo' where id = %L$$, pg_temp.id('p9')));
select pg_temp.verificar('Uber retirou: a caminho',
  privado.aplicar_entrega(pg_temp.id('p9'), 'del_123', 'pickup_complete', 'https://www.uber.com/track/del_123') = 'a_caminho');
select pg_temp.verificar('Uber entregou: entregue',
  privado.aplicar_entrega(pg_temp.id('p9'), 'del_123', 'delivered', null) = 'entregue');
select pg_temp.verificar('rastreio gravado no pedido',
  (select rastreio_url = 'https://www.uber.com/track/del_123' from public.pedidos where id = pg_temp.id('p9')));
select pg_temp.verificar('rastreio que nao e do Uber e recusado',
  pg_temp.como('postgres', null, format(
    $$select privado.aplicar_entrega(%L, 'del_123', 'delivered', 'javascript:alert(1)')$$, pg_temp.id('p9')))
  like '%rastreio_invalido%');

select * from pg_temp.relatorio();
rollback;
