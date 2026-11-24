import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelarPedidoMp,
  criarPedidoCartao,
  criarPedidoPix,
  estornarPedidoMp,
  itensParaOMp,
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
  it('recusa o que nao e inteiro seguro nao negativo', () => {
    for (const v of [NaN, -1, 1.5, Infinity, 2 ** 60]) expect(() => valorEmReais(v)).toThrow()
  })
})

describe('criarPedidoPix', () => {
  it('manda o corpo do contrato e le o pedido', async () => {
    fetchFalso.mockResolvedValue(resposta(201, pedidoPix()))
    const r = await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: 9280, email: 'maria@exemplo.com', itens: [] })

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
    const r = await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: 9280, email: 'a@b.co', itens: [] })
    expect(r.ok && r.pedido.pagamento?.pix).toBeNull()
    expect(r.ok && r.pedido.pagamento?.status).toBe('processing')
  })
})

describe('criarPedidoCartao', () => {
  it('manda o corpo do contrato, sem identification quando não há documento', async () => {
    fetchFalso.mockResolvedValue(resposta(201, pedidoCartao('processed', 'accredited')))
    const r = await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 9280, email: 'a@b.co', cartao: CARTAO, documento: null, itens: [], dispositivo: null })
    const init = fetchFalso.mock.calls[0][1]
    expect(fetchFalso.mock.calls[0][0]).toBe('https://api.mercadopago.com/v1/orders')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}`, 'X-Idempotency-Key': TENTATIVA, 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({
      type: 'online',
      processing_mode: 'automatic',
      total_amount: '92.80',
      external_reference: TENTATIVA,
      payer: { email: 'a@b.co' },
      transactions: {
        payments: [{ amount: '92.80', payment_method: { id: 'master', type: 'credit_card', token: CARTAO.token, installments: 1 } }],
      },
      config: { online: { transaction_security: { validation: 'on_fraud_risk', liability_shift: 'required' } } },
    })
    expect(r.ok && r.pedido.pagamento).toMatchObject({ bandeira: 'master', parcelas: 3 })
  })

  it('manda o CPF quando há documento', async () => {
    fetchFalso.mockResolvedValue(resposta(201, pedidoCartao('processed', 'accredited')))
    await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: { tipo: 'CPF', numero: '12345678909' }, itens: [], dispositivo: null })
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body).payer.identification).toEqual({ type: 'CPF', number: '12345678909' })
  })

  it('desafio 3DS dá a URL, só se for https do Mercado Pago', async () => {
    const com = (url: string) =>
      resposta(201, pedidoCartao('action_required', 'pending_challenge', { transaction_security: { url } }))
    const chamar = () => criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: null, itens: [], dispositivo: null })

    fetchFalso.mockResolvedValueOnce(com('https://www.mercadopago.com.br/3ds/x'))
    const boa = await chamar()
    expect(boa.ok && boa.pedido.pagamento?.desafioUrl).toBe('https://www.mercadopago.com.br/3ds/x')

    for (const ruim of ['http://www.mercadopago.com.br/3ds', 'https://evil.com/3ds', 'https://mercadopago.com.br.evil.com/x', 'https://user:senha@www.mercadopago.com.br/x', 'https://www.mercadopago.com.br:8443/x', 'nao e url']) {
      fetchFalso.mockResolvedValueOnce(com(ruim))
      const r = await chamar()
      expect(r.ok && r.pedido.pagamento?.desafioUrl).toBeNull()
    }
  })

  it('HTTP 402 com corpo de pedido failed dá ok', async () => {
    fetchFalso.mockResolvedValue(resposta(402, pedidoCartao('failed', 'insufficient_amount')))
    const r = await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: null, itens: [], dispositivo: null })
    expect(r.ok && r.pedido.pagamento?.detalhe).toBe('insufficient_amount')
  })

  it('HTTP 402 com o pedido dentro de data, como a API devolve (ensaio de 2026-11-23), dá ok com a recusa', async () => {
    const pedido = { ...pedidoCartao('failed', 'rejected_by_issuer'), status_detail: 'failed' }
    fetchFalso.mockResolvedValue(resposta(402, { errors: [{ code: 'failed', message: 'x', details: ['y'] }], data: pedido }))
    const r = await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: null, itens: [], dispositivo: null })
    expect(r.ok).toBe(true)
    expect(r.ok && r.pedido).toMatchObject({ id: 'ORD02', status: 'failed', detalhe: 'failed', referencia: TENTATIVA, valorCentavos: 9280 })
    expect(r.ok && r.pedido.pagamento).toMatchObject({ id: 'PAY02', status: 'failed', detalhe: 'rejected_by_issuer', bandeira: 'master' })
    expect(erro).not.toHaveBeenCalled()
  })

  it('data so vale no 402: um 201 com o pedido dentro de data nao vira pedido', async () => {
    fetchFalso.mockResolvedValue(resposta(201, { data: pedidoCartao('processed', 'accredited') }))
    const r = await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: null, itens: [], dispositivo: null })
    expect(r).toEqual({ ok: false, status: 201, codigo: null })
  })
})

describe('o Device ID do cartao', () => {
  const DISPOSITIVO = 'armor.abc123def456'

  it('o cartao com dispositivo manda X-meli-session-id; sem ele, nao; o Pix nunca', async () => {
    fetchFalso.mockImplementation(async () => resposta(201, pedidoCartao('processed', 'accredited')))
    await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: null, itens: [], dispositivo: DISPOSITIVO })
    await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: null, itens: [], dispositivo: null })
    await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', itens: [] })
    expect(fetchFalso.mock.calls[0][1].headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'X-Idempotency-Key': TENTATIVA,
      'Content-Type': 'application/json',
      'X-meli-session-id': DISPOSITIVO,
    })
    expect(fetchFalso.mock.calls[1][1].headers).not.toHaveProperty('X-meli-session-id')
    expect(fetchFalso.mock.calls[2][1].headers).not.toHaveProperty('X-meli-session-id')
  })

  it('o log nunca leva o dispositivo', async () => {
    fetchFalso.mockResolvedValue(resposta(400, { errors: [{ code: 'invalid_total_amount', message: DISPOSITIVO }] }))
    await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'a@b.co', cartao: CARTAO, documento: null, itens: [], dispositivo: DISPOSITIVO })
    expect(erro).toHaveBeenCalled()
    expect(JSON.stringify(erro.mock.calls)).not.toContain(DISPOSITIVO)
  })
})

describe('os itens do pedido', () => {
  const POTES = [{ nome: 'Granola', quantos: 2, precoCentavos: 2000 }]

  it('itensParaOMp poe a entrega como item, so com frete', () => {
    expect(itensParaOMp(POTES, 1810)).toEqual([
      { titulo: 'Granola', quantidade: 2, precoCentavos: 2000 },
      { titulo: 'Entrega', quantidade: 1, precoCentavos: 1810 },
    ])
    expect(itensParaOMp([{ nome: 'Granola', quantos: 1, precoCentavos: 2000 }], 0)).toEqual([{ titulo: 'Granola', quantidade: 1, precoCentavos: 2000 }])
  })

  it('o Pix e o cartao levam items quando somam o total', async () => {
    fetchFalso.mockImplementation(async () => resposta(201, pedidoPix()))
    const itens = itensParaOMp(POTES, 1810)
    await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: 5810, email: 'a@b.co', itens })
    await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 5810, email: 'a@b.co', cartao: CARTAO, documento: null, itens, dispositivo: null })
    const esperado = [
      { title: 'Granola', unit_price: '20.00', quantity: 2 },
      { title: 'Entrega', unit_price: '18.10', quantity: 1 },
    ]
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body).items).toEqual(esperado)
    expect(JSON.parse(fetchFalso.mock.calls[1][1].body).items).toEqual(esperado)
  })

  it('itens que nao somam o total: sem items, com o log itens_nao_somam, e o pedido sai', async () => {
    fetchFalso.mockResolvedValue(resposta(201, pedidoPix()))
    const r = await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: 5810, email: 'a@b.co', itens: itensParaOMp(POTES, 0) })
    expect(r.ok).toBe(true)
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body)).not.toHaveProperty('items')
    const tudo = JSON.stringify(erro.mock.calls)
    expect(tudo).toContain('mercadopago.itens')
    expect(tudo).toContain('itens_nao_somam')
  })

  it('itens vazios: sem items e sem log', async () => {
    fetchFalso.mockResolvedValue(resposta(201, pedidoPix()))
    await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: 9280, email: 'a@b.co', itens: [] })
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body)).not.toHaveProperty('items')
    expect(erro).not.toHaveBeenCalled()
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

  it('cancelar e estornar fazem POST sem corpo, com o cabecalho completo', async () => {
    fetchFalso.mockResolvedValue(resposta(200, pedidoPix()))
    await cancelarPedidoMp('ORD1', TENTATIVA)
    await estornarPedidoMp('ORD1', TENTATIVA)
    const [u1, i1] = fetchFalso.mock.calls[0]
    const [u2, i2] = fetchFalso.mock.calls[1]
    expect(u1).toBe('https://api.mercadopago.com/v1/orders/ORD1/cancel')
    expect(u2).toBe('https://api.mercadopago.com/v1/orders/ORD1/refund')
    for (const i of [i1, i2]) {
      expect(i.method).toBe('POST')
      expect(i.body).toBeUndefined()
    }
    expect(i1.headers).toEqual({ Authorization: `Bearer ${TOKEN}`, 'X-Idempotency-Key': `${TENTATIVA}-cancelar`, 'Content-Type': 'application/json' })
    expect(i2.headers).toEqual({ Authorization: `Bearer ${TOKEN}`, 'X-Idempotency-Key': `${TENTATIVA}-estornar`, 'Content-Type': 'application/json' })
  })

  it.each([
    ['cancelar', cancelarPedidoMp],
    ['estornar', estornarPedidoMp],
  ] as const)('%s: 500 idempotency_validation_failed reenvia uma vez com chave nova', async (nome, fazer) => {
    fetchFalso
      .mockResolvedValueOnce(resposta(500, { errors: [{ code: 'idempotency_validation_failed' }] }))
      .mockResolvedValueOnce(resposta(200, pedidoPix()))
    const r = await fazer('ORD1', TENTATIVA)
    expect(r.ok).toBe(true)
    expect(fetchFalso).toHaveBeenCalledTimes(2)
    expect(fetchFalso.mock.calls[0][1].headers['X-Idempotency-Key']).toBe(`${TENTATIVA}-${nome}`)
    expect(fetchFalso.mock.calls[1][1].headers['X-Idempotency-Key']).toBe(`${TENTATIVA}-${nome}-2`)
    expect(fetchFalso.mock.calls[1][0]).toBe(fetchFalso.mock.calls[0][0])
  })

  it('o reenvio e um so: o segundo 500 volta como falha', async () => {
    fetchFalso.mockImplementation(async () => resposta(500, { errors: [{ code: 'idempotency_validation_failed' }] }))
    expect(await estornarPedidoMp('ORD1', TENTATIVA)).toEqual({ ok: false, status: 500, codigo: 'idempotency_validation_failed' })
    expect(fetchFalso).toHaveBeenCalledTimes(2)
  })

  it('outro 500 e a criacao nao reenviam', async () => {
    fetchFalso.mockImplementation(async () => resposta(500, { errors: [{ code: 'internal_error' }] }))
    await cancelarPedidoMp('ORD1', TENTATIVA)
    expect(fetchFalso).toHaveBeenCalledTimes(1)
    fetchFalso.mockReset()
    fetchFalso.mockImplementation(async () => resposta(500, { errors: [{ code: 'idempotency_validation_failed' }] }))
    await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: 9280, email: 'a@b.co', itens: [] })
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })

  it('id fora do formato nao chama o fetch', async () => {
    for (const id of ['', 'ORD 1', 'ORD/../x', 'a'.repeat(65), 'ORD\ud800']) {
      expect(await lerPedidoMp(id)).toEqual({ ok: false, status: 0, codigo: null })
      expect(await cancelarPedidoMp(id, TENTATIVA)).toEqual({ ok: false, status: 0, codigo: null })
      expect(await estornarPedidoMp(id, TENTATIVA)).toEqual({ ok: false, status: 0, codigo: null })
    }
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('total invalido nao chama o fetch', async () => {
    for (const total of [NaN, -1, 1.5, Infinity]) {
      expect(await criarPedidoPix({ tentativa: TENTATIVA, totalCentavos: total, email: 'a@b.co', itens: [] })).toEqual({ ok: false, status: 0, codigo: null })
      expect(await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: total, email: 'a@b.co', cartao: CARTAO, documento: null, itens: [], dispositivo: null })).toEqual({ ok: false, status: 0, codigo: null })
    }
    expect(fetchFalso).not.toHaveBeenCalled()
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

  it.each([
    ['qr_code com <', { qr_code: 'abc<def' }],
    ['qr_code com controle', { qr_code: 'abc\u0007def' }],
    ['qr_code com mais de 1000', { qr_code: 'a'.repeat(1001) }],
    ['qr_code vazio', { qr_code: '' }],
    ['base64 com mais de 40000', { qr_code_base64: 'A'.repeat(40001) }],
    ['base64 com caractere invalido', { qr_code_base64: 'AB*CD' }],
  ])('%s deixa o pix nulo, com o outro campo valido', async (_nome, ruim) => {
    const corpo = pedidoPix({ payment_method: { id: 'pix', qr_code: QR, qr_code_base64: 'iVBORw0KGgo=', ...ruim } })
    fetchFalso.mockResolvedValue(resposta(200, corpo))
    const r = await lerPedidoMp('ORD1')
    expect(r.ok && r.pedido.pagamento?.pix).toBeNull()
  })

  it.each(['0', 'Nov 21 2026', '2026-11-21', '2026-11-21T10:00:00', '2026-13-45T10:00:00Z'])('data %s vira null', async (data) => {
    fetchFalso.mockResolvedValue(resposta(200, pedidoPix({ date_of_expiration: data })))
    const r = await lerPedidoMp('ORD1')
    expect(r.ok && r.pedido.pagamento?.pix?.expiraEm).toBeNull()
  })

  it('data ISO com deslocamento vale', async () => {
    fetchFalso.mockResolvedValue(resposta(200, pedidoPix({ date_of_expiration: '2025-11-27T11:56:55.983+00:00' })))
    const r = await lerPedidoMp('ORD1')
    expect(r.ok && r.pedido.pagamento?.pix?.expiraEm).toBe('2025-11-27T11:56:55.983Z')
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
    await criarPedidoCartao({ tentativa: TENTATIVA, totalCentavos: 100, email: 'maria@exemplo.com', cartao: CARTAO, documento: { tipo: 'CPF', numero: '12345678909' }, itens: [], dispositivo: null })
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
