// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** As funcoes de pagamento com clientes falsos: a tabela ou funcao, os parametros e a forma devolvida. */

type Resposta = { data: unknown; error: unknown; status: number }
const m = vi.hoisted(() => ({
  chamadas: [] as unknown[][],
  resposta: { data: null, error: null, status: 200 } as Resposta,
  fila: [] as Resposta[],
}))

vi.mock('@/lib/auth/servidor', () => ({
  criarClienteServidor: async () => {
    const cadeia: Record<string, unknown> = {}
    for (const nome of ['select', 'eq', 'order', 'limit']) {
      cadeia[nome] = (...a: unknown[]) => (m.chamadas.push([nome, ...a]), cadeia)
    }
    cadeia.maybeSingle = async () => (m.chamadas.push(['maybeSingle']), m.fila.shift() ?? m.resposta)
    return {
      from: (t: string) => (m.chamadas.push(['from', t]), cadeia),
      rpc: async (fn: string, p: unknown) => (m.chamadas.push(['rpc', fn, p]), m.resposta),
    }
  },
}))
vi.mock('@/lib/auth/admin', () => ({
  criarClienteAdmin: () => ({
    schema: (nome: string) => {
      m.chamadas.push(['schema', nome])
      return { rpc: async (fn: string, p: unknown) => (m.chamadas.push(['rpc', fn, p]), m.resposta) }
    },
  }),
}))
vi.mock('@/lib/dados/erros', async (original) => ({
  ...(await original<typeof import('@/lib/dados/erros')>()),
  registrarFalha: vi.fn(),
}))

import { ErroDeRegra } from '@/lib/dados/erros'
import { iniciarPagamento, lerPedidoParaPagar, lerUltimaTentativa } from '@/lib/dados/fechamento'
import {
  aplicarPagamento,
  concluirEventoWebhook,
  mpPedidoDaTentativa,
  pagamentosAReconciliar,
  registrarEventoWebhook,
  tentativasACancelarDaCliente,
  tentativasACancelarNoMp,
} from '@/lib/dados/pagamentos'

const rpc = () => m.chamadas.find((c) => c[0] === 'rpc')
const responder = (data: unknown, error: unknown = null, status = 200) => {
  m.resposta = { data, error, status }
}

beforeEach(() => {
  m.chamadas = []
  m.fila = []
  responder(null)
})

describe('lerPedidoParaPagar', () => {
  it('numero fora do formato devolve null sem ir ao banco', async () => {
    expect(await lerPedidoParaPagar('nao-e-numero')).toBeNull()
    expect(m.chamadas).toEqual([])
  })
  it('le o pedido pelo numero e devolve a forma da interface', async () => {
    responder({ id: 'p1', total_centavos: 2880, status: 'aguardando_pagamento' })
    expect(await lerPedidoParaPagar('AMO-ABCDEFGH')).toEqual({ id: 'p1', totalCentavos: 2880, estado: 'aguardando_pagamento' })
    expect(m.chamadas).toContainEqual(['from', 'pedidos'])
    expect(m.chamadas).toContainEqual(['eq', 'numero', 'AMO-ABCDEFGH'])
  })
  it('pedido que nao e dela: null', async () => {
    expect(await lerPedidoParaPagar('AMO-ABCDEFGH')).toBeNull()
  })
  it('erro do banco sobe', async () => {
    responder(null, { code: '42501' }, 403)
    await expect(lerPedidoParaPagar('AMO-ABCDEFGH')).rejects.toThrow('Falha no banco (pedidos): 42501')
  })
})

describe('iniciarPagamento', () => {
  it('chama public.iniciar_pagamento e devolve o id', async () => {
    responder('t1')
    expect(await iniciarPagamento('p1', 'pix')).toBe('t1')
    expect(rpc()).toEqual(['rpc', 'iniciar_pagamento', { p_pedido: 'p1', p_forma: 'pix' }])
  })
  it('P0001 vira ErroDeRegra com o codigo', async () => {
    responder(null, { code: 'P0001', message: 'muitas_tentativas' })
    await expect(iniciarPagamento('p1', 'cartao')).rejects.toMatchObject({ codigo: 'muitas_tentativas' })
    await expect(iniciarPagamento('p1', 'cartao')).rejects.toBeInstanceOf(ErroDeRegra)
  })
  it('resposta sem id e falha', async () => {
    responder(null)
    await expect(iniciarPagamento('p1', 'pix')).rejects.toThrow('Falha no banco (iniciar_pagamento)')
  })
})

