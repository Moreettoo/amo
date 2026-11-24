// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOSTIS } from './fixtures/hostis'

/** A cotacao no servidor, sem banco: a ordem, os campos, o CEP e o que volta. */

const m = vi.hoisted(() => ({
  buscarCep: vi.fn(),
  consumirLimite: vi.fn(),
  obterUsuario: vi.fn(),
  registrarCotacao: vi.fn(),
  mercadoPagoEmTeste: vi.fn(),
  uberConfigurada: vi.fn(),
  uberEmTeste: vi.fn(),
  ambientesCombinam: vi.fn(),
  cozinha: vi.fn(),
  registrarFalha: vi.fn(),
  lerLoja: vi.fn(),
  cotarNaUber: vi.fn(),
}))

vi.mock('@/lib/dados/cep', () => ({ buscarCep: m.buscarCep }))
vi.mock('@/lib/dados/limites', () => ({ consumirLimite: m.consumirLimite }))
vi.mock('@/lib/auth', () => ({ obterUsuario: m.obterUsuario }))
vi.mock('@/lib/dados/ambiente', () => ({
  mercadoPagoEmTeste: m.mercadoPagoEmTeste,
  uberConfigurada: m.uberConfigurada,
  uberEmTeste: m.uberEmTeste,
  ambientesCombinam: m.ambientesCombinam,
  cozinha: m.cozinha,
}))
vi.mock('@/lib/dados/loja', () => ({ lerLoja: m.lerLoja }))
vi.mock('@/lib/uber/cliente', () => ({ cotarNaUber: m.cotarNaUber }))
vi.mock('@/lib/dados/erros', () => ({ registrarFalha: m.registrarFalha }))
vi.mock('@/lib/dados/cotacao', async (original) => ({
  ...(await original<typeof import('@/lib/dados/cotacao')>()),
  registrarCotacao: m.registrarCotacao,
}))
vi.mock('@/lib/auth/admin', () => ({ criarClienteAdmin: () => ({}) }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }) }))

import { cotarEntrega } from '@/app/sacola/acoes'
import { cotarDeExemplo } from '@/lib/dados/cotacao'
import { FAIXA, faixasLivres, janelasDaFaixa, type Loja } from '@/lib/loja'

const RUA = { logradouro: 'Rua Cuiabá', bairro: 'Alto da Mooca', cidade: 'São Paulo', uf: 'SP' }
const entrada = { cep: '03183-002', numero: '120', complemento: 'ap 4' }
const COZINHA = {
  nome: 'AMO Sabores Saudáveis',
  telefone: '11988887777',
  endereco: { logradouro: 'Rua A', numero: '1', complemento: '', bairro: 'B', cidade: 'São Paulo', uf: 'SP', cep: '01001000' },
}
const horarios = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, abre: '09:00:00', fecha: '18:00:00' }))
const LOJA: Loja = { horarios, pausada: false, diasFechados: [] }
const UBER = { id: 'dqt_abc', valorCentavos: 1234, minutos: 40, retiradaEmMinutos: 10, aoVivo: null }
const AGORA = new Date('2026-11-24T12:00:00.000Z')
const FAIXA_BOA = '2026-11-24T15:00:00.000Z'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(AGORA)
  m.buscarCep.mockReset().mockResolvedValue(RUA)
  m.consumirLimite.mockReset().mockResolvedValue(true)
  m.obterUsuario.mockReset().mockResolvedValue(null)
  m.registrarCotacao.mockReset().mockResolvedValue('cotacao-1')
  m.mercadoPagoEmTeste.mockReset().mockReturnValue(true)
  m.registrarFalha.mockReset()
  m.uberConfigurada.mockReset().mockReturnValue(false)
  m.uberEmTeste.mockReset().mockReturnValue(true)
  m.ambientesCombinam.mockReset().mockReturnValue(true)
  m.cozinha.mockReset().mockReturnValue(COZINHA)
  m.lerLoja.mockReset().mockResolvedValue(LOJA)
  m.cotarNaUber.mockReset().mockResolvedValue({ ok: true, dados: UBER })
})
afterEach(() => vi.useRealTimers())

