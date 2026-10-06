import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarGaveta, type DadosGaveta } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const gaveta = montarGaveta(await carregarCatalogo())
const montarNav = (dados: DadosGaveta = gaveta, linhaAtual: string | null = null) =>
  render(<Nav gaveta={dados} linhaAtual={linhaAtual} />)

describe('Nav', () => {
  it('é um landmark de navegação', () => {
    montarNav()
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
  })

  it('leva às seções da home, de qualquer página', () => {
    montarNav()
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    for (const [nome, href] of [
      ['Hoje o dia pede', '/#hoje'],
      ['O que é saudável', '/#rotulos'],
      ['A marca', '/#marca'],
    ]) {
      expect(within(nav).getByRole('link', { name: nome })).toHaveAttribute('href', href)
    }
  })

  it('tem um botão de cardápio só, e ele leva ao catálogo', () => {
    montarNav()
    const cardapio = screen.getAllByRole('link', { name: /card[aá]pio/i })
    expect(cardapio).toHaveLength(1)
    expect(cardapio[0]).toHaveAttribute('href', '/catalogo')
    expect(cardapio[0]).toHaveClass('btn-retro', 'btn-retro--escuro')
  })

  it('todo link leva a uma seção da home ou ao catálogo, inclusive os da gaveta', async () => {
    const user = userEvent.setup()
    montarNav()
    await user.click(screen.getByRole('button', { name: 'Catálogo' }))
    for (const a of screen.getAllByRole('link')) {
      expect(a.getAttribute('href')).toMatch(/^\/(#[a-z-]+|catalogo(\/[a-z-]+)?(#[a-z-]+)?)$/)
    }
  })

  it('não tem carrinho, busca nem login, não existem ainda', () => {
    montarNav()
    const rotulos = [...screen.getAllByRole('link'), ...screen.getAllByRole('button')].map((e) =>
      (e.getAttribute('aria-label') ?? e.textContent ?? '').toLowerCase(),
    )
    for (const r of rotulos) expect(r).not.toMatch(/carrinho|sacola|buscar|entrar|login|conta/)
  })

  it('o logo tem o nome da marca e leva ao topo da home', () => {
    montarNav()
    const logo = screen.getByAltText(/amo/i)
    expect(logo.closest('a')).toHaveAttribute('href', '/#topo')
  })

  it('o botão Catálogo: só com JS, avisa que abre um diálogo e qual', () => {
    montarNav()
    const botao = screen.getByRole('button', { name: 'Catálogo' })
    expect(botao).toHaveClass('so-js', 'botao-catalogo')
    expect(botao).toHaveAttribute('aria-haspopup', 'dialog')
    expect(botao).toHaveAttribute('aria-controls', 'gaveta')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('abre a gaveta; o Esc fecha e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    montarNav()
    const botao = screen.getByRole('button', { name: 'Catálogo' })
    await user.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog', { name: 'Catálogo' })).toHaveAttribute('id', 'gaveta')
    await user.keyboard('{Escape}')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(botao)
  })

  it('a gaveta fica fora do invólucro sem clique (pointer-events-none) da nav', () => {
    montarNav()
    expect(document.getElementById('gaveta')!.closest('.pointer-events-none')).toBeNull()
  })

  it('o menu ≡ saiu: os links da home vivem na gaveta', () => {
    montarNav()
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    expect(document.getElementById('menu-mobile')).toBeNull()
  })

  it('na página de uma linha, a gaveta marca a linha atual', async () => {
    const user = userEvent.setup()
    montarNav(montarGaveta(CATALOGO_MISTO), 'salgados')
    await user.click(screen.getByRole('button', { name: 'Catálogo' }))
    const dialogo = screen.getByRole('dialog', { name: 'Catálogo' })
    expect(within(dialogo).getByRole('link', { name: /Salgados/ })).toHaveAttribute('aria-current', 'page')
  })

  it('opaca desde o primeiro pixel: ao rolar só a sombra muda, a altura nunca', () => {
    montarNav()
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
})

describe('Footer', () => {
  const montar = (linhas = [{ slug: 'bolos-no-pote', nome: 'Bolos no pote' }]) => render(<Footer linhas={linhas} />)

  it('é um landmark contentinfo', () => {
    montar()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('cada linha leva à sua página no catálogo', () => {
    montar([
      { slug: 'bolos-no-pote', nome: 'Bolos no pote' },
      { slug: 'salgados', nome: 'Salgados' },
    ])
    const lista = screen.getByRole('list', { name: 'Linhas' })
    expect(within(lista).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/catalogo/bolos-no-pote',
      '/catalogo/salgados',
    ])
  })

  it('a coluna A marca leva às seções da home, de qualquer página', () => {
    montar()
    const lista = screen.getByRole('list', { name: 'A marca' })
    expect(within(lista).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/#marca',
      '/#rotulos',
      '/#hoje',
    ])
  })

  it('usa placeholder de contato visivelmente falso e avisa que é provisório', () => {
    montar()
    expect(screen.getByText('(00) 00000-0000')).toBeInTheDocument()
    expect(screen.getByText(/contato provisório/i)).toBeInTheDocument()
  })

  it('o AMO do copyright está blindado contra tradutor', () => {
    montar()
    expect(screen.getByText('AMO')).toHaveAttribute('translate', 'no')
  })
})
