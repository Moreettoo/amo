-- Cancelamento incerto: uma a_cancelar sem id (a criacao na Uber deu timeout,
-- 408, 429 ou 5xx) pode ter virado corrida na Uber. Nada a resolve sozinho,
-- entao depois de 10 minutos a equipe confere no painel da Uber pelo numero
-- do pedido. Devolve quantas corridas escalou.
create function privado.escalar_cancelamentos_incertos()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_quantas integer;
begin
  update privado.entregas e
  set estado = 'precisa_da_equipe', motivo = 'cancelamento_incerto', atualizado_em = now()
  where e.estado = 'a_cancelar'
    and e.uber_entrega_id is null
    and coalesce(e.reservado_em, e.criado_em) < now() - interval '10 minutes';
  get diagnostics v_quantas = row_count;
  return v_quantas;
end;
$$;

revoke all on function privado.escalar_cancelamentos_incertos() from public, anon, authenticated;
grant execute on function privado.escalar_cancelamentos_incertos() to service_role;
