// tests/ui.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Reveal } from '@/components/ui/Reveal'
import { Estrato } from '@/components/ui/Estrato'
import { Pill } from '@/components/ui/Pill'
import { Etiqueta } from '@/components/ui/Etiqueta'

describe('Reveal', () => {
  it('renderiza os filhos', () => {
    render(<Reveal><p>oi</p></Reveal>)
    expect(screen.getByText('oi')).toBeInTheDocument()
  })
})

describe('Estrato', () => {
  it('renderiza um svg decorativo, escondido de leitor de tela', () => {
    const { container } = render(<Estrato n={1} corDestino="fill-cream" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('estica a curva na horizontal em vez de deformar proporcionalmente', () => {
    const { container } = render(<Estrato n={1} corDestino="fill-cream" />)
    expect(container.querySelector('svg')).toHaveAttribute(
      'preserveAspectRatio',
      'none',
    )
  })

  it('usa a classe de fill que recebeu', () => {
    const { container } = render(<Estrato n={2} corDestino="fill-sage" />)
    expect(container.querySelector('path')).toHaveClass('fill-sage')
  })

  it('as 5 fronteiras têm curvas diferentes — nenhuma repetida', () => {
    const ds = ([1, 2, 3, 4, 5] as const).map((n) => {
      const { container } = render(<Estrato n={n} corDestino="fill-cream" />)
      return container.querySelector('path')!.getAttribute('d')!
    })
    expect(new Set(ds).size).toBe(5)
  })
})

describe('Pill', () => {
  it('é um link quando recebe href', () => {
    render(<Pill href="#sabores">Ver os sabores</Pill>)
    const el = screen.getByRole('link', { name: 'Ver os sabores' })
    expect(el).toHaveAttribute('href', '#sabores')
  })

  it('é um button type=button quando não recebe href', () => {
    render(<Pill>Enviar</Pill>)
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute(
      'type',
      'button',
    )
  })

  it('usa rosewood-forte no fundo, não rosewood puro', () => {
    render(<Pill href="#x">CTA</Pill>)
    expect(screen.getByRole('link')).toHaveClass('bg-rosewood-forte')
  })
})

describe('Etiqueta', () => {
  it('não é interativa — é rótulo, não botão', () => {
    render(<Etiqueta>Zero açúcar</Etiqueta>)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Zero açúcar')).toBeInTheDocument()
  })
})
