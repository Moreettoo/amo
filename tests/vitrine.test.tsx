import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Vitrine } from '@/components/sections/Vitrine'
import { carregarCatalogo, type Catalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

function montar(catalogo: Catalogo) {
  const v = montarVisao(catalogo)
  return render(
    <Vitrine
      produtos={v.vitrine}
      linhas={v.linhasNaVitrine}
      total={v.total}
      tipos={v.tipos}
      nomesDosSelos={v.nomesDosSelos}
    />,
  )
}

const nomes = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('Vitrine com o cadastro de hoje', () => {
  it('o título de sempre e 4 cards: o destaque e os seguintes', async () => {
    montar(await carregarCatalogo())
    expect(screen.getByRole('heading', { level: 2, name: 'Escolha pelo sabor' })).toBeInTheDocument()
    expect(nomes()).toEqual(['Prestígio', 'Paçoca', 'Mousse de maracujá', 'Ninho com frutas vermelhas'])
  })

  it('dois caminhos para o catálogo, e nenhum atalho de linha', async () => {
    montar(await carregarCatalogo())
    expect(screen.getByRole('link', { name: 'Ver as 7 receitas' })).toHaveAttribute('href', '/catalogo')
    expect(screen.getByRole('link', { name: 'Ver o catálogo inteiro' })).toHaveAttribute('href', '/catalogo')
    expect(screen.queryByText('Direto para uma linha')).toBeNull()
  })

  it('"Ver as 7 receitas" leva a seta da spec, decorativa, sem mudar o nome do link', async () => {
    montar(await carregarCatalogo())
    const link = screen.getByRole('link', { name: 'Ver as 7 receitas' })
    expect(link.querySelector('.vitrine__seta')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sem filtro, sem região viva, sem estado vazio', async () => {
    const { container } = montar(await carregarCatalogo())
    expect(screen.queryByRole('group')).toBeNull()
    expect(container.querySelector('[aria-live]')).toBeNull()
    expect(screen.queryByText(/Nenhuma receita/)).toBeNull()
  })

  it('é a seção #cardapio, com o deslocamento da nav', async () => {
    const { container } = montar(await carregarCatalogo())
    expect(container.querySelector('section')).toHaveAttribute('id', 'cardapio')
    expect(container.querySelector('section')).toHaveClass('scroll-mt-24')
  })
})

describe('Vitrine com três linhas', () => {
  it('o destaque e um de cada outra linha', () => {
    montar(CATALOGO_MISTO)
    expect(nomes()).toEqual(['Prestígio', 'Cenoura com cacau', 'Torta de frango', 'Paçoca'])
  })

  it('um atalho por linha, com a contagem, para a página dela', () => {
    montar(CATALOGO_MISTO)
    const lista = screen.getByRole('list', { name: 'Direto para uma linha' })
    expect(
      within(lista).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]),
    ).toEqual([
      ['Bolos no pote 7', '/catalogo#linha-bolos-no-pote'],
      ['Bolos inteiros 2', '/catalogo#linha-bolos-inteiros'],
      ['Salgados 2', '/catalogo#linha-salgados'],
    ])
    expect(screen.getByRole('link', { name: 'Ver as 11 receitas' })).toHaveAttribute('href', '/catalogo')
  })
})
