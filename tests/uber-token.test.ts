// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** O token da Uber com o banco e o fetch falsos: nunca chama a Uber de verdade. */

const m = vi.hoisted(() => ({
  configurada: true,
  lido: null as { token: string; expiraEm: string } | null,
  lerErro: false,
  vez: true,
  guardados: [] as unknown[][],
  ler: vi.fn(),
  reservar: vi.fn(),
}))

vi.mock('@/lib/dados/ambiente', () => ({
  uberConfigurada: () => m.configurada,
  variavel: (nome: string) => (nome === 'UBER_DIRECT_CLIENT_ID' ? 'id-da-conta' : 'segredo-da-conta'),
}))
vi.mock('@/lib/dados/erros', () => ({ registrarFalha: vi.fn() }))
vi.mock('@/lib/dados/entregas', () => ({
  lerTokenUber: async () => {
    m.ler()
    if (m.lerErro) throw new Error('banco fora')
    return m.lido
  },
  guardarTokenUber: async (...a: unknown[]) => void m.guardados.push(a),
  reservarRenovacaoToken: async () => {
    m.reservar()
    return m.vez
  },
}))

import { registrarFalha } from '@/lib/dados/erros'
import { esquecerTokenEmMemoria, obterToken } from '@/lib/uber/token'

const DIA = 24 * 60 * 60 * 1000
const daqui = (ms: number) => new Date(Date.now() + ms).toISOString()
const fetchFalso = vi.fn()

