import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import type { PedidoCompleto, PedidoNaLista } from '@/lib/dados/pedidos'
import type { Endereco } from '@/lib/dados/enderecos'

/**
 * As telas de Minha conta: o que cada uma mostra, com a sessao e a camada de
 * dados trocadas. As acoes estao provadas em tests/conta-acoes.test.ts.
 */

const m = vi.hoisted(() => ({
  rotas: [] as string[],
  perfil: { nome: 'Mariana Costa', celular: '11987654321', aceitaMarketing: false } as { nome: string; celular: string; aceitaMarketing: boolean } | null,
  pedidos: [] as unknown[],
  pedido: null as unknown,
  lidos: [] as string[],
  enderecos: [] as unknown[],
  pode: { pode: true, motivo: null } as { pode: boolean; motivo: string | null },
  semSessao: false,
}))

// sem sessao, como o de verdade: entrar e voltar a rota, pela mesma conferencia do volta
vi.mock('@/lib/auth', async () => {
  const { voltaSegura } = await import('@/lib/auth/volta')
  return {
    exigirUsuario: async (rota: string) => {
      m.rotas.push(rota)
      if (m.semSessao) throw new Error(`REDIRECIONOU /entrar?volta=${encodeURIComponent(voltaSegura(rota))}`)
      return { id: 'usuario-1', email: 'mariana@exemplo.com.br', nome: 'Mariana Costa', celular: '11987654321' }
    },
  }
})
vi.mock('@/lib/dados/perfil', () => ({ lerPerfil: async () => m.perfil, podeExcluirConta: async () => m.pode }))
vi.mock('@/lib/dados/pedidos', () => ({
  lerPedidos: async () => m.pedidos,
  lerPedido: async (_: string, numero: string) => {
    m.lidos.push(numero)
    return m.pedido
  },
}))
vi.mock('@/lib/dados/enderecos', () => ({ lerEnderecos: async () => m.enderecos }))
vi.mock('@/app/conta/acoes', () => {
  const acao = async () => ({ ok: true })
  return {
    salvarPerfil: acao,
    definirMarketing: acao,
    salvarEndereco: acao,
    removerEndereco: acao,
    tornarPrincipal: acao,
    consultarCep: async () => null,
    trocarSenha: acao,
    trocarEmail: acao,
    cancelarPedido: acao,
  }
})
vi.mock('@/lib/auth/acoes', () => ({ sair: async () => undefined }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-nonce': 'nonce-de-teste' }) }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NAO_ENCONTRADO')
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECIONOU ${url}`)
  },
}))
vi.mock('@/components/conta/Turnstile', () => ({
  Turnstile: () => <input type="hidden" name="cf-turnstile-response" value="tok" readOnly />,
}))

const Inicio = await import('@/app/conta/page')
const Pedidos = await import('@/app/conta/pedidos/page')
const Pedido = await import('@/app/conta/pedidos/[numero]/page')
const Perfil = await import('@/app/conta/perfil/page')
const Enderecos = await import('@/app/conta/perfil/enderecos/page')
const EmailESenha = await import('@/app/conta/perfil/email-e-senha/page')

const NUMERO = 'AMO-7K2M9QXR'
const comNumero = (numero: string, busca: Record<string, string> = {}) => ({ params: Promise.resolve({ numero }), searchParams: Promise.resolve(busca) })
const comBusca = (busca: Record<string, string> = {}) => ({ searchParams: Promise.resolve(busca) })

const naLista = (numero: string, estado: PedidoNaLista['estado'], dia: string, total = 9280): PedidoNaLista => ({
  numero,
  estado,
  criadoEm: `2026-11-${dia}T17:02:00+00:00`,
  totalCentavos: total,
  potes: 4,
})

const completo = (extra: Partial<PedidoCompleto> = {}): PedidoCompleto => ({
  numero: NUMERO,
  estado: 'a_caminho',
  motivoDoCancelamento: null,
  datas: {
    criado: '2026-11-20T17:02:00+00:00',
    pago: '2026-11-20T17:03:00+00:00',
    emPreparo: '2026-11-20T17:20:00+00:00',
    aCaminho: '2026-11-20T18:10:00+00:00',
    entregue: null,
    cancelado: null,
  },
  subtotalCentavos: 7860,
  freteCentavos: 1420,
  totalCentavos: 9280,
  itens: [
    { produto: 'prestigio', nome: 'Prestígio', tipo: 'Bolo no pote', precoCentavos: 1890, quantos: 2, totalCentavos: 3780 },
    { produto: 'mousse-de-maracuja', nome: 'Mousse de maracujá', tipo: 'Bolo no pote', precoCentavos: 1890, quantos: 1, totalCentavos: 1890 },
  ],
  entrega: {
    cep: '03183002',
    logradouro: 'Rua Cuiabá',
    numero: '412',
    complemento: 'apto 31',
    bairro: 'Alto da Mooca',
    cidade: 'São Paulo',
    uf: 'SP',
    minutos: 25,
    rastreioUrl: 'https://m.uber.com/ul/?rastreio=1',
  },
  pagamento: { forma: 'pix', parcelas: null, cartaoBandeira: null, cartaoFinal: null },
  ...extra,
})

const endereco = (n: number, principal = false): Endereco => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  apelido: n === 1 ? 'Casa' : `Lugar ${n}`,
  cep: '03183002',
  logradouro: 'Rua Cuiabá',
  numero: String(400 + n),
  complemento: '',
  bairro: 'Alto da Mooca',
  cidade: 'São Paulo',
  uf: 'SP',
  principal,
})

const principal = () => screen.getByRole('main')

beforeEach(() => {
  m.rotas.length = 0
  m.lidos.length = 0
  m.perfil = { nome: 'Mariana Costa', celular: '11987654321', aceitaMarketing: false }
  m.pedidos = [naLista(NUMERO, 'a_caminho', '20'), naLista('AMO-3F8D2WLA', 'entregue', '08', 12840)]
  m.pedido = completo()
  m.enderecos = [endereco(1, true), endereco(2)]
  m.pode = { pode: true, motivo: null }
  m.semSessao = false
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '1x00000000000000000000AA')
})

describe.each([
  ['/conta', () => Inicio.default(), Inicio.metadata],
  ['/conta/pedidos', () => Pedidos.default(), Pedidos.metadata],
  [`/conta/pedidos/${NUMERO}`, () => Pedido.default(comNumero(NUMERO)), Pedido.metadata],
  ['/conta/perfil', () => Perfil.default(), Perfil.metadata],
  ['/conta/perfil/enderecos', () => Enderecos.default(), Enderecos.metadata],
  ['/conta/perfil/email-e-senha', () => EmailESenha.default(comBusca()), EmailESenha.metadata],
])('%s', (rota, montar, metadata) => {
  it('exige a sessao com a propria rota, fora dos buscadores', async () => {
    render(await montar())
    expect(m.rotas[0]).toBe(rota)
    expect(metadata?.robots).toEqual({ index: false })
  })

  it('um h1, sem pular nivel, campos com rotulo, axe limpo', async () => {
    const { container } = render(await montar())
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const niveis = [...container.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]))
    for (let i = 1; i < niveis.length; i++) expect(niveis[i] - niveis[i - 1]).toBeLessThanOrEqual(1)
    for (const campo of principal().querySelectorAll('input:not([type=hidden]), select')) {
      expect((campo as HTMLInputElement).labels?.length).toBeGreaterThan(0)
    }
    expect(principal().textContent).not.toMatch(/\.\.\.|…/)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('o sumario leva a cada parte da conta e marca a atual', async () => {
    render(await montar())
    const sumario = screen.getByRole('navigation', { name: 'Sua conta' })
    const links = within(sumario).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/conta',
      '/conta/pedidos',
      '/conta/perfil',
      '/conta/perfil/enderecos',
      '/conta/perfil/email-e-senha',
    ])
    const atual = links.filter((a) => a.getAttribute('aria-current') === 'page')
    expect(atual).toHaveLength(1)
    const esperado = rota.startsWith('/conta/pedidos') ? '/conta/pedidos' : rota
    expect(atual[0]).toHaveAttribute('href', esperado)
    expect(within(sumario).getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })
})

describe('/conta', () => {
  it('o pedido em andamento abre a conta: numero, estado, fio das etapas, rastreio e total', async () => {
    render(await Inicio.default())
    const main = principal()
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent(NUMERO)
    expect(main).toHaveTextContent('a caminho')
    expect(main).toHaveTextContent('R$ 92,80')
    const rastreio = within(main).getByRole('link', { name: 'Acompanhar no Uber' })
    expect(rastreio).toHaveAttribute('href', 'https://m.uber.com/ul/?rastreio=1')
    expect(rastreio).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(main).getByRole('list', { name: 'Etapas do pedido' })).toHaveTextContent(/Feito.*Pago.*Em preparo.*A caminho.*Entregue/)
    expect(m.lidos).toEqual([NUMERO])
  })

  it('com pedido em preparo: o estado e o total', async () => {
    m.pedidos = [naLista(NUMERO, 'em_preparo', '20')]
    m.pedido = completo({ estado: 'em_preparo', datas: { ...completo().datas, aCaminho: null } })
    render(await Inicio.default())
    expect(principal()).toHaveTextContent('Em preparo')
    expect(principal()).toHaveTextContent('R$ 92,80')
    expect(within(principal()).queryByRole('link', { name: 'Acompanhar no Uber' })).toBeNull()
  })

  it('os pedidos anteriores ficam embaixo, com o caminho para todos', async () => {
    render(await Inicio.default())
    expect(within(principal()).getByRole('link', { name: /AMO-3F8D2WLA/ })).toHaveAttribute('href', '/conta/pedidos/AMO-3F8D2WLA')
    expect(within(principal()).getByRole('link', { name: 'Ver todos os pedidos' })).toHaveAttribute('href', '/conta/pedidos')
  })

  it('dois pedidos em andamento: abre o que esta mais adiantado, e os outros ficam em "Outros pedidos"', async () => {
    m.pedidos = [naLista('AMO-NV22AGRD', 'aguardando_pagamento', '20'), naLista(NUMERO, 'a_caminho', '20'), naLista('AMO-3F8D2WLA', 'entregue', '08'), naLista('AMO-9QTR4ZEN', 'entregue', '02')]
    render(await Inicio.default())
    expect(m.lidos).toEqual([NUMERO])
    expect(within(principal()).getByRole('heading', { level: 2 })).toHaveTextContent('Outros pedidos')
    const outros = within(principal()).getAllByRole('link', { name: /AMO-/ })
    expect(outros.map((a) => a.getAttribute('href'))).toEqual(['/conta/pedidos/AMO-NV22AGRD', '/conta/pedidos/AMO-3F8D2WLA'])
  })

  it('o numero do pedido no titulo nao quebra no hifen', async () => {
    render(await Inicio.default())
    expect(within(principal()).getByRole('heading', { level: 1 }).querySelector('.painel__numero')).toHaveTextContent(NUMERO)
  })

  it('sem pedido nenhum: o convite ao catalogo, sem valor', async () => {
    m.pedidos = []
    render(await Inicio.default())
    expect(within(principal()).getByRole('link', { name: /catálogo/i })).toHaveAttribute('href', '/catalogo')
    expect(principal().textContent).not.toMatch(/R\$/)
    expect(m.lidos).toEqual([])
  })

  it('so pedidos entregues: o convite e os anteriores, sem ler pedido nenhum', async () => {
    m.pedidos = [naLista('AMO-3F8D2WLA', 'entregue', '08', 12840)]
    render(await Inicio.default())
    expect(within(principal()).getByRole('link', { name: /catálogo/i })).toHaveAttribute('href', '/catalogo')
    expect(within(principal()).getByRole('link', { name: /AMO-3F8D2WLA/ })).toBeInTheDocument()
    expect(m.lidos).toEqual([])
  })

  it('saudacao com o primeiro nome do perfil', async () => {
    render(await Inicio.default())
    expect(screen.getByRole('navigation', { name: 'Sua conta' }).closest('aside')).toHaveTextContent('Olá, Mariana')
  })
})

describe('/conta/pedidos', () => {
  it('um link por pedido, na ordem recebida', async () => {
    render(await Pedidos.default())
    const links = within(principal()).getAllByRole('link', { name: /AMO-/ })
    expect(links.map((a) => a.getAttribute('href'))).toEqual([`/conta/pedidos/${NUMERO}`, '/conta/pedidos/AMO-3F8D2WLA'])
    expect(principal()).toHaveTextContent('R$ 128,40')
  })

  it('vazio: a frase e o catalogo', async () => {
    m.pedidos = []
    render(await Pedidos.default())
    expect(principal()).toHaveTextContent('Você ainda não fez nenhum pedido')
    expect(within(principal()).getByRole('link', { name: /catálogo/i })).toHaveAttribute('href', '/catalogo')
  })
})

describe('/conta/pedidos/[numero]', () => {
  it('numero fora do formato: 404 sem ler o banco', async () => {
    await expect(Pedido.default(comNumero("AMO-7K2M9QXR' or 1=1"))).rejects.toThrow('NAO_ENCONTRADO')
    expect(m.lidos).toEqual([])
  })

  it('pedido que nao existe (ou nao e dela): 404', async () => {
    m.pedido = null
    await expect(Pedido.default(comNumero(NUMERO))).rejects.toThrow('NAO_ENCONTRADO')
  })

  it('aguardando pagamento: da para cancelar', async () => {
    m.pedido = completo({ estado: 'aguardando_pagamento', pagamento: null, datas: { ...completo().datas, pago: null, emPreparo: null, aCaminho: null } })
    render(await Pedido.default(comNumero(NUMERO)))
    expect(within(principal()).getByRole('button', { name: 'Cancelar pedido' })).toBeInTheDocument()
  })

  it('entregue: sem cancelar e sem rastreio', async () => {
    m.pedido = completo({ estado: 'entregue', datas: { ...completo().datas, entregue: '2026-11-20T18:31:00+00:00' } })
    render(await Pedido.default(comNumero(NUMERO)))
    expect(within(principal()).queryByRole('button', { name: 'Cancelar pedido' })).toBeNull()
    expect(within(principal()).queryByRole('link', { name: 'Acompanhar no Uber' })).toBeNull()
  })

  it('a caminho, com rastreio: o link sai do site sem levar a pagina junto', async () => {
    render(await Pedido.default(comNumero(NUMERO)))
    const rastreio = within(principal()).getByRole('link', { name: 'Acompanhar no Uber' })
    expect(rastreio).toHaveAttribute('href', 'https://m.uber.com/ul/?rastreio=1')
    expect(rastreio).toHaveAttribute('rel', 'noopener noreferrer')
    expect(principal()).toHaveTextContent('Rua Cuiabá, 412, apto 31')
    expect(principal()).toHaveTextContent('Pix')
    expect(principal()).toHaveTextContent('R$ 78,60')
    expect(principal()).toHaveTextContent('R$ 14,20')
  })

  it('cancelado: o motivo', async () => {
    m.pedido = completo({
      estado: 'cancelado',
      motivoDoCancelamento: 'cliente',
      pagamento: null,
      datas: { ...completo().datas, pago: null, emPreparo: null, aCaminho: null, cancelado: '2026-11-20T17:10:00+00:00' },
    })
    render(await Pedido.default(comNumero(NUMERO)))
    expect(principal()).toHaveTextContent('Cancelado por você.')
    expect(within(principal()).queryByRole('button', { name: 'Cancelar pedido' })).toBeNull()
  })

  it('depois de cancelar: a pagina diz que o pedido foi cancelado', async () => {
    m.pedido = completo({
      estado: 'cancelado',
      motivoDoCancelamento: 'cliente',
      pagamento: null,
      datas: { ...completo().datas, pago: null, emPreparo: null, aCaminho: null, cancelado: '2026-11-20T17:10:00+00:00' },
    })
    render(await Pedido.default(comNumero(NUMERO, { cancelado: '1' })))
    expect(within(principal()).getByRole('status')).toHaveTextContent('Pedido cancelado.')
  })

  it('o aviso de cancelado nao aparece num pedido que nao foi cancelado', async () => {
    render(await Pedido.default(comNumero(NUMERO, { cancelado: '1' })))
    expect(within(principal()).queryByRole('status')).toBeNull()
  })

  it('o CEP da entrega fica numa linha so, a dele', async () => {
    render(await Pedido.default(comNumero(NUMERO)))
    expect(within(principal()).getByText('CEP 03183-002')).toBeInTheDocument()
  })

  it('anonimizado: mostra bairro, cidade e UF, e a pagina nao quebra', async () => {
    m.pedido = completo({
      estado: 'entregue',
      entrega: { ...completo().entrega, cep: '03183', logradouro: null, numero: null, complemento: null, rastreioUrl: null },
    })
    render(await Pedido.default(comNumero(NUMERO)))
    expect(principal()).toHaveTextContent('Alto da Mooca, São Paulo, SP')
  })
})

describe('/conta/perfil', () => {
  it('nome e celular ja preenchidos; o e-mail leva a troca', async () => {
    render(await Perfil.default())
    expect(screen.getByLabelText('Nome')).toHaveValue('Mariana Costa')
    expect(screen.getByLabelText('Celular')).toHaveValue('(11) 98765-4321')
    expect(principal()).toHaveTextContent('mariana@exemplo.com.br')
    expect(within(principal()).getByRole('link', { name: /trocar/i })).toHaveAttribute('href', '/conta/perfil/email-e-senha')
    expect(screen.getByRole('checkbox', { name: /novidades/i })).not.toBeChecked()
  })

  it('pode excluir: o link para a exclusao', async () => {
    render(await Perfil.default())
    expect(within(principal()).getByRole('link', { name: 'Excluir conta' })).toHaveAttribute('href', '/conta/excluir')
  })

  it('nao pode excluir: o motivo, sem o link', async () => {
    m.pode = { pode: false, motivo: 'pedido_em_aberto' }
    render(await Perfil.default())
    expect(within(principal()).queryByRole('link', { name: 'Excluir conta' })).toBeNull()
    expect(principal()).toHaveTextContent('pedido em andamento')
  })

  it('cada formulario responde num lugar que o leitor de tela anuncia', async () => {
    const { container } = render(await Perfil.default())
    expect(container.querySelectorAll('main form [aria-live="polite"]').length).toBe(container.querySelectorAll('main form').length)
  })
})

describe('/conta/perfil/enderecos', () => {
  it('os enderecos, o principal primeiro e marcado', async () => {
    render(await Enderecos.default())
    const itens = within(principal()).getAllByRole('listitem')
    expect(itens[0]).toHaveTextContent('Casa')
    expect(itens[0]).toHaveTextContent('Principal')
    expect(within(itens[1]).getByRole('button', { name: /tornar principal/i })).toBeInTheDocument()
    expect(within(itens[1]).getByRole('button', { name: /remover/i })).toBeInTheDocument()
    expect(within(principal()).getByRole('button', { name: 'Adicionar endereço' })).toBeInTheDocument()
  })

  it('cinco enderecos escondem "Adicionar endereco"', async () => {
    m.enderecos = [1, 2, 3, 4, 5].map((n) => endereco(n, n === 1))
    render(await Enderecos.default())
    expect(within(principal()).queryByRole('button', { name: 'Adicionar endereço' })).toBeNull()
  })

  it('sem endereco: a frase e o formulario', async () => {
    m.enderecos = []
    render(await Enderecos.default())
    expect(principal()).toHaveTextContent('Nenhum endereço guardado')
  })
})

describe('/conta/perfil/email-e-senha', () => {
  it.each([
    ['email-trocado', 'E-mail trocado.'],
    ['falta-o-outro-email', 'Falta confirmar no outro e-mail'],
    ['link-invalido', 'Esse link venceu ou já foi usado'],
  ])('o aviso %s, que vem do link do e-mail', async (aviso, texto) => {
    render(await EmailESenha.default(comBusca({ aviso })))
    expect(within(principal()).getByRole('status')).toHaveTextContent(texto)
  })

  it('aviso desconhecido na URL nao mostra nada', async () => {
    render(await EmailESenha.default(comBusca({ aviso: '<script>' })))
    expect(within(principal()).queryByRole('status')).toBeNull()
  })

  // o link aberto num navegador sem sessao (o celular, o app de e-mail): o
  // aviso vai junto para entrar e volta com ela depois do login
  it.each(['email-trocado', 'falta-o-outro-email', 'link-invalido'])('sem sessao, o aviso %s vai no volta para entrar', async (aviso) => {
    m.semSessao = true
    await expect(EmailESenha.default(comBusca({ aviso }))).rejects.toThrow(
      `REDIRECIONOU /entrar?volta=${encodeURIComponent(`/conta/perfil/email-e-senha?aviso=${aviso}`)}`,
    )
  })

  it('sem sessao, aviso desconhecido nao entra no volta', async () => {
    m.semSessao = true
    await expect(EmailESenha.default(comBusca({ aviso: '//mal.com' }))).rejects.toThrow(/^REDIRECIONOU \/entrar\?volta=%2Fconta%2Fperfil%2Femail-e-senha$/)
  })

  it('as duas trocas, com o e-mail atual a vista', async () => {
    render(await EmailESenha.default(comBusca()))
    expect(principal()).toHaveTextContent('mariana@exemplo.com.br')
    expect(screen.getByLabelText('E-mail novo')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha atual')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha nova')).toBeInTheDocument()
    expect(within(principal()).getByRole('button', { name: 'Trocar o e-mail' })).toBeInTheDocument()
    expect(within(principal()).getByRole('button', { name: 'Trocar a senha' })).toBeInTheDocument()
  })
})
