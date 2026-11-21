import { describe, expect, it } from 'vitest'
import { traduzir } from '@/lib/mercadopago/traducao'
import type { PedidoMp } from '@/lib/mercadopago/cliente'

function pedido(status: string, detalhe: string, comPagamento = true): PedidoMp {
  return {
    id: 'ORD1',
    status: 'x',
    detalhe: 'x',
    referencia: null,
    valorCentavos: 100,
    pagamento: comPagamento
      ? { id: 'PAY1', status, detalhe, bandeira: null, parcelas: null, pix: null, desafioUrl: null }
      : null,
  }
}

const TABELA: Array<[string, string, string, string | null]> = [
  ['processed', 'accredited', 'aprovado', null],
  ['processed', 'partially_refunded', 'aprovado', null],
  ['created', 'created', 'pendente', null],
  ['action_required', 'waiting_transfer', 'pendente', null],
  ['action_required', 'waiting_payment', 'pendente', null],
  ['action_required', 'pending_challenge', 'pendente', null],
  ['action_required', 'waiting_capture', 'pendente', null],
  ['action_required', 'waiting_retry', 'pendente', null],
  ['processing', 'in_process', 'pendente', null],
  ['processing', 'pending_review_manual', 'pendente', null],
  ['processing', 'in_review', 'pendente', null],
  ['in_review', 'in_review', 'pendente', null],
  ['failed', 'insufficient_amount', 'recusado', 'insufficient_amount'],
  ['failed', 'high_risk', 'recusado', 'high_risk'],
  ['failed', 'cc_rejected_3ds_challenge', 'recusado', 'cc_rejected_3ds_challenge'],
  ['canceled', 'canceled', 'cancelado', null],
  ['canceled', 'canceled_transaction', 'cancelado', null],
  ['canceled', 'expired', 'expirado', null],
  ['failed', 'expired', 'expirado', null],
  ['expired', 'expired', 'expirado', null],
  ['refunded', 'refunded', 'estornado', null],
  ['processed', 'refunded', 'estornado', null],
  ['charged_back', 'in_process', 'contestado', null],
  ['charged_back', 'settled', 'contestado', null],
]

describe('traduzir', () => {
  it.each(TABELA)('%s + %s vira %s', (status, detalhe, esperado, recusa) => {
    expect(traduzir(pedido(status, detalhe))).toEqual({ status: esperado, detalhe, recusa })
  })

  it('sem pagamento, usa o status e o detalhe do pedido', () => {
    const p = { ...pedido('', '', false), status: 'action_required', detalhe: 'waiting_transfer' }
    expect(traduzir(p)).toEqual({ status: 'pendente', detalhe: 'waiting_transfer', recusa: null })
  })

  it('sem status_detail, o detalhe e o status e a recusa e null', () => {
    expect(traduzir(pedido('failed', ''))).toEqual({ status: 'recusado', detalhe: 'failed', recusa: null })
    expect(traduzir(pedido('charged_back', ''))).toEqual({ status: 'contestado', detalhe: 'charged_back', recusa: null })
    expect(traduzir(pedido('created', ''))).toEqual({ status: 'pendente', detalhe: 'created', recusa: null })
  })

  it('recusa com mais de 60 caracteres vira null', () => {
    const longo = 'a'.repeat(61)
    expect(traduzir(pedido('failed', longo))).toEqual({ status: 'recusado', detalhe: longo, recusa: null })
    expect(traduzir(pedido('failed', 'a'.repeat(60)))?.recusa).toBe('a'.repeat(60))
  })

  it('fora da tabela, devolve null', () => {
    expect(traduzir({ ...pedido('', '', false), status: 'novo_estado', detalhe: 'x' })).toBeNull()
    expect(traduzir(pedido('processed', 'outro'))).toBeNull()
    expect(traduzir(pedido('canceled', 'outro'))).toBeNull()
  })
})
