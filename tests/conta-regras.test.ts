import { describe, expect, it } from 'vitest'
import {
  UFS,
  conferirCodigo,
  conferirEmail,
  conferirEndereco,
  conferirNumeroDoPedido,
  conferirPerfil,
  conferirSenha,
  conferirSenhaAtual,
} from '@/lib/conta/regras'
import { HOSTIS } from './fixtures/hostis'

const endereco = {
  apelido: 'Casa',
  cep: '03183-002',
  logradouro: 'Rua Cuiabá',
  numero: '412',
  complemento: 'apto 31',
  bairro: 'Alto da Mooca',
  cidade: 'São Paulo',
  uf: 'SP',
  principal: 'on',
}

describe('conferirEndereco', () => {
  it('aceita o endereco completo e tira a mascara do CEP', () => {
    expect(conferirEndereco(endereco)).toEqual({
      ok: true,
      valor: {
        apelido: 'Casa',
        cep: '03183002',
        logradouro: 'Rua Cuiabá',
        numero: '412',
        complemento: 'apto 31',
        bairro: 'Alto da Mooca',
        cidade: 'São Paulo',
        uf: 'SP',
        principal: true,
      },
    })
  })

  it('apelido vazio vira nulo, complemento vazio vale, principal ausente e falso', () => {
    const r = conferirEndereco({ ...endereco, apelido: ' ', complemento: '', principal: null })
    expect(r.ok && [r.valor.apelido, r.valor.complemento, r.valor.principal]).toEqual([null, '', false])
  })

  it('recusa controle C1 no nome e no logradouro', () => {
    const p = conferirPerfil({ nome: 'AnaMaria', celular: '11987654321' })
    expect(p.ok).toBe(false)
    expect(camposComErro(p)).toContain('nome')
    const e = conferirEndereco({ ...endereco, logradouro: 'RuaA' })
    expect(e.ok).toBe(false)
    expect(camposComErro(e as never)).toContain('logradouro')
  })

  it('apara e junta espacos em todo texto', () => {
    const r = conferirEndereco({ ...endereco, logradouro: '  Rua   Cuiabá ', bairro: ' Alto  da Mooca ' })
    expect(r.ok && [r.valor.logradouro, r.valor.bairro]).toEqual(['Rua Cuiabá', 'Alto da Mooca'])
  })

  it.each([
    ['cep', '0318300'],
    ['cep', '03183-0021'],
    ['logradouro', 'R'],
    ['logradouro', 'a'.repeat(121)],
    ['numero', '-12'],
    ['numero', '12345678901'],
    ['numero', ''],
    ['complemento', 'a'.repeat(61)],
    ['bairro', ''],
    ['bairro', 'a'.repeat(61)],
    ['cidade', 'S'],
    ['uf', 'XX'],
    ['uf', 'sp'],
    ['apelido', 'a'.repeat(31)],
    ['logradouro', null],
  ])('%s = %j e recusado, e so esse campo', (campo, valor) => {
    const r = conferirEndereco({ ...endereco, [campo]: valor })
    expect(r.ok === false && Object.keys(r.erros)).toEqual([campo])
  })

  it('numero aceita letra, barra, traco e espaco depois do primeiro caractere', () => {
    expect(conferirEndereco({ ...endereco, numero: '12 B' }).ok).toBe(true)
    expect(conferirEndereco({ ...endereco, numero: 'S/N' }).ok).toBe(true)
    expect(conferirEndereco({ ...endereco, numero: '1200-A' }).ok).toBe(true)
  })

  it.each(HOSTIS.map((h) => [h.slice(0, 40), h]))('logradouro hostil %j nunca passa com controle, < ou >', (_, hostil) => {
    const r = conferirEndereco({ ...endereco, logradouro: hostil })
    if (r.ok) expect(r.valor.logradouro).not.toMatch(/[\u0000-\u001f\u007f-\u009f<>]/)
    if (r.ok) expect(r.valor.logradouro.length).toBeLessThanOrEqual(120)
  })

  it('UFS sao as 27, em siglas', () => {
    expect(UFS).toHaveLength(27)
    expect(new Set(UFS).size).toBe(27)
    for (const uf of UFS) expect(uf).toMatch(/^[A-Z]{2}$/)
  })
})

