// tests/fechamento.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Bento } from '@/components/sections/Bento'
import { FaixaAssinatura } from '@/components/sections/FaixaAssinatura'
import { CtaFinal } from '@/components/sections/CtaFinal'

describe('Bento', () => {
  it('tem as 3 células', () => {
    const { container } = render(<Bento />)
    expect(container.querySelectorAll('[data-celula]')).toHaveLength(3)
  })

  it('traz a linha secundária do rótulo', () => {
    // container.textContent, não getByText: mesma razão do teste equivalente
    // de AMarca (tests/selos-marca.test.tsx) — cada "AMO" da linha agora vive
    // no seu próprio <span translate="no"> (revisão da Task 12, Important 3),
    // e getByText não atravessa elementos filhos por padrão.
    const { container } = render(<Bento />)
    expect(container.textContent).toContain('AMO por você. Por seu AMO.')
  })

  it('esconde o texto fantasma decorativo do leitor de tela', () => {
    const { container } = render(<Bento />)
    const fantasma = container.querySelector('[data-fantasma]')
    expect(fantasma).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('FaixaAssinatura', () => {
  it('mostra a assinatura da tarja do rótulo', () => {
    render(<FaixaAssinatura />)
    expect(
      screen.getByText(/um abraço em forma de sobremesa/i),
    ).toBeInTheDocument()
  })

  it('usa rosewood puro como superfície — o texto é display grande', () => {
    const { container } = render(<FaixaAssinatura />)
    expect(container.firstElementChild).toHaveClass('bg-rosewood')
  })

  it('é estática: sem marquee, sem animação em loop', () => {
    const { container } = render(<FaixaAssinatura />)
    const html = container.innerHTML
    expect(html).not.toMatch(/animate-\[?marquee/i)
    expect(html).not.toMatch(/infinite/i)
  })
})

describe('CtaFinal', () => {
  it('fecha com a assinatura da marca e um link real', () => {
    render(<CtaFinal />)
    expect(
      screen.getByRole('heading', { level: 2, name: /para quem ama comer bem/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver os sabores/i })).toHaveAttribute(
      'href',
      '#sabores',
    )
  })
})
