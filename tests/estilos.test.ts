import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CONSULTA_PINO } from '@/components/sections/HojeODiaPede'

/**
 * Guardas de CSS achados na conferencia visual da v2 (Task 13): o preflight
 * do Tailwind zera o estilo de lista do ol, e o texto do contato em
 * inline-flex punha os tres contatos na mesma linha. Os dois defeitos so
 * apareciam com a pagina pintada.
 */
const ler = (nome: string) =>
  readFileSync(resolve(import.meta.dirname, '../src/app/estilos', nome), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Os corpos de todas as regras que listam `seletor`, na ordem do arquivo. */
function regra(css: string, seletor: string): string {
  const corpos = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, seletores]) => seletores.split(',').some((s) => s.trim() === seletor))
    .map(([, , corpo]) => corpo)
  if (corpos.length === 0) throw new Error(`regra ${seletor} não encontrada`)
  return corpos.join('\n')
}

/** O valor de `propriedade` que vence a cascata: a última declaração. */
const ultimo = (corpo: string, propriedade: string) =>
  [...corpo.matchAll(new RegExp(`(?<![-\\w])${propriedade}:\\s*([^;]+);`, 'g'))].at(-1)?.[1].trim()

describe('estilos', () => {
  it('o modo de aproveitar é numerado: o preflight do Tailwind zera o list-style do ol', () => {
    expect(ultimo(regra(ler('rotulos.css'), '.papel-rotulo__modo ol'), 'list-style')).toBe('decimal')
  })

  it('cada contato do rodapé ocupa a sua linha: o texto não pode ser inline', () => {
    expect(ultimo(regra(ler('rodape.css'), '.rodape__texto'), 'display')).toBe('flex')
  })

  // Achados da revisao final (Task 13).

  it('Hoje o dia pede: as colunas não crescem com a palavra, e a palavra mede a própria coluna', () => {
    const css = ler('hoje.css')
    expect(ultimo(regra(css, '.hoje__grade'), 'grid-template-columns')).toBe('minmax(0, 1.15fr) minmax(0, .85fr)')
    expect(ultimo(regra(css, '.hoje__texto'), 'container-type')).toBe('inline-size')
  })

  it('a fita do bolo inteiro quebra em linhas com nome longo, em vez de vazar do card', () => {
    const fita = regra(ler('produto.css'), '.fita')
    expect(ultimo(fita, 'white-space')).not.toBe('nowrap')
    expect(ultimo(fita, 'max-width')).toBeTruthy()
  })

  it('o pino do Hoje: CSS e JS com a mesma condição, e tela estreita exige 800px de altura', () => {
    expect(ler('hoje.css')).toContain(`@media ${CONSULTA_PINO} {`)
    expect(CONSULTA_PINO).toContain('(max-width: 820px) and (min-height: 800px)')
    expect(CONSULTA_PINO).toContain('(min-width: 821px) and (min-height: 700px)')
  })

  it('a gaveta aberta trava a página de trás sem pular a barra de rolagem', () => {
    const trava = regra(ler('../globals.css'), 'html:has(.gaveta[open])')
    expect(ultimo(trava, 'overflow')).toBe('hidden')
    expect(ultimo(trava, 'scrollbar-gutter')).toBe('stable')
  })

  it('o <dialog> da gaveta perde a margem, a borda e o limite de altura do navegador', () => {
    const gaveta = regra(ler('gaveta.css'), '.gaveta')
    expect(ultimo(gaveta, 'margin')).toBe('0')
    expect(ultimo(gaveta, 'border')).toBe('0')
    expect(ultimo(gaveta, 'max-height')).toBe('none')
    expect(ultimo(gaveta, 'height')).toBe('100%')
  })

  it('o cartão da linha única sobe no foco do teclado como sobe no hover', () => {
    const css = ler('gaveta.css')
    const hover = regra(css, '.gaveta__unica:hover')
    const foco = regra(css, '.gaveta__unica:focus-visible')
    expect(ultimo(foco, 'box-shadow')).toBeTruthy()
    expect(ultimo(foco, 'transform')).toBeTruthy()
    expect(ultimo(foco, 'box-shadow')).toBe(ultimo(hover, 'box-shadow'))
    expect(ultimo(foco, 'transform')).toBe(ultimo(hover, 'transform'))
  })
})
