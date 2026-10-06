import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import Home from '@/app/page'
import { PRODUTOS } from '@/data/produtos'

/**
 * Portao da pagina inteira (spec §11): so o que precisa da home montada.
 * Limite conhecido: renderiza o fragmento, nao um <html> de verdade, entao
 * as regras de documento do axe (region, landmark-one-main) nao rodam aqui.
 * O contraste real vem dos hex dos tokens (tests/tokens.test.ts), porque o
 * jsdom nao pinta pixel.
 */
const pagina = await Home()
const montar = () => render(pagina)

function arquivosFonte(): string[] {
  const raiz = resolve(import.meta.dirname, '../src')
  return readdirSync(raiz, { recursive: true })
    .filter((f): f is string => typeof f === 'string' && /\.(ts|tsx)$/.test(f))
    .map((f) => resolve(raiz, f))
}

describe('a página completa', () => {
  it('tem exatamente um h1', () => {
    montar()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('não pula nível de heading', () => {
    const { container } = montar()
    const niveis = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]))
    for (let i = 1; i < niveis.length; i++) expect(niveis[i] - niveis[i - 1]).toBeLessThanOrEqual(1)
  })

  it('as seções na ordem da spec', () => {
    const { container } = montar()
    expect([...container.querySelectorAll('section[id]')].map((s) => s.id)).toEqual([
      'topo',
      'cardapio',
      'hoje',
      'rotulos',
      'marca',
    ])
  })

  it('os 7 produtos aparecem pelo nome do produto, sem nome poético', () => {
    const { container } = montar()
    const cardapio = container.querySelector('#cardapio') as HTMLElement
    for (const p of PRODUTOS) {
      expect(within(cardapio).getByRole('heading', { level: 3, name: p.nome })).toBeInTheDocument()
    }
    expect(container.textContent).not.toMatch(/Aconchego|Raízes|Leveza|Encontro|Carinho|Intensamente|Energia/)
  })

  it('não deixa imagem sem alt nem sem width e height', () => {
    const { container } = montar()
    for (const img of container.querySelectorAll('img')) {
      expect(img.hasAttribute('alt')).toBe(true)
      expect(img.hasAttribute('width')).toBe(true)
      expect(img.hasAttribute('height')).toBe(true)
    }
  })

  it('todo link para uma seção da home aponta para um id que existe, e o alvo tem scroll-mt-24', () => {
    const { container } = montar()
    const ids = new Set(
      [...container.querySelectorAll('a[href^="#"], a[href^="/#"]')]
        .map((a) => a.getAttribute('href')!.replace(/^\/?#/, ''))
        .filter(Boolean),
    )
    expect(ids.size).toBeGreaterThan(3)
    for (const id of ids) {
      const alvo = container.querySelector(`#${id}`)
      expect(alvo, `âncora morta: #${id}`).toBeTruthy()
      expect(alvo!.className, `#${id} sem scroll-mt-24`).toMatch(/\bscroll-mt-24\b/)
    }
  })

  it('não tem afordância morta: link sempre com href, botão sempre com type', () => {
    const { container } = montar()
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href')).toBeTruthy()
    for (const b of container.querySelectorAll('button')) expect(b.getAttribute('type')).toBe('button')
  })

  it('não mostra preço nem reticências de três pontos', () => {
    const { container } = montar()
    expect(container.textContent).not.toMatch(/R\$\s?\d/)
    expect(container.textContent).not.toMatch(/\.\.\./)
  })

  it('passa no axe sem violação', async () => {
    const { container } = montar()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('o &nbsp; de "eritritol e stevia" na marca sobrevive como U+00A0', () => {
    const { container } = montar()
    expect((container.textContent ?? '').split('e stevia').length - 1).toBe(1)
  })

  it('exatamente uma imagem tem preload: a do destaque no hero, no DOM e no código', () => {
    const { container } = montar()
    const semLoading = [...container.querySelectorAll('img')].filter((img) => !img.hasAttribute('loading'))
    expect(semLoading).toHaveLength(1)
    expect(semLoading[0]).toHaveAttribute('alt', PRODUTOS.find((p) => p.destaque)!.imagem.alt)

    // `preload` em posicao de atributo JSX: sozinho no fim da linha ou
    // seguido de `=`. So o Hero liga; o FotoParallax so repassa.
    const comPreload = arquivosFonte().filter((arquivo) =>
      /(^|[\s{])preload(?=\s*$|=)/m.test(readFileSync(arquivo, 'utf8')),
    )
    expect(comPreload.map((a) => a.replace(/\\/g, '/'))).toEqual([
      expect.stringMatching(/\/components\/sections\/Hero\.tsx$/),
    ])
  })

  it('nenhuma animação em loop, nem no DOM nem num prop de biblioteca', () => {
    const { container } = montar()
    expect(container.innerHTML).not.toMatch(/infinite/i)
    for (const arquivo of arquivosFonte()) {
      expect(readFileSync(arquivo, 'utf8'), arquivo).not.toMatch(/repeat:\s*Infinity/)
    }
  })

  it('todo "AMO" renderizado como texto está dentro de translate="no", sem exceção', () => {
    const { container } = montar()
    const caminhante = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    const ocorrencias: Text[] = []
    let no: Node | null
    while ((no = caminhante.nextNode())) {
      if (/\bAMO\b/.test(no.textContent ?? '')) ocorrencias.push(no as Text)
    }
    // rotulo (1) + marca (1) + faixa (2) + final (1) + rodape (1)
    expect(ocorrencias).toHaveLength(6)
    for (const t of ocorrencias) {
      expect(t.parentElement?.getAttribute('translate'), t.parentElement?.outerHTML).toBe('no')
    }
  })

  it('o hero é o único lugar que pinta texto de cobre puro', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/app/estilos/hero.css'), 'utf8')
    expect(css).toMatch(/\.hero__titulo em \{[^}]*color: var\(--color-cobre\)/)
  })
})
