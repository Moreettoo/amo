-- O Pix vive no minimo 30 minutos e o pedido expirava 60 minutos depois de
-- criado, mesmo com um Pix pendente ainda valido: quem pagasse no fim do
-- prazo recebia estorno. Agora o pedido espera o Pix acabar: nao expira
-- enquanto tiver tentativa pendente com pix_expira_em no futuro. Mesma
-- assinatura; create or replace mantem as permissoes (so o dono, pelo
-- pg_cron). Os pedidos sao travados antes das tentativas, na ordem de
-- aplicar_pagamento e iniciar_pagamento; o que estiver travado fica para a
-- passada seguinte (a cada 5 minutos). p_agora existe para os testes.
create or replace function privado.expirar_pedidos(p_agora timestamptz default now())
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_vencidos uuid[];
  v_quantos integer;
begin
  select coalesce(array_agg(v.id), '{}') into v_vencidos
  from (
    select p.id
    from public.pedidos p
    where p.status = 'aguardando_pagamento'
      and p.criado_em < p_agora - interval '60 minutes'
      and not exists (
        select 1 from public.pagamentos pg
        where pg.pedido_id = p.id
          and pg.status = 'pendente'
          and pg.pix_expira_em > p_agora)
    for update of p skip locked
  ) v;

  update public.pagamentos pg set status = 'expirado'
  where pg.status = 'pendente' and pg.pedido_id = any (v_vencidos);

  update public.pedidos p set status = 'cancelado', motivo_cancelamento = 'expirado'
  where p.id = any (v_vencidos) and p.status = 'aguardando_pagamento';
  get diagnostics v_quantos = row_count;
  return v_quantos;
end
$$;
