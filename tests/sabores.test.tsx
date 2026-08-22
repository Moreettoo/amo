// tests/sabores.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sabores } from '@/components/sections/Sabores'
import { SaborCard } from '@/components/ui/SaborCard'
import { SABORES } from '@/data/sabores'

describe('SaborCard', () => {
  const s = SABORES[0]

  it('mostra nome, sabor e a frase da etiqueta', () => {
    render(<SaborCard sabor={s} />)
    expect(screen.getByText(s.nome)).toBeInTheDocument()
    expect(screen.getByText(s.sabor)).toBeInTheDocument()
    expect(screen.getByText(s.frase)).toBeInTheDocument()
  })

  it('não é link nem botão — nada acontece ainda, e botão morto é pior', () => {
    render(<SaborCard sabor={s} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('não mostra preço na v1', () => {
    const { container } = render(<SaborCard sabor={s} />)
    expect(container.textContent).not.toMatch(/R\$/)
  })

  it('a foto carrega em lazy, com alt e dimensões', () => {
    render(<SaborCard sabor={s} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', s.alt)
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('width')
    expect(img).toHaveAttribute('height')
  })

  it('marca o nome do produto como não traduzível', () => {
    const { container } = render(<SaborCard sabor={s} />)
    expect(container.querySelector('[translate="no"]')?.textContent).toBe(s.nome)
  })

  it('usa proporção 3:4 na foto — o menor corte medido nas 7 fotos', () => {
    const { container } = render(<SaborCard sabor={s} />)
    expect(container.querySelector('.aspect-\\[3\\/4\\]')).toBeTruthy()
  })
})

describe('Sabores', () => {
  it('tem id de âncora, alvo dos CTAs', () => {
    const { container } = render(<Sabores />)
    expect(container.querySelector('#sabores')).toBeTruthy()
  })

  it('renderiza os 7 cards, um por sabor', () => {
    const { container } = render(<Sabores />)
    expect(container.querySelectorAll('article')).toHaveLength(7)
  })

  it('mostra os 7 nomes', () => {
    render(<Sabores />)
    for (const s of SABORES) expect(screen.getByText(s.nome)).toBeInTheDocument()
  })

  it('tem o painel de assinatura como 8ª célula, esticando em md', () => {
    const { container } = render(<Sabores />)
    const painel = container.querySelector('[data-painel]')
    expect(painel).toBeTruthy()
    // em md a grade tem 3 colunas: 7 cards + painel de 2 colunas fecha 3+3+2
    expect(painel).toHaveClass('md:col-span-2')
    expect(painel).toHaveClass('lg:col-span-1')
  })

  it('a grade tem as colunas certas em cada breakpoint', () => {
    const { container } = render(<Sabores />)
    const grade = container.querySelector('[data-grade]')
    expect(grade).toBeTruthy()
    // A grade base e sm tem 1 e 2 colunas; md tem 3, lg tem 4.
    // O painel estica em md para fechar a linha: sem isso, 7+1 deixa buraco.
    // Ambos os lados desse invariante (grid-cols-* e painel's col-span-*) devem estar sincronizados.
    expect(grade).toHaveClass('grid-cols-1')
    expect(grade).toHaveClass('sm:grid-cols-2')
    expect(grade).toHaveClass('md:grid-cols-3')
    expect(grade).toHaveClass('lg:grid-cols-4')
  })

  it('tem hierarquia de headings correta', () => {
    render(<Sabores />)
    // A seção tem um h2 como seu próprio título
    const sectionHeading = screen.getByRole('heading', { level: 2 })
    expect(sectionHeading).toBeInTheDocument()
    expect(sectionHeading.textContent).toBe('Cada pote tem um nome')

    // Cada card tem um h3 para o nome do sabor
    const cardHeadings = screen.getAllByRole('heading', { level: 3 })
    expect(cardHeadings).toHaveLength(7)

    // A seção não deve introduzir um h1 (o h1 único é do Hero)
    const { container } = render(<Sabores />)
    expect(container.querySelector('h1')).toBeNull()
  })

  it('assert as cópias hardcoded da seção', () => {
    const { container } = render(<Sabores />)
    // Título principal da seção
    expect(screen.getByText('Cada pote tem um nome')).toBeInTheDocument()
    // Subtítulo com acento
    expect(screen.getByText('Escolha pelo sabor, ou pelo que você está sentindo.')).toBeInTheDocument()
    // Texto do painel de assinatura
    const painel = container.querySelector('[data-painel]')
    expect(painel?.textContent).toContain('Um abraço em forma de sobremesa')
  })
})
