import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Achado A1 da revisao final: com um filtro ligado na pagina da linha, o
 * sabor da gaveta que o filtro esconde nao estava no DOM. A gaveta fechava,
 * o RolagemSuave nao achava o alvo e nada rolava. Aqui as tres pecas
 * juntas, como na pagina: o RolagemSuave (com um Lenis falso), a nav com a
 * gaveta e o corpo do catalogo.
 */
const { chamadas, transformes } = vi.hoisted(() => ({ chamadas: [] as unknown[][], transformes: [] as string[] }))

vi.mock('lenis', () => ({
  default: class LenisFalso {
    isStopped = false
    scrollTo(...args: unknown[]) {
      chamadas.push(args)
      // o Lenis mede o alvo com getBoundingClientRect, que conta o transform
      transformes.push(args[0] instanceof HTMLElement ? args[0].style.transform : '')
    }
    destroy() {}
  },
}))

import { RolagemSuave } from '@/components/RolagemSuave'
import { Nav } from '@/components/layout/Nav'
import { CatalogoPagina } from '@/components/sections/CatalogoPagina'
import { carregarCatalogo, type Catalogo } from '@/lib/catalogo'
import { montarCatalogo, montarGaveta } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const real = await carregarCatalogo()
/** uma linha so, a dos salgados: a unica da fixture com selo que filtra */
const soSalgados: Catalogo = {
  ...CATALOGO_MISTO,
  produtos: CATALOGO_MISTO.produtos.filter((p) => p.linha === 'salgados'),
}

afterEach(() => {
  chamadas.length = 0
  transformes.length = 0
  window.history.replaceState(null, '', '/')
})

function montar(catalogo: Catalogo, linha: string, busca = '') {
  window.history.replaceState(null, '', `/catalogo/${linha}${busca}`)
  render(
    <RolagemSuave>
      <Nav gaveta={montarGaveta(catalogo)} linhaAtual={linha} />
      <main>
        <CatalogoPagina vista={montarCatalogo(catalogo, linha)} />
      </main>
    </RolagemSuave>,
  )
  return userEvent.setup()
}

const gaveta = () => document.getElementById('gaveta') as HTMLDialogElement
const botaoCatalogo = () => screen.getByRole('button', { name: 'Catálogo' })
const cards = () => screen.queryAllByRole('article').filter((a) => a.classList.contains('card-produto'))

async function clicarSabor(user: ReturnType<typeof userEvent.setup>, nome: string) {
  await user.click(botaoCatalogo())
  expect(gaveta().open).toBe(true)
  const sabores = within(gaveta()).getByRole('list', { name: 'Os sabores' })
  await user.click(within(sabores).getByRole('link', { name: nome }))
}

/** A gaveta fechou, o card existe, a rolagem foi ate ele e o foco tambem. */
function chegouAo(slug: string) {
  expect(gaveta().open).toBe(false)
  const card = document.getElementById(slug)
  expect(card, `#${slug} no DOM`).not.toBeNull()
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0][0]).toBe(card)
  // na hora da medida o card ja esta no lugar: a escala de entrada (0.85) o
  // faria parar 7.5% da altura acima, embaixo da nav
  expect(transformes[0]).toMatch(/^(none)?$/)
  expect(document.activeElement).toBe(card)
  expect(document.activeElement).not.toBe(botaoCatalogo())
  expect(window.location.hash).toBe(`#${slug}`)
}

describe('sabor da gaveta escondido pelo filtro da página', () => {
  it('a vontade ligada na página sai, e a gaveta leva ao card do sabor', async () => {
    const user = montar(real, 'bolos-no-pote')
    const chocolate = screen.getByRole('button', { name: 'Chocolate 2' })
    await user.click(chocolate)
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(document.getElementById('pacoca')).toBeNull()

    await clicarSabor(user, 'Paçoca')

    chegouAo('pacoca')
    expect(chocolate).toHaveAttribute('aria-pressed', 'false')
    expect(cards()).toHaveLength(7)
  })

  it('o mesmo com a vontade que chegou pela URL (?vontade=)', async () => {
    const user = montar(real, 'bolos-no-pote', '?vontade=chocolate')
    await waitFor(() => expect(cards()).toHaveLength(2))

    await clicarSabor(user, 'Paçoca')

    chegouAo('pacoca')
    expect(screen.getByRole('button', { name: 'Chocolate 2' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('o selo ligado também sai', async () => {
    const user = montar(soSalgados, 'salgados')
    const selo = screen.getByRole('button', { name: 'Sem conservante' })
    await user.click(selo)
    await waitFor(() => expect(cards()).toHaveLength(1))
    expect(document.getElementById('quiche-de-alho-poro')).toBeNull()

    await clicarSabor(user, 'Quiche de alho-poró')

    chegouAo('quiche-de-alho-poro')
    expect(selo).toHaveAttribute('aria-pressed', 'false')
  })

  it('sabor que o filtro mostra: o filtro fica, e a gaveta leva ao card', async () => {
    const user = montar(real, 'bolos-no-pote')
    const chocolate = screen.getByRole('button', { name: 'Chocolate 2' })
    await user.click(chocolate)
    await waitFor(() => expect(cards()).toHaveLength(2))

    await clicarSabor(user, 'Prestígio')

    chegouAo('prestigio')
    expect(chocolate).toHaveAttribute('aria-pressed', 'true')
    expect(cards()).toHaveLength(2)
  })
})
