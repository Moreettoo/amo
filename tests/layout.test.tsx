// tests/layout.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'

describe('AnnouncementBar', () => {
  it('mostra os três fatos do rótulo, não promoção inventada', () => {
    render(<AnnouncementBar />)
    const texto = screen.getByText(/zero açúcar/i)
    expect(texto).toBeInTheDocument()
    expect(texto.textContent).toMatch(/cozido a vapor/i)
    // The spec mandates a non-breaking space (U+00A0) in "Pote de&nbsp;vidro"
    // to prevent wrapping on narrow viewports. Accept both space characters.
    expect(texto.textContent).toMatch(/pote de[\s ]vidro reutilizável/i)
  })

  it('não tem botão de fechar — não há o que fechar', () => {
    render(<AnnouncementBar />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('Nav', () => {
  it('é um landmark de navegação', () => {
    render(<Nav />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('todo item de menu é <a> com âncora interna válida', () => {
    render(<Nav />)
    const links = screen.getAllByRole('link')
    const ancoras = links.filter((l) => l.getAttribute('href')?.startsWith('#'))
    expect(ancoras.length).toBeGreaterThanOrEqual(3)
    for (const a of ancoras) {
      expect(a.getAttribute('href')).toMatch(/^#[a-z-]+$/)
    }
  })

  it('não tem carrinho, busca nem login — não existem ainda', () => {
    render(<Nav />)
    const rotulos = screen
      .getAllByRole('link')
      .concat(screen.getAllByRole('button'))
      .map((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').toLowerCase())
    for (const r of rotulos) {
      expect(r).not.toMatch(/carrinho|sacola|buscar|entrar|login|conta/)
    }
  })

  it('o botão de menu mobile tem aria-label e aria-expanded', () => {
    render(<Nav />)
    const botao = screen.getByRole('button', { name: /menu/i })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao).toHaveAttribute('aria-controls')
  })

  it('a imagem do logo tem alt com o nome da marca', () => {
    render(<Nav />)
    expect(screen.getByAltText(/amo/i)).toBeInTheDocument()
  })
})

describe('Footer', () => {
  it('é um landmark contentinfo', () => {
    render(<Footer />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('lista os 7 nomes de sabor como texto, sem link (não há páginas)', () => {
    render(<Footer />)
    const lista = screen.getByRole('list', { name: /sabores/i })
    expect(lista.querySelectorAll('li')).toHaveLength(7)
    expect(lista.querySelectorAll('a')).toHaveLength(0)
  })

  it('usa placeholder de contato visivelmente falso, não telefone real', () => {
    render(<Footer />)
    expect(screen.getByText('(00) 00000-0000')).toBeInTheDocument()
  })

  it('traz o aviso de contato provisório', () => {
    render(<Footer />)
    expect(screen.getByText(/contato provisório/i)).toBeInTheDocument()
  })
})
