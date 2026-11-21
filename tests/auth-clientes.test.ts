// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Cookie = { value: string; options?: Record<string, unknown> }
const pote = new Map<string, Cookie>()
const leituras = vi.fn()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => {
      leituras()
      return [...pote].map(([name, c]) => ({ name, value: c.value }))
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => pote.set(name, { value, options }),
    delete: (name: string) => pote.delete(name),
  }),
  headers: async () => new Headers(),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECIONOU ${url}`)
  },
}))

const { criarClienteServidor } = await import('@/lib/auth/servidor')
const { criarClienteAdmin } = await import('@/lib/auth/admin')
const { apagarCookiesDaSessao } = await import('@/lib/auth/cookies')
const { exigirUsuario, obterUsuario } = await import('@/lib/auth')
const { lerIp } = await import('@/lib/auth/ip')
const { consumirLimite } = await import('@/lib/dados/limites')

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
const SESSAO = {
  access_token: 'token-de-acesso',
  refresh_token: 'token-de-renovacao',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'usuario-1', email: 'maria@exemplo.com', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-11-20T00:00:00Z' },
}

beforeEach(() => {
  pote.clear()
  leituras.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemplo.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
  vi.stubEnv('SUPABASE_PORTA', 'segredo-da-porta')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_teste')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const cabecalhosDa = (busca: ReturnType<typeof vi.fn>, n = 0) => new Headers((busca.mock.calls[n][1] as RequestInit).headers)

describe('criarClienteServidor', () => {
  it('a leitura de dados leva a porta e a chave publicavel', async () => {
    const busca = vi.fn(async () => json([]))
    vi.stubGlobal('fetch', busca)
    await (await criarClienteServidor()).from('perfis').select('nome')
    expect(cabecalhosDa(busca).get('x-amo-porta')).toBe('segredo-da-porta')
    expect(cabecalhosDa(busca).get('apikey')).toBe('sb_publishable_teste')
  })

  it('a sessao vai para um cookie httpOnly, sameSite lax, no site inteiro', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(SESSAO)))
    const banco = await criarClienteServidor()
    await banco.auth.signInWithPassword({ email: 'maria@exemplo.com', password: '12345678' })
    const sessao = [...pote].filter(([nome]) => nome.startsWith('sb-'))
    expect(sessao.length).toBeGreaterThan(0)
    for (const [, cookie] of sessao) {
      expect(cookie.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
    }
  })
})

describe('criarClienteAdmin', () => {
  it('leva a porta e a chave secreta, e nao le cookie', async () => {
    const busca = vi.fn(async () => json(true))
    vi.stubGlobal('fetch', busca)
    await criarClienteAdmin().schema('privado' as never).rpc('consumir_limite' as never)
    expect(cabecalhosDa(busca).get('x-amo-porta')).toBe('segredo-da-porta')
    expect(cabecalhosDa(busca).get('apikey')).toBe('sb_secret_teste')
    expect(leituras).not.toHaveBeenCalled()
  })
})

describe('apagarCookiesDaSessao', () => {
  it('apaga so os cookies da sessao', async () => {
    pote.set('sb-x-auth-token', { value: '1' })
    pote.set('sb-x-auth-token.0', { value: '2' })
    pote.set('outro', { value: '3' })
    await apagarCookiesDaSessao()
    expect([...pote.keys()]).toEqual(['outro'])
  })
})

describe('obterUsuario e exigirUsuario', () => {
  it('sem sessao, obterUsuario devolve null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 401)))
    expect(await obterUsuario()).toBeNull()
  })

  it('com sessao, junta o e-mail do Auth com o nome e o celular do perfil', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(SESSAO)))
    await (await criarClienteServidor()).auth.signInWithPassword({ email: 'maria@exemplo.com', password: '12345678' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).includes('/auth/v1/user')
          ? json(SESSAO.user)
          : json({ nome: 'Maria José', celular: '11987654321' }),
      ),
    )
    expect(await obterUsuario()).toEqual({ id: 'usuario-1', email: 'maria@exemplo.com', nome: 'Maria José', celular: '11987654321' })
  })

  it.each([
    ['//mal.com', '/entrar?volta=%2Fconta'],
    ['/conta/pedidos', '/entrar?volta=%2Fconta%2Fpedidos'],
  ])('sem sessao, exigirUsuario(%j) manda para %s', async (volta, destino) => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 401)))
    await expect(exigirUsuario(volta)).rejects.toThrow(`REDIRECIONOU ${destino}`)
  })
})

describe('lerIp', () => {
  it('o primeiro do x-forwarded-for, aparado', () => {
    expect(lerIp(new Headers({ 'x-forwarded-for': ' 1.2.3.4 , 10.0.0.1' }))).toBe('1.2.3.4')
  })
  it('sem cabecalho, desconhecido', () => {
    expect(lerIp(new Headers())).toBe('desconhecido')
  })
  it('no maximo 64 caracteres', () => {
    expect(lerIp(new Headers({ 'x-real-ip': 'a'.repeat(200) }))).toHaveLength(64)
  })
})

describe('consumirLimite', () => {
  it.each([
    ['true', () => json(true), true],
    ['false', () => json(false), false],
    ['erro 500', () => json({ code: 'XX000' }, 500), false],
  ])('resposta %s', async (_, resposta, esperado) => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta()))
    expect(await consumirLimite('entrar:ip:1.2.3.4', 10, 900)).toBe(esperado)
  })
  it('rede caida fecha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rede caida') }))
    expect(await consumirLimite('entrar:ip:1.2.3.4', 10, 900)).toBe(false)
  })
  it('a consulta que falha vai ao log do servidor, sem a chave (que pode ter o e-mail)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'XX000', message: 'texto cru' }, 500)))
    expect(await consumirLimite('entrar:email:maria@exemplo.com', 10, 900)).toBe(false)
    expect(log).toHaveBeenCalledWith('Falha do Supabase', expect.objectContaining({ onde: 'consumir_limite', code: 'XX000' }))
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/maria|texto cru/)
    log.mockRestore()
  })
})
