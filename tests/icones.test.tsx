import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { IconeSelo } from '@/components/icons/selos'

describe('IconeSelo', () => {
  it('desenha o ícone do selo conhecido, escondido do leitor de tela', () => {
    const { container } = render(<IconeSelo id="vapor" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('selo sem ícone desenhado cai no genérico', () => {
    const { container } = render(<IconeSelo id="vegano" />)
    expect(container.querySelector('svg circle')).toBeInTheDocument()
  })
})
