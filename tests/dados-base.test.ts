// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { variavel } from '@/lib/dados/ambiente'
import { falhaDoBanco } from '@/lib/dados/erros'
import { criarClientePublico } from '@/lib/dados/publico'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('variavel', () => {
  it('devolve o valor quando existe', () => {
    vi.stubEnv('SUPABASE_PORTA', 'segredo-de-teste')
    expect(variavel('SUPABASE_PORTA')).toBe('segredo-de-teste')
  })
  it.each(['', '   '])('vazia (%j) lanca erro com o nome', (valor) => {
    vi.stubEnv('SUPABASE_PORTA', valor)
    expect(() => variavel('SUPABASE_PORTA')).toThrow('Falta a variável de ambiente SUPABASE_PORTA')
  })
})

describe('falhaDoBanco', () => {
  it('diz onde e o codigo, nunca a mensagem crua', () => {
    const erro = falhaDoBanco('produtos', { code: 'AMO401', message: 'texto cru', details: 'mais texto' } as never)
    expect(erro.message).toBe('Falha no banco (produtos): AMO401')
  })
  it('sem codigo, diz que nao veio', () => {
    expect(falhaDoBanco('produtos', null).message).toBe('Falha no banco (produtos): sem código')
  })
})

describe('criarClientePublico', () => {
  it('toda chamada leva a porta e o cache de 5 minutos, sem sessao', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemplo.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
    vi.stubEnv('SUPABASE_PORTA', 'segredo-de-teste')
    const busca = vi.fn(async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', busca)

    await criarClientePublico().from('loja').select('vendas_pausadas')

    const [url, opcoes] = busca.mock.calls[0] as unknown as [string, RequestInit & { next?: unknown }]
    expect(String(url)).toContain('https://exemplo.supabase.co/rest/v1/loja')
    expect(new Headers(opcoes.headers).get('x-amo-porta')).toBe('segredo-de-teste')
    expect(opcoes.next).toEqual({ revalidate: 300, tags: ['catalogo'] })
  })
})
