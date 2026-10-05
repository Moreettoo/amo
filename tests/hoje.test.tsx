import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { HojeODiaPede, CONSULTA_PINO } from '@/components/sections/HojeODiaPede'
import { PalavraTroca } from '@/components/ui/PalavraTroca'
import { FiltroProvider } from '@/components/FiltroProvider'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarVisao, type GrupoVontade } from '@/lib/visao'
import { posicaoDoIndice } from '@/lib/vontade'
import { Sonda } from './fixtures/sonda'

const visao = montarVisao(await carregarCatalogo())
const matchMediaOriginal = window.matchMedia

afterEach(() => {
  window.matchMedia = matchMediaOriginal
  document.documentElement.classList.remove('js')
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function montar(vontades: readonly GrupoVontade[] = visao.vontades) {
  return render(
    <FiltroProvider>
      <HojeODiaPede vontades={vontades} tipos={visao.tipos} />
      <Sonda />
    </FiltroProvider>,
  )
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
    expect(within(painel).getByRole('link', { name: 'Ver as 2 no cardápio' })).toHaveAttribute('href', '#cardapio')
    expect(screen.getByAltText(visao.vontades[0].produtos[0].imagem.alt)).toBeInTheDocument()
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

  it('"Ver as 3 no cardápio" aplica a vontade e limpa linha e selo', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('button', { name: 'sonda: tudo ligado' }))
    await user.click(screen.getByRole('tab', { name: 'Fruta 3' }))
    await user.click(screen.getByRole('link', { name: 'Ver as 3 no cardápio' }))
    expect(screen.getByTestId('filtro')).toHaveTextContent('-|-|fruta')
  })

  it('com um produto só: "1 opção" e "Ver no cardápio"', () => {
    const beijinho = visao.produtos.find((p) => p.slug === 'beijinho')!
    montar([{ slug: 'coco', palavra: 'Coco', produtos: [beijinho] }])
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
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    montar()
    await user.click(screen.getByRole('tab', { name: 'Coco 2' }))
    expect(rolar).toHaveBeenCalledWith({ top: posicaoDoIndice(2, 4, 0, 3000 - window.innerHeight) })
    expect(screen.getByRole('tab', { name: 'Coco 2' })).toHaveAttribute('aria-selected', 'true')
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
    expect(renderToString(<PalavraTroca palavra="Um clássico." />)).toContain('font-size:min(83px, 11.56vw)')
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
