// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HOSTIS } from './fixtures/hostis'
import { ErroDeRegra } from '@/lib/dados/erros'

/** Pagar com Pix e com cartao no servidor, com tudo abaixo das acoes falso. */

const m = vi.hoisted(() => ({
  obterUsuario: vi.fn(),
  consumirLimite: vi.fn(),
  lerPedidoParaPagar: vi.fn(),
  lerItensParaPagar: vi.fn(),
  iniciarPagamento: vi.fn(),
  lerUltimaTentativa: vi.fn(),
  aplicarPagamento: vi.fn(),
  tentativasACancelarNoMp: vi.fn(),
  tentativasACancelarDaCliente: vi.fn(),
  cancelarNoMp: vi.fn(),
  aplicarRespostaDoMp: vi.fn(),
  guardarIdsDoMp: vi.fn(),
  criarPedidoPix: vi.fn(),
  criarPedidoCartao: vi.fn(),
  criarPedido: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ obterUsuario: m.obterUsuario }))
vi.mock('@/lib/dados/cep', () => ({ buscarCep: vi.fn() }))
vi.mock('@/lib/dados/limites', () => ({ consumirLimite: m.consumirLimite }))
vi.mock('@/lib/dados/fechamento', () => ({
  criarPedido: m.criarPedido,
  lerPedidoParaPagar: m.lerPedidoParaPagar,
  lerItensParaPagar: m.lerItensParaPagar,
  iniciarPagamento: m.iniciarPagamento,
  lerUltimaTentativa: m.lerUltimaTentativa,
}))
vi.mock('@/lib/dados/pagamentos', () => ({
  aplicarPagamento: m.aplicarPagamento,
  tentativasACancelarNoMp: m.tentativasACancelarNoMp,
  tentativasACancelarDaCliente: m.tentativasACancelarDaCliente,
}))
vi.mock('@/lib/mercadopago/sincronizar', () => ({
  aplicarRespostaDoMp: m.aplicarRespostaDoMp,
  cancelarNoMp: m.cancelarNoMp,
  guardarIdsDoMp: m.guardarIdsDoMp,
}))
vi.mock('@/lib/mercadopago/cliente', async (original) => ({
  ...(await original<typeof import('@/lib/mercadopago/cliente')>()),
  criarPedidoPix: m.criarPedidoPix,
  criarPedidoCartao: m.criarPedidoCartao,
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

import { fecharPedido, pagarComCartao, pagarComPix } from '@/app/sacola/acoes'
import { mensagemDaRecusa, MENSAGENS_DO_FECHAMENTO } from '@/lib/fechamento/tipos'

const NUMERO = 'AMO-ABCDEFGH'
const TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'
const CPF = '123.456.789-09'
const cartao = { numero: NUMERO, token: TOKEN, bandeira: 'visa', tipo: 'credit_card', parcelas: 1, final: '4242' }
const pedidoMp = (pagamento: object | null = {}) => ({
  id: 'ORD1',
  status: 'processed',
  detalhe: '',
  referencia: 'tent-1',
  valorCentavos: 9280,
  pagamento: pagamento && { id: 'P1', status: 'processed', detalhe: '', bandeira: 'visa', parcelas: 1, pix: null, desafioUrl: null, ...pagamento },
})
const pix = { copiaECola: '000201', qrBase64: 'QUJD', expiraEm: '2026-11-21T12:00:00.000Z' }

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset()
  m.obterUsuario.mockResolvedValue({ id: 'u1', email: 'ana@exemplo.com' })
  m.consumirLimite.mockResolvedValue(true)
  m.lerPedidoParaPagar.mockResolvedValue({ id: 'ped-1', totalCentavos: 9280, estado: 'aguardando_pagamento' })
  m.iniciarPagamento.mockResolvedValue('tent-1')
  m.lerItensParaPagar.mockResolvedValue({ itens: [], freteCentavos: 0 })
  m.tentativasACancelarNoMp.mockResolvedValue([])
  m.tentativasACancelarDaCliente.mockResolvedValue([])
  m.cancelarNoMp.mockResolvedValue(null)
  m.guardarIdsDoMp.mockResolvedValue(undefined)
  m.criarPedidoPix.mockResolvedValue({ ok: true, pedido: pedidoMp({ status: 'action_required', pix }) })
  m.criarPedidoCartao.mockResolvedValue({ ok: true, pedido: pedidoMp() })
  m.aplicarRespostaDoMp.mockResolvedValue({ tentativa: 'pendente', pedido: 'aguardando_pagamento' })
  m.aplicarPagamento.mockResolvedValue({ tentativa: 'cancelado', pedido: 'aguardando_pagamento' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const nada = () => {
  expect(m.lerPedidoParaPagar).not.toHaveBeenCalled()
  expect(m.iniciarPagamento).not.toHaveBeenCalled()
  expect(m.criarPedidoPix).not.toHaveBeenCalled()
  expect(m.criarPedidoCartao).not.toHaveBeenCalled()
}

describe('a ordem do caminho', () => {
  it('deslogada: sem_sessao, nada chamado', async () => {
    m.obterUsuario.mockResolvedValue(null)
    expect(await pagarComPix({ numero: NUMERO })).toEqual({ ok: false, erro: 'sem_sessao' })
    expect(await pagarComCartao(cartao)).toEqual({ ok: false, erro: 'sem_sessao' })
    expect(m.consumirLimite).not.toHaveBeenCalled()
    nada()
  })
  it('campo errado nao gasta limite', async () => {
    expect(await pagarComPix({ numero: 'x' })).toEqual({ ok: false, erro: 'campos_invalidos' })
    expect(m.consumirLimite).not.toHaveBeenCalled()
  })
  it('limite estourado nao le o pedido; chave e janela', async () => {
    m.consumirLimite.mockResolvedValue(false)
    expect(await pagarComPix({ numero: NUMERO })).toEqual({ ok: false, erro: 'muitas_tentativas' })
    expect(m.consumirLimite).toHaveBeenCalledWith('pagar:u1', 20, 3600)
    nada()
  })
  it('pedido que nao existe ou ja pago: pedido_invalido sem iniciar', async () => {
    m.lerPedidoParaPagar.mockResolvedValue(null)
    expect(await pagarComPix({ numero: NUMERO })).toEqual({ ok: false, erro: 'pedido_invalido' })
    m.lerPedidoParaPagar.mockResolvedValue({ id: 'p', totalCentavos: 1, estado: 'pago' })
    expect(await pagarComCartao(cartao)).toEqual({ ok: false, erro: 'pedido_invalido' })
    expect(m.iniciarPagamento).not.toHaveBeenCalled()
  })
})

describe('campos', () => {
  const recusa = async (e: unknown) => {
    expect(await pagarComCartao(e)).toEqual({ ok: false, erro: 'campos_invalidos' })
    expect(m.consumirLimite).not.toHaveBeenCalled()
  }
  it('entrada que nao e objeto', async () => {
    for (const x of [null, undefined, 'x', 3, []]) {
      await recusa(x)
      expect(await pagarComPix(x)).toEqual({ ok: false, erro: 'campos_invalidos' })
    }
  })
  it('hostis em cada campo', async () => {
    for (const h of HOSTIS) {
      for (const k of ['numero', 'token', 'bandeira', 'tipo', 'final']) await recusa({ ...cartao, [k]: h })
      await recusa({ ...cartao, documento: { tipo: 'CPF', numero: h } })
      await recusa({ ...cartao, documento: { tipo: h, numero: '12345678909' } })
      await recusa({ ...cartao, parcelas: h })
      expect(await pagarComPix({ numero: h })).toEqual({ ok: false, erro: 'campos_invalidos' })
    }
  })
  it('bordas', async () => {
    for (const parcelas of [0, 13, 1.5, '1', NaN, null]) await recusa({ ...cartao, parcelas })
    for (const final of ['12a4', '123', '12345', 1234]) await recusa({ ...cartao, final })
    await recusa({ ...cartao, token: 'curto' })
    await recusa({ ...cartao, token: 'a'.repeat(101) })
    await recusa({ ...cartao, bandeira: 'Visa' })
    await recusa({ ...cartao, tipo: 'prepaid' })
    await recusa({ ...cartao, documento: { tipo: 'CPF', numero: '1234567890' } })
    await recusa({ ...cartao, documento: { tipo: 'CNPJ', numero: '12345678909' } })
    await recusa({ ...cartao, documento: { tipo: 'CPF', numero: '12345678909', x: 1 } })
  })
  it('chave a mais e recusada, no Pix e no cartao', async () => {
    await recusa({ ...cartao, total: 1 })
    await recusa({ ...cartao, email: 'x@y.com' })
    expect(await pagarComPix({ numero: NUMERO, total: 1 })).toEqual({ ok: false, erro: 'campos_invalidos' })
    expect(await pagarComPix({ numero: NUMERO, email: 'x@y.com' })).toEqual({ ok: false, erro: 'campos_invalidos' })
  })
  it('limites validos passam', async () => {
    for (const parcelas of [1, 12]) expect((await pagarComCartao({ ...cartao, parcelas })).ok).toBe(true)
    expect((await pagarComCartao({ ...cartao, tipo: 'debit_card', token: 'a'.repeat(20) })).ok).toBe(true)
  })
})

describe('iniciarPagamento', () => {
  const tradu = async (message: string) => {
    m.iniciarPagamento.mockRejectedValue(new ErroDeRegra(message))
    return pagarComPix({ numero: NUMERO })
  }
  it('traduz os codigos', async () => {
    expect(await tradu('pedido_invalido')).toEqual({ ok: false, erro: 'pedido_invalido' })
    expect(await tradu('muitas_tentativas')).toEqual({ ok: false, erro: 'tentativas_esgotadas' })
    expect(await tradu('sem_sessao')).toEqual({ ok: false, erro: 'sem_sessao' })
    expect(await tradu('faixa_indisponivel')).toEqual({ ok: false, erro: 'faixa_indisponivel' })
    expect(await tradu('qualquer')).toEqual({ ok: false, erro: 'tente_de_novo' })
    expect(await tradu('toString')).toEqual({ ok: false, erro: 'tente_de_novo' })
    expect(m.criarPedidoPix).not.toHaveBeenCalled()
  })
  it('erro que nao e de regra: tente_de_novo', async () => {
    m.iniciarPagamento.mockRejectedValue(new Error('boom'))
    expect(await pagarComPix({ numero: NUMERO })).toEqual({ ok: false, erro: 'tente_de_novo' })
  })
})

describe('fecharPedido: codigo herdado', () => {
  it('P0001 com mensagem toString vira tente_de_novo', async () => {
    m.criarPedido.mockRejectedValue(new ErroDeRegra('toString'))
    const itens = [{ produto: 'pistache', quantos: 1 }]
    const cotacao = '3f2b8c1e-9a4d-4e7b-8c11-0d5e6f7a8b9c'
    expect(await fecharPedido({ itens, cotacao, totalVisto: 100, guardarEndereco: false })).toEqual({ ok: false, erro: 'tente_de_novo' })
  })
})

describe('criar no Mercado Pago', () => {
  it('cancela as tentativas anteriores da cliente (de qualquer pedido), sem esperar o sucesso', async () => {
    m.tentativasACancelarDaCliente.mockResolvedValue([{ tentativa: 'velha', mpPedidoId: 'ORD0' }])
    m.cancelarNoMp.mockRejectedValue(new Error('falhou'))
    expect((await pagarComPix({ numero: NUMERO })).ok).toBe(true)
    expect(m.tentativasACancelarDaCliente).toHaveBeenCalledWith('u1')
    expect(m.tentativasACancelarNoMp).not.toHaveBeenCalled()
    expect(m.cancelarNoMp).toHaveBeenCalledWith('velha', 'ORD0')
    expect(JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls)).toContain('cancelar_tentativa_anterior')
  })
  it('o cancelamento termina antes de criar no Mercado Pago', async () => {
    let terminou = 0
    m.tentativasACancelarDaCliente.mockResolvedValue([{ tentativa: 'velha', mpPedidoId: 'ORD0' }])
    m.cancelarNoMp.mockImplementation(async () => {
      await new Promise((f) => setTimeout(f, 20))
      terminou = m.criarPedidoPix.mock.invocationCallOrder.length
      return null
    })
    await pagarComPix({ numero: NUMERO })
    expect(terminou).toBe(0)
    expect(m.criarPedidoPix).toHaveBeenCalledTimes(1)
  })
  it('falha na lista a cancelar: registra e segue', async () => {
    m.tentativasACancelarDaCliente.mockRejectedValue(new Error('banco'))
    expect((await pagarComPix({ numero: NUMERO })).ok).toBe(true)
    expect(JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls)).toContain('tentativas_a_cancelar')
  })
  it('Pix: valor do banco, e-mail da sessao, QR devolvido', async () => {
    const r = await pagarComPix({ numero: NUMERO })
    expect(m.criarPedidoPix).toHaveBeenCalledWith({ tentativa: 'tent-1', totalCentavos: 9280, email: 'ana@exemplo.com', itens: [] })
    expect(r).toEqual({
      ok: true,
      situacao: { numero: NUMERO, estado: 'aguardando_pagamento', pagamento: { forma: 'pix', estado: 'pendente', recusa: null, pix, desafioUrl: null } },
    })
  })
  it('Pix sem QR: pix null', async () => {
    m.criarPedidoPix.mockResolvedValue({ ok: true, pedido: pedidoMp({ pix: null }) })
    const r = await pagarComPix({ numero: NUMERO })
    expect(r.ok && r.situacao.pagamento?.pix).toBeNull()
  })
  it('cartao: valor, e-mail, cartao e documento enviados; final aplicado', async () => {
    m.aplicarRespostaDoMp.mockResolvedValue({ tentativa: 'aprovado', pedido: 'pago' })
    const r = await pagarComCartao({ ...cartao, documento: { tipo: 'CPF', numero: CPF } })
    expect(m.criarPedidoCartao).toHaveBeenCalledWith({
      tentativa: 'tent-1',
      totalCentavos: 9280,
      email: 'ana@exemplo.com',
      cartao: { token: TOKEN, bandeira: 'visa', tipo: 'credit_card', parcelas: 1 },
      documento: { tipo: 'CPF', numero: '12345678909' },
      itens: [],
      dispositivo: null,
    })
    expect(m.aplicarRespostaDoMp).toHaveBeenCalledWith('tent-1', expect.anything(), '4242')
    expect(r.ok && r.situacao.estado).toBe('pago')
  })
  it('pagar le os itens do pedido e manda ao Mercado Pago com a entrega', async () => {
    m.lerItensParaPagar.mockResolvedValue({ itens: [{ nome: 'Granola', quantos: 2, precoCentavos: 2000 }], freteCentavos: 1810 })
    const esperado = [
      { titulo: 'Granola', quantidade: 2, precoCentavos: 2000 },
      { titulo: 'Entrega', quantidade: 1, precoCentavos: 1810 },
    ]
    await pagarComPix({ numero: NUMERO })
    expect(m.lerItensParaPagar).toHaveBeenCalledWith('ped-1')
    expect(m.criarPedidoPix.mock.calls[0][0].itens).toEqual(esperado)
    await pagarComCartao(cartao)
    expect(m.criarPedidoCartao.mock.calls[0][0].itens).toEqual(esperado)
  })
  it('a leitura dos itens que falha nao barra: o pedido sai com itens vazios', async () => {
    m.lerItensParaPagar.mockRejectedValue(new Error('falhou'))
    const r = await pagarComPix({ numero: NUMERO })
    expect(r.ok).toBe(true)
    expect(m.criarPedidoPix.mock.calls[0][0].itens).toEqual([])
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).toContain('pagar.itens')
  })
  it('o dispositivo no formato vai a criarPedidoCartao', async () => {
    await pagarComCartao({ ...cartao, dispositivo: 'armor.abc123def456' })
    expect(m.criarPedidoCartao).toHaveBeenCalledWith(expect.objectContaining({ dispositivo: 'armor.abc123def456' }))
  })
  it('sem dispositivo, criarPedidoCartao recebe null', async () => {
    await pagarComCartao(cartao)
    expect(m.criarPedidoCartao).toHaveBeenCalledWith(expect.objectContaining({ dispositivo: null }))
  })
  it('dispositivo hostil e descartado e o cartao paga mesmo assim', async () => {
    const DISPOSITIVO = /^[A-Za-z0-9._:-]{8,200}$/
    const hostis: unknown[] = ['a\r\nX-Outro: 1', 'x'.repeat(10_000), 'com espaco', 'curto', '', { a: 1 }, 12345678, ...HOSTIS.filter((h) => !DISPOSITIVO.test(h))]
    for (const d of hostis) {
      m.criarPedidoCartao.mockClear()
      const r = await pagarComCartao({ ...cartao, dispositivo: d })
      expect(r.ok).toBe(true)
      expect(m.criarPedidoCartao).toHaveBeenCalledWith(expect.objectContaining({ dispositivo: null }))
    }
  })
  it('campo desconhecido continua campos_invalidos', async () => {
    expect(await pagarComCartao({ ...cartao, outro: 'x' })).toEqual({ ok: false, erro: 'campos_invalidos' })
  })
  it('cartao sem documento manda null', async () => {
    await pagarComCartao(cartao)
    expect(m.criarPedidoCartao.mock.calls[0][0].documento).toBeNull()
  })
  it('cartao recusado: estado recusado com a recusa', async () => {
    m.criarPedidoCartao.mockResolvedValue({ ok: true, pedido: pedidoMp({ status: 'failed', detalhe: 'rejected_by_issuer' }) })
    m.aplicarRespostaDoMp.mockResolvedValue({ tentativa: 'recusado', pedido: 'aguardando_pagamento' })
    const r = await pagarComCartao(cartao)
    expect(r.ok && r.situacao.pagamento).toMatchObject({ estado: 'recusado', recusa: 'rejected_by_issuer' })
  })
  it('pix e desafio so aparecem com a tentativa pendente', async () => {
    m.aplicarRespostaDoMp.mockResolvedValue({ tentativa: 'cancelado', pedido: 'aguardando_pagamento' })
    const r = await pagarComPix({ numero: NUMERO })
    expect(r.ok && r.situacao.pagamento?.pix).toBeNull()
    m.criarPedidoCartao.mockResolvedValue({ ok: true, pedido: pedidoMp({ desafioUrl: 'https://www.mercadopago.com.br/3ds' }) })
    const c = await pagarComCartao(cartao)
    expect(c.ok && c.situacao.pagamento?.desafioUrl).toBeNull()
  })
  it('a recusa e a traduzida; detalhe fora do formato vira null', async () => {
    m.aplicarRespostaDoMp.mockResolvedValue({ tentativa: 'recusado', pedido: 'aguardando_pagamento' })
    m.criarPedidoCartao.mockResolvedValue({ ok: true, pedido: pedidoMp({ status: 'failed', detalhe: 'Muito Estranho!' }) })
    const r = await pagarComCartao(cartao)
    expect(r.ok && r.situacao.pagamento?.recusa).toBeNull()
  })
  it('cartao com desafio: desafioUrl', async () => {
    const url = 'https://www.mercadopago.com.br/3ds'
    m.criarPedidoCartao.mockResolvedValue({ ok: true, pedido: pedidoMp({ desafioUrl: url }) })
    const r = await pagarComCartao(cartao)
    expect(r.ok && r.situacao.pagamento?.desafioUrl).toBe(url)
  })
  it('traducao falhou (null): devolve o que o banco tem', async () => {
    m.aplicarRespostaDoMp.mockResolvedValue(null)
    m.lerUltimaTentativa.mockResolvedValue({ id: 'tent-1', forma: 'pix', status: 'pendente', recusa: null, pixCopiaECola: '000201', pixQrBase64: 'QUJD', pixExpiraEm: null, criadoEm: 'x' })
    const r = await pagarComPix({ numero: NUMERO })
    expect(r).toEqual({
      ok: true,
      situacao: { numero: NUMERO, estado: 'aguardando_pagamento', pagamento: { forma: 'pix', estado: 'pendente', recusa: null, pix: { copiaECola: '000201', qrBase64: 'QUJD', expiraEm: null }, desafioUrl: null } },
    })
    m.lerPedidoParaPagar
      .mockResolvedValueOnce({ id: 'ped-1', totalCentavos: 9280, estado: 'aguardando_pagamento' })
      .mockResolvedValueOnce({ id: 'ped-1', totalCentavos: 9280, estado: 'aguardando_pagamento' })
      .mockResolvedValueOnce({ id: 'ped-1', totalCentavos: 9280, estado: 'pago' })
    const lido = await pagarComPix({ numero: NUMERO })
    expect(m.criarPedidoPix).toHaveBeenCalledTimes(2)
    expect(lido.ok && lido.situacao.estado).toBe('pago')
    m.lerUltimaTentativa.mockResolvedValue(null)
    expect(await pagarComPix({ numero: NUMERO })).toEqual({ ok: false, erro: 'pagamento_indisponivel' })
  })
  it.each([0, 201, 204, 500, 503, 409, 423, 429])('Mercado Pago %i: pendente, pagamento_indisponivel', async (status) => {
    m.criarPedidoPix.mockResolvedValue({ ok: false, status, codigo: null })
    expect(await pagarComPix({ numero: NUMERO })).toEqual({ ok: false, erro: 'pagamento_indisponivel' })
    expect(m.aplicarPagamento).not.toHaveBeenCalled()
  })
  it('400: cancela a tentativa com criacao_recusada', async () => {
    m.criarPedidoCartao.mockResolvedValue({ ok: false, status: 400, codigo: 'x' })
    expect(await pagarComCartao(cartao)).toEqual({ ok: false, erro: 'pagamento_indisponivel' })
    expect(m.aplicarPagamento).toHaveBeenCalledWith({ tentativa: 'tent-1', mpPedidoId: null, mpPagamentoId: null, status: 'cancelado', detalhe: 'criacao_recusada', valorCentavos: 9280 })
  })
  it('o CPF e o token nao vao a nenhum console.error', async () => {
    m.criarPedidoCartao.mockResolvedValue({ ok: false, status: 400, codigo: 'x' })
    m.aplicarPagamento.mockRejectedValue(new Error(`${CPF} ${TOKEN}`))
    await pagarComCartao({ ...cartao, documento: { tipo: 'CPF', numero: CPF } })
    m.iniciarPagamento.mockRejectedValue(new Error(TOKEN))
    await pagarComCartao({ ...cartao, documento: { tipo: 'CPF', numero: CPF } })
    expect(console.error).toHaveBeenCalled()
    const log = JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls)
    expect(log).not.toContain('12345678909')
    expect(log).not.toContain('123.456')
    expect(log).not.toContain(TOKEN)
  })
})

describe('o pedido pago enquanto a anterior era cancelada', () => {
  const aprovada = { id: 'velha', forma: 'pix', status: 'aprovado', recusa: null, pixCopiaECola: '000201', pixQrBase64: 'QUJD', pixExpiraEm: null, criadoEm: 'x' }
  const aguardando = { id: 'ped-1', totalCentavos: 9280, estado: 'aguardando_pagamento' }
  const pago = { id: 'ped-1', totalCentavos: 9280, estado: 'pago' }

  it('cancelar a anterior mostra o pedido pago: nao cobra de novo, cancela a nova e devolve o banco', async () => {
    m.tentativasACancelarDaCliente.mockResolvedValue([{ tentativa: 'velha', mpPedidoId: 'ORD0' }])
    m.cancelarNoMp.mockResolvedValue({ tentativa: 'aprovado', pedido: 'pago' })
    m.lerPedidoParaPagar.mockResolvedValueOnce(aguardando).mockResolvedValue(pago)
    m.lerUltimaTentativa.mockResolvedValue(aprovada)
    const r = await pagarComPix({ numero: NUMERO })
    expect(m.criarPedidoPix).not.toHaveBeenCalled()
    expect(m.criarPedidoCartao).not.toHaveBeenCalled()
    expect(m.aplicarPagamento).toHaveBeenCalledWith({
      tentativa: 'tent-1',
      mpPedidoId: null,
      mpPagamentoId: null,
      status: 'cancelado',
      detalhe: 'pedido_ja_pago',
      valorCentavos: 9280,
    })
    expect(r).toEqual({
      ok: true,
      situacao: { numero: NUMERO, estado: 'pago', pagamento: { forma: 'pix', estado: 'aprovado', recusa: null, pix: null, desafioUrl: null } },
    })
  })

  it('o pedido relido ja nao aguarda (sem anterior a cancelar): tambem nao chama o Mercado Pago', async () => {
    m.lerPedidoParaPagar.mockResolvedValueOnce(aguardando).mockResolvedValue(pago)
    m.lerUltimaTentativa.mockResolvedValue(aprovada)
    const r = await pagarComCartao(cartao)
    expect(m.criarPedidoCartao).not.toHaveBeenCalled()
    expect(r.ok && r.situacao.estado).toBe('pago')
  })

  it('pedido cancelado enquanto isso: a nova e cancelada com o detalhe certo', async () => {
    m.lerPedidoParaPagar.mockResolvedValueOnce(aguardando).mockResolvedValue({ ...pago, estado: 'cancelado' })
    m.lerUltimaTentativa.mockResolvedValue({ ...aprovada, id: 'tent-1', status: 'cancelado' })
    const r = await pagarComPix({ numero: NUMERO })
    expect(m.criarPedidoPix).not.toHaveBeenCalled()
    expect(m.aplicarPagamento).toHaveBeenCalledWith(expect.objectContaining({ tentativa: 'tent-1', status: 'cancelado', detalhe: 'pedido_cancelado' }))
    expect(r.ok && r.situacao.estado).toBe('cancelado')
  })

  it('cancelar a nova falhando: registra e ainda devolve o banco', async () => {
    m.lerPedidoParaPagar.mockResolvedValueOnce(aguardando).mockResolvedValue(pago)
    m.lerUltimaTentativa.mockResolvedValue(aprovada)
    m.aplicarPagamento.mockRejectedValue(new Error('banco'))
    const r = await pagarComPix({ numero: NUMERO })
    expect(r.ok && r.situacao.estado).toBe('pago')
    expect(JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls)).toContain('cancelar_tentativa_nova')
  })

  it('a resposta do Mercado Pago com o pedido ja pago nao mostra o QR nem o desafio da tentativa pendente', async () => {
    m.aplicarRespostaDoMp.mockResolvedValue({ tentativa: 'pendente', pedido: 'pago' })
    const r = await pagarComPix({ numero: NUMERO })
    expect(r.ok && r.situacao.pagamento).toMatchObject({ estado: 'pendente', pix: null, desafioUrl: null })
    m.criarPedidoCartao.mockResolvedValue({ ok: true, pedido: pedidoMp({ desafioUrl: 'https://www.mercadopago.com.br/3ds' }) })
    const c = await pagarComCartao(cartao)
    expect(c.ok && c.situacao.pagamento?.desafioUrl).toBeNull()
  })
})

