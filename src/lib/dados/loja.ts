import 'server-only'
import { falhaDoBanco } from '@/lib/dados/erros'
import { criarClienteDoVisitante } from '@/lib/dados/publico'
import { hojeEmSaoPaulo, type Loja } from '@/lib/loja'

/**
 * Le o horario, a pausa e as datas fechadas (de hoje em diante) da loja, sem cache. Sem a linha da loja, pausada:
 * fecha na duvida, como o banco.
 */
export async function lerLoja(): Promise<Loja> {
  const banco = criarClienteDoVisitante()
  const [h, l, f] = await Promise.all([
    banco.from('horarios').select('dia_da_semana, abre, fecha').order('dia_da_semana'),
    banco.from('loja').select('vendas_pausadas'),
    banco.from('dias_fechados').select('data').gte('data', hojeEmSaoPaulo(new Date())).order('data'),
  ])
  if (h.error) throw falhaDoBanco('loja', h.error, h.status)
  if (l.error) throw falhaDoBanco('loja', l.error, l.status)
  if (f.error) throw falhaDoBanco('loja', f.error, f.status)
  return {
    horarios: h.data.map((x) => ({ dia: x.dia_da_semana, abre: x.abre, fecha: x.fecha })),
    pausada: l.data[0]?.vendas_pausadas ?? true,
    diasFechados: f.data.map((x) => x.data),
  }
}
