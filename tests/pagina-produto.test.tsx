import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import PaginaDoProduto, { generateMetadata, generateStaticParams } from '@/app/catalogo/[produto]/page'
import PaginaCatalogo from '@/app/catalogo/page'
import { TelaProduto } from '@/components/layout/TelaProduto'
import type { Produto } from '@/lib/catalogo'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { PRODUTOS } from './fixtures/cadastro'
import { cotarEntregaDeExemplo, mascararCep, validarEndereco } from '@/lib/entrega'
import { formatarPreco, montarPaginaProduto, resumirNotas } from '@/lib/produto'
import { linhasComProduto, montarGaveta } from '@/lib/visao'

const pagina = async (slug: string) => render(await PaginaDoProduto({ params: Promise.resolve({ produto: slug }) }))

beforeEach(() => localStorage.clear())

describe('a rota do produto', () => {
  it('gera uma página por produto do cadastro', async () => {
    expect(await generateStaticParams()).toEqual(PRODUTOS.map((p) => ({ produto: p.slug })))
  })

  it('título com o nome e o tipo; descrição do produto', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ produto: 'prestigio' }) })
    expect(meta.title).toBe('Prestígio · Bolo no pote · AMO')
    expect(meta.description).toMatch(/^Massa de chocolate/)
  })

  it('slug fora do cadastro cai no 404', async () => {
    await expect(PaginaDoProduto({ params: Promise.resolve({ produto: 'nao-existe' }) })).rejects.toThrow()
  })

  it('os cards do catálogo levam à página do produto', async () => {
    render(await PaginaCatalogo())
    expect(screen.getByRole('link', { name: 'Prestígio' })).toHaveAttribute('href', '/catalogo/prestigio')
  })
})

