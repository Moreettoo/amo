import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import PaginaSacola from '@/app/sacola/page'
import PaginaDoProduto from '@/app/catalogo/[produto]/page'
import { horaDeSaoPaulo } from '@/components/sacola/espera'
import { CHAVE_DO_PROGRESSO } from '@/components/sacola/progresso'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { MENSAGENS_DO_FECHAMENTO, mensagemDaRecusa, type Cotacao, type SituacaoDoPedido } from '@/lib/fechamento/tipos'
import { resumoDosHorarios, textoDaLoja, type SituacaoDaLoja } from '@/lib/loja'
import { mascararCelular } from '@/lib/pedido'
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
  fechar: vi.fn(),
  pagarPix: vi.fn(),
  pagarCartao: vi.fn(),
  situacaoPedido: vi.fn(),
  refresh: vi.fn(),
}))
// as acoes do servidor sao falsas aqui: no Vitest uma acao e uma funcao comum
vi.mock('@/app/sacola/acoes', () => ({
  cotarEntrega: m.cotar,
  fecharPedido: m.fechar,
  pagarComPix: m.pagarPix,
  pagarComCartao: m.pagarCartao,
  situacaoDoPedido: m.situacaoPedido,
}))
// o router.refresh() traz da pagina o que mudou no servidor (precos, loja, sessao)
vi.mock('next/navigation', async (original) => ({
  ...(await original<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: m.refresh }),
}))
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

/** O Pix como o Mercado Pago devolve: o copia e cola e o QR em PNG (base64). */
const PIX = {
  copiaECola: '00020101021226830014br.gov.bcb.pix2561qrcode.exemplo.com.br/amo-123456520400005303986540550.705802BR6304ABCD',
  qrBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
}
/** O pedido 123456 aguardando o Pix, com o codigo valendo (30 min, pelo relogio de agora). */
const pixPendente = (pix: Partial<typeof PIX & { expiraEm: string }> = {}): SituacaoDoPedido => ({
  numero: '123456',
  estado: 'aguardando_pagamento',
  pagamento: {
    forma: 'pix',
    estado: 'pendente',
    recusa: null,
    pix: { ...PIX, expiraEm: new Date(Date.now() + 30 * 60_000).toISOString(), ...pix },
    desafioUrl: null,
  },
})
const pixPago = (): SituacaoDoPedido => ({
  numero: '123456',
  estado: 'pago',
  pagamento: { forma: 'pix', estado: 'aprovado', recusa: null, pix: null, desafioUrl: null },
})

