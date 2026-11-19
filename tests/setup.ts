import '@testing-library/jest-dom/vitest'
import * as matchers from 'vitest-axe/matchers'
import { expect, vi } from 'vitest'

// Teste de unidade nunca fala com o banco: o carregador devolve o cadastro
// da fixture, em copia, para cada teste estragar a sua.
vi.mock('@/lib/dados/catalogo', async (original) => {
  const { CADASTRO } = await import('./fixtures/cadastro')
  return {
    ...(await original<typeof import('@/lib/dados/catalogo')>()),
    carregarCatalogo: async () => structuredClone(CADASTRO),
  }
})

// O mesmo para os comentarios aprovados: os da fixture, do mais novo ao mais antigo.
vi.mock('@/lib/dados/comentarios', async (original) => {
  const { COMENTARIOS } = await import('./fixtures/comentarios')
  return {
    ...(await original<typeof import('@/lib/dados/comentarios')>()),
    lerComentariosAprovados: async (produto: string) =>
      COMENTARIOS.filter((c) => c.produto === produto).sort((a, b) => b.data.localeCompare(a.data)),
  }
})
import { MotionGlobalConfig } from 'motion/react'

expect.extend(matchers)

// Animacao do Motion termina no frame seguinte: o que sai do cardapio sai de
// verdade do DOM, sem o teste esperar a duracao da animacao.
MotionGlobalConfig.skipAnimations = true

// Arquivos com `@vitest-environment node` tambem passam por aqui, e la nao ha
// window.
if (typeof window !== 'undefined') {
  // jsdom nao implementa matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })

  // jsdom nao implementa IntersectionObserver
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  }
  Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IO })

  // jsdom tem o <dialog> (e o esconde fechado), mas nao o modal: aqui o
  // minimo que o navegador faz, inclusive o Esc virar o evento cancel.
  const dialogo = HTMLDialogElement.prototype
  if (typeof dialogo.showModal !== 'function') {
    dialogo.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    dialogo.close = function (this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
    if (!Object.getOwnPropertyDescriptor(dialogo, 'open')) {
      Object.defineProperty(dialogo, 'open', {
        configurable: true,
        get(this: HTMLDialogElement) {
          return this.hasAttribute('open')
        },
        set(this: HTMLDialogElement, valor: boolean) {
          this.toggleAttribute('open', valor)
        },
      })
    }
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return
      const aberto = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1)
      if (aberto && aberto.dispatchEvent(new Event('cancel', { cancelable: true }))) aberto.close()
    })
  }
}