describe('campos', () => {
  it('entrada que nao e objeto ou com campo que nao e texto', async () => {
    for (const x of [null, undefined, 'x', 3, [], { cep: 1, numero: '1' }, { cep: '03183002', numero: 1 }, { cep: '03183002', numero: '1', complemento: 2 }]) {
      const r = await cotarEntrega(x)
      expect(r).toMatchObject({ ok: false, erro: 'campos_invalidos' })
    }
    expect(m.consumirLimite).not.toHaveBeenCalled()
  })

  it('o CEP aceita com e sem hifen e recusa o resto', async () => {
    expect((await cotarEntrega({ ...entrada, cep: '03183002' })).ok).toBe(true)
    expect(m.buscarCep).toHaveBeenLastCalledWith('03183002')
    expect((await cotarEntrega({ ...entrada, cep: ' 03183-002 ' })).ok).toBe(true)
    for (const cep of ['0318300', '031830023', '03183-0022', '0318-3002', 'abcdefgh', '']) {
      expect(await cotarEntrega({ ...entrada, cep })).toEqual({
        ok: false,
        erro: 'campos_invalidos',
        campos: { cep: 'Confira o CEP: ele tem 8 números.' },
      })
    }
  })

  it('o numero', async () => {
    expect(await cotarEntrega({ ...entrada, numero: '  ' })).toMatchObject({ campos: { numero: 'Falta o número da casa ou do prédio.' } })
    for (const numero of ['-1', '12345678901', 'a;b', '1<2']) {
      expect(await cotarEntrega({ ...entrada, numero })).toMatchObject({ campos: { numero: 'Use só letras e números no número, até 10.' } })
    }
    expect((await cotarEntrega({ ...entrada, numero: '12/B-3' })).ok).toBe(true)
  })

  it('o complemento', async () => {
    const msg = 'Use até 60 letras, sem < nem >.'
    for (const complemento of ['a'.repeat(61), 'a<b', 'a>b', 'a\u0000b', 'a\u009fb', 'a\nb']) {
      expect(await cotarEntrega({ ...entrada, complemento })).toMatchObject({ campos: { complemento: msg } })
    }
    expect((await cotarEntrega({ ...entrada, complemento: 'a'.repeat(60) })).ok).toBe(true)
    expect((await cotarEntrega({ cep: '03183002', numero: '1' })).ok).toBe(true)
  })

  it('cada item hostil no CEP e no numero e recusado sem gastar limite', async () => {
    for (const h of HOSTIS) {
      for (const campo of ['cep', 'numero'] as const) {
        const r = await cotarEntrega({ ...entrada, [campo]: h })
        expect(r).toMatchObject({ ok: false, erro: 'campos_invalidos' })
      }
    }
    expect(m.consumirLimite).not.toHaveBeenCalled()
    expect(m.buscarCep).not.toHaveBeenCalled()
  })

  it('no complemento, o hostil que quebra a regra e recusado e o resto passa como texto', async () => {
    const quebra = (h: string) => h.length > 60 || /[\u0000-\u001f\u007f-\u009f<>]/.test(h)
    for (const h of HOSTIS) {
      m.registrarCotacao.mockClear()
      const r = await cotarEntrega({ ...entrada, complemento: h })
      if (quebra(h.trim())) expect(r).toMatchObject({ ok: false, erro: 'campos_invalidos' })
      else expect(m.registrarCotacao).toHaveBeenCalledWith(expect.objectContaining({ complemento: h.trim() }))
    }
  })
})

describe('ordem e limite', () => {
  it('o limite e por IP, 30 por hora', async () => {
    await cotarEntrega(entrada)
    expect(m.consumirLimite).toHaveBeenCalledWith('cotar:ip:203.0.113.9', 30, 3600)
  })

  it('estourado: muitas_tentativas, sem buscar o CEP', async () => {
    m.consumirLimite.mockResolvedValue(false)
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'muitas_tentativas' })
    expect(m.buscarCep).not.toHaveBeenCalled()
  })
})

describe('CEP', () => {
  it('nao achado ou rua curta', async () => {
    m.buscarCep.mockResolvedValue(null)
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'cep_nao_encontrado' })
    m.buscarCep.mockResolvedValue({ ...RUA, logradouro: 'R' })
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'cep_nao_encontrado' })
  })

  it('Campinas fica fora da area', async () => {
    expect(await cotarEntrega({ ...entrada, cep: '13010-000' })).toEqual({ ok: false, erro: 'fora_da_area' })
    expect(m.registrarCotacao).not.toHaveBeenCalled()
  })

  it('a conta de exemplo', () => {
    expect(cotarDeExemplo('03183002')).toEqual({ valorCentavos: 790 + (318 % 17) * 45, minutos: 30 + (318 % 17) * 2 })
    expect(cotarDeExemplo('13010000')).toBeNull()
  })
})

