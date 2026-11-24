// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CorridaReservada } from '@/lib/dados/entregas'
import { janelasDaFaixa, type Loja } from '@/lib/loja'

/**
 * A corrida que sai quando o pagamento e confirmado (spec 8.2). Banco, Uber,
 * loja, ambiente e next/server falsos; relogio fixo. Nada fala com a Uber.
 */

const m = vi.hoisted(() => ({
  reservarCorridas: vi.fn(),
  marcarCorridaCriada: vi.fn(),
  marcarCorridaFalhou: vi.fn(),
  remarcarEntrega: vi.fn(),
  cotarNaUber: vi.fn(),
  criarCorridaNaUber: vi.fn(),
  cancelarCorridaNaUber: vi.fn(),
  lerLoja: vi.fn(),
  registrarFalha: vi.fn(),
  after: vi.fn(),
  configurada: true,
  teste: true,
  combinam: true,
  cozinha: vi.fn(),
}))

vi.mock('@/lib/dados/entregas', () => ({
  reservarCorridas: m.reservarCorridas,
  marcarCorridaCriada: m.marcarCorridaCriada,
  marcarCorridaFalhou: m.marcarCorridaFalhou,
  remarcarEntrega: m.remarcarEntrega,
}))
vi.mock('@/lib/uber/cliente', () => ({
  cotarNaUber: m.cotarNaUber,
  criarCorridaNaUber: m.criarCorridaNaUber,
  cancelarCorridaNaUber: m.cancelarCorridaNaUber,
}))
vi.mock('@/lib/dados/loja', () => ({ lerLoja: m.lerLoja }))
vi.mock('@/lib/dados/ambiente', () => ({
  uberConfigurada: () => m.configurada,
  uberEmTeste: () => m.teste,
  ambientesCombinam: () => m.combinam,
  cozinha: () => m.cozinha(),
}))
vi.mock('@/lib/dados/erros', async (original) => ({
  ...(await original<typeof import('@/lib/dados/erros')>()),
  registrarFalha: m.registrarFalha,
}))
vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  after: m.after,
}))

import { criarCorridasPendentes, pedirCorridas } from '@/lib/uber/corridas'

// Sao Paulo esta em UTC-3 em novembro: 13h de SP sao 16h UTC.
const TERCA_13H = new Date('2026-11-24T16:00:00Z')
const TERCA_13H45 = new Date('2026-11-24T16:45:00Z')
const TERCA_18H15 = new Date('2026-11-24T21:15:00Z')

const COZINHA = {
  nome: 'AMO Sabores Saudáveis' as const,
  endereco: { logradouro: 'Rua da Cozinha', numero: '9', complemento: '', bairro: 'Mooca', cidade: 'São Paulo', uf: 'SP', cep: '03045000' },
  telefone: '1133334444',
}
const ENDERECO_DA_CLIENTE = {
  logradouro: 'Rua A', numero: '1', complemento: '', bairro: 'Vila Mariana', cidade: 'São Paulo', uf: 'SP', cep: '04101000',
}

function loja(extra: Partial<Loja> = {}): Loja {
  return {
    horarios: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, abre: '09:00:00', fecha: '18:00:00' })),
    pausada: false,
    diasFechados: [],
    ...extra,
  }
}

const emSegundos = (s: number) => new Date(Date.now() + s * 1000).toISOString()

function reservada(extra: Partial<CorridaReservada> = {}): CorridaReservada {
  return {
    pedido: 'ped-1',
    numero: 'AMO-0042',
    chave: 'chave-1',
    clienteNome: 'Ana',
    clienteCelular: '11999998888',
    cep: '04101000',
    logradouro: 'Rua A',
    numeroCasa: '1',
    complemento: null,
    bairro: 'Vila Mariana',
    cidade: 'São Paulo',
    uf: 'SP',
    modo: 'agora',
    janelaInicio: null,
    janelaFim: null,
    subtotalCentavos: 3000,
    freteCentavos: 1250,
    origem: 'uber',
    uberCotacaoId: 'dqt_velha',
    cotacaoExpiraEm: emSegundos(600),
    itens: [{ nome: 'Bolo', quantos: 2, precoCentavos: 1500 }],
    ...extra,
  }
}