describe('os ids do Mercado Pago', () => {
  it('sao guardados antes de aplicar a resposta', async () => {
    await pagarComPix({ numero: NUMERO })
    expect(m.guardarIdsDoMp).toHaveBeenCalledWith('tent-1', expect.objectContaining({ id: 'ORD1' }))
    expect(m.guardarIdsDoMp.mock.invocationCallOrder[0]).toBeLessThan(m.aplicarRespostaDoMp.mock.invocationCallOrder[0])
  })

  it('traducao desconhecida (null): os ids ja ficaram guardados e a tela recebe o banco', async () => {
    m.aplicarRespostaDoMp.mockResolvedValue(null)
    m.lerUltimaTentativa.mockResolvedValue({ id: 'tent-1', forma: 'pix', status: 'pendente', recusa: null, pixCopiaECola: null, pixQrBase64: null, pixExpiraEm: null, criadoEm: 'x' })
    const r = await pagarComPix({ numero: NUMERO })
    expect(m.guardarIdsDoMp).toHaveBeenCalledTimes(1)
    expect(r.ok && r.situacao.pagamento?.estado).toBe('pendente')
  })

  it('guardar falhando: registra e ainda aplica a resposta', async () => {
    m.guardarIdsDoMp.mockRejectedValue(new Error('banco'))
    expect((await pagarComPix({ numero: NUMERO })).ok).toBe(true)
    expect(m.aplicarRespostaDoMp).toHaveBeenCalled()
    expect(JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls)).toContain('guardar_ids_do_mp')
  })

  it('criacao que falha nao guarda nada', async () => {
    m.criarPedidoPix.mockResolvedValue({ ok: false, status: 500, codigo: null })
    await pagarComPix({ numero: NUMERO })
    expect(m.guardarIdsDoMp).not.toHaveBeenCalled()
  })
})

