import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Ritual } from '@/components/sections/Ritual'

describe('Ritual', () => {
  it('tem id de âncora e o título literal do rótulo', () => {
    const { container } = render(<Ritual />)
    expect(container.querySelector('#ritual')).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: /como aproveitar seu amo/i }),
    ).toBeInTheDocument()
  })

  it('é uma lista ordenada, a ordem carrega informação de verdade', () => {
    const { container } = render(<Ritual />)
    const ol = container.querySelector('ol')
    expect(ol).toBeTruthy()
    expect(ol!.querySelectorAll('li')).toHaveLength(4)
  })

  it('mostra os 4 passos na ordem do rótulo', () => {
    const { container } = render(<Ritual />)
    const itens = [...container.querySelectorAll('ol li')].map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    )
    expect(itens[0]).toContain('Abra com amor')
    expect(itens[1]).toContain('Pegue sua colher')
    expect(itens[2]).toContain('A saboreie sem culpa')
    expect(itens[3]).toContain('Cuide do pote de vidro')
  })

  it('esconde o numeral decorativo do leitor de tela, o <ol> já numera', () => {
    const { container } = render(<Ritual />)
    const numerais = container.querySelectorAll('[data-numeral]')
    expect(numerais).toHaveLength(4)
    for (const n of numerais) expect(n).toHaveAttribute('aria-hidden', 'true')
  })
})
