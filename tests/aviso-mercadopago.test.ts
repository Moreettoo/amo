// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  conferirAssinatura: vi.fn(),
  lerPedidoMp: vi.fn(),
  registrarEventoWebhook: vi.fn(),
  concluirEventoWebhook: vi.fn(),
  aplicarRespostaDoMp: vi.fn(),
  variavel: vi.fn(),
  registrarFalha: vi.fn(),
}))

vi.mock('@/lib/mercadopago/assinatura', () => ({ conferirAssinatura: m.conferirAssinatura }))
vi.mock('@/lib/mercadopago/cliente', () => ({ lerPedidoMp: m.lerPedidoMp }))
vi.mock('@/lib/dados/pagamentos', () => ({
  registrarEventoWebhook: m.registrarEventoWebhook,
  concluirEventoWebhook: m.concluirEventoWebhook,
}))
vi.mock('@/lib/mercadopago/sincronizar', () => ({ aplicarRespostaDoMp: m.aplicarRespostaDoMp }))
vi.mock('@/lib/dados/ambiente', () => ({ variavel: m.variavel }))
vi.mock('@/lib/dados/erros', async (original) => ({
  ...(await original<typeof import('@/lib/dados/erros')>()),
  registrarFalha: m.registrarFalha,
}))

import { POST } from '@/app/api/webhooks/mercadopago/route'
import { ErroDeRegra } from '@/lib/dados/erros'

const pedido = { id: 'ORD1', referencia: 'tent-1' }
function aviso(query = 'type=order&data.id=ORD1', corpo: unknown = {}, cab: Record<string, string> = {}) {
  return POST(
    new Request(`https://amo.test/api/webhooks/mercadopago?${query}`, {
      method: 'POST',
      headers: { 'x-signature': 'ts=1,v1=aa', 'x-request-id': 'req-1', ...cab },
      body: JSON.stringify(corpo),
    }),
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  m.variavel.mockReturnValue('segredo')
  m.conferirAssinatura.mockReturnValue(true)
  m.registrarEventoWebhook.mockResolvedValue({ evento: 7, situacao: 'novo' })
  m.lerPedidoMp.mockResolvedValue({ ok: true, pedido })
  m.aplicarRespostaDoMp.mockResolvedValue({ tentativa: 'x', pedido: 'y' })
  m.concluirEventoWebhook.mockResolvedValue(undefined)
})

