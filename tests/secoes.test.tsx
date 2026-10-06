import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Rotulos } from '@/components/sections/Rotulos'
import { AMarca } from '@/components/sections/AMarca'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { Final } from '@/components/sections/Final'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const real = montarVisao(await carregarCatalogo())
const misto = montarVisao(CATALOGO_MISTO)

describe('Rótulos', () => {
  it('com uma linha só: um rótulo largo e o título de linha única', () => {
    const { container } = render(<Rotulos linhas={real.rotulos} nomesDosSelos={real.nomesDosSelos} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('O que é saudável aqui está no rótulo.')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(container.querySelector('.mesa')).toHaveClass('mesa--unica')
    expect(container.querySelector('.papel-rotulo')).toHaveClass('papel-rotulo--papel', 'papel-rotulo--largo')
  })

  it('o rótulo do pote traz regra, os 6 selos com ícone, o modo de aproveitar e a faixa', () => {
    render(<Rotulos linhas={real.rotulos} nomesDosSelos={real.nomesDosSelos} />)
    const rotulo = screen.getByRole('article', { name: 'Bolos no pote' })
    expect(rotulo).toHaveTextContent('Zero açúcar')
    const selos = within(rotulo).getByRole('list', { name: 'Selos da linha Bolos no pote' })
    expect(within(selos).getAllByRole('listitem')).toHaveLength(6)
    expect(selos.querySelectorAll('svg')).toHaveLength(6)
    const passos = rotulo.querySelector('ol')!
    expect([...passos.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'Abra com amor',
      'Pegue sua colher',
      'A saboreie sem culpa',
      'Cuide do pote de vidro',
    ])
    expect(rotulo).toHaveTextContent('Como aproveitar seu AMO')
    expect(within(rotulo).getByText('AMO')).toHaveAttribute('translate', 'no')
    expect(rotulo).toHaveTextContent('Um abraço em forma de sobremesa')
  })

  it('com várias linhas: um rótulo por linha, na cor dela, e o título de várias', () => {
    const { container } = render(<Rotulos linhas={misto.rotulos} nomesDosSelos={misto.nomesDosSelos} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Cada linha tem a sua regra. Todas estão no rótulo.')
    const papeis = [...container.querySelectorAll('.papel-rotulo')]
    expect(papeis.map((p) => p.className.match(/papel-rotulo--(papel|linho|kraft)/)?.[1])).toEqual([
      'papel',
      'linho',
      'kraft',
    ])
    expect(papeis.map((p) => (p as HTMLElement).style.getPropertyValue('--giro'))).toEqual(['-2deg', '1.4deg', '-1deg'])
    expect(container.querySelector('.mesa')).not.toHaveClass('mesa--unica')
  })

  it('é a superfície escura #rotulos', () => {
    const { container } = render(<Rotulos linhas={real.rotulos} nomesDosSelos={real.nomesDosSelos} />)
    expect(container.querySelector('section')).toHaveAttribute('id', 'rotulos')
    expect(container.querySelector('section')).toHaveClass('superficie-escura', 'scroll-mt-24')
  })
})

describe('A marca', () => {
  it('foto do Beijinho, título e texto, sem repetir a assinatura da faixa', () => {
    const { container } = render(<AMarca foto={real.fotoDaMarca} />)
    expect(screen.getByAltText(/bolo de beijinho/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Comer bem não devia cobrar nada depois')
    expect(container.textContent).toContain('eritritol e stevia')
    expect(container.textContent).not.toMatch(/por você/)
    expect(screen.getByText('AMO')).toHaveAttribute('translate', 'no')
  })
})

describe('Faixa cobre', () => {
  it('traz a linha secundária da marca com os dois AMO blindados', () => {
    const { container } = render(<FaixaCobre />)
    expect(container.textContent).toBe('AMO por você. Por seu AMO. ♥')
    expect(container.querySelectorAll('span[translate="no"]')).toHaveLength(2)
  })
})

describe('Final', () => {
  it('com uma linha só, só o título e o botão para o catálogo', () => {
    render(<Final linhas={real.linhasNoFinal} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Escolha o seu AMO.')
    expect(screen.getByRole('link', { name: 'Ver o cardápio' })).toHaveAttribute('href', '/catalogo')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('com várias linhas, uma pílula por linha para a página dela', () => {
    render(<Final linhas={misto.linhasNoFinal} />)
    expect(screen.getByRole('link', { name: 'Salgados' })).toHaveAttribute('href', '/catalogo/salgados')
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })
})
