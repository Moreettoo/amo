import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { axe } from 'vitest-axe'
import PaginaCatalogo, { generateMetadata } from '@/app/catalogo/page'
import { TelaCatalogo } from '@/components/layout/TelaCatalogo'
import { duasVozes } from '@/components/sections/TopoCatalogo'
import { linhasComProduto, montarCatalogo, montarGaveta } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const deHoje = await PaginaCatalogo()
const misto = (
  <TelaCatalogo
    vista={montarCatalogo(CATALOGO_MISTO)}
    gaveta={montarGaveta(CATALOGO_MISTO)}
    linhas={linhasComProduto(CATALOGO_MISTO)}
  />
)

describe('a rota', () => {
  it('o catálogo é uma página só: a rota por linha não existe mais', () => {
    expect(existsSync(resolve(import.meta.dirname, '../src/app/catalogo/[linha]'))).toBe(false)
  })

  it('título e descrição da página, tirados do cadastro', async () => {
    expect(await generateMetadata()).toEqual({
      title: 'Catálogo · AMO',
      description: 'Doces. Cada linha com a sua regra no rótulo.',
    })
  })
})

describe.each([
  ['o catálogo de hoje', deHoje],
  ['o catálogo com duas categorias', misto],
] as [string, ReactElement][])('%s', (_, pagina) => {
  const montar = () => render(pagina)

  it('tem exatamente um h1 e não pula nível de heading', () => {
    const { container } = montar()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const niveis = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]))
    for (let i = 1; i < niveis.length; i++) expect(niveis[i] - niveis[i - 1]).toBeLessThanOrEqual(1)
  })

  it('imagem sempre com alt, width e height', () => {
    const { container } = montar()
    for (const img of container.querySelectorAll('img')) {
      expect(img.hasAttribute('alt')).toBe(true)
      expect(img.hasAttribute('width')).toBe(true)
      expect(img.hasAttribute('height')).toBe(true)
    }
  })

  it('exatamente uma imagem sem lazy nem eager: a primeira foto da primeira grade, pré-carregada', () => {
    const { container } = montar()
    const semLoading = [...container.querySelectorAll('img')].filter((img) => !img.hasAttribute('loading'))
    expect(semLoading).toHaveLength(1)
    expect(semLoading[0].closest('#prestigio')).toBeTruthy()
  })

  it('sem afordância morta, sem preço, sem reticências', () => {
    const { container } = montar()
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href')).toBeTruthy()
    for (const b of container.querySelectorAll('button')) expect(b.getAttribute('type')).toBe('button')
    expect(container.textContent).not.toMatch(/R\$\s?\d/)
    expect(container.textContent).not.toMatch(/\.\.\./)
  })

  it('ids únicos', () => {
    const { container } = montar()
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(ids.length - new Set(ids).size).toBe(0)
  })

  it('todo link para uma âncora do catálogo acha o alvo nesta página, e o alvo desconta a nav', () => {
    const { container } = montar()
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="/catalogo#"], a[href^="#"]')]
    expect(links.length).toBeGreaterThan(0)
    for (const a of links) {
      const id = a.getAttribute('href')!.split('#')[1]
      const alvo = container.querySelector(`[id="${id}"]`)
      expect(alvo, a.getAttribute('href')!).toBeTruthy()
      expect(alvo!).toHaveClass('scroll-mt-24')
    }
  })

  it('todo "AMO" de texto está dentro de translate="no"', () => {
    const { container } = montar()
    const caminhante = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let no: Node | null
    let vistos = 0
    while ((no = caminhante.nextNode())) {
      if (!/\bAMO\b/.test(no.textContent ?? '')) continue
      vistos++
      expect(no.parentElement?.getAttribute('translate'), no.parentElement?.outerHTML).toBe('no')
    }
    expect(vistos).toBeGreaterThan(0)
  })

  it('a página fecha com a assinatura da marca, sem o rótulo da linha antes dela', () => {
    const { container } = montar()
    const main = screen.getByRole('main')
    expect(main.lastElementChild).toHaveClass('catalogo__fecho', 'superficie-escura')
    expect(main.lastElementChild).toHaveTextContent('AMO por você. Por seu AMO.')
    expect(screen.queryByRole('heading', { name: /O rótulo da linha/ })).toBeNull()
    expect(container.querySelector('.papel-rotulo, .camadas, .rotulo-secao')).toBeNull()
  })

  it('passa no axe', async () => {
    const { container } = montar()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('o topo', () => {
  it('creme: a trilha para em Catálogo, o título em duas vozes e o lead; sem capa, sem selo, sem contagem', () => {
    const { container } = render(deHoje)
    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(within(trilha).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
    expect(within(trilha).getByText('Catálogo')).toHaveAttribute('aria-current', 'page')
    expect(within(trilha).queryByRole('link', { name: 'Catálogo' })).toBeNull()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('O catálogo inteiro')
    expect(h1.querySelector('em')).toHaveTextContent('inteiro')
    expect(h1.previousElementSibling).toBe(trilha)
    const topo = h1.closest('.topo-catalogo')!
    expect(topo).toHaveClass('topo-catalogo--claro')
    expect(topo).not.toHaveClass('superficie-escura')
    expect(within(topo as HTMLElement).getByText('Cada linha com a sua regra no rótulo.')).toBeInTheDocument()
    expect(container.querySelector('.topo-catalogo__capas, .topo-catalogo__conta, .topo-catalogo .selo-carimbo')).toBeNull()
  })

  it('com duas categorias, o lead diz quais são', () => {
    render(misto)
    expect(screen.getByText('Doces e salgados. Cada linha com a sua regra no rótulo.')).toHaveClass('topo-catalogo__lead')
  })

  it('duasVozes: a última palavra vai para o script e leva o conectivo que a antecede', () => {
    expect(duasVozes('Bolos no pote')).toEqual(['Bolos', 'no pote'])
    expect(duasVozes('O catálogo inteiro')).toEqual(['O catálogo', 'inteiro'])
    expect(duasVozes('Bolos inteiros')).toEqual(['Bolos', 'inteiros'])
    expect(duasVozes('Pão de queijo e mel')).toEqual(['Pão de queijo', 'e mel'])
    // uma palavra so: sem script, e a primeira voz nunca fica vazia
    expect(duasVozes('Salgados')).toEqual(['Salgados', null])
    expect(duasVozes('De colher')).toEqual(['De', 'colher'])
  })
})

describe('os títulos em ordem', () => {
  it('hoje: h1, h2 da categoria, h3 da linha e h4 em cada um dos 7 cards', () => {
    render(deHoje)
    const main = screen.getByRole('main')
    const titulos = [...main.querySelectorAll('h1,h2,h3,h4')].map((h) => `${h.tagName} ${h.textContent}`)
    expect(titulos.slice(0, 4)).toEqual(['H1 O catálogo inteiro', 'H2 Doces', 'H3 Bolos no pote', 'H4 Prestígio'])
    expect(titulos.filter((t) => t.startsWith('H4'))).toHaveLength(7)
  })
})

describe('o HTML do servidor', () => {
  const html = renderToString(deHoje)
  const doc = new DOMParser().parseFromString(html, 'text/html')

  it('não esconde nada por estilo inline e não sai com a classe play', () => {
    for (const el of doc.querySelectorAll('[style]')) {
      const estilo = el.getAttribute('style') ?? ''
      expect(estilo, el.outerHTML.slice(0, 120)).not.toMatch(/(^|;)\s*opacity:\s*0(\.0+)?\s*(;|$)|visibility:\s*hidden|clip-path/)
      const transforma = /(^|;)\s*transform:\s*(?!none\s*(;|$))/.test(estilo)
      expect(transforma && !el.hasAttribute('data-parallax'), el.outerHTML.slice(0, 120)).toBe(false)
    }
    expect(doc.querySelectorAll('.play')).toHaveLength(0)
  })

  it('pré-carrega exatamente uma imagem: a primeira foto da grade', () => {
    const preloads = [...html.matchAll(/<link[^>]*rel="preload"[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => /as="image"/.test(tag))
    expect(preloads, preloads.join('\n')).toHaveLength(1)
    expect(preloads[0]).toContain('prestigio')
  })

  it('a página inteira está no HTML: o capítulo, a linha e os 7 cards', () => {
    expect(doc.querySelector('section#doces section#linha-bolos-no-pote')).toBeTruthy()
    expect(doc.querySelectorAll('.catalogo article.card-produto')).toHaveLength(7)
  })
})
