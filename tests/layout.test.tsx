import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { montarGaveta, type DadosGaveta } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const gaveta = montarGaveta(await carregarCatalogo())
const montarNav = (dados: DadosGaveta = gaveta) => render(<Nav gaveta={dados} />)

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

  it('todo link leva a uma seção da home, ao catálogo ou à conta, inclusive os da gaveta', async () => {
    const user = userEvent.setup()
    montarNav()
    await user.click(screen.getByRole('button', { name: 'Catálogo' }))
    for (const a of screen.getAllByRole('link')) {
      expect(a.getAttribute('href')).toMatch(/^\/(#[a-z-]+|catalogo(\/[a-z-]+)?(#[a-z-]+)?|conta)$/)
    }
  })

  it('não tem busca nem carrinho; a conta é um link só, "Minha conta"', () => {
    montarNav()
    const rotulos = [...screen.getAllByRole('link'), ...screen.getAllByRole('button')].map((e) =>
      (e.getAttribute('aria-label') ?? e.textContent ?? '').toLowerCase(),
    )
    for (const r of rotulos) expect(r).not.toMatch(/carrinho|buscar|entrar|login/)
    expect(rotulos.filter((r) => r.includes('conta'))).toEqual(['minha conta'])
  })

  it('"Minha conta" leva a /conta, na barra e na gaveta do celular', async () => {
    const user = userEvent.setup()
    montarNav()
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/conta')
    await user.click(screen.getByRole('button', { name: 'Catálogo' }))
    const gaveta = screen.getByRole('dialog')
    expect(within(gaveta).getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/conta')
  })

  it('a sacola mostra quantos potes tem e abre a gaveta da direita', async () => {
    localStorage.setItem('amo:sacola', JSON.stringify({ prestigio: 2, pacoca: 1 }))
    montarNav()
    const botao = screen.getByRole('button', { name: 'Sacola, 3 potes' })
    await userEvent.click(botao)
    const gaveta = screen.getByRole('dialog', { name: 'Sacola' })
    expect(gaveta).toHaveClass('gaveta--direita')
    expect(within(gaveta).getByRole('link', { name: 'Ver sacola e fechar o pedido' })).toHaveAttribute('href', '/sacola')
    localStorage.clear()
  })

  it('o logo tem o nome da marca e leva ao topo da home', () => {
    montarNav()
    const logo = screen.getByAltText(/amo/i)
    expect(logo.closest('a')).toHaveAttribute('href', '/#topo')
  })

  // o aviso de LCP do next/image so vale para imagem lazy (get-img-props.js):
  // o logo do topo, eager, nunca o dispara
  it('o logo do topo carrega na hora, sem preload (o guia do Next 16 pede um ou outro)', () => {
    montarNav()
    const logo = screen.getByAltText(/amo/i)
    expect(logo).toHaveAttribute('loading', 'eager')
    expect(document.head.querySelector('link[rel="preload"][as="image"]')).toBeNull()
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

  it('a gaveta leva a cada linha por âncora do catálogo, sem marcar linha atual', async () => {
    const user = userEvent.setup()
    montarNav(montarGaveta(CATALOGO_MISTO))
    await user.click(screen.getByRole('button', { name: 'Catálogo' }))
    const dialogo = screen.getByRole('dialog', { name: 'Catálogo' })
    const salgados = within(dialogo).getByRole('link', { name: /Salgados/ })
    expect(salgados).toHaveAttribute('href', '/catalogo#linha-salgados')
    expect(salgados).not.toHaveAttribute('aria-current')
  })

  it('sem JS o botão Catálogo some', () => {
    montarNav()
    expect(screen.getByRole('button', { name: 'Catálogo' })).toHaveClass('so-js')
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
      '/catalogo#linha-bolos-no-pote',
      '/catalogo#linha-salgados',
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

  it('não mostra contato enquanto não houver contato de verdade', () => {
    montar()
    expect(screen.queryByRole('heading', { name: 'Contato' })).toBeNull()
    expect(screen.queryByText('(00) 00000-0000')).toBeNull()
    expect(screen.queryByText(/contato provisório/i)).toBeNull()
  })

  it('o logo do rodapé fica lazy: em página longa ele está longe da primeira tela', () => {
    montar()
    expect(screen.getByAltText(/para quem ama comer bem/)).toHaveAttribute('loading', 'lazy')
  })

  it('o AMO do copyright está blindado contra tradutor', () => {
    montar()
    expect(screen.getByText('AMO')).toHaveAttribute('translate', 'no')
  })
})
