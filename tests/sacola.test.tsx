import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import PaginaSacola from '@/app/sacola/page'
import PaginaDoProduto from '@/app/catalogo/[produto]/page'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { mascararCelular, validarDados } from '@/lib/pedido'
import { formatarPreco } from '@/lib/produto'
import {
  CHAVE_SACOLA,
  definirQuantidade,
  limparSacola,
  linhasDaSacola,
  montarLoja,
  somarNaSacola,
  somarLinhas,
} from '@/lib/sacola'

const loja = montarLoja(await carregarCatalogo())
const guardada = () => JSON.parse(localStorage.getItem(CHAVE_SACOLA) ?? '{}')
const guardar = (s: Record<string, number>) => localStorage.setItem(CHAVE_SACOLA, JSON.stringify(s))

const principal = () => screen.getByRole('main')

beforeEach(() => localStorage.clear())

describe('as regras da sacola', () => {
  it('produto sem preco nao entra na loja, e a sacola guardada ignora o sabor', async () => {
    const c = await carregarCatalogo()
    delete c.produtos.find((p) => p.slug === 'pacoca')!.preco
    const semPacoca = montarLoja(c)
    expect(semPacoca).toHaveLength(6)
    expect(linhasDaSacola({ pacoca: 2, prestigio: 1 }, semPacoca).map((l) => l.slug)).toEqual(['prestigio'])
  })

  it('a loja traz os sete sabores com preço, na ordem do cadastro', () => {
    expect(loja.map((i) => i.slug)[0]).toBe('prestigio')
    expect(loja).toHaveLength(7)
    expect(loja[0]).toMatchObject({ nome: 'Prestígio', tipo: 'Bolo no pote', preco: 1890 })
  })

  it('soma, troca a quantidade, tira e tem teto por sabor', () => {
    expect(somarNaSacola('prestigio', 2)).toBe(2)
    expect(somarNaSacola('prestigio', 1)).toBe(3)
    definirQuantidade('pacoca', 1)
    expect(guardada()).toEqual({ prestigio: 3, pacoca: 1 })
    definirQuantidade('prestigio', 0)
    expect(guardada()).toEqual({ pacoca: 1 })
    expect(somarNaSacola('pacoca', 99)).toBe(20)
  })

  it('ignora o que não é quantidade, e o slug que saiu do cadastro', () => {
    expect(limparSacola({ a: 2, b: 0, c: -1, d: 'x', e: 2.7 })).toEqual({ a: 2, e: 2 })
    expect(limparSacola([1, 2])).toEqual({})
    const linhas = linhasDaSacola({ prestigio: 2, sumiu: 4 }, loja)
    expect(linhas.map((l) => l.slug)).toEqual(['prestigio'])
    expect(somarLinhas(linhas)).toBe(3780)
  })

  it('a sacola estragada no navegador vira sacola vazia', async () => {
    localStorage.setItem(CHAVE_SACOLA, '{quebrado')
    render(await PaginaSacola())
    expect(await within(principal()).findByRole('heading', { level: 1, name: 'Sua sacola ainda vazia' })).toBeInTheDocument()
  })
})

describe('os dados do pedido', () => {
  it('a máscara do celular põe DDD e traço', () => {
    expect(mascararCelular('11987654321')).toBe('(11) 98765-4321')
    expect(mascararCelular('119')).toBe('(11) 9')
  })

  it('pede nome, celular com 9 e e-mail', () => {
    expect(validarDados({ nome: 'A', celular: '(11) 3333-4444', email: 'x' })).toEqual({
      nome: expect.any(String),
      celular: expect.any(String),
      email: expect.any(String),
    })
    expect(validarDados({ nome: 'Ana', celular: '(11) 98765-4321', email: 'ana@exemplo.com' })).toEqual({})
  })
})

