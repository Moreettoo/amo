import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { CatalogoPagina, vontadeDaBusca } from '@/components/sections/CatalogoPagina'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarCatalogo } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const real = await carregarCatalogo()

afterEach(() => window.history.replaceState(null, '', '/'))

// o rotulo da linha tambem e um <article>; so os cards de receita entram na conta
const cards = () => screen.queryAllByRole('article').filter((a) => a.classList.contains('card-produto'))
const vontades = () => screen.getByRole('group', { name: 'Na vontade de' })
const mostrando = () => screen.getByText(/^Mostrando \d+ de \d+ receitas?\.$/)

function montar(linha: string | null, catalogo = real, busca = '') {
  window.history.replaceState(null, '', `/catalogo${busca}`)
  return render(<CatalogoPagina vista={montarCatalogo(catalogo, linha)} />)
}

describe('vontadeDaBusca', () => {
  const validas = [{ slug: 'chocolate' }, { slug: 'fruta' }]

  it('aceita a vontade que existe na vista', () => {
    expect(vontadeDaBusca('?vontade=chocolate', validas)).toBe('chocolate')
  })

  it('ignora vazio, inexistente e maiúscula; com repetida, vale a primeira', () => {
    expect(vontadeDaBusca('', validas)).toBeNull()
    expect(vontadeDaBusca('?vontade=', validas)).toBeNull()
    expect(vontadeDaBusca('?vontade=salgado', validas)).toBeNull()
    expect(vontadeDaBusca('?vontade=Chocolate', validas)).toBeNull()
    expect(vontadeDaBusca('?vontade=fruta&vontade=chocolate', validas)).toBe('fruta')
  })
})

