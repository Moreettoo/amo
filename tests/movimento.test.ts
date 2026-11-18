import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DURACAO_SAIDA } from '@/components/layout/Gaveta'

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

  it('sem mola: nenhuma curva passa do ponto e volta', () => {
    // a borda ondulada da gaveta entrava com cubic-bezier(.34, 1.4, .64, 1);
    // y fora de 0 a 1 e o quique que o site novo nao tem
    for (const { nome, css } of todos) {
      for (const [curva, , y1, , y2] of css.matchAll(/cubic-bezier\(\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\s*\)/g)) {
        for (const y of [y1, y2]) {
          expect(Number(y), `${nome}: ${curva}`).toBeGreaterThanOrEqual(0)
          expect(Number(y), `${nome}: ${curva}`).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('todo @keyframes declarado é usado', () => {
    for (const [, nome] of movimento.matchAll(KEYFRAMES)) {
      expect(blocoDoPortao(), nome).toMatch(new RegExp(`animation:\\s*${nome}\\s`))
    }
  })

  it('cobre puro só é cor de texto na frase em script das superfícies escuras', () => {
    const seletores = outros.flatMap(({ css }) =>
      [...css.matchAll(/([^{}]+)\{[^{}]*?(?<![-\w])color:\s*var\(--color-cobre\)[^{}]*\}/g)].map((m) =>
        m[1].trim(),
      ),
    )
    // cobre sobre expresso mede 4.93:1; sobre creme, 3.02:1, e por isso o
    // script das superficies claras vai em cobre-texto
    // (o titulo de secao e o H1 do topo do catalogo e do 404)
    const escuras = ['.superficie-escura .titulo-secao em', '.superficie-escura .topo-catalogo__titulo em']
    expect(seletores.filter((s) => !escuras.includes(s))).toEqual([])
  })

  it('efeito de mouse só dentro de @media (hover: hover)', () => {
    for (const { nome, css } of outros) {
      const foraDoHover = css.replace(/@media \(hover: hover\) \{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
      expect(foraDoHover, nome).not.toMatch(/:hover/)
    }
  })
})

describe('a abertura leve da gaveta (spec §4.7)', () => {
  const segundos = (v: string) => (v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v))
  const regras = () =>
    [...blocoDoPortao().matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, seletor]) => seletor.includes('.gaveta'))
      .map(([, seletor, corpo]) => ({
        seletor: seletor.trim(),
        animacao: /animation:\s*([^;]+);/.exec(corpo)?.[1].trim() ?? '',
      }))

  it('entra sob [open] com fill backwards e sai sob [data-fechando] com forwards', () => {
    const r = regras()
    // o painel, o fundo e os itens na entrada; o painel e o fundo na saida.
    // As tres regras da borda ondulada sairam com ela.
    expect(r.map((x) => x.seletor)).toEqual([
      'html.js .gaveta[open]',
      'html.js .gaveta[open]::backdrop',
      'html.js .gaveta[open] .gaveta__item',
      'html.js .gaveta[data-fechando]',
      'html.js .gaveta[data-fechando]::backdrop',
    ])
    for (const { seletor, animacao } of r) {
      expect(animacao, seletor).toMatch(seletor.includes('[data-fechando]') ? /forwards$/ : /backwards$/)
    }
  })

  it('cada regra termina antes de 0.8 s, somando duração e atraso base', () => {
    for (const { seletor, animacao } of regras()) {
      const [duracao, atraso = '0s'] = animacao.match(/\d*\.?\d+m?s\b/g)!
      expect(segundos(duracao) + segundos(atraso), seletor).toBeLessThan(0.8)
    }
  })

  it('a lista entra 35 ms depois do item anterior, contado por --i, com teto', () => {
    const item = regras().find((r) => r.seletor.endsWith('.gaveta__item'))!
    expect(item.animacao).toContain('calc(.12s + min(var(--i, 0), 9) * 35ms)')
    // com 10 ou mais itens o ultimo ainda para antes de 0.8 s (spec 4.7)
    const [duracao, base] = item.animacao.match(/\d*\.?\d+m?s\b/g)!
    const [, teto, passo] = /min\(var\(--i, 0\), (\d+)\) \* (\d+)ms/.exec(item.animacao)!
    expect(segundos(duracao) + segundos(base) + (Number(teto) * Number(passo)) / 1000).toBeLessThan(0.8)
  })

  it('a saída dura o que o JS espera antes do close()', () => {
    expect(DURACAO_SAIDA).toBe(250)
    const saidas = regras().filter((r) => r.seletor.includes('[data-fechando]'))
    expect(saidas).toHaveLength(2)
    for (const { animacao } of saidas) expect(animacao).toMatch(/^[\w-]+ \.25s /)
  })
})
