import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { contraste, lerTokens } from '@/lib/contraste'

const css = readFileSync(resolve(import.meta.dirname, '../src/app/globals.css'), 'utf8')
const t = lerTokens(css)

describe('tokens de cor', () => {
  it('define os 12 tokens com os hex exatos da spec', () => {
    expect(t).toEqual({
      expresso: '#2B1B16',
      chocolate: '#4A2E25',
      cobre: '#C9784A',
      'cobre-texto': '#9A5530',
      caramelo: '#E2BF96',
      creme: '#FAF2E9',
      papel: '#FFFBF5',
      linho: '#F6EBDD',
      kraft: '#D9BE98',
      suave: '#5E4A40',
      'claro-suave': '#EADDD0',
      vinho: '#8E2F3C',
    })
  })

  it('não sobra token da v1', () => {
    expect(css).not.toMatch(/--color-(cream|sage|sand|ink|rosewood|blush)\b/)
  })
})

describe('contraste de texto, WCAG AA (spec §9.2)', () => {
  it.each([
    ['expresso', 'creme'],
    ['expresso', 'papel'],
    ['expresso', 'linho'],
    ['expresso', 'kraft'],
    ['expresso', 'caramelo'],
    ['expresso', 'cobre'],
    ['chocolate', 'caramelo'],
    ['chocolate', 'kraft'],
    ['chocolate', 'papel'],
    ['suave', 'creme'],
    ['suave', 'papel'],
    ['suave', 'linho'],
    ['suave', 'kraft'],
    ['cobre-texto', 'creme'],
    ['cobre-texto', 'papel'],
    ['cobre-texto', 'linho'],
    ['creme', 'expresso'],
    ['claro-suave', 'expresso'],
    ['caramelo', 'expresso'],
    ['cobre', 'expresso'],
    ['papel', 'vinho'],
    ['papel', 'chocolate'],
    ['vinho', 'papel'],
  ])('%s sobre %s passa 4.5:1', (texto, fundo) => {
    expect(contraste(t[texto], t[fundo])).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['cobre-texto', 'kraft'],
    ['cobre-texto', 'caramelo'],
    ['cobre', 'creme'],
    ['cobre', 'caramelo'],
  ])('%s sobre %s reprova, por isso é proibido como texto', (texto, fundo) => {
    expect(contraste(t[texto], t[fundo])).toBeLessThan(4.5)
  })
})

describe('anel de foco (spec §9.3)', () => {
  it('é uma variável que aponta para expresso, e cobre nas superfícies escuras', () => {
    expect(css).toMatch(/--foco:\s*var\(--color-expresso\)/)
    expect(css).toMatch(/\.superficie-escura\s*\{\s*--foco:\s*var\(--color-cobre\)/)
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2\.5px solid var\(--foco\)/)
  })

  it.each(['creme', 'papel', 'linho', 'kraft', 'caramelo', 'cobre'])(
    'expresso passa 3:1 sobre %s',
    (fundo) => {
      expect(contraste(t.expresso, t[fundo])).toBeGreaterThanOrEqual(3)
    },
  )

  it('cobre passa 3:1 sobre expresso', () => {
    expect(contraste(t.cobre, t.expresso)).toBeGreaterThanOrEqual(3)
  })

  it('cobre reprovaria sobre caramelo, por isso o foco não é cobre em toda parte', () => {
    expect(contraste(t.cobre, t.caramelo)).toBeLessThan(3)
  })
})