describe('Catálogo de uma linha (o cadastro de hoje)', () => {
  it('sem coluna de linhas, com os 7 cards, cada um alvo de âncora', () => {
    const { container } = montar('bolos-no-pote')
    expect(screen.queryByRole('navigation', { name: 'Linhas' })).toBeNull()
    expect(cards()).toHaveLength(7)
    const prestigio = container.querySelector('#prestigio')
    expect(prestigio).toHaveClass('scroll-mt-24')
    expect(within(prestigio as HTMLElement).getByRole('article')).toBeInTheDocument()
  })

  it('o título das receitas existe para leitor de tela, e o h3 dos cards não pula nível', () => {
    montar('bolos-no-pote')
    // recebe foco do "Ver todas": como alvo, desconta a nav ao rolar
    expect(screen.getByRole('heading', { level: 2, name: 'Receitas' })).toHaveClass('sr-only', 'scroll-mt-24')
  })

  it('a vontade filtra, marca a pílula e anuncia; clicar de novo desliga', async () => {
    const user = userEvent.setup()
    montar('bolos-no-pote')
    expect(within(vontades()).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Chocolate 2',
      'Fruta 3',
      'Coco 2',
      'Um clássico 3',
    ])
    expect(mostrando()).toHaveTextContent('Mostrando 7 de 7 receitas.')
    expect(mostrando()).toHaveAttribute('aria-live', 'polite')
    const chocolate = screen.getByRole('button', { name: 'Chocolate 2' })
    await user.click(chocolate)
    expect(chocolate).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(mostrando()).toHaveTextContent('Mostrando 2 de 7 receitas.')
    await user.click(chocolate)
    expect(chocolate).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(cards()).toHaveLength(7))
  })

  it('uma vontade por vez', async () => {
    const user = userEvent.setup()
    montar('bolos-no-pote')
    await user.click(screen.getByRole('button', { name: 'Chocolate 2' }))
    await user.click(screen.getByRole('button', { name: 'Fruta 3' }))
    expect(screen.getByRole('button', { name: 'Chocolate 2' })).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(cards()).toHaveLength(3))
  })

  it('?vontade= liga o filtro na chegada, e a pessoa ainda pode trocar', async () => {
    const user = userEvent.setup()
    montar('bolos-no-pote', real, '?vontade=chocolate')
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Chocolate 2' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Fruta 3' }))
    await waitFor(() => expect(cards()).toHaveLength(3))
  })

  it('?vontade= que não vale na vista é ignorado', async () => {
    montar('bolos-no-pote', real, '?vontade=salgado')
    await waitFor(() => expect(cards()).toHaveLength(7))
    for (const b of within(vontades()).getAllByRole('button')) expect(b).toHaveAttribute('aria-pressed', 'false')
  })

  it('no fim, o rótulo da linha', () => {
    montar('bolos-no-pote')
    expect(screen.getByRole('heading', { level: 2, name: 'O rótulo da linha' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Bolos no pote' })).toHaveClass('papel-rotulo--largo')
  })

  it('sem selo que filtre, sem pílula de selo', () => {
    montar('bolos-no-pote')
    expect(screen.queryByRole('group', { name: 'Filtrar pelo selo' })).toBeNull()
  })

  it('passa no axe', async () => {
    const { container } = montar('bolos-no-pote')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Catálogo com três linhas (fixture)', () => {
  it('"Tudo": a coluna de linhas, com o item atual e um link por linha', () => {
    montar(null, CATALOGO_MISTO)
    const linhas = screen.getByRole('navigation', { name: 'Linhas' })
    const links = within(linhas).getAllByRole('link', { name: /\d/ })
    expect(links.map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')])).toEqual([
      ['Tudo11', '/catalogo', 'page'],
      ['Bolos no pote7', '/catalogo/bolos-no-pote', null],
      ['Bolos inteiros2', '/catalogo/bolos-inteiros', null],
      ['Salgados2', '/catalogo/salgados', null],
    ])
    expect(within(linhas).getByRole('link', { name: /Não sabe o que escolher/ })).toHaveAttribute('href', '/#hoje')
  })

  it('"Tudo": um grupo por linha, com h2 e o link para a página dela; sem rótulo no fim', () => {
    montar(null, CATALOGO_MISTO)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Receitas',
      'Bolos no pote',
      'Bolos inteiros',
      'Salgados',
    ])
    expect(screen.getByRole('link', { name: 'Ver só bolos inteiros' })).toHaveAttribute('href', '/catalogo/bolos-inteiros')
    expect(cards()).toHaveLength(11)
    expect(screen.queryByRole('heading', { name: 'O rótulo da linha' })).toBeNull()
  })

  it('"Tudo": vontades e selos de todas as linhas', () => {
    montar(null, CATALOGO_MISTO)
    expect(within(vontades()).getAllByRole('button')).toHaveLength(5)
    expect(
      within(screen.getByRole('group', { name: 'Filtrar pelo selo' })).getAllByRole('button').map((b) => b.textContent),
    ).toEqual(['Zero açúcar', 'Fonte de fibras', 'Integral', 'Sem conservante'])
  })

  it('o grupo que o filtro esvazia some', async () => {
    const user = userEvent.setup()
    montar(null, CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Algo salgado 2' }))
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Receitas', 'Salgados'])
  })

  it('filtro sem receita: o estado vazio, e "Ver todas" volta tudo e leva o foco ao título', async () => {
    const user = userEvent.setup()
    montar(null, CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Algo salgado 2' }))
    await user.click(screen.getByRole('button', { name: 'Fonte de fibras' }))
    await waitFor(() => expect(cards()).toHaveLength(0))
    expect(screen.getByText(/Nenhuma receita com esse filtro ainda/)).toBeInTheDocument()
    expect(mostrando()).toHaveTextContent('Mostrando 0 de 11 receitas.')
    await user.click(screen.getByRole('button', { name: 'Ver todas' }))
    await waitFor(() => expect(cards()).toHaveLength(11))
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Receitas' }))
  })

  it('nos salgados: sem pílula de vontade (todos têm a mesma), e o selo que só um tem filtra', async () => {
    const user = userEvent.setup()
    montar('salgados', CATALOGO_MISTO)
    expect(screen.queryByRole('group', { name: 'Na vontade de' })).toBeNull()
    expect(screen.queryByText('Na vontade de')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Sem conservante' }))
    await waitFor(() => expect(cards()).toHaveLength(1))
    expect(
      within(screen.getByRole('navigation', { name: 'Linhas' })).getByRole('link', { name: /Salgados/ }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('passa no axe', async () => {
    const { container } = montar(null, CATALOGO_MISTO)
    expect(await axe(container)).toHaveNoViolations()
  })
})
