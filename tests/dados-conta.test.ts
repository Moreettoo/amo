// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarCep } from '@/lib/dados/cep'
import { ErroDeRegra, erroDoBanco } from '@/lib/dados/erros'
import { pixPendenteDe, rastreioSeguro } from '@/lib/dados/pedidos'

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
    responder({ logradouro: 'Rua\u0085Cuiabá', bairro: 'Centro', localidade: 'São Paulo', uf: 'SP' })
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

describe('pixPendenteDe', () => {
  const agora = Date.parse('2026-11-21T12:00:00Z')
  const pix = (extra: Record<string, unknown> = {}) => ({
    forma: 'pix',
    status: 'pendente',
    criado_em: '2026-11-21T11:50:00Z',
    pix_copia_e_cola: '000201abc',
    pix_qr_base64: 'QUJD',
    pix_expira_em: '2026-11-21T12:30:00Z',
    ...extra,
  })

  it('aguardando, ultima tentativa Pix pendente com QR: devolve o codigo', () => {
    expect(pixPendenteDe('aguardando_pagamento', [pix()], agora)).toEqual({ copiaECola: '000201abc', qrBase64: 'QUJD', expiraEm: '2026-11-21T12:30:00Z' })
  })

  it('so a ultima tentativa conta', () => {
    const velha = pix({ criado_em: '2026-11-21T11:00:00Z', pix_copia_e_cola: 'velho' })
    expect(pixPendenteDe('aguardando_pagamento', [velha, pix()], agora)?.copiaECola).toBe('000201abc')
    expect(pixPendenteDe('aguardando_pagamento', [pix(), pix({ criado_em: '2026-11-21T11:55:00Z', status: 'recusado' })], agora)).toBeNull()
  })

  it.each([
    ['pedido pago', 'pago', [pix({ status: 'aprovado' })]],
    ['tentativa de cartao', 'aguardando_pagamento', [pix({ forma: 'cartao' })]],
    ['Pix sem QR', 'aguardando_pagamento', [pix({ pix_qr_base64: null })]],
    ['Pix sem copia e cola', 'aguardando_pagamento', [pix({ pix_copia_e_cola: null })]],
    ['Pix expirado', 'aguardando_pagamento', [pix({ pix_expira_em: '2026-11-21T11:59:00Z' })]],
    ['sem tentativas', 'aguardando_pagamento', []],
  ])('%s: null', (_, estado, tentativas) => {
    expect(pixPendenteDe(estado as string, tentativas as never, agora)).toBeNull()
  })
})
