// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chavePublicaDoMercadoPago, mercadoPagoEmTeste, variavel } from '@/lib/dados/ambiente'
import { ErroDeRegra, falhaDoBanco, registrarFalha } from '@/lib/dados/erros'
import { criarClienteDoCatalogo, criarClienteDoVisitante } from '@/lib/dados/publico'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const espiarLog = () => vi.spyOn(console, 'error').mockImplementation(() => {})

describe('variavel', () => {
  it('devolve o valor quando existe', () => {
    vi.stubEnv('SUPABASE_PORTA', 'segredo-de-teste')
    expect(variavel('SUPABASE_PORTA')).toBe('segredo-de-teste')
  })
  it.each(['', '   '])('vazia (%j) lanca erro com o nome', (valor) => {
    vi.stubEnv('SUPABASE_PORTA', valor)
    expect(() => variavel('SUPABASE_PORTA')).toThrow('Falta a variável de ambiente SUPABASE_PORTA')
  })
  it('as variaveis do pagamento lancam o nome quando faltam', () => {
    for (const nome of ['NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', 'MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET', 'TAREFAS_SEGREDO'] as const) {
      vi.stubEnv(nome, '')
      expect(() => variavel(nome)).toThrow(`Falta a variável de ambiente ${nome}`)
    }
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
  it('sem codigo, com status, diz o status HTTP (0 e nem houve resposta)', () => {
    const log = espiarLog()
    expect(falhaDoBanco('catalogo', { code: '' }, 503).message).toBe('Falha no banco (catalogo): HTTP 503')
    expect(log).toHaveBeenCalledWith('Falha do Supabase', { onde: 'catalogo', code: null, status: 503, name: null })
    expect(falhaDoBanco('catalogo', null, 0).message).toBe('Falha no banco (catalogo): HTTP 0')
  })
  it('o codigo manda sobre o status', () => {
    expect(falhaDoBanco('catalogo', { code: 'PGRST301' }, 401).message).toBe('Falha no banco (catalogo): PGRST301')
  })
  it('sem codigo e sem status, continua sem codigo', () => {
    expect(falhaDoBanco('catalogo', null).message).toBe('Falha no banco (catalogo): sem código')
  })
  it('registra a falha no log do servidor, sem a mensagem crua', () => {
    const log = espiarLog()
    falhaDoBanco('enderecos', { code: '23505', message: 'texto cru com maria@exemplo.com' } as never)
    expect(log).toHaveBeenCalledWith('Falha do Supabase', { onde: 'enderecos', code: '23505', status: null, name: null })
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/texto cru|maria|@/)
  })
})

describe('registrarFalha', () => {
  it('o lugar, o codigo, o status e o nome vao ao log; a mensagem crua e o e-mail, nunca', () => {
    const log = espiarLog()
    registrarFalha('entrar', {
      code: 'invalid_credentials',
      status: 400,
      name: 'AuthApiError',
      message: 'Invalid login credentials for maria@exemplo.com',
      email: 'maria@exemplo.com',
      token: 'token-secreto',
    })
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]).toEqual(['Falha do Supabase', { onde: 'entrar', code: 'invalid_credentials', status: 400, name: 'AuthApiError' }])
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Invalid login|maria|@|token-secreto/)
  })
  it.each([
    ['um e-mail no lugar do codigo', { code: 'maria@exemplo.com', status: 400, name: 'AuthApiError' }],
    ['texto com espaco', { code: 'texto cru do erro', status: '400', name: 'x'.repeat(80) }],
  ])('campo fora do formato curto (%s) nao entra', (_, erro) => {
    const log = espiarLog()
    registrarFalha('entrar', erro)
    const [, campos] = log.mock.calls[0] as [string, Record<string, unknown>]
    expect(campos.onde).toBe('entrar')
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/maria|texto cru|xxxxxxxxxx/)
  })
  it('erro que nao e objeto: so o lugar', () => {
    const log = espiarLog()
    registrarFalha('sair', 'texto cru com maria@exemplo.com')
    expect(log).toHaveBeenCalledWith('Falha do Supabase', { onde: 'sair', code: null, status: null, name: null })
  })
  it('ErroDeRegra: o codigo dele (curto e seguro) vai como code', () => {
    const log = espiarLog()
    registrarFalha('pagar_com_pix', new ErroDeRegra('passagem_invalida'))
    expect(log).toHaveBeenCalledWith('Falha do Supabase', { onde: 'pagar_com_pix', code: 'passagem_invalida', status: null, name: 'ErroDeRegra' })
  })
})

describe('criarClienteDoCatalogo', () => {
  it('toda chamada leva a porta e o cache de 5 minutos, sem sessao', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemplo.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
    vi.stubEnv('SUPABASE_PORTA', 'segredo-de-teste')
    const busca = vi.fn(async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', busca)

    await criarClienteDoCatalogo().from('loja').select('vendas_pausadas')

    const [url, opcoes] = busca.mock.calls[0] as unknown as [string, RequestInit & { next?: unknown }]
    expect(String(url)).toContain('https://exemplo.supabase.co/rest/v1/loja')
    expect(new Headers(opcoes.headers).get('x-amo-porta')).toBe('segredo-de-teste')
    expect(opcoes.next).toEqual({ revalidate: 300, tags: ['catalogo'] })
  })
})

describe('criarClienteDoVisitante', () => {
  it('toda chamada leva a porta e nao usa cache, sem sessao', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemplo.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
    vi.stubEnv('SUPABASE_PORTA', 'segredo-de-teste')
    const busca = vi.fn(async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', busca)

    await criarClienteDoVisitante().from('loja').select('vendas_pausadas')

    const [, opcoes] = busca.mock.calls[0] as unknown as [string, RequestInit & { next?: unknown }]
    expect(opcoes.cache).toBe('no-store')
    expect(opcoes.next).toBeUndefined()
    expect(new Headers(opcoes.headers).get('x-amo-porta')).toBe('segredo-de-teste')
  })
})

describe('mercadoPagoEmTeste', () => {
  it.each(['teste', ' teste '])('%j e teste', (valor) => {
    vi.stubEnv('MERCADOPAGO_AMBIENTE', valor)
    expect(mercadoPagoEmTeste()).toBe(true)
  })
  it.each(['', 'producao', 'TESTE'])('%j e producao', (valor) => {
    vi.stubEnv('MERCADOPAGO_AMBIENTE', valor)
    expect(mercadoPagoEmTeste()).toBe(false)
  })
  it('ausente e producao', () => {
    const anterior = process.env.MERCADOPAGO_AMBIENTE
    delete process.env.MERCADOPAGO_AMBIENTE
    try {
      expect(process.env.MERCADOPAGO_AMBIENTE).toBeUndefined()
      expect(mercadoPagoEmTeste()).toBe(false)
    } finally {
      if (anterior !== undefined) process.env.MERCADOPAGO_AMBIENTE = anterior
    }
  })
})

describe('chavePublicaDoMercadoPago', () => {
  it('devolve a chave publica, sem os espacos', () => {
    vi.stubEnv('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', ' TEST-chave-publica ')
    expect(chavePublicaDoMercadoPago()).toBe('TEST-chave-publica')
  })
  it.each(['', '   '])('%j e null', (valor) => {
    vi.stubEnv('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', valor)
    expect(chavePublicaDoMercadoPago()).toBeNull()
  })
  it('ausente e null', () => {
    vi.stubEnv('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', undefined)
    expect(chavePublicaDoMercadoPago()).toBeNull()
  })
})
