import { variavel } from '@/lib/dados/ambiente'
import { ErroDeRegra, registrarFalha } from '@/lib/dados/erros'
import { concluirEventoWebhook, registrarEventoWebhook } from '@/lib/dados/pagamentos'
import { conferirAssinatura } from '@/lib/mercadopago/assinatura'
import { lerPedidoMp } from '@/lib/mercadopago/cliente'
import { aplicarRespostaDoMp } from '@/lib/mercadopago/sincronizar'

const TIPOS = new Set(['order', 'topic_chargebacks_wh'])
const DATA_ID = /^[A-Za-z0-9_-]{1,64}$/
const REQUEST_ID = /^[A-Za-z0-9_.:-]{1,200}$/

const TS = /(?:^|[,\s])ts=(\d+)(?:$|[,\s])/

const vazio = (status: number) => new Response(null, { status })

/**
 * O aviso do Mercado Pago. O corpo nunca decide nada: so a URL (data.id, type)
 * e a assinatura contam, e o pedido e lido na API do Mercado Pago.
 */
export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const dataId = url.searchParams.get('data.id')
  const tipo = url.searchParams.get('type')
  const requestId = request.headers.get('x-request-id')

  let segredo: string
  try {
    segredo = variavel('MERCADOPAGO_WEBHOOK_SECRET')
  } catch {
    registrarFalha('mercadopago.aviso', { code: 'sem_segredo' })
    return vazio(500)
  }
  const assinado = conferirAssinatura({
    assinatura: request.headers.get('x-signature'),
    requestId,
    dataId,
    segredo,
    agora: Date.now(),
  })
  if (!assinado) return vazio(401)

  if (!tipo || !TIPOS.has(tipo)) return vazio(200)
  if (!dataId || !DATA_ID.test(dataId)) return vazio(200)

  let evento: number
  try {
    const eventoId = requestId && REQUEST_ID.test(requestId) ? requestId : `${dataId}:${request.headers.get('x-signature')?.match(TS)?.[1] ?? 'sem-ts'}`
    const r = await registrarEventoWebhook({ eventoId, tipo, recursoId: dataId })
    if (r.situacao === 'ja_tratado') return vazio(200)
    evento = r.evento
  } catch {
    registrarFalha('mercadopago.aviso', { code: 'registrar_falhou' })
    return vazio(500)
  }

  const concluir = async (erro: string | null) => {
    try {
      await concluirEventoWebhook(evento, erro)
    } catch {
      registrarFalha('mercadopago.aviso', { code: 'concluir_falhou' })
    }
  }

  try {
    const lido = await lerPedidoMp(dataId)
    if (!lido.ok) {
      // 404 e deterministico (ex.: o id de uma contestacao, que nao e pedido): reenviar daria 404 para sempre.
      if (lido.status === 404) {
        registrarFalha('mercadopago.aviso', { code: 'mp_404', status: 404 })
        await concluir('mp_404')
        return vazio(200)
      }
      await concluir(`mp_${lido.status}`)
      return vazio(500)
    }
    const { pedido } = lido
    if (!pedido.referencia) {
      await concluir(null)
      return vazio(200)
    }
    const aplicado = await aplicarRespostaDoMp(pedido.referencia, pedido)
    // Recusa e deterministica (traducao ou referencia): tentar de novo recusaria de novo.
    await concluir(aplicado ? null : 'aplicar_recusou')
    return vazio(200)
  } catch (erro) {
    // Um ErroDeRegra de aplicar_pagamento leva o codigo dele (curto e seguro) ao log e ao aviso.
    const codigo = erro instanceof ErroDeRegra ? erro.codigo : null
    registrarFalha('mercadopago.aviso', { code: codigo ?? 'aviso_falhou' })
    await concluir(codigo ?? 'aplicar_falhou')
    return vazio(500)
  }
}