function uber(corpo: unknown, status = 200) {
  fetchFalso.mockResolvedValueOnce(new Response(JSON.stringify(corpo), { status }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
  vi.mocked(registrarFalha).mockClear()
  m.configurada = true
  m.lido = null
  m.lerErro = false
  m.vez = true
  m.guardados = []
  m.ler.mockClear()
  m.reservar.mockClear()
  esquecerTokenEmMemoria()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('obterToken', () => {
  it('sem credenciais devolve null e nao chama a Uber nem o banco', async () => {
    m.configurada = false
    expect(await obterToken()).toBeNull()
    expect(fetchFalso).not.toHaveBeenCalled()
    expect(m.ler).not.toHaveBeenCalled()
  })

  it('token valido no banco nao chama a Uber', async () => {
    m.lido = { token: 'do-banco', expiraEm: daqui(20 * DIA) }
    expect(await obterToken()).toBe('do-banco')
    expect(fetchFalso).not.toHaveBeenCalled()
    expect(m.reservar).not.toHaveBeenCalled()
  })

  it('duas chamadas seguidas usam a memoria', async () => {
    m.lido = { token: 'do-banco', expiraEm: daqui(20 * DIA) }
    await obterToken()
    await obterToken()
    expect(m.ler).toHaveBeenCalledTimes(1)
  })

  it('sem token renova: pede a Uber do jeito certo e guarda', async () => {
    uber({ access_token: 'novo', expires_in: 2592000, token_type: 'Bearer' })
    expect(await obterToken()).toBe('novo')
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://auth.uber.com/oauth/v2/token')
    expect(init.method).toBe('POST')
    expect(init.cache).toBe('no-store')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/x-www-form-urlencoded')
    const corpo = new URLSearchParams(String(init.body))
    expect(Object.fromEntries(corpo)).toEqual({
      client_id: 'id-da-conta',
      client_secret: 'segredo-da-conta',
      grant_type: 'client_credentials',
      scope: 'eats.deliveries',
    })
    expect(m.guardados).toHaveLength(1)
    expect(m.guardados[0][0]).toBe('novo')
    const expira = Date.parse(String(m.guardados[0][1]))
    expect(Math.abs(expira - (Date.now() + 2592000 * 1000))).toBeLessThan(5000)
  })

  it('faltando 1 dia renova e guarda', async () => {
    m.lido = { token: 'velho', expiraEm: daqui(DIA) }
    uber({ access_token: 'novo', expires_in: 2592000 })
    expect(await obterToken()).toBe('novo')
    expect(m.guardados).toHaveLength(1)
  })

  it('renovar forca, mesmo com token bom na memoria', async () => {
    m.lido = { token: 'bom', expiraEm: daqui(20 * DIA) }
    await obterToken()
    uber({ access_token: 'forcado', expires_in: 2592000 })
    expect(await obterToken(true)).toBe('forcado')
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })

  it('renovar com outro token valido no banco adota esse e nao chama a Uber nem pede a vez', async () => {
    m.lido = { token: 'velho', expiraEm: daqui(20 * DIA) }
    await obterToken()
    m.lido = { token: 'outro-ja-renovou', expiraEm: daqui(30 * DIA) }
    expect(await obterToken(true)).toBe('outro-ja-renovou')
    expect(fetchFalso).not.toHaveBeenCalled()
    expect(m.reservar).not.toHaveBeenCalled()
    expect(await obterToken()).toBe('outro-ja-renovou')
  })

  it('renovar com o mesmo token no banco renova de verdade', async () => {
    m.lido = { token: 'velho', expiraEm: daqui(20 * DIA) }
    await obterToken()
    uber({ access_token: 'novo', expires_in: 2592000 })
    expect(await obterToken(true)).toBe('novo')
    expect(fetchFalso).toHaveBeenCalledTimes(1)
    expect(m.reservar).toHaveBeenCalledTimes(1)
  })

  it('renovar com o banco fora devolve null sem chamar a Uber', async () => {
    m.lido = { token: 'velho', expiraEm: daqui(20 * DIA) }
    await obterToken()
    m.lerErro = true
    expect(await obterToken(true)).toBeNull()
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('sem a vez, espera 1 s, rele do banco e nao chama a Uber', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    m.vez = false
    m.lido = { token: 'velho', expiraEm: daqui(DIA) }
    const p = obterToken()
    await vi.advanceTimersByTimeAsync(0)
    m.lido = { token: 'do-outro', expiraEm: daqui(30 * DIA) }
    await vi.advanceTimersByTimeAsync(1000)
    expect(await p).toBe('do-outro')
    expect(fetchFalso).not.toHaveBeenCalled()
    expect(m.ler).toHaveBeenCalledTimes(2)
  })

  it('resposta 500 devolve null e loga so o status', async () => {
    uber({ error: 'boom', access_token: 'nao-pode-vazar' }, 500)
    expect(await obterToken()).toBeNull()
    expect(m.guardados).toHaveLength(0)
    expect(registrarFalha).toHaveBeenCalledWith('uber.token', { status: 500 })
  })

  it.each([
    ['expires_in torto', { access_token: 'x', expires_in: 'muito' }],
    ['expires_in fracionado', { access_token: 'x', expires_in: 10.5 }],
    ['expires_in zero', { access_token: 'x', expires_in: 0 }],
    ['expires_in negativo', { access_token: 'x', expires_in: -5 }],
    ['sem access_token', { expires_in: 100 }],
    ['access_token vazio', { access_token: '', expires_in: 100 }],
  ])('%s devolve null', async (_nome, corpo) => {
    uber(corpo)
    expect(await obterToken()).toBeNull()
    expect(m.guardados).toHaveLength(0)
  })

  it('corpo que nao e JSON devolve null', async () => {
    fetchFalso.mockResolvedValueOnce(new Response('<html>', { status: 200 }))
    expect(await obterToken()).toBeNull()
  })

  it('erro de rede ou tempo esgotado devolve null, status 0, sem lancar', async () => {
    fetchFalso.mockRejectedValueOnce(new Error('segredo-da-conta caiu'))
    expect(await obterToken()).toBeNull()
    expect(registrarFalha).toHaveBeenCalledWith('uber.token', { status: 0 })
  })

  it('o banco fora devolve null sem lancar', async () => {
    m.lerErro = true
    expect(await obterToken()).toBeNull()
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('renovacao que falha mas com token ainda valido devolve o token que serve', async () => {
    m.lido = { token: 'ainda-serve', expiraEm: daqui(DIA) }
    uber({}, 503)
    expect(await obterToken()).toBe('ainda-serve')
  })

  it('o log nunca contem o token nem o client_secret', async () => {
    uber({ access_token: 'token-secreto-123', expires_in: 100 })
    await obterToken()
    fetchFalso.mockRejectedValueOnce(new Error('segredo-da-conta'))
    await obterToken(true)
    uber({ access_token: 'token-secreto-123' }, 500)
    await obterToken(true)
    const log = JSON.stringify(vi.mocked(registrarFalha).mock.calls)
    expect(log).not.toContain('token-secreto-123')
    expect(log).not.toContain('segredo-da-conta')
    expect(log).not.toContain('id-da-conta')
  })
})
