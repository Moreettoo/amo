-- A falha incerta na criacao (spec 8.2, passo 6): depois de um timeout (status
-- 0), 408, 429 ou 5xx, a Uber pode ja ter criado a corrida com a chave. Uma
-- a_cancelar que falha assim continua a_cancelar (a reconciliacao recupera o
-- id repetindo o POST com a mesma chave e cancela); so a falha definitiva a
-- leva a cancelada. O resto da funcao nao muda.

-- A criacao na Uber falhou: soma a tentativa e grava o motivo. a_cancelar
-- vira cancelada so com falha definitiva; com falha incerta continua
-- a_cancelar. Falha definitiva ou a quinta tentativa chamam a equipe; o resto
-- volta a a_criar. Corrida ja criada, cancelada ou com a equipe nao muda.
-- Devolve o estado da corrida.
create or replace function privado.marcar_corrida_falhou(p_pedido uuid, p_motivo text, p_definitiva boolean)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_entrega privado.entregas%rowtype;
  v_estado text;
begin
  if p_motivo is null or p_motivo !~ '^[a-z0-9_]{1,60}$' then
    raise exception using errcode = 'P0001', message = 'motivo_invalido';
  end if;

  select * into v_entrega from privado.entregas e where e.pedido_id = p_pedido for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'corrida_invalida';
  end if;
  if v_entrega.estado not in ('a_criar', 'criando', 'a_cancelar') then
    return v_entrega.estado;
  end if;

  v_estado := case
    when v_entrega.estado = 'a_cancelar' and coalesce(p_definitiva, false) then 'cancelada'
    when v_entrega.estado = 'a_cancelar' then 'a_cancelar'
    when coalesce(p_definitiva, false) or v_entrega.tentativas + 1 >= 5 then 'precisa_da_equipe'
    else 'a_criar' end;

  update privado.entregas e set
    estado = v_estado, tentativas = e.tentativas + 1, motivo = p_motivo, reservado_em = null, atualizado_em = now()
  where e.pedido_id = p_pedido;
  return v_estado;
end
$$;

grant execute on function privado.marcar_corrida_falhou(uuid, text, boolean) to service_role;
