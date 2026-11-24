import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PedidoMp } from '@/lib/mercadopago/cliente'

const m = vi.hoisted(() => ({
  aplicarPagamento: vi.fn(),
  registrarFalha: vi.fn(),
  lerPedidoMp: vi.fn(),
  cancelarPedidoMp: vi.fn(),
  estornarPedidoMp: vi.fn(),
  after: vi.fn(),
}))
// A corrida sai depois da resposta (after); aqui so se ve que foi pedida.
vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  after: m.after,
}))
vi.mock('@/lib/dados/entregas', () => ({ reservarCorridas: vi.fn() }))
vi.mock('@/lib/uber/cliente', () => ({}))
vi.mock('@/lib/dados/loja', () => ({ lerLoja: vi.fn() }))
vi.mock('@/lib/dados/pagamentos', () => ({ aplicarPagamento: m.aplicarPagamento }))
vi.mock('@/lib/dados/erros', () => ({ registrarFalha: m.registrarFalha }))
vi.mock('@/lib/mercadopago/cliente', () => ({
  lerPedidoMp: m.lerPedidoMp,
  cancelarPedidoMp: m.cancelarPedidoMp,
  estornarPedidoMp: m.estornarPedidoMp,
}))

import { aplicarRespostaDoMp, cancelarNoMp, estornarNoMp, guardarIdsDoMp, sincronizarTentativa } from '@/lib/mercadopago/sincronizar'

