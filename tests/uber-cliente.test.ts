// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** O cliente da Uber com fetch e token falsos: nunca chama a Uber de verdade. */

const m = vi.hoisted(() => ({ teste: false, token: vi.fn() }))

vi.mock('@/lib/dados/ambiente', () => ({
  variavel: (nome: string) => {
    if (nome !== 'UBER_DIRECT_CUSTOMER_ID') throw new Error('variavel inesperada')
    return 'cli/123'
  },
  uberEmTeste: () => m.teste,
}))
vi.mock('@/lib/dados/erros', () => ({ registrarFalha: vi.fn() }))
vi.mock('@/lib/uber/token', () => ({ obterToken: (r?: boolean) => m.token(r) }))

import { registrarFalha } from '@/lib/dados/erros'
import { cancelarCorridaNaUber, cotarNaUber, criarCorridaNaUber, lerCorridaNaUber } from '@/lib/uber/cliente'
import type { EnderecoUber } from '@/lib/uber/endereco'

const fetchFalso = vi.fn()
const casa: EnderecoUber = {
  logradouro: 'Rua A', numero: '1', complemento: '', bairro: 'Mooca', cidade: 'São Paulo', uf: 'SP', cep: '03045000',
}
const cozinha = { nome: 'AMO Sabores Saudáveis' as const, endereco: { ...casa, numero: '9' }, telefone: '1133334444' }
const janelas = {
  retiradaDe: '2026-11-24T13:30:00.000Z',
  retiradaAte: '2026-11-24T14:00:00.000Z',
  entregaDe: '2026-11-24T14:00:00.000Z',
  entregaAte: '2026-11-24T15:00:00.000Z',
}
const BASE = 'https://api.uber.com/v1/customers/cli%2F123'

function resp(corpo: unknown, status = 200) {
  fetchFalso.mockResolvedValueOnce(new Response(JSON.stringify(corpo), { status }))
}
const cotacaoBoa = { id: 'dqt_abc-1', fee: 1250, currency: 'brl', duration: 30, pickup_duration: 12 }
const corridaBoa = {
  id: 'del_xyz', status: 'pending', fee: 1250, live_mode: false,
  tracking_url: 'https://direct-order.uber.com/orders/abc',
}
const pedidoBase = {
  cotacaoId: 'dqt_abc-1', chave: 'chave-uuid', numeroDoPedido: 'AMO-0042', cozinha,
  cliente: { nome: 'Ana', celular: '11999998888', endereco: casa },
  itens: [{ nome: 'Bolo', quantos: 2, precoCentavos: 1500 }],
  subtotalCentavos: 3000, janelas: null as typeof janelas | null,
}
const corpoEnviado = (i = 0) => JSON.parse(String((fetchFalso.mock.calls[i][1] as RequestInit).body))

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
  vi.mocked(registrarFalha).mockClear()
  m.teste = false
  m.token.mockReset()
  m.token.mockResolvedValue('tok')
})

