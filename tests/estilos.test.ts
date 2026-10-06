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

  it('no celular a fileira de pílulas das linhas rola de lado e não estica a grade do catálogo', () => {
    expect(ultimo(regra(ler('catalogo.css'), '.catalogo__corpo'), 'grid-template-columns')).toBe('minmax(0, 1fr)')
  })

  // Achados da verificacao no navegador (Task 9 do catalogo).

  it('o selo do topo do catálogo fica na coluna do conteúdo: na margem ele rolava a página de lado', () => {
    expect(ultimo(regra(ler('catalogo.css'), '.topo-catalogo__selo'), 'right')).toBe('var(--gutter)')
  })

  it('no celular a gaveta mede min(340px, 88vw), borda incluída, como na spec', () => {
    expect(ultimo(regra(ler('gaveta.css'), '.gaveta'), '--painel')).toBe('calc(min(340px, 88vw) - var(--borda))')
  })

  it('no celular os arcos do cartão da linha única encolhem, e o nome não some embaixo deles', () => {
    const arcos = regra(ler('gaveta.css'), '.gaveta__arcos img')
    const larguras = [...arcos.matchAll(/(?<![-\w])width:\s*([\d.]+)px;/g)].map((m) => Number(m[1]))
    expect(larguras.length).toBeGreaterThan(1)
    expect(larguras.at(-1)).toBeLessThan(larguras[0])
  })

  it('o sublinhado a mão mira o traço pela classe, e um ícone dentro do link fica no lugar', () => {
    const css = ler('pecas.css')
    expect(css).not.toMatch(/\.link-sub svg/)
    expect(ultimo(regra(css, '.link-sub__traco'), 'position')).toBe('absolute')
  })

  it('a seta do "Ver as N receitas" fica na linha do texto: o preflight do Tailwind põe todo svg em block', () => {
    expect(ultimo(regra(ler('cardapio.css'), '.vitrine__seta'), 'display')).toBe('inline-block')
  })

  it('os links da trilha têm alvo de 44 px, invisível e sem invadir o link vizinho', () => {
    const css = ler('catalogo.css')
    expect(ultimo(regra(css, '.trilha a'), 'position')).toBe('relative')
    const alvo = regra(css, '.trilha a::before')
    expect(ultimo(alvo, 'content')).toBe('""')
    expect(ultimo(alvo, 'position')).toBe('absolute')
    expect(ultimo(alvo, 'height')).toBe('44px')
    expect(ultimo(alvo, 'min-width')).toBe('44px')
    // nada que pinte: e so area de clique
    expect(alvo).not.toMatch(/background|border|box-shadow|outline|color/)
    // cresce de lado menos que a metade do vao ate o vizinho (gap + margem da barra)
    const px = (v: string | undefined) => Number.parseFloat(v ?? 'NaN')
    const vao = px(ultimo(regra(css, '.trilha'), 'gap')) + px(ultimo(regra(css, '.trilha li + li::before'), 'margin-right'))
    expect(-px(ultimo(alvo, 'inset-inline'))).toBeLessThan(vao / 2)
  })

  it('com a gaveta aberta a calha da barra de rolagem fica escura como o fundo, não creme', () => {
    const trava = regra(ler('../globals.css'), 'html:has(.gaveta[open])')
    expect(ultimo(trava, 'background-color')).toBe('var(--color-expresso)')
  })

  // Achados da revisao final do catalogo.

  it('em "Tudo" as capas do topo não encolhem, a redonda segue redonda e três das mais largas cabem na coluna', () => {
    const css = ler('catalogo.css')
    const px = (v: string | undefined) => Number.parseFloat(v ?? 'NaN')
    expect(ultimo(regra(css, '.topo-catalogo__capa'), 'flex')).toBe('none')
    const coluna = px(ultimo(regra(css, '.topo-catalogo__grade'), 'grid-template-columns')?.split(' ').at(-1))
    expect(coluna).toBe(380)
    const capa = (formato: string) => regra(css, `.topo-catalogo__capas--varias .topo-catalogo__capa--${formato}`)
    const inteiro = capa('inteiro')
    expect(px(ultimo(inteiro, 'width'))).toBe(px(ultimo(inteiro, 'height')))
    const larguras = ['pote', 'inteiro', 'unidade', 'neutra'].map((f) => px(ultimo(capa(f), 'width')))
    const vao = px(ultimo(regra(css, '.topo-catalogo__capas--varias'), 'gap'))
    // ate tres capas, de qualquer formato: o pior caso e tres da mais larga
    expect(3 * Math.max(...larguras) + 2 * vao).toBeLessThanOrEqual(coluna)
  })

  it('bolo inteiro: a moldura contém o círculo, o texto alinha com os outros cards e a fita não cobre o texto', () => {
    const css = ler('produto.css')
    const px = (v: string | undefined) => Number.parseFloat(v ?? 'NaN')
    // sem conter a margem do circulo (margin collapse), a moldura media so o
    // circulo: a fita, medida da borda dela, caia no tipo e no nome
    expect(ultimo(regra(css, '.moldura'), 'display')).toBe('flow-root')
    const celular = /@media \(max-width: 520px\) \{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/.exec(css)![1]
    const desktop = css.replace(celular, '')
    /** margem de cima e de baixo do shorthand */
    const vertical = (v: string | undefined) => {
      const p = (v ?? '').split(/\s+/)
      return [px(p[0]), px(p[2] ?? p[0])]
    }
    for (const [nome, bloco] of [['desktop', desktop], ['celular', celular]] as const) {
      const janela = regra(bloco, '.moldura--inteiro .moldura__janela')
      const [cima, baixo] = vertical(ultimo(regra(desktop, '.moldura--inteiro .moldura__janela') + janela, 'margin'))
      const total = cima + px(ultimo(janela, 'height')) + baixo
      // a altura das outras molduras: o tipo e o nome dos cards de uma fileira alinham
      expect(total, nome).toBe(px(ultimo(regra(bloco, '.moldura__janela'), 'height')))
      // a fita com o nome em duas linhas termina antes de o texto do card comecar
      const fita = regra(desktop, '.fita') + (nome === 'celular' ? regra(bloco, '.fita') : '')
      const linha = px(/\/([\d.]+)/.exec(ultimo(regra(desktop, '.fita'), 'font') ?? '')?.[1])
      const corpo = nome === 'celular' ? px(ultimo(fita, 'font-size')) : px(/(\d+)px\//.exec(ultimo(fita, 'font') ?? '')?.[1])
      const fim = px(ultimo(fita, 'top')) + 2 * corpo * linha + 2 * vertical(ultimo(fita, 'padding'))[0]
      const texto = total + vertical(ultimo(regra(desktop, '.card-produto__tipo'), 'margin'))[0]
      expect(fim, nome).toBeLessThan(texto)
    }
  })

  it.each([
    ['catalogo.css', '.catalogo__grupo-topo .link-sub', '"Ver só <linha>" nos grupos de "Tudo"'],
    ['catalogo.css', '.topo-catalogo__acoes .link-sub', '"Voltar ao início" no 404'],
    ['cardapio.css', '.cardapio__vazio button', '"Ver todas" no estado vazio'],
  ])('%s: %s tem alvo de 44 px, invisível (%s)', (arquivo, seletor) => {
    const css = ler(arquivo)
    const dono = seletor.endsWith('.link-sub') ? regra(ler('pecas.css'), '.link-sub') : regra(css, seletor)
    expect(ultimo(dono, 'position')).toBe('relative')
    const alvo = regra(css, `${seletor}::before`)
    expect(ultimo(alvo, 'content')).toBe('""')
    expect(ultimo(alvo, 'position')).toBe('absolute')
    expect(ultimo(alvo, 'height')).toBe('44px')
    expect(ultimo(alvo, 'top')).toBe('50%')
    expect(ultimo(alvo, 'margin-top')).toBe('-22px')
    // nada que pinte: e so area de clique
    expect(alvo).not.toMatch(/background|border|box-shadow|outline|color/)
  })
})
