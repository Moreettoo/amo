import { variavel } from '@/lib/dados/ambiente'
import { registrarFalha } from '@/lib/dados/erros'
import { concluirEventoWebhook, registrarEventoWebhook } from '@/lib/dados/pagamentos'
import { conferirAssinaturaUber } from '@/lib/uber/assinatura'
import { conferirCorrida } from '@/lib/uber/corridas'

const ID = /^[A-Za-z0-9_.:-]{1,100}$/
/** O aviso da Uber tem poucos KB; acima disto, 413 antes do HMAC. */
const LIMITE_DO_CORPO = 64 * 1024

const vazio = (status: number) => new Response(null, { status })

/**
 * O aviso da Uber (spec 8.3). O corpo nunca decide nada: so o id da entrega
 * conta, e o estado e lido na API da Uber. A Uber tenta so 3 vezes; a
 * reconciliacao cobre o resto. O log leva so codigos fixos.
 */
export async function POST(request: Request): Promise<Response> {
  if (Number(request.headers.get('content-length')) > LIMITE_DO_CORPO) return vazio(413)
  const corpo = await request.text()
  if (Buffer.byteLength(corpo, 'utf8') > LIMITE_DO_CORPO) return vazio(413)

  let segredo: string
  try {
    segredo = variavel('UBER_DIRECT_WEBHOOK_SECRET')
  } catch {
    registrarFalha('uber.aviso', { code: 'sem_segredo' })
    return vazio(500)
  }
  const assinatura = request.headers.get('x-uber-signature') ?? request.headers.get('x-postmates-signature')
  if (!conferirAssinaturaUber(corpo, assinatura, segredo)) return vazio(401)

  let dados: unknown
  try {
    dados = JSON.parse(corpo)
  } catch {
    return vazio(400)
  }
  if (typeof dados !== 'object' || dados === null) return vazio(400)
  const { kind, id, delivery_id: entrega, status } = dados as Record<string, unknown>

  if (kind !== 'event.delivery_status') return vazio(200)
  if (typeof id !== 'string' || !ID.test(id)) return vazio(200)
  if (typeof entrega !== 'string' || !ID.test(entrega)) return vazio(200)

  let evento: number
  try {
    const r = await registrarEventoWebhook({ origem: 'uber', eventoId: id, tipo: kind, recursoId: entrega })
    if (r.situacao === 'ja_tratado') return vazio(200)
    evento = r.evento
  } catch {
    registrarFalha('uber.aviso', { code: 'registrar_falhou' })
    return vazio(500)
  }

  const concluir = async (erro: string | null) => {
    try {
      await concluirEventoWebhook(evento, erro)
    } catch {
      registrarFalha('uber.aviso', { code: 'concluir_falhou' })
    }
  }

  try {
    if (!(await conferirCorrida(entrega))) {
      const estado = typeof status === 'string' && /^[a-z_]{1,30}$/.test(status) ? status : 'sem_estado'
      await concluir(`uber_${estado}`)
      return vazio(500)
    }
    await concluir(null)
    return vazio(200)
  } catch {
    registrarFalha('uber.aviso', { code: 'aviso_falhou' })
    await concluir('aviso_falhou')
    return vazio(500)
  }
}
