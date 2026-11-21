import 'server-only'
import { falhaDoBanco } from '@/lib/dados/erros'
import { criarClienteDoVisitante } from '@/lib/dados/publico'
import type { Horario } from '@/lib/loja'

/**
 * Le o horario e a pausa da loja, sem cache. Sem a linha da loja, pausada:
 * fecha na duvida, como o banco.
 */
export async function lerLoja(): Promise<{ horarios: Horario[]; pausada: boolean }> {
  const banco = criarClienteDoVisitante()
  const [h, l] = await Promise.all([
    banco.from('horarios').select('dia_da_semana, abre, fecha').order('dia_da_semana'),
    banco.from('loja').select('vendas_pausadas'),
  ])
  if (h.error) throw falhaDoBanco('loja', h.error, h.status)
  if (l.error) throw falhaDoBanco('loja', l.error, l.status)
  return {
    horarios: h.data.map((x) => ({ dia: x.dia_da_semana, abre: x.abre, fecha: x.fecha })),
    pausada: l.data[0]?.vendas_pausadas ?? true,
  }
}
