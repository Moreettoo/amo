import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { HojeODiaPede, CONSULTA_PINO } from '@/components/sections/HojeODiaPede'
import { PalavraTroca } from '@/components/ui/PalavraTroca'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { montarVisao, type GrupoVontade } from '@/lib/visao'
import { posicaoDoIndice } from '@/lib/vontade'

const catalogo = await carregarCatalogo()
const visao = montarVisao(catalogo)
const matchMediaOriginal = window.matchMedia

afterEach(() => {
  window.matchMedia = matchMediaOriginal
  document.documentElement.classList.remove('js')
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function montar(vontades: readonly GrupoVontade[] = visao.vontades) {
  return render(<HojeODiaPede vontades={vontades} tipos={visao.tipos} />)
}

const letras = (raiz: ParentNode) =>
  [...raiz.querySelectorAll('.palavra__letra')].map((s) => s.textContent).join('')

describe('Hoje o dia pede', () => {
  it('uma aba por vontade com produto, com a contagem; a primeira selecionada', () => {
    montar()
    const abas = screen.getAllByRole('tab')
    expect(abas.map((a) => a.textContent)).toEqual(['Chocolate 2', 'Fruta 3', 'Coco 2', 'Um clássico 3'])
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
    expect(abas.map((a) => a.tabIndex)).toEqual([0, -1, -1, -1])
    expect(screen.getByRole('tablist', { name: 'Vontades' })).toBeInTheDocument()
  })

  it('o painel mostra a vontade, as opções e o link para o cardápio', () => {
    const { container } = montar()
    const painel = screen.getByRole('tabpanel', { name: 'Chocolate 2' })
    expect(within(painel).getByText('Chocolate.')).toHaveClass('sr-only')
    expect(within(painel).getByText(/Prestígio e Chocolate\./).textContent).toBe('2 opções: Prestígio e Chocolate.')
    expect(within(painel).getByRole('link', { name: 'Ver as 2 no cardápio' })).toHaveAttribute('href', '/catalogo?vontade=chocolate')
    // a foto grande e a capa da vontade: o Prestigio ja e a foto do hero
    expect(visao.vontades[0].capa.slug).toBe('chocolate')
    expect(screen.getByAltText(visao.vontades[0].capa.imagem.alt)).toBeInTheDocument()
    expect(container.querySelector('.hoje__lado .etiqueta')).toHaveAttribute('aria-hidden', 'true')
    const minis = container.querySelectorAll('.hoje__pilha img')
    expect(minis).toHaveLength(1)
    expect(minis[0]).toHaveAttribute('alt', '')
    expect(container.querySelector('.hoje__pilha')).toHaveAttribute('aria-hidden', 'true')
  })

  it('setas, Home e End trocam a aba e levam o foco junto', async () => {
    const user = userEvent.setup()
    montar()
    const abas = screen.getAllByRole('tab')
    abas[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(abas[1]).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(abas[1])
    expect(abas.map((a) => a.tabIndex)).toEqual([-1, 0, -1, -1])
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(abas[3])
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(abas[0])
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(abas[3])
    await user.keyboard('{Home}')
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('clicar numa aba troca o conteúdo do painel', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('tab', { name: 'Coco 2' }))
    const painel = screen.getByRole('tabpanel', { name: 'Coco 2' })
    expect(within(painel).getByText('Coco.')).toBeInTheDocument()
    expect(within(painel).getByText(/Beijinho\./).textContent).toBe('2 opções: Prestígio e Beijinho.')
  })

  it('"Ver as 3 no cardápio" leva ao catálogo com a vontade escolhida', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('tab', { name: 'Fruta 3' }))
    expect(screen.getByRole('link', { name: 'Ver as 3 no cardápio' })).toHaveAttribute(
      'href',
      '/catalogo?vontade=fruta',
    )
  })

  it('com um produto só: "1 opção" e "Ver no cardápio"', () => {
    const beijinho = catalogo.produtos.find((p) => p.slug === 'beijinho')!
    montar([{ slug: 'coco', palavra: 'Coco', produtos: [beijinho], capa: beijinho }])
    const painel = screen.getByRole('tabpanel')
    expect(within(painel).getByText(/Beijinho\./).textContent).toBe('1 opção: Beijinho.')
    expect(within(painel).getByRole('link', { name: 'Ver no cardápio' })).toBeInTheDocument()
  })

  it('o progresso usa variável CSS, nunca transform inline', () => {
    const { container } = montar()
    const barra = container.querySelector('.hoje__barra i')!
    expect(barra.getAttribute('style')).toContain('--progresso')
    expect(barra.getAttribute('style')).not.toContain('transform')
    expect(container.querySelector('.hoje__progresso')).toHaveAttribute('aria-hidden', 'true')
  })

  it('com a seção pinada, escolher uma aba rola até o meio do trecho dela', async () => {
    const user = userEvent.setup()
    document.documentElement.classList.add('js')
    window.matchMedia = ((q: string) => ({
      matches: q === CONSULTA_PINO,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(3000)
    // a rolagem acontece de verdade: o scrollY vai ate o destino pedido, e o
    // trilho (que comeca no topo do documento) sobe junto
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation((destino) => {
      Object.defineProperty(window, 'scrollY', { value: (destino as ScrollToOptions).top, configurable: true })
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top: -window.scrollY, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: -window.scrollY, toJSON: () => ({}) }) as DOMRect,
    )
    montar()
    await user.click(screen.getByRole('tab', { name: 'Coco 2' }))
    expect(rolar).toHaveBeenCalledWith({ top: posicaoDoIndice(2, 4, 0, 3000 - window.innerHeight) })
    expect(screen.getByRole('tab', { name: 'Coco 2' })).toHaveAttribute('aria-selected', 'true')
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })

  it('quando a trava solta, a seleção segue a posição real da página, não a escolhida', async () => {
    // A pessoa girou a roda no meio da rolagem e a pagina parou no trecho
    // de Fruta: ao soltar a trava, a secao tem que mostrar Fruta.
    const user = userEvent.setup()
    document.documentElement.classList.add('js')
    window.matchMedia = ((q: string) => ({
      matches: q === CONSULTA_PINO,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(3000)
    const curso = 3000 - window.innerHeight
    const ondeParou = Math.round(posicaoDoIndice(1, 4, 0, curso))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      Object.defineProperty(window, 'scrollY', { value: ondeParou, configurable: true })
    })
    // o jsdom nao desconta a rolagem no getBoundingClientRect; aqui o trilho
    // comeca no topo do documento, como no navegador
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top: -window.scrollY, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: -window.scrollY, toJSON: () => ({}) }) as DOMRect,
    )
    montar()
    await user.click(screen.getByRole('tab', { name: 'Coco 2' }))
    expect(screen.getByRole('tab', { name: 'Fruta 3' })).toHaveAttribute('aria-selected', 'true')
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })
})

describe('PalavraTroca', () => {
  it('o leitor de tela lê a palavra inteira; as letras visuais ficam escondidas dele', () => {
    const { container } = render(<PalavraTroca palavra="Chocolate." />)
    expect(screen.getByText('Chocolate.')).toHaveClass('sr-only')
    expect(container.querySelector('.palavra__letra')!.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(letras(container)).toBe('Chocolate.')
  })

  it('o corpo da letra acompanha o tamanho da palavra', () => {
    // lido do HTML do servidor: o CSSOM do jsdom nem sempre aceita min()
    expect(renderToString(<PalavraTroca palavra="Um clássico." />)).toContain('font-size:min(83px, 12.37cqi)')
  })

  it('troca rápida termina na última palavra, nunca numa do meio', () => {
    vi.useFakeTimers()
    document.documentElement.classList.add('js')
    const { container, rerender } = render(<PalavraTroca palavra="Chocolate." />)
    rerender(<PalavraTroca palavra="Fruta." />)
    expect(letras(container)).toBe('Chocolate.')
    expect(container.querySelector('.palavra__letra')).toHaveClass('sai')
    rerender(<PalavraTroca palavra="Coco." />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(letras(container)).toBe('Coco.')
    expect(container.querySelector('.palavra__letra')).toHaveClass('entra')
    expect(screen.getByText('Coco.')).toHaveClass('sr-only')
  })

  it('sem JS ou com movimento reduzido a troca é imediata', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(<PalavraTroca palavra="Chocolate." />)
    rerender(<PalavraTroca palavra="Fruta." />)
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(letras(container)).toBe('Fruta.')
  })
})
