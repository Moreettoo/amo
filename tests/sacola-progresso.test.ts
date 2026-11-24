import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apagarProgresso, CHAVE_DO_PROGRESSO, gravarProgresso, lerProgresso, type Progresso } from '@/components/sacola/progresso'
import type { Cotacao } from '@/lib/fechamento/tipos'

const AGORA = Date.parse('2026-11-21T15:00:00.000Z')
const endereco = { cep: '04567-000', numero: '10', complemento: 'apto 12' }
const cotacao = (venceEmMs: number): Cotacao => ({
  id: 'b1f0c9a2-4d3e-4f5a-8b6c-7d8e9f0a1b2c',
  modo: 'agora',
  faixa: null,
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
    expect(lerProgresso(AGORA, null)).toBeNull()
    guardar('{"etapa":')
    expect(lerProgresso(AGORA, null)).toBeNull()
    guardar({ etapa: 7, endereco, cotacao: null })
    expect(lerProgresso(AGORA, null)).toBeNull()
  })

  it('qualquer coisa fora da forma: null', () => {
    guardar([1, 2])
    expect(lerProgresso(AGORA, null)).toBeNull()
    guardar({ etapa: 2, endereco: { cep: 4567000, numero: '10', complemento: '' }, cotacao: null })
    expect(lerProgresso(AGORA, null)).toBeNull()
    guardar({ etapa: 2, endereco: { ...endereco, complemento: 'x'.repeat(61) }, cotacao: null })
    expect(lerProgresso(AGORA, null)).toBeNull()
    guardar({ etapa: 3, endereco, cotacao: { ...cotacao(600_000), valorCentavos: '1290' } })
    expect(lerProgresso(AGORA, null)).toBeNull()
    guardar({ etapa: 3, endereco, cotacao: { ...cotacao(600_000), expiraEm: 'amanha' } })
    expect(lerProgresso(AGORA, null)).toBeNull()
  })

  it('a cotação que vence em 30 s fica de fora (null) e a etapa volta para a entrega, com o endereço', () => {
    guardar({ etapa: 3, endereco, cotacao: cotacao(30_000), conta: null })
    expect(lerProgresso(AGORA, null)).toEqual({ etapa: 2, endereco, cotacao: null, conta: null })
  })

  it('devolve o progresso válido; apagado, null', () => {
    const p: Progresso = { etapa: 3, endereco, cotacao: cotacao(600_000), conta: null }
    gravarProgresso(p)
    expect(lerProgresso(AGORA, null)).toEqual(p)
    apagarProgresso()
    expect(lerProgresso(AGORA, null)).toBeNull()
  })

  it('o progresso de outra conta (ou de uma conta, agora sem sessão) fica de fora; o guardado sem conta segue para quem entrou', () => {
    const p: Progresso = { etapa: 2, endereco, cotacao: null, conta: 'aaaaaaaaaaaaaaaa' }
    gravarProgresso(p)
    expect(lerProgresso(AGORA, 'bbbbbbbbbbbbbbbb')).toBeNull()
    expect(lerProgresso(AGORA, null)).toBeNull()
    expect(lerProgresso(AGORA, 'aaaaaaaaaaaaaaaa')).toEqual(p)
    gravarProgresso({ ...p, conta: null })
    expect(lerProgresso(AGORA, 'bbbbbbbbbbbbbbbb')).toEqual({ ...p, conta: null })
    guardar({ ...p, conta: 'nao-e-marca' })
    expect(lerProgresso(AGORA, null)).toBeNull()
  })

  describe('o pedido feito guardado (para voltar a ele depois de recarregar)', () => {
    const MARCA = 'aaaaaaaaaaaaaaaa'
    const pedido = () => ({
      numero: 'AMO-7K2M9QXR',
      forma: 'pix' as const,
      linhas: [
        { slug: 'prestigio', nome: 'Prestígio', quantos: 2, total: 3780 },
        { slug: 'mousse-de-maracuja', nome: 'Mousse de maracujá', quantos: 1, total: 1690 },
      ],
      entrega: cotacao(600_000),
      total: 6760,
    })
    const comPedido = (p: unknown, extra: Record<string, unknown> = {}) =>
      guardar({ etapa: 4, endereco, cotacao: cotacao(600_000), conta: MARCA, pedido: p, ...extra })

    it('volta como foi guardado, com a conta que guardou; sem ele, o progresso nem tem a chave', () => {
      const p: Progresso = { etapa: 4, endereco, cotacao: cotacao(600_000), conta: MARCA, pedido: pedido() }
      gravarProgresso(p)
      expect(lerProgresso(AGORA, MARCA)).toEqual(p)
      gravarProgresso({ etapa: 2, endereco, cotacao: null, conta: null })
      expect(lerProgresso(AGORA, null)).not.toHaveProperty('pedido')
    })

    it('a entrega do pedido é só exibição: volta mesmo vencida, e a cotação vencida do progresso leva a etapa à 2', () => {
      comPedido({ ...pedido(), entrega: cotacao(-3_600_000) }, { cotacao: cotacao(30_000) })
      expect(lerProgresso(AGORA, MARCA)).toEqual({ etapa: 2, endereco, cotacao: null, conta: MARCA, pedido: { ...pedido(), entrega: cotacao(-3_600_000) } })
    })

    it('o pedido de outra conta não volta, e o pedido sem a conta que guardou é entrada estranha: nada volta', () => {
      comPedido(pedido())
      expect(lerProgresso(AGORA, 'bbbbbbbbbbbbbbbb')).toBeNull()
      comPedido(pedido(), { conta: null })
      expect(lerProgresso(AGORA, null)).toBeNull()
      expect(lerProgresso(AGORA, MARCA)).toBeNull()
    })

    it('qualquer coisa fora da forma ou dos tamanhos no pedido: nada volta', () => {
      const p = pedido()
      const linha = p.linhas[0]
      const ruins: unknown[] = [
        null,
        'AMO-7K2M9QXR',
        [p],
        { ...p, numero: "AMO-7K2M9QXR' or 1=1" },
        { ...p, numero: '123456' },
        { ...p, numero: undefined },
        { ...p, forma: 'boleto' },
        { ...p, linhas: [] },
        { ...p, linhas: 'prestigio' },
        { ...p, linhas: Array.from({ length: 31 }, (_, i) => ({ ...linha, slug: `sabor-${i}` })) },
        { ...p, linhas: [linha, linha] },
        { ...p, linhas: [{ ...linha, slug: 'Prestígio <b>' }] },
        { ...p, linhas: [{ ...linha, nome: '' }] },
        { ...p, linhas: [{ ...linha, nome: 'x'.repeat(121) }] },
        { ...p, linhas: [{ ...linha, quantos: 0 }] },
        { ...p, linhas: [{ ...linha, quantos: 21 }] },
        { ...p, linhas: [{ ...linha, quantos: 2.5 }] },
        { ...p, linhas: [{ ...linha, total: -1 }] },
        { ...p, linhas: [{ ...linha, total: '3780' }] },
        { ...p, linhas: [{ ...linha, total: 10_000_001 }] },
        { ...p, entrega: null },
        { ...p, entrega: { ...p.entrega, valorCentavos: '1290' } },
        { ...p, total: 0 },
        { ...p, total: 10_000_001 },
        { ...p, total: 67.6 },
      ]
      for (const ruim of ruins) {
        comPedido(ruim)
        expect(lerProgresso(AGORA, MARCA), JSON.stringify(ruim)?.slice(0, 80)).toBeNull()
      }
    })
  })

  it('o sessionStorage que lança não faz lançar', () => {
    const lanca = () => {
      throw new Error('SecurityError')
    }
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(lanca)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(lanca)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(lanca)
    expect(() => gravarProgresso({ etapa: 1, endereco, cotacao: null, conta: null })).not.toThrow()
    expect(lerProgresso(AGORA, null)).toBeNull()
    expect(() => apagarProgresso()).not.toThrow()
  })
})
