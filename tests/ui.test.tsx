import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { Pilula, PilulaLink } from '@/components/ui/Pilula'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import { ComAmo } from '@/components/ui/ComAmo'

describe('BotaoRetro', () => {
  it('é um link sem enfeite dentro: no hover a largura não muda', () => {
    render(<BotaoRetro href="#cardapio">Ver o cardápio</BotaoRetro>)
    const link = screen.getByRole('link', { name: 'Ver o cardápio' })
    expect(link).toHaveAttribute('href', '#cardapio')
    expect(link).toHaveClass('btn-retro')
    expect(link.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('escuro e compacto são classes, nada mais', () => {
    render(
      <BotaoRetro href="#cardapio" escuro compacto className="extra">
        Ver cardápio
      </BotaoRetro>,
    )
    expect(screen.getByRole('link')).toHaveClass('btn-retro', 'btn-retro--escuro', 'btn-retro--compacto', 'extra')
  })
})

describe('Pilula', () => {
  it('é botão de verdade e repassa o estado', () => {
    render(
      <Pilula aria-pressed={true} variante="selo">
        Integral
      </Pilula>,
    )
    const botao = screen.getByRole('button', { name: 'Integral' })
    expect(botao).toHaveAttribute('type', 'button')
    expect(botao).toHaveAttribute('aria-pressed', 'true')
    expect(botao).toHaveClass('pilula', 'pilula--selo')
  })

  it('PilulaLink é link, e ativa vira classe', () => {
    render(
      <PilulaLink href="#cardapio" variante="clara" ativa>
        Bolos no pote
      </PilulaLink>,
    )
    expect(screen.getByRole('link', { name: 'Bolos no pote' })).toHaveClass('pilula', 'pilula--clara', 'ativa')
  })
})

describe('LinkSublinhado', () => {
  it('o traço é decorativo e mede 1, para o dasharray "1 2" esconder sem sobrar ponto', () => {
    const { container } = render(<LinkSublinhado href="#hoje">Hoje o dia pede</LinkSublinhado>)
    expect(screen.getByRole('link', { name: 'Hoje o dia pede' })).toHaveAttribute('href', '#hoje')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('path')).toHaveAttribute('pathLength', '1')
  })

  it('o traço tem classe própria: um ícone dentro do link não vira sublinhado', () => {
    const { container } = render(
      <LinkSublinhado href="/catalogo">
        Ver <svg className="icone" aria-hidden="true" />
      </LinkSublinhado>,
    )
    expect(container.querySelectorAll('.link-sub__traco')).toHaveLength(1)
    expect(container.querySelector('.link-sub__traco path')).toHaveAttribute('pathLength', '1')
    expect(container.querySelector('.icone')).not.toHaveClass('link-sub__traco')
  })
})

describe('SeloCarimbo', () => {
  it('mostra o texto do selo', () => {
    render(<SeloCarimbo texto="Zero açúcar" />)
    expect(screen.getByText('Zero açúcar')).toBeInTheDocument()
  })
})

describe('ComAmo', () => {
  it('blinda o AMO contra tradução automática e mantém o resto do texto', () => {
    const { container } = render(
      <p>
        <ComAmo texto="Como aproveitar seu AMO, por seu AMO" />
      </p>,
    )
    expect(container.textContent).toBe('Como aproveitar seu AMO, por seu AMO')
    const blindados = container.querySelectorAll('span[translate="no"]')
    expect(blindados).toHaveLength(2)
    for (const b of blindados) expect(b).toHaveTextContent('AMO')
  })

  it('não confunde AMO com amora', () => {
    const { container } = render(<ComAmo texto="Amora e AMOR" />)
    expect(container.querySelectorAll('span[translate="no"]')).toHaveLength(0)
  })
})
