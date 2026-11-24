// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** As funcoes da corrida com o cliente da chave secreta falso: a funcao, os parametros e a forma devolvida. */

type Resposta = { data: unknown; error: unknown; status: number }
const m = vi.hoisted(() => ({
  chamadas: [] as unknown[][],
  resposta: { data: null, error: null, status: 200 } as Resposta,
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
import {
  aplicarEntrega,
  corridaCancelada,
  corridasACancelar,
  corridasAConferir,
  guardarTokenUber,
  lerTokenUber,
  marcarCorridaCriada,
  marcarCorridaFalhou,
  remarcarEntrega,
  reservarCorridas,
  reservarRenovacaoToken,
} from '@/lib/dados/entregas'

const rpc = () => m.chamadas.find((c) => c[0] === 'rpc')
const responder = (data: unknown, error: unknown = null, status = 200) => {
  m.resposta = { data, error, status }
}

beforeEach(() => {
  m.chamadas = []
  responder(null)
})

const linhaReservada = {
  pedido: 'p1',
  numero: 'AMO-ABCDEFGH',
  chave: 'c1',
  cliente_nome: 'Ana Souza',
  cliente_celular: '11987654321',
  cep: '04567000',
  logradouro: 'Rua Siqueira Bueno',
  numero_casa: '120',
  complemento: 'ap 52',
  bairro: 'Belenzinho',
  cidade: 'São Paulo',
  uf: 'SP',
  modo: 'agendado',
  janela_inicio: '2026-11-25T15:00:00+00:00',
  janela_fim: '2026-11-25T16:00:00+00:00',
  subtotal_centavos: 1890,
  frete_centavos: 990,
  origem: 'uber',
  uber_cotacao_id: 'dqt_abc',
  cotacao_expira_em: '2026-11-24T12:15:00.123456+00:00',
  itens: [{ nome: 'Prestígio', quantos: 1, preco_centavos: 1890 }],
}

describe('reservarCorridas', () => {
  it('manda o maximo e traduz a linha, com datas em ISO', async () => {
    responder([linhaReservada])
    expect(await reservarCorridas(5)).toEqual([
      {
        pedido: 'p1',
        numero: 'AMO-ABCDEFGH',
        chave: 'c1',
        clienteNome: 'Ana Souza',
        clienteCelular: '11987654321',
        cep: '04567000',
        logradouro: 'Rua Siqueira Bueno',
        numeroCasa: '120',
        complemento: 'ap 52',
        bairro: 'Belenzinho',
        cidade: 'São Paulo',
        uf: 'SP',
        modo: 'agendado',
        janelaInicio: '2026-11-25T15:00:00.000Z',
        janelaFim: '2026-11-25T16:00:00.000Z',
        subtotalCentavos: 1890,
        freteCentavos: 990,
        origem: 'uber',
        uberCotacaoId: 'dqt_abc',
        cotacaoExpiraEm: '2026-11-24T12:15:00.123Z',
        itens: [{ nome: 'Prestígio', quantos: 1, precoCentavos: 1890 }],
      },
    ])
    expect(m.chamadas[0]).toEqual(['schema', 'privado'])
    expect(rpc()).toEqual(['rpc', 'reservar_corridas', { p_maximo: 5 }])
  })
  it('agora sem faixa, sem cotacao e com retrato apagado: nulos', async () => {
    responder([{
      ...linhaReservada, modo: 'agora', janela_inicio: null, janela_fim: null, origem: null, uber_cotacao_id: null,
      cotacao_expira_em: null, cliente_nome: null, cliente_celular: null, logradouro: null, numero_casa: null, complemento: null,
    }])
    expect(await reservarCorridas(1)).toEqual([expect.objectContaining({
      modo: 'agora', janelaInicio: null, janelaFim: null, origem: null, uberCotacaoId: null, cotacaoExpiraEm: null,
      clienteNome: null, clienteCelular: null, logradouro: null, numeroCasa: null, complemento: null,
    })])
  })
  it('nada a reservar: lista vazia', async () => {
    responder([])
    expect(await reservarCorridas(5)).toEqual([])
  })
  it.each([
    ['sem lista', null],
    ['modo inventado', [{ ...linhaReservada, modo: 'amanha' }]],
    ['data torta', [{ ...linhaReservada, janela_inicio: 'ontem' }]],
    ['valor em texto', [{ ...linhaReservada, frete_centavos: '990' }]],
    ['itens sem lista', [{ ...linhaReservada, itens: null }]],
    ['item torto', [{ ...linhaReservada, itens: [{ nome: 'Prestígio', quantos: '1', preco_centavos: 1890 }] }]],
    ['sem chave', [{ ...linhaReservada, chave: null }]],
    ['origem inventada', [{ ...linhaReservada, origem: 'outra' }]],
  ])('resposta torta (%s) e falha', async (_, data) => {
    responder(data)
    await expect(reservarCorridas(5)).rejects.toThrow('Falha no banco (reservar_corridas)')
  })
  it('erro do banco sobe com o codigo', async () => {
    responder(null, { code: '42501' }, 403)
    await expect(reservarCorridas(5)).rejects.toThrow('Falha no banco (reservar_corridas): 42501')
  })
})

describe('marcarCorridaCriada', () => {
  const a = { pedido: 'p1', uberEntregaId: 'del_1', valorUberCentavos: 1234, rastreioUrl: 'https://direct-order.uber.com/o/1', statusUber: 'pending' }
  it('manda os parametros e devolve o estado', async () => {
    responder('criada')
    expect(await marcarCorridaCriada(a)).toBe('criada')
    expect(m.chamadas[0]).toEqual(['schema', 'privado'])
    expect(rpc()).toEqual(['rpc', 'marcar_corrida_criada', {
      p_pedido: 'p1', p_uber_entrega_id: 'del_1', p_valor_uber_centavos: 1234,
      p_rastreio_url: 'https://direct-order.uber.com/o/1', p_status_uber: 'pending',
    }])
  })
  it('valor e rastreio nulos vao nulos', async () => {
    responder('a_cancelar')
    expect(await marcarCorridaCriada({ ...a, valorUberCentavos: null, rastreioUrl: null })).toBe('a_cancelar')
    expect(rpc()?.[2]).toMatchObject({ p_valor_uber_centavos: null, p_rastreio_url: null })
  })
  it('P0001 vira ErroDeRegra', async () => {
    responder(null, { code: 'P0001', message: 'rastreio_invalido' })
    await expect(marcarCorridaCriada(a)).rejects.toBeInstanceOf(ErroDeRegra)
    await expect(marcarCorridaCriada(a)).rejects.toMatchObject({ codigo: 'rastreio_invalido' })
  })
  it.each([[null], ['inventado'], [1]])('estado torto (%j) e falha', async (data) => {
    responder(data)
    await expect(marcarCorridaCriada(a)).rejects.toThrow('Falha no banco (marcar_corrida_criada)')
  })
})

describe('marcarCorridaFalhou', () => {
  it('manda o pedido, o motivo e se e definitiva', async () => {
    responder('a_criar')
    expect(await marcarCorridaFalhou('p1', 'erro_uber', false)).toBe('a_criar')
    expect(rpc()).toEqual(['rpc', 'marcar_corrida_falhou', { p_pedido: 'p1', p_motivo: 'erro_uber', p_definitiva: false }])
  })
  it('definitiva', async () => {
    responder('precisa_da_equipe')
    expect(await marcarCorridaFalhou('p1', 'parametro_invalido', true)).toBe('precisa_da_equipe')
    expect(rpc()?.[2]).toMatchObject({ p_definitiva: true })
  })
  it('P0001 vira ErroDeRegra', async () => {
    responder(null, { code: 'P0001', message: 'motivo_invalido' })
    await expect(marcarCorridaFalhou('p1', 'X', false)).rejects.toMatchObject({ codigo: 'motivo_invalido' })
  })
  it('estado torto e falha', async () => {
    responder('quase')
    await expect(marcarCorridaFalhou('p1', 'erro_uber', false)).rejects.toThrow('Falha no banco (marcar_corrida_falhou)')
  })
})

describe('remarcarEntrega', () => {
  it('manda o pedido e a faixa', async () => {
    await remarcarEntrega('p1', { inicio: '2026-11-25T15:00:00.000Z', fim: '2026-11-25T16:00:00.000Z' })
    expect(rpc()).toEqual(['rpc', 'remarcar_entrega', {
      p_pedido: 'p1', p_inicio: '2026-11-25T15:00:00.000Z', p_fim: '2026-11-25T16:00:00.000Z',
    }])
  })
  it('faixa que nao vale vira ErroDeRegra', async () => {
    responder(null, { code: 'P0001', message: 'faixa_indisponivel' })
    await expect(remarcarEntrega('p1', { inicio: 'a', fim: 'b' })).rejects.toMatchObject({ codigo: 'faixa_indisponivel' })
  })
  it('outro erro e falha', async () => {
    responder(null, {}, 502)
    await expect(remarcarEntrega('p1', { inicio: 'a', fim: 'b' })).rejects.toThrow('Falha no banco (remarcar_entrega): HTTP 502')
  })
})

describe('aplicarEntrega', () => {
  const a = { uberEntregaId: 'del_1', statusUber: 'delivered', rastreioUrl: null, valorUberCentavos: 1500 }
  it('manda os parametros e traduz a linha', async () => {
    responder([{ pedido: 'p1', pedido_status: 'entregue', estado: 'criada' }])
    expect(await aplicarEntrega(a)).toEqual({ pedido: 'p1', pedidoStatus: 'entregue', estado: 'criada' })
    expect(m.chamadas[0]).toEqual(['schema', 'privado'])
    expect(rpc()).toEqual(['rpc', 'aplicar_entrega', {
      p_uber_entrega_id: 'del_1', p_status_uber: 'delivered', p_rastreio_url: null, p_valor_uber_centavos: 1500,
    }])
  })
  it('id que o banco nao conhece: null', async () => {
    responder([])
    expect(await aplicarEntrega(a)).toBeNull()
  })
  it('P0001 vira ErroDeRegra', async () => {
    responder(null, { code: 'P0001', message: 'status_invalido' })
    await expect(aplicarEntrega(a)).rejects.toMatchObject({ codigo: 'status_invalido' })
  })
  it.each([
    ['sem lista', null],
    ['estado inventado', [{ pedido: 'p1', pedido_status: 'entregue', estado: 'feita' }]],
    ['sem pedido', [{ pedido: null, pedido_status: 'entregue', estado: 'criada' }]],
    ['status do pedido inventado', [{ pedido: 'p1', pedido_status: 'voando', estado: 'criada' }]],
  ])('resposta torta (%s) e falha', async (_, data) => {
    responder(data)
    await expect(aplicarEntrega(a)).rejects.toThrow('Falha no banco (aplicar_entrega)')
  })
})

describe('corridasACancelar', () => {
  it('traduz as colunas', async () => {
    responder([{ pedido: 'p1', uber_entrega_id: 'del_1' }])
    expect(await corridasACancelar()).toEqual([{ pedido: 'p1', uberEntregaId: 'del_1' }])
    expect(rpc()).toEqual(['rpc', 'corridas_a_cancelar', {}])
  })
  it.each([[null], [[{ pedido: 'p1', uber_entrega_id: null }]]])('resposta torta (%j) e falha', async (data) => {
    responder(data)
    await expect(corridasACancelar()).rejects.toThrow('Falha no banco (corridas_a_cancelar)')
  })
})

describe('corridaCancelada', () => {
  it('manda o pedido', async () => {
    await corridaCancelada('p1')
    expect(rpc()).toEqual(['rpc', 'corrida_cancelada', { p_pedido: 'p1' }])
  })
  it('erro do banco sobe', async () => {
    responder(null, { code: '42501' }, 403)
    await expect(corridaCancelada('p1')).rejects.toThrow('Falha no banco (corrida_cancelada): 42501')
  })
})

describe('corridasAConferir', () => {
  it('devolve os ids da Uber', async () => {
    responder([{ uber_entrega_id: 'del_1' }, { uber_entrega_id: 'del_2' }])
    expect(await corridasAConferir()).toEqual(['del_1', 'del_2'])
    expect(rpc()).toEqual(['rpc', 'corridas_a_conferir', {}])
  })
  it.each([[null], [[{ uber_entrega_id: 3 }]]])('resposta torta (%j) e falha', async (data) => {
    responder(data)
    await expect(corridasAConferir()).rejects.toThrow('Falha no banco (corridas_a_conferir)')
  })
})

describe('o token da Uber', () => {
  it('lerTokenUber devolve token e validade em ISO', async () => {
    responder([{ token: 'abc', expira_em: '2026-12-24T10:00:00+00:00' }])
    expect(await lerTokenUber()).toEqual({ token: 'abc', expiraEm: '2026-12-24T10:00:00.000Z' })
    expect(rpc()).toEqual(['rpc', 'ler_token_uber', {}])
  })
  it('lerTokenUber sem linha devolve null', async () => {
    responder([])
    expect(await lerTokenUber()).toBeNull()
  })
  it.each([[null], [[{ token: '', expira_em: '2026-12-24T10:00:00Z' }]], [[{ token: 'a', expira_em: 'ontem' }]]])(
    'lerTokenUber com resposta torta (%j) e falha',
    async (data) => {
      responder(data)
      await expect(lerTokenUber()).rejects.toThrow('Falha no banco (ler_token_uber)')
    },
  )
  it('guardarTokenUber manda o token e a validade', async () => {
    await guardarTokenUber('abc', '2026-12-24T10:00:00.000Z')
    expect(rpc()).toEqual(['rpc', 'guardar_token_uber', { p_token: 'abc', p_expira_em: '2026-12-24T10:00:00.000Z' }])
  })
  it('guardarTokenUber com erro do banco falha sem a mensagem crua', async () => {
    responder(null, { code: '42501', message: 'permission denied for table secreta' }, 403)
    await expect(guardarTokenUber('abc', '2026-12-24T10:00:00.000Z')).rejects.toThrow('Falha no banco (guardar_token_uber)')
  })
  it('reservarRenovacaoToken devolve o booleano', async () => {
    responder(true)
    expect(await reservarRenovacaoToken()).toBe(true)
    responder(false)
    expect(await reservarRenovacaoToken()).toBe(false)
    expect(rpc()).toEqual(['rpc', 'reservar_renovacao_token', {}])
  })
  it('reservarRenovacaoToken com resposta torta e falha', async () => {
    responder('sim')
    await expect(reservarRenovacaoToken()).rejects.toThrow('Falha no banco (reservar_renovacao_token)')
  })
})
