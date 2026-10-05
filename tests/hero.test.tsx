// tests/hero.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { hasReducedMotionListener, prefersReducedMotion } from 'motion/react'
import { Hero } from '@/components/sections/Hero'

describe('Hero', () => {
  it('tem um h1 só, com a assinatura da marca', () => {
    render(<Hero />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    // Via nome acessível computado, não textContent bruto: um espaço preso
    // dentro do span de uma linha (em vez de como irmão de DOM entre as
    // linhas) produz o mesmo textContent mas um nome acessível diferente
    // ("Um abraço emforma desobremesa"), ver task-6-report.md.
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Um abraço em forma de sobremesa',
      }),
    ).toBeInTheDocument()
  })

  it('quebra o h1 em 3 faixas, a tese da secção transversal', () => {
    const { container } = render(<Hero />)
    expect(container.querySelectorAll('[data-faixa]')).toHaveLength(3)
  })

  it('mostra o claim do rótulo na etiqueta', () => {
    render(<Hero />)
    expect(screen.getByText(/zero açúcar · cozido a vapor/i)).toBeInTheDocument()
  })

  it('traz a assinatura em script', () => {
    render(<Hero />)
    expect(screen.getByText('Para quem ama comer bem.')).toBeInTheDocument()
  })

  it('o CTA é link para a seção de sabores, não botão morto', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: /ver os sabores/i })).toHaveAttribute(
      'href',
      '#sabores',
    )
  })

  it('o pote tem alt descritivo e dimensões declaradas', () => {
    render(<Hero />)
    const img = screen.getByRole('img', { name: /pote de vidro/i })
    expect(img).toHaveAttribute('width')
    expect(img).toHaveAttribute('height')
  })

  it('a anotação manuscrita está presente', () => {
    render(<Hero />)
    expect(screen.getByText(/sem abrir mão do doce/i)).toBeInTheDocument()
  })

  it('sob prefers-reduced-motion, nada no Hero carrega marcador de animação', () => {
    // useReducedMotion() (motion@13.1.1) só lê window.matchMedia uma vez por
    // arquivo de teste: initPrefersReducedMotion() roda apenas enquanto
    // hasReducedMotionListener.current for falso, e o resultado fica
    // cacheado module-level em prefersReducedMotion.current, a primeira
    // renderização de <Hero /> acima já disparou essa inicialização usando o
    // stub global de tests/setup.ts (matches: false). Trocar
    // window.matchMedia aqui sozinho não teria efeito nenhum; é preciso
    // zerar hasReducedMotionListener.current para forçar uma nova leitura.
    // A query real consultada por dentro é "(prefers-reduced-motion)", em
    // contexto booleano, não "(prefers-reduced-motion: reduce)". Mesma
    // técnica de tests/ui.test.tsx (ver task-4-report.md).
    //
    // Hero não delega a um Reveal já coberto alhures, ele chama
    // useReducedMotion() diretamente pelos próprios anim()/animFaixa(), um
    // caminho de código separado que precisa da própria cobertura.
    const originalMatchMedia = window.matchMedia
    const originalHasListener = hasReducedMotionListener.current
    const originalPrefersReduced = prefersReducedMotion.current

    try {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      })
      hasReducedMotionListener.current = false

      const { container } = render(<Hero />)

      // As 3 faixas (animFaixa) continuam presentes, só que sem estado
      // animado: nenhuma delas carrega o atributo style.
      const faixas = container.querySelectorAll('[data-faixa]')
      expect(faixas).toHaveLength(3)
      faixas.forEach((faixa) => {
        expect(faixa.hasAttribute('style')).toBe(false)
      })

      // Varredura geral: nenhum elemento do Hero carrega opacity/transform
      // inline, a marca que anim()/animFaixa() deixam quando ativos.
      // (O <img> do next/image tem seu próprio style="color:transparent",
      // sem relação com o Motion, por isso o filtro é por opacity/transform
      // e não por presença de qualquer atributo style.)
      const comMarcadorDeAnimacao = Array.from(
        container.querySelectorAll('[style]'),
      ).filter((el) => /opacity|transform/.test(el.getAttribute('style') ?? ''))
      expect(comMarcadorDeAnimacao).toHaveLength(0)
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      })
      hasReducedMotionListener.current = originalHasListener
      prefersReducedMotion.current = originalPrefersReduced
    }
  })
})