function pedido(status: string, detalhe: string, extra: Partial<NonNullable<PedidoMp['pagamento']>> = {}): PedidoMp {
  return {
    id: 'ORD1',
    status: 'x',
    detalhe: 'x',
    referencia: null,
    valorCentavos: 9280,
    pagamento: { id: 'PAY1', status, detalhe, bandeira: null, parcelas: null, pix: null, desafioUrl: null, ...extra },
  }
}
const ok = (p: PedidoMp) => ({ ok: true, pedido: p })
const falha = (status: number, codigo: string | null) => ({ ok: false, status, codigo })
const banco = (tentativa: string, ped = 'pago') => ({ tentativa, pedido: ped })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('aplicarRespostaDoMp', () => {
  it('aprovado: aplica com o valor e devolve o que o banco disse', async () => {
    m.aplicarPagamento.mockResolvedValue(banco('aprovado'))
    const r = await aplicarRespostaDoMp('T1', pedido('processed', 'accredited'), 'final-1')
    expect(r).toEqual(banco('aprovado'))
    expect(m.aplicarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({
        tentativa: 'T1',
        mpPedidoId: 'ORD1',
        mpPagamentoId: 'PAY1',
        status: 'aprovado',
        valorCentavos: 9280,
        final: 'final-1',
      }),
    )
  })

  it('aprovado com valor ilegivel: nao aplica (nao estorna em silencio), registra valor_ilegivel e devolve null', async () => {
    const r = await aplicarRespostaDoMp('T1', { ...pedido('processed', 'accredited'), valorCentavos: null })
    expect(r).toBeNull()
    expect(m.aplicarPagamento).not.toHaveBeenCalled()
    expect(m.registrarFalha).toHaveBeenCalledWith('mercadopago.sincronizar', { code: 'valor_ilegivel' })
  })

  it('fora do aprovado o valor nao conta: sem ele, aplica 0', async () => {
    m.aplicarPagamento.mockResolvedValue(banco('cancelado', 'aguardando_pagamento'))
    await aplicarRespostaDoMp('T1', { ...pedido('canceled', 'canceled'), valorCentavos: null })
    expect(m.aplicarPagamento).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelado', valorCentavos: 0 }))
  })

  it('traducao null: nao aplica, registra a falha e devolve null', async () => {
    const r = await aplicarRespostaDoMp('T1', pedido('status_inventado', 'x'))
    expect(r).toBeNull()
    expect(m.aplicarPagamento).not.toHaveBeenCalled()
    expect(m.registrarFalha).toHaveBeenCalledWith('mercadopago.sincronizar', expect.anything())
  })

  it('Pix pendente com QR: repassa copia e cola, QR e validade', async () => {
    m.aplicarPagamento.mockResolvedValue(banco('pendente', 'aberto'))
    await aplicarRespostaDoMp(
      'T1',
      pedido('action_required', 'waiting_transfer', {
        pix: { copiaECola: '000201abc', qrBase64: 'QR==', expiraEm: '2026-11-21T12:00:00Z' },
      }),
    )
    expect(m.aplicarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pendente',
        pixCopiaECola: '000201abc',
        pixQrBase64: 'QR==',
        pixExpiraEm: '2026-11-21T12:00:00Z',
      }),
    )
  })

  it('banco responde a_estornar: estorna e aplica estornado', async () => {
    m.aplicarPagamento.mockResolvedValueOnce(banco('a_estornar')).mockResolvedValueOnce(banco('estornado', 'cancelado'))
    m.estornarPedidoMp.mockResolvedValue(ok(corpoDoEstorno))
    const r = await aplicarRespostaDoMp('T1', pedido('processed', 'accredited'))
    expect(m.estornarPedidoMp).toHaveBeenCalledWith('ORD1', 'T1')
    expect(m.aplicarPagamento).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'estornado' }))
    expect(r).toEqual(banco('estornado', 'cancelado'))
  })

  it('erro do banco sobe a quem chamou', async () => {
    m.aplicarPagamento.mockRejectedValue(new Error('banco'))
    await expect(aplicarRespostaDoMp('T1', pedido('processed', 'accredited'))).rejects.toThrow('banco')
    expect(m.after).not.toHaveBeenCalled()
  })

  it('o pedido indo a pago pede a corrida: after uma vez', async () => {
    m.aplicarPagamento.mockResolvedValue(banco('aprovado', 'pago'))
    const r = await aplicarRespostaDoMp('T1', pedido('processed', 'accredited'))
    expect(r).toEqual(banco('aprovado', 'pago'))
    expect(m.after).toHaveBeenCalledTimes(1)
    expect(m.after).toHaveBeenCalledWith(expect.any(Function))
  })

  it('aguardando_pagamento nao pede corrida', async () => {
    m.aplicarPagamento.mockResolvedValue(banco('pendente', 'aguardando_pagamento'))
    await aplicarRespostaDoMp('T1', pedido('action_required', 'waiting_transfer'))
    expect(m.after).not.toHaveBeenCalled()
  })

  it('after fora de uma requisicao: aplica e devolve o mesmo, sem lancar', async () => {
    m.after.mockImplementation(() => {
      throw new Error('fora da requisicao')
    })
    m.aplicarPagamento.mockResolvedValue(banco('aprovado', 'pago'))
    const r = await aplicarRespostaDoMp('T1', pedido('processed', 'accredited'))
    expect(r).toEqual(banco('aprovado', 'pago'))
    expect(m.registrarFalha).toHaveBeenCalledWith('uber.after', { code: 'fora_da_requisicao' })
  })
})

const corpoDoEstorno: PedidoMp = {
  id: 'ORD1',
  status: 'processed',
  detalhe: 'refunded',
  referencia: null,
  valorCentavos: null,
  pagamento: null,
}

