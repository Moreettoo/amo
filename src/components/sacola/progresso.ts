import type { Cotacao } from '@/lib/fechamento/tipos'

/**
 * O progresso do fechamento guardado na aba (sessionStorage): a etapa, o
 * endereco digitado e a cotacao. Sobrevive a uma recarga ou a ida e volta do
 * login, e morre com a aba. O sessionStorage pode faltar ou lancar (modo
 * privado, cota): ler, gravar e apagar nunca lancam.
 */

export type Etapa = 1 | 2 | 3 | 4
export type EnderecoDigitado = { cep: string; numero: string; complemento: string }
export type Progresso = { etapa: Etapa; endereco: EnderecoDigitado; cotacao: Cotacao | null }

export const CHAVE_DO_PROGRESSO = 'amo:fechamento'

/** A cotacao que vence antes disso nao volta: nao daria tempo de fechar o pedido. */
const FOLGA_MS = 60_000

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const texto = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max
const inteiro = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0

function enderecoDigitado(v: unknown): EnderecoDigitado | null {
  if (!objeto(v) || !texto(v.cep, 9) || !texto(v.numero, 10) || !texto(v.complemento, 60)) return null
  return { cep: v.cep, numero: v.numero, complemento: v.complemento }
}

function cotacao(v: unknown): Cotacao | null {
  if (!objeto(v) || !texto(v.id, 100) || v.id === '' || !inteiro(v.valorCentavos) || !inteiro(v.minutos)) return null
  if (!texto(v.expiraEm, 40) || Number.isNaN(Date.parse(v.expiraEm)) || typeof v.exemplo !== 'boolean') return null
  const e = v.endereco
  if (!objeto(e)) return null
  const campos = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'] as const
  if (!campos.every((c) => texto(e[c], 200))) return null
  const endereco = Object.fromEntries(campos.map((c) => [c, e[c]])) as Cotacao['endereco']
  return { id: v.id, valorCentavos: v.valorCentavos, minutos: v.minutos, expiraEm: v.expiraEm, exemplo: v.exemplo, endereco }
}

/**
 * O progresso guardado, ou null se nao houver ou estiver fora da forma. A
 * cotacao que vence em menos de 60 s fica de fora (null), e a etapa que
 * dependia dela volta para a entrega, com o endereco.
 */
export function lerProgresso(agora: number): Progresso | null {
  try {
    const bruto = window.sessionStorage.getItem(CHAVE_DO_PROGRESSO)
    if (!bruto) return null
    const v: unknown = JSON.parse(bruto)
    if (!objeto(v) || ![1, 2, 3, 4].includes(v.etapa as number)) return null
    const endereco = enderecoDigitado(v.endereco)
    if (!endereco) return null
    let c: Cotacao | null = null
    if (v.cotacao !== null) {
      c = cotacao(v.cotacao)
      if (!c) return null
      if (Date.parse(c.expiraEm) - agora < FOLGA_MS) c = null
    }
    const etapa = v.etapa as Etapa
    return { etapa: etapa > 2 && !c ? 2 : etapa, endereco, cotacao: c }
  } catch {
    return null
  }
}

export function gravarProgresso(p: Progresso): void {
  try {
    window.sessionStorage.setItem(CHAVE_DO_PROGRESSO, JSON.stringify(p))
  } catch {
    // sem sessionStorage o fechamento so nao sobrevive a recarga
  }
}

export function apagarProgresso(): void {
  try {
    window.sessionStorage.removeItem(CHAVE_DO_PROGRESSO)
  } catch {
    // idem
  }
}
