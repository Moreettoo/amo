import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '@/components/sections/Hero'
import type { Produto } from '@/lib/catalogo'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { montarVisao } from '@/lib/visao'

const visao = montarVisao(await carregarCatalogo())
const montar = (palco: readonly Produto[] = visao.palco) =>
  render(<Hero palco={palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />)

describe('Hero', () => {
  it('o h1 é a assinatura da marca', () => {
    montar()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Para quem ama comer bem.')
  })

  it('as fotos do palco seguem a visão, e só a do destaque tem preload', () => {
    montar()
    const fotos = screen.getAllByRole('img')
    expect(fotos.map((f) => f.getAttribute('alt'))).toEqual(visao.palco.map((p) => p.imagem.alt))
    const semLoading = fotos.filter((f) => !f.hasAttribute('loading'))
    expect(semLoading).toHaveLength(1)
    expect(semLoading[0]).toHaveAttribute('alt', visao.destaque.imagem.alt)
    for (const f of fotos.filter((f) => f.hasAttribute('loading'))) {
      expect(f).toHaveAttribute('loading', 'eager')
    }
  })

  it('o selo mostra a regra da linha do destaque', () => {
    montar()
    expect(screen.getByText('Zero açúcar')).toBeInTheDocument()
  })

  it('as ações levam ao cardápio e ao Hoje o dia pede', () => {
    montar()
    expect(screen.getByRole('link', { name: 'Ver o cardápio' })).toHaveAttribute('href', '/catalogo')
    expect(screen.getByRole('link', { name: 'Escolher pela vontade' })).toHaveAttribute('href', '#hoje')
  })

  it('é a seção #topo, clara, com o deslocamento da nav', () => {
    const { container } = montar()
    const secao = container.querySelector('section')!
    expect(secao).toHaveAttribute('id', 'topo')
    expect(secao).toHaveClass('scroll-mt-24')
    // creme: o foco fica expresso, como nas outras superficies claras
    expect(secao).not.toHaveClass('superficie-escura')
  })

  it('o destaque fica no meio do palco', () => {
    const { container } = montar()
    const itens = [...container.querySelectorAll('.palco__item')]
    expect(itens.map((i) => i.classList.contains('palco__item--meio'))).toEqual([false, true, false])
  })

  it('formato desconhecido no palco cai na moldura neutra', () => {
    const [primeiro, ...resto] = visao.palco
    const { container } = montar([{ ...primeiro, formato: 'caixa' }, ...resto])
    expect(container.querySelector('.palco__item--neutra')).toBeInTheDocument()
  })
})
