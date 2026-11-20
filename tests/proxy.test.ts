// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Opcoes = { cookies: { getAll: () => unknown[]; setAll: (c: unknown[], h: Record<string, string>) => void } }
let renovar = false
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _chave: string, opcoes: Opcoes) => ({
    auth: {
      getClaims: async () => {
        if (renovar) opcoes.cookies.setAll([{ name: 'sb-x-auth-token', value: 'novo', options: { path: '/', maxAge: 100 } }], { 'cache-control': 'private, no-store' })
        return { data: null, error: null }
      },
    },
  }),
}))

const { proxy, config } = await import('@/proxy')
const { ROTAS_COM_NONCE } = await import('@/lib/seguranca/rotas')
const nonceDe = (politica: string | null) => politica?.match(/'nonce-([^']+)'/)?.[1]

beforeEach(() => {
  renovar = false
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemplo.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
  vi.stubEnv('SUPABASE_PORTA', 'segredo-da-porta')
})

describe('proxy', () => {
  it('nonce novo a cada pedido, na resposta e no pedido repassado', async () => {
    const [a, b] = [await proxy(new NextRequest('http://localhost/entrar')), await proxy(new NextRequest('http://localhost/entrar'))]
    const politica = a.headers.get('content-security-policy')
    expect(nonceDe(politica)).toBeTruthy()
    expect(nonceDe(politica)).not.toBe(nonceDe(b.headers.get('content-security-policy')))
    expect(a.headers.get('x-middleware-request-x-nonce')).toBe(nonceDe(politica))
    expect(a.headers.get('x-middleware-request-content-security-policy')).toBe(politica)
  })

  it('a sessao renovada vai num cookie HttpOnly, e o pedido repassado ja leva o cookie novo', async () => {
    renovar = true
    const r = await proxy(new NextRequest('http://localhost/conta', { headers: { cookie: 'sb-x-auth-token=velho' } }))
    expect(r.headers.get('set-cookie')).toMatch(/sb-x-auth-token=novo.*HttpOnly/i)
    expect(r.headers.get('x-middleware-request-cookie')).toContain('sb-x-auth-token=novo')
    expect(r.headers.get('content-security-policy')).toContain("'nonce-")
    expect(r.headers.get('cache-control')).toBe('private, no-store')
  })

  it('o matcher cobre cada rota com nonce', () => {
    const matcher = config.matcher.join(' ')
    for (const rota of ROTAS_COM_NONCE) expect(matcher).toContain(rota)
  })
})
