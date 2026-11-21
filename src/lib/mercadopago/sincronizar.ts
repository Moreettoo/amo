import 'server-only'
import { aplicarPagamento } from '@/lib/dados/pagamentos'
import { registrarFalha } from '@/lib/dados/erros'
import { cancelarPedidoMp, estornarPedidoMp, lerPedidoMp, type PedidoMp } from './cliente'
import { traduzir } from './traducao'

export type Aplicado = { tentativa: string; pedido: string }

/**
 * Aplica o que o Mercado Pago disse e, se o banco deixou a tentativa a
 * estornar, estorna la. Traducao fora da tabela: registra e devolve null sem
 * aplicar. Erro do banco (aplicarPagamento) sobe a quem chamou.
 */
export async function aplicarRespostaDoMp(
  tentativa: string,
  pedido: PedidoMp,
  final?: string | null,
): Promise<Aplicado | null> {
  const t = traduzir(pedido)
  if (!t) {
    registrarFalha('mercadopago.sincronizar', { code: 'traducao_desconhecida' })
    return null
  }
  const pg = pedido.pagamento
  const aplicado = await aplicarPagamento({
    tentativa,
    mpPedidoId: pedido.id,
    mpPagamentoId: pg?.id ?? null,
    status: t.status,
    detalhe: t.detalhe,
    valorCentavos: pedido.valorCentavos ?? 0,
    bandeira: pg?.bandeira ?? null,
    parcelas: pg?.parcelas ?? null,
    pixCopiaECola: pg?.pix?.copiaECola ?? null,
    pixQrBase64: pg?.pix?.qrBase64 ?? null,
    pixExpiraEm: pg?.pix?.expiraEm ?? null,
    recusa: t.recusa,
    final: final ?? null,
  })
  if (aplicado.tentativa === 'a_estornar') return estornarNoMp(tentativa, pedido.id)
  return aplicado
}

/** Estorna no Mercado Pago; falha deixa a_estornar (a reconciliacao tenta de novo) e devolve null. */
export async function estornarNoMp(tentativa: string, mpPedidoId: string): Promise<Aplicado | null> {
  const r = await estornarPedidoMp(mpPedidoId, tentativa)
  if (r.ok) return aplicarRespostaDoMp(tentativa, r.pedido)
  if (r.status === 409 && r.codigo === 'order_already_refunded') {
    return aplicarPagamento({
      tentativa,
      mpPedidoId,
      mpPagamentoId: null,
      status: 'estornado',
      detalhe: 'refunded',
      valorCentavos: 0,
    })
  }
  registrarFalha('mercadopago.estornar', { code: r.codigo ?? undefined, status: r.status })
  return null
}

/** Le o pedido no Mercado Pago e aplica; falha do GET devolve null. */
export async function sincronizarTentativa(tentativa: string, mpPedidoId: string): Promise<Aplicado | null> {
  const r = await lerPedidoMp(mpPedidoId)
  if (!r.ok) {
    registrarFalha('mercadopago.ler', { code: r.codigo ?? undefined, status: r.status })
    return null
  }
  return aplicarRespostaDoMp(tentativa, r.pedido)
}

/** Cancela la o que terminou aqui; 409 cannot_cancel_order le o pedido (pode ter sido paga). */
export async function cancelarNoMp(tentativa: string, mpPedidoId: string): Promise<Aplicado | null> {
  const r = await cancelarPedidoMp(mpPedidoId, tentativa)
  if (r.ok) return aplicarRespostaDoMp(tentativa, r.pedido)
  if (r.status === 409 && r.codigo === 'order_already_canceled') {
    return aplicarPagamento({
      tentativa,
      mpPedidoId,
      mpPagamentoId: null,
      status: 'cancelado',
      detalhe: 'canceled',
      valorCentavos: 0,
    })
  }
  if (r.status === 409 && r.codigo === 'cannot_cancel_order') return sincronizarTentativa(tentativa, mpPedidoId)
  registrarFalha('mercadopago.cancelar', { code: r.codigo ?? undefined, status: r.status })
  return null
}
