import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apagarProgresso, CHAVE_DO_PROGRESSO, gravarProgresso, lerProgresso, type Progresso } from '@/components/sacola/progresso'
import type { Cotacao } from '@/lib/fechamento/tipos'

const AGORA = Date.parse('2026-11-21T15:00:00.000Z')
const endereco = { cep: '04567-000', numero: '10', complemento: 'apto 12' }
const cotacao = (venceEmMs: number): Cotacao => ({
  id: 'b1f0c9a2-4d3e-4f5a-8b6c-7d8e9f0a1b2c',
  valorCentavos: 1290,
  minutos: 45,
  expiraEm: new Date(AGORA + venceEmMs).toISOString(),
  exemplo: true,
  endereco: {
    cep: '04567000',
    logradouro: 'Rua Gomes de Carvalho',
    numero: '10',
    complemento: 'apto 12',
    bairro: 'Vila Olímpia',
    cidade: 'São Paulo',
    uf: 'SP',
  },
})
const guardar = (v: unknown) => sessionStorage.setItem(CHAVE_DO_PROGRESSO, typeof v === 'string' ? v : JSON.stringify(v))

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('o progresso do fechamento, guardado na aba', () => {
  it('nada guardado, JSON quebrado ou etapa 7: null', () => {
    expect(lerProgresso(AGORA)).toBeNull()
    guardar('{"etapa":')
    expect(lerProgresso(AGORA)).toBeNull()
    guardar({ etapa: 7, endereco, cotacao: null })
    expect(lerProgresso(AGORA)).toBeNull()
  })

  it('qualquer coisa fora da forma: null', () => {
    guardar([1, 2])
    expect(lerProgresso(AGORA)).toBeNull()
    guardar({ etapa: 2, endereco: { cep: 4567000, numero: '10', complemento: '' }, cotacao: null })
    expect(lerProgresso(AGORA)).toBeNull()
    guardar({ etapa: 2, endereco: { ...endereco, complemento: 'x'.repeat(61) }, cotacao: null })
    expect(lerProgresso(AGORA)).toBeNull()
    guardar({ etapa: 3, endereco, cotacao: { ...cotacao(600_000), valorCentavos: '1290' } })
    expect(lerProgresso(AGORA)).toBeNull()
    guardar({ etapa: 3, endereco, cotacao: { ...cotacao(600_000), expiraEm: 'amanha' } })
    expect(lerProgresso(AGORA)).toBeNull()
  })

  it('a cotação que vence em 30 s fica de fora (null) e a etapa volta para a entrega, com o endereço', () => {
    guardar({ etapa: 3, endereco, cotacao: cotacao(30_000) })
    expect(lerProgresso(AGORA)).toEqual({ etapa: 2, endereco, cotacao: null })
  })

  it('devolve o progresso válido; apagado, null', () => {
    const p: Progresso = { etapa: 3, endereco, cotacao: cotacao(600_000) }
    gravarProgresso(p)
    expect(lerProgresso(AGORA)).toEqual(p)
    apagarProgresso()
    expect(lerProgresso(AGORA)).toBeNull()
  })

  it('o sessionStorage que lança não faz lançar', () => {
    const lanca = () => {
      throw new Error('SecurityError')
    }
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(lanca)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(lanca)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(lanca)
    expect(() => gravarProgresso({ etapa: 1, endereco, cotacao: null })).not.toThrow()
    expect(lerProgresso(AGORA)).toBeNull()
    expect(() => apagarProgresso()).not.toThrow()
  })
})