describe('a página do Prestígio', () => {
  it('um h1 com o nome, sem pular nível; trilha até a categoria', async () => {
    const { container } = await pagina('prestigio')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Prestígio')
    const niveis = [...container.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]))
    for (let i = 1; i < niveis.length; i++) expect(niveis[i] - niveis[i - 1]).toBeLessThanOrEqual(1)
    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(within(trilha).getByRole('link', { name: 'Doces' })).toHaveAttribute('href', '/catalogo#doces')
    expect(within(trilha).getByText('Prestígio')).toHaveAttribute('aria-current', 'page')
  })

  it('a foto é a única pré-carregada e tem alt e medidas', async () => {
    const { container } = await pagina('prestigio')
    const foto = container.querySelector('.produto__foto img')!
    expect(foto).toHaveAttribute('alt', PRODUTOS[0].imagem.alt)
    expect(foto).toHaveAttribute('width')
    expect(foto).not.toHaveAttribute('loading')
  })

  it('preço, descrição e rótulo; o modo de aproveitar não se repete aqui (mora na home)', async () => {
    await pagina('prestigio')
    expect(screen.getAllByText(formatarPreco(1890)).length).toBeGreaterThan(0)
    expect(screen.getByText(/^Massa de chocolate/)).toBeVisible()
    expect(screen.getByText('Cozido a vapor')).toBeInTheDocument()
    expect(screen.queryByText('Abra com amor')).toBeNull()
    expect(screen.queryByText(/Como aproveitar/)).toBeNull()
  })

  it('com 8 comentários mostra o resumo, e tocar numa nota filtra a lista', async () => {
    await pagina('prestigio')
    const lista = () => screen.getAllByRole('listitem').filter((li) => li.classList.contains('comentario'))
    expect(lista()).toHaveLength(8)
    await userEvent.click(screen.getByRole('button', { name: /^3 estrelas/ }))
    expect(lista()).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Ver todos' }))
    expect(lista()).toHaveLength(8)
  })

  it('a sacola soma a quantidade escolhida', async () => {
    await pagina('prestigio')
    await userEvent.click(screen.getByRole('button', { name: 'Mais um pote' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Adicionar à sacola' })[0])
    expect(screen.getByText('Pronto: 2 potes de Prestígio na sacola.')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('amo:sacola')!)).toEqual({ prestigio: 2 })
  })

  it('a entrega pede o CEP inteiro e o número', async () => {
    await pagina('prestigio')
    await userEvent.type(screen.getByPlaceholderText('CEP'), '0456')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(await screen.findByText('Confira o CEP: ele tem 8 números.')).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('CEP'), '7000')
    await userEvent.type(screen.getByPlaceholderText('Número'), '120')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(await screen.findByText('Uber, entrega hoje', {}, { timeout: 2000 })).toBeInTheDocument()
  })

  it('passa no axe', async () => {
    const { container } = await pagina('prestigio')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('todo "AMO" de texto está dentro de translate="no"', async () => {
    const { container } = await pagina('prestigio')
    const caminhante = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let no: Node | null
    while ((no = caminhante.nextNode())) {
      if (/\bAMO\b/.test(no.textContent ?? '')) expect(no.parentElement?.getAttribute('translate')).toBe('no')
    }
  })
})

describe('produto fora de venda ou sem descricao', () => {
  const tela = async (estragar: (p: Produto) => void) => {
    const c = await carregarCatalogo()
    estragar(c.produtos.find((p) => p.slug === 'pacoca')!)
    return render(
      <TelaProduto pagina={montarPaginaProduto(c, 'pacoca')!} gaveta={montarGaveta(c)} linhas={linhasComProduto(c)} />,
    )
  }
  it('sem preco: mostra o produto, sem preco e sem o botao da sacola', async () => {
    const { container } = await tela((p) => delete p.preco)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paçoca')
    expect(container.querySelector('.produto__preco')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Adicionar à sacola' })).toBeNull()
    expect(screen.getByText('Descrição')).toBeInTheDocument()
  })
  it('sem descricao: a secao some, o preco e o botao ficam', async () => {
    const { container } = await tela((p) => delete p.descricao)
    expect(screen.queryByText('Descrição')).toBeNull()
    expect(container.querySelector('.produto__preco')).not.toBeNull()
  })
})

describe('poucos comentários', () => {
  it('com 2 comentários não mostra o resumo das notas', async () => {
    const { container } = await pagina('pacoca')
    expect(container.querySelector('.barras')).toBeNull()
    expect(screen.getByText('2 comentários')).toBeInTheDocument()
  })

  it('sem comentários convida a escrever o primeiro', async () => {
    await pagina('frutas-amarelas')
    expect(screen.getByText(/Ninguém comentou este sabor ainda/)).toBeInTheDocument()
    expect(screen.queryByText(/Ler os/)).toBeNull()
  })
})

describe('as regras da entrega e das notas', () => {
  it('a máscara do CEP põe o traço no lugar', () => {
    expect(mascararCep('04567000')).toBe('04567-000')
    expect(mascararCep('0456')).toBe('0456')
    expect(validarEndereco('04567-000', '')).toBe('Falta o número da casa ou do prédio.')
  })

  it('fora da Grande São Paulo, o exemplo diz que o Uber não chega', async () => {
    expect(await cotarEntregaDeExemplo('30140-071', '10')).toEqual({
      tipo: 'erro',
      mensagem: 'O Uber ainda não chega neste CEP. Hoje a entrega é só na Grande São Paulo.',
    })
  })

  it('o resumo conta por nota e tira a média com uma casa', () => {
    const r = resumirNotas([
      { id: 'a', produto: 'x', nome: 'A', nota: 5, data: '2026-01-01', texto: '' },
      { id: 'b', produto: 'x', nome: 'B', nota: 4, data: '2026-01-02', texto: '' },
      { id: 'c', produto: 'x', nome: 'C', nota: 4, data: '2026-01-03', texto: '' },
    ])
    expect(r.media).toBe(4.3)
    expect(r.porNota.map((n) => n.quantos)).toEqual([1, 2, 0, 0, 0])
  })
})