/** O relogio falso so no que a espera usa: o React e o jsdom seguem com os deles. */
const relogioFalso = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
/** Anda o relogio falso e deixa as promessas e o React assentarem. */
const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
/** O axe usa setTimeout: com o relogio falso ele anda de 1 em 1 ms ate o axe terminar, longe da proxima pergunta da espera. */
async function axeNoRelogioFalso(el: Element) {
  let pronto = false
  const resultado = axe(el).finally(() => (pronto = true))
  for (let ms = 0; !pronto && ms < 2000; ms++) await andar(1)
  return resultado
}

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(document, 'visibilityState')
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  m.usuario = null
  m.enderecos = []
  m.enderecosFalham = false
  m.falha.mockReset()
  m.situacao = { aberta: true, fecha: '18:00' }
  m.cotar.mockReset()
  m.fechar.mockReset()
  m.fechar.mockResolvedValue({ ok: true, pedido: { numero: '123456', totalCentavos: 5070 } })
  m.pagarCartao.mockReset()
  m.pagarPix.mockReset()
  m.pagarPix.mockResolvedValue({ ok: true, situacao: pixPendente() })
  m.situacaoPedido.mockReset()
  m.situacaoPedido.mockResolvedValue({ ok: true, situacao: pixPendente() })
  m.refresh.mockReset()
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
    // por enquanto so o Pix e oferecido: a dica da etapa 4 diz so ele
    expect(within(etapas[3]).getByText('Pix.', { selector: '.etapa__dica' })).toBeInTheDocument()
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

  it('o caminho inteiro: entrega, dados, "Pagar com Pix" fecha o pedido e gera o Pix; a espera confirma o pagamento', async () => {
    guardar({ prestigio: 2 })
    m.usuario = { id: 'usuario-1', email: 'ana@exemplo.com', nome: 'Ana Souza', celular: '11987654321' }
    const user = userEvent.setup()
    render(await PaginaSacola())
    const botao = () => screen.getByRole('button', { name: /^(Continuar|Calcular|Pagar com Pix)/ })

    m.cotar.mockResolvedValueOnce({ ok: false, erro: 'fora_da_area' }).mockResolvedValueOnce({ ok: true, cotacao: cotacaoDe() })
    await user.click(await screen.findByRole('button', { name: 'Continuar para a entrega' }))
    await user.type(screen.getByLabelText('CEP'), '30140071')
    await user.type(screen.getByLabelText('Número'), '10')
    await user.click(botao())
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.fora_da_area)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('CEP'))
    await user.type(screen.getByLabelText('CEP'), '04567000')
    await user.click(botao())
    expect(await screen.findByRole('link', { name: 'Trocar em Minha conta' })).toBeInTheDocument()
    expect(m.cotar).toHaveBeenLastCalledWith({ cep: '04567-000', numero: '10', complemento: '' })
    expect(screen.getByText(linhaDaEntrega())).toBeInTheDocument()

    await user.click(botao())

    expect(await screen.findByRole('radio', { name: 'Pix' })).toBeChecked()
    // o pagamento deixou de ser de exemplo: nenhum texto dele sobra
    expect(document.body.textContent).not.toMatch(/Pagamento de exemplo|nenhum valor é cobrado/)

    // daqui a espera do pagamento conta o tempo: o relogio passa a ser o do teste
    relogioFalso()
    const pixDoPedido = pixPendente()
    m.pagarPix.mockResolvedValue({ ok: true, situacao: pixDoPedido })
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: pixPago() })
    // com o relogio falso o clique e o do fireEvent: o do user-event espera um setTimeout que nao anda
    fireEvent.click(screen.getByRole('button', { name: `Pagar com Pix · ${formatarPreco(5070)}` }))
    await andar(0)

    expect(m.fechar).toHaveBeenCalledWith({
      itens: [{ produto: 'prestigio', quantos: 2 }],
      cotacao: cotacaoDe().id,
      totalVisto: 5070,
      guardarEndereco: false,
    })
    expect(m.pagarPix).toHaveBeenCalledWith({ numero: '123456' })
    expect(m.fechar.mock.invocationCallOrder[0]).toBeLessThan(m.pagarPix.mock.invocationCallOrder[0])

    expect(screen.getByRole('heading', { level: 1, name: 'Pedido 123456 aguardando o Pix' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    // o numero do pedido nao quebra no hifen e o tradutor nao mexe nele (AMO-...)
    const numero = within(screen.getByRole('heading', { level: 1 })).getByText('123456')
    expect(numero).toHaveClass('feito__numero')
    expect(numero).toHaveAttribute('translate', 'no')
    expect(screen.getByRole('img', { name: 'QR Code do Pix' })).toHaveAttribute('src', `data:image/png;base64,${PIX.qrBase64}`)
    const copiaECola = screen.getByRole('textbox', { name: 'Pix copia e cola' })
    expect(copiaECola).toHaveValue(PIX.copiaECola)
    expect(copiaECola).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument()
    expect(screen.getByText(`Vale até ${horaDeSaoPaulo(pixDoPedido.pagamento!.pix!.expiraEm!)}`)).toBeInTheDocument()
    expect(screen.getByText('Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código.')).toBeInTheDocument()
    expect(screen.getByText(/Entrega pelo Uber \(valor de exemplo\), Rua Gomes de Carvalho, 10/)).toBeInTheDocument()
    expect(screen.getByText('Total, no Pix').nextElementSibling).toHaveTextContent(formatarPreco(5070))
    expect(document.body.textContent).not.toMatch(/pedido de exemplo|Pagamento de exemplo/)
    // o Pix ainda nao foi pago: a sacola fica
    expect(guardada()).toEqual({ prestigio: 2 })

    // a espera pergunta em 5 s, nao antes
    await andar(4999)
    expect(m.situacaoPedido).not.toHaveBeenCalled()
    await andar(1)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(1)
    expect(m.situacaoPedido).toHaveBeenCalledWith({ numero: '123456' })

    expect(screen.getByText('Pagamento aprovado.')).toBeInTheDocument()
    const titulo = screen.getByRole('heading', { level: 1, name: 'Pedido 123456 recebido' })
    expect(titulo).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Acompanhar em Minha conta' })).toHaveAttribute('href', '/conta/pedidos/123456')
    expect(screen.queryByRole('img', { name: 'QR Code do Pix' })).toBeNull()
    expect(localStorage.getItem(CHAVE_SACOLA)).toBeNull()
    expect(sessionStorage.getItem(CHAVE_DO_PROGRESSO)).toBeNull()
    // pago, a espera para
    await andar(60_000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(1)
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
    expect(await screen.findByRole('navigation', { name: 'Entrar ou criar conta' })).toBeInTheDocument()
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
    expect(await screen.findByRole('navigation', { name: 'Entrar ou criar conta' })).toBeInTheDocument()
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
    expect(await screen.findByRole('link', { name: 'Trocar em Minha conta' })).toBeInTheDocument()
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

describe('a etapa Seus dados e a conta', () => {
  const mariana = { id: 'usuario-1', email: 'mariana@exemplo.com.br', nome: 'Mariana Costa', celular: '11987654321' }
  const marca = createHash('sha256').update('usuario-1').digest('hex').slice(0, 16)
  const resumo = () => screen.getByRole('complementary', { name: 'Resumo' })
  const caixa = 'Guardar este endereço em Minha conta'
  /** o progresso guardado na etapa 3, com a entrega cotada */
  const naEtapa3 = (conta: string | null) =>
    sessionStorage.setItem(
      CHAVE_DO_PROGRESSO,
      JSON.stringify({ etapa: 3, endereco: { cep: '04567-000', numero: '10', complemento: '' }, cotacao: cotacaoDe(), conta }),
    )
  const etapaAtual = async () => {
    await screen.findByRole('list', { name: 'Etapas do pedido' })
    return document.querySelector<HTMLElement>('.etapa[aria-current="step"]')!
  }

  it('logada: nome, celular e e-mail da conta, a caixa desmarcada e o link para trocar; feita, a linha diz nome e celular', async () => {
    guardar({ prestigio: 1 })
    m.usuario = mariana
    naEtapa3(marca)
    const user = userEvent.setup()
    render(await PaginaSacola())
    const etapa = await etapaAtual()
    expect(within(etapa).getByRole('heading', { name: '3. Seus dados' })).toBeInTheDocument()
    expect(within(etapa).getByText('Mariana Costa')).toBeInTheDocument()
    expect(within(etapa).getByText('(11) 98765-4321')).toBeInTheDocument()
    expect(within(etapa).getByText('mariana@exemplo.com.br')).toBeInTheDocument()
    expect(within(etapa).getByRole('link', { name: 'Trocar em Minha conta' })).toHaveAttribute('href', '/conta/perfil')
    expect(within(etapa).getByRole('checkbox', { name: caixa })).not.toBeChecked()
    expect(screen.queryByRole('navigation', { name: 'Entrar ou criar conta' })).toBeNull()

    await user.click(within(resumo()).getByRole('button', { name: 'Continuar para o pagamento' }))
    expect(await screen.findByRole('radio', { name: /Pix/ })).toBeInTheDocument()
    expect(screen.getByText('Mariana Costa · (11) 98765-4321', { selector: '.etapa__resumo' })).toBeInTheDocument()
  })

  it('deslogada: a porta dentro da etapa, com volta=/sacola, e o botão do resumo desligado com "Entre para continuar"', async () => {
    guardar({ prestigio: 1 })
    naEtapa3(null)
    const user = userEvent.setup()
    const { container } = render(await PaginaSacola())
    const etapa = await etapaAtual()
    const abas = within(etapa).getByRole('navigation', { name: 'Entrar ou criar conta' })
    expect(within(abas).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar?volta=%2Fsacola')
    expect(within(abas).getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro?volta=%2Fsacola')
    // a pagina e a sacola, nao /entrar: as abas nao dizem aria-current="page"; a atual so se marca no desenho
    for (const aba of within(abas).getAllByRole('link')) expect(aba).not.toHaveAttribute('aria-current')
    expect(within(abas).getByRole('link', { name: 'Entrar' })).toHaveClass('porta__aba--atual')
    expect(within(abas).getByRole('link', { name: 'Criar conta' })).not.toHaveClass('porta__aba--atual')
    expect(within(etapa).getByLabelText('E-mail')).toBeInTheDocument()
    expect(within(etapa).getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(container.querySelector('input[name="volta"]')).toHaveValue('/sacola')
    // a casca de /entrar (o titulo da pagina) nao entra: o h1 continua o da sacola
    expect(screen.queryByText('ter você aqui')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(within(etapa).queryByRole('checkbox', { name: caixa })).toBeNull()

    const botao = within(resumo()).getByRole('button', { name: 'Entre para continuar' })
    expect(botao).toBeDisabled()
    expect(within(resumo()).queryByRole('button', { name: 'Continuar para o pagamento' })).toBeNull()

    // a troca de aba acontece no lugar, sem sair da etapa
    await user.click(within(abas).getByRole('link', { name: 'Criar conta' }))
    expect(within(etapa).getByLabelText('Nome')).toBeInTheDocument()
    expect(etapa).toHaveAttribute('aria-current', 'step')
    expect(within(abas).getByRole('link', { name: 'Criar conta' })).toHaveClass('porta__aba--atual')
    expect(within(abas).getByRole('link', { name: 'Criar conta' })).not.toHaveAttribute('aria-current')
  })

  it('entrou pela porta: a página volta com a cliente e a etapa 3 mostra os dados dela, com a entrega guardada', async () => {
    guardar({ prestigio: 1 })
    naEtapa3(null)
    const { rerender } = render(await PaginaSacola())
    await screen.findByRole('navigation', { name: 'Entrar ou criar conta' })
    // a acao de entrar leva a /sacola, e a pagina volta do servidor com a cliente
    m.usuario = mariana
    rerender(await PaginaSacola())
    expect(await screen.findByRole('link', { name: 'Trocar em Minha conta' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Entrar ou criar conta' })).toBeNull()
    expect(screen.getByText(linhaDaEntrega())).toBeInTheDocument()
    expect(within(resumo()).getByRole('button', { name: 'Continuar para o pagamento' })).toBeEnabled()
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem(CHAVE_DO_PROGRESSO) ?? '{}').conta).toBe(marca))
    // o leitor de tela ouve onde ela esta: o foco vai ao titulo da etapa
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: '3. Seus dados' })).toHaveFocus())
  })

  it('a página que já abre logada depois de entrar (o progresso era sem conta) leva o foco ao título da etapa 3', async () => {
    guardar({ prestigio: 1 })
    naEtapa3(null)
    m.usuario = mariana
    render(await PaginaSacola())
    expect(await screen.findByRole('link', { name: 'Trocar em Minha conta' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: '3. Seus dados' })).toHaveFocus())
  })

  it('logada desde o começo, a etapa 3 guardada não rouba o foco', async () => {
    guardar({ prestigio: 1 })
    naEtapa3(marca)
    m.usuario = mariana
    render(await PaginaSacola())
    expect(await screen.findByRole('link', { name: 'Trocar em Minha conta' })).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.getByRole('heading', { level: 2, name: '3. Seus dados' })).not.toHaveFocus()
  })

  it('a caixa marcada fica na volta à etapa e vai como guardarEndereco: true quando o pedido é fechado', async () => {
    guardar({ prestigio: 1 })
    m.usuario = mariana
    naEtapa3(marca)
    const user = userEvent.setup()
    render(await PaginaSacola())
    await user.click(await screen.findByRole('checkbox', { name: caixa }))
    await user.click(within(resumo()).getByRole('button', { name: 'Continuar para o pagamento' }))
    await user.click(await screen.findByRole('button', { name: 'Alterar seus dados' }))
    expect(await screen.findByRole('checkbox', { name: caixa })).toBeChecked()
    await user.click(within(resumo()).getByRole('button', { name: 'Continuar para o pagamento' }))
    await user.click(await screen.findByRole('button', { name: /^Pagar com Pix/ }))
    await waitFor(() => expect(m.fechar).toHaveBeenCalledWith(expect.objectContaining({ guardarEndereco: true })))
  })

  it('passa no axe com a porta aberta dentro da etapa, e logada com os dados', async () => {
    guardar({ prestigio: 1 })
    naEtapa3(null)
    const { container, unmount } = render(await PaginaSacola())
    await screen.findByRole('navigation', { name: 'Entrar ou criar conta' })
    expect(await axe(container)).toHaveNoViolations()
    unmount()

    m.usuario = mariana
    naEtapa3(marca)
    const logada = render(await PaginaSacola())
    await screen.findByRole('checkbox', { name: caixa })
    expect(await axe(logada.container)).toHaveNoViolations()
  })
})

describe('o Pix e a espera do pagamento', () => {
  const ana = { id: 'usuario-1', email: 'ana@exemplo.com', nome: 'Ana Souza', celular: '11987654321' }
  const marca = createHash('sha256').update('usuario-1').digest('hex').slice(0, 16)
  const resumo = () => screen.getByRole('complementary', { name: 'Resumo' })
  const botaoDoResumo = () => within(resumo()).getByRole('button')
  /** logada, na etapa 4, com a entrega cotada (dois potes de Prestigio: R$ 37,80 + R$ 12,90) */
  const naEtapa4 = async () => {
    guardar({ prestigio: 2 })
    m.usuario = ana
    const endereco = { cep: '04567-000', numero: '10', complemento: '' }
    sessionStorage.setItem(CHAVE_DO_PROGRESSO, JSON.stringify({ etapa: 3, endereco, cotacao: cotacaoDe(), conta: marca }))
    const user = userEvent.setup()
    const tela = render(await PaginaSacola())
    await user.click(await screen.findByRole('button', { name: 'Continuar para o pagamento' }))
    expect(await screen.findByRole('radio', { name: 'Pix' })).toBeChecked()
    return { user, ...tela }
  }
  /** na etapa 4 com o relogio falso, paga com Pix e espera o pedido feito aparecer */
  const pagoComPix = async () => {
    const { container } = await naEtapa4()
    relogioFalso()
    // com o relogio falso o clique e o do fireEvent: o do user-event espera um setTimeout que nao anda
    fireEvent.click(botaoDoResumo())
    await andar(0)
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido 123456 aguardando o Pix' })).toBeInTheDocument()
    return container
  }
  const mudarAba = (estado: 'hidden' | 'visible') =>
    act(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado })
      document.dispatchEvent(new Event('visibilitychange'))
    })

  it('clique duplo em "Pagar com Pix" fecha o pedido uma vez, e o botão fica ocupado dizendo o que faz', async () => {
    const { user } = await naEtapa4()
    m.fechar.mockReturnValue(new Promise(() => {}))
    await user.dblClick(within(resumo()).getByRole('button', { name: `Pagar com Pix · ${formatarPreco(5070)}` }))
    expect(m.fechar).toHaveBeenCalledTimes(1)
    const ocupado = botaoDoResumo()
    expect(ocupado).toBeDisabled()
    expect(ocupado).toHaveAttribute('aria-busy', 'true')
    expect(ocupado).toHaveTextContent('Fechando o pedido, só um instante')
    await user.click(ocupado)
    expect(m.fechar).toHaveBeenCalledTimes(1)
    expect(m.pagarPix).not.toHaveBeenCalled()
  })

  it('a resposta que chega depois de a cliente sair da etapa 4 é ignorada', async () => {
    const { user } = await naEtapa4()
    let responder: (r: unknown) => void = () => {}
    m.fechar.mockReturnValue(new Promise((r) => (responder = r)))
    await user.click(botaoDoResumo())
    await user.click(screen.getByRole('button', { name: 'Alterar entrega' }))
    expect(await screen.findByLabelText('CEP')).toBeInTheDocument()
    await act(async () => responder({ ok: true, pedido: { numero: '123456', totalCentavos: 5070 } }))
    expect(m.pagarPix).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { level: 1, name: /^Pedido/ })).toBeNull()
    expect(screen.getByLabelText('CEP')).toBeInTheDocument()
  })

  it('cotacao_vencida volta à etapa 2 com a frase, com o endereço, e a entrega volta a ser calculada', async () => {
    const { user } = await naEtapa4()
    m.fechar.mockResolvedValue({ ok: false, erro: 'cotacao_vencida' })
    await user.click(botaoDoResumo())
    const frase = await screen.findByText(MENSAGENS_DO_FECHAMENTO.cotacao_vencida)
    expect(frase).toHaveAttribute('aria-live', 'polite')
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('2. Entrega')
    expect(screen.getByLabelText('CEP')).toHaveValue('04567-000')
    expect(within(resumo()).getByText('informe o CEP')).toBeInTheDocument()
    expect(within(resumo()).getByRole('button', { name: 'Calcular e continuar' })).toBeEnabled()
    expect(m.pagarPix).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: '2. Entrega' })).toHaveFocus())
  })

  it('produto_indisponivel volta à etapa 1 com a frase, e a página traz o cardápio de novo', async () => {
    const { user } = await naEtapa4()
    m.fechar.mockResolvedValue({ ok: false, erro: 'produto_indisponivel' })
    await user.click(botaoDoResumo())
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.produto_indisponivel)).toHaveAttribute('aria-live', 'polite')
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('1. Os potes')
    expect(m.refresh).toHaveBeenCalled()
  })

  it('sem_sessao volta à etapa 3 com a frase, e a página traz a sessão de novo', async () => {
    const { user } = await naEtapa4()
    m.fechar.mockResolvedValue({ ok: false, erro: 'sem_sessao' })
    await user.click(botaoDoResumo())
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.sem_sessao)).toHaveAttribute('aria-live', 'polite')
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('3. Seus dados')
    expect(m.refresh).toHaveBeenCalled()
  })

  it('total_mudou fica na etapa 4 com a frase, e a página traz os preços de novo', async () => {
    const { user } = await naEtapa4()
    m.fechar.mockResolvedValue({ ok: false, erro: 'total_mudou' })
    await user.click(botaoDoResumo())
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.total_mudou)).toBeInTheDocument()
    expect(m.refresh).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('4. Pagamento')
    expect(botaoDoResumo()).toBeEnabled()
  })

  it('loja_fechada: a frase, o botão desligado com "Cozinha fechada agora", e o resumo passa a dizer quando abre', async () => {
    const { user, rerender } = await naEtapa4()
    m.fechar.mockResolvedValue({ ok: false, erro: 'loja_fechada' })
    await user.click(botaoDoResumo())
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.loja_fechada)).toHaveAttribute('aria-live', 'polite')
    expect(within(resumo()).getByRole('button', { name: 'Cozinha fechada agora' })).toBeDisabled()
    expect(m.pagarPix).not.toHaveBeenCalled()
    expect(m.refresh).toHaveBeenCalledTimes(1)

    // o refresh traz a pagina do servidor com a loja fechada; a cliente segue na etapa 4
    m.situacao = { aberta: false, pausada: false, abre: { dia: 2, hora: '09:00', emDias: 1 } }
    rerender(await PaginaSacola())
    expect(await within(resumo()).findByText(textoDaLoja(m.situacao))).toBeInTheDocument()
    expect(within(resumo()).getByText(resumoDosHorarios(m.horarios))).toBeInTheDocument()
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('4. Pagamento')
    expect(within(resumo()).getByRole('button', { name: 'Cozinha fechada agora' })).toBeDisabled()

    // um refresh depois traz a loja aberta de novo: o botao volta a pagar
    m.situacao = { aberta: true, fecha: '18:00' }
    rerender(await PaginaSacola())
    expect(await within(resumo()).findByRole('button', { name: `Pagar com Pix · ${formatarPreco(5070)}` })).toBeEnabled()
    expect(within(resumo()).getByText('Pedidos até as 18h.')).toBeInTheDocument()
  })

  it('pagamento_indisponivel no Pix: fica na etapa 4 com a frase, e o botão volta', async () => {
    const { user } = await naEtapa4()
    m.pagarPix.mockResolvedValue({ ok: false, erro: 'pagamento_indisponivel' })
    await user.click(botaoDoResumo())
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.pagamento_indisponivel)).toHaveAttribute('aria-live', 'polite')
    expect(m.fechar).toHaveBeenCalledTimes(1)
    expect(m.pagarPix).toHaveBeenCalledWith({ numero: '123456' })
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('4. Pagamento')
    const botao = within(resumo()).getByRole('button', { name: `Pagar com Pix · ${formatarPreco(5070)}` })
    expect(botao).toBeEnabled()
    expect(botao).toHaveAttribute('aria-busy', 'false')

    // pagar de novo fecha de novo (o banco devolve o mesmo pedido) e segue
    m.pagarPix.mockResolvedValue({ ok: true, situacao: pixPendente() })
    await user.click(botao)
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido 123456 aguardando o Pix' })).toBeInTheDocument()
    expect(m.fechar).toHaveBeenCalledTimes(2)
  })

  it('"Copiar código" põe o copia e cola na área de transferência e diz "Código copiado." numa região viva', async () => {
    const { user } = await naEtapa4()
    await user.click(botaoDoResumo())
    const copiar = await screen.findByRole('button', { name: 'Copiar código' })
    const escrever = vi.spyOn(navigator.clipboard, 'writeText')
    await user.click(copiar)
    expect(escrever).toHaveBeenCalledWith(PIX.copiaECola)
    expect(await screen.findByText('Código copiado.')).toHaveAttribute('aria-live', 'polite')
  })

  it('sem a área de transferência, "Copiar código" seleciona o código para copiar à mão', async () => {
    const { user } = await naEtapa4()
    await user.click(botaoDoResumo())
    const copiar = await screen.findByRole('button', { name: 'Copiar código' })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    await user.click(copiar)
    const campo = screen.getByRole<HTMLInputElement>('textbox', { name: 'Pix copia e cola' })
    expect(campo).toHaveFocus()
    expect([campo.selectionStart, campo.selectionEnd]).toEqual([0, PIX.copiaECola.length])
    expect(screen.queryByText('Código copiado.')).toBeNull()
  })

  it('o código vencido diz "O código venceu." e oferece outro: "Gerar outro código" chama pagarComPix de novo', async () => {
    await naEtapa4()
    relogioFalso()
    const quaseVencendo = pixPendente({ expiraEm: new Date(Date.now() + 60_000).toISOString() })
    m.pagarPix.mockResolvedValue({ ok: true, situacao: quaseVencendo })
    // o servidor ainda da a tentativa como pendente, com o mesmo codigo: quem vence e o relogio daqui
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: quaseVencendo })
    fireEvent.click(botaoDoResumo())
    await andar(0)
    expect(screen.getByRole('img', { name: 'QR Code do Pix' })).toBeInTheDocument()
    // o primeiro codigo nao e "novo": nada dito na linha de cima
    expect(screen.queryByText('Código novo pronto.')).toBeNull()

    // o foco estava dentro do painel (no "Copiar codigo"): com o codigo vencido ele vai ao "Gerar outro codigo"
    act(() => screen.getByRole('button', { name: 'Copiar código' }).focus())
    await andar(61_000)
    const venceu = screen.getByText('O código venceu.')
    expect(venceu).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByRole('img', { name: 'QR Code do Pix' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Copiar código' })).toBeNull()
    const outro = screen.getByRole('button', { name: 'Gerar outro código' })
    expect(outro).toHaveFocus()

    const novo = pixPendente({ copiaECola: '00020101021226830014br.gov.bcb.pix-novo', expiraEm: new Date(Date.now() + 30 * 60_000).toISOString() })
    m.pagarPix.mockResolvedValue({ ok: true, situacao: novo })
    fireEvent.click(outro)
    await andar(0)
    expect(m.pagarPix).toHaveBeenCalledTimes(2)
    expect(m.pagarPix).toHaveBeenLastCalledWith({ numero: '123456' })
    expect(m.fechar).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('textbox', { name: 'Pix copia e cola' })).toHaveValue('00020101021226830014br.gov.bcb.pix-novo')
    expect(screen.queryByText('O código venceu.')).toBeNull()
    // o codigo novo e dito na regiao viva, e o foco vai ao "Copiar codigo"
    expect(screen.getByText('Código novo pronto.')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('button', { name: 'Copiar código' })).toHaveFocus()
  })

  it('o código que vence com o foco fora do painel não rouba o foco', async () => {
    await naEtapa4()
    relogioFalso()
    const quaseVencendo = pixPendente({ expiraEm: new Date(Date.now() + 60_000).toISOString() })
    m.pagarPix.mockResolvedValue({ ok: true, situacao: quaseVencendo })
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: quaseVencendo })
    fireEvent.click(botaoDoResumo())
    await andar(0)
    const voltar = screen.getByRole('link', { name: 'Voltar ao catálogo' })
    act(() => voltar.focus())
    await andar(61_000)
    expect(screen.getByRole('button', { name: 'Gerar outro código' })).not.toHaveFocus()
    expect(voltar).toHaveFocus()
  })

  it('a tentativa recusada (sem o QR) não diz que venceu: diz que não deu para gerar e oferece outro', async () => {
    const { user } = await naEtapa4()
    m.pagarPix.mockResolvedValue({
      ok: true,
      situacao: { ...pixPendente(), pagamento: { forma: 'pix', estado: 'recusado', recusa: null, pix: null, desafioUrl: null } },
    })
    await user.click(botaoDoResumo())
    expect(await screen.findByText('Não conseguimos gerar o código. Tente de novo.')).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByText('O código venceu.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Gerar outro código' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'QR Code do Pix' })).toBeNull()
  })

  it('a tentativa que acabou não mostra QR, mesmo se a resposta ainda trouxer um', async () => {
    const { user } = await naEtapa4()
    const morta = pixPendente()
    morta.pagamento = { ...morta.pagamento!, estado: 'expirado' }
    m.pagarPix.mockResolvedValue({ ok: true, situacao: morta })
    await user.click(botaoDoResumo())
    expect(await screen.findByText('O código venceu.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'QR Code do Pix' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Pix copia e cola' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Gerar outro código' })).toBeInTheDocument()
  })

  it('a tentativa trocada (cancelado) que a espera vê pede outro código, e a espera para', async () => {
    await pagoComPix()
    m.situacaoPedido.mockResolvedValue({
      ok: true,
      situacao: { ...pixPendente(), pagamento: { forma: 'pix', estado: 'cancelado', recusa: null, pix: null, desafioUrl: null } },
    })
    await andar(5000)
    expect(screen.getByText('O código venceu.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar outro código' })).toBeInTheDocument()
    await andar(60_000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(1)
  })

  it('a aba escondida não pergunta; ao voltar, pergunta uma vez; a rede que cai não muda o que a tela mostra', async () => {
    await pagoComPix()
    m.situacaoPedido.mockRejectedValue(new TypeError('Failed to fetch'))
    await andar(5000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido 123456 aguardando o Pix' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'QR Code do Pix' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/recusad/)

    await mudarAba('hidden')
    await andar(120_000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(1)

    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: pixPendente() })
    await mudarAba('visible')
    await andar(0)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(2)
    // e o ritmo volta: a proxima pergunta vem no tempo dela, nao de uma vez
    await andar(1000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(2)
  })

  it('muitas_tentativas na espera: a próxima pergunta só depois de 60 s, e a tela fica como estava', async () => {
    await pagoComPix()
    m.situacaoPedido.mockResolvedValue({ ok: false, erro: 'muitas_tentativas' })
    await andar(5000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(1)
    // no ritmo normal a proxima viria em 5 s; depois do limite, so em 60 s
    await andar(59_999)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido 123456 aguardando o Pix' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'QR Code do Pix' })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(MENSAGENS_DO_FECHAMENTO.muitas_tentativas)
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: pixPago() })
    await andar(1)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Pagamento aprovado.')).toBeInTheDocument()
  })

  it('a criação sem o QR diz "Gerando o código Pix." numa região viva, e o código que chega depois é dito nela', async () => {
    await naEtapa4()
    relogioFalso()
    const semQr = pixPendente()
    semQr.pagamento = { ...semQr.pagamento!, pix: null }
    m.pagarPix.mockResolvedValue({ ok: true, situacao: semQr })
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: semQr })
    fireEvent.click(botaoDoResumo())
    await andar(0)
    const linha = screen.getByText('Gerando o código Pix.')
    expect(linha).toHaveAttribute('aria-live', 'polite')
    // ainda gerando: nem "venceu" nem o botao de outro codigo
    expect(screen.queryByText('O código venceu.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gerar outro código' })).toBeNull()

    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: pixPendente() })
    await andar(5000)
    expect(screen.getByRole('img', { name: 'QR Code do Pix' })).toBeInTheDocument()
    // a mesma regiao viva, que ja estava na pagina, diz que o codigo chegou
    expect(linha).toBeInTheDocument()
    expect(linha).toHaveTextContent('Código pronto.')
    expect(screen.queryByText('Código novo pronto.')).toBeNull()
  })

  it('depois de 30 min sem mudança a espera para e diz isso', async () => {
    await pagoComPix()
    await andar(30 * 60_000 + 15_000)
    const chamadas = m.situacaoPedido.mock.calls.length
    expect(screen.getByText(/Paramos de conferir sozinhos/)).toBeInTheDocument()
    await andar(10 * 60_000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(chamadas)
  })

  it('o pedido cancelado durante a espera volta à etapa 4 com a frase, e a sacola fica', async () => {
    await pagoComPix()
    m.situacaoPedido.mockResolvedValue({
      ok: true,
      situacao: { numero: '123456', estado: 'cancelado', pagamento: { forma: 'pix', estado: 'cancelado', recusa: null, pix: null, desafioUrl: null } },
    })
    await andar(5000)
    await andar(100)
    expect(screen.getByText(MENSAGENS_DO_FECHAMENTO.pedido_invalido)).toHaveAttribute('aria-live', 'polite')
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('4. Pagamento')
    // o titulo do pedido feito saiu: o foco vai ao titulo da etapa
    expect(screen.getByRole('heading', { level: 2, name: '4. Pagamento' })).toHaveFocus()
    expect(guardada()).toEqual({ prestigio: 2 })
  })

  it('passa no axe no pedido feito, esperando o Pix e depois de pago', async () => {
    const container = await pagoComPix()
    expect(screen.getByRole('img', { name: 'QR Code do Pix' })).toBeInTheDocument()
    expect(await axeNoRelogioFalso(container)).toHaveNoViolations()
    expect(m.situacaoPedido).not.toHaveBeenCalled()

    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: pixPago() })
    await andar(5000)
    expect(screen.getByText('Pagamento aprovado.')).toBeInTheDocument()
    expect(await axeNoRelogioFalso(container)).toHaveNoViolations()
  })

  it('tentativas_esgotadas volta à etapa 2 sem a cotação, com a frase; a cotação nova fecha outro pedido', async () => {
    const { user } = await naEtapa4()
    m.pagarPix.mockResolvedValueOnce({ ok: false, erro: 'tentativas_esgotadas' })
    await user.click(botaoDoResumo())
    const frase = await screen.findByText(MENSAGENS_DO_FECHAMENTO.tentativas_esgotadas)
    expect(frase).toHaveAttribute('aria-live', 'polite')
    expect(MENSAGENS_DO_FECHAMENTO.tentativas_esgotadas).toBe(
      'Foram muitas tentativas de pagamento neste pedido. Calcule a entrega de novo para fazer outro pedido.',
    )
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('2. Entrega')
    expect(screen.getByLabelText('CEP')).toHaveValue('04567-000')
    expect(within(resumo()).getByText('informe o CEP')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: '2. Entrega' })).toHaveFocus())

    // calcular de novo pede outra cotacao (a velha, do pedido esgotado, nao volta), e o pedido sai com ela
    const nova = { ...cotacaoDe(), id: 'c2f1d0b3-5e4f-4a6b-9c7d-8e9f0a1b2c3d' }
    m.cotar.mockResolvedValue({ ok: true, cotacao: nova })
    await user.click(within(resumo()).getByRole('button', { name: 'Calcular e continuar' }))
    await user.click(await within(resumo()).findByRole('button', { name: 'Continuar para o pagamento' }))
    await user.click(await within(resumo()).findByRole('button', { name: `Pagar com Pix · ${formatarPreco(5070)}` }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido 123456 aguardando o Pix' })).toBeInTheDocument()
    expect(m.cotar).toHaveBeenCalledTimes(1)
    expect(m.fechar).toHaveBeenCalledTimes(2)
    expect(m.fechar.mock.calls[0][0]).toMatchObject({ cotacao: cotacaoDe().id })
    expect(m.fechar.mock.calls[1][0]).toMatchObject({ cotacao: nova.id })
  })

  it('tentativas_esgotadas ao gerar outro código também volta à etapa 2 sem a cotação', async () => {
    await naEtapa4()
    relogioFalso()
    const morta = pixPendente()
    morta.pagamento = { ...morta.pagamento!, estado: 'expirado', pix: null }
    m.pagarPix.mockResolvedValueOnce({ ok: true, situacao: morta })
    fireEvent.click(botaoDoResumo())
    await andar(0)
    m.pagarPix.mockResolvedValueOnce({ ok: false, erro: 'tentativas_esgotadas' })
    fireEvent.click(screen.getByRole('button', { name: 'Gerar outro código' }))
    await andar(0)
    await andar(50)
    expect(screen.getByText(MENSAGENS_DO_FECHAMENTO.tentativas_esgotadas)).toBeInTheDocument()
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('2. Entrega')
    expect(within(resumo()).getByText('informe o CEP')).toBeInTheDocument()
  })
})

