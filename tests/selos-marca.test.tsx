// tests/selos-marca.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Selos } from '@/components/sections/Selos'
import { AMarca } from '@/components/sections/AMarca'
import { SELOS } from '@/data/selos'

describe('Selos', () => {
  it('renderiza os 6 selos do rótulo', () => {
    render(<Selos />)
    for (const s of SELOS) {
      expect(screen.getByText(s.nome)).toBeInTheDocument()
    }
  })

  it('tem id de âncora que a nav e o footer usam', () => {
    const { container } = render(<Selos />)
    expect(container.querySelector('#selos')).toBeTruthy()
  })

  it('esconde todo ícone de leitor de tela — o nome já carrega o sentido', () => {
    const { container } = render(<Selos />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(6)
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  })
})

describe('AMarca', () => {
  it('tem id de âncora e h2', () => {
    const { container } = render(<AMarca />)
    expect(container.querySelector('#marca')).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: /para quem ama comer bem/i }),
    ).toBeInTheDocument()
  })

  it('cita a linha secundária do rótulo', () => {
    render(<AMarca />)
    expect(screen.getByText('AMO por você. Por seu AMO.')).toBeInTheDocument()
  })

  it('afirma só o que o rótulo afirma', () => {
    render(<AMarca />)
    const texto = document.body.textContent ?? ''
    expect(texto).toMatch(/eritritol e\s*stevia/i)
    expect(texto).toMatch(/cozido a vapor/i)
    // sem claim médico ou nutricional que o rótulo não faz
    expect(texto).not.toMatch(/emagrec|cura|diabet|light|fit\b/i)
  })

  it('a foto tem alt descritivo', () => {
    render(<AMarca />)
    expect(screen.getByRole('img')).toHaveAttribute('alt', expect.stringMatching(/pote/i))
  })
})
