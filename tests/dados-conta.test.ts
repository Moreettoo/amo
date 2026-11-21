// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarCep } from '@/lib/dados/cep'
import { ErroDeRegra, erroDoBanco } from '@/lib/dados/erros'
import { rastreioSeguro } from '@/lib/dados/pedidos'

/**
 * A camada de dados da conta sem banco: o que e puro e a chamada ao ViaCEP
 * com o fetch trocado. O resto e provado contra o banco em tests/banco/conta.
 */

afterEach(() => vi.unstubAllGlobals())
const responder = (corpo: unknown, status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(corpo), { status })),
  )

describe('erroDoBanco', () => {
  it('P0001 com codigo curto vira ErroDeRegra', () => {
    const e = erroDoBanco('enderecos', { code: 'P0001', message: 'limite_de_enderecos' })
    expect(e).toBeInstanceOf(ErroDeRegra)
    expect((e as ErroDeRegra).codigo).toBe('limite_de_enderecos')
  })

  it.each([
    [{ code: 'P0001', message: 'Texto solto que nao e codigo' }],
    [{ code: '42501', message: 'permission denied for table perfis' }],
    [{ code: 'P0001', message: 'a'.repeat(80) }],
    [null],
  ])('o resto (%j) vira falha generica, sem a mensagem crua', (erro) => {
    const e = erroDoBanco('enderecos', erro)
    expect(e).not.toBeInstanceOf(ErroDeRegra)
    expect(e.message).toMatch(/^Falha no banco \(enderecos\): /)
    expect(e.message).not.toMatch(/permission|Texto solto|aaaa/)
  })
})

describe('buscarCep', () => {
  it('devolve o endereco do CEP', async () => {
    responder({ logradouro: 'Rua Cuiabá', bairro: 'Alto da Mooca', localidade: 'São Paulo', uf: 'SP' })
    expect(await buscarCep('03183002')).toEqual({ logradouro: 'Rua Cuiabá', bairro: 'Alto da Mooca', cidade: 'São Paulo', uf: 'SP' })
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe('https://viacep.com.br/ws/03183002/json/')
    const opcoes = vi.mocked(fetch).mock.calls[0][1]
    expect(opcoes?.cache).toBe('no-store')
    expect(opcoes?.signal).toBeInstanceOf(AbortSignal)
  })

  it.each(['0318300', '03183-002', '03183002/../x', 'abcdefgh', ''])('CEP fora do formato (%j) nem sai do servidor', async (cep) => {
    responder({})
    expect(await buscarCep(cep)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('CEP que nao existe, erro do servico e falha de rede viram null', async () => {
    responder({ erro: 'true' })
    expect(await buscarCep('99999999')).toBeNull()
    responder({}, 500)
    expect(await buscarCep('03183002')).toBeNull()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('tempo esgotado')
      }),
    )
    expect(await buscarCep('03183002')).toBeNull()
    responder('nao e um objeto')
    expect(await buscarCep('03183002')).toBeNull()
  })

  it('limpa e corta o que o servico devolve; UF fora das 27 vira null', async () => {
    responder({ logradouro: `<b>Rua</b>\u0000 ${'a'.repeat(200)}`, bairro: 'Centro', localidade: 'São Paulo', uf: 'ZZ' })
    expect(await buscarCep('03183002')).toBeNull()
    responder({ logradouro: `<b>Rua</b>\u0000 ${'a'.repeat(200)}`, bairro: 'Centro', localidade: 'São Paulo', uf: 'SP' })
    const r = await buscarCep('03183002')
    expect(r?.logradouro).not.toMatch(/[<>\u0000]/)
    expect(r?.logradouro.length).toBeLessThanOrEqual(120)
  })

  it('tira o controle C1 do que o servico devolve', async () => {
    responder({ logradouro: 'RuaCuiabá', bairro: 'Centro', localidade: 'São Paulo', uf: 'SP' })
    expect((await buscarCep('03183002'))?.logradouro).toBe('RuaCuiabá')
  })

  it('CEP de cidade inteira (sem rua) devolve rua e bairro vazios', async () => {
    responder({ logradouro: '', bairro: '', localidade: 'Itu', uf: 'SP' })
    expect(await buscarCep('13300000')).toEqual({ logradouro: '', bairro: '', cidade: 'Itu', uf: 'SP' })
  })
})

describe('rastreioSeguro', () => {
  it.each([
    ['https://uber.com/track/abc', 'https://uber.com/track/abc'],
    ['https://www.uber.com/t/1', 'https://www.uber.com/t/1'],
    ['https://m.uber.com/ul/?x=1', 'https://m.uber.com/ul/?x=1'],
  ])('%s passa', (url, esperado) => {
    expect(rastreioSeguro(url)).toBe(esperado)
  })

  it.each([
    ['http://uber.com/track'],
    ['https://uber.com.golpe.io/track'],
    ['https://golpeuber.com/track'],
    ['javascript:alert(1)'],
    ['https://user@evil.com'],
    ['nao e url'],
    [null],
  ])('%j vira null', (url) => {
    expect(rastreioSeguro(url)).toBeNull()
  })
})
