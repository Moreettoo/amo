// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// o fetch "de verdade" que o gancho encontra ao entrar, e o log do ensaio calado
const real = vi.hoisted(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const f = vi.fn(async () => new Response('de verdade', { status: 200 }))
  globalThis.fetch = f as unknown as typeof fetch
  return f
})

import '../scripts/ensaio/mercadopago-pix-aprova.mjs'

const ORDERS = 'https://api.mercadopago.com/v1/orders'
const pagamento = (metodo: object) => ({ transactions: { payments: [{ amount: '10.00', ...metodo }] } })
const pix = () => ({
  type: 'online',
  total_amount: '10.00',
  external_reference: 'ref-1',
  payer: { email: 'ensaio@exemplo.com' },
  ...pagamento({ payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }),
})
const cartao = () => ({ ...pix(), ...pagamento({ payment_method: { id: 'master', type: 'credit_card', token: 't', installments: 1 } }) })
const init = (corpo: unknown): RequestInit => ({
  method: 'POST',
  headers: { Authorization: 'Bearer x', 'X-Idempotency-Key': 'chave-1', 'Content-Type': 'application/json' },
  body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
})
const enviado = (n = 0) => real.mock.calls[n] as unknown as [unknown, RequestInit | undefined]

beforeEach(() => {
  vi.stubEnv('MERCADOPAGO_AMBIENTE', 'teste')
  real.mockClear()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('o gancho do ensaio que faz o Pix de teste ser aprovado', () => {
  it('o Pix chega ao fetch de verdade com payer.first_name APRO, o resto do corpo e os mesmos cabecalhos', async () => {
    const i = init(pix())
    await fetch(ORDERS, i)
    const [url, saiu] = enviado()
    expect(url).toBe(ORDERS)
    expect(saiu?.method).toBe('POST')
    expect(saiu?.headers).toBe(i.headers)
    expect(JSON.parse(String(saiu?.body))).toEqual({ ...pix(), payer: { email: 'ensaio@exemplo.com', first_name: 'APRO' } })
  })

  it('o cartao, o GET, outros caminhos e outro endereco passam intactos', async () => {
    const casos: [string, RequestInit][] = [
      [ORDERS, init(cartao())],
      [`${ORDERS}/ORD1`, { method: 'GET' }],
      [`${ORDERS}/ORD1/cancel`, { method: 'POST' }],
      ['https://api.mercadopago.com/users/me', { method: 'GET' }],
      ['https://exemplo.com', init(pix())],
    ]
    for (const [url, i] of casos) {
      real.mockClear()
      await fetch(url, i)
      expect(enviado()[0]).toBe(url)
      expect(enviado()[1]).toBe(i)
    }
  })

  it.each([
    ['sem MERCADOPAGO_AMBIENTE', 'MERCADOPAGO_AMBIENTE', undefined],
    ['com MERCADOPAGO_AMBIENTE de producao', 'MERCADOPAGO_AMBIENTE', 'producao'],
    ['com NODE_ENV=production', 'NODE_ENV', 'production'],
  ])('fora do ensaio (%s), o Pix passa intacto', async (_, nome, valor) => {
    vi.stubEnv(nome, valor)
    const i = init(pix())
    await fetch(ORDERS, i)
    expect(enviado()[1]).toBe(i)
  })

  it('corpo que nao e JSON, ou um Request no lugar do endereco, passa intacto', async () => {
    const i = init('{nao e json')
    await fetch(ORDERS, i)
    expect(enviado()[1]).toBe(i)
    real.mockClear()
    const pedido = new Request(ORDERS, { method: 'POST', body: JSON.stringify(pix()) })
    await fetch(pedido)
    expect(enviado()[0]).toBe(pedido)
    expect(enviado()[1]).toBeUndefined()
  })
})