describe('o log de um ErroDeRegra', () => {
  it('aplicar_pagamento recusando a passagem: tente_de_novo e o codigo real no log', async () => {
    m.aplicarRespostaDoMp.mockRejectedValue(new ErroDeRegra('passagem_invalida'))
    expect(await pagarComPix({ numero: NUMERO })).toEqual({ ok: false, erro: 'tente_de_novo' })
    expect(console.error).toHaveBeenCalledWith('Falha do Supabase', expect.objectContaining({ onde: 'pagar_com_pix', code: 'passagem_invalida' }))
  })
})

describe('fecharPedido cancela la as tentativas antigas da cliente', () => {
  const entrada = { itens: [{ produto: 'pistache', quantos: 1 }], cotacao: '3f2b8c1e-9a4d-4e7b-8c11-0d5e6f7a8b9c', totalVisto: 100, guardarEndereco: false }

  beforeEach(() => {
    m.criarPedido.mockResolvedValue({ numero: NUMERO, totalCentavos: 100 })
  })

  it('depois de criar o pedido, cancela no Mercado Pago as listadas da cliente e espera', async () => {
    m.tentativasACancelarDaCliente.mockResolvedValue([{ tentativa: 'velha', mpPedidoId: 'ORD0' }])
    let terminou = false
    m.cancelarNoMp.mockImplementation(async () => {
      await new Promise((f) => setTimeout(f, 10))
      terminou = true
      return null
    })
    expect(await fecharPedido(entrada)).toEqual({ ok: true, pedido: { numero: NUMERO, totalCentavos: 100 } })
    expect(terminou).toBe(true)
    expect(m.tentativasACancelarDaCliente).toHaveBeenCalledWith('u1')
    expect(m.cancelarNoMp).toHaveBeenCalledWith('velha', 'ORD0')
    expect(m.criarPedido.mock.invocationCallOrder[0]).toBeLessThan(m.tentativasACancelarDaCliente.mock.invocationCallOrder[0])
  })

  it('falha ao cancelar ou ao listar so vai ao log: o pedido criado volta ok', async () => {
    m.tentativasACancelarDaCliente.mockResolvedValue([{ tentativa: 'velha', mpPedidoId: 'ORD0' }])
    m.cancelarNoMp.mockRejectedValue(new Error('falhou'))
    expect((await fecharPedido(entrada)).ok).toBe(true)
    m.tentativasACancelarDaCliente.mockRejectedValue(new Error('banco'))
    expect((await fecharPedido(entrada)).ok).toBe(true)
    const log = JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls)
    expect(log).toContain('cancelar_tentativa_anterior')
    expect(log).toContain('tentativas_a_cancelar')
  })

  it('pedido que nao foi criado nao cancela nada', async () => {
    m.criarPedido.mockRejectedValue(new ErroDeRegra('loja_fechada'))
    expect(await fecharPedido(entrada)).toEqual({ ok: false, erro: 'loja_fechada' })
    expect(m.tentativasACancelarDaCliente).not.toHaveBeenCalled()
  })
})

