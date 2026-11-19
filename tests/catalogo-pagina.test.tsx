import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { CatalogoPagina, vontadeDaBusca } from '@/components/sections/CatalogoPagina'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { montarCatalogo } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const real = await carregarCatalogo()

afterEach(() => window.history.replaceState(null, '', '/'))

const cards = () => screen.queryAllByRole('article').filter((a) => a.classList.contains('card-produto'))
const vontades = () => screen.getByRole('group', { name: 'Na vontade de' })
const mostrando = () => screen.getByText(/^Mostrando \d+ de \d+ receitas?\.$/)
const secao = (id: string) => document.getElementById(id)
const titulos = (nivel: number) => screen.queryAllByRole('heading', { level: nivel }).map((h) => h.textContent)

function montar(catalogo = real, busca = '') {
  window.history.replaceState(null, '', `/catalogo${busca}`)
  return render(<CatalogoPagina vista={montarCatalogo(catalogo)} />)
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

describe('O catálogo de hoje (uma categoria, uma linha)', () => {
  it('um capítulo com a linha dentro: a regra, a contagem e os 7 cards, cada um alvo de âncora', () => {
    const { container } = montar()
    expect(secao('doces')).toHaveClass('scroll-mt-24')
    const linha = secao('linha-bolos-no-pote')!
    expect(secao('doces')).toContainElement(linha)
    expect(linha).toHaveClass('scroll-mt-24')
    // a regra da linha, no topo dela (os cards tambem dizem "Zero açúcar", nos selos)
    expect(linha.querySelector('.capitulo__topo .selo-carimbo')).toHaveTextContent('Zero açúcar')
    expect(within(linha).getByText('7 receitas')).toBeInTheDocument()
    expect(cards()).toHaveLength(7)
    const prestigio = container.querySelector('#prestigio')
    expect(prestigio).toHaveClass('scroll-mt-24')
    expect(within(prestigio as HTMLElement).getByRole('article')).toBeInTheDocument()
  })

  it('os títulos descem um nível por vez: categoria, linha, produto', () => {
    montar()
    expect(titulos(2)).toEqual(['Doces'])
    expect(titulos(3)).toEqual(['Bolos no pote'])
    expect(titulos(4)).toHaveLength(7)
  })

  it('a vontade filtra, marca a pílula e anuncia; clicar de novo desliga', async () => {
    const user = userEvent.setup()
    montar()
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
    // a contagem da linha acompanha o que esta na tela
    expect(within(secao('linha-bolos-no-pote')!).getByText('2 receitas')).toBeInTheDocument()
    await user.click(chocolate)
    expect(chocolate).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(cards()).toHaveLength(7))
  })

  it('uma vontade por vez', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('button', { name: 'Chocolate 2' }))
    await user.click(screen.getByRole('button', { name: 'Fruta 3' }))
    expect(screen.getByRole('button', { name: 'Chocolate 2' })).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(cards()).toHaveLength(3))
  })

  it('?vontade= liga o filtro na chegada, e a pessoa ainda pode trocar', async () => {
    const user = userEvent.setup()
    montar(real, '?vontade=chocolate')
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Chocolate 2' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Fruta 3' }))
    await waitFor(() => expect(cards()).toHaveLength(3))
  })

  it('?vontade= que não filtra nada aqui é ignorado', async () => {
    montar(real, '?vontade=salgado')
    await waitFor(() => expect(cards()).toHaveLength(7))
    for (const b of within(vontades()).getAllByRole('button')) expect(b).toHaveAttribute('aria-pressed', 'false')
  })

  it('o rótulo da linha saiu do catálogo', () => {
    const { container } = montar()
    expect(screen.queryByRole('heading', { name: /O rótulo da linha/ })).toBeNull()
    expect(container.querySelector('.papel-rotulo')).toBeNull()
  })

  it('sem selo que filtre, sem pílula de selo', () => {
    montar()
    expect(screen.queryByRole('group', { name: 'Filtrar pelo selo' })).toBeNull()
  })

  it('o atalho para o Hoje o dia pede fecha o corpo', () => {
    montar()
    expect(screen.getByRole('link', { name: /Não sabe o que escolher/ })).toHaveAttribute('href', '/#hoje')
  })

  it('passa no axe', async () => {
    const { container } = montar()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('O catálogo com duas categorias (fixture)', () => {
  it('um capítulo por categoria e uma seção por linha, com os 11 cards', () => {
    montar(CATALOGO_MISTO)
    expect(titulos(2)).toEqual(['Doces', 'Salgados'])
    expect(titulos(3)).toEqual(['Bolos no pote', 'Bolos inteiros', 'Salgados'])
    expect(secao('doces')).toContainElement(secao('linha-bolos-inteiros'))
    expect(secao('salgados')).toContainElement(secao('linha-salgados'))
    expect(within(secao('linha-bolos-inteiros')!).getByText('2 receitas')).toBeInTheDocument()
    expect(secao('linha-salgados')!.querySelector('.selo-carimbo')).toHaveTextContent('Massa integral')
    expect(cards()).toHaveLength(11)
  })

  it('a linha com o nome da categoria não escreve o nome duas vezes: o h3 fica só para leitor de tela', () => {
    montar(CATALOGO_MISTO)
    const h3 = within(secao('linha-salgados')!).getByRole('heading', { level: 3, name: 'Salgados' })
    expect(h3).toHaveClass('sr-only')
    // e a secao da linha nao vira uma segunda regiao "Salgados" dentro da primeira
    expect(secao('linha-salgados')).not.toHaveAttribute('aria-labelledby')
    expect(secao('salgados')).toHaveAttribute('aria-labelledby', 'titulo-salgados')
    expect(secao('linha-bolos-inteiros')).toHaveAttribute('aria-labelledby', 'titulo-linha-bolos-inteiros')
    expect(within(secao('linha-bolos-inteiros')!).getByRole('heading', { level: 3 })).not.toHaveClass('sr-only')
  })

  it('vontades e selos do catálogo inteiro', () => {
    montar(CATALOGO_MISTO)
    expect(within(vontades()).getAllByRole('button')).toHaveLength(5)
    expect(
      within(screen.getByRole('group', { name: 'Filtrar pelo selo' })).getAllByRole('button').map((b) => b.textContent),
    ).toEqual(['Zero açúcar', 'Fonte de fibras', 'Integral', 'Sem conservante'])
  })

  it('o capítulo que o filtro esvazia some', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Algo salgado 2' }))
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(titulos(2)).toEqual(['Salgados'])
    expect(secao('doces')).toBeNull()
    expect(secao('linha-bolos-no-pote')).toBeNull()
  })

  it('a linha que o filtro esvazia some, e o capítulo dela fica', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Fonte de fibras' }))
    await waitFor(() => expect(cards()).toHaveLength(7))
    expect(secao('doces')).not.toBeNull()
    expect(secao('linha-bolos-inteiros')).toBeNull()
    expect(titulos(3)).toEqual(['Bolos no pote'])
  })

  it('filtro sem receita: o estado vazio, e "Ver todas" volta tudo e leva o foco ao primeiro capítulo', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Algo salgado 2' }))
    await user.click(screen.getByRole('button', { name: 'Fonte de fibras' }))
    await waitFor(() => expect(cards()).toHaveLength(0))
    expect(screen.getByText(/Nenhuma receita com esse filtro ainda/)).toBeInTheDocument()
    expect(mostrando()).toHaveTextContent('Mostrando 0 de 11 receitas.')
    expect(titulos(2)).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Ver todas' }))
    await waitFor(() => expect(cards()).toHaveLength(11))
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Doces' }))
  })

  it('passa no axe', async () => {
    const { container } = montar(CATALOGO_MISTO)
    expect(await axe(container)).toHaveNoViolations()
  })
})