describe('guardarIdsDoMp', () => {
  it('guarda os ids com status pendente e o detalhe do Mercado Pago, sem os dados da tela', async () => {
    m.aplicarPagamento.mockResolvedValue(banco('pendente', 'aguardando_pagamento'))
    await guardarIdsDoMp('T1', pedido('action_required', 'waiting_transfer'))
    expect(m.aplicarPagamento).toHaveBeenCalledTimes(1)
    expect(m.aplicarPagamento).toHaveBeenCalledWith({
      tentativa: 'T1',
      mpPedidoId: 'ORD1',
      mpPagamentoId: 'PAY1',
      status: 'pendente',
      detalhe: 'waiting_transfer',
      valorCentavos: 9280,
    })
  })

  it('detalhe vazio vira o status; sem pagamento, o do pedido; sem valor, 0', async () => {
    await guardarIdsDoMp('T1', pedido('status_inventado', ''))
    expect(m.aplicarPagamento).toHaveBeenLastCalledWith(expect.objectContaining({ detalhe: 'status_inventado' }))
    await guardarIdsDoMp('T1', { ...pedido('x', 'x'), pagamento: null, status: 'created', detalhe: '', valorCentavos: null })
    expect(m.aplicarPagamento).toHaveBeenLastCalledWith(
      expect.objectContaining({ mpPedidoId: 'ORD1', mpPagamentoId: null, detalhe: 'created', valorCentavos: 0 }),
    )
  })

  it('referencia de outra tentativa nao guarda', async () => {
    await guardarIdsDoMp('T1', { ...pedido('action_required', 'waiting_transfer'), referencia: 'T2' })
    expect(m.aplicarPagamento).not.toHaveBeenCalled()
  })

  it('erro do banco sobe a quem chamou', async () => {
    m.aplicarPagamento.mockRejectedValue(new Error('banco'))
    await expect(guardarIdsDoMp('T1', pedido('action_required', 'waiting_transfer'))).rejects.toThrow('banco')
  })
})

describe('referencia', () => {
  it('referencia diferente da tentativa nao aplica e registra', async () => {
    const r = await aplicarRespostaDoMp('T1', { ...pedido('processed', 'accredited'), referencia: 'OUTRA' })
    expect(r).toBeNull()
    expect(m.aplicarPagamento).not.toHaveBeenCalled()
    expect(m.registrarFalha).toHaveBeenCalled()
  })

  it('referencia igual aplica', async () => {
    m.aplicarPagamento.mockResolvedValue(banco('aprovado'))
    await aplicarRespostaDoMp('T1', { ...pedido('processed', 'accredited'), referencia: 'T1' })
    expect(m.aplicarPagamento).toHaveBeenCalled()
  })
})

describe('estornarNoMp, resposta 2xx', () => {
  it('corpo de estorno do contrato aplica estornado com valor 0 e sem pagamento', async () => {
    m.estornarPedidoMp.mockResolvedValue(ok(corpoDoEstorno))
    m.aplicarPagamento.mockResolvedValue(banco('estornado'))
    const r = await estornarNoMp('T1', 'ORD1')
    expect(m.aplicarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'estornado', valorCentavos: 0, mpPagamentoId: null, mpPedidoId: 'ORD1' }),
    )
    expect(r).toEqual(banco('estornado'))
  })

  it('2xx que ainda le aprovado nao aplica, nao estorna de novo e devolve null', async () => {
    m.estornarPedidoMp.mockResolvedValue(ok(pedido('processed', 'accredited')))
    expect(await estornarNoMp('T1', 'ORD1')).toBeNull()
    expect(m.aplicarPagamento).not.toHaveBeenCalled()
    expect(m.estornarPedidoMp).toHaveBeenCalledTimes(1)
    expect(m.registrarFalha).toHaveBeenCalledWith('mercadopago.estornar', expect.anything())
  })

  it('encadeado: banco a_estornar e estorno que falha devolve null', async () => {
    m.aplicarPagamento.mockResolvedValueOnce(banco('a_estornar'))
    m.estornarPedidoMp.mockResolvedValue(falha(0, null))
    expect(await aplicarRespostaDoMp('T1', pedido('processed', 'accredited'))).toBeNull()
    expect(m.aplicarPagamento).toHaveBeenCalledTimes(1)
  })
})

describe('estornarNoMp', () => {
  it('409 order_already_refunded aplica estornado com detalhe refunded', async () => {
    m.estornarPedidoMp.mockResolvedValue(falha(409, 'order_already_refunded'))
    m.aplicarPagamento.mockResolvedValue(banco('estornado'))
    const r = await estornarNoMp('T1', 'ORD1')
    expect(m.aplicarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({ tentativa: 'T1', mpPedidoId: 'ORD1', status: 'estornado', detalhe: 'refunded' }),
    )
    expect(r).toEqual(banco('estornado'))
  })

  it('falha (status 0): nao aplica, deixa a_estornar e devolve null', async () => {
    m.estornarPedidoMp.mockResolvedValue(falha(0, null))
    expect(await estornarNoMp('T1', 'ORD1')).toBeNull()
    expect(m.aplicarPagamento).not.toHaveBeenCalled()
  })
})

