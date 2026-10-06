import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import Home from '@/app/page'

/**
 * Regressao do hero em branco da v1.1: o HTML do servidor saia com
 * opacity:0 inline (o estado `initial` do Motion), e sem JS, ou com JS
 * atrasado, a pagina ficava em branco. Aqui o HTML que o servidor manda nao
 * pode esconder nada sozinho.
 */
const html = renderToString(await Home())
const doc = new DOMParser().parseFromString(html, 'text/html')

describe('o HTML do servidor', () => {
  it('não esconde nada por estilo inline', () => {
    const ofensores: string[] = []
    for (const el of doc.querySelectorAll('[style]')) {
      const estilo = el.getAttribute('style') ?? ''
      const escondido =
        /(^|;)\s*opacity:\s*0(\.0+)?\s*(;|$)/.test(estilo) ||
        /visibility:\s*hidden/.test(estilo) ||
        /clip-path/.test(estilo)
      const transforma = /(^|;)\s*transform:\s*(?!none\s*(;|$))/.test(estilo)
      if (escondido || (transforma && !el.hasAttribute('data-parallax'))) {
        ofensores.push(el.outerHTML.slice(0, 160))
      }
    }
    expect(ofensores).toEqual([])
  })

  it('não sai com a classe play: quem liga é o JS, ao entrar na tela', () => {
    expect(doc.querySelectorAll('.play')).toHaveLength(0)
  })

  it('pré-carrega exatamente uma imagem: o React 19 cria preload para todo <img> que não é lazy nem de prioridade baixa', () => {
    // Achado da revisao final: as laterais do hero com loading="eager"
    // ganhavam <link rel="preload"> junto com o destaque, e o teste do DOM
    // (atributo loading) nao via. Aqui conta o que o servidor manda.
    const preloads = [...html.matchAll(/<link[^>]*rel="preload"[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => /as="image"/.test(tag))
    expect(preloads, preloads.join('\n')).toHaveLength(1)
    expect(preloads[0]).toContain('prestigio')
  })

  it('a página inteira está no HTML: as 5 seções e os 7 cards', () => {
    expect(doc.querySelectorAll('section[id]')).toHaveLength(5)
    expect(doc.querySelectorAll('#cardapio article')).toHaveLength(7)
  })
})
