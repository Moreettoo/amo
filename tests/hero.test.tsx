// tests/hero.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '@/components/sections/Hero'

describe('Hero', () => {
  it('tem um h1 só, com a assinatura da marca', () => {
    render(<Hero />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0].textContent?.replace(/\s+/g, ' ')).toContain(
      'Um abraço em forma de sobremesa',
    )
  })

  it('quebra o h1 em 3 faixas — a tese da secção transversal', () => {
    const { container } = render(<Hero />)
    expect(container.querySelectorAll('[data-faixa]')).toHaveLength(3)
  })

  it('mostra o claim do rótulo na etiqueta', () => {
    render(<Hero />)
    expect(screen.getByText(/zero açúcar · cozido a vapor/i)).toBeInTheDocument()
  })

  it('traz a assinatura em script', () => {
    render(<Hero />)
    expect(screen.getByText('Para quem ama comer bem.')).toBeInTheDocument()
  })

  it('o CTA é link para a seção de sabores, não botão morto', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: /ver os sabores/i })).toHaveAttribute(
      'href',
      '#sabores',
    )
  })

  it('o pote tem alt descritivo e dimensões declaradas', () => {
    render(<Hero />)
    const img = screen.getByRole('img', { name: /pote de vidro/i })
    expect(img).toHaveAttribute('width')
    expect(img).toHaveAttribute('height')
  })

  it('a anotação manuscrita está presente', () => {
    render(<Hero />)
    expect(screen.getByText(/sem abrir mão do doce/i)).toBeInTheDocument()
  })
})
