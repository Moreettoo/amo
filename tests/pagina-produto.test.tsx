import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import PaginaDoProduto, * as rotaDoProduto from '@/app/catalogo/[produto]/page'
import { generateMetadata, generateStaticParams } from '@/app/catalogo/[produto]/page'
import PaginaCatalogo from '@/app/catalogo/page'
import { TelaProduto } from '@/components/layout/TelaProduto'
import type { Produto } from '@/lib/catalogo'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { PRODUTOS } from './fixtures/cadastro'
import { mascararCep, validarEndereco } from '@/lib/entrega'
import { MENSAGENS_DO_FECHAMENTO } from '@/lib/fechamento/tipos'
import { formatarPreco, montarPaginaProduto, resumirNotas } from '@/lib/produto'
import { linhasComProduto, montarGaveta } from '@/lib/visao'

const m = vi.hoisted(() => ({ cotar: vi.fn(), comentar: vi.fn() }))
// a acao do servidor e falsa aqui: no Vitest uma acao e uma funcao comum
vi.mock('@/app/sacola/acoes', () => ({ cotarEntrega: m.cotar }))
vi.mock('@/app/catalogo/acoes', () => ({ enviarComentario: m.comentar }))
beforeEach(() => {
  m.cotar.mockReset()
  m.comentar.mockReset()
})

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

  it('produto posto no painel depois do build ganha a pagina sem novo deploy (slug sob demanda)', () => {
    expect((rotaDoProduto as { dynamicParams?: boolean }).dynamicParams).not.toBe(false)
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

  it('a entrega cota no servidor: o valor e o tempo da resposta, e os erros pelos textos do fechamento', async () => {
    const endereco = { cep: '04567000', logradouro: 'Rua', numero: '120', complemento: '', bairro: 'Bairro', cidade: 'São Paulo', uf: 'SP' }
    const expiraEm = new Date(Date.now() + 15 * 60_000).toISOString()
    m.cotar
      .mockResolvedValueOnce({ ok: false, erro: 'campos_invalidos', campos: { cep: 'Confira o CEP: ele tem 8 números.' } })
      .mockResolvedValueOnce({ ok: false, erro: 'fora_da_area' })
      .mockResolvedValueOnce({ ok: true, cotacao: { id: 'c1', valorCentavos: 1290, minutos: 45, expiraEm, exemplo: true, endereco } })
    await pagina('prestigio')
    await userEvent.type(screen.getByPlaceholderText('CEP'), '0456')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(await screen.findByText('Confira o CEP: ele tem 8 números.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('CEP')).toHaveAttribute('aria-invalid', 'true')
    expect(m.cotar).toHaveBeenLastCalledWith({ cep: '0456', numero: '' })

    await userEvent.type(screen.getByPlaceholderText('CEP'), '7000')
    await userEvent.type(screen.getByPlaceholderText('Número'), '120')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.fora_da_area)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('CEP')).not.toHaveAttribute('aria-invalid')

    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(await screen.findByText('Uber, entrega hoje (valor de exemplo)')).toBeInTheDocument()
    expect(screen.getByText('Chega em até 45 min depois do pedido')).toBeInTheDocument()
    expect(screen.getByText(formatarPreco(1290))).toBeInTheDocument()
    expect(m.cotar).toHaveBeenLastCalledWith({ cep: '04567-000', numero: '120' })
  })

  it('a cotação de exemplo diz "(valor de exemplo)" junto do valor; o mesmo CEP e número não pedem de novo; a de verdade não diz', async () => {
    const endereco = { cep: '04567000', logradouro: 'Rua', numero: '120', complemento: '', bairro: 'Bairro', cidade: 'São Paulo', uf: 'SP' }
    const cotacao = { id: 'c1', valorCentavos: 1290, minutos: 45, expiraEm: new Date(Date.now() + 15 * 60_000).toISOString(), exemplo: true, endereco }
    m.cotar.mockResolvedValueOnce({ ok: true, cotacao }).mockResolvedValueOnce({ ok: true, cotacao: { ...cotacao, exemplo: false } })
    await pagina('prestigio')
    await userEvent.type(screen.getByPlaceholderText('CEP'), '04567000')
    await userEvent.type(screen.getByPlaceholderText('Número'), '120')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(await screen.findByText('Uber, entrega hoje (valor de exemplo)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(screen.getByText('Uber, entrega hoje (valor de exemplo)')).toBeInTheDocument()
    expect(m.cotar).toHaveBeenCalledTimes(1)
    await userEvent.type(screen.getByPlaceholderText('Número'), 'A')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(await screen.findByText('Uber, entrega hoje')).toBeInTheDocument()
    expect(m.cotar).toHaveBeenCalledTimes(2)
    expect(m.cotar).toHaveBeenLastCalledWith({ cep: '04567-000', numero: '120A' })
    expect(screen.queryByText(/valor de exemplo/)).toBeNull()
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
      <TelaProduto pagina={montarPaginaProduto(c, 'pacoca', [])!} gaveta={montarGaveta(c)} linhas={linhasComProduto(c)} />,
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

describe('o formulario do comentario', () => {
  async function abrir() {
    const u = userEvent.setup()
    await pagina('prestigio')
    await u.click(screen.getByRole('button', { name: 'Escrever um comentário' }))
    return u
  }
  const preencher = async (u: ReturnType<typeof userEvent.setup>, nota = 4) => {
    await u.click(screen.getAllByRole('radio')[nota - 1])
    await u.type(screen.getByLabelText('O que achou'), 'Muito bom, voltarei a pedir.')
    await u.click(screen.getByRole('button', { name: 'Enviar comentário' }))
  }

  it('sem o campo de nome, e diz de onde vem o nome', async () => {
    await abrir()
    expect(screen.queryByLabelText('Seu nome')).toBeNull()
    expect(screen.getByText(/Seu nome aparece como no seu perfil, com a inicial do sobrenome\./)).toBeTruthy()
    expect(screen.getByLabelText('O que achou')).toHaveProperty('maxLength', 1000)
  })

  it('envia produto, nota e texto e agradece', async () => {
    m.comentar.mockResolvedValue({ ok: true })
    const u = await abrir()
    await preencher(u)
    expect(m.comentar).toHaveBeenCalledWith({ produto: 'prestigio', nota: 4, texto: 'Muito bom, voltarei a pedir.' })
    expect(await screen.findByText(/Recebemos seu comentário/)).toBeTruthy()
  })

  it.each([
    [{ ok: false, erro: 'comentario_nao_permitido' }, 'Só quem já recebeu este sabor pode comentar.'],
    [{ ok: false, erro: 'muitas_tentativas' }, MENSAGENS_DO_FECHAMENTO.muitas_tentativas],
    [{ ok: false, erro: 'tente_de_novo' }, MENSAGENS_DO_FECHAMENTO.tente_de_novo],
    [{ ok: false, erro: 'campos_invalidos', campos: { texto: 'Conte um pouco mais: de 10 a 1000 letras, sem < nem >.' } }, 'Conte um pouco mais: de 10 a 1000 letras, sem < nem >.'],
  ])('resposta %j mostra a frase dela', async (resposta, frase) => {
    m.comentar.mockResolvedValue(resposta)
    const u = await abrir()
    await preencher(u)
    expect((await screen.findByText(frase)).textContent).toContain(frase)
  })

  it('sem_sessao traz o link Entrar com a volta do produto', async () => {
    m.comentar.mockResolvedValue({ ok: false, erro: 'sem_sessao' })
    const u = await abrir()
    await preencher(u)
    await screen.findByText(/Entre na sua conta para comentar\./)
    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/entrar?volta=/catalogo/prestigio')
  })
})