describe('lerUltimaTentativa', () => {
  const linha = (status: string) => ({
    id: 't1', forma: 'pix', status, recusa: null, pix_copia_e_cola: '0002', pix_qr_base64: 'abc',
    pix_expira_em: '2026-11-21T12:00:00Z', criado_em: '2026-11-21T11:30:00Z',
  })
  const vazia: Resposta = { data: null, error: null, status: 200 }
  it('sem aprovada, a mais recente, na forma da interface', async () => {
    m.fila = [vazia, { data: linha('pendente'), error: null, status: 200 }]
    expect(await lerUltimaTentativa('p1')).toEqual({
      id: 't1', forma: 'pix', status: 'pendente', recusa: null, pixCopiaECola: '0002', pixQrBase64: 'abc',
      pixExpiraEm: '2026-11-21T12:00:00Z', criadoEm: '2026-11-21T11:30:00Z',
    })
    expect(m.chamadas).toContainEqual(['from', 'pagamentos'])
    expect(m.chamadas).toContainEqual(['eq', 'pedido_id', 'p1'])
    expect(m.chamadas).toContainEqual(['order', 'criado_em', { ascending: false }])
    expect(m.chamadas).toContainEqual(['limit', 1])
    expect(m.chamadas.filter((c) => c[0] === 'maybeSingle')).toHaveLength(2)
  })
  it('a aprovada vem antes da mais recente (a que pagou, nao a cancelada ou estornada depois)', async () => {
    m.fila = [{ data: linha('aprovado'), error: null, status: 200 }, { data: linha('estornado'), error: null, status: 200 }]
    expect((await lerUltimaTentativa('p1'))?.status).toBe('aprovado')
    expect(m.chamadas).toContainEqual(['eq', 'status', 'aprovado'])
    expect(m.chamadas.filter((c) => c[0] === 'maybeSingle')).toHaveLength(1)
  })
  it('erro do banco ao procurar a aprovada sobe', async () => {
    m.fila = [{ data: null, error: { code: 'XX000' }, status: 500 }]
    await expect(lerUltimaTentativa('p1')).rejects.toThrow('Falha no banco (pagamentos): XX000')
  })
  it('sem tentativa: null', async () => {
    expect(await lerUltimaTentativa('p1')).toBeNull()
  })
  it('erro do banco sobe', async () => {
    responder(null, { code: 'XX000' }, 500)
    await expect(lerUltimaTentativa('p1')).rejects.toThrow('Falha no banco (pagamentos): XX000')
  })
})

describe('aplicarPagamento', () => {
  const base = { tentativa: 't1', mpPedidoId: 'ORD1', mpPagamentoId: 'PAY1', status: 'aprovado' as const, detalhe: 'accredited', valorCentavos: 2880 }
  it('manda todos os parametros, com null no que nao veio', async () => {
    responder([{ pagamento_status: 'aprovado', pedido_status: 'pago' }])
    expect(await aplicarPagamento(base)).toEqual({ tentativa: 'aprovado', pedido: 'pago' })
    expect(m.chamadas[0]).toEqual(['schema', 'privado'])
    expect(rpc()).toEqual(['rpc', 'aplicar_pagamento', {
      p_pagamento: 't1', p_mp_pedido_id: 'ORD1', p_mp_pagamento_id: 'PAY1', p_status: 'aprovado', p_detalhe: 'accredited',
      p_valor_centavos: 2880, p_cartao_bandeira: null, p_cartao_final: null, p_parcelas: null,
      p_pix_copia_e_cola: null, p_pix_qr_base64: null, p_pix_expira_em: null, p_recusa: null,
    }])
  })
  it('manda o que veio', async () => {
    responder([{ pagamento_status: 'recusado', pedido_status: 'aguardando_pagamento' }])
    await aplicarPagamento({ ...base, status: 'recusado', bandeira: 'visa', final: '4242', parcelas: 1, recusa: 'cc_rejected_other_reason' })
    expect(rpc()?.[2]).toMatchObject({ p_cartao_bandeira: 'visa', p_cartao_final: '4242', p_parcelas: 1, p_recusa: 'cc_rejected_other_reason' })
  })
  it('P0001 vira ErroDeRegra', async () => {
    responder(null, { code: 'P0001', message: 'passagem_invalida' })
    await expect(aplicarPagamento(base)).rejects.toMatchObject({ codigo: 'passagem_invalida' })
  })
  it('outro erro vira falha com o codigo', async () => {
    responder(null, { code: '57014' }, 500)
    await expect(aplicarPagamento(base)).rejects.toThrow('Falha no banco (aplicar_pagamento): 57014')
  })
  it('sem codigo, o status HTTP', async () => {
    responder(null, {}, 502)
    await expect(aplicarPagamento(base)).rejects.toThrow('Falha no banco (aplicar_pagamento): HTTP 502')
  })
  it('resposta fora da forma e falha', async () => {
    responder([])
    await expect(aplicarPagamento(base)).rejects.toThrow('Falha no banco (aplicar_pagamento)')
  })
})