describe('cotarNaUber', () => {
  const p = { retirada: cozinha.endereco, telefoneRetirada: '1133334444', entrega: casa, janelas: null as typeof janelas | null }

  it('chama a URL certa, com cabecalhos e corpo de strings, sem janelas', async () => {
    resp(cotacaoBoa)
    const r = await cotarNaUber(p)
    expect(r).toEqual({ ok: true, dados: { id: 'dqt_abc-1', valorCentavos: 1250, minutos: 30, retiradaEmMinutos: 12, aoVivo: null } })
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/delivery_quotes`)
    expect(init.method).toBe('POST')
    expect(init.cache).toBe('no-store')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    const c = corpoEnviado()
    expect(typeof c.pickup_address).toBe('string')
    expect(typeof c.dropoff_address).toBe('string')
    expect(c.pickup_phone_number).toBe('+551133334444')
    expect(c.pickup_ready_dt).toBeUndefined()
  })

  it('com janelas leva os quatro campos', async () => {
    resp(cotacaoBoa)
    await cotarNaUber({ ...p, janelas })
    const c = corpoEnviado()
    expect(c.pickup_ready_dt).toBe('2026-11-24T13:30:00Z')
    expect(c.pickup_deadline_dt).toBe('2026-11-24T14:00:00Z')
    expect(c.dropoff_ready_dt).toBe('2026-11-24T14:00:00Z')
    expect(c.dropoff_deadline_dt).toBe('2026-11-24T15:00:00Z')
  })

  it('pickup_duration ausente vira null; live_mode presente e booleano passa', async () => {
    resp({ id: 'dqt_a', fee: 0, currency: 'brl', duration: 5, live_mode: true })
    const r = await cotarNaUber(p)
    expect(r).toEqual({ ok: true, dados: { id: 'dqt_a', valorCentavos: 0, minutos: 5, retiradaEmMinutos: null, aoVivo: true } })
  })

  it.each([
    ['fee fracionado', { ...cotacaoBoa, fee: 12.5 }, 'resposta_torta'],
    ['fee negativo', { ...cotacaoBoa, fee: -1 }, 'resposta_torta'],
    ['fee enorme', { ...cotacaoBoa, fee: 100001 }, 'resposta_torta'],
    ['moeda usd', { ...cotacaoBoa, currency: 'usd' }, 'moeda'],
    ['id de corrida', { ...cotacaoBoa, id: 'del_abc' }, 'resposta_torta'],
    ['id torto', { ...cotacaoBoa, id: 'dqt_a/../b' }, 'resposta_torta'],
    ['live_mode nao booleano', { ...cotacaoBoa, live_mode: 'sim' }, 'resposta_torta'],
    ['sem duration', { id: 'dqt_a', fee: 1, currency: 'brl' }, 'resposta_torta'],
  ])('%s e recusado', async (_n, corpo, codigo) => {
    resp(corpo)
    expect(await cotarNaUber(p)).toEqual({ ok: false, status: 200, codigo })
  })

  it('CEP torto devolve falha sem chamar a Uber nem lancar', async () => {
    const r = await cotarNaUber({ ...p, entrega: { ...casa, cep: '1' } })
    expect(r.ok).toBe(false)
    expect(fetchFalso).not.toHaveBeenCalled()
  })
})

describe('criarCorridaNaUber', () => {
  it('monta o corpo da spec, no agora', async () => {
    resp(corridaBoa)
    const r = await criarCorridaNaUber(pedidoBase)
    expect(r).toEqual({
      ok: true,
      dados: { id: 'del_xyz', status: 'pending', valorCentavos: 1250, rastreioUrl: 'https://direct-order.uber.com/orders/abc', aoVivo: false },
    })
    const [url] = fetchFalso.mock.calls[0] as [string]
    expect(url).toBe(`${BASE}/deliveries`)
    const c = corpoEnviado()
    expect(c).toMatchObject({
      quote_id: 'dqt_abc-1',
      idempotency_key: 'chave-uuid',
      pickup_name: 'AMO Sabores Saudáveis',
      pickup_phone_number: '+551133334444',
      dropoff_name: 'Ana',
      dropoff_phone_number: '+5511999998888',
      manifest_items: [{ name: 'Bolo', quantity: 2, size: 'small', price: 1500 }],
      manifest_total_value: 3000,
      manifest_reference: 'AMO-0042',
      external_id: 'AMO-0042',
      deliverable_action: 'deliverable_action_meet_at_door',
      undeliverable_action: 'leave_at_door',
      dropoff_verification: { picture: true },
    })
    expect(typeof c.pickup_address).toBe('string')
    expect(typeof c.dropoff_address).toBe('string')
    expect(c.test_specifications).toBeUndefined()
    expect(c.pickup_ready_dt).toBeUndefined()
  })

  it('test_specifications so em teste; janelas so no agendado', async () => {
    m.teste = true
    resp(corridaBoa)
    await criarCorridaNaUber({ ...pedidoBase, janelas })
    const c = corpoEnviado()
    expect(c.test_specifications).toEqual({ robo_courier_specification: { mode: 'auto' } })
    expect(c.pickup_ready_dt).toBe('2026-11-24T13:30:00Z')
    expect(c.dropoff_deadline_dt).toBe('2026-11-24T15:00:00Z')
  })

  it('celular com 55 ou + e normalizado', async () => {
    resp(corridaBoa)
    await criarCorridaNaUber({ ...pedidoBase, cliente: { ...pedidoBase.cliente, celular: '+55 (11) 99999-8888' } })
    expect(corpoEnviado().dropoff_phone_number).toBe('+5511999998888')
  })

  it('celular impossivel nao chama a Uber', async () => {
    const r = await criarCorridaNaUber({ ...pedidoBase, cliente: { ...pedidoBase.cliente, celular: '123' } })
    expect(r.ok).toBe(false)
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it.each([
    ['tracking http', { ...corridaBoa, tracking_url: 'http://direct-order.uber.com/x' }],
    ['tracking comprido', { ...corridaBoa, tracking_url: 'https://direct-order.uber.com/' + 'a'.repeat(500) }],
    ['sem live_mode', { id: 'del_a', status: 'pending', fee: 1 }],
    ['live_mode texto', { ...corridaBoa, live_mode: 'false' }],
    ['status torto', { ...corridaBoa, status: 'Pending!' }],
    ['id de cotacao', { ...corridaBoa, id: 'dqt_a' }],
    ['fee fracionado', { ...corridaBoa, fee: 12.5 }],
  ])('%s e recusado', async (_n, corpo) => {
    resp(corpo)
    expect(await criarCorridaNaUber(pedidoBase)).toEqual({ ok: false, status: 200, codigo: 'resposta_torta' })
  })

  it('tracking e fee ausentes viram null', async () => {
    resp({ id: 'del_a', status: 'pending', live_mode: true })
    const r = await criarCorridaNaUber(pedidoBase)
    expect(r).toEqual({ ok: true, dados: { id: 'del_a', status: 'pending', valorCentavos: null, rastreioUrl: null, aoVivo: true } })
  })
})

describe('lerCorridaNaUber e cancelarCorridaNaUber', () => {
  it('le por GET no caminho certo', async () => {
    resp({ ...corridaBoa, status: 'delivered' })
    const r = await lerCorridaNaUber('del_xyz')
    expect(r.ok && r.dados.status).toBe('delivered')
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/deliveries/del_xyz`)
    expect(init.method).toBe('GET')
  })

  it('cancela por POST em /cancel', async () => {
    resp({ ...corridaBoa, status: 'canceled' })
    const r = await cancelarCorridaNaUber('del_xyz')
    expect(r.ok && r.dados.status).toBe('canceled')
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/deliveries/del_xyz/cancel`)
    expect(init.method).toBe('POST')
  })

  it.each(['dqt_abc', '../x', 'del_', 'del_a/b', 'del_a?x=1', '', 'del_' + 'a'.repeat(101)])(
    'id %j invalido: id_invalido sem fetch nem token',
    async (id) => {
      expect(await lerCorridaNaUber(id)).toEqual({ ok: false, status: 0, codigo: 'id_invalido' })
      expect(await cancelarCorridaNaUber(id)).toEqual({ ok: false, status: 0, codigo: 'id_invalido' })
      expect(fetchFalso).not.toHaveBeenCalled()
      expect(m.token).not.toHaveBeenCalled()
    },
  )
})

describe('erros e repeticao', () => {
  const p = { retirada: cozinha.endereco, telefoneRetirada: '1133334444', entrega: casa, janelas: null }

  it('401 seguido de 200 renova o token uma vez e repete com o novo', async () => {
    m.token.mockResolvedValueOnce('velho').mockResolvedValueOnce('novo')
    resp({ code: 'unauthorized' }, 401)
    resp(cotacaoBoa)
    const r = await cotarNaUber(p)
    expect(r.ok).toBe(true)
    expect(fetchFalso).toHaveBeenCalledTimes(2)
    expect(m.token.mock.calls).toEqual([[undefined], [true]])
    expect(((fetchFalso.mock.calls[1][1] as RequestInit).headers as Record<string, string>).Authorization).toBe('Bearer novo')
  })

  it('401 duas vezes devolve 401', async () => {
    resp({ code: 'unauthorized' }, 401)
    resp({ code: 'unauthorized' }, 401)
    expect(await cotarNaUber(p)).toEqual({ ok: false, status: 401, codigo: 'unauthorized' })
    expect(fetchFalso).toHaveBeenCalledTimes(2)
    expect(m.token).toHaveBeenCalledTimes(2)
  })

  it('401 e a renovacao sem token: sem_token', async () => {
    m.token.mockResolvedValueOnce('tok').mockResolvedValueOnce(null)
    resp({}, 401)
    expect(await cotarNaUber(p)).toEqual({ ok: false, status: 0, codigo: 'sem_token' })
  })

  it('sem token de saida: sem_token e nada de fetch', async () => {
    m.token.mockResolvedValue(null)
    expect(await cotarNaUber(p)).toEqual({ ok: false, status: 0, codigo: 'sem_token' })
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('timeout ou rede: status 0, sem lancar', async () => {
    fetchFalso.mockRejectedValueOnce(new DOMException('tempo', 'TimeoutError'))
    expect(await cotarNaUber(p)).toEqual({ ok: false, status: 0, codigo: null })
  })

  it('o code da Uber so passa se casar o formato', async () => {
    resp({ code: 'address_undeliverable' }, 400)
    expect(await cotarNaUber(p)).toEqual({ ok: false, status: 400, codigo: 'address_undeliverable' })
    resp({ code: 'Tem Espaco <script>' }, 400)
    expect(await cotarNaUber(p)).toEqual({ ok: false, status: 400, codigo: null })
    resp('texto solto', 500)
    expect(await cotarNaUber(p)).toEqual({ ok: false, status: 500, codigo: null })
  })

  it('corpo 200 que nao e JSON: resposta_torta', async () => {
    fetchFalso.mockResolvedValueOnce(new Response('<html>', { status: 200 }))
    expect(await cotarNaUber(p)).toEqual({ ok: false, status: 200, codigo: 'resposta_torta' })
  })

  it('o log leva so a operacao, o status e o code', async () => {
    resp({ code: 'address_undeliverable', message: 'Rua A 1 Ana 11999998888' }, 400)
    await cotarNaUber(p)
    expect(registrarFalha).toHaveBeenCalledWith('uber.cotar', { status: 400, code: 'address_undeliverable' })
    resp({ code: 'x' }, 400)
    await criarCorridaNaUber(pedidoBase)
    resp({ code: 'x' }, 400)
    await lerCorridaNaUber('del_a')
    resp({ code: 'x' }, 400)
    await cancelarCorridaNaUber('del_a')
    const ops = vi.mocked(registrarFalha).mock.calls.map((c) => c[0])
    expect(ops).toEqual(['uber.cotar', 'uber.criar', 'uber.ler', 'uber.cancelar'])
    const log = JSON.stringify(vi.mocked(registrarFalha).mock.calls)
    for (const segredo of ['tok', 'cli', 'Rua A', 'Ana', '1199999', 'Bearer']) expect(log).not.toContain(segredo)
  })
})
