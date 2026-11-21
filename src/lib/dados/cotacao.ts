import 'server-only'
import { criarClienteAdmin } from '@/lib/auth/admin'
import { falhaDoBanco } from '@/lib/dados/erros'
import type { EnderecoDaCotacao } from '@/lib/fechamento/tipos'

/** Quanto tempo o valor da entrega vale. */
export const VALIDADE_DA_COTACAO_MS = 15 * 60 * 1000

/** A conta de exemplo: CEP de 0 entrega, o valor e o tempo crescem com a distancia inventada. */
export function cotarDeExemplo(cep: string): { valorCentavos: number; minutos: number } | null {
  if (!cep.startsWith('0')) return null
  const distancia = Number(cep.slice(1, 4)) % 17
  return { valorCentavos: 790 + distancia * 45, minutos: 30 + distancia * 2 }
}

/** Guarda a cotacao pela privado.registrar_cotacao e devolve o id dela. */
export async function registrarCotacao(
  c: { usuarioId: string | null; valorCentavos: number; minutos: number } & EnderecoDaCotacao,
): Promise<string> {
  const { data, error, status } = await criarClienteAdmin()
    .schema('privado' as never)
    .rpc(
      'registrar_cotacao' as never,
      {
        p_user_id: c.usuarioId,
        p_cep: c.cep,
        p_logradouro: c.logradouro,
        p_numero: c.numero,
        p_complemento: c.complemento,
        p_bairro: c.bairro,
        p_cidade: c.cidade,
        p_uf: c.uf,
        p_valor_centavos: c.valorCentavos,
        p_minutos: c.minutos,
        p_origem: 'exemplo',
        p_uber_cotacao_id: null,
      } as never,
    )
  if (error) throw falhaDoBanco('registrar_cotacao', error as { code?: string }, status)
  if (typeof data !== 'string') throw falhaDoBanco('registrar_cotacao', null, status)
  return data
}