describe('conferirNumeroDoPedido', () => {
  it('so o formato do banco', () => {
    expect(conferirNumeroDoPedido('AMO-2B7KQ9XZ')).toBe('AMO-2B7KQ9XZ')
    for (const ruim of ['amo-2B7KQ9XZ', 'AMO-2B7KQ9X', 'AMO-2B7KQ9XI', 'AMO-2B7KQ9X0', "AMO-2B7KQ9XZ' or 1=1", ' AMO-2B7KQ9XZ', null, 12]) {
      expect(conferirNumeroDoPedido(ruim)).toBeNull()
    }
  })

  it.each(HOSTIS.map((h) => [h.slice(0, 40), h]))('numero hostil %j e recusado', (_, hostil) => {
    expect(conferirNumeroDoPedido(hostil)).toBeNull()
  })
})

const camposComErro = (r: ReturnType<typeof conferirPerfil>) => (r.ok ? [] : Object.keys(r.erros))
const CONTROLE_OU_TAG = /[\u0000-\u001f\u007f-\u009f<>]/

describe('conferirEmail', () => {
  it('apara e poe em minusculas', () => {
    expect(conferirEmail('  Maria@Exemplo.com ')).toBe('maria@exemplo.com')
  })
  it.each([['maria'], ['maria@exemplo'], ['ma ria@exemplo.com'], ['<a>@b.co'], [null], ['a'.repeat(321)]])(
    '%j e recusado',
    (email) => {
      expect(conferirEmail(email)).toBeNull()
    },
  )
})

describe('conferirPerfil', () => {
  it('apara, junta espacos e deixa o celular so com digitos', () => {
    expect(conferirPerfil({ nome: '  Maria   José ', celular: '(11) 98765-4321' })).toEqual({
      ok: true,
      valor: { nome: 'Maria José', celular: '11987654321' },
    })
  })
  it.each([['M'], ['a'.repeat(81)], [null]])('nome %j e recusado, e so ele', (nome) => {
    expect(camposComErro(conferirPerfil({ nome, celular: '11987654321' }))).toEqual(['nome'])
  })
  it.each([['1198765432'], ['11887654321'], ['11987654321x']])('celular %j e recusado, e so ele', (celular) => {
    expect(camposComErro(conferirPerfil({ nome: 'Maria', celular }))).toEqual(['celular'])
  })
})

describe('conferirSenha', () => {
  it.each(['12345678', ' com espaco '])('aceita %j sem aparar', (s) => {
    expect(conferirSenha(s)).toBe(s)
  })
  it.each([['1234567'], ['a'.repeat(73)], ['abcd\u0000efgh'], [null]])('recusa %j', (s) => {
    expect(conferirSenha(s)).toBeNull()
  })
  it('a senha atual aceita qualquer tamanho de 1 a 72', () => {
    expect(conferirSenhaAtual('abc')).toBe('abc')
    expect(conferirSenhaAtual('')).toBeNull()
    expect(conferirSenhaAtual('a'.repeat(73))).toBeNull()
  })
})

describe('conferirCodigo', () => {
  it.each(['123456', '123 456', ' 123-456 '])('%j vira 123456', (c) => {
    expect(conferirCodigo(c)).toBe('123456')
  })
  it.each([['12345'], ['1234567'], ['12a456'], [null]])('recusa %j', (c) => {
    expect(conferirCodigo(c)).toBeNull()
  })
})

describe('entrada hostil', () => {
  it.each(HOSTIS.map((h) => [h.slice(0, 30), h]))('%j: recusa ou texto ao pe da letra, nunca excecao', (_, hostil) => {
    expect(() => conferirEmail(hostil)).not.toThrow()
    expect(conferirEmail(hostil)).toBeNull()
    expect(conferirCodigo(hostil)).toBeNull()
    const perfil = conferirPerfil({ nome: hostil, celular: '11987654321' })
    if (perfil.ok) expect(perfil.valor.nome).not.toMatch(CONTROLE_OU_TAG)
    const senha = conferirSenha(hostil)
    if (senha !== null) expect(senha).toBe(hostil)
  })
})