describe('aviso do Mercado Pago', () => {
  it('assinatura errada: 401 vazio, nada registrado', async () => {
    m.conferirAssinatura.mockReturnValue(false)
    const r = await aviso()
    expect(r.status).toBe(401)
    expect(await r.text()).toBe('')
    expect(m.registrarEventoWebhook).not.toHaveBeenCalled()
  })

  it('sem cabecalho de assinatura: 401', async () => {
    m.conferirAssinatura.mockReturnValue(false)
    const r = await POST(new Request('https://amo.test/api/webhooks/mercadopago?type=order&data.id=ORD1', { method: 'POST' }))
    expect(r.status).toBe(401)
    expect(m.conferirAssinatura.mock.calls[0][0]).toMatchObject({ assinatura: null, requestId: null, segredo: 'segredo' })
  })

  it('type=payment: 200, nada registrado', async () => {
    expect((await aviso('type=payment&data.id=ORD1')).status).toBe(200)
    expect(m.registrarEventoWebhook).not.toHaveBeenCalled()
  })

  it('data.id com espaco: 200, nada registrado', async () => {
    expect((await aviso('type=order&data.id=OR%20D1')).status).toBe(200)
    expect(m.registrarEventoWebhook).not.toHaveBeenCalled()
  })

  it('ja_tratado: 200 sem ler o Mercado Pago', async () => {
    m.registrarEventoWebhook.mockResolvedValue({ evento: 7, situacao: 'ja_tratado' })
    expect((await aviso()).status).toBe(200)
    expect(m.lerPedidoMp).not.toHaveBeenCalled()
  })

  it.each(['novo', 'tratar_de_novo'])('%s: le, aplica pela referencia da resposta e conclui', async (situacao) => {
    m.registrarEventoWebhook.mockResolvedValue({ evento: 7, situacao })
    const r = await aviso('type=order&data.id=ORD1', { external_reference: 'outra', data: { id: 'X' } })
    expect(r.status).toBe(200)
    expect(m.registrarEventoWebhook).toHaveBeenCalledWith({ eventoId: 'req-1', tipo: 'order', recursoId: 'ORD1' })
    expect(m.lerPedidoMp).toHaveBeenCalledWith('ORD1')
    expect(m.aplicarRespostaDoMp).toHaveBeenCalledWith('tent-1', pedido)
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, null)
  })

  it('x-request-id fora do padrao: usa data.id:ts da assinatura, igual em duas entregas', async () => {
    const cab = { 'x-request-id': 'a b', 'x-signature': 'ts=1700000000,v1=aa' }
    await aviso('type=order&data.id=ORD1', {}, cab)
    await aviso('type=order&data.id=ORD1', {}, cab)
    expect(m.registrarEventoWebhook.mock.calls[0][0].eventoId).toBe('ORD1:1700000000')
    expect(m.registrarEventoWebhook.mock.calls[1][0].eventoId).toBe('ORD1:1700000000')
  })

  it('sem ts na assinatura: fallback deterministico', async () => {
    await aviso('type=order&data.id=ORD1', {}, { 'x-request-id': '', 'x-signature': 'v1=aa' })
    expect(m.registrarEventoWebhook.mock.calls[0][0].eventoId).toBe('ORD1:sem-ts')
  })

  it('segredo ausente: 500 sem registrar', async () => {
    m.variavel.mockImplementation(() => {
      throw new Error('falta')
    })
    expect((await aviso()).status).toBe(500)
    expect(m.registrarEventoWebhook).not.toHaveBeenCalled()
  })

  it('concluir lancando: ainda responde', async () => {
    m.concluirEventoWebhook.mockRejectedValue(new Error('x'))
    expect((await aviso()).status).toBe(200)
  })

  it('aceita topic_chargebacks_wh', async () => {
    await aviso('type=topic_chargebacks_wh&data.id=ORD1')
    expect(m.registrarEventoWebhook).toHaveBeenCalled()
  })

  it('lerPedidoMp falhando: mp_500 e 500', async () => {
    m.lerPedidoMp.mockResolvedValue({ ok: false, status: 500, codigo: null })
    expect((await aviso()).status).toBe(500)
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, 'mp_500')
    expect(m.aplicarRespostaDoMp).not.toHaveBeenCalled()
  })

  it('aplicar lancando: conclui com codigo curto e 500', async () => {
    m.aplicarRespostaDoMp.mockRejectedValue(new Error('segredo do banco'))
    expect((await aviso()).status).toBe(500)
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, 'aplicar_falhou')
    expect(m.registrarFalha).toHaveBeenCalledWith('mercadopago.aviso', { code: 'aviso_falhou' })
  })

  it('ErroDeRegra de aplicar_pagamento: o codigo real vai ao log e ao aviso', async () => {
    m.aplicarRespostaDoMp.mockRejectedValue(new ErroDeRegra('passagem_invalida'))
    expect((await aviso()).status).toBe(500)
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, 'passagem_invalida')
    expect(m.registrarFalha).toHaveBeenCalledWith('mercadopago.aviso', { code: 'passagem_invalida' })
  })

  it('GET com 404 (ex.: id de contestacao) e deterministico: conclui mp_404, registra e responde 200', async () => {
    m.lerPedidoMp.mockResolvedValue({ ok: false, status: 404, codigo: 'order_not_found' })
    expect((await aviso('type=topic_chargebacks_wh&data.id=123456')).status).toBe(200)
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, 'mp_404')
    expect(m.registrarFalha).toHaveBeenCalledWith('mercadopago.aviso', { code: 'mp_404', status: 404 })
    expect(m.aplicarRespostaDoMp).not.toHaveBeenCalled()
  })

  it('aplicar recusando (null): conclui com erro registrado e responde 200', async () => {
    m.aplicarRespostaDoMp.mockResolvedValue(null)
    expect((await aviso()).status).toBe(200)
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, 'aplicar_recusou')
  })

  it('pedido sem referencia: conclui sem erro, 200, sem aplicar', async () => {
    m.lerPedidoMp.mockResolvedValue({ ok: true, pedido: { id: 'ORD1', referencia: null } })
    expect((await aviso()).status).toBe(200)
    expect(m.aplicarRespostaDoMp).not.toHaveBeenCalled()
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, null)
  })

  it('banco falhando ao registrar: 500', async () => {
    m.registrarEventoWebhook.mockRejectedValue(new Error('x'))
    expect((await aviso()).status).toBe(500)
  })
})
