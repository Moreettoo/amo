// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  obterUsuario: vi.fn(),
  consumirLimite: vi.fn(),
  lerPedidoParaPagar: vi.fn(),
  lerUltimaTentativa: vi.fn(),
  mpPedidoDaTentativa: vi.fn(),
  sincronizarTentativa: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ obterUsuario: m.obterUsuario }))
vi.mock('@/lib/dados/cep', () => ({ buscarCep: vi.fn() }))
vi.mock('@/lib/dados/limites', () => ({ consumirLimite: m.consumirLimite }))
vi.mock('@/lib/dados/fechamento', () => ({
  criarPedido: vi.fn(),
  iniciarPagamento: vi.fn(),
  lerPedidoParaPagar: m.lerPedidoParaPagar,
  lerUltimaTentativa: m.lerUltimaTentativa,
}))
vi.mock('@/lib/dados/pagamentos', () => ({
  aplicarPagamento: vi.fn(),
  tentativasACancelarNoMp: vi.fn(),
  tentativasACancelarDaCliente: vi.fn(),
  mpPedidoDaTentativa: m.mpPedidoDaTentativa,
}))
vi.mock('@/lib/mercadopago/sincronizar', () => ({
  aplicarRespostaDoMp: vi.fn(),
  cancelarNoMp: vi.fn(),
  guardarIdsDoMp: vi.fn(),
  sincronizarTentativa: m.sincronizarTentativa,
}))
vi.mock('@/lib/mercadopago/cliente', () => ({ criarPedidoPix: vi.fn(), criarPedidoCartao: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

import { situacaoDoPedido } from '@/app/sacola/acoes'
import { ErroDeRegra } from '@/lib/dados/erros'

const NUMERO = 'AMO-ABCDEFGH'
const tentativa = (extra: object = {}) => ({
  id: 't1',
  forma: 'pix',
  status: 'pendente',
  recusa: null,
  pixCopiaECola: '000201',
  pixQrBase64: 'QUJD',
  pixExpiraEm: '2026-11-21T12:00:00.000Z',
  criadoEm: 'x',
  ...extra,
})

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset()
  m.obterUsuario.mockResolvedValue({ id: 'u1', email: 'a@b.c' })
  m.consumirLimite.mockResolvedValue(true)
  m.lerPedidoParaPagar.mockResolvedValue({ id: 'ped-1', totalCentavos: 100, estado: 'aguardando_pagamento' })
  m.lerUltimaTentativa.mockResolvedValue(tentativa())
  m.mpPedidoDaTentativa.mockResolvedValue('ORD1')
  m.sincronizarTentativa.mockResolvedValue({ tentativa: 'aprovado', pedido: 'pago' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const nada = () => {
  expect(m.lerPedidoParaPagar).not.toHaveBeenCalled()
  expect(m.sincronizarTentativa).not.toHaveBeenCalled()
}

describe('situacaoDoPedido', () => {
  it('sem sessao', async () => {
    m.obterUsuario.mockResolvedValue(null)
    expect(await situacaoDoPedido({ numero: NUMERO })).toEqual({ ok: false, erro: 'sem_sessao' })
    expect(m.consumirLimite).not.toHaveBeenCalled()
    nada()
  })

  it('numero invalido', async () => {
    expect(await situacaoDoPedido({ numero: '<x>' })).toEqual({ ok: false, erro: 'campos_invalidos' })
    expect(m.consumirLimite).not.toHaveBeenCalled()
    nada()
  })

  it('limite estourado', async () => {
    m.consumirLimite.mockResolvedValue(false)
    expect(await situacaoDoPedido({ numero: NUMERO })).toEqual({ ok: false, erro: 'muitas_tentativas' })
    expect(m.consumirLimite).toHaveBeenCalledWith('situacao:u1', 240, 3600)
    nada()
  })

  it('pedido de outra pessoa', async () => {
    m.lerPedidoParaPagar.mockResolvedValue(null)
    expect(await situacaoDoPedido({ numero: NUMERO })).toEqual({ ok: false, erro: 'pedido_invalido' })
    expect(m.lerUltimaTentativa).not.toHaveBeenCalled()
    expect(m.sincronizarTentativa).not.toHaveBeenCalled()
  })

  it('pendente com ORD e janela livre: sincroniza uma vez e devolve o novo', async () => {
    m.lerPedidoParaPagar
      .mockResolvedValueOnce({ id: 'ped-1', totalCentavos: 100, estado: 'aguardando_pagamento' })
      .mockResolvedValueOnce({ id: 'ped-1', totalCentavos: 100, estado: 'pago' })
    m.lerUltimaTentativa.mockResolvedValueOnce(tentativa()).mockResolvedValueOnce(tentativa({ status: 'aprovado' }))
    const r = await situacaoDoPedido({ numero: NUMERO })
    expect(m.consumirLimite).toHaveBeenCalledWith('mp:t1', 1, 15)
    expect(m.sincronizarTentativa).toHaveBeenCalledTimes(1)
    expect(m.sincronizarTentativa).toHaveBeenCalledWith('t1', 'ORD1')
    expect(r).toEqual({
      ok: true,
      situacao: { numero: NUMERO, estado: 'pago', pagamento: { forma: 'pix', estado: 'aprovado', recusa: null, pix: null, desafioUrl: null } },
    })
  })

  it('janela ocupada: devolve o que o banco tem, com o Pix', async () => {
    m.consumirLimite.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const r = await situacaoDoPedido({ numero: NUMERO })
    expect(m.sincronizarTentativa).not.toHaveBeenCalled()
    expect(r).toMatchObject({ ok: true, situacao: { estado: 'aguardando_pagamento', pagamento: { estado: 'pendente', pix: { copiaECola: '000201' } } } })
  })

  it('pendente sem ORD: nao sincroniza nem gasta a janela', async () => {
    m.mpPedidoDaTentativa.mockResolvedValue(null)
    await situacaoDoPedido({ numero: NUMERO })
    expect(m.sincronizarTentativa).not.toHaveBeenCalled()
    expect(m.consumirLimite).toHaveBeenCalledTimes(1)
  })

  it('sem tentativa: pagamento null', async () => {
    m.lerUltimaTentativa.mockResolvedValue(null)
    expect(await situacaoDoPedido({ numero: NUMERO })).toEqual({ ok: true, situacao: { numero: NUMERO, estado: 'aguardando_pagamento', pagamento: null } })
    expect(m.sincronizarTentativa).not.toHaveBeenCalled()
  })

  it('so as chaves da situacao', async () => {
    const r = await situacaoDoPedido({ numero: NUMERO })
    if (!r.ok) throw new Error('esperava ok')
    expect(Object.keys(r.situacao).sort()).toEqual(['estado', 'numero', 'pagamento'])
    expect(Object.keys(r.situacao.pagamento!).sort()).toEqual(['desafioUrl', 'estado', 'forma', 'pix', 'recusa'])
  })

  it('tentativa que nao esta pendente nao mostra o Pix nem sincroniza', async () => {
    m.lerUltimaTentativa.mockResolvedValue(tentativa({ status: 'expirado' }))
    const r = await situacaoDoPedido({ numero: NUMERO })
    expect(r).toMatchObject({ ok: true, situacao: { pagamento: { estado: 'expirado', pix: null } } })
    expect(m.sincronizarTentativa).not.toHaveBeenCalled()
  })

  it('sincronizacao que lanca: registra e devolve o que o banco tem, nao tente_de_novo', async () => {
    m.sincronizarTentativa.mockRejectedValue(new ErroDeRegra('passagem_invalida'))
    const r = await situacaoDoPedido({ numero: NUMERO })
    expect(r).toMatchObject({ ok: true, situacao: { estado: 'aguardando_pagamento', pagamento: { estado: 'pendente', pix: { copiaECola: '000201' } } } })
    expect(console.error).toHaveBeenCalledWith(
      'Falha do Supabase',
      expect.objectContaining({ onde: 'situacao_do_pedido.sincronizar', code: 'passagem_invalida' }),
    )
  })

  it('falha do banco ao ler: tente_de_novo, com o codigo de um ErroDeRegra no log', async () => {
    m.lerPedidoParaPagar.mockRejectedValue(new Error('banco'))
    expect(await situacaoDoPedido({ numero: NUMERO })).toEqual({ ok: false, erro: 'tente_de_novo' })
    m.lerPedidoParaPagar.mockRejectedValue(new ErroDeRegra('pagamento_invalido'))
    expect(await situacaoDoPedido({ numero: NUMERO })).toEqual({ ok: false, erro: 'tente_de_novo' })
    expect(console.error).toHaveBeenCalledWith('Falha do Supabase', expect.objectContaining({ onde: 'situacao_do_pedido', code: 'pagamento_invalido' }))
  })

  it('tentativa pendente com o pedido ja pago: o Pix nao aparece', async () => {
    m.lerPedidoParaPagar.mockResolvedValue({ id: 'ped-1', totalCentavos: 100, estado: 'pago' })
    m.consumirLimite.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const r = await situacaoDoPedido({ numero: NUMERO })
    expect(r).toMatchObject({ ok: true, situacao: { estado: 'pago', pagamento: { estado: 'pendente', pix: null } } })
  })

  it('Mercado Pago falhou na sincronizacao (null): devolve o banco', async () => {
    m.sincronizarTentativa.mockResolvedValue(null)
    expect(await situacaoDoPedido({ numero: NUMERO })).toMatchObject({ ok: true, situacao: { estado: 'aguardando_pagamento' } })
  })
})