describe('producao', () => {
  it('fora do ambiente de teste a cotacao de exemplo e recusada e nada e registrado', async () => {
    m.mercadoPagoEmTeste.mockReturnValue(false)
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'entrega_indisponivel' })
    expect(m.registrarCotacao).not.toHaveBeenCalled()
  })
})

describe('registro', () => {
  it('deslogada: usuarioId nulo; a resposta leva so as chaves de Cotacao', async () => {
    const r = await cotarEntrega(entrada)
    expect(m.registrarCotacao).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: null, cep: '03183002', numero: '120', complemento: 'ap 4' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(Object.keys(r.cotacao).sort()).toEqual(['endereco', 'exemplo', 'expiraEm', 'faixa', 'id', 'minutos', 'modo', 'valorCentavos'])
    expect(r.cotacao).toMatchObject({ id: 'cotacao-1', exemplo: true, expiraEm: '2026-11-24T12:15:00.000Z', modo: 'agora', faixa: null })
    expect(r.cotacao.endereco).toEqual({ cep: '03183002', numero: '120', complemento: 'ap 4', ...RUA })
  })

  it('ate a Uber entrar: a conta de exemplo, sem id da Uber, agora e sem faixa', async () => {
    await cotarEntrega(entrada)
    expect(m.registrarCotacao).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'exemplo', uberCotacaoId: null, modo: 'agora', faixa: null }),
    )
  })

  it('logada: o id dela', async () => {
    m.obterUsuario.mockResolvedValue({ id: 'usuario-1' })
    await cotarEntrega(entrada)
    expect(m.registrarCotacao).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 'usuario-1' }))
  })

  it('registrarCotacao ou buscarCep lancando: tente_de_novo', async () => {
    m.registrarCotacao.mockRejectedValue(new Error('x'))
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'tente_de_novo' })
    m.buscarCep.mockRejectedValue(new Error('x'))
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'tente_de_novo' })
  })
})

describe('modos', () => {
  const faixaDe = (inicio: string) => ({ inicio, fim: new Date(Date.parse(inicio) + 3_600_000).toISOString() })

  it('sem modo e aberta: cota agora', async () => {
    const r = await cotarEntrega(entrada)
    expect(r.ok && r.cotacao).toMatchObject({ modo: 'agora', faixa: null })
  })

  it('sem modo e fechada: cota a primeira faixa e devolve agendado', async () => {
    vi.setSystemTime(new Date('2026-11-25T01:00:00.000Z'))
    const primeira = faixasLivres(LOJA, new Date())[0]
    const r = await cotarEntrega(entrada)
    expect(r.ok && r.cotacao).toMatchObject({ modo: 'agendado', faixa: primeira })
    expect(m.registrarCotacao).toHaveBeenCalledWith(expect.objectContaining({ modo: 'agendado', faixa: primeira }))
  })

  it('sem modo, fechada e sem faixa: faixa_indisponivel', async () => {
    vi.setSystemTime(new Date('2026-11-25T01:00:00.000Z'))
    m.lerLoja.mockResolvedValue({ ...LOJA, horarios: [] })
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'faixa_indisponivel' })
  })

  it('agora com a loja fechada: agora_indisponivel', async () => {
    vi.setSystemTime(new Date('2026-11-25T01:00:00.000Z'))
    expect(await cotarEntrega({ ...entrada, modo: 'agora' })).toEqual({ ok: false, erro: 'agora_indisponivel' })
  })

  it('agendado com faixa valida', async () => {
    const r = await cotarEntrega({ ...entrada, modo: 'agendado', faixa: FAIXA_BOA })
    expect(r.ok && r.cotacao).toMatchObject({ modo: 'agendado', faixa: faixaDe(FAIXA_BOA) })
  })

  it('agendado no exemplo: os minutos tambem sao a duracao da faixa', async () => {
    const r = await cotarEntrega({ ...entrada, modo: 'agendado', faixa: FAIXA_BOA })
    expect(r.ok && r.cotacao).toMatchObject({ exemplo: true, modo: 'agendado', minutos: FAIXA.duracaoMin })
    expect(m.registrarCotacao).toHaveBeenCalledWith(expect.objectContaining({ origem: 'exemplo', minutos: FAIXA.duracaoMin }))
  })

  it('modo ou faixa fora da regra: campos_invalidos sem gastar limite', async () => {
    const ruins = [
      { modo: 'agendado' },
      { modo: 'agora', faixa: FAIXA_BOA },
      { faixa: FAIXA_BOA },
      { modo: 'outro' },
      { modo: 3 },
      { modo: 'agendado', faixa: 5 },
      { modo: 'agendado', faixa: '2026-11-24T15:00:00-03:00' },
      { modo: 'agendado', faixa: '2026-11-24' },
      { modo: 'agendado', faixa: '2026-13-45T25:61:61Z' },
      ...HOSTIS.map((h) => ({ modo: 'agendado', faixa: h })),
    ]
    for (const extra of ruins) {
      expect(await cotarEntrega({ ...entrada, ...extra })).toMatchObject({ ok: false, erro: 'campos_invalidos' })
    }
    expect(m.consumirLimite).not.toHaveBeenCalled()
  })

  it('faixa de 10h30, de 8 dias e de ontem: faixa_indisponivel', async () => {
    for (const faixa of ['2026-11-24T13:30:00.000Z', '2026-12-02T15:00:00.000Z', '2026-11-23T15:00:00.000Z']) {
      expect(await cotarEntrega({ ...entrada, modo: 'agendado', faixa })).toEqual({ ok: false, erro: 'faixa_indisponivel' })
    }
    expect(m.registrarCotacao).not.toHaveBeenCalled()
  })

  it('vendas pausadas: loja_fechada antes de qualquer modo', async () => {
    m.lerLoja.mockResolvedValue({ ...LOJA, pausada: true })
    for (const extra of [{}, { modo: 'agora' }, { modo: 'agendado', faixa: FAIXA_BOA }]) {
      expect(await cotarEntrega({ ...entrada, ...extra })).toEqual({ ok: false, erro: 'loja_fechada' })
    }
    expect(m.registrarCotacao).not.toHaveBeenCalled()
  })
})

