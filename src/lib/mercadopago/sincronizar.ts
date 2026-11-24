import 'server-only'
import { aplicarPagamento } from '@/lib/dados/pagamentos'
import { registrarFalha } from '@/lib/dados/erros'
import { pedirCorridas } from '@/lib/uber/corridas'
import { cancelarPedidoMp, estornarPedidoMp, lerPedidoMp, type PedidoMp } from './cliente'
import { detalheDoMp, traduzir } from './traducao'

export type Aplicado = { tentativa: string; pedido: string }

/**
 * Aplica o que o Mercado Pago disse e, se o banco deixou a tentativa a
 * estornar, estorna la. Traducao fora da tabela, referencia de outra
 * tentativa ou aprovado sem valor legivel: registra e devolve null sem
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
  if (pedido.referencia !== null && pedido.referencia !== tentativa) {
    registrarFalha('mercadopago.sincronizar', { code: 'referencia_diferente' })
    return null
  }
  // Aprovado com valor ilegivel: o banco compararia 0 com o total e estornaria um pagamento certo, em silencio.
  if (t.status === 'aprovado' && pedido.valorCentavos === null) {
    registrarFalha('mercadopago.sincronizar', { code: 'valor_ilegivel' })
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
  if (aplicado.pedido === 'pago') pedirCorridas()
  if (aplicado.tentativa === 'a_estornar') return estornarNoMp(tentativa, pedido.id)
  return aplicado
}

/**
 * Guarda so os ids do pedido do Mercado Pago, com status pendente (que nao
 * muda o estado de nada): mesmo que o resto falhe, a reconciliacao e o
 * cancelamento acham o pedido la. Referencia de outra tentativa nao guarda.
 * Erro do banco sobe a quem chamou.
 */
export async function guardarIdsDoMp(tentativa: string, pedido: PedidoMp): Promise<void> {
  if (pedido.referencia !== null && pedido.referencia !== tentativa) return
  await aplicarPagamento({
    tentativa,
    mpPedidoId: pedido.id,
    mpPagamentoId: pedido.pagamento?.id ?? null,
    status: 'pendente',
    detalhe: detalheDoMp(pedido),
    valorCentavos: pedido.valorCentavos ?? 0,
  })
}

/** Estorna no Mercado Pago (o cliente ja registra as falhas das chamadas); falha deixa a_estornar (a reconciliacao tenta de novo) e devolve null. */
export async function estornarNoMp(tentativa: string, mpPedidoId: string): Promise<Aplicado | null> {
  const r = await estornarPedidoMp(mpPedidoId, tentativa)
  if (r.ok) {
    // So aplica o que volta estornado: um 2xx que ainda le aprovado/pendente nunca reabre o estorno.
    const t = traduzir(r.pedido)
    const referenciaOk = r.pedido.referencia === null || r.pedido.referencia === tentativa
    if (t?.status !== 'estornado' || !referenciaOk) {
      registrarFalha('mercadopago.estornar', { code: 'resposta_nao_estornada' })
      return null
    }
    return aplicarPagamento({
      tentativa,
      mpPedidoId: r.pedido.id,
      mpPagamentoId: r.pedido.pagamento?.id ?? null,
      status: 'estornado',
      detalhe: t.detalhe,
      valorCentavos: r.pedido.valorCentavos ?? 0,
    })
  }
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
  return null
}

/** Le o pedido no Mercado Pago e aplica; falha do GET devolve null. */
export async function sincronizarTentativa(tentativa: string, mpPedidoId: string): Promise<Aplicado | null> {
  const r = await lerPedidoMp(mpPedidoId)
  if (!r.ok) return null
  return aplicarRespostaDoMp(tentativa, r.pedido)
}

/**
 * Cancela la o que terminou aqui. 409 cannot_cancel_order (ela andou, pode ter
 * sido paga) ou outra falha le o pedido e aplica o que ele diz: sem isso, o
 * status_mp ficaria pendente e a tentativa, na lista a cancelar para sempre.
 */
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
  return sincronizarTentativa(tentativa, mpPedidoId)
}
