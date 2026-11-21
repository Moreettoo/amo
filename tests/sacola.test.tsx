import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import PaginaSacola from '@/app/sacola/page'
import PaginaDoProduto from '@/app/catalogo/[produto]/page'
import { CHAVE_DO_PROGRESSO } from '@/components/sacola/progresso'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { MENSAGENS_DO_FECHAMENTO, type Cotacao } from '@/lib/fechamento/tipos'
import { resumoDosHorarios, textoDaLoja, type SituacaoDaLoja } from '@/lib/loja'
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

const m = vi.hoisted(() => ({
  usuario: null as { id: string; email: string; nome: string; celular: string } | null,
  enderecos: [] as Record<string, unknown>[],
  enderecosFalham: false,
  falha: vi.fn(),
  horarios: [2, 3, 4, 5, 6].map((dia) => ({ dia, abre: '09:00', fecha: '18:00' })),
  situacao: { aberta: true, fecha: '18:00' } as SituacaoDaLoja,
  cotar: vi.fn(),
}))
// as acoes do servidor sao falsas aqui: no Vitest uma acao e uma funcao comum
vi.mock('@/app/sacola/acoes', () => ({ cotarEntrega: m.cotar }))
vi.mock('@/lib/auth', async (original) => ({ ...(await original<typeof import('@/lib/auth')>()), obterUsuario: async () => m.usuario }))
vi.mock('@/lib/dados/enderecos', () => ({
  lerEnderecos: async () => {
    if (m.enderecosFalham) throw new Error('banco fora')
    return m.enderecos
  },
}))
vi.mock('@/lib/dados/erros', async (original) => ({ ...(await original<typeof import('@/lib/dados/erros')>()), registrarFalha: m.falha }))
vi.mock('@/lib/dados/loja', () => ({ lerLoja: async () => ({ horarios: m.horarios, pausada: false }) }))
vi.mock('@/lib/loja', async (original) => ({ ...(await original<typeof import('@/lib/loja')>()), situacaoDaLoja: () => m.situacao }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-nonce': 'nonce-de-teste' }) }))

const cotacaoDe = (venceEmMs = 15 * 60_000): Cotacao => ({
  id: 'b1f0c9a2-4d3e-4f5a-8b6c-7d8e9f0a1b2c',
  valorCentavos: 1290,
  minutos: 45,
  expiraEm: new Date(Date.now() + venceEmMs).toISOString(),
  exemplo: true,
  endereco: {
    cep: '04567000',
    logradouro: 'Rua Gomes de Carvalho',
    numero: '10',
    complemento: '',
    bairro: 'Vila Olímpia',
    cidade: 'São Paulo',
    uf: 'SP',
  },
})
const linhaDaEntrega = (sufixo = ' (valor de exemplo)') => `Rua Gomes de Carvalho, 10 · Vila Olímpia · Uber, ${formatarPreco(1290)}${sufixo}`

const loja = montarLoja(await carregarCatalogo())
const guardada = () => JSON.parse(localStorage.getItem(CHAVE_SACOLA) ?? '{}')
const guardar = (s: Record<string, number>) => localStorage.setItem(CHAVE_SACOLA, JSON.stringify(s))

const principal = () => screen.getByRole('main')

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  m.usuario = null
  m.enderecos = []
  m.enderecosFalham = false
  m.falha.mockReset()
  m.situacao = { aberta: true, fecha: '18:00' }
  m.cotar.mockReset()
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '1x00000000000000000000AA')
})

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

    m.cotar.mockResolvedValueOnce({ ok: false, erro: 'fora_da_area' }).mockResolvedValueOnce({ ok: true, cotacao: cotacaoDe() })
    await user.click(await screen.findByRole('button', { name: 'Continuar para a entrega' }))
    await user.type(screen.getByLabelText('CEP'), '30140071')
    await user.type(screen.getByLabelText('Número'), '10')
    await user.click(botao())
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.fora_da_area)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('CEP'))
    await user.type(screen.getByLabelText('CEP'), '04567000')
    await user.click(botao())
    expect(await screen.findByLabelText('Nome')).toBeInTheDocument()
    expect(m.cotar).toHaveBeenLastCalledWith({ cep: '04567-000', numero: '10', complemento: '' })
    expect(screen.getByText(linhaDaEntrega())).toBeInTheDocument()

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
    expect(sessionStorage.getItem(CHAVE_DO_PROGRESSO)).toBeNull()
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
    m.situacao = { aberta: false, pausada: false, abre: { dia: 2, hora: '09:00', emDias: 1 } }
    const { container } = render(await PaginaSacola())
    await screen.findByRole('list', { name: 'Etapas do pedido' })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('a sacola fala com o servidor', () => {
  const resumo = () => screen.getByRole('complementary', { name: 'Resumo' })
  const irParaAEntrega = async () => {
    const user = userEvent.setup()
    render(await PaginaSacola())
    await user.click(await screen.findByRole('button', { name: 'Continuar para a entrega' }))
    return user
  }

  it('a etapa 2 cota no servidor; a linha da etapa e o resumo da página mostram a entrega', async () => {
    guardar({ prestigio: 2 })
    m.cotar.mockResolvedValue({ ok: true, cotacao: cotacaoDe() })
    const user = await irParaAEntrega()
    await user.type(screen.getByLabelText('CEP'), '04567000')
    await user.type(screen.getByLabelText('Número'), '10')
    await user.type(screen.getByLabelText('Complemento (opcional)'), 'apto 12')
    await user.click(screen.getByRole('button', { name: 'Calcular e continuar' }))
    expect(await screen.findByLabelText('Nome')).toBeInTheDocument()
    expect(m.cotar).toHaveBeenCalledWith({ cep: '04567-000', numero: '10', complemento: 'apto 12' })
    expect(screen.getByText(linhaDaEntrega())).toBeInTheDocument()
    expect(within(resumo()).getByText('Entrega (valor de exemplo)')).toBeInTheDocument()
    expect(within(resumo()).getByText(formatarPreco(1290))).toBeInTheDocument()
    expect(within(resumo()).getByText(formatarPreco(2 * 1890 + 1290), { selector: '.resumo__total dd' })).toBeInTheDocument()
  })

  it('erro com campos: a frase embaixo do campo, com aria-invalid; sem campos: a frase do código, em região viva', async () => {
    guardar({ prestigio: 1 })
    m.cotar
      .mockResolvedValueOnce({ ok: false, erro: 'campos_invalidos', campos: { numero: 'Use só letras e números no número, até 10.' } })
      .mockResolvedValueOnce({ ok: false, erro: 'muitas_tentativas' })
    const user = await irParaAEntrega()
    await user.type(screen.getByLabelText('CEP'), '04567000')
    await user.type(screen.getByLabelText('Número'), '1@')
    await user.click(screen.getByRole('button', { name: 'Calcular e continuar' }))
    const numero = screen.getByLabelText('Número')
    await waitFor(() => expect(numero).toHaveAttribute('aria-invalid', 'true'))
    expect(numero).toHaveAccessibleDescription(expect.stringContaining('Use só letras e números no número, até 10.'))
    expect(within(numero.closest('.campo') as HTMLElement).getByText('Use só letras e números no número, até 10.')).toBeInTheDocument()
    expect(screen.getByLabelText('CEP')).not.toHaveAttribute('aria-invalid')

    await user.click(screen.getByRole('button', { name: 'Calcular e continuar' }))
    const linha = await screen.findByText(MENSAGENS_DO_FECHAMENTO.muitas_tentativas)
    expect(linha.closest('[aria-live]')).not.toBeNull()
    expect(screen.getByLabelText('Número')).not.toHaveAttribute('aria-invalid')
  })

  it('logada com endereço principal: CEP, número e complemento já vêm preenchidos', async () => {
    guardar({ prestigio: 1 })
    m.usuario = { id: 'usuario-1', email: 'mariana@exemplo.com.br', nome: 'Mariana Costa', celular: '11987654321' }
    const comum = { logradouro: 'Rua', bairro: 'Bairro', cidade: 'São Paulo', uf: 'SP' }
    m.enderecos = [
      { id: 'e1', apelido: 'Trabalho', cep: '01310100', numero: '1000', complemento: '', principal: false, ...comum },
      { id: 'e2', apelido: 'Casa', cep: '04567000', numero: '10', complemento: 'apto 12', principal: true, ...comum },
    ]
    await irParaAEntrega()
    expect(screen.getByLabelText('CEP')).toHaveValue('04567-000')
    expect(screen.getByLabelText('Número')).toHaveValue('10')
    expect(screen.getByLabelText('Complemento (opcional)')).toHaveValue('apto 12')
  })

  it('loja fechada: o resumo diz quando abre e os horários desde a etapa 1; aberta, até que horas', async () => {
    guardar({ prestigio: 1 })
    m.situacao = { aberta: false, pausada: false, abre: { dia: 2, hora: '09:00', emDias: 1 } }
    const { unmount } = render(await PaginaSacola())
    await screen.findByRole('button', { name: 'Continuar para a entrega' })
    expect(within(resumo()).getByText(textoDaLoja(m.situacao))).toBeInTheDocument()
    expect(within(resumo()).getByText(resumoDosHorarios(m.horarios))).toBeInTheDocument()
    unmount()

    m.situacao = { aberta: true, fecha: '18:00' }
    render(await PaginaSacola())
    await screen.findByRole('button', { name: 'Continuar para a entrega' })
    expect(within(resumo()).getByText('Pedidos até as 18h.')).toBeInTheDocument()
    expect(within(resumo()).queryByText(resumoDosHorarios(m.horarios))).toBeNull()
  })

  it('recarregar com o progresso guardado: volta à etapa 3 com a entrega; com a cotação vencida, à 2 com o endereço', async () => {
    guardar({ prestigio: 1 })
    const endereco = { cep: '04567-000', numero: '10', complemento: 'apto 12' }
    sessionStorage.setItem(CHAVE_DO_PROGRESSO, JSON.stringify({ etapa: 3, endereco, cotacao: { ...cotacaoDe(), exemplo: false }, conta: null }))
    const { unmount } = render(await PaginaSacola())
    expect(await screen.findByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByText(linhaDaEntrega(''))).toBeInTheDocument()
    expect(within(resumo()).getByText('Entrega')).toBeInTheDocument()
    expect(m.cotar).not.toHaveBeenCalled()
    unmount()

    sessionStorage.setItem(CHAVE_DO_PROGRESSO, JSON.stringify({ etapa: 3, endereco, cotacao: cotacaoDe(-1000), conta: null }))
    render(await PaginaSacola())
    expect(await screen.findByLabelText('CEP')).toHaveValue('04567-000')
    expect(screen.getByLabelText('Número')).toHaveValue('10')
    expect(screen.getByLabelText('Complemento (opcional)')).toHaveValue('apto 12')
    expect(within(resumo()).getByText('informe o CEP')).toBeInTheDocument()
  })
})

