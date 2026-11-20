import { describe, expect, it } from 'vitest'
import {
  conferirCodigo,
  conferirEmail,
  conferirPerfil,
  conferirSenha,
  conferirSenhaAtual,
} from '@/lib/conta/regras'
import { HOSTIS } from './fixtures/hostis'

const camposComErro = (r: ReturnType<typeof conferirPerfil>) => (r.ok ? [] : Object.keys(r.erros))
const CONTROLE_OU_TAG = /[\u0000-\u001f\u007f<>]/

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
