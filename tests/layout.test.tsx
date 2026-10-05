import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { FiltroProvider } from '@/components/FiltroProvider'
import { Sonda } from './fixtures/sonda'

describe('Nav', () => {
  it('é um landmark de navegação', () => {
    render(<Nav />)
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
  })

  it('leva a Hoje o dia pede, O que é saudável e A marca', () => {
    render(<Nav />)
    for (const [nome, href] of [
      ['Hoje o dia pede', '#hoje'],
      ['O que é saudável', '#rotulos'],
      ['A marca', '#marca'],
    ]) {
      expect(screen.getByRole('link', { name: nome })).toHaveAttribute('href', href)
    }
  })

  it('tem um botão de cardápio só', () => {
    render(<Nav />)
    const cardapio = screen.getAllByRole('link', { name: /card[aá]pio/i })
    expect(cardapio).toHaveLength(1)
    expect(cardapio[0]).toHaveAttribute('href', '#cardapio')
    expect(cardapio[0]).toHaveClass('btn-retro', 'btn-retro--escuro')
  })

  it('todo link é âncora interna válida, inclusive os do menu de celular', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    for (const a of screen.getAllByRole('link')) {
      expect(a.getAttribute('href')).toMatch(/^#[a-z-]+$/)
    }
  })

  it('não tem carrinho, busca nem login, não existem ainda', () => {
    render(<Nav />)
    const rotulos = [...screen.getAllByRole('link'), ...screen.getAllByRole('button')].map((e) =>
      (e.getAttribute('aria-label') ?? e.textContent ?? '').toLowerCase(),
    )
    for (const r of rotulos) expect(r).not.toMatch(/carrinho|sacola|buscar|entrar|login|conta/)
  })

  it('o logo tem o nome da marca e leva ao topo', () => {
    render(<Nav />)
    const logo = screen.getByAltText(/amo/i)
    expect(logo.closest('a')).toHaveAttribute('href', '#topo')
  })

  it('o botão de menu de celular tem aria-label, aria-expanded e aria-controls', () => {
    render(<Nav />)
    const botao = screen.getByRole('button', { name: /menu/i })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao).toHaveAttribute('aria-controls', 'menu-mobile')
  })

  it('opaca desde o primeiro pixel: ao rolar só a sombra muda, a altura nunca', () => {
    render(<Nav />)
    const nav = screen.getByRole('navigation')
    expect(nav.style.height).toBe('64px')
    expect(nav.className).toContain('bg-creme')
    expect(nav.className).toContain('shadow-none')

    Object.defineProperty(window, 'scrollY', { value: 80, configurable: true })
    fireEvent.scroll(window)
    expect(nav.style.height).toBe('64px')
    expect(nav.className).toContain('bg-creme')
    expect(nav.className).not.toContain('shadow-none')
    expect(nav.className).toMatch(/shadow-\[/)
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })

  it('Esc fecha o menu de celular e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    const botao = screen.getByRole('button', { name: /abrir menu/i })
    const painel = document.getElementById('menu-mobile')!
    await user.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(painel).not.toHaveAttribute('hidden')
    await user.tab()
    expect(document.activeElement).toBe(within(painel).getAllByRole('link')[0])
    await user.keyboard('{Escape}')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(painel).toHaveAttribute('hidden')
    expect(document.activeElement).toBe(botao)
  })

  it('clicar num link do menu de celular fecha o menu e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    const botao = screen.getByRole('button', { name: /abrir menu/i })
    const painel = document.getElementById('menu-mobile')!
    await user.click(botao)
    await user.click(within(painel).getAllByRole('link')[0])
    expect(painel).toHaveAttribute('hidden')
    expect(document.activeElement).toBe(botao)
  })
})

describe('Footer', () => {
  const montar = (filtraLinha: boolean, linhas = [{ slug: 'pote', nome: 'Bolos no pote' }]) =>
    render(
      <FiltroProvider>
        <Footer linhas={linhas} filtraLinha={filtraLinha} />
        <Sonda />
      </FiltroProvider>,
    )

  it('é um landmark contentinfo', () => {
    montar(false)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('lista as linhas com link para o cardápio', () => {
    montar(false)
    const lista = screen.getByRole('list', { name: 'Linhas' })
    expect(within(lista).getByRole('link', { name: 'Bolos no pote' })).toHaveAttribute('href', '#cardapio')
  })

  it('com uma linha só, o link não mexe no filtro (não há filtro de linha na tela)', async () => {
    const user = userEvent.setup()
    montar(false)
    await user.click(screen.getByRole('link', { name: 'Bolos no pote' }))
    expect(screen.getByTestId('filtro')).toHaveTextContent('-|-|-')
  })

  it('com filtro de linha na tela, o link escolhe a linha e limpa selo e vontade', async () => {
    const user = userEvent.setup()
    montar(true, [
      { slug: 'pote', nome: 'Bolos no pote' },
      { slug: 'salgado', nome: 'Salgados' },
    ])
    await user.click(screen.getByRole('button', { name: 'sonda: tudo ligado' }))
    await user.click(screen.getByRole('link', { name: 'Salgados' }))
    expect(screen.getByTestId('filtro')).toHaveTextContent('salgado|-|-')
  })

  it('a coluna A marca leva às seções da página', () => {
    montar(false)
    const lista = screen.getByRole('list', { name: 'A marca' })
    expect(within(lista).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '#marca',
      '#rotulos',
      '#hoje',
    ])
  })

  it('usa placeholder de contato visivelmente falso e avisa que é provisório', () => {
    montar(false)
    expect(screen.getByText('(00) 00000-0000')).toBeInTheDocument()
    expect(screen.getByText(/contato provisório/i)).toBeInTheDocument()
  })

  it('o AMO do copyright está blindado contra tradutor', () => {
    montar(false)
    expect(screen.getByText('AMO')).toHaveAttribute('translate', 'no')
  })
})
