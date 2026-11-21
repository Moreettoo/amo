import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelarPedidoMp,
  criarPedidoCartao,
  criarPedidoPix,
  estornarPedidoMp,
  lerPedidoMp,
  valorEmReais,
} from '@/lib/mercadopago/cliente'

const TENTATIVA = '0b9d1c0e-5a1f-4d2e-8a53-6f3f6c1d2a11'
const TOKEN = 'APP_USR-teste'
const QR = '00020126580014br.gov.bcb.pix0136segredo-do-qr'

function resposta(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
}

function pedidoPix(extra: Record<string, unknown> = {}) {
  return {
    id: 'ORD01',
    status: 'action_required',
    status_detail: 'waiting_transfer',
    external_reference: TENTATIVA,
    total_amount: '92.80',
    transactions: {
      payments: [
        {
          id: 'PAY01',
          status: 'action_required',
          status_detail: 'waiting_transfer',
          date_of_expiration: '2026-11-21T15:30:00.000-03:00',
          payment_method: { id: 'pix', type: 'bank_transfer', qr_code: QR, qr_code_base64: 'iVBORw0KGgo=', ticket_url: 'https://x' },
          ...extra,
        },
      ],
    },
  }
}

function pedidoCartao(status: string, detalhe: string, metodo: Record<string, unknown> = {}) {
  return {
    id: 'ORD02',
    status,
    status_detail: detalhe,
    external_reference: TENTATIVA,
    total_amount: '92.80',
    transactions: {
      payments: [{ id: 'PAY02', status, status_detail: detalhe, payment_method: { id: 'master', type: 'credit_card', installments: 3, ...metodo } }],
    },
  }
}

const CARTAO = { token: 'a'.repeat(32), bandeira: 'master', tipo: 'credit_card' as const, parcelas: 1 }

let fetchFalso: ReturnType<typeof vi.fn>
let erro: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', TOKEN)
  fetchFalso = vi.fn()
  vi.stubGlobal('fetch', fetchFalso)
  erro = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('valorEmReais', () => {
  it('escreve duas casas', () => {
    expect(valorEmReais(9280)).toBe('92.80')
    expect(valorEmReais(5)).toBe('0.05')
  })
})

describe('criarPedidoPix', () => {
  it('manda o corpo do contrato e le o pedido', async () => {
    fetchFalso.mockResolvedValue(resposta(201, pedidoPix()))
    const r = await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: 9280, email: 'maria@exemplo.com' })

    const [url, init] = fetchFalso.mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/v1/orders')
    expect(init.method).toBe('POST')
    expect(init.cache).toBe('no-store')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'X-Idempotency-Key': TENTATIVA,
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(init.body)).toEqual({
      type: 'online',
      processing_mode: 'automatic',
      total_amount: '92.80',
      external_reference: TENTATIVA,
      payer: { email: 'maria@exemplo.com' },
      transactions: {
        payments: [{ amount: '92.80', payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }],
      },
    })

    expect(r).toEqual({
      ok: true,
      pedido: {
        id: 'ORD01',
        status: 'action_required',
        detalhe: 'waiting_transfer',
        referencia: TENTATIVA,
        valorCentavos: 9280,
        pagamento: {
          id: 'PAY01',
          status: 'action_required',
          detalhe: 'waiting_transfer',
          bandeira: 'pix',
          parcelas: null,
          pix: { copiaECola: QR, qrBase64: 'iVBORw0KGgo=', expiraEm: '2026-11-21T18:30:00.000Z' },
          desafioUrl: null,
        },
      },
    })
  })

  it('processing sem QR dá pix null', async () => {
    const corpo = pedidoPix({ status: 'processing', status_detail: 'in_process', payment_method: { id: 'pix' } })
    fetchFalso.mockResolvedValue(resposta(201, corpo))
    const r = await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: 9280, email: 'a@b.co' })
    expect(r.ok && r.pedido.pagamento?.pix).toBeNull()
    expect(r.ok && r.pedido.pagamento?.status).toBe('processing')
  })
})

