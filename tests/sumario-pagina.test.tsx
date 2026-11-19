import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { CatalogoPagina } from '@/components/sections/CatalogoPagina'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarCatalogo } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const real = await carregarCatalogo()

/** Onde cada secao comeca na pagina (px a partir do topo do documento). O
 *  jsdom nao faz layout; a medida vem daqui, descontada a rolagem. */
const TOPOS: Record<string, number> = {
  doces: 400,
  'linha-bolos-no-pote': 470,
  'linha-bolos-inteiros': 1600,
  salgados: 2400,
  'linha-salgados': 2400,
}
let rolagem = 0

beforeEach(() => {
  rolagem = 0
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const top = (TOPOS[this.id] ?? 0) - rolagem
    return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON() {} } as DOMRect
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

function montar(catalogo = CATALOGO_MISTO, endereco = '/catalogo') {
  window.history.replaceState(null, '', endereco)
  return render(<CatalogoPagina vista={montarCatalogo(catalogo)} />)
}

const sumario = () => screen.getByRole('navigation', { name: 'Sumário' })
const atual = () => within(sumario()).queryByRole('link', { current: 'location' })?.getAttribute('href') ?? null
const item = (nome: RegExp) => within(sumario()).getByRole('link', { name: nome }).closest('li')!
const cards = () => screen.queryAllByRole('article').filter((a) => a.classList.contains('card-produto'))

/** linha de leitura a 35% de 900 px: 315 */
function rolarAte(y: number) {
  rolagem = y
  fireEvent.scroll(window)
}

describe('o sumário do catálogo', () => {
  it('só aparece quando há o que escolher: hoje, com uma categoria e uma linha, não', () => {
    montar(real)
    expect(screen.queryByRole('navigation', { name: 'Sumário' })).toBeNull()
  })

  it('lista as categorias com a contagem e as linhas dentro; a linha Salgados não se repete', () => {
    montar()
    const links = within(sumario()).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '#doces',
      '#linha-bolos-no-pote',
      '#linha-bolos-inteiros',
      '#salgados',
      '/#hoje',
    ])
    expect(links[0]).toHaveTextContent(/^Doces\s*9$/)
    expect(links[3]).toHaveTextContent(/^Salgados\s*2$/)
    expect(links[1]).toHaveTextContent(/^Bolos no pote$/)
  })

  it('no topo da página o atual é o primeiro par: a categoria e a primeira linha dela', async () => {
    montar()
    await waitFor(() => expect(atual()).toBe('#linha-bolos-no-pote'))
    expect(item(/^Doces/)).toHaveClass('sumario__item--atual')
    expect(item(/^Salgados/)).not.toHaveClass('sumario__item--atual')
  })

  it('ao rolar, o par acompanha: a linha seguinte, depois a categoria seguinte', async () => {
    montar()
    rolarAte(1400)
    await waitFor(() => expect(atual()).toBe('#linha-bolos-inteiros'))
    expect(item(/^Doces/)).toHaveClass('sumario__item--atual')
    rolarAte(2200)
    await waitFor(() => expect(atual()).toBe('#salgados'))
    expect(item(/^Salgados/)).toHaveClass('sumario__item--atual')
    expect(item(/^Doces/)).not.toHaveClass('sumario__item--atual')
    rolarAte(0)
    await waitFor(() => expect(atual()).toBe('#linha-bolos-no-pote'))
  })

  it('a categoria do par também é marcada: no celular as linhas somem, e é ela que diz onde a pessoa está', async () => {
    montar()
    const doces = () => within(sumario()).getByRole('link', { name: /^Doces/ })
    const salgados = () => within(sumario()).getByRole('link', { name: /^Salgados/ })
    // com linha marcada, a categoria leva aria-current="true"; a linha, "location"
    await waitFor(() => expect(doces()).toHaveAttribute('aria-current', 'true'))
    expect(salgados()).not.toHaveAttribute('aria-current')
    rolarAte(2200)
    // categoria sem linha no sumário: ela mesma é o lugar
    await waitFor(() => expect(salgados()).toHaveAttribute('aria-current', 'location'))
    expect(doces()).not.toHaveAttribute('aria-current')
  })

  it('redimensionar a janela mede de novo', async () => {
    montar()
    await waitFor(() => expect(atual()).toBe('#linha-bolos-no-pote'))
    // janela de 5000 px: a linha de leitura desce para 1750 e passa dos bolos inteiros
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 5000 })
    fireEvent(window, new Event('resize'))
    await waitFor(() => expect(atual()).toBe('#linha-bolos-inteiros'))
  })

  it('o coração que marca o item atual é decoração: fora da leitura de tela', async () => {
    montar()
    await waitFor(() => expect(sumario().querySelector('.sumario__coracao')).not.toBeNull())
    const coracao = sumario().querySelector<HTMLElement>('.sumario__coracao')!
    expect(coracao).toHaveAttribute('aria-hidden', 'true')
    // mede as duas direcoes: a altura do item na coluna do desktop e a
    // posicao da etiqueta na fileira do celular
    expect(coracao.style.getPropertyValue('--y')).toMatch(/px$/)
    expect(coracao.style.getPropertyValue('--x')).toMatch(/px$/)
  })

  it('com filtro, a contagem é a do que está na tela, e o item zerado continua link', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('button', { name: 'Fruta 4' }))
    await waitFor(() => expect(cards()).toHaveLength(4))
    const salgados = within(sumario()).getByRole('link', { name: /^Salgados/ })
    expect(salgados).toHaveTextContent(/^Salgados\s*0$/)
    expect(salgados).toHaveAttribute('href', '#salgados')
    expect(item(/^Salgados/)).toHaveClass('sumario__item--vazio')
    expect(within(sumario()).getByRole('link', { name: /^Doces/ })).toHaveTextContent(/^Doces\s*4$/)
    expect(item(/^Doces/)).not.toHaveClass('sumario__item--vazio')
  })

  it('tocar no item zerado limpa o filtro e o capítulo volta', async () => {
    const user = userEvent.setup()
    montar()
    const fruta = screen.getByRole('button', { name: 'Fruta 4' })
    await user.click(fruta)
    await waitFor(() => expect(document.getElementById('salgados')).toBeNull())
    await user.click(within(sumario()).getByRole('link', { name: /^Salgados/ }))
    expect(document.getElementById('salgados')).not.toBeNull()
    expect(fruta).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(cards()).toHaveLength(11))
  })

  it('tocar num item com resultado não mexe no filtro', async () => {
    const user = userEvent.setup()
    montar()
    const fruta = screen.getByRole('button', { name: 'Fruta 4' })
    await user.click(fruta)
    await waitFor(() => expect(cards()).toHaveLength(4))
    await user.click(within(sumario()).getByRole('link', { name: /^Bolos inteiros/ }))
    expect(fruta).toHaveAttribute('aria-pressed', 'true')
    expect(cards()).toHaveLength(4)
  })

  it('filtro que esvazia tudo: o sumário segue de pé e nada fica como atual', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('button', { name: 'Algo salgado 2' }))
    await user.click(screen.getByRole('button', { name: 'Fonte de fibras' }))
    await waitFor(() => expect(cards()).toHaveLength(0))
    expect(within(sumario()).getAllByRole('link')).toHaveLength(5)
    await waitFor(() => expect(atual()).toBeNull())
    expect(sumario().querySelector('.sumario__item--atual')).toBeNull()
    expect(sumario().querySelector('.sumario__coracao')).toBeNull()
  })

  it('chegar com vontade e âncora juntas não quebra: o filtro liga e o capítulo escondido não vira o atual', async () => {
    montar(CATALOGO_MISTO, '/catalogo?vontade=fruta#salgados')
    await waitFor(() => expect(cards()).toHaveLength(4))
    expect(screen.getByRole('button', { name: 'Fruta 4' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.getElementById('salgados')).toBeNull()
    await waitFor(() => expect(atual()).toBe('#linha-bolos-no-pote'))
    expect(item(/^Salgados/)).not.toHaveClass('sumario__item--atual')
  })

  it('com uma categoria só e duas linhas, o sumário marca que as etiquetas do celular são as linhas', () => {
    const umaCategoria = { ...CATALOGO_MISTO, produtos: CATALOGO_MISTO.produtos.filter((p) => p.linha !== 'salgados') }
    montar(umaCategoria)
    expect(sumario()).toHaveClass('sumario--uma')
  })

  it('passa no axe', async () => {
    const { container } = montar()
    await waitFor(() => expect(atual()).not.toBeNull())
    expect(await axe(container)).toHaveNoViolations()
  })
})
