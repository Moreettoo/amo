// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  conferirAssinaturaUber: vi.fn(),
  conferirCorrida: vi.fn(),
  registrarEventoWebhook: vi.fn(),
  concluirEventoWebhook: vi.fn(),
  variavel: vi.fn(),
  registrarFalha: vi.fn(),
}))

vi.mock('@/lib/uber/assinatura', () => ({ conferirAssinaturaUber: m.conferirAssinaturaUber }))
vi.mock('@/lib/dados/pagamentos', () => ({
  registrarEventoWebhook: m.registrarEventoWebhook,
  concluirEventoWebhook: m.concluirEventoWebhook,
}))
vi.mock('@/lib/dados/ambiente', () => ({ variavel: m.variavel }))
vi.mock('@/lib/dados/erros', async (original) => ({
  ...(await original<typeof import('@/lib/dados/erros')>()),
  registrarFalha: m.registrarFalha,
}))
vi.mock('@/lib/uber/corridas', () => ({ conferirCorrida: m.conferirCorrida }))

import { POST } from '@/app/api/webhooks/uber/route'

const CORPO = { kind: 'event.delivery_status', id: 'evt-1', delivery_id: 'del_1', status: 'delivered', extra: 'CORPO-SECRETO' }
function aviso(corpo: unknown = CORPO, cab: Record<string, string> = { 'x-uber-signature': 'sig-123' }, bruto?: string) {
  return POST(
    new Request('https://amo.test/api/webhooks/uber', {
      method: 'POST',
      headers: cab,
      body: bruto ?? JSON.stringify(corpo),
    }),
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  m.variavel.mockReturnValue('o-segredo')
  m.conferirAssinaturaUber.mockReturnValue(true)
  m.registrarEventoWebhook.mockResolvedValue({ evento: 7, situacao: 'novo' })
  m.concluirEventoWebhook.mockResolvedValue(undefined)
  m.conferirCorrida.mockResolvedValue(true)
})

describe('aviso da Uber', () => {
  it('sem segredo: 500 e log sem_segredo', async () => {
    m.variavel.mockImplementation(() => {
      throw new Error('falta')
    })
    const r = await aviso()
    expect(r.status).toBe(500)
    expect(m.registrarFalha).toHaveBeenCalledWith('uber.aviso', { code: 'sem_segredo' })
  })

  it('assinatura errada: 401 vazio, nada no banco', async () => {
    m.conferirAssinaturaUber.mockReturnValue(false)
    const r = await aviso()
    expect(r.status).toBe(401)
    expect(await r.text()).toBe('')
    expect(m.registrarEventoWebhook).not.toHaveBeenCalled()
    expect(m.conferirCorrida).not.toHaveBeenCalled()
  })

  it('confere o corpo cru com o segredo', async () => {
    const bruto = '{"kind":"event.delivery_status","id":"e","delivery_id":"d"}'
    await aviso(null, { 'x-uber-signature': 'abc' }, bruto)
    expect(m.conferirAssinaturaUber).toHaveBeenCalledWith(bruto, 'abc', 'o-segredo')
  })

  it('x-postmates-signature e aceito', async () => {
    await aviso(CORPO, { 'x-postmates-signature': 'pp' })
    expect(m.conferirAssinaturaUber.mock.calls[0][1]).toBe('pp')
  })

  it('x-uber-signature tem prioridade', async () => {
    await aviso(CORPO, { 'x-uber-signature': 'uu', 'x-postmates-signature': 'pp' })
    expect(m.conferirAssinaturaUber.mock.calls[0][1]).toBe('uu')
  })

  it('JSON invalido: 400', async () => {
    const r = await aviso(null, { 'x-uber-signature': 'aa' }, '{nao e json')
    expect(r.status).toBe(400)
    expect(m.registrarEventoWebhook).not.toHaveBeenCalled()
  })

  it('event.courier_update: 200 sem registrar', async () => {
    const r = await aviso({ ...CORPO, kind: 'event.courier_update' })
    expect(r.status).toBe(200)
    expect(m.registrarEventoWebhook).not.toHaveBeenCalled()
  })

  it.each([
    ['id fora do padrao', { id: 'a b' }],
    ['delivery_id fora do padrao', { delivery_id: 'x/y' }],
    ['id ausente', { id: undefined }],
    ['delivery_id longo', { delivery_id: 'a'.repeat(101) }],
  ])('%s: 200 sem registrar', async (_nome, extra) => {
    const r = await aviso({ ...CORPO, ...extra })
    expect(r.status).toBe(200)
    expect(m.registrarEventoWebhook).not.toHaveBeenCalled()
  })

  it('registra com origem uber', async () => {
    await aviso()
    expect(m.registrarEventoWebhook).toHaveBeenCalledWith({
      origem: 'uber',
      eventoId: 'evt-1',
      tipo: 'event.delivery_status',
      recursoId: 'del_1',
    })
  })

  it('repetido: 200 sem chamar a Uber', async () => {
    m.registrarEventoWebhook.mockResolvedValue({ evento: 7, situacao: 'ja_tratado' })
    const r = await aviso()
    expect(r.status).toBe(200)
    expect(m.conferirCorrida).not.toHaveBeenCalled()
    expect(m.concluirEventoWebhook).not.toHaveBeenCalled()
  })

  it('tratar_de_novo segue adiante', async () => {
    m.registrarEventoWebhook.mockResolvedValue({ evento: 7, situacao: 'tratar_de_novo' })
    expect((await aviso()).status).toBe(200)
    expect(m.conferirCorrida).toHaveBeenCalledWith('del_1')
  })

  it('sucesso: confere a corrida pelo delivery_id, conclui sem erro, 200', async () => {
    const r = await aviso()
    expect(r.status).toBe(200)
    expect(m.conferirCorrida).toHaveBeenCalledWith('del_1')
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, null)
  })

  it('Uber fora do ar: conclui com uber_<status> e 500', async () => {
    m.conferirCorrida.mockResolvedValue(false)
    const r = await aviso()
    expect(r.status).toBe(500)
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, 'uber_delivered')
  })

  it('excecao: log curto, conclui com erro, 500', async () => {
    m.conferirCorrida.mockRejectedValue(new Error('detalhe'))
    const r = await aviso()
    expect(r.status).toBe(500)
    expect(m.registrarFalha).toHaveBeenCalledWith('uber.aviso', { code: 'aviso_falhou' })
    expect(m.concluirEventoWebhook).toHaveBeenCalledWith(7, 'aviso_falhou')
  })

  it('falha ao registrar: 500', async () => {
    m.registrarEventoWebhook.mockRejectedValue(new Error('x'))
    expect((await aviso()).status).toBe(500)
  })

  it('nenhum log leva o corpo, a assinatura ou o segredo', async () => {
    m.conferirCorrida.mockRejectedValue(new Error('CORPO-SECRETO'))
    await aviso()
    m.variavel.mockImplementation(() => {
      throw new Error('o-segredo')
    })
    await aviso()
    const tudo = JSON.stringify(m.registrarFalha.mock.calls)
    expect(tudo).not.toContain('CORPO-SECRETO')
    expect(tudo).not.toContain('o-segredo')
    expect(tudo).not.toContain('sig-123')
  })
})
