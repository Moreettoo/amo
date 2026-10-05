import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { contraste, lerTokens } from '@/lib/contraste'

const css = readFileSync(resolve(import.meta.dirname, '../src/app/globals.css'), 'utf8')
const t = lerTokens(css)

describe('tokens de cor', () => {
  it('define os 7 tokens com os hex exatos da spec', () => {
    expect(t).toMatchObject({
      cream: '#FAF2E9',
      sage: '#C3CDB4',
      sand: '#DCC9A8',
      ink: '#2E241F',
      rosewood: '#B9707A',
      'rosewood-forte': '#9B5E66',
      blush: '#D9ACA6',
    })
  })
})

describe('contraste de texto, WCAG AA', () => {
  const normal = 4.5
  it.each([
    ['ink', 'sage'],
    ['ink', 'cream'],
    ['ink', 'sand'],
    ['ink', 'blush'],
    ['cream', 'ink'],
    ['cream', 'rosewood-forte'],
  ])('%s sobre %s passa 4.5:1 para texto normal', (fg, bg) => {
    expect(contraste(t[fg], t[bg])).toBeGreaterThanOrEqual(normal)
  })

  it('cream sobre rosewood passa 3:1, o limite de texto grande', () => {
    const r = contraste(t.cream, t.rosewood)
    expect(r).toBeGreaterThanOrEqual(3)
    expect(r).toBeLessThan(4.5)
  })
})

describe('anel de foco', () => {
  it.each(['cream', 'sage', 'sand', 'ink'])(
    'rosewood-forte passa 3:1 sobre %s',
    (bg) => {
      expect(contraste(t['rosewood-forte'], t[bg])).toBeGreaterThanOrEqual(3)
    },
  )

  it('rosewood puro reprovaria sobre sage, por isso existe o forte', () => {
    expect(contraste(t.rosewood, t.sage)).toBeLessThan(3)
  })
})