describe('o pedido feito volta depois de recarregar', () => {
  const ana = { id: 'usuario-1', email: 'ana@exemplo.com', nome: 'Ana Souza', celular: '11987654321' }
  const marca = createHash('sha256').update('usuario-1').digest('hex').slice(0, 16)
  const NUMERO = 'AMO-7K2M9QXR'
  const endereco = { cep: '04567-000', numero: '10', complemento: '' }
  const resumo = () => screen.getByRole('complementary', { name: 'Resumo' })
  const etapaAtual = () => document.querySelector('.etapa[aria-current="step"]')
  const doPedido = (s: SituacaoDoPedido): SituacaoDoPedido => ({ ...s, numero: NUMERO })
  const tentativa = (forma: 'pix' | 'cartao', estado: string, pedido: SituacaoDoPedido['estado'] = 'aguardando_pagamento'): SituacaoDoPedido => ({
    numero: NUMERO,
    estado: pedido,
    pagamento: { forma, estado, recusa: null, pix: null, desafioUrl: null },
  })
  /** o progresso de quem viu o pedido feito e recarregou: a etapa 4, a cotacao e o pedido, com o que ele mostra */
  const comPedidoGuardado = (extra: Record<string, unknown> = {}, pedido: Record<string, unknown> = {}) =>
    sessionStorage.setItem(
      CHAVE_DO_PROGRESSO,
      JSON.stringify({
        etapa: 4,
        endereco,
        cotacao: cotacaoDe(),
        conta: marca,
        pedido: {
          numero: NUMERO,
          forma: 'pix',
          linhas: [{ slug: 'prestigio', nome: 'Prestígio', quantos: 2, total: 3780 }],
          entrega: cotacaoDe(),
          total: 5070,
          ...pedido,
        },
        ...extra,
      }),
    )
  const lido = () => JSON.parse(sessionStorage.getItem(CHAVE_DO_PROGRESSO) ?? 'null')

  beforeEach(() => {
    guardar({ prestigio: 2 })
    m.usuario = ana
  })

  it('ao mostrar o pedido feito, o progresso guarda o número e o que ele mostra: as linhas, a entrega e o total', async () => {
    sessionStorage.setItem(CHAVE_DO_PROGRESSO, JSON.stringify({ etapa: 3, endereco, cotacao: cotacaoDe(), conta: marca }))
    m.fechar.mockResolvedValue({ ok: true, pedido: { numero: NUMERO, totalCentavos: 5070 } })
    m.pagarPix.mockResolvedValue({ ok: true, situacao: doPedido(pixPendente()) })
    const user = userEvent.setup()
    render(await PaginaSacola())
    await user.click(await screen.findByRole('button', { name: 'Continuar para o pagamento' }))
    await user.click(await within(resumo()).findByRole('button', { name: /^Pagar com Pix/ }))
    expect(await screen.findByRole('heading', { level: 1, name: `Pedido ${NUMERO} aguardando o Pix` })).toBeInTheDocument()
    await waitFor(() => expect(lido()?.pedido).toBeDefined())
    const guardado = lido()
    expect(guardado.pedido).toEqual({
      numero: NUMERO,
      forma: 'pix',
      linhas: [{ slug: 'prestigio', nome: 'Prestígio', quantos: 2, total: 3780 }],
      entrega: guardado.cotacao,
      total: 5070,
    })
    expect(guardado.conta).toBe(marca)
    // so o que se mostra: nem o codigo Pix nem a URL de desafio vao para a aba
    expect(JSON.stringify(guardado)).not.toContain(PIX.copiaECola)
  })

  it('recarregar com o Pix pendente volta ao pedido feito, com o código e a espera, sem fechar outro pedido', async () => {
    comPedidoGuardado()
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: doPedido(pixPendente()) })
    render(await PaginaSacola())
    expect(await screen.findByRole('heading', { level: 1, name: `Pedido ${NUMERO} aguardando o Pix` })).toBeInTheDocument()
    expect(m.situacaoPedido).toHaveBeenCalledWith({ numero: NUMERO })
    expect(screen.getByRole('img', { name: 'QR Code do Pix' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Pix copia e cola' })).toHaveValue(PIX.copiaECola)
    expect(screen.getByText('Assim que o pagamento for confirmado, esta página avisa sozinha.')).toBeInTheDocument()
    expect(screen.getByText('2 × Prestígio')).toBeInTheDocument()
    expect(screen.getByText(/Entrega pelo Uber \(valor de exemplo\), Rua Gomes de Carvalho, 10/)).toBeInTheDocument()
    expect(screen.getByText('Total, no Pix').nextElementSibling).toHaveTextContent(formatarPreco(5070))
    // o foco vai ao H1 no efeito do titulo, que pode rodar logo depois do desenho
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus())
    expect(screen.queryByRole('list', { name: 'Etapas do pedido' })).toBeNull()
    expect(m.fechar).not.toHaveBeenCalled()
    expect(m.pagarPix).not.toHaveBeenCalled()
    expect(guardada()).toEqual({ prestigio: 2 })
    expect(lido().pedido.numero).toBe(NUMERO)
  })

  it('enquanto o servidor não responde, nenhuma etapa aparece (a página não convida a pagar de novo)', async () => {
    comPedidoGuardado()
    m.situacaoPedido.mockReturnValue(new Promise(() => {}))
    render(await PaginaSacola())
    expect(await screen.findByRole('heading', { level: 1, name: 'Sua sacola' })).toBeInTheDocument()
    await waitFor(() => expect(m.situacaoPedido).toHaveBeenCalledTimes(1))
    expect(document.querySelector('.fechamento--lendo')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('list', { name: 'Etapas do pedido' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Pagar/ })).toBeNull()
    // e o pedido segue guardado: outra recarga ainda o acha
    expect(lido().pedido.numero).toBe(NUMERO)
  })

  it('recarregar depois de pago: a sacola esvazia, o progresso sai e a página diz recebido', async () => {
    comPedidoGuardado()
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: tentativa('pix', 'aprovado', 'pago') })
    render(await PaginaSacola())
    expect(await screen.findByRole('heading', { level: 1, name: `Pedido ${NUMERO} recebido` })).toBeInTheDocument()
    expect(screen.getByText('Pagamento aprovado.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Acompanhar em Minha conta' })).toHaveAttribute('href', `/conta/pedidos/${NUMERO}`)
    expect(localStorage.getItem(CHAVE_SACOLA)).toBeNull()
    expect(sessionStorage.getItem(CHAVE_DO_PROGRESSO)).toBeNull()
  })

  it('recarregar com o cartão pendente: o pedido feito aguarda a confirmação do cartão, sem a janela do banco', async () => {
    comPedidoGuardado({}, { forma: 'cartao' })
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: tentativa('cartao', 'pendente') })
    render(await PaginaSacola())
    expect(await screen.findByRole('heading', { level: 1, name: `Pedido ${NUMERO} aguardando a confirmação do cartão` })).toBeInTheDocument()
    expect(screen.getByText('Assim que o pagamento for confirmado, esta página avisa sozinha.')).toBeInTheDocument()
    expect(screen.queryByTitle('Confirmação do banco')).toBeNull()
    expect(screen.getByText('Total, no cartão')).toBeInTheDocument()
    expect(guardada()).toEqual({ prestigio: 2 })
  })

  it('recarregar com o pedido cancelado esquece o pedido e segue da etapa 4, com a frase', async () => {
    comPedidoGuardado()
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: tentativa('pix', 'cancelado', 'cancelado') })
    render(await PaginaSacola())
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.pedido_invalido)).toHaveAttribute('aria-live', 'polite')
    expect(etapaAtual()).toHaveTextContent('4. Pagamento')
    expect(screen.queryByRole('heading', { level: 1, name: /^Pedido/ })).toBeNull()
    expect(within(resumo()).getByRole('button', { name: `Pagar com Pix · ${formatarPreco(5070)}` })).toBeEnabled()
    await waitFor(() => expect(lido()).not.toHaveProperty('pedido'))
    expect(lido()).toMatchObject({ etapa: 4, conta: marca })
    expect(guardada()).toEqual({ prestigio: 2 })
  })

  it('o pedido cancelado com a cotação vencida segue da etapa 2, com o endereço e a frase', async () => {
    comPedidoGuardado({ cotacao: cotacaoDe(-1000) })
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: tentativa('pix', 'cancelado', 'cancelado') })
    render(await PaginaSacola())
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.pedido_invalido)).toBeInTheDocument()
    expect(etapaAtual()).toHaveTextContent('2. Entrega')
    expect(screen.getByLabelText('CEP')).toHaveValue('04567-000')
    expect(within(resumo()).getByText('informe o CEP')).toBeInTheDocument()
    await waitFor(() => expect(lido()).not.toHaveProperty('pedido'))
  })

  it.each([
    ['a tentativa venceu', { ok: true, situacao: tentativa('pix', 'expirado') }],
    ['a tentativa foi recusada', { ok: true, situacao: tentativa('cartao', 'recusado') }],
    ['a sessão caiu', { ok: false, erro: 'sem_sessao' }],
    ['o pedido não é achado', { ok: false, erro: 'pedido_invalido' }],
    ['a resposta é de outro pedido', { ok: true, situacao: pixPendente() }],
  ])('recarregar quando %s esquece o pedido e segue da etapa 4, sem frase', async (_, resposta) => {
    comPedidoGuardado()
    m.situacaoPedido.mockResolvedValue(resposta)
    render(await PaginaSacola())
    await waitFor(() => expect(etapaAtual()).toHaveTextContent('4. Pagamento'))
    expect(screen.queryByRole('heading', { level: 1, name: /^Pedido/ })).toBeNull()
    expect(screen.queryByText(MENSAGENS_DO_FECHAMENTO.pedido_invalido)).toBeNull()
    await waitFor(() => expect(lido()).not.toHaveProperty('pedido'))
    expect(guardada()).toEqual({ prestigio: 2 })
  })

  it('recarregar com a rede fora: o pedido feito volta com a espera, que pergunta de novo e traz o código', async () => {
    comPedidoGuardado()
    relogioFalso()
    m.situacaoPedido.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(await PaginaSacola())
    await andar(0)
    expect(screen.getByRole('heading', { level: 1, name: `Pedido ${NUMERO} aguardando o Pix` })).toBeInTheDocument()
    expect(screen.getByText('Gerando o código Pix.')).toBeInTheDocument()
    expect(screen.getByText('Assim que o pagamento for confirmado, esta página avisa sozinha.')).toBeInTheDocument()
    expect(m.situacaoPedido).toHaveBeenCalledTimes(1)

    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: doPedido(pixPendente()) })
    await andar(5000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('img', { name: 'QR Code do Pix' })).toBeInTheDocument()
    expect(m.fechar).not.toHaveBeenCalled()
    expect(lido().pedido.numero).toBe(NUMERO)
  })

  it('o pedido guardado fora da forma (ou sem a conta) não volta: a página começa das etapas e não pergunta nada', async () => {
    comPedidoGuardado({}, { numero: "AMO-7K2M9QXR' or 1=1" })
    const { unmount } = render(await PaginaSacola())
    expect(await screen.findByRole('button', { name: 'Continuar para a entrega' })).toBeInTheDocument()
    unmount()
    comPedidoGuardado({ conta: null })
    render(await PaginaSacola())
    expect(await screen.findByRole('button', { name: 'Continuar para a entrega' })).toBeInTheDocument()
    expect(m.situacaoPedido).not.toHaveBeenCalled()
  })

  it('sem pedido guardado, recarregar na etapa 4 continua voltando à 3', async () => {
    sessionStorage.setItem(CHAVE_DO_PROGRESSO, JSON.stringify({ etapa: 4, endereco, cotacao: cotacaoDe(), conta: marca }))
    render(await PaginaSacola())
    expect(await screen.findByRole('link', { name: 'Trocar em Minha conta' })).toBeInTheDocument()
    expect(etapaAtual()).toHaveTextContent('3. Seus dados')
    expect(m.situacaoPedido).not.toHaveBeenCalled()
  })
})