describe('criarPedidoCartao', () => {
  it('manda o corpo do contrato, sem identification quando não há documento', async () => {
    fetchFalso.mockResolvedValue(resposta(201, pedidoCartao('processed', 'accredited')))
    const r = await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 9280, email: 'a@b.co', cartao: CARTAO, documento: null })
    const corpo = JSON.parse(fetchFalso.mock.calls[0][1].body)
    expect(corpo.payer).toEqual({ email: 'a@b.co' })
    expect(corpo.total_amount).toBe('92.80')
    expect(corpo.transactions.payments[0]).toEqual({
      amount: '92.80',
      payment_method: { id: 'master', type: 'credit_card', token: CARTAO.token, installments: 1 },
    })
    expect(corpo.config).toEqual({ online: { transaction_security: { validation: 'on_fraud_risk', liability_shift: 'required' } } })
    expect(r.ok && r.pedido.pagamento).toMatchObject({ bandeira: 'master', parcelas: 3 })
  })

  it('manda o CPF quando há documento', async () => {
    fetchFalso.mockResolvedValue(resposta(201, pedidoCartao('processed', 'accredited')))
    await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: { tipo: 'CPF', numero: '12345678909' } })
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body).payer.identification).toEqual({ type: 'CPF', number: '12345678909' })
  })

  it('desafio 3DS dá a URL, só se for https do Mercado Pago', async () => {
    const com = (url: string) =>
      resposta(201, pedidoCartao('action_required', 'pending_challenge', { transaction_security: { url } }))
    const chamar = () => criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: null })

    fetchFalso.mockResolvedValueOnce(com('https://www.mercadopago.com.br/3ds/x'))
    const boa = await chamar()
    expect(boa.ok && boa.pedido.pagamento?.desafioUrl).toBe('https://www.mercadopago.com.br/3ds/x')

    for (const ruim of ['http://www.mercadopago.com.br/3ds', 'https://evil.com/3ds', 'https://mercadopago.com.br.evil.com/x', 'nao e url']) {
      fetchFalso.mockResolvedValueOnce(com(ruim))
      const r = await chamar()
      expect(r.ok && r.pedido.pagamento?.desafioUrl).toBeNull()
    }
  })

  it('HTTP 402 com corpo de pedido failed dá ok', async () => {
    fetchFalso.mockResolvedValue(resposta(402, pedidoCartao('failed', 'insufficient_amount')))
    const r = await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: null })
    expect(r.ok && r.pedido.pagamento?.detalhe).toBe('insufficient_amount')
  })
})

