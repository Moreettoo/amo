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
  criarCorridasPendentes: vi.fn(),
  cancelarCorridasPedidas: vi.fn(),
  conferirCorrida: vi.fn(),
  corridasAConferir: vi.fn(),
  escalarCancelamentosIncertos: vi.fn(),
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
  criarCorridasPendentes: m.criarCorridasPendentes,
  cancelarCorridasPedidas: m.cancelarCorridasPedidas,
  conferirCorrida: m.conferirCorrida,
}))
vi.mock('@/lib/dados/entregas', () => ({
  corridasAConferir: m.corridasAConferir,
  escalarCancelamentosIncertos: m.escalarCancelamentosIncertos,
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
  m.criarCorridasPendentes.mockResolvedValue({ criadas: 0, falhas: 0 })
  m.cancelarCorridasPedidas.mockResolvedValue({ canceladas: 0, falhas: 0 })
  m.escalarCancelamentosIncertos.mockResolvedValue(0)
  m.corridasAConferir.mockResolvedValue([])
  m.conferirCorrida.mockResolvedValue(true)
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
    expect(await r.json()).toMatchObject({ conferidas: 3, canceladas: 2, falhas: 1 })
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
    expect(await r.json()).toMatchObject({ conferidas: 1, canceladas: 1, falhas: 3 })
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
    expect(await r.json()).toMatchObject({ conferidas: 1, canceladas: 0, falhas: 0 })
    expect(m.sincronizarTentativa).toHaveBeenCalledTimes(1)
    expect(m.cancelarNoMp).not.toHaveBeenCalled()
  })

  describe('as corridas da Uber', () => {
    const SEGREDO = 'Bearer segredo-da-tarefa'
    const zero = { criadas: 0, canceladas: 0, conferidas: 0, incertas: 0, falhas: 0 }

    it('chama as listas na ordem, depois do Mercado Pago, e conta', async () => {
      const ordem: string[] = []
      m.pagamentosAReconciliar.mockImplementation(async () => (ordem.push('mp'), []))
      m.criarCorridasPendentes.mockImplementation(async () => (ordem.push('criar'), { criadas: 2, falhas: 1 }))
      m.cancelarCorridasPedidas.mockImplementation(async () => (ordem.push('cancelar'), { canceladas: 3, falhas: 0 }))
      m.escalarCancelamentosIncertos.mockImplementation(async () => (ordem.push('escalar'), 4))
      m.corridasAConferir.mockImplementation(async () => (ordem.push('lista'), ['del_1', 'del_2']))
      m.conferirCorrida.mockImplementation(async (id: string) => (ordem.push(id), true))
      const r = await chamar(SEGREDO)
      expect(ordem).toEqual(['mp', 'criar', 'cancelar', 'escalar', 'lista', 'del_1', 'del_2'])
      expect(m.criarCorridasPendentes).toHaveBeenCalledWith(5)
      const corpo = await r.json()
      expect(corpo.corridas).toEqual({ criadas: 2, canceladas: 3, conferidas: 2, incertas: 4, falhas: 1 })
      expect(corpo).toMatchObject({ conferidas: 0, canceladas: 0 })
    })

    it('sem trabalho: tudo zero', async () => {
      const r = await chamar(SEGREDO)
      expect((await r.json()).corridas).toEqual(zero)
    })

    it('falha da Uber conta em falhas e nao derruba o Mercado Pago nem a resposta', async () => {
      m.pagamentosAReconciliar.mockResolvedValue([{ tentativa: 'a', mpPedidoId: 'ORD-A', status: 'pendente' }])
      m.criarCorridasPendentes.mockRejectedValue(new Error('x'))
      m.cancelarCorridasPedidas.mockRejectedValue(new Error('x'))
      m.escalarCancelamentosIncertos.mockRejectedValue(new Error('x'))
      m.corridasAConferir.mockResolvedValue(['del_1', 'del_2'])
      m.conferirCorrida.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('x'))
      const r = await chamar(SEGREDO)
      expect(r.status).toBe(200)
      const corpo = await r.json()
      expect(corpo.conferidas).toBe(1)
      expect(corpo.corridas).toEqual({ ...zero, falhas: 5 })
      expect(corpo.falhas).toBe(5)
      expect(m.conferirCorrida).toHaveBeenCalledTimes(2)
    })

    it('falhas devolvidas pelos passos entram na conta', async () => {
      m.criarCorridasPendentes.mockResolvedValue({ criadas: 0, falhas: 2 })
      m.cancelarCorridasPedidas.mockResolvedValue({ canceladas: 1, falhas: 1 })
      const corpo = await (await chamar(SEGREDO)).json()
      expect(corpo.corridas).toEqual({ ...zero, canceladas: 1, falhas: 3 })
      expect(corpo.falhas).toBe(3)
    })

    it('a lista de conferir que lanca conta uma falha e nao quebra', async () => {
      m.corridasAConferir.mockRejectedValue(new Error('banco'))
      const r = await chamar(SEGREDO)
      expect(r.status).toBe(200)
      expect((await r.json()).corridas.falhas).toBe(1)
    })

    it('prazo estourado no meio para sem lancar e devolve o que fez', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      m.criarCorridasPendentes.mockImplementation(async () => {
        vi.setSystemTime(51_000)
        return { criadas: 1, falhas: 0 }
      })
      const r = await chamar(SEGREDO)
      expect(r.status).toBe(200)
      expect((await r.json()).corridas).toEqual({ ...zero, criadas: 1 })
      expect(m.cancelarCorridasPedidas).not.toHaveBeenCalled()
      expect(m.escalarCancelamentosIncertos).not.toHaveBeenCalled()
      expect(m.conferirCorrida).not.toHaveBeenCalled()
    })

    it('prazo estourado no meio das conferencias para antes da proxima', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      m.corridasAConferir.mockResolvedValue(['del_1', 'del_2', 'del_3'])
      m.conferirCorrida.mockImplementation(async () => {
        vi.setSystemTime(51_000)
        return true
      })
      const r = await chamar(SEGREDO)
      expect((await r.json()).corridas.conferidas).toBe(1)
      expect(m.conferirCorrida).toHaveBeenCalledTimes(1)
    })

    it('prazo estourado no Mercado Pago pula a Uber inteira', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      m.pagamentosAReconciliar.mockResolvedValue([{ tentativa: 'a', mpPedidoId: 'ORD-A', status: 'pendente' }])
      m.sincronizarTentativa.mockImplementation(async () => {
        vi.setSystemTime(51_000)
        return ok
      })
      const r = await chamar(SEGREDO)
      expect((await r.json()).corridas).toEqual(zero)
      expect(m.criarCorridasPendentes).not.toHaveBeenCalled()
    })

    it('lista do Mercado Pago que lanca continua 500 e nao chama a Uber', async () => {
      m.pagamentosAReconciliar.mockRejectedValue(new Error('banco'))
      expect((await chamar(SEGREDO)).status).toBe(500)
      expect(m.criarCorridasPendentes).not.toHaveBeenCalled()
    })
  })
})