describe('o cartão pelo Card Payment Brick', () => {
  const ana = { id: 'usuario-1', email: 'ana@exemplo.com', nome: 'Ana Souza', celular: '11987654321' }
  const marca = createHash('sha256').update('usuario-1').digest('hex').slice(0, 16)
  const CHAVE = 'APP_USR-6e6b1a43-7ce1-4a9a-a2b6-9c7a0e3a1f20'
  const SDK = 'script[src="https://sdk.mercadopago.com/js/v2"]'
  const resumo = () => screen.getByRole('complementary', { name: 'Resumo' })
  const botaoDoResumo = () => within(resumo()).getByRole('button')
  /**
   * O que o Brick devolve, na forma documentada pelo Mercado Pago: o getFormData
   * resolve com o formData plano (com o CPF que ele pediu), e os dados
   * adicionais vem de outra chamada, o getAdditionalData, feita depois dele.
   */
  const FORM_DATA = {
    token: 'f'.repeat(32),
    issuer_id: '24',
    payment_method_id: 'master',
    installments: 3,
    payer: { email: 'ana@exemplo.com', identification: { type: 'CPF', number: '12345678909' } },
  }
  const ADICIONAIS = { bin: '548083', lastFourDigits: '3311', cardholderName: 'APRO', paymentTypeId: 'credit_card' }
  const cartao = (estado: string, extra: { recusa?: string; desafioUrl?: string } = {}): SituacaoDoPedido => ({
    numero: '123456',
    estado: estado === 'aprovado' ? 'pago' : 'aguardando_pagamento',
    pagamento: { forma: 'cartao', estado, recusa: null, pix: null, desafioUrl: null, ...extra },
  })
  // o Brick falso: o que a pagina chama no window.MercadoPago
  const brick = { getFormData: vi.fn(), getAdditionalData: vi.fn(), unmount: vi.fn() }
  const criado = vi.fn()
  const construido = vi.fn()
  /** a criacao do proximo Brick, quando o teste quer escolher a hora em que ele fica pronto */
  let criacaoDoProximo: ((opcoes: { callbacks: { onReady: () => void } }) => Promise<typeof brick>) | null = null
  class MercadoPagoFalso {
    constructor(chave: string, opcoes: unknown) {
      construido(chave, opcoes)
    }
    bricks() {
      return {
        create: async (tipo: string, lugar: string, opcoes: { callbacks: { onReady: () => void } }) => {
          criado(tipo, lugar, opcoes)
          const criar = criacaoDoProximo
          criacaoDoProximo = null
          if (criar) return criar(opcoes)
          opcoes.callbacks.onReady()
          return brick
        },
      }
    }
  }
  const progresso = () =>
    sessionStorage.setItem(CHAVE_DO_PROGRESSO, JSON.stringify({ etapa: 3, endereco: { cep: '04567-000', numero: '10', complemento: '' }, cotacao: cotacaoDe(), conta: marca }))

  /** logada, na etapa 3 com a entrega cotada (R$ 37,80 + R$ 12,90) */
  const naEtapa3 = async () => {
    guardar({ prestigio: 2 })
    m.usuario = ana
    progresso()
    const user = userEvent.setup()
    const tela = render(await PaginaSacola())
    await screen.findByRole('button', { name: 'Continuar para o pagamento' })
    return { user, ...tela }
  }
  /** na etapa 4 com o cartao escolhido e o Brick pronto */
  const comCartao = async () => {
    const tela = await naEtapa3()
    await tela.user.click(screen.getByRole('button', { name: 'Continuar para o pagamento' }))
    await tela.user.click(await screen.findByRole('radio', { name: 'Cartão de crédito' }))
    await waitFor(() => expect(within(resumo()).getByRole('button', { name: `Pagar com cartão · ${formatarPreco(5070)}` })).toBeEnabled())
    return tela
  }

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', CHAVE)
    vi.stubGlobal('MercadoPago', MercadoPagoFalso)
    brick.getFormData.mockReset()
    brick.getFormData.mockResolvedValue(FORM_DATA)
    brick.getAdditionalData.mockReset()
    brick.getAdditionalData.mockResolvedValue(ADICIONAIS)
    brick.unmount.mockReset()
    criacaoDoProximo = null
    criado.mockReset()
    construido.mockReset()
    m.pagarCartao.mockResolvedValue({ ok: true, situacao: cartao('aprovado') })
    // o pedido feito rola ao topo: o jsdom nao rola
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.mocked(window.scrollTo).mockRestore()
  })

  // primeiro: o script do Brick ainda nao entrou na pagina deste arquivo
  it('sem a chave pública, só o Pix: nem a opção do cartão nem o script do Mercado Pago', async () => {
    vi.stubEnv('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', '')
    const { user } = await naEtapa3()
    expect(screen.getByText('Pix.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar para o pagamento' }))
    expect(await screen.findByRole('radio', { name: 'Pix' })).toBeChecked()
    expect(screen.queryByRole('radio', { name: 'Cartão de crédito' })).not.toBeInTheDocument()
    expect(document.querySelector(SDK)).toBeNull()
    expect(construido).not.toHaveBeenCalled()
  })

  it('com a chave, escolher o cartão monta o Brick com o valor em reais e sem o botão dele', async () => {
    const { user, container } = await naEtapa3()
    expect(screen.getByText('Pix ou cartão.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar para o pagamento' }))
    expect(await screen.findByRole('radio', { name: 'Pix' })).toBeChecked()
    expect(construido).not.toHaveBeenCalled()
    await user.click(screen.getByRole('radio', { name: 'Cartão de crédito' }))
    await waitFor(() => expect(criado).toHaveBeenCalledTimes(1))
    expect(construido).toHaveBeenCalledWith(CHAVE, { locale: 'pt-BR' })
    const [tipo, lugar, opcoes] = criado.mock.calls[0]
    expect(tipo).toBe('cardPayment')
    expect(document.getElementById(lugar)).toBeInTheDocument()
    expect(opcoes.initialization).toEqual({ amount: 50.7 })
    expect(opcoes.customization.visual.hidePaymentButton).toBe(true)
    expect(opcoes.customization.visual.style.customVariables).toMatchObject({ textPrimaryColor: '#2B1B16', inputBackgroundColor: '#FFFBF5' })
    expect(opcoes.customization.paymentMethods).toEqual({ maxInstallments: 12 })
    const script = document.querySelector(SDK) as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script!.nonce || script!.getAttribute('nonce')).toBe('nonce-de-teste')
    expect(await screen.findByRole('button', { name: `Pagar com cartão · ${formatarPreco(5070)}` })).toBeEnabled()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('o botão do resumo lê o Brick, fecha o pedido e paga com os campos certos; aprovado esvazia a sacola', async () => {
    const { user } = await comCartao()
    await user.click(botaoDoResumo())
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido 123456 recebido' })).toBeInTheDocument()
    expect(brick.getFormData).toHaveBeenCalledTimes(1)
    expect(brick.getAdditionalData).toHaveBeenCalledTimes(1)
    expect(m.fechar).toHaveBeenCalledTimes(1)
    // os dados adicionais so depois do getFormData, e os dois antes de fechar o pedido
    expect(brick.getFormData.mock.invocationCallOrder[0]).toBeLessThan(brick.getAdditionalData.mock.invocationCallOrder[0])
    expect(brick.getAdditionalData.mock.invocationCallOrder[0]).toBeLessThan(m.fechar.mock.invocationCallOrder[0])
    expect(m.fechar.mock.invocationCallOrder[0]).toBeLessThan(m.pagarCartao.mock.invocationCallOrder[0])
    expect(m.pagarCartao).toHaveBeenCalledWith({
      numero: '123456',
      token: 'f'.repeat(32),
      bandeira: 'master',
      tipo: 'credit_card',
      parcelas: 3,
      final: '3311',
      documento: { tipo: 'CPF', numero: '12345678909' },
    })
    expect(m.pagarPix).not.toHaveBeenCalled()
    expect(guardada()).toEqual({})
    expect(sessionStorage.getItem(CHAVE_DO_PROGRESSO)).toBeNull()
  })

  it('sem dados válidos no Brick nada sai; sem CPF o documento não vai', async () => {
    const { user } = await comCartao()
    brick.getFormData.mockResolvedValueOnce(undefined)
    await user.click(botaoDoResumo())
    await waitFor(() => expect(brick.getFormData).toHaveBeenCalledTimes(1))
    expect(m.fechar).not.toHaveBeenCalled()
    // sem o formData, os dados adicionais nem sao pedidos
    expect(brick.getAdditionalData).not.toHaveBeenCalled()
    // o Brick marca os campos dele; a linha viva da etapa diz o que fazer
    expect(await screen.findByText(MENSAGENS_DO_FECHAMENTO.cartao_ilegivel)).toBeInTheDocument()
    await waitFor(() => expect(botaoDoResumo()).toBeEnabled())
    brick.getFormData.mockResolvedValueOnce({ ...FORM_DATA, payer: { email: 'ana@exemplo.com' } })
    await user.click(botaoDoResumo())
    await waitFor(() => expect(m.pagarCartao).toHaveBeenCalledTimes(1))
    expect(m.pagarCartao.mock.calls[0][0]).not.toHaveProperty('documento')
  })

  it('sem token, sem tipo válido ou sem o final nos dados do Brick: nada sai, nada é cobrado, e a etapa diz para conferir o cartão', async () => {
    const { user } = await comCartao()
    const LANCA = Symbol('o getAdditionalData lanca')
    const casos: [typeof FORM_DATA | { token?: string }, unknown][] = [
      [{ ...FORM_DATA, token: undefined }, ADICIONAIS],
      [FORM_DATA, { ...ADICIONAIS, paymentTypeId: undefined }],
      [FORM_DATA, { ...ADICIONAIS, paymentTypeId: 'prepaid_card' }],
      [FORM_DATA, { ...ADICIONAIS, paymentTypeId: '' }],
      [FORM_DATA, { ...ADICIONAIS, lastFourDigits: undefined }],
      [FORM_DATA, { ...ADICIONAIS, lastFourDigits: '' }],
      [FORM_DATA, { ...ADICIONAIS, lastFourDigits: '33a1' }],
      [FORM_DATA, undefined],
      [FORM_DATA, LANCA],
    ]
    for (const [i, [formData, adicionais]] of casos.entries()) {
      brick.getFormData.mockResolvedValueOnce(formData)
      if (adicionais === LANCA) brick.getAdditionalData.mockRejectedValueOnce(new Error('sem os dados adicionais'))
      else brick.getAdditionalData.mockResolvedValueOnce(adicionais)
      await user.click(botaoDoResumo())
      await waitFor(() => expect(brick.getFormData).toHaveBeenCalledTimes(i + 1))
      await waitFor(() => expect(botaoDoResumo()).toBeEnabled())
      expect(screen.getByText(MENSAGENS_DO_FECHAMENTO.cartao_ilegivel)).toBeInTheDocument()
    }
    expect(m.fechar).not.toHaveBeenCalled()
    expect(m.pagarCartao).not.toHaveBeenCalled()
    // nunca "Confira os campos marcados.", que nao marca campo nenhum
    expect(screen.queryByText(MENSAGENS_DO_FECHAMENTO.campos_invalidos)).toBeNull()
  })

  it('o cartão de débito vai como debit_card, com o final que o Brick deu', async () => {
    const { user } = await comCartao()
    brick.getAdditionalData.mockResolvedValueOnce({ ...ADICIONAIS, lastFourDigits: '5682', paymentTypeId: 'debit_card' })
    await user.click(botaoDoResumo())
    await waitFor(() => expect(m.pagarCartao).toHaveBeenCalledTimes(1))
    expect(m.pagarCartao.mock.calls[0][0]).toMatchObject({ tipo: 'debit_card', final: '5682' })
  })

  it('recusado fica na etapa 4 com a frase da recusa, e o Brick continua pronto', async () => {
    const { user } = await comCartao()
    m.pagarCartao.mockResolvedValue({ ok: true, situacao: cartao('recusado', { recusa: 'insufficient_amount' }) })
    await user.click(botaoDoResumo())
    expect(await screen.findByText(mensagemDaRecusa('insufficient_amount'))).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Cartão de crédito' })).toBeChecked()
    expect(brick.unmount).not.toHaveBeenCalled()
    expect(botaoDoResumo()).toHaveTextContent(`Pagar com cartão · ${formatarPreco(5070)}`)
    expect(botaoDoResumo()).toBeEnabled()
    expect(guardada()).toEqual({ prestigio: 2 })
  })

  it('com o desafio do banco, o iframe aparece na etapa 4 e fica até o resultado; a espera decide', async () => {
    const url = 'https://www.mercadopago.com.br/3ds/desafio?id=abc'
    m.pagarCartao.mockResolvedValue({ ok: true, situacao: cartao('pendente', { desafioUrl: url }) })
    // como o servidor de verdade: a situacao lida do banco nunca traz a URL do desafio
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: cartao('pendente') })
    await comCartao()
    relogioFalso()
    fireEvent.click(botaoDoResumo())
    await andar(0)
    const janela = screen.getByTitle('Confirmação do banco')
    expect(janela.tagName).toBe('IFRAME')
    expect(janela).toHaveAttribute('src', url)
    expect(brick.unmount).toHaveBeenCalled()
    expect(botaoDoResumo()).toBeDisabled()

    // a espera pergunta e o banco ainda nao respondeu: a janela do banco fica, com a mesma URL
    await andar(5000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(1)
    expect(screen.getByTitle('Confirmação do banco')).toBe(janela)
    expect(janela).toHaveAttribute('src', url)
    expect(screen.queryByRole('heading', { level: 1, name: /^Pedido/ })).toBeNull()
    await andar(5 * 60_000)
    expect(m.situacaoPedido.mock.calls.length).toBeGreaterThan(10)
    expect(screen.getByTitle('Confirmação do banco')).toBe(janela)
    expect(botaoDoResumo()).toHaveTextContent('Confirmando com o banco')

    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: cartao('aprovado') })
    await andar(15_000)
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido 123456 recebido' })).toBeInTheDocument()
    expect(screen.queryByTitle('Confirmação do banco')).toBeNull()
    expect(guardada()).toEqual({})
  })

  it('o desafio do banco espera até 40 min, e a janela fica na tela quando a espera para', async () => {
    const url = 'https://www.mercadopago.com.br/3ds/desafio?id=abc'
    m.pagarCartao.mockResolvedValue({ ok: true, situacao: cartao('pendente', { desafioUrl: url }) })
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: cartao('pendente') })
    await comCartao()
    relogioFalso()
    fireEvent.click(botaoDoResumo())
    await andar(0)
    // passou dos 30 min do Pix: o desafio ainda pergunta
    await andar(35 * 60_000)
    const aos35 = m.situacaoPedido.mock.calls.length
    await andar(60_000)
    expect(m.situacaoPedido.mock.calls.length).toBeGreaterThan(aos35)
    expect(screen.queryByText(/Paramos de conferir sozinhos/)).toBeNull()
    // passou dos 40 min: para, diz isso, e a janela do banco continua
    await andar(5 * 60_000)
    expect(screen.getByText(/Paramos de conferir sozinhos/)).toBeInTheDocument()
    const parou = m.situacaoPedido.mock.calls.length
    await andar(10 * 60_000)
    expect(m.situacaoPedido).toHaveBeenCalledTimes(parou)
    expect(screen.getByTitle('Confirmação do banco')).toHaveAttribute('src', url)
  }, 15000)

  it('o pedido cancelado durante o desafio sai dele e volta à etapa 4 com a frase', async () => {
    const url = 'https://www.mercadopago.com.br/3ds/desafio?id=abc'
    m.pagarCartao.mockResolvedValue({ ok: true, situacao: cartao('pendente', { desafioUrl: url }) })
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: cartao('pendente') })
    await comCartao()
    relogioFalso()
    fireEvent.click(botaoDoResumo())
    await andar(0)
    await andar(5000)
    expect(screen.getByTitle('Confirmação do banco')).toBeInTheDocument()
    m.situacaoPedido.mockResolvedValue({
      ok: true,
      situacao: { numero: '123456', estado: 'cancelado', pagamento: { forma: 'cartao', estado: 'cancelado', recusa: null, pix: null, desafioUrl: null } },
    })
    await andar(5000)
    await andar(50)
    expect(screen.queryByTitle('Confirmação do banco')).toBeNull()
    expect(screen.getByText(MENSAGENS_DO_FECHAMENTO.pedido_invalido)).toBeInTheDocument()
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('4. Pagamento')
    expect(guardada()).toEqual({ prestigio: 2 })
  })

  it('pendente sem desafio: o pedido feito aguarda a confirmação do cartão, com a espera', async () => {
    m.pagarCartao.mockResolvedValue({ ok: true, situacao: cartao('pendente') })
    const { user } = await comCartao()
    await user.click(botaoDoResumo())
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido 123456 aguardando a confirmação do cartão' })).toBeInTheDocument()
    expect(screen.getByText('Assim que o pagamento for confirmado, esta página avisa sozinha.')).toBeInTheDocument()
    expect(screen.queryByText('Gerando o código Pix.')).not.toBeInTheDocument()
    expect(guardada()).toEqual({ prestigio: 2 })
  })

  it('a tentativa do cartão cancelada sem o desafio na tela não fala do banco: diz que o pagamento não respondeu', async () => {
    m.pagarCartao.mockResolvedValue({ ok: true, situacao: cartao('pendente') })
    await comCartao()
    relogioFalso()
    fireEvent.click(botaoDoResumo())
    await andar(0)
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido 123456 aguardando a confirmação do cartão' })).toBeInTheDocument()
    // a reconciliacao cancelou a tentativa (a criacao ficou sem resposta): o banco nunca foi chamado
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: cartao('cancelado') })
    await andar(5000)
    await andar(50)
    expect(screen.getByText(MENSAGENS_DO_FECHAMENTO.pagamento_indisponivel)).toBeInTheDocument()
    expect(screen.queryByText(mensagemDaRecusa('3ds_challenge_expired'))).toBeNull()
    expect(document.querySelector('.etapa[aria-current="step"]')).toHaveTextContent('4. Pagamento')
    expect(guardada()).toEqual({ prestigio: 2 })
  })

  it('o desafio na tela que vence diz que a confirmação do banco não foi concluída', async () => {
    const url = 'https://www.mercadopago.com.br/3ds/desafio?id=abc'
    m.pagarCartao.mockResolvedValue({ ok: true, situacao: cartao('pendente', { desafioUrl: url }) })
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: cartao('pendente') })
    await comCartao()
    relogioFalso()
    fireEvent.click(botaoDoResumo())
    await andar(0)
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: cartao('expirado') })
    await andar(5000)
    await andar(50)
    expect(screen.getByText(mensagemDaRecusa('3ds_challenge_expired'))).toBeInTheDocument()
    expect(screen.queryByTitle('Confirmação do banco')).toBeNull()
    expect(screen.queryByText(MENSAGENS_DO_FECHAMENTO.pagamento_indisponivel)).toBeNull()
  })

  it('o total que muda refaz o Brick, e o botão espera o Brick novo ficar pronto', async () => {
    await comCartao()
    let pronto: () => void = () => {}
    criacaoDoProximo = (opcoes) =>
      new Promise((resolve) => {
        pronto = () => {
          opcoes.callbacks.onReady()
          resolve(brick)
        }
      })
    // outra aba poe mais um pote: o total muda e o Brick e refeito com o valor novo
    act(() => {
      guardar({ prestigio: 3 })
      window.dispatchEvent(new StorageEvent('storage', { key: CHAVE_SACOLA }))
    })
    await waitFor(() => expect(criado).toHaveBeenCalledTimes(2))
    expect(criado.mock.calls[1][2].initialization).toEqual({ amount: 69.6 })
    const rotulo = `Pagar com cartão · ${formatarPreco(3 * 1890 + 1290)}`
    // o Brick velho saiu e o novo ainda nao esta pronto: o botao nao paga
    await waitFor(() => expect(within(resumo()).getByRole('button', { name: rotulo })).toBeDisabled())
    await act(async () => pronto())
    await waitFor(() => expect(within(resumo()).getByRole('button', { name: rotulo })).toBeEnabled())
  })

  it('trocar para o Pix desmonta o Brick', async () => {
    const { user } = await comCartao()
    await user.click(screen.getByRole('radio', { name: 'Pix' }))
    expect(brick.unmount).toHaveBeenCalledTimes(1)
    expect(botaoDoResumo()).toHaveTextContent(`Pagar com Pix · ${formatarPreco(5070)}`)
  })

  it('durante o pagamento as opções travam: não dá para trocar para o Pix no meio', async () => {
    const { user } = await comCartao()
    brick.getFormData.mockReturnValue(new Promise(() => {}))
    await user.click(botaoDoResumo())
    const pix = screen.getByRole('radio', { name: 'Pix' })
    expect(pix).toBeDisabled()
    expect(botaoDoResumo()).toBeDisabled()
    await user.click(pix)
    expect(screen.getByRole('radio', { name: 'Cartão de crédito' })).toBeChecked()
    expect(brick.unmount).not.toHaveBeenCalled()
  })

  it('o desafio que termina recusado volta à etapa 4 com a frase, e o Brick monta de novo', async () => {
    const url = 'https://www.mercadopago.com.br/3ds/desafio?id=abc'
    m.pagarCartao.mockResolvedValue({ ok: true, situacao: cartao('pendente', { desafioUrl: url }) })
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: cartao('pendente') })
    await comCartao()
    relogioFalso()
    fireEvent.click(botaoDoResumo())
    await andar(0)
    await andar(5000)
    expect(screen.getByTitle('Confirmação do banco')).toBeInTheDocument()
    m.situacaoPedido.mockResolvedValue({ ok: true, situacao: cartao('recusado', { recusa: 'cc_rejected_3ds_challenge' }) })
    await andar(5000)
    // o quadro da frase (requestAnimationFrame) e o tique em que o Brick novo e criado
    await andar(50)
    expect(screen.getByText(mensagemDaRecusa('cc_rejected_3ds_challenge'))).toBeInTheDocument()
    expect(screen.queryByTitle('Confirmação do banco')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Cartão de crédito' })).toBeChecked()
    expect(criado).toHaveBeenCalledTimes(2)
    expect(guardada()).toEqual({ prestigio: 2 })
  })

  // por ultimo: a falha do script fica lembrada no modulo pelo resto do arquivo
  it('o script que falha avisa em toda montagem do cartão, e o botão não paga', async () => {
    vi.stubGlobal('MercadoPago', undefined)
    const { user } = await naEtapa3()
    await user.click(screen.getByRole('button', { name: 'Continuar para o pagamento' }))
    await user.click(await screen.findByRole('radio', { name: 'Cartão de crédito' }))
    // o script falha; no arquivo inteiro o next/script ja o deu por carregado,
    // e o cartao ve o carregado sem o MercadoPago: falha do mesmo jeito
    act(() => {
      document.querySelector(SDK)!.dispatchEvent(new Event('error'))
    })
    const indisponivel = MENSAGENS_DO_FECHAMENTO.pagamento_indisponivel
    expect(await screen.findByText(indisponivel)).toBeInTheDocument()
    expect(botaoDoResumo()).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'Pix' }))
    expect(screen.queryByText(indisponivel)).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Cartão de crédito' }))
    expect(await screen.findByText(indisponivel)).toBeInTheDocument()
    expect(botaoDoResumo()).toBeDisabled()
    expect(construido).not.toHaveBeenCalled()
  })
})
