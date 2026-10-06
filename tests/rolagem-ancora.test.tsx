import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Achado da revisao final: o Lenis 1.3 ja desconta o scroll-margin-top do
 * alvo em scrollTo(elemento). Somar o DESLOCAMENTO_NAV por cima dobrava a
 * distancia, e toda ancora parava a 192px do topo em vez de 96.
 */
const { chamadas } = vi.hoisted(() => ({ chamadas: [] as unknown[][] }))

vi.mock('lenis', () => ({
  default: class LenisFalso {
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
})