describe('mensagemDaRecusa', () => {
  it.each([
    ['insufficient_amount', 'O cartão não tem limite para este valor.'],
    ['card_insufficient_amount', 'O cartão não tem limite para este valor.'],
    ['bad_filled_card_data', 'Confira os dados do cartão.'],
    ['rejected_by_issuer', 'O banco do cartão recusou. Fale com ele ou use outro cartão.'],
    ['required_call_for_authorize', 'O banco do cartão recusou. Fale com ele ou use outro cartão.'],
    ['high_risk', 'O pagamento foi recusado por segurança. Tente outro cartão.'],
    ['cc_rejected_3ds_challenge', 'A confirmação do banco não foi concluída. Tente de novo.'],
    ['3ds_challenge_expired', 'A confirmação do banco não foi concluída. Tente de novo.'],
    // ensaio de 2026-11-23: o desafio do banco que falha volta failed/3ds_challenge_failed
    ['3ds_challenge_failed', 'A confirmação do banco não foi concluída. Tente de novo.'],
    ['max_attempts_exceeded', 'Foram muitas tentativas com este cartão. Use outro.'],
    ['card_disabled', 'Este cartão está desativado. Use outro.'],
    ['invalid_installments', 'Escolha outro número de parcelas.'],
  ])('%s', (c, t) => expect(mensagemDaRecusa(c)).toBe(t))
  it('desconhecido, herdado ou nulo: o texto geral', () => {
    for (const c of ['qualquer', 'toString', null]) expect(mensagemDaRecusa(c)).toBe(MENSAGENS_DO_FECHAMENTO.pagamento_recusado)
  })
})