const cotacao = (id: string, valorCentavos: number) => ({
  ok: true,
  dados: { id, valorCentavos, minutos: 30, retiradaEmMinutos: 10, aoVivo: null },
})
const corrida = (extra: Record<string, unknown> = {}) => ({
  ok: true,
  dados: { id: 'del_1', status: 'pending', valorCentavos: 1250, rastreioUrl: 'https://www.uber.com/track/1', aoVivo: false, ...extra },
})
const falhaDaUber = (status: number, codigo: string | null) => ({ ok: false, status, codigo })

function relogio(agora: Date) {
  vi.setSystemTime(agora)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  relogio(TERCA_13H)
  m.configurada = true
  m.teste = true
  m.combinam = true
  m.cozinha.mockReturnValue(COZINHA)
  m.lerLoja.mockResolvedValue(loja())
  m.reservarCorridas.mockResolvedValue([reservada()])
  m.criarCorridaNaUber.mockResolvedValue(corrida())
  m.marcarCorridaCriada.mockResolvedValue('criada')
  m.marcarCorridaFalhou.mockResolvedValue('a_criar')
  m.remarcarEntrega.mockResolvedValue(undefined)
  m.cancelarCorridaNaUber.mockResolvedValue(corrida({ status: 'canceled' }))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('criarCorridasPendentes', () => {
  it('cotacao valida: cria com ela, sem cotar de novo, e marca criada com o fee e o rastreio', async () => {
    const r = await criarCorridasPendentes()
    expect(r).toEqual({ criadas: 1, falhas: 0 })
    expect(m.reservarCorridas).toHaveBeenCalledWith(3)
    expect(m.cotarNaUber).not.toHaveBeenCalled()
    expect(m.remarcarEntrega).not.toHaveBeenCalled()
    expect(m.criarCorridaNaUber).toHaveBeenCalledWith({
      cotacaoId: 'dqt_velha',
      chave: 'chave-1',
      numeroDoPedido: 'AMO-0042',
      cozinha: COZINHA,
      cliente: { nome: 'Ana', celular: '11999998888', endereco: ENDERECO_DA_CLIENTE },
      itens: [{ nome: 'Bolo', quantos: 2, precoCentavos: 1500 }],
      subtotalCentavos: 3000,
      janelas: null,
    })
    expect(m.marcarCorridaCriada).toHaveBeenCalledWith({
      pedido: 'ped-1',
      uberEntregaId: 'del_1',
      valorUberCentavos: 1250,
      rastreioUrl: 'https://www.uber.com/track/1',
      statusUber: 'pending',
    })
    expect(m.marcarCorridaFalhou).not.toHaveBeenCalled()
    expect(m.registrarFalha).not.toHaveBeenCalled()
  })

  it('o maximo passa a reserva', async () => {
    await criarCorridasPendentes(7)
    expect(m.reservarCorridas).toHaveBeenCalledWith(7)
  })

  it('cotacao a 30 s de vencer: cota de novo com o mesmo endereco e cria com o id novo', async () => {
    m.reservarCorridas.mockResolvedValue([reservada({ cotacaoExpiraEm: emSegundos(30) })])
    m.cotarNaUber.mockResolvedValue(cotacao('dqt_nova', 1250))
    await criarCorridasPendentes()
    expect(m.cotarNaUber).toHaveBeenCalledWith({
      retirada: COZINHA.endereco,
      telefoneRetirada: COZINHA.telefone,
      entrega: ENDERECO_DA_CLIENTE,
      janelas: null,
    })
    expect(m.criarCorridaNaUber).toHaveBeenCalledWith(expect.objectContaining({ cotacaoId: 'dqt_nova' }))
    expect(m.marcarCorridaCriada).toHaveBeenCalledTimes(1)
  })

  it('sem o id da cotacao: cota de novo', async () => {
    m.reservarCorridas.mockResolvedValue([reservada({ uberCotacaoId: null, cotacaoExpiraEm: null })])
    m.cotarNaUber.mockResolvedValue(cotacao('dqt_nova', 1250))
    await criarCorridasPendentes()
    expect(m.cotarNaUber).toHaveBeenCalledTimes(1)
    expect(m.criarCorridaNaUber).toHaveBeenCalledWith(expect.objectContaining({ cotacaoId: 'dqt_nova' }))
  })

  it('cotacao nova R$ 5,00 mais cara: cria assim mesmo e registra frete_maior', async () => {
    m.reservarCorridas.mockResolvedValue([reservada({ cotacaoExpiraEm: emSegundos(-60) })])
    m.cotarNaUber.mockResolvedValue(cotacao('dqt_nova', 1750))
    m.criarCorridaNaUber.mockResolvedValue(corrida({ valorCentavos: 1750 }))
    const r = await criarCorridasPendentes()
    expect(r).toEqual({ criadas: 1, falhas: 0 })
    expect(m.criarCorridaNaUber).toHaveBeenCalledWith(expect.objectContaining({ cotacaoId: 'dqt_nova' }))
    expect(m.marcarCorridaCriada).toHaveBeenCalledWith(expect.objectContaining({ valorUberCentavos: 1750 }))
    expect(m.registrarFalha).toHaveBeenCalledWith('uber.frete_maior', { code: 'frete_maior' })
  })

  it('R$ 3,00 mais cara nao vai ao log', async () => {
    m.criarCorridaNaUber.mockResolvedValue(corrida({ valorCentavos: 1550 }))
    await criarCorridasPendentes()
    expect(m.marcarCorridaCriada).toHaveBeenCalledTimes(1)
    expect(m.registrarFalha).not.toHaveBeenCalled()
  })

  it('"Agora" pago as 18h15: remarca para a primeira faixa do dia seguinte, cota com as janelas dela e cria', async () => {
    relogio(TERCA_18H15)
    m.reservarCorridas.mockResolvedValue([reservada()])
    m.cotarNaUber.mockResolvedValue(cotacao('dqt_nova', 1300))
    const faixa = { inicio: '2026-11-25T13:00:00.000Z', fim: '2026-11-25T14:00:00.000Z' }
    const r = await criarCorridasPendentes()
    expect(r).toEqual({ criadas: 1, falhas: 0 })
    expect(m.remarcarEntrega).toHaveBeenCalledWith('ped-1', faixa)
    expect(m.cotarNaUber).toHaveBeenCalledWith(expect.objectContaining({ janelas: janelasDaFaixa(faixa) }))
    expect(m.criarCorridaNaUber).toHaveBeenCalledWith(
      expect.objectContaining({ cotacaoId: 'dqt_nova', janelas: janelasDaFaixa(faixa) }),
    )
    expect(m.remarcarEntrega.mock.invocationCallOrder[0]).toBeLessThan(m.cotarNaUber.mock.invocationCallOrder[0])
  })

  it('"Agora" com as vendas pausadas ainda serve (a pausa so impede pedido novo)', async () => {
    m.lerLoja.mockResolvedValue(loja({ pausada: true }))
    await criarCorridasPendentes()
    expect(m.remarcarEntrega).not.toHaveBeenCalled()
    expect(m.criarCorridaNaUber).toHaveBeenCalledWith(expect.objectContaining({ cotacaoId: 'dqt_velha', janelas: null }))
  })

  it('agendado valido: cria com a cotacao e as janelas da faixa, sem remarcar', async () => {
    const faixa = { inicio: '2026-11-25T17:00:00.000Z', fim: '2026-11-25T18:00:00.000Z' }
    m.reservarCorridas.mockResolvedValue([reservada({ modo: 'agendado', janelaInicio: faixa.inicio, janelaFim: faixa.fim })])
    await criarCorridasPendentes()
    expect(m.remarcarEntrega).not.toHaveBeenCalled()
    expect(m.cotarNaUber).not.toHaveBeenCalled()
    expect(m.criarCorridaNaUber).toHaveBeenCalledWith(
      expect.objectContaining({ cotacaoId: 'dqt_velha', janelas: janelasDaFaixa(faixa) }),
    )
  })

  it('agendado das 14h com o relogio as 13h45: remarca para a faixa das 16h e cota de novo', async () => {
    relogio(TERCA_13H45)
    m.reservarCorridas.mockResolvedValue([
      reservada({ modo: 'agendado', janelaInicio: '2026-11-24T17:00:00.000Z', janelaFim: '2026-11-24T18:00:00.000Z' }),
    ])
    m.cotarNaUber.mockResolvedValue(cotacao('dqt_nova', 1250))
    const faixa = { inicio: '2026-11-24T19:00:00.000Z', fim: '2026-11-24T20:00:00.000Z' }
    await criarCorridasPendentes()
    expect(m.remarcarEntrega).toHaveBeenCalledWith('ped-1', faixa)
    expect(m.cotarNaUber).toHaveBeenCalledWith(expect.objectContaining({ janelas: janelasDaFaixa(faixa) }))
    expect(m.criarCorridaNaUber).toHaveBeenCalledWith(
      expect.objectContaining({ cotacaoId: 'dqt_nova', janelas: janelasDaFaixa(faixa) }),
    )
  })

  it('agendado numa data que a equipe fechou: remarca', async () => {
    m.lerLoja.mockResolvedValue(loja({ diasFechados: ['2026-11-25'] }))
    m.reservarCorridas.mockResolvedValue([
      reservada({ modo: 'agendado', janelaInicio: '2026-11-25T17:00:00.000Z', janelaFim: '2026-11-25T18:00:00.000Z' }),
    ])
    m.cotarNaUber.mockResolvedValue(cotacao('dqt_nova', 1250))
    await criarCorridasPendentes()
    // hoje (13h) a primeira faixa livre e a das 15h: 13h + 90 min = 14h30
    expect(m.remarcarEntrega).toHaveBeenCalledWith('ped-1', { inicio: '2026-11-24T18:00:00.000Z', fim: '2026-11-24T19:00:00.000Z' })
  })

  it('sem faixa nos 7 dias: falha definitiva sem_faixa, sem cotar nem criar', async () => {
    relogio(TERCA_18H15)
    m.lerLoja.mockResolvedValue(loja({ horarios: [] }))
    const r = await criarCorridasPendentes()
    expect(r).toEqual({ criadas: 0, falhas: 1 })
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'sem_faixa', true)
    expect(m.remarcarEntrega).not.toHaveBeenCalled()
    expect(m.cotarNaUber).not.toHaveBeenCalled()
    expect(m.criarCorridaNaUber).not.toHaveBeenCalled()
  })

  it('cotacao de exemplo: falha definitiva cotacao_de_exemplo', async () => {
    m.reservarCorridas.mockResolvedValue([reservada({ origem: 'exemplo', uberCotacaoId: null })])
    await criarCorridasPendentes()
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'cotacao_de_exemplo', true)
    expect(m.cotarNaUber).not.toHaveBeenCalled()
    expect(m.criarCorridaNaUber).not.toHaveBeenCalled()
  })

  it('ambientes trocados: falha definitiva ambientes_trocados', async () => {
    m.combinam = false
    await criarCorridasPendentes()
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'ambientes_trocados', true)
    expect(m.criarCorridaNaUber).not.toHaveBeenCalled()
  })

  it('sem nome, celular ou endereco: falha definitiva dados_incompletos', async () => {
    m.reservarCorridas.mockResolvedValue([reservada({ clienteCelular: null })])
    await criarCorridasPendentes()
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'dados_incompletos', true)
    expect(m.criarCorridaNaUber).not.toHaveBeenCalled()
  })

  it('500 da Uber: falha nao definitiva', async () => {
    m.criarCorridaNaUber.mockResolvedValue(falhaDaUber(500, null))
    const r = await criarCorridasPendentes()
    expect(r).toEqual({ criadas: 0, falhas: 1 })
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'http_500', false)
    expect(m.marcarCorridaCriada).not.toHaveBeenCalled()
  })

  it('400 da Uber: falha definitiva com o code dela', async () => {
    m.criarCorridaNaUber.mockResolvedValue(falhaDaUber(400, 'invalid_params'))
    await criarCorridasPendentes()
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'invalid_params', true)
  })

  it('429 e 408 da Uber: falha nao definitiva', async () => {
    m.criarCorridaNaUber.mockResolvedValueOnce(falhaDaUber(429, 'rate_limit_exceeded'))
    await criarCorridasPendentes()
    expect(m.marcarCorridaFalhou).toHaveBeenLastCalledWith('ped-1', 'rate_limit_exceeded', false)
    m.criarCorridaNaUber.mockResolvedValueOnce(falhaDaUber(408, null))
    await criarCorridasPendentes()
    expect(m.marcarCorridaFalhou).toHaveBeenLastCalledWith('ped-1', 'http_408', false)
  })

  it('sem resposta (status 0): falha nao definitiva sem_resposta', async () => {
    m.criarCorridaNaUber.mockResolvedValue(falhaDaUber(0, null))
    await criarCorridasPendentes()
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'sem_resposta', false)
  })

  it('a cotacao refeita recusada com 4xx: falha definitiva, sem criar', async () => {
    m.reservarCorridas.mockResolvedValue([reservada({ cotacaoExpiraEm: emSegundos(10) })])
    m.cotarNaUber.mockResolvedValue(falhaDaUber(400, 'address_undeliverable'))
    await criarCorridasPendentes()
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'address_undeliverable', true)
    expect(m.criarCorridaNaUber).not.toHaveBeenCalled()
  })

  it('a cotacao refeita com live_mode trocado: falha definitiva ao_vivo_trocado, sem criar', async () => {
    m.reservarCorridas.mockResolvedValue([reservada({ cotacaoExpiraEm: emSegundos(10) })])
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...cotacao('dqt_nova', 1250).dados, aoVivo: true } })
    await criarCorridasPendentes()
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'ao_vivo_trocado', true)
    expect(m.criarCorridaNaUber).not.toHaveBeenCalled()
  })

  it('corrida ao vivo com o site em teste: cancela na Uber primeiro, depois falha definitiva e log', async () => {
    m.criarCorridaNaUber.mockResolvedValue(corrida({ aoVivo: true }))
    const r = await criarCorridasPendentes()
    expect(r).toEqual({ criadas: 0, falhas: 1 })
    expect(m.cancelarCorridaNaUber).toHaveBeenCalledWith('del_1')
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'ao_vivo_trocado', true)
    expect(m.registrarFalha).toHaveBeenCalledWith('uber.ao_vivo_trocado', { code: 'ao_vivo_trocado' })
    expect(m.marcarCorridaCriada).not.toHaveBeenCalled()
    const cancelou = m.cancelarCorridaNaUber.mock.invocationCallOrder[0]
    expect(cancelou).toBeLessThan(m.marcarCorridaFalhou.mock.invocationCallOrder[0])
    expect(cancelou).toBeLessThan(m.registrarFalha.mock.invocationCallOrder[0])
  })

  it('corrida de teste com o site em producao: cancela e falha definitiva', async () => {
    m.teste = false
    m.criarCorridaNaUber.mockResolvedValue(corrida({ aoVivo: false }))
    await criarCorridasPendentes()
    expect(m.cancelarCorridaNaUber).toHaveBeenCalledWith('del_1')
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'ao_vivo_trocado', true)
    expect(m.marcarCorridaCriada).not.toHaveBeenCalled()
  })

  it('corrida ao vivo com o site em producao: marca criada', async () => {
    m.teste = false
    m.criarCorridaNaUber.mockResolvedValue(corrida({ aoVivo: true }))
    await criarCorridasPendentes()
    expect(m.cancelarCorridaNaUber).not.toHaveBeenCalled()
    expect(m.marcarCorridaCriada).toHaveBeenCalledTimes(1)
  })

  it('rastreio fora da Uber vai como null, e o id da corrida e gravado assim mesmo', async () => {
    m.criarCorridaNaUber.mockResolvedValue(corrida({ rastreioUrl: 'https://www.ubereats.com/orders/1' }))
    await criarCorridasPendentes()
    expect(m.marcarCorridaCriada).toHaveBeenCalledWith(expect.objectContaining({ uberEntregaId: 'del_1', rastreioUrl: null }))
  })

  it('a segunda reservada e tentada mesmo com excecao na primeira', async () => {
    m.reservarCorridas.mockResolvedValue([reservada(), reservada({ pedido: 'ped-2', chave: 'chave-2' })])
    m.criarCorridaNaUber.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(corrida({ id: 'del_2' }))
    const r = await criarCorridasPendentes()
    expect(r).toEqual({ criadas: 1, falhas: 1 })
    expect(m.marcarCorridaFalhou).toHaveBeenCalledWith('ped-1', 'excecao', false)
    expect(m.marcarCorridaCriada).toHaveBeenCalledWith(expect.objectContaining({ pedido: 'ped-2', uberEntregaId: 'del_2' }))
  })

  it('excecao ao marcar a falha nao escapa', async () => {
    m.criarCorridaNaUber.mockRejectedValue(new Error('rede'))
    m.marcarCorridaFalhou.mockRejectedValue(new Error('banco'))
    await expect(criarCorridasPendentes()).resolves.toEqual({ criadas: 0, falhas: 1 })
  })

  it('sem credenciais: nao reserva nem le a loja', async () => {
    m.configurada = false
    const r = await criarCorridasPendentes()
    expect(r).toEqual({ criadas: 0, falhas: 0 })
    expect(m.reservarCorridas).not.toHaveBeenCalled()
    expect(m.lerLoja).not.toHaveBeenCalled()
  })

  it('endereco da cozinha invalido: registra e nao reserva', async () => {
    m.cozinha.mockImplementation(() => {
      throw new Error('COZINHA_ENDERECO invalido')
    })
    const r = await criarCorridasPendentes()
    expect(r).toEqual({ criadas: 0, falhas: 0 })
    expect(m.reservarCorridas).not.toHaveBeenCalled()
    expect(m.registrarFalha).toHaveBeenCalledWith('uber.cozinha', { code: 'cozinha_invalida' })
  })

  it('a loja nao le: nao reserva e nao lanca', async () => {
    m.lerLoja.mockRejectedValue(new Error('banco'))
    await expect(criarCorridasPendentes()).resolves.toEqual({ criadas: 0, falhas: 0 })
    expect(m.reservarCorridas).not.toHaveBeenCalled()
  })

  it('a reserva falha: nao lanca', async () => {
    m.reservarCorridas.mockRejectedValue(new Error('banco'))
    await expect(criarCorridasPendentes()).resolves.toEqual({ criadas: 0, falhas: 0 })
  })

  it('o log nunca leva nome, celular, endereco nem o corpo da Uber', async () => {
    m.reservarCorridas.mockResolvedValue([reservada({ cotacaoExpiraEm: emSegundos(-1) })])
    m.cotarNaUber.mockResolvedValue(cotacao('dqt_nova', 9999))
    m.criarCorridaNaUber.mockResolvedValue(corrida({ valorCentavos: 9999, aoVivo: true }))
    await criarCorridasPendentes()
    const log = JSON.stringify(m.registrarFalha.mock.calls)
    for (const proibido of ['Ana', '11999998888', 'Rua A', '04101000', 'del_1', 'dqt_nova', 'chave-1']) {
      expect(log).not.toContain(proibido)
    }
  })
})

describe('pedirCorridas', () => {
  it('agenda criarCorridasPendentes com after, uma vez', async () => {
    pedirCorridas()
    expect(m.after).toHaveBeenCalledTimes(1)
    const tarefa = m.after.mock.calls[0][0] as () => Promise<unknown>
    expect(m.reservarCorridas).not.toHaveBeenCalled()
    await expect(tarefa()).resolves.toEqual({ criadas: 1, falhas: 0 })
    expect(m.reservarCorridas).toHaveBeenCalledWith(3)
  })

  it('fora de uma requisicao (after lanca): registra uber.after e nao faz nada', () => {
    m.after.mockImplementation(() => {
      throw new Error('after fora da requisicao')
    })
    expect(() => pedirCorridas()).not.toThrow()
    expect(m.registrarFalha).toHaveBeenCalledWith('uber.after', { code: 'fora_da_requisicao' })
    expect(m.reservarCorridas).not.toHaveBeenCalled()
  })
})
