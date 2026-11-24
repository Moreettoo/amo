// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { enderecoDaUber, telefoneDaUber } from '@/lib/uber/endereco'
import type { EnderecoUber } from '@/lib/uber/endereco'

const base: EnderecoUber = {
  logradouro: 'Rua das Flores',
  numero: '123',
  complemento: 'Apto 4',
  bairro: 'Centro',
  cidade: 'São Paulo',
  uf: 'SP',
  cep: '01310100',
}

describe('enderecoDaUber', () => {
  it('com complemento: a string exata da decisao 7', () => {
    expect(enderecoDaUber(base)).toBe(
      '{"street_address":["Rua das Flores, 123","Apto 4 - Centro"],"city":"São Paulo","state":"SP","zip_code":"01310-100","country":"BR"}',
    )
  })

  it('sem complemento (vazio ou so espacos): o segundo item e so o bairro', () => {
    const esperado =
      '{"street_address":["Rua das Flores, 123","Centro"],"city":"São Paulo","state":"SP","zip_code":"01310-100","country":"BR"}'
    expect(enderecoDaUber({ ...base, complemento: '' })).toBe(esperado)
    expect(enderecoDaUber({ ...base, complemento: '   ' })).toBe(esperado)
  })

  it('a mesma entrada da a mesma string, byte a byte', () => {
    const a = enderecoDaUber(base)
    const b = enderecoDaUber({ ...base })
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)
  })

  it('aspas e barras sao escapadas pelo JSON.stringify e a volta e fiel', () => {
    const s = enderecoDaUber({ ...base, logradouro: 'Rua "Azul" \\ Verde' })
    expect(s).toContain('\\"Azul\\"')
    expect(JSON.parse(s).street_address[0]).toBe('Rua "Azul" \\ Verde, 123')
  })

  it('o CEP com hifen ou so digitos vira 12345-678', () => {
    expect(JSON.parse(enderecoDaUber({ ...base, cep: '01310-100' })).zip_code).toBe('01310-100')
  })

  it('CEP que nao tem 8 digitos lanca (o cliente trata)', () => {
    expect(() => enderecoDaUber({ ...base, cep: '123' })).toThrow()
  })
})

describe('telefoneDaUber', () => {
  it('poe +55 na frente de 10 ou 11 digitos', () => {
    expect(telefoneDaUber('11999998888')).toBe('+5511999998888')
    expect(telefoneDaUber('1133334444')).toBe('+551133334444')
  })

  it('recusa outro tamanho ou o que nao e digito', () => {
    expect(() => telefoneDaUber('999')).toThrow()
    expect(() => telefoneDaUber('5511999998888')).toThrow()
    expect(() => telefoneDaUber('11 99999-8888')).toThrow()
  })
})
