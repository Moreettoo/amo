import '@testing-library/jest-dom/vitest'
import * as matchers from 'vitest-axe/matchers'
import { expect } from 'vitest'
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