describe('Uber', () => {
  beforeEach(() => m.uberConfigurada.mockReturnValue(true))

  it('agora: cota sem janelas e grava origem uber com o id dela', async () => {
    const r = await cotarEntrega({ ...entrada, modo: 'agora' })
    expect(m.cotarNaUber).toHaveBeenCalledWith({
      retirada: COZINHA.endereco,
      telefoneRetirada: COZINHA.telefone,
      entrega: expect.objectContaining({ cep: '03183002', numero: '120', logradouro: 'Rua Cuiabá' }),
      janelas: null,
    })
    expect(m.registrarCotacao).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'uber', uberCotacaoId: 'dqt_abc', valorCentavos: 1234, minutos: 40, modo: 'agora', faixa: null }),
    )
    expect(r.ok && r.cotacao).toMatchObject({ exemplo: false, valorCentavos: 1234, minutos: 40 })
  })

  it('agendado: manda as janelas da faixa', async () => {
    await cotarEntrega({ ...entrada, modo: 'agendado', faixa: FAIXA_BOA })
    const faixa = { inicio: FAIXA_BOA, fim: '2026-11-24T16:00:00.000Z' }
    expect(m.cotarNaUber).toHaveBeenCalledWith(expect.objectContaining({ janelas: janelasDaFaixa(faixa) }))
    expect(m.registrarCotacao).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'uber', uberCotacaoId: 'dqt_abc', modo: 'agendado', faixa }),
    )
  })

  it('com a Uber ligada a area de exemplo nao vale: quem decide e a Uber', async () => {
    const r = await cotarEntrega({ ...entrada, cep: '13010-000' })
    expect(m.cotarNaUber).toHaveBeenCalled()
    expect(r.ok).toBe(true)
  })

  it('ambientes trocados: entrega_indisponivel sem chamar a Uber', async () => {
    m.ambientesCombinam.mockReturnValue(false)
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'entrega_indisponivel' })
    expect(m.cotarNaUber).not.toHaveBeenCalled()
    expect(m.registrarFalha).toHaveBeenCalledWith('cotar_entrega', { code: 'ambientes_trocados' })
  })

  it('aoVivo trocado e recusado; false certo e null passam', async () => {
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, aoVivo: true } })
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'entrega_indisponivel' })
    expect(m.registrarFalha).toHaveBeenCalledWith('cotar_entrega', { code: 'ao_vivo_trocado' })
    expect(m.registrarCotacao).not.toHaveBeenCalled()
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, aoVivo: false } })
    expect((await cotarEntrega(entrada)).ok).toBe(true)
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, aoVivo: null } })
    expect((await cotarEntrega(entrada)).ok).toBe(true)
  })

  it('agora com a retirada passando do fechamento: agora_indisponivel', async () => {
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, retiradaEmMinutos: 600 } })
    expect(await cotarEntrega({ ...entrada, modo: 'agora' })).toEqual({ ok: false, erro: 'agora_indisponivel' })
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, retiradaEmMinutos: 540 } })
    expect((await cotarEntrega({ ...entrada, modo: 'agora' })).ok).toBe(true)
  })

  it('agora sem retiradaEmMinutos usa os minutos totais; sem nenhum dos dois recusa', async () => {
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, retiradaEmMinutos: null, minutos: 600 } })
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'agora_indisponivel' })
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, retiradaEmMinutos: null, minutos: 40 } })
    expect((await cotarEntrega(entrada)).ok).toBe(true)
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, retiradaEmMinutos: null, minutos: null } })
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'agora_indisponivel' })
  })

  it('agendado: os minutos sao a duracao da faixa, nao a espera ate ela', async () => {
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, minutos: 1237 } })
    const r = await cotarEntrega({ ...entrada, modo: 'agendado', faixa: FAIXA_BOA })
    expect(r.ok && r.cotacao.minutos).toBe(FAIXA.duracaoMin)
    expect(m.registrarCotacao).toHaveBeenCalledWith(expect.objectContaining({ modo: 'agendado', minutos: FAIXA.duracaoMin }))
  })

  it('agendado automatico (loja fechada): os minutos tambem sao a duracao da faixa', async () => {
    vi.setSystemTime(new Date('2026-11-25T01:00:00.000Z'))
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, minutos: 1237 } })
    const r = await cotarEntrega(entrada)
    expect(r.ok && r.cotacao).toMatchObject({ modo: 'agendado', minutos: FAIXA.duracaoMin })
    expect(m.registrarCotacao).toHaveBeenCalledWith(expect.objectContaining({ modo: 'agendado', minutos: FAIXA.duracaoMin }))
  })

  it('agora: os minutos da Uber passam sem mudar', async () => {
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, minutos: 37 } })
    const r = await cotarEntrega({ ...entrada, modo: 'agora' })
    expect(r.ok && r.cotacao.minutos).toBe(37)
    expect(m.registrarCotacao).toHaveBeenCalledWith(expect.objectContaining({ modo: 'agora', minutos: 37 }))
  })

  it('o agendado nao confere o fechamento', async () => {
    m.cotarNaUber.mockResolvedValue({ ok: true, dados: { ...UBER, retiradaEmMinutos: 9999 } })
    expect((await cotarEntrega({ ...entrada, modo: 'agendado', faixa: FAIXA_BOA })).ok).toBe(true)
  })

  it('erros da Uber', async () => {
    const casos: [{ status: number; codigo: string | null }, string][] = [
      [{ status: 400, codigo: 'address_undeliverable_limited_couriers' }, 'fora_da_area'],
      [{ status: 400, codigo: 'address_undeliverable' }, 'fora_da_area'],
      [{ status: 429, codigo: null }, 'entrega_indisponivel'],
      [{ status: 400, codigo: 'moeda' }, 'entrega_indisponivel'],
      [{ status: 500, codigo: null }, 'tente_de_novo'],
      [{ status: 0, codigo: null }, 'tente_de_novo'],
    ]
    for (const [f, erro] of casos) {
      m.cotarNaUber.mockResolvedValue({ ok: false, ...f })
      expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro })
    }
    expect(m.registrarCotacao).not.toHaveBeenCalled()
  })

  it('limite estourado: muitas_tentativas, sem chamar a Uber', async () => {
    m.consumirLimite.mockResolvedValue(false)
    expect(await cotarEntrega(entrada)).toEqual({ ok: false, erro: 'muitas_tentativas' })
    expect(m.cotarNaUber).not.toHaveBeenCalled()
  })

  it('nenhum log leva endereco, telefone ou CEP', async () => {
    m.ambientesCombinam.mockReturnValue(false)
    await cotarEntrega(entrada)
    m.ambientesCombinam.mockReturnValue(true)
    m.cotarNaUber.mockResolvedValue({ ok: false, status: 400, codigo: 'xpto' })
    await cotarEntrega(entrada)
    const texto = JSON.stringify(m.registrarFalha.mock.calls)
    for (const proibido of ['03183', 'Cuiab', '11988887777', 'ap 4']) expect(texto).not.toContain(proibido)
  })
})
