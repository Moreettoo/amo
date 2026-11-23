import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambientesCombinam, cozinha, uberConfigurada, uberEmTeste, variavel } from '@/lib/dados/ambiente'

const CREDENCIAIS = ['UBER_DIRECT_CUSTOMER_ID', 'UBER_DIRECT_CLIENT_ID', 'UBER_DIRECT_CLIENT_SECRET'] as const

function credenciais(valor = 'x') {
  for (const nome of CREDENCIAIS) vi.stubEnv(nome, valor)
}

const BASE = {
  logradouro: 'Rua das Flores',
  numero: '123',
  complemento: 'Loja 2',
  bairro: 'Centro',
  cidade: 'Sao Paulo',
  uf: 'sp',
  cep: '01310-100',
  telefone: '+55 11 91234-5678',
}

function cozinhaCom(extra: Record<string, unknown> = {}) {
  vi.stubEnv('COZINHA_ENDERECO', JSON.stringify({ ...BASE, ...extra }))
}

afterEach(() => vi.unstubAllEnvs())

describe('uberConfigurada', () => {
  it('verdadeiro com as tres credenciais', () => {
    credenciais()
    expect(uberConfigurada()).toBe(true)
  })
  it.each(CREDENCIAIS)('falso sem %s, vazia ou so com espacos', (nome) => {
    for (const valor of [undefined, '', '   ']) {
      credenciais()
      vi.stubEnv(nome, valor)
      expect(uberConfigurada()).toBe(false)
    }
  })
})

describe('uberEmTeste e ambientesCombinam', () => {
  it('so teste (aparado) liga o modo de teste', () => {
    vi.stubEnv('UBER_DIRECT_AMBIENTE', ' teste ')
    expect(uberEmTeste()).toBe(true)
    for (const v of ['producao', 'TESTE', '']) {
      vi.stubEnv('UBER_DIRECT_AMBIENTE', v)
      expect(uberEmTeste()).toBe(false)
    }
    vi.stubEnv('UBER_DIRECT_AMBIENTE', undefined)
    expect(uberEmTeste()).toBe(false)
  })
  it.each([
    ['teste', 'teste', true],
    ['teste', 'producao', false],
    ['producao', 'teste', false],
    ['producao', 'producao', true],
  ])('uber %s e Mercado Pago %s combinam: %s', (uber, mp, esperado) => {
    vi.stubEnv('UBER_DIRECT_AMBIENTE', uber)
    vi.stubEnv('MERCADOPAGO_AMBIENTE', mp)
    expect(ambientesCombinam()).toBe(esperado)
  })
})

describe('variavel', () => {
  it('aceita as variaveis da Uber e da cozinha, e erra so com o nome', () => {
    vi.stubEnv('UBER_DIRECT_WEBHOOK_SECRET', 'valor-secreto')
    expect(variavel('UBER_DIRECT_WEBHOOK_SECRET')).toBe('valor-secreto')
    vi.stubEnv('UBER_DIRECT_WEBHOOK_SECRET', '  ')
    expect(() => variavel('UBER_DIRECT_WEBHOOK_SECRET')).toThrow(/UBER_DIRECT_WEBHOOK_SECRET/)
  })
})

describe('cozinha', () => {
  it('devolve o objeto com o endereco normalizado', () => {
    cozinhaCom()
    expect(cozinha()).toEqual({
      nome: 'AMO Sabores Saudáveis',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        complemento: 'Loja 2',
        bairro: 'Centro',
        cidade: 'Sao Paulo',
        uf: 'SP',
        cep: '01310100',
      },
      telefone: '11912345678',
    })
  })
  it('aceita o CEP so com 8 digitos e o complemento vazio', () => {
    cozinhaCom({ cep: '01310100', complemento: '' })
    expect(cozinha().endereco.cep).toBe('01310100')
    expect(cozinha().endereco.complemento).toBe('')
  })
  it.each([
    ['com +55', '+55 11 91234-5678', '11912345678'],
    ['com 55 solto', '5511912345678', '11912345678'],
    ['fixo com 55', '551133334444', '1133334444'],
    ['sem o codigo do pais', '(11) 91234-5678', '11912345678'],
    ['fixo sem o codigo', '11 3333-4444', '1133334444'],
  ])('telefone %s', (_nome, entrada, esperado) => {
    cozinhaCom({ telefone: entrada })
    expect(cozinha().telefone).toBe(esperado)
  })

  const INVALIDOS: [string, () => void][] = [
    ['ausente', () => vi.stubEnv('COZINHA_ENDERECO', undefined)],
    ['vazio', () => vi.stubEnv('COZINHA_ENDERECO', '  ')],
    ['JSON quebrado', () => vi.stubEnv('COZINHA_ENDERECO', '{"logradouro":"Rua Segredo 77", quebrado')],
    ['JSON que nao e objeto', () => vi.stubEnv('COZINHA_ENDERECO', '["Rua Segredo 77"]')],
    ['CEP de 7 digitos', () => cozinhaCom({ cep: '1310100', logradouro: 'Rua Segredo 77' })],
    ['CEP com letras', () => cozinhaCom({ cep: '0131A-100' })],
    ['telefone com letras', () => cozinhaCom({ telefone: '11 9AAAA-5678' })],
    ['telefone curto', () => cozinhaCom({ telefone: '1191234' })],
    ['telefone longo demais', () => cozinhaCom({ telefone: '551191234567890' })],
    ['UF de 3 letras', () => cozinhaCom({ uf: 'SPP' })],
    ['UF com digito', () => cozinhaCom({ uf: 'S1' })],
    ['logradouro curto', () => cozinhaCom({ logradouro: 'R' })],
    ['logradouro longo', () => cozinhaCom({ logradouro: 'a'.repeat(121) })],
    ['complemento longo', () => cozinhaCom({ complemento: 'a'.repeat(61) })],
    ['bairro vazio', () => cozinhaCom({ bairro: '   ' })],
    ['cidade curta', () => cozinhaCom({ cidade: 'S' })],
    ['numero fora do padrao', () => cozinhaCom({ numero: '12345678901' })],
    ['campo faltando', () => vi.stubEnv('COZINHA_ENDERECO', JSON.stringify({ ...BASE, numero: undefined }))],
    ['campo que nao e texto', () => cozinhaCom({ numero: 123 })],
    ['caractere proibido', () => cozinhaCom({ bairro: 'Cen<tro>' })],
  ]
  it.each(INVALIDOS)('invalido (%s) lanca so a mensagem fixa, sem o valor', (_nome, preparar) => {
    preparar()
    let erro: unknown
    try {
      cozinha()
    } catch (e) {
      erro = e
    }
    expect(erro).toBeInstanceOf(Error)
    expect((erro as Error).constructor).toBe(Error)
    expect((erro as Error).message).toBe('COZINHA_ENDERECO invalido')
  })
  it('a mensagem nao repete nenhum pedaco do valor', () => {
    vi.stubEnv('COZINHA_ENDERECO', '{"logradouro":"Rua Segredo 77", quebrado')
    expect(() => cozinha()).toThrow(/^COZINHA_ENDERECO invalido$/)
    cozinhaCom({ cep: '1310100', logradouro: 'Rua Segredo 77' })
    try {
      cozinha()
    } catch (e) {
      expect((e as Error).message).not.toMatch(/Segredo|1310100|Rua/)
    }
  })
})
