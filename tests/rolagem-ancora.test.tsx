import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Achado da revisao final: o Lenis 1.3 ja desconta o scroll-margin-top do
 * alvo em scrollTo(elemento). Somar o DESLOCAMENTO_NAV por cima dobrava a
 * distancia, e toda ancora parava a 192px do topo em vez de 96.
 */
const { chamadas, estado } = vi.hoisted(() => ({ chamadas: [] as unknown[][], estado: { parado: false } }))

vi.mock('lenis', () => ({
  default: class LenisFalso {
    get isStopped() {
      return estado.parado
    }
    scrollTo(...args: unknown[]) {
      chamadas.push(args)
    }
    destroy() {}
  },
}))

import { RolagemSuave } from '@/components/RolagemSuave'

describe('RolagemSuave com Lenis', () => {
  it('a âncora usa só o scroll-margin do alvo, sem deslocamento extra', async () => {
    const user = userEvent.setup()
    render(
      <RolagemSuave>
        <a href="#alvo">ir</a>
        <section id="alvo" className="scroll-mt-24">
          alvo
        </section>
      </RolagemSuave>,
    )
    await user.click(screen.getByRole('link', { name: 'ir' }))
    expect(chamadas).toHaveLength(1)
    const [alvo, opcoes] = chamadas[0] as [HTMLElement, { offset?: number } | undefined]
    expect(alvo.id).toBe('alvo')
    expect(opcoes?.offset ?? 0).toBe(0)
  })

  it('com o Lenis parado (a gaveta acabou de soltar a página), a âncora rola pelo navegador', async () => {
    chamadas.length = 0
    estado.parado = true
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    const user = userEvent.setup()
    render(
      <RolagemSuave>
        <a href="#alvo-parado">ir</a>
        <section id="alvo-parado" className="scroll-mt-24">
          alvo
        </section>
      </RolagemSuave>,
    )
    await user.click(screen.getByRole('link', { name: 'ir' }))
    expect(chamadas).toHaveLength(0)
    expect(rolar).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth' })
    expect(rolar.mock.contexts[0]).toHaveProperty('id', 'alvo-parado')
    estado.parado = false
  })
})
