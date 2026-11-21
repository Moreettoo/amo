// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HOSTIS } from './fixtures/hostis'

/** Fechar o pedido no servidor, sem banco: sessao, campos, codigos e o que volta. */

const m = vi.hoisted(() => ({ obterUsuario: vi.fn(), rpc: vi.fn() }))

vi.mock('@/lib/auth', () => ({ obterUsuario: m.obterUsuario }))
vi.mock('@/lib/auth/servidor', () => ({ criarClienteServidor: async () => ({ rpc: m.rpc }) }))
vi.mock('@/lib/dados/cep', () => ({ buscarCep: vi.fn() }))
vi.mock('@/lib/dados/limites', () => ({ consumirLimite: vi.fn() }))
vi.mock('@/lib/auth/admin', () => ({
  criarClienteAdmin: () => ({ schema: () => ({ rpc: async () => ({ data: [], error: null, status: 200 }) }) }),
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

import { fecharPedido } from '@/app/sacola/acoes'

const UUID = '3f2b8c1e-9a4d-4e7b-8c11-0d5e6f7a8b9c'
const valida = { itens: [{ produto: 'ninho-com-morango', quantos: 2 }, { produto: 'pistache', quantos: 1 }], cotacao: UUID, totalVisto: 12990, guardarEndereco: true }
const doBanco = (message: string) => ({ data: null, error: { code: 'P0001', message }, status: 400 })

beforeEach(() => {
  m.obterUsuario.mockReset().mockResolvedValue({ id: 'u1' })
  m.rpc.mockReset().mockResolvedValue({ data: [{ id: 'pedido-id', numero: 'AMO-0001', total_centavos: 12990 }], error: null, status: 200 })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('sessao', () => {
  it('deslogada: sem_sessao, sem chamar o banco', async () => {
    m.obterUsuario.mockResolvedValue(null)
    expect(await fecharPedido(valida)).toEqual({ ok: false, erro: 'sem_sessao' })
    expect(m.rpc).not.toHaveBeenCalled()
  })
})

describe('campos', () => {
  const recusa = async (entrada: unknown) => {
    expect(await fecharPedido(entrada)).toEqual({ ok: false, erro: 'campos_invalidos' })
    expect(m.rpc).not.toHaveBeenCalled()
  }
  const item = (produto: string, quantos = 1) => ({ produto, quantos })

  it('entrada que nao e objeto', async () => {
    for (const x of [null, undefined, 'x', 3, []]) await recusa(x)
  })
  it('itens', async () => {
    for (const itens of ['x', null, {}, [], Array.from({ length: 31 }, (_, i) => item(`p${i}`)), [item('a'), item('a')]]) {
      await recusa({ ...valida, itens })
    }
  })
  it('produto fora do formato ou longo demais', async () => {
    for (const p of ['A', 'a--b', '-a', 'a-', 'a b', 'a_b', '', 'a'.repeat(81), ...HOSTIS]) {
      await recusa({ ...valida, itens: [item(p)] })
    }
    expect((await fecharPedido({ ...valida, itens: [item('a'.repeat(80))] })).ok).toBe(true)
  })
  it('quantos', async () => {
    for (const q of [0, 21, 1.5, '3', NaN, -1, null]) await recusa({ ...valida, itens: [{ produto: 'a', quantos: q }] })
  })
  it('item com chave a mais ou faltando', async () => {
    await recusa({ ...valida, itens: [{ produto: 'a', quantos: 1, preco: 1 }] })
    await recusa({ ...valida, itens: [{ produto: 'a' }] })
    await recusa({ ...valida, itens: [null] })
  })
  it('cotacao', async () => {
    for (const c of ['', 'x', UUID + 'a', 3, null, undefined, ...HOSTIS]) await recusa({ ...valida, cotacao: c })
  })
  it('totalVisto', async () => {
    for (const t of [0, -5, 10000001, 1.5, '100', NaN, null, undefined]) await recusa({ ...valida, totalVisto: t })
    expect((await fecharPedido({ ...valida, totalVisto: 10000000 })).ok).toBe(true)
  })
  it('guardarEndereco', async () => {
    for (const g of ['true', 1, null, undefined]) await recusa({ ...valida, guardarEndereco: g })
  })
})

describe('codigos do banco', () => {
  it.each(['email_nao_confirmado', 'loja_fechada', 'produto_indisponivel', 'muitos_pedidos', 'total_mudou', 'sem_sessao'])(
    '%s passa com o mesmo nome',
    async (codigo) => {
      m.rpc.mockResolvedValue(doBanco(codigo))
      expect(await fecharPedido(valida)).toEqual({ ok: false, erro: codigo })
    },
  )
  it('cotacao_invalida e cotacao_vencida viram cotacao_vencida', async () => {
    for (const c of ['cotacao_invalida', 'cotacao_vencida']) {
      m.rpc.mockResolvedValue(doBanco(c))
      expect(await fecharPedido(valida)).toEqual({ ok: false, erro: 'cotacao_vencida' })
    }
  })
  it('itens_invalidos vira campos_invalidos', async () => {
    m.rpc.mockResolvedValue(doBanco('itens_invalidos'))
    expect(await fecharPedido(valida)).toEqual({ ok: false, erro: 'campos_invalidos' })
  })
  it('qualquer outro erro: tente_de_novo', async () => {
    m.rpc.mockResolvedValue(doBanco('coisa_estranha'))
    expect(await fecharPedido(valida)).toEqual({ ok: false, erro: 'tente_de_novo' })
    m.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'x' }, status: 403 })
    expect(await fecharPedido(valida)).toEqual({ ok: false, erro: 'tente_de_novo' })
    m.rpc.mockRejectedValue(new Error('x'))
    expect(await fecharPedido(valida)).toEqual({ ok: false, erro: 'tente_de_novo' })
    m.rpc.mockResolvedValue({ data: [], error: null, status: 200 })
    expect(await fecharPedido(valida)).toEqual({ ok: false, erro: 'tente_de_novo' })
  })
})

describe('sucesso', () => {
  it('leva so os quatro parametros e devolve sem o id', async () => {
    const r = await fecharPedido(valida)
    expect(m.rpc).toHaveBeenCalledWith('criar_pedido', {
      p_itens: valida.itens,
      p_cotacao: UUID,
      p_total_visto: 12990,
      p_guardar_endereco: true,
    })
    expect(r).toEqual({ ok: true, pedido: { numero: 'AMO-0001', totalCentavos: 12990 } })
  })
})
