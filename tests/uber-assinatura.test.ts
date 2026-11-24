import { createHmac } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { conferirAssinaturaUber } from '@/lib/uber/assinatura'

describe('os modulos da Uber', () => {
  const PASTA = resolve(import.meta.dirname, '../src/lib/uber')
  it.each(readdirSync(PASTA).filter((f) => f.endsWith('.ts')))('%s comeca com server-only', (arquivo) => {
    expect(readFileSync(join(PASTA, arquivo), 'utf8').split(/\r?\n/)[0]).toBe("import 'server-only'")
  })
})

const SEGREDO = 'segredo-de-teste'
const CORPO = '{"kind":"event.delivery_status","note":"a&b"}'
const hex = (c: string) => createHmac('sha256', SEGREDO).update(c, 'utf8').digest('hex')

describe('assinatura da Uber', () => {
  it('aceita o hex minusculo do corpo cru', () => {
    expect(conferirAssinaturaUber(CORPO, hex(CORPO), SEGREDO)).toBe(true)
  })
  it('o mesmo corpo com \\u0026 no lugar de & tem outra assinatura (nunca reserializa)', () => {
    const outro = CORPO.replace('&', '\\u0026')
    expect(outro).not.toBe(CORPO)
    expect(conferirAssinaturaUber(outro, hex(CORPO), SEGREDO)).toBe(false)
    expect(conferirAssinaturaUber(outro, hex(outro), SEGREDO)).toBe(true)
  })
  it('maiusculas, tamanho errado, vazia e null sao falsas', () => {
    expect(conferirAssinaturaUber(CORPO, hex(CORPO).toUpperCase(), SEGREDO)).toBe(false)
    expect(conferirAssinaturaUber(CORPO, hex(CORPO).slice(1), SEGREDO)).toBe(false)
    expect(conferirAssinaturaUber(CORPO, '', SEGREDO)).toBe(false)
    expect(conferirAssinaturaUber(CORPO, null, SEGREDO)).toBe(false)
  })
  it('segredo errado e falso', () => {
    expect(conferirAssinaturaUber(CORPO, hex(CORPO), 'outro')).toBe(false)
  })
})