describe('adicionar na página do produto', () => {
  it('põe na sacola e abre a gaveta da sacola com o subtotal', async () => {
    render(await PaginaDoProduto({ params: Promise.resolve({ produto: 'prestigio' }) }))
    await userEvent.click(screen.getByRole('button', { name: 'Mais um pote' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Adicionar à sacola' })[0])
    const gaveta = await screen.findByRole('dialog', { name: 'Sacola' })
    expect(within(gaveta).getByRole('link', { name: 'Prestígio' })).toBeInTheDocument()
    expect(within(gaveta).getByText(formatarPreco(3780), { selector: '.sacola-gaveta__subtotal b' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sacola, 2 potes' })).toBeInTheDocument()
  })
})

describe('a página /sacola', () => {
  it('vazia: diz e leva ao catálogo', async () => {
    render(await PaginaSacola())
    expect(await within(principal()).findByRole('heading', { level: 1, name: 'Sua sacola ainda vazia' })).toBeInTheDocument()
    expect(within(principal()).getAllByRole('link', { name: 'Ver o catálogo' })[0]).toHaveAttribute('href', '/catalogo')
  })

  it('um h1, e as quatro etapas presas no fio, a primeira atual', async () => {
    guardar({ prestigio: 2, pacoca: 1 })
    render(await PaginaSacola())
    expect(await screen.findByRole('heading', { level: 1, name: 'Sua sacola quase pronta' })).toBeInTheDocument()
    const etapas = within(await screen.findByRole('list', { name: 'Etapas do pedido' })).getAllByRole('listitem', {
      name: (_, el) => el.classList.contains('etapa'),
    })
    expect(etapas).toHaveLength(4)
    expect(etapas[0]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText(formatarPreco(5670), { selector: '.resumo__total dd' })).toBeInTheDocument()
  })

  it('mudar a quantidade e tirar um sabor refaz o resumo', async () => {
    guardar({ prestigio: 1, pacoca: 1 })
    render(await PaginaSacola())
    await userEvent.click(await screen.findByRole('button', { name: 'Mais um pote de Paçoca' }))
    expect(guardada()).toEqual({ prestigio: 1, pacoca: 2 })
    await userEvent.click(screen.getByRole('button', { name: 'Tirar Prestígio da sacola' }))
    expect(guardada()).toEqual({ pacoca: 2 })
    expect(screen.getAllByText(formatarPreco(3780)).length).toBeGreaterThan(0)
  })

  it('o pedido inteiro: entrega, dados, pagamento e a confirmação', async () => {
    guardar({ prestigio: 2 })
    const user = userEvent.setup()
    render(await PaginaSacola())
    const botao = () => screen.getByRole('button', { name: /^(Continuar|Calcular|Fazer o pedido)/ })

    await user.click(await screen.findByRole('button', { name: 'Continuar para a entrega' }))
    await user.type(screen.getByLabelText('CEP'), '30140071')
    await user.type(screen.getByLabelText('Número'), '10')
    await user.click(botao())
    expect(await screen.findByText(/O Uber ainda não chega/, {}, { timeout: 2000 })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('CEP'))
    await user.type(screen.getByLabelText('CEP'), '04567000')
    await user.click(botao())
    expect(await screen.findByLabelText('Nome', {}, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getByText(/CEP 04567-000, 10 · Uber, R\$ [\d,]+ \(valor de exemplo\)/)).toBeInTheDocument()

    await user.click(botao())
    expect(await screen.findByText(/Diga o seu nome/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nome'), 'Ana Souza')
    await user.type(screen.getByLabelText('Celular (WhatsApp)'), '11987654321')
    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.click(botao())

    await user.click(await screen.findByRole('radio', { name: /Cartão de crédito/ }))
    expect(screen.getByText(/nenhum valor é cobrado/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Fazer o pedido/ }))
    expect(await screen.findByRole('heading', { level: 1, name: /^Pedido \d+ recebido$/ }, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText(/pedido de exemplo: nada foi cobrado/)).toBeInTheDocument()
    expect(screen.getByText(/Total, no cartão/)).toBeInTheDocument()
    expect(localStorage.getItem(CHAVE_SACOLA)).toBeNull()
  }, 15000)

  it('outra aba mexeu na sacola: a página acompanha', async () => {
    guardar({ prestigio: 1 })
    render(await PaginaSacola())
    await screen.findByRole('link', { name: 'Prestígio' })
    act(() => {
      guardar({ prestigio: 1, beijinho: 1 })
      window.dispatchEvent(new StorageEvent('storage', { key: CHAVE_SACOLA }))
    })
    expect(await screen.findByRole('link', { name: 'Beijinho' })).toBeInTheDocument()
  })

  it('passa no axe', async () => {
    guardar({ prestigio: 2, pacoca: 1 })
    const { container } = render(await PaginaSacola())
    await screen.findByRole('list', { name: 'Etapas do pedido' })
    expect(await axe(container)).toHaveNoViolations()
  })
})
