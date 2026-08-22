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

  it('não introduz <h1> — o único da página é o do Hero', () => {
    render(<Selos />)
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
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
    // U+00A0 é exigido pelo rótulo — uma quebra de linha nesse ponto arruína
    // a leitura. A asserção é sobre o codepoint exato (não um \s* frouxo,
    // que casa com espaço normal, NBSP ou nada) porque esse caractere já foi
    // derrubado em silêncio antes neste projeto.
    expect(texto).toContain('eritritol e\u00A0stevia')
    expect(texto).toMatch(/cozido a vapor/i)
    // Guarda jurídica, não capricho de copywriter: AMO é marca real de
    // alimento, e um claim médico ou nutricional que o rótulo não sustenta é
    // exposição legal. Lista agrupada por categoria de claim — emagrecimento,
    // calorias, ação fisiológica, halo nutricional, endosso profissional,
    // glicemia/diabetes. Se este teste disparar, a resposta é mudar o texto,
    // nunca alargar a regex para o texto passar.
    expect(texto).not.toMatch(
      /emagrec|perde\s+peso|queima\s+gordura|hipocal[óo]ric|zero\s+caloria|\bcura\b|previne|\btrata\b|combate|colesterol|imunidade|antioxidante|glicem|glic[êe]mic|insulin|diabet|detox|nutritiv|nutricionista|\bfit\b|\blight\b/i,
    )
  })

  it('a foto tem alt descritivo', () => {
    render(<AMarca />)
    expect(screen.getByRole('img')).toHaveAttribute('alt', expect.stringMatching(/pote/i))
  })

  it('não introduz <h1> — o único da página é o do Hero', () => {
    render(<AMarca />)
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
