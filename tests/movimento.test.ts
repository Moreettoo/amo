import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Guardas estaticos do CSS. O hero em branco da v1.1 nasceu de estado
 * inicial escondido que podia ficar preso; aqui a forma do CSS impede isso:
 * todo estado escondido mora num arquivo so, atras de `html.js` e de
 * prefers-reduced-motion: no-preference.
 */
const pasta = resolve(import.meta.dirname, '../src/app/estilos')
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const ler = (nome: string) => semComentarios(readFileSync(resolve(pasta, nome), 'utf8'))
const KEYFRAMES = /@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g

const movimento = ler('movimento.css')
const outros = readdirSync(pasta)
  .filter((n) => n.endsWith('.css') && n !== 'movimento.css')
  .map((n) => ({ nome: n, css: ler(n) }))
const globais = semComentarios(readFileSync(resolve(pasta, '../globals.css'), 'utf8'))
const todos = [{ nome: 'movimento.css', css: movimento }, { nome: 'globals.css', css: globais }, ...outros]

function blocoDoPortao(): string {
  const resto = movimento.replace(KEYFRAMES, '').trim()
  const m = resto.match(/^@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*)\}$/)
  expect(m, 'fora dos @keyframes, movimento.css só pode ter o bloco no-preference').toBeTruthy()
  return m![1]
}

describe('movimento.css', () => {
  it('só tem @keyframes e um único bloco prefers-reduced-motion: no-preference', () => {
    blocoDoPortao()
  })

  it('toda regra do bloco começa por html.js', () => {
    const regras = [...blocoDoPortao().matchAll(/([^{}]+)\{[^{}]*\}/g)]
    expect(regras.length).toBeGreaterThan(10)
    for (const [, seletores] of regras) {
      for (const s of seletores.split(',')) expect(s.trim(), s).toMatch(/^html\.js /)
    }
  })

  it('os @keyframes só mexem em transform, opacity, clip-path e stroke-dashoffset', () => {
    const permitidas = new Set(['transform', 'opacity', 'clip-path', 'stroke-dashoffset'])
    const quadros = [...movimento.matchAll(KEYFRAMES)]
    expect(quadros.length).toBeGreaterThanOrEqual(10)
    for (const [, nome, corpo] of quadros) {
      for (const [, prop] of corpo.matchAll(/([a-z-]+)\s*:/g)) {
        expect(permitidas.has(prop), `${nome}: ${prop}`).toBe(true)
      }
    }
  })

  it('os outros arquivos não declaram @keyframes', () => {
    for (const { nome, css } of [...outros, { nome: 'globals.css', css: globais }]) {
      expect(css, nome).not.toMatch(/@keyframes/)
    }
  })
})

describe('todo o CSS', () => {
  it('nenhuma animação passa de 2 s somando duração e atraso', () => {
    const segundos = (v: string) => (v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v))
    for (const { nome, css } of todos) {
      for (const [, valor] of css.matchAll(/(?<![-\w])animation:\s*([^;]+);/g)) {
        const tempos = [...valor.matchAll(/(\d*\.?\d+)(ms|s)\b/g)].map((m) => segundos(m[0]))
        expect(tempos.length, `${nome}: ${valor}`).toBeGreaterThan(0)
        expect((tempos[0] ?? 0) + (tempos[1] ?? 0), `${nome}: ${valor}`).toBeLessThanOrEqual(2)
      }
      expect(css, `${nome}: atraso fora do shorthand`).not.toMatch(/animation-delay/)
    }
  })

  it('nada em loop', () => {
    for (const { nome, css } of todos) expect(css, nome).not.toMatch(/infinite/)
  })

  it('cobre puro só é cor de texto no "comer bem." do hero', () => {
    const seletores = outros.flatMap(({ css }) =>
      [...css.matchAll(/([^{}]+)\{[^{}]*?(?<![-\w])color:\s*var\(--color-cobre\)[^{}]*\}/g)].map((m) =>
        m[1].trim(),
      ),
    )
    expect(seletores.filter((s) => s !== '.hero__titulo em')).toEqual([])
  })

  it('efeito de mouse só dentro de @media (hover: hover)', () => {
    for (const { nome, css } of outros) {
      const foraDoHover = css.replace(/@media \(hover: hover\) \{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
      expect(foraDoHover, nome).not.toMatch(/:hover/)
    }
  })
})