describe('a entrega e o progresso, nos casos difíceis', () => {
  const irParaAEntrega = async () => {
    const user = userEvent.setup()
    render(await PaginaSacola())
    await user.click(await screen.findByRole('button', { name: 'Continuar para a entrega' }))
    return user
  }
  const mariana = { id: 'usuario-1', email: 'mariana@exemplo.com.br', nome: 'Mariana Costa', celular: '11987654321' }

  it('com o CEP e o número marcados, digitar o CEP fica no CEP; digitar no número tira o erro dele', async () => {
    guardar({ prestigio: 1 })
    m.cotar.mockResolvedValueOnce({
      ok: false,
      erro: 'campos_invalidos',
      campos: { cep: 'Confira o CEP: ele tem 8 números.', numero: 'Falta o número da casa ou do prédio.' },
    })
    const user = await irParaAEntrega()
    await user.click(screen.getByRole('button', { name: 'Calcular e continuar' }))
    const cep = screen.getByLabelText('CEP')
    await waitFor(() => expect(cep).toHaveFocus())
    await user.type(cep, '04567000')
    expect(cep).toHaveValue('04567-000')
    expect(cep).toHaveFocus()
    expect(cep).not.toHaveAttribute('aria-invalid')
    const numero = screen.getByLabelText('Número')
    expect(numero).toHaveValue('')
    expect(within(numero.closest('.campo') as HTMLElement).getByText('Falta o número da casa ou do prédio.')).toBeInTheDocument()
    await user.type(numero, '10')
    expect(numero).toHaveValue('10')
    expect(numero).not.toHaveAttribute('aria-invalid')
    expect(within(numero.closest('.campo') as HTMLElement).queryByText('Falta o número da casa ou do prédio.')).toBeNull()
  })

  it('o progresso guardado por outra conta não volta; o guardado sem conta segue para quem entrou e passa a ser dela', async () => {
    guardar({ prestigio: 1 })
    m.usuario = mariana
    const progresso = (conta: string | null) =>
      JSON.stringify({ etapa: 3, endereco: { cep: '04567-000', numero: '10', complemento: '' }, cotacao: cotacaoDe(), conta })
    sessionStorage.setItem(CHAVE_DO_PROGRESSO, progresso('0123456789abcdef'))
    const { unmount } = render(await PaginaSacola())
    expect(await screen.findByRole('button', { name: 'Continuar para a entrega' })).toBeInTheDocument()
    unmount()

    sessionStorage.setItem(CHAVE_DO_PROGRESSO, progresso(null))
    render(await PaginaSacola())
    expect(await screen.findByLabelText('Nome')).toBeInTheDocument()
    const marca = createHash('sha256').update('usuario-1').digest('hex').slice(0, 16)
    expect(JSON.parse(sessionStorage.getItem(CHAVE_DO_PROGRESSO) ?? '{}').conta).toBe(marca)
  })

  it('sem os endereços (falha do banco) a sacola abre sem o principal, e a falha vai ao log', async () => {
    guardar({ prestigio: 1 })
    m.usuario = mariana
    m.enderecosFalham = true
    await irParaAEntrega()
    expect(screen.getByLabelText('CEP')).toHaveValue('')
    expect(m.falha).toHaveBeenCalledWith('sacola_enderecos', expect.any(Error))
  })
})
