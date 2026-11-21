// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  pagamentosAReconciliar: vi.fn(),
  tentativasACancelarNoMp: vi.fn(),
  aplicarPagamento: vi.fn(),
  sincronizarTentativa: vi.fn(),
  estornarNoMp: vi.fn(),
  cancelarNoMp: vi.fn(),
  variavel: vi.fn(),
  registrarFalha: vi.fn(),
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
vi.mock('@/lib/dados/ambiente', () => ({ variavel: m.variavel }))
vi.mock('@/lib/dados/erros', async (original) => ({
  ...(await original<typeof import('@/lib/dados/erros')>()),
  registrarFalha: m.registrarFalha,
}))

import { POST } from '@/app/api/tarefas/reconciliar/route'

const chamar = (auth?: string) =>
  POST(
    new Request('https://amo.test/api/tarefas/reconciliar', {
      method: 'POST',
      headers: auth === undefined ? {} : { authorization: auth },
    }),
  )

const ok = { tentativa: 'x', pedido: 'y' }

beforeEach(() => {
  vi.resetAllMocks()
  m.variavel.mockReturnValue('segredo-da-tarefa')
  m.pagamentosAReconciliar.mockResolvedValue([])
  m.tentativasACancelarNoMp.mockResolvedValue([])
  m.aplicarPagamento.mockResolvedValue(undefined)
  m.sincronizarTentativa.mockResolvedValue(ok)
  m.estornarNoMp.mockResolvedValue(ok)
  m.cancelarNoMp.mockResolvedValue(ok)
})
afterEach(() => vi.useRealTimers())

function nadaChamado() {
  expect(m.pagamentosAReconciliar).not.toHaveBeenCalled()
  expect(m.tentativasACancelarNoMp).not.toHaveBeenCalled()
  expect(m.aplicarPagamento).not.toHaveBeenCalled()
}

describe('a reconciliacao', () => {
  it.each([
    ['sem Authorization', undefined],
    ['com outro segredo do mesmo tamanho', 'Bearer segredo-da-tarefx'],
    ['com segredo de outro tamanho', 'Bearer curto'],
    ['sem o esquema Bearer', 'segredo-da-tarefa'],
  ])('%s: 401 vazio e nada chamado', async (_n, auth) => {
    const r = await chamar(auth)
    expect(r.status).toBe(401)
    expect(await r.text()).toBe('')
    nadaChamado()
  })

  it('sem o segredo configurado: 500 e nada chamado', async () => {
    m.variavel.mockImplementation(() => {
      throw new Error('Falta')
    })
    const r = await chamar('Bearer qualquer')
    expect(r.status).toBe(500)
    nadaChamado()
  })

  it('cada caso chama a funcao certa e a resposta traz so as contagens', async () => {
    m.pagamentosAReconciliar.mockResolvedValue([
      { tentativa: 'a', mpPedidoId: 'ORD-A', status: 'pendente' },
      { tentativa: 'b', mpPedidoId: null, status: 'pendente' },
      { tentativa: 'c', mpPedidoId: 'ORD-C', status: 'a_estornar' },
      { tentativa: 'd', mpPedidoId: null, status: 'a_estornar' },
    ])
    m.tentativasACancelarNoMp.mockResolvedValue([
      { tentativa: 'e', mpPedidoId: 'ORD-E' },
      { tentativa: 'f', mpPedidoId: 'ORD-F' },
    ])
    const r = await chamar('Bearer segredo-da-tarefa')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ conferidas: 3, canceladas: 2, falhas: 1 })
    expect(m.sincronizarTentativa).toHaveBeenCalledWith('a', 'ORD-A')
    expect(m.aplicarPagamento).toHaveBeenCalledTimes(1)
    expect(m.aplicarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({
        tentativa: 'b',
        mpPedidoId: null,
        status: 'cancelado',
        detalhe: 'sem_pedido_no_mp',
        valorCentavos: 0,
      }),
    )
    expect(m.estornarNoMp).toHaveBeenCalledTimes(1)
    expect(m.estornarNoMp).toHaveBeenCalledWith('c', 'ORD-C')
    expect(m.cancelarNoMp).toHaveBeenCalledWith('e', 'ORD-E')
    expect(m.cancelarNoMp).toHaveBeenCalledWith('f', 'ORD-F')
    expect(m.registrarFalha).toHaveBeenCalledTimes(1)
  })

  it('um item que lanca ou devolve null nao para os outros e conta como falha', async () => {
    m.pagamentosAReconciliar.mockResolvedValue([
      { tentativa: 'a', mpPedidoId: 'ORD-A', status: 'pendente' },
      { tentativa: 'b', mpPedidoId: 'ORD-B', status: 'pendente' },
      { tentativa: 'c', mpPedidoId: 'ORD-C', status: 'pendente' },
    ])
    m.tentativasACancelarNoMp.mockResolvedValue([
      { tentativa: 'e', mpPedidoId: 'ORD-E' },
      { tentativa: 'f', mpPedidoId: 'ORD-F' },
    ])
    m.sincronizarTentativa.mockRejectedValueOnce(new Error('banco')).mockResolvedValueOnce(null)
    m.cancelarNoMp.mockResolvedValueOnce(null)
    const r = await chamar('Bearer segredo-da-tarefa')
    expect(await r.json()).toEqual({ conferidas: 1, canceladas: 1, falhas: 3 })
    expect(m.sincronizarTentativa).toHaveBeenCalledTimes(3)
    expect(m.cancelarNoMp).toHaveBeenCalledTimes(2)
    expect(m.registrarFalha).toHaveBeenCalledTimes(3)
  })

  it('a lista que lanca responde 500 sem corpo', async () => {
    m.pagamentosAReconciliar.mockRejectedValue(new Error('banco'))
    const r = await chamar('Bearer segredo-da-tarefa')
    expect(r.status).toBe(500)
    expect(await r.text()).toBe('')
  })

  it('depois dos 50 s nao comeca itens novos', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    m.pagamentosAReconciliar.mockResolvedValue([
      { tentativa: 'a', mpPedidoId: 'ORD-A', status: 'pendente' },
      { tentativa: 'b', mpPedidoId: 'ORD-B', status: 'pendente' },
    ])
    m.tentativasACancelarNoMp.mockResolvedValue([{ tentativa: 'e', mpPedidoId: 'ORD-E' }])
    m.sincronizarTentativa.mockImplementation(async () => {
      vi.setSystemTime(51_000)
      return ok
    })
    const r = await chamar('Bearer segredo-da-tarefa')
    expect(await r.json()).toEqual({ conferidas: 1, canceladas: 0, falhas: 0 })
    expect(m.sincronizarTentativa).toHaveBeenCalledTimes(1)
    expect(m.cancelarNoMp).not.toHaveBeenCalled()
  })
})
