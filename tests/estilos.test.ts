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

/** O miolo do bloco `@media <condicao>`, com as regras de dentro. */
function dentroDe(css: string, condicao: string): string {
  const inicio = css.indexOf(`@media ${condicao} {`)
  if (inicio < 0) throw new Error(`@media ${condicao} não encontrado`)
  const abre = css.indexOf('{', inicio)
  let nivel = 0
  for (let i = abre; i < css.length; i++) {
    if (css[i] === '{') nivel++
    else if (css[i] === '}' && --nivel === 0) return css.slice(abre + 1, i)
  }
  throw new Error(`@media ${condicao} sem fim`)
}

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

  it('o acessório da v2 (etiqueta, fita, carimbo) não aparece no card: a foto fica limpa', () => {
    const css = ler('produto.css')
    expect(ultimo(regra(css, '.moldura > .fita'), 'display')).toBe('none')
    expect(ultimo(regra(css, '.moldura > .etiqueta'), 'display')).toBe('none')
    expect(ultimo(regra(css, '.moldura > .carimbo'), 'display')).toBe('none')
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

  it('o cartão da linha única reage ao foco do teclado como reage ao mouse, sem sombra nem salto', () => {
    const css = ler('gaveta.css')
    const hover = regra(css, '.gaveta__unica:hover')
    const foco = regra(css, '.gaveta__unica:focus-visible')
    expect(ultimo(foco, 'border-color')).toBeTruthy()
    expect(ultimo(foco, 'border-color')).toBe(ultimo(hover, 'border-color'))
    // a seta anda igual nos dois
    const seta = (estado: string) => ultimo(regra(css, `.gaveta__unica:${estado} .gaveta__icone`), 'transform')
    expect(seta('focus-visible')).toBeTruthy()
    expect(seta('focus-visible')).toBe(seta('hover'))
    // o cartao da v2 subia sobre uma sombra dura; o de agora so escurece o contorno
    expect(`${hover}\n${foco}`).not.toMatch(/box-shadow|transform/)
  })

  it('o catálogo, o 404 e a gaveta não trazem as formas da v2: sombra dura, giro, arco, tracejado, onda', () => {
    for (const arquivo of ['catalogo.css', 'gaveta.css']) {
      const css = ler(arquivo)
      // sombra deslocada sem desfoque ("6px 6px 0 cor")
      expect(css, arquivo).not.toMatch(/box-shadow:\s*-?\d+px\s+-?\d+px\s+0\s/)
      expect(css, arquivo).not.toMatch(/rotate\(/)
      expect(css, arquivo).not.toMatch(/999px/)
      expect(css, arquivo).not.toMatch(/dashed|dotted/)
      expect(css, arquivo).not.toMatch(/onda|camadas/)
      // o rotulo em script acima do titulo saiu: o script mora no <em> do titulo
      expect(css, arquivo).not.toMatch(/rotulo-secao/)
    }
    expect(ler('pecas.css')).not.toMatch(/\.rotulo-secao|\.camadas|dashed/)
  })

  it('no celular o miolo do catálogo é uma coluna só, que não estica com o que rola de lado dentro dela', () => {
    expect(ultimo(regra(ler('catalogo.css'), '.catalogo__miolo'), 'grid-template-columns')).toBe('minmax(0, 1fr)')
  })

  it('o topo creme do catálogo: script em cobre de leitura e texto secundário em suave, nunca cobre puro nem claro-suave', () => {
    const css = ler('catalogo.css')
    expect(ultimo(regra(css, '.topo-catalogo--claro .topo-catalogo__titulo em'), 'color')).toBe('var(--color-cobre-texto)')
    expect(ultimo(regra(css, '.topo-catalogo--claro .topo-catalogo__lead'), 'color')).toBe('var(--color-suave)')
    expect(ultimo(regra(css, '.topo-catalogo--claro .trilha'), 'color')).toBe('var(--color-suave)')
    expect(ultimo(regra(css, '.topo-catalogo--claro'), 'color')).toBe('var(--color-expresso)')
  })

  // Achados da revisao final do sumario.

  it('o nome do capítulo termina de aparecer assim que entra inteiro na tela: parado, nunca fica meio apagado', () => {
    expect(ultimo(regra(ler('movimento.css'), 'html.js .capitulo__titulo'), 'animation-range')).toBe('entry 0% entry 100%')
  })

  it('no celular, com a fileira do sumário presa, o alvo da âncora para abaixo dela e não embaixo', () => {
    const css = ler('catalogo.css')
    // nav de 64 + fileira de 69; o !important vence o scroll-mt-24 do Tailwind, que mora numa camada depois
    const alvo = css.match(/\.catalogo__miolo--com-sumario \.scroll-mt-24\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(alvo).toMatch(/scroll-margin-top:\s*150px\s*!important/)
  })

  it('no celular cada grupo de filtros é uma fileira só, que rola de lado: as fotos não descem a página', () => {
    const fileira = [...ler('catalogo.css').matchAll(/\.catalogo__pilulas\s*\{([^}]*)\}/g)].map((m) => m[1]).join('\n')
    expect(ultimo(fileira, 'flex-wrap')).toBe('nowrap')
    expect(ultimo(fileira, 'overflow-x')).toBe('auto')
    // em coluna com quebra, a fileira mediria o proprio conteudo e a pagina rolaria de lado
    expect(ultimo(regra(ler('catalogo.css'), '.catalogo__filtros'), 'flex-wrap')).toBe('nowrap')
  })

  it('o catálogo não inventa tamanho de letra fora da escala para o nome do card', () => {
    expect(ler('catalogo.css')).not.toMatch(/font-size:\s*20px/)
  })

  it('as capas do topo e o bloco do rótulo da linha saíram do catálogo', () => {
    const css = ler('catalogo.css')
    expect(css).not.toMatch(/topo-catalogo__capa|catalogo__rotulo-linha|catalogo__grupo/)
    expect(ler('movimento.css')).not.toMatch(/topo-catalogo__capa/)
  })

  // Achados da verificacao no navegador (Task 9 do catalogo).

  it('a regra do topo do catálogo fica no fluxo da coluna de texto: solta no canto ela rolava a página de lado', () => {
    const css = ler('catalogo.css')
    expect(css).not.toMatch(/\.topo-catalogo__selo/)
    expect(regra(css, '.topo-catalogo__regra')).not.toMatch(/position|right|left/)
  })

  it('no celular a gaveta mede min(340px, 88vw), como na spec, e o painel é a gaveta inteira', () => {
    const gaveta = regra(ler('gaveta.css'), '.gaveta')
    expect(ultimo(gaveta, '--painel')).toBe('min(340px, 88vw)')
    // sem a borda ondulada ao lado, a largura do <dialog> e a do painel
    expect(ultimo(gaveta, 'width')).toBe('var(--painel)')
  })

  it('no celular as fotos do cartão da linha única encolhem, e o nome não some embaixo delas', () => {
    const css = ler('gaveta.css')
    expect(ultimo(regra(css, '.gaveta__fotos'), 'flex')).toBe('none')
    const fotos = regra(css, '.gaveta__fotos img')
    const larguras = [...fotos.matchAll(/(?<![-\w])width:\s*([\d.]+)px;/g)].map((m) => Number(m[1]))
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

  // Achados da revisao final da autenticacao (2026-11-20).

  it('"Reenviar código" fica a 22 px do Confirmar (o meio da linha a uns 32 px), não mais a 77', () => {
    const auth = ler('auth.css')
    expect(ultimo(regra(auth, '.porta__codigo'), 'gap')).toBe('4px')
    expect(ultimo(regra(auth, '.porta__reenviar'), 'margin-top')).toBe('18px')
  })

  it('no celular os passos da recuperação recuam 30 px, como as etapas da sacola, com o coração no fio', () => {
    const celular = dentroDe(ler('auth.css'), '(max-width: 820px)')
    expect(ultimo(regra(celular, '.passos'), 'padding-left')).toBe('30px')
    expect(ultimo(regra(celular, '.passo--atual::before'), 'left')).toBe('-30px')
    expect(ultimo(regra(dentroDe(ler('sacola.css'), '(max-width: 820px)'), '.etapas'), 'padding-left')).toBe('30px')
  })

  it('a caixa de marcar tem o contorno fino dos campos, foco visível e o marcado em expresso', () => {
    const auth = ler('auth.css')
    const caixa = regra(auth, '.marcar input')
    expect(ultimo(caixa, 'appearance')).toBe('none')
    expect(ultimo(caixa, 'border')).toBe('1px solid rgb(43 27 22 / .38)')
    expect(ultimo(caixa, 'border-radius')).toBe('2px')
    expect(ultimo(regra(auth, '.marcar input:checked'), 'background-color')).toBe('var(--color-expresso)')
    expect(ultimo(regra(auth, '.marcar input:focus-visible'), 'border-color')).toBe('var(--color-expresso)')
    expect(ultimo(regra(auth, '.marcar input[aria-invalid="true"]'), 'border-color')).toBe('var(--color-cobre-texto)')
    // o visto e um desenho na cor da casa (mascara), sem cor escrita no svg
    expect(ultimo(regra(auth, '.marcar__visto'), 'background-color')).toBe('var(--color-creme)')
    expect(ultimo(regra(auth, '.marcar input:checked + .marcar__visto'), 'opacity')).toBe('1')
    // em alto contraste do sistema volta a caixa nativa
    expect(ultimo(regra(dentroDe(auth, '(forced-colors: active)'), '.marcar input[type="checkbox"]'), 'appearance')).toBe('auto')
  })

  // Achados da terceira rodada do ensaio de Minha conta (2026-11-21).

  it('o "Enviamos outro código." fica perto dos botões: a linha de erro vazia não reserva altura no reenvio', () => {
    expect(ultimo(regra(ler('auth.css'), '.porta__reenviar .conta__erro:empty'), 'display')).toBe('none')
  })

  it('"Falta só um instante" fica centrado e quebra equilibrado, sem "um robô." sozinho', () => {
    const espera = regra(ler('auth.css'), '.turnstile__espera')
    expect(ultimo(espera, 'text-align')).toBe('center')
    expect(ultimo(espera, 'text-wrap')).toBe('balance')
  })

  it('no celular o pedido continua dizendo quantos potes de cada sabor, embaixo do total', () => {
    const celular = dentroDe(ler('conta.css'), '(max-width: 820px)')
    const quantos = regra(celular, '.potes-pedido__quantos')
    expect(ultimo(quantos, 'display')).not.toBe('none')
    expect(ultimo(quantos, 'grid-column')).toBe('3')
  })

  it('o e-mail da lateral da conta fica numa linha so, com reticencias quando nao cabe', () => {
    const email = regra(ler('conta.css'), '.painel__ola span')
    expect(ultimo(email, 'white-space')).toBe('nowrap')
    expect(ultimo(email, 'overflow')).toBe('hidden')
    expect(ultimo(email, 'text-overflow')).toBe('ellipsis')
  })

  it('o link dentro de uma nota da conta e sublinhado no fio, como o das portas', () => {
    expect(ultimo(regra(ler('conta.css'), '.painel__nota a'), 'text-decoration-line')).toBe('underline')
  })

  it('o campo de senha tem um "mostrar" so: o olho proprio do Edge fica escondido', () => {
    expect(ultimo(regra(ler('auth.css'), '.campo__senha input::-ms-reveal'), 'display')).toBe('none')
  })

  it('bolo inteiro: a moldura contém a margem do círculo', () => {
    // sem conter a margem (margin collapse), a moldura media so o circulo e
    // o texto do card subia em relacao aos vizinhos
    expect(ultimo(regra(ler('produto.css'), '.moldura'), 'display')).toBe('flow-root')
  })

  it.each([
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
