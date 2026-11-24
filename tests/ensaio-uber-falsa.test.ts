// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// o fetch "de verdade" que o falso encontra ao entrar, e o log do ensaio calado
const real = vi.hoisted(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const f = vi.fn(async () => new Response('de verdade', { status: 200 }))
  globalThis.fetch = f as unknown as typeof fetch
  return f
})

vi.mock('@/lib/dados/ambiente', () => ({ variavel: () => 'conta-1', uberEmTeste: () => true }))
vi.mock('@/lib/dados/erros', () => ({ registrarFalha: vi.fn() }))
vi.mock('@/lib/uber/token', () => ({ obterToken: async () => 'ensaio-token' }))

import '../scripts/ensaio/uber-falsa.mjs'
import { cancelarCorridaNaUber, cotarNaUber, criarCorridaNaUber, lerCorridaNaUber } from '@/lib/uber/cliente'
import type { EnderecoUber } from '@/lib/uber/endereco'

const T0 = new Date('2026-11-23T15:00:00.000Z').getTime()
const casa: EnderecoUber = {
  logradouro: 'Rua A', numero: '1', complemento: '', bairro: 'Mooca', cidade: 'Sao Paulo', uf: 'SP', cep: '03045000',
}
const cozinha = { nome: 'AMO Sabores Saudáveis' as const, endereco: { ...casa, numero: '9' }, telefone: '1133334444' }
const BASE = 'https://api.uber.com/v1/customers/conta-1'
let n = 0

async function cotar(cep = '03045000') {
  const r = await cotarNaUber({ retirada: cozinha.endereco, telefoneRetirada: '1133334444', entrega: { ...casa, cep }, janelas: null })
  if (!r.ok) throw new Error(`cotar falhou: ${r.status} ${r.codigo}`)
  return r.dados
}
function pedidoDe(cotacaoId: string, chave: string, cep = '03045000') {
  return {
    cotacaoId, chave, numeroDoPedido: 'AMO-0042', cozinha,
    cliente: { nome: 'Ana', celular: '11999998888', endereco: { ...casa, cep } },
    itens: [{ nome: 'Bolo', quantos: 1, precoCentavos: 1500 }], subtotalCentavos: 1500, janelas: null,
  }
}
async function corridaCriada(cep = '03045000') {
  const cotacao = await cotar(cep)
  const r = await criarCorridaNaUber(pedidoDe(cotacao.id, `chave-${++n}`, cep))
  if (!r.ok) throw new Error(`criar falhou: ${r.status} ${r.codigo}`)
  return { corrida: r.dados, cotacao }
}

beforeEach(() => {
  vi.stubEnv('UBER_DIRECT_AMBIENTE', 'teste')
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(T0)
  real.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('a Uber falsa do ensaio, lida pelo cliente de verdade', () => {
  it('cotacao: dqt_, brl, sem live_mode, fee que cresce com os digitos do CEP', async () => {
    const a = await cotar('00000001')
    const b = await cotar('99999999')
    expect(a.id).toMatch(/^dqt_/)
    expect(a.aoVivo).toBeNull()
    expect(b.valorCentavos).toBeGreaterThan(a.valorCentavos)
    expect(Number.isInteger(a.valorCentavos)).toBe(true)
    expect(real).not.toHaveBeenCalled()
  })

  it('a corrida nasce pending, com live_mode false, o fee da cotacao e o rastreio no host da Uber', async () => {
    const { corrida, cotacao } = await corridaCriada()
    expect(corrida.id).toMatch(/^del_/)
    expect(corrida.status).toBe('pending')
    expect(corrida.aoVivo).toBe(false)
    expect(corrida.valorCentavos).toBe(cotacao.valorCentavos)
    expect(new URL(corrida.rastreioUrl!).host).toBe('direct-order.uber.com')
  })

  it('a mesma chave de idempotencia devolve a mesma corrida', async () => {
    const cotacao = await cotar()
    const x = await criarCorridaNaUber(pedidoDe(cotacao.id, 'repetida'))
    const y = await criarCorridaNaUber(pedidoDe(cotacao.id, 'repetida'))
    expect(x.ok && y.ok && x.dados.id === y.dados.id).toBe(true)
  })

  it('o GET anda pelo relogio: pending, pickup, pickup_complete, dropoff, delivered, de 20 em 20 s', async () => {
    const { corrida } = await corridaCriada()
    const estados: string[] = []
    for (const ms of [19_999, 20_000, 40_000, 60_000, 80_000, 500_000]) {
      vi.setSystemTime(T0 + ms)
      const r = await lerCorridaNaUber(corrida.id)
      estados.push(r.ok ? r.dados.status : 'falhou')
    }
    expect(estados).toEqual(['pending', 'pickup', 'pickup_complete', 'dropoff', 'delivered', 'delivered'])
  })

  it('outro processo, sem a corrida na memoria, refaz a corrida pelo id', async () => {
    const hora = (T0 - 45_000).toString(36)
    const r = await lerCorridaNaUber(`del_ensaio_${hora}_1500`)
    expect(r.ok && r.dados.status).toBe('pickup_complete')
    expect(r.ok && r.dados.valorCentavos).toBe(1500)
  })

  it('cancelar: canceled; de novo, 409; entregue, 409', async () => {
    const { corrida } = await corridaCriada()
    const um = await cancelarCorridaNaUber(corrida.id)
    expect(um.ok && um.dados.status).toBe('canceled')
    const lida = await lerCorridaNaUber(corrida.id)
    expect(lida.ok && lida.dados.status).toBe('canceled')
    const dois = await cancelarCorridaNaUber(corrida.id)
    expect(dois).toMatchObject({ ok: false, status: 409, codigo: 'delivery_already_canceled' })

    const { corrida: outra } = await corridaCriada()
    vi.setSystemTime(T0 + 200_000)
    expect(await cancelarCorridaNaUber(outra.id)).toMatchObject({ ok: false, status: 409 })
  })

  it('o token e fixo e dura 30 dias', async () => {
    const r = await fetch('https://auth.uber.com/oauth/v2/token', {
      method: 'POST',
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    })
    const corpo = await r.json()
    expect(corpo.access_token).toBe('ensaio-token-da-uber-falsa')
    expect(corpo.expires_in).toBe(30 * 24 * 60 * 60)
    expect(real).not.toHaveBeenCalled()
  })

  it('sem UBER_DIRECT_AMBIENTE=teste, ou em producao, nada e trocado e a chamada vai ao fetch de verdade', async () => {
    vi.stubEnv('UBER_DIRECT_AMBIENTE', '')
    await fetch(`${BASE}/deliveries/del_x`)
    await fetch('https://auth.uber.com/oauth/v2/token', { method: 'POST' })
    expect(real).toHaveBeenCalledTimes(2)
    vi.stubEnv('UBER_DIRECT_AMBIENTE', 'teste')
    vi.stubEnv('NODE_ENV', 'production')
    await fetch(`${BASE}/delivery_quotes`, { method: 'POST', body: '{}' })
    expect(real).toHaveBeenCalledTimes(3)
  })

  it('qualquer outro endereco passa para o fetch de verdade', async () => {
    await fetch('https://exemplo.com/x')
    await fetch('https://api.mercadopago.com/v1/orders')
    expect(real).toHaveBeenCalledTimes(2)
  })
})
