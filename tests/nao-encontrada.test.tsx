import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { act } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { InlineScript, MARCAR_JS } from '@/components/InlineScript'
import { axe } from 'vitest-axe'
import NaoEncontrada, { metadata } from '@/app/not-found'

/**
 * Achado C1 da revisao final: sem not-found.tsx, /catalogo/<desconhecido>
 * mostrava o "This page could not be found." do Next, em ingles, sem nav e
 * sem rodape.
 */
const pagina = await NaoEncontrada()

describe('a página 404', () => {
  it('em pt-BR, com a nav, o título e o rodapé', () => {
    const { container } = render(pagina)
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Página não encontrada')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo')
    expect(container.querySelector('footer')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/could not be found|this page/i)
    expect(metadata.title).toBe('Página não encontrada · AMO')
  })

  it('o título abre o bloco em duas vozes; o "Erro 404" vem depois dele, não como rótulo acima', () => {
    const { container } = render(pagina)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.querySelector('em')).toHaveTextContent('encontrada')
    expect(h1.previousElementSibling).toBeNull()
    const erro = screen.getByText('Erro 404')
    expect(h1.compareDocumentPosition(erro) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('.camadas, .rotulo-secao')).toBeNull()
  })

  it('dois caminhos de volta: o catálogo e o início, ambos <a href> comuns', () => {
    render(pagina)
    const main = screen.getByRole('main')
    const links = [...main.querySelectorAll('a')].map((a) => [a.textContent?.replace('♥', '').trim(), a.getAttribute('href')])
    expect(links).toEqual([
      ['Ver o catálogo', '/catalogo'],
      ['Voltar ao início', '/'],
    ])
  })

  it('sem reticências, sem preço, e todo "AMO" de texto dentro de translate="no"', () => {
    const { container } = render(pagina)
    expect(container.textContent).not.toMatch(/\.\.\./)
    expect(container.textContent).not.toMatch(/R\$\s?\d/)
    const caminhante = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let no: Node | null
    while ((no = caminhante.nextNode())) {
      if (!/\bAMO\b/.test(no.textContent ?? '')) continue
      expect(no.parentElement?.getAttribute('translate'), no.parentElement?.outerHTML).toBe('no')
    }
  })

  it('não pré-carrega nenhuma imagem', () => {
    const html = renderToString(pagina)
    expect(html).not.toMatch(/<link[^>]*rel="preload"[^>]*as="image"/)
  })

  it('passa no axe', async () => {
    const { container } = render(pagina)
    expect(await axe(container)).toHaveNoViolations()
  })
})

/**
 * A pagina de "nao encontrado" de uma rota que ja comecou a responder chega ao
 * navegador como arvore do servidor e e criada la, com o layout dentro. Um
 * <script> criado no cliente avisa "Encountered a script tag" no console de
 * desenvolvimento (React 19). O script so precisa existir no HTML do servidor.
 */
describe('o script que marca o JavaScript', () => {
  it('o HTML do servidor leva o script e a hidratacao o aceita sem erro', async () => {
    const html = renderToString(<InlineScript html={MARCAR_JS} />)
    expect(html).toContain('<script type="text/javascript"')
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const caixa = document.createElement('div')
    caixa.innerHTML = html
    await act(async () => {
      hydrateRoot(caixa, <InlineScript html={MARCAR_JS} />)
    })
    expect(erro).not.toHaveBeenCalled()
    erro.mockRestore()
  })

  it('criado no cliente, nao cria <script> nem avisa', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const caixa = document.createElement('div')
    await act(async () => {
      createRoot(caixa).render(<InlineScript html={MARCAR_JS} />)
    })
    expect(caixa.querySelector('script')).toBeNull()
    expect(erro).not.toHaveBeenCalled()
    erro.mockRestore()
  })
})
