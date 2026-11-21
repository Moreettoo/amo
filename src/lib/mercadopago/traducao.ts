import 'server-only'
import type { PedidoMp } from './cliente'

/** Os estados que aplicar_pagamento aceita. */
export type EstadoDaTentativa = 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'expirado' | 'estornado' | 'contestado'

type Traducao = { status: EstadoDaTentativa; detalhe: string; recusa: string | null }

const ESPERA_ACAO = new Set(['waiting_transfer', 'waiting_payment', 'pending_challenge', 'waiting_capture', 'waiting_retry'])
const ESPERA_PROCESSO = new Set(['in_process', 'pending_review_manual', 'in_review'])

/**
 * Traduz o estado do Mercado Pago (contrato, secao 2) para os do banco. Le o
 * pagamento e, sem ele, o pedido. Fora da tabela, devolve null: o servidor nao
 * aplica nada e registra a falha.
 */
export function traduzir(p: PedidoMp): Traducao | null {
  const status = p.pagamento ? p.pagamento.status : p.status
  const detalhe = p.pagamento ? p.pagamento.detalhe : p.detalhe
  const ok = (s: EstadoDaTentativa, recusa: string | null = null): Traducao => ({ status: s, detalhe, recusa })

  switch (status) {
    case 'processed':
      if (detalhe === 'accredited' || detalhe === 'partially_refunded') return ok('aprovado')
      if (detalhe === 'refunded') return ok('estornado')
      return null
    case 'created':
    case 'in_review':
      return ok('pendente')
    case 'action_required':
      return ESPERA_ACAO.has(detalhe) ? ok('pendente') : null
    case 'processing':
      return ESPERA_PROCESSO.has(detalhe) ? ok('pendente') : null
    case 'failed':
      return detalhe === 'expired' ? ok('expirado') : ok('recusado', detalhe)
    case 'canceled':
      if (detalhe === 'canceled' || detalhe === 'canceled_transaction') return ok('cancelado')
      if (detalhe === 'expired') return ok('expirado')
      return null
    case 'expired':
      return ok('expirado')
    case 'refunded':
      return detalhe === 'refunded' ? ok('estornado') : null
    case 'charged_back':
      return ok('contestado')
    default:
      return null
  }
}
