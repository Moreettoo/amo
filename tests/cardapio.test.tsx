import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Cardapio } from '@/components/sections/Cardapio'
import { FiltroProvider } from '@/components/FiltroProvider'
import { carregarCatalogo, type Catalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'
import { Sonda } from './fixtures/sonda'

const real = await carregarCatalogo()

function montar(catalogo: Catalogo) {
  const v = montarVisao(catalogo)
  return render(
    <FiltroProvider>
      <Cardapio
        produtos={v.produtos}
        tipos={v.tipos}
        nomesDosSelos={v.nomesDosSelos}
        filtrosLinha={v.filtrosLinha}
        filtrosSelo={v.filtrosSelo}
        vontades={v.vontades}
      />
      <Sonda />
    </FiltroProvider>,
  )
}

const cards = () => screen.queryAllByRole('article')
const grupo = () => screen.getByRole('group', { name: 'Filtrar o cardápio' })
const filtro = () => screen.getByTestId('filtro')

describe('Cardápio com o cadastro de hoje', () => {
  it('mostra os 7 e esconde os filtros que não filtrariam nada', () => {
    montar(real)
    expect(screen.getByRole('heading', { level: 2, name: 'Escolha pelo sabor' })).toBeInTheDocument()
    expect(cards()).toHaveLength(7)
    expect(screen.queryByRole('group', { name: 'Filtrar o cardápio' })).toBeNull()
    expect(screen.queryByText(/Filtre pela linha/)).toBeNull()
  })

  it('cada card leva o nome do produto e o tipo da linha', () => {
    montar(real)
    expect(screen.getByRole('article', { name: 'Ninho com frutas vermelhas' })).toHaveTextContent('Bolo no pote')
  })

  it('a vontade vinda de fora filtra e vira pílula removível', async () => {
    const user = userEvent.setup()
    montar(real)
    await user.click(screen.getByRole('button', { name: 'sonda: vontade chocolate' }))
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(within(grupo()).getByText(/Vontade: chocolate/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tirar o filtro de vontade: chocolate' }))
    await waitFor(() => expect(cards()).toHaveLength(7))
    expect(filtro()).toHaveTextContent('-|-|-')
  })
})

describe('Cardápio com o catálogo misto', () => {
  it('Tudo e uma pílula por linha, com contagem e aria-pressed', () => {
    montar(CATALOGO_MISTO)
    expect(screen.getByText('Filtre pela linha ou pelo que importa pra você.')).toBeInTheDocument()
    const tudo = within(grupo()).getByRole('button', { name: 'Tudo 11' })
    expect(tudo).toHaveAttribute('aria-pressed', 'true')
    for (const nome of ['Bolos no pote 7', 'Bolos inteiros 2', 'Salgados 2']) {
      expect(within(grupo()).getByRole('button', { name: nome })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('escolher a linha filtra e marca a pílula', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Salgados 2' }))
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Salgados 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tudo 11' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('o selo liga e desliga, e a linha mantém selo e vontade', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    const integral = screen.getByRole('button', { name: 'Integral' })
    await user.click(integral)
    expect(integral).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(cards()).toHaveLength(2))
    await user.click(integral)
    expect(integral).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(cards()).toHaveLength(11))

    await user.click(screen.getByRole('button', { name: 'sonda: vontade chocolate' }))
    await user.click(screen.getByRole('button', { name: 'Bolos inteiros 2' }))
    expect(filtro()).toHaveTextContent('inteiro|-|chocolate')
    await waitFor(() => expect(cards()).toHaveLength(2))
  })

  it('combinação sem receita mostra o estado vazio, e "Ver todas" limpa os três', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Salgados 2' }))
    await user.click(screen.getByRole('button', { name: 'Fonte de fibras' }))
    await waitFor(() => expect(cards()).toHaveLength(0))
    expect(screen.getByText(/Nenhuma receita com esse filtro ainda/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver todas' }))
    expect(filtro()).toHaveTextContent('-|-|-')
    await waitFor(() => expect(cards()).toHaveLength(11))
  })

  it('anuncia o resultado para leitor de tela', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    const anuncio = screen.getByText(/^Mostrando \d+ de \d+ receitas\.$/)
    expect(anuncio).toHaveAttribute('aria-live', 'polite')
    expect(anuncio).toHaveTextContent('Mostrando 11 de 11 receitas.')
    await user.click(screen.getByRole('button', { name: 'Salgados 2' }))
    expect(anuncio).toHaveTextContent('Mostrando 2 de 11 receitas.')
  })
})
