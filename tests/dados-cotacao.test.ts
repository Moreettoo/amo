// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** registrarCotacao com um cliente admin falso: o schema, a funcao e os parametros. */

const m = vi.hoisted(() => ({
  schema: vi.fn(),
  rpc: vi.fn(),
  resposta: { data: 'cotacao-1', error: null, status: 200 } as { data: unknown; error: unknown; status: number },
}))

vi.mock('@/lib/auth/admin', () => ({
  criarClienteAdmin: () => ({
    schema: (nome: string) => {
      m.schema(nome)
      return { rpc: async (fn: string, params: unknown) => (m.rpc(fn, params), m.resposta) }
    },
  }),
}))
vi.mock('@/lib/dados/erros', async (original) => ({
  ...(await original<typeof import('@/lib/dados/erros')>()),
  registrarFalha: vi.fn(),
}))

import { registrarCotacao } from '@/lib/dados/cotacao'

const cotacao = {
  usuarioId: 'usuario-1',
  valorCentavos: 880,
  minutos: 34,
  cep: '03183002',
  logradouro: 'Rua Cuiabá',
  numero: '120',
  complemento: 'ap 4',
  bairro: 'Alto da Mooca',
  cidade: 'São Paulo',
  uf: 'SP',
}

beforeEach(() => {
  m.schema.mockClear()
  m.rpc.mockClear()
  m.resposta = { data: 'cotacao-1', error: null, status: 200 }
})

describe('registrarCotacao', () => {
  it('chama privado.registrar_cotacao com os parametros certos e devolve o id', async () => {
    expect(await registrarCotacao(cotacao)).toBe('cotacao-1')
    expect(m.schema).toHaveBeenCalledWith('privado')
    expect(m.rpc).toHaveBeenCalledWith('registrar_cotacao', {
      p_user_id: 'usuario-1',
      p_cep: '03183002',
      p_logradouro: 'Rua Cuiabá',
      p_numero: '120',
      p_complemento: 'ap 4',
      p_bairro: 'Alto da Mooca',
      p_cidade: 'São Paulo',
      p_uf: 'SP',
      p_valor_centavos: 880,
      p_minutos: 34,
      p_origem: 'exemplo',
      p_uber_cotacao_id: null,
    })
  })

  it('deslogada vai com p_user_id nulo', async () => {
    await registrarCotacao({ ...cotacao, usuarioId: null })
    expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_user_id: null })
  })

  it('erro do banco vira falha com o codigo, sem a mensagem crua', async () => {
    m.resposta = { data: null, error: { code: '23514', message: 'detalhe cru' }, status: 400 }
    await expect(registrarCotacao(cotacao)).rejects.toThrow('Falha no banco (registrar_cotacao): 23514')
  })
})
