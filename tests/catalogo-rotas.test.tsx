import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { axe } from 'vitest-axe'
import PaginaCatalogo, { metadata as metadataDoCatalogo } from '@/app/catalogo/page'
import PaginaLinha, { dynamicParams, generateMetadata, generateStaticParams } from '@/app/catalogo/[linha]/page'
import { TelaCatalogo } from '@/components/layout/TelaCatalogo'
import { duasVozes } from '@/components/sections/TopoCatalogo'
import { linhasComProduto, montarCatalogo, montarGaveta } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const params = (linha: string) => ({ params: Promise.resolve({ linha }) })
const daLinha = await PaginaLinha(params('bolos-no-pote'))
const tudoMisto = (
  <TelaCatalogo
    vista={montarCatalogo(CATALOGO_MISTO, null)}
    gaveta={montarGaveta(CATALOGO_MISTO)}
    linhas={linhasComProduto(CATALOGO_MISTO)}
  />
)

describe('as rotas', () => {
  it('uma página por linha com produto, e nenhuma outra', async () => {
    expect(await generateStaticParams()).toEqual([{ linha: 'bolos-no-pote' }])
    expect(dynamicParams).toBe(false)
  })

  it('slug que não é linha dá 404', async () => {
    await expect(PaginaLinha(params('tortas'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it('título e descrição da página da linha', async () => {
    expect(await generateMetadata(params('bolos-no-pote'))).toEqual({
      title: 'Bolos no pote · Catálogo · AMO',
      description: 'Bolos no pote, zero açúcar. Um abraço em forma de sobremesa.',
    })
    expect(await generateMetadata(params('tortas'))).toEqual({})
    expect(metadataDoCatalogo.title).toBe('Catálogo · AMO')
  })

  it('com uma linha só, /catalogo é a página dela', async () => {
    render(await PaginaCatalogo())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bolos no pote')
  })
})

describe.each([
  ['a página de uma linha', daLinha],
  ['"Tudo" com três linhas', tudoMisto],
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

  it('exatamente uma imagem sem lazy nem eager: a capa, pré-carregada', () => {
    const { container } = montar()
    const semLoading = [...container.querySelectorAll('img')].filter((img) => !img.hasAttribute('loading'))
    expect(semLoading).toHaveLength(1)
    expect(semLoading[0].closest('.topo-catalogo__capa')).toBeTruthy()
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

  it('passa no axe', async () => {
    const { container } = montar()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('o topo', () => {
  it('numa linha: a trilha até ela, o nome, a frase, a contagem e o selo da regra', () => {
    render(daLinha)
    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(within(trilha).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
    expect(within(trilha).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalogo')
    expect(within(trilha).getByText('Bolos no pote')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bolos no pote')
    expect(screen.getByText('Um abraço em forma de sobremesa.')).toBeInTheDocument()
    expect(screen.getByText('7 receitas')).toHaveClass('topo-catalogo__conta')
    expect(document.querySelector('.topo-catalogo .selo-carimbo')).toHaveTextContent('Zero açúcar')
  })

  it('o título tem duas vozes e nada acima dele além da trilha: a regra vem depois', () => {
    render(daLinha)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.querySelector('em')).toHaveTextContent('no pote')
    expect(h1.previousElementSibling).toBe(screen.getByRole('navigation', { name: 'Trilha' }))
    const regra = document.querySelector('.topo-catalogo .selo-carimbo')!
    expect(h1.compareDocumentPosition(regra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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

  it('em "Tudo": a trilha para em Catálogo, três capas e nenhum selo', () => {
    render(tudoMisto)
    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(within(trilha).getByText('Catálogo')).toHaveAttribute('aria-current', 'page')
    expect(within(trilha).queryByRole('link', { name: 'Catálogo' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('O catálogo inteiro')
    expect(document.querySelectorAll('.topo-catalogo__capa')).toHaveLength(3)
    expect(document.querySelector('.topo-catalogo__capas')).toHaveAttribute('aria-hidden', 'true')
    expect(document.querySelector('.topo-catalogo .selo-carimbo')).toBeNull()
  })

  it.each([
    ['numa linha', daLinha],
    ['em "Tudo"', tudoMisto],
  ] as [string, ReactElement][])('%s a página fecha com a assinatura da marca, sem divisor de onda', (_, pagina) => {
    const { container } = render(pagina)
    const main = screen.getByRole('main')
    expect(main.lastElementChild).toHaveClass('catalogo__fecho', 'superficie-escura')
    expect(main.lastElementChild).toHaveTextContent('AMO por você. Por seu AMO.')
    expect(container.querySelector('.camadas, .rotulo-secao')).toBeNull()
  })

  it('os links de sabor da gaveta acham o seu card nesta página', () => {
    const { container } = render(daLinha)
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="/catalogo/bolos-no-pote#"]')]
    expect(links).toHaveLength(7)
    for (const a of links) {
      const alvo = container.querySelector(`#${a.getAttribute('href')!.split('#')[1]}`)
      expect(alvo, a.href).toBeTruthy()
      expect(alvo!).toHaveClass('scroll-mt-24')
    }
  })
})

describe('o HTML do servidor da página da linha', () => {
  const html = renderToString(daLinha)
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

  it('pré-carrega exatamente uma imagem: a capa', () => {
    const preloads = [...html.matchAll(/<link[^>]*rel="preload"[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => /as="image"/.test(tag))
    expect(preloads, preloads.join('\n')).toHaveLength(1)
    expect(preloads[0]).toContain('prestigio')
  })

  it('a página inteira está no HTML: os 7 cards e o rótulo da linha', () => {
    expect(doc.querySelectorAll('.catalogo article.card-produto')).toHaveLength(7)
    expect(doc.querySelector('.catalogo__rotulo-linha .papel-rotulo')).toBeTruthy()
  })
})
