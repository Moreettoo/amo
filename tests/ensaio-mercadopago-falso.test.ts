// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// o fetch "de verdade" que o falso encontra ao entrar, e o log do ensaio calado
const real = vi.hoisted(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const f = vi.fn(async () => new Response('de verdade', { status: 200 }))
  globalThis.fetch = f as unknown as typeof fetch
  return f
})
vi.mock('@/lib/dados/erros', () => ({ registrarFalha: vi.fn() }))

import '../scripts/ensaio/mercadopago-falso.mjs'
import { cancelarPedidoMp, criarPedidoCartao, criarPedidoPix, estornarPedidoMp, lerPedidoMp } from '@/lib/mercadopago/cliente'
import { traduzir } from '@/lib/mercadopago/traducao'

const T0 = new Date('2026-11-21T15:00:00.000Z').getTime()
let n = 0
const tentativa = () => `0b9d1c0e-5a1f-4d2e-8a53-6f3f6c1d2a${String(++n).padStart(2, '0')}`

async function pixCriado(totalCentavos = 9280) {
  const r = await criarPedidoPix({ tentativa: tentativa(), totalCentavos, email: 'ensaio@exemplo.com', itens: [] })
  if (!r.ok) throw new Error(`criar falhou: ${r.status}`)
  return r.pedido
}

beforeEach(() => {
  vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-ensaio')
  vi.stubEnv('MERCADOPAGO_AMBIENTE', 'teste')
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(T0)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('o Mercado Pago falso do ensaio, lido pelo cliente de verdade', () => {
  it('o Pix nasce esperando a transferencia, com o QR de ensaio e o copia e cola', async () => {
    const pedido = await pixCriado()
    expect(pedido.id).toMatch(/^ORD/)
    expect(pedido.valorCentavos).toBe(9280)
    expect(pedido.pagamento?.pix?.copiaECola).toBe('00020126-ensaio')
    expect(pedido.pagamento?.pix?.qrBase64.startsWith('iVBORw0KGgo')).toBe(true) // um PNG
    expect(pedido.pagamento?.pix?.expiraEm).toBe(new Date(T0 + 30 * 60_000).toISOString())
    expect(traduzir(pedido)?.status).toBe('pendente')
  })

  it('o GET do mesmo pedido espera ate 20 s depois de criado e entao aprova, com o mesmo valor', async () => {
    const { id } = await pixCriado(4590)
    vi.setSystemTime(T0 + 19_999)
    const antes = await lerPedidoMp(id)
    expect(antes.ok && traduzir(antes.pedido)?.status).toBe('pendente')
    vi.setSystemTime(T0 + 20_000)
    const depois = await lerPedidoMp(id)
    expect(depois.ok && traduzir(depois.pedido)?.status).toBe('aprovado')
    expect(depois.ok && depois.pedido.valorCentavos).toBe(4590)
  })

  it('cancelar o Pix que espera: cancelado; de novo, 409 order_already_canceled; o pago, 409 cannot_cancel_order', async () => {
    const esperando = await pixCriado()
    const cancelado = await cancelarPedidoMp(esperando.id, 'tent')
    expect(cancelado.ok && traduzir(cancelado.pedido)?.status).toBe('cancelado')
    expect(await cancelarPedidoMp(esperando.id, 'tent')).toEqual({ ok: false, status: 409, codigo: 'order_already_canceled' })

    const pagoId = (await pixCriado()).id
    vi.setSystemTime(T0 + 20_000)
    expect(await cancelarPedidoMp(pagoId, 'tent')).toEqual({ ok: false, status: 409, codigo: 'cannot_cancel_order' })
  })

  it('estornar o pago: estornado; de novo, 409 order_already_refunded; o que espera nao estorna', async () => {
    const esperando = await pixCriado()
    expect((await estornarPedidoMp(esperando.id, 'tent')).ok).toBe(false)
    vi.setSystemTime(T0 + 20_000)
    const estornado = await estornarPedidoMp(esperando.id, 'tent')
    expect(estornado.ok && traduzir(estornado.pedido)?.status).toBe('estornado')
    expect(await estornarPedidoMp(esperando.id, 'tent')).toEqual({ ok: false, status: 409, codigo: 'order_already_refunded' })
  })

  it('o cartao aprova na hora, com a bandeira e as parcelas', async () => {
    const r = await criarPedidoCartao({
      tentativa: tentativa(),
      totalCentavos: 9280,
      email: 'ensaio@exemplo.com',
      cartao: { token: 'a'.repeat(32), bandeira: 'master', tipo: 'credit_card', parcelas: 1 },
      documento: null,
      itens: [],
      dispositivo: null,
    })
    expect(r.ok && traduzir(r.pedido)?.status).toBe('aprovado')
    expect(r.ok && r.pedido.pagamento?.bandeira).toBe('master')
  })

  it('outro endereco passa para o fetch de verdade', async () => {
    const r = await fetch('https://exemplo.com/qualquer', { method: 'POST' })
    expect(await r.text()).toBe('de verdade')
    expect(real).toHaveBeenCalledWith('https://exemplo.com/qualquer', { method: 'POST' })
  })

  it.each([
    ['sem MERCADOPAGO_AMBIENTE', 'MERCADOPAGO_AMBIENTE', undefined],
    ['com MERCADOPAGO_AMBIENTE de producao', 'MERCADOPAGO_AMBIENTE', 'producao'],
    ['com NODE_ENV=production', 'NODE_ENV', 'production'],
  ])('fora do ensaio (%s), a chamada ao Mercado Pago passa para o fetch de verdade', async (_, nome, valor) => {
    vi.stubEnv(nome, valor)
    real.mockClear()
    const r = await fetch('https://api.mercadopago.com/v1/orders', { method: 'POST', body: '{}' })
    expect(await r.text()).toBe('de verdade')
    expect(real).toHaveBeenCalledWith('https://api.mercadopago.com/v1/orders', { method: 'POST', body: '{}' })
  })

  it('o ambiente e lido na hora da chamada: com teste de volta, o falso responde de novo', async () => {
    vi.stubEnv('MERCADOPAGO_AMBIENTE', undefined)
    real.mockClear()
    await fetch('https://api.mercadopago.com/v1/orders/ORD1', { method: 'GET' })
    expect(real).toHaveBeenCalledTimes(1)
    vi.stubEnv('MERCADOPAGO_AMBIENTE', ' teste ')
    const pedido = await pixCriado()
    expect(pedido.pagamento?.pix?.copiaECola).toBe('00020126-ensaio')
    expect(real).toHaveBeenCalledTimes(1)
  })

  it('outro processo do servidor (um falso novo, sem memoria) responde o mesmo pedido pelo id', async () => {
    const { id } = await pixCriado(1290)
    vi.resetModules()
    await import('../scripts/ensaio/mercadopago-falso.mjs')
    vi.setSystemTime(T0 + 20_000)
    const r = await lerPedidoMp(id)
    expect(r.ok && traduzir(r.pedido)?.status).toBe('aprovado')
    expect(r.ok && r.pedido.valorCentavos).toBe(1290)
  })
})
