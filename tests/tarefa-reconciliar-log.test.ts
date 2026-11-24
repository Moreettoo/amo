// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** O log da reconciliacao com o registrarFalha de verdade: todo registro sai com lugar e codigo legiveis. */

const m = vi.hoisted(() => ({
  pagamentosAReconciliar: vi.fn(),
  tentativasACancelarNoMp: vi.fn(),
  aplicarPagamento: vi.fn(),
  sincronizarTentativa: vi.fn(),
  estornarNoMp: vi.fn(),
  cancelarNoMp: vi.fn(),
  variavel: vi.fn(),
}))

vi.mock('@/lib/dados/pagamentos', () => ({
  pagamentosAReconciliar: m.pagamentosAReconciliar,
  tentativasACancelarNoMp: m.tentativasACancelarNoMp,
  aplicarPagamento: m.aplicarPagamento,
}))
vi.mock('@/lib/mercadopago/sincronizar', () => ({
  sincronizarTentativa: m.sincronizarTentativa,
  estornarNoMp: m.estornarNoMp,
  cancelarNoMp: m.cancelarNoMp,
}))
vi.mock('@/lib/uber/corridas', () => ({
  criarCorridasPendentes: async () => ({ criadas: 0, falhas: 0 }),
  cancelarCorridasPedidas: async () => ({ canceladas: 0, falhas: 0 }),
  conferirCorrida: async () => true,
}))
vi.mock('@/lib/dados/entregas', () => ({
  corridasAConferir: async () => [],
  escalarCancelamentosIncertos: async () => 0,
}))
vi.mock('@/lib/dados/ambiente', () => ({ variavel: m.variavel }))

import { POST } from '@/app/api/tarefas/reconciliar/route'
import { ErroDeRegra } from '@/lib/dados/erros'

const chamar = () =>
  POST(new Request('https://amo.test/api/tarefas/reconciliar', { method: 'POST', headers: { authorization: 'Bearer segredo-da-tarefa' } }))

let log: ReturnType<typeof vi.spyOn>
const registros = () => log.mock.calls.map((c: unknown[]) => c[1] as { onde: unknown; code: unknown })

beforeEach(() => {
  vi.resetAllMocks()
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
  m.variavel.mockReturnValue('segredo-da-tarefa')
  m.pagamentosAReconciliar.mockResolvedValue([])
  m.tentativasACancelarNoMp.mockResolvedValue([])
})

describe('o log da reconciliacao', () => {
  it('cada falha de item sai com onde e code, nunca em branco', async () => {
    m.pagamentosAReconciliar.mockResolvedValue([
      { tentativa: 'a', mpPedidoId: 'ORD-A', status: 'pendente' },
      { tentativa: 'b', mpPedidoId: 'ORD-B', status: 'pendente' },
      { tentativa: 'c', mpPedidoId: 'ORD-C', status: 'a_estornar' },
      { tentativa: 'd', mpPedidoId: null, status: 'a_estornar' },
      { tentativa: 'e', mpPedidoId: null, status: 'pendente' },
    ])
    m.tentativasACancelarNoMp.mockResolvedValue([{ tentativa: 'f', mpPedidoId: 'ORD-F' }])
    m.sincronizarTentativa.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('texto cru do banco'))
    m.estornarNoMp.mockRejectedValue(new ErroDeRegra('passagem_invalida'))
    m.aplicarPagamento.mockRejectedValue(new Error('outro texto cru'))
    m.cancelarNoMp.mockResolvedValue(null)

    expect(await (await chamar()).json()).toMatchObject({ conferidas: 0, canceladas: 0, falhas: 6 })
    expect(registros()).toEqual([
      expect.objectContaining({ onde: 'reconciliar.sincronizar', code: 'sem_resposta_do_mp' }),
      expect.objectContaining({ onde: 'reconciliar.sincronizar', code: 'excecao' }),
      expect.objectContaining({ onde: 'reconciliar.estornar', code: 'passagem_invalida' }),
      expect.objectContaining({ onde: 'reconciliar.estorno_sem_pedido', code: 'precisa_da_equipe' }),
      expect.objectContaining({ onde: 'reconciliar.sem_pedido', code: 'excecao' }),
      expect.objectContaining({ onde: 'reconciliar.cancelar', code: 'sem_resposta_do_mp' }),
    ])
    expect(JSON.stringify(log.mock.calls)).not.toContain('texto cru')
  })

  it('o segredo ausente e a lista que lanca tambem', async () => {
    m.variavel.mockImplementation(() => {
      throw new Error('Falta a variavel')
    })
    expect((await chamar()).status).toBe(500)
    m.variavel.mockReturnValue('segredo-da-tarefa')
    m.pagamentosAReconciliar.mockRejectedValue(new Error('texto cru'))
    expect((await chamar()).status).toBe(500)
    expect(registros()).toEqual([
      expect.objectContaining({ onde: 'reconciliar.segredo', code: 'sem_segredo' }),
      expect.objectContaining({ onde: 'reconciliar.lista', code: 'excecao' }),
    ])
  })
})
