// tests/layout.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('não tem botão de fechar, não há o que fechar', () => {
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

  it('não tem carrinho, busca nem login, não existem ainda', () => {
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

  it('a nav é opaca desde o primeiro pixel: ao rolar só a sombra muda', () => {
    // O contrato mudou. Antes a nav era bg-transparent e virava bg-sage/95
    // com backdrop-blur ao rolar. Isso trazia dois problemas reais: sage
    // translúcido por cima das fotos dos potes borrava foto e barra num
    // cinza-esverdeado sem forma, e o contraste do rótulo mudava conforme o
    // que passava por baixo. A referência nunca faz isso, a barra dela é
    // chapada do começo ao fim.
    //
    // O que este teste sempre protegeu continua protegido, e é a parte que
    // importa: a altura não pode entrar no ramo condicional, porque nav que
    // muda de tamanho ao rolar desloca o layout.
    render(<Nav />)
    const nav = screen.getByRole('navigation')
    expect(nav.style.height).toBe('88px')
    expect(nav.className).toContain('bg-cream')
    expect(nav.className).toContain('shadow-none')
    expect(nav.className).not.toContain('backdrop-blur')

    Object.defineProperty(window, 'scrollY', { value: 80, configurable: true })
    fireEvent.scroll(window)

    expect(nav.style.height).toBe('88px')
    expect(nav.className).toContain('bg-cream')
    expect(nav.className).not.toContain('shadow-none')
    expect(nav.className).toMatch(/shadow-\[/)

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })

  it('Esc fecha o menu mobile e devolve o foco ao botão de alternância', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    const botao = screen.getByRole('button', { name: /abrir menu/i })
    const painel = document.getElementById('menu-mobile')!

    await user.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(painel).not.toHaveAttribute('hidden')

    // Cenário real do bug: o foco de teclado avança para dentro do painel aberto
    // (não fica no botão) antes do Esc ser pressionado.
    await user.tab()
    const linkFocado = within(painel).getAllByRole('link')[0]
    expect(document.activeElement).toBe(linkFocado)

    await user.keyboard('{Escape}')

    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(painel).toHaveAttribute('hidden')
    expect(document.activeElement).toBe(botao)
  })

  it('clicar num link do menu mobile fecha o menu e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    const botao = screen.getByRole('button', { name: /abrir menu/i })
    const painel = document.getElementById('menu-mobile')!

    await user.click(botao)
    const link = within(painel).getAllByRole('link')[0]
    await user.click(link)

    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(painel).toHaveAttribute('hidden')
    expect(document.activeElement).toBe(botao)
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
