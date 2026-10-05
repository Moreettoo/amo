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
}