describe('sincronizarTentativa', () => {
  it('le e aplica', async () => {
    m.lerPedidoMp.mockResolvedValue(ok(pedido('processed', 'accredited')))
    m.aplicarPagamento.mockResolvedValue(banco('aprovado'))
    expect(await sincronizarTentativa('T1', 'ORD1')).toEqual(banco('aprovado'))
  })

  it('falha do GET devolve null', async () => {
    m.lerPedidoMp.mockResolvedValue(falha(500, null))
    expect(await sincronizarTentativa('T1', 'ORD1')).toBeNull()
    expect(m.aplicarPagamento).not.toHaveBeenCalled()
  })
})

describe('cancelarNoMp', () => {
  it('ok aplica cancelado', async () => {
    m.cancelarPedidoMp.mockResolvedValue(ok(pedido('canceled', 'canceled')))
    m.aplicarPagamento.mockResolvedValue(banco('cancelado', 'cancelado'))
    const r = await cancelarNoMp('T1', 'ORD1')
    expect(m.cancelarPedidoMp).toHaveBeenCalledWith('ORD1', 'T1')
    expect(m.aplicarPagamento).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelado' }))
    expect(r).toEqual(banco('cancelado', 'cancelado'))
  })

  it('409 order_already_canceled aplica cancelado com detalhe canceled', async () => {
    m.cancelarPedidoMp.mockResolvedValue(falha(409, 'order_already_canceled'))
    m.aplicarPagamento.mockResolvedValue(banco('cancelado'))
    await cancelarNoMp('T1', 'ORD1')
    expect(m.aplicarPagamento).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelado', detalhe: 'canceled' }))
  })

  it('409 cannot_cancel_order le o pedido e aplica o que ele diz', async () => {
    m.cancelarPedidoMp.mockResolvedValue(falha(409, 'cannot_cancel_order'))
    m.lerPedidoMp.mockResolvedValue(ok(pedido('processed', 'accredited')))
    m.aplicarPagamento.mockResolvedValue(banco('aprovado'))
    const r = await cancelarNoMp('T1', 'ORD1')
    expect(m.lerPedidoMp).toHaveBeenCalledWith('ORD1')
    expect(m.aplicarPagamento).toHaveBeenCalledWith(expect.objectContaining({ status: 'aprovado' }))
    expect(r).toEqual(banco('aprovado'))
  })

  it.each([
    ['sem resposta', 0, null],
    ['500', 500, null],
    ['400', 400, 'bad_request'],
    ['409 de outro codigo', 409, 'idempotency_key_already_used'],
  ])('outra falha (%s) le o pedido e aplica, para nao ficar pendente na lista para sempre', async (_, status, codigo) => {
    m.cancelarPedidoMp.mockResolvedValue(falha(status, codigo))
    m.lerPedidoMp.mockResolvedValue(ok(pedido('expired', 'expired')))
    m.aplicarPagamento.mockResolvedValue(banco('expirado', 'cancelado'))
    expect(await cancelarNoMp('T1', 'ORD1')).toEqual(banco('expirado', 'cancelado'))
    expect(m.lerPedidoMp).toHaveBeenCalledWith('ORD1')
    expect(m.aplicarPagamento).toHaveBeenCalledWith(expect.objectContaining({ tentativa: 'T1', status: 'expirado' }))
  })

  it('outra falha e o GET tambem falhando: null sem aplicar', async () => {
    m.cancelarPedidoMp.mockResolvedValue(falha(0, null))
    m.lerPedidoMp.mockResolvedValue(falha(0, null))
    expect(await cancelarNoMp('T1', 'ORD1')).toBeNull()
    expect(m.aplicarPagamento).not.toHaveBeenCalled()
  })
})