describe('tentativasACancelarNoMp', () => {
  it('sem pedido manda p_pedido nulo e traduz as colunas', async () => {
    responder([{ pagamento_id: 't1', mp_pedido_id: 'ORD1' }])
    expect(await tentativasACancelarNoMp()).toEqual([{ tentativa: 't1', mpPedidoId: 'ORD1' }])
    expect(rpc()).toEqual(['rpc', 'pagamentos_a_cancelar_no_mp', { p_pedido: null }])
  })
  it('com pedido manda o id', async () => {
    responder([])
    expect(await tentativasACancelarNoMp('p1')).toEqual([])
    expect(rpc()?.[2]).toEqual({ p_pedido: 'p1' })
  })
  it('erro do banco sobe', async () => {
    responder(null, { code: '42501' }, 403)
    await expect(tentativasACancelarNoMp()).rejects.toThrow('Falha no banco (pagamentos_a_cancelar_no_mp): 42501')
  })
})

describe('tentativasACancelarDaCliente', () => {
  it('manda o id da cliente e traduz as colunas', async () => {
    responder([{ pagamento_id: 't1', mp_pedido_id: 'ORD1' }])
    expect(await tentativasACancelarDaCliente('u1')).toEqual([{ tentativa: 't1', mpPedidoId: 'ORD1' }])
    expect(m.chamadas).toContainEqual(['schema', 'privado'])
    expect(rpc()).toEqual(['rpc', 'tentativas_a_cancelar_da_cliente', { p_usuario: 'u1' }])
  })
  it('linha fora da forma fica de fora', async () => {
    responder([{ pagamento_id: 't1', mp_pedido_id: null }, { pagamento_id: 2, mp_pedido_id: 'ORD2' }, { pagamento_id: 't3', mp_pedido_id: 'ORD3' }])
    expect(await tentativasACancelarDaCliente('u1')).toEqual([{ tentativa: 't3', mpPedidoId: 'ORD3' }])
  })
  it('erro do banco sobe', async () => {
    responder(null, { code: '42501' }, 403)
    await expect(tentativasACancelarDaCliente('u1')).rejects.toThrow('Falha no banco (tentativas_a_cancelar_da_cliente): 42501')
  })
})

describe('mpPedidoDaTentativa', () => {
  it('devolve o id', async () => {
    responder('ORD1')
    expect(await mpPedidoDaTentativa('t1')).toBe('ORD1')
    expect(rpc()).toEqual(['rpc', 'mp_pedido_da_tentativa', { p_pagamento: 't1' }])
  })
  it('sem linha: null', async () => {
    expect(await mpPedidoDaTentativa('t1')).toBeNull()
  })
  it('erro do banco sobe', async () => {
    responder(null, { code: '42501' }, 403)
    await expect(mpPedidoDaTentativa('t1')).rejects.toThrow('Falha no banco (mp_pedido_da_tentativa): 42501')
  })
})

describe('pagamentosAReconciliar', () => {
  it('traduz as colunas', async () => {
    responder([{ pagamento_id: 't1', mp_pedido_id: null, status: 'pendente' }])
    expect(await pagamentosAReconciliar()).toEqual([{ tentativa: 't1', mpPedidoId: null, status: 'pendente' }])
    expect(rpc()).toEqual(['rpc', 'pagamentos_a_reconciliar', {}])
  })
  it('erro do banco sobe', async () => {
    responder(null, { code: '42501' }, 403)
    await expect(pagamentosAReconciliar()).rejects.toThrow('Falha no banco (pagamentos_a_reconciliar): 42501')
  })
})

describe('avisos do webhook', () => {
  it('registra com a origem mercadopago', async () => {
    responder([{ evento: 7, situacao: 'novo' }])
    expect(await registrarEventoWebhook({ eventoId: 'e1', tipo: 'order', recursoId: 'ORD1' })).toEqual({ evento: 7, situacao: 'novo' })
    expect(rpc()).toEqual(['rpc', 'registrar_evento_webhook', { p_origem: 'mercadopago', p_evento_id: 'e1', p_tipo: 'order', p_recurso_id: 'ORD1' }])
  })
  it('tipo e recurso nulos seguem nulos', async () => {
    responder([{ evento: 8, situacao: 'ja_tratado' }])
    await registrarEventoWebhook({ eventoId: 'e2', tipo: null, recursoId: null })
    expect(rpc()?.[2]).toMatchObject({ p_tipo: null, p_recurso_id: null })
  })
  it('erro do banco sobe', async () => {
    responder(null, { code: '23514' }, 400)
    await expect(registrarEventoWebhook({ eventoId: 'x', tipo: null, recursoId: null })).rejects.toThrow('Falha no banco (registrar_evento_webhook): 23514')
  })
  it('conclui com o erro (ou nulo)', async () => {
    await concluirEventoWebhook(7, null)
    await concluirEventoWebhook(7, 'falhou')
    const chamadas = m.chamadas.filter((c) => c[0] === 'rpc')
    expect(chamadas[0]).toEqual(['rpc', 'concluir_evento_webhook', { p_evento: 7, p_erro: null }])
    expect(chamadas[1]?.[2]).toEqual({ p_evento: 7, p_erro: 'falhou' })
  })
  it('erro ao concluir sobe', async () => {
    responder(null, { code: '42501' }, 403)
    await expect(concluirEventoWebhook(7, null)).rejects.toThrow('Falha no banco (concluir_evento_webhook): 42501')
  })
})