describe('ler, cancelar e estornar', () => {
  it('lerPedidoMp faz GET sem chave de idempotência', async () => {
    fetchFalso.mockResolvedValue(resposta(200, pedidoPix()))
    await lerPedidoMp('ORD1')
    const [url, init] = fetchFalso.mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/v1/orders/ORD1')
    expect(init.method).toBe('GET')
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}` })
    expect(init.body).toBeUndefined()
  })

  it('404 com código vira falha com o código', async () => {
    fetchFalso.mockResolvedValue(resposta(404, { errors: [{ code: 'order_not_found', message: 'texto cru' }] }))
    expect(await lerPedidoMp('ORD1')).toEqual({ ok: false, status: 404, codigo: 'order_not_found' })
  })

  it('código fora do formato vira null', async () => {
    fetchFalso.mockResolvedValue(resposta(400, { code: 'Tem Espaco' }))
    expect(await lerPedidoMp('ORD1')).toEqual({ ok: false, status: 400, codigo: null })
  })

  it('cancelar e estornar fazem POST sem corpo, com a chave própria', async () => {
    fetchFalso.mockResolvedValue(resposta(200, pedidoPix()))
    await cancelarPedidoMp('ORD1', TENTATIVA)
    await estornarPedidoMp('ORD1', TENTATIVA)
    const [u1, i1] = fetchFalso.mock.calls[0]
    const [u2, i2] = fetchFalso.mock.calls[1]
    expect(u1).toBe('https://api.mercadopago.com/v1/orders/ORD1/cancel')
    expect(u2).toBe('https://api.mercadopago.com/v1/orders/ORD1/refund')
    expect(i1.method).toBe('POST')
    expect(i1.body).toBeUndefined()
    expect(i1.headers['X-Idempotency-Key']).toBe(`${TENTATIVA}-cancelar`)
    expect(i2.headers['X-Idempotency-Key']).toBe(`${TENTATIVA}-estornar`)
  })
})

describe('falhas de rede', () => {
  it('fetch que rejeita dá status 0, sem lançar', async () => {
    fetchFalso.mockRejectedValue(new Error('rede'))
    expect(await lerPedidoMp('ORD1')).toEqual({ ok: false, status: 0, codigo: null })
  })

  it('fetch que passa de 6 s dá status 0', async () => {
    vi.useFakeTimers()
    fetchFalso.mockReturnValue(new Promise(() => {}))
    const r = lerPedidoMp('ORD1')
    await vi.advanceTimersByTimeAsync(6001)
    expect(await r).toEqual({ ok: false, status: 0, codigo: null })
  })

  it('corpo que não é JSON não vira pedido', async () => {
    fetchFalso.mockResolvedValue(new Response('<html>', { status: 200 }))
    expect(await lerPedidoMp('ORD1')).toEqual({ ok: false, status: 200, codigo: null })
  })
})

describe('resposta hostil', () => {
  it('cada campo ruim vira null', async () => {
    const corpo = pedidoPix({
      id: 'PAY 01',
      payment_method: { id: 'MASTER!', qr_code: '<script>x</script>', qr_code_base64: 'A'.repeat(50000), installments: 40 },
    })
    corpo.external_reference = 'nao-e-uuid'
    corpo.total_amount = '1e3'
    fetchFalso.mockResolvedValue(resposta(200, corpo))
    const r = await lerPedidoMp('ORD1')
    expect(r.ok && r.pedido.referencia).toBeNull()
    expect(r.ok && r.pedido.valorCentavos).toBeNull()
    expect(r.ok && r.pedido.pagamento).toMatchObject({ id: null, bandeira: null, parcelas: null, pix: null })
  })

  it('pedido sem id ou sem status válidos não é aceito', async () => {
    fetchFalso.mockResolvedValueOnce(resposta(200, { ...pedidoPix(), id: 'ORD 1' }))
    expect((await lerPedidoMp('ORD1')).ok).toBe(false)
    fetchFalso.mockResolvedValueOnce(resposta(200, { ...pedidoPix(), status: 'Action Required' }))
    expect((await lerPedidoMp('ORD1')).ok).toBe(false)
  })

  it('o valor vira centavos sem ponto flutuante', async () => {
    for (const [texto, centavos] of [['0.29', 29], ['19.9', 1990], ['100', 10000], ['1.15', 115]] as const) {
      fetchFalso.mockResolvedValueOnce(resposta(200, { ...pedidoPix(), total_amount: texto }))
      const r = await lerPedidoMp('ORD1')
      expect(r.ok && r.pedido.valorCentavos).toBe(centavos)
    }
  })
})

describe('log', () => {
  it('nunca leva o token, o corpo nem o QR', async () => {
    fetchFalso.mockResolvedValueOnce(resposta(400, { errors: [{ code: 'invalid_total_amount', message: `${QR} ${TOKEN}` }] }))
    await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'maria@exemplo.com', cartao: CARTAO, documento: { tipo: 'CPF', numero: '12345678909' } })
    fetchFalso.mockRejectedValueOnce(new Error(`${TOKEN} ${QR}`))
    await lerPedidoMp('ORD1')
    expect(erro).toHaveBeenCalled()
    const tudo = JSON.stringify(erro.mock.calls)
    for (const segredo of [TOKEN, QR, CARTAO.token, '12345678909', 'maria@exemplo.com', 'texto cru']) {
      expect(tudo).not.toContain(segredo)
    }
    expect(tudo).toContain('mercadopago.criar_cartao')
    expect(tudo).toContain('invalid_total_amount')
  })
})
