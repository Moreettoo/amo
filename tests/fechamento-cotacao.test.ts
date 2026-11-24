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
  registrarFalha: vi.fn(),
}))

vi.mock('@/lib/dados/cep', () => ({ buscarCep: m.buscarCep }))
vi.mock('@/lib/dados/limites', () => ({ consumirLimite: m.consumirLimite }))
vi.mock('@/lib/auth', () => ({ obterUsuario: m.obterUsuario }))
vi.mock('@/lib/dados/ambiente', () => ({ mercadoPagoEmTeste: m.mercadoPagoEmTeste }))
vi.mock('@/lib/dados/erros', () => ({ registrarFalha: m.registrarFalha }))
vi.mock('@/lib/dados/cotacao', async (original) => ({
  ...(await original<typeof import('@/lib/dados/cotacao')>()),
  registrarCotacao: m.registrarCotacao,
}))
vi.mock('@/lib/auth/admin', () => ({ criarClienteAdmin: () => ({}) }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }) }))

import { cotarEntrega } from '@/app/sacola/acoes'
import { cotarDeExemplo } from '@/lib/dados/cotacao'

const RUA = { logradouro: 'Rua Cuiabá', bairro: 'Alto da Mooca', cidade: 'São Paulo', uf: 'SP' }
const entrada = { cep: '03183-002', numero: '120', complemento: 'ap 4' }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-21T12:00:00.000Z'))
  m.buscarCep.mockReset().mockResolvedValue(RUA)
  m.consumirLimite.mockReset().mockResolvedValue(true)
  m.obterUsuario.mockReset().mockResolvedValue(null)
  m.registrarCotacao.mockReset().mockResolvedValue('cotacao-1')
  m.mercadoPagoEmTeste.mockReset().mockReturnValue(true)
  m.registrarFalha.mockReset()
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
  it('o limite e por IP, 10 por hora', async () => {
    await cotarEntrega(entrada)
    expect(m.consumirLimite).toHaveBeenCalledWith('cotar:ip:203.0.113.9', 10, 3600)
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
    expect(Object.keys(r.cotacao).sort()).toEqual(['endereco', 'exemplo', 'expiraEm', 'id', 'minutos', 'valorCentavos'])
    expect(r.cotacao).toMatchObject({ id: 'cotacao-1', exemplo: true, expiraEm: '2026-11-21T12:15:00.000Z' })
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
