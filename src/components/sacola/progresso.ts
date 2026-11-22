import { conferirNumeroDoPedido } from '@/lib/conta/regras'
import type { Cotacao } from '@/lib/fechamento/tipos'

/**
 * O progresso do fechamento guardado na aba (sessionStorage): a etapa, o
 * endereco digitado, a cotacao e, com o pedido feito na tela, o pedido. Sobrevive
 * a uma recarga ou a ida e volta do login, e morre com a aba. O sessionStorage
 * pode faltar ou lancar (modo privado, cota): ler, gravar e apagar nunca lancam.
 */

export type Etapa = 1 | 2 | 3 | 4
export type EnderecoDigitado = { cep: string; numero: string; complemento: string }
/** Uma linha do pedido feito, so para mostrar: o sabor, quantos e quanto. */
export type LinhaDoPedido = { slug: string; nome: string; quantos: number; total: number }
/**
 * O pedido feito que estava na tela, para voltar a ele depois de uma recarga:
 * o numero (a tela pergunta ao servidor como ele esta) e o que o pedido feito
 * mostra. So exibicao: nada daqui decide dinheiro.
 */
export type PedidoGuardado = { numero: string; forma: 'pix' | 'cartao'; linhas: LinhaDoPedido[]; entrega: Cotacao; total: number }
/** conta: a marca da conta que guardou (16 hex do SHA-256 do id, feita no servidor), null sem sessao */
export type Progresso = {
  etapa: Etapa
  endereco: EnderecoDigitado
  cotacao: Cotacao | null
  conta: string | null
  /** so com o pedido feito na tela, ainda sem o pagamento aprovado */
  pedido?: PedidoGuardado
}

export const CHAVE_DO_PROGRESSO = 'amo:fechamento'

/** A cotacao que vence antes disso nao volta: nao daria tempo de fechar o pedido. */
const FOLGA_MS = 60_000

/** O teto de um valor em centavos, o mesmo do totalVisto no servidor. */
const TETO_EM_CENTAVOS = 10_000_000
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const texto = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max
const inteiro = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0
const centavos = (v: unknown): v is number => inteiro(v) && v <= TETO_EM_CENTAVOS

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

function linhaDoPedido(v: unknown): LinhaDoPedido | null {
  if (!objeto(v) || !texto(v.slug, 80) || !SLUG.test(v.slug) || !texto(v.nome, 120) || v.nome === '') return null
  if (!inteiro(v.quantos) || v.quantos < 1 || v.quantos > 20 || !centavos(v.total)) return null
  return { slug: v.slug, nome: v.nome, quantos: v.quantos, total: v.total }
}

/** O pedido guardado, com a forma e os tamanhos conferidos como o resto do progresso; fora deles, null. */
function pedidoGuardado(v: unknown): PedidoGuardado | null {
  if (!objeto(v)) return null
  const numero = conferirNumeroDoPedido(v.numero)
  if (!numero || (v.forma !== 'pix' && v.forma !== 'cartao')) return null
  if (!Array.isArray(v.linhas) || v.linhas.length < 1 || v.linhas.length > 30) return null
  const linhas: LinhaDoPedido[] = []
  for (const bruta of v.linhas) {
    const linha = linhaDoPedido(bruta)
    if (!linha || linhas.some((l) => l.slug === linha.slug)) return null
    linhas.push(linha)
  }
  // a entrega do pedido e so exibicao: a cotacao vencida tambem volta
  const entrega = cotacao(v.entrega)
  if (!entrega || !centavos(v.total) || v.total < 1) return null
  return { numero, forma: v.forma, linhas, entrega, total: v.total }
}

/**
 * O progresso guardado, ou null se nao houver ou estiver fora da forma. A
 * cotacao que vence em menos de 60 s fica de fora (null), e a etapa que
 * dependia dela volta para a entrega, com o endereco. O guardado por outra
 * conta (ou por uma conta, e agora sem sessao) nao volta, num aparelho
 * dividido; o guardado sem conta segue para quem entrou no meio do caminho.
 * O pedido guardado e entrada hostil como o resto: fora da forma, ou sem a
 * conta que o guardou (so ha pedido com conta), nada volta.
 */
export function lerProgresso(agora: number, conta: string | null): Progresso | null {
  try {
    const bruto = window.sessionStorage.getItem(CHAVE_DO_PROGRESSO)
    if (!bruto) return null
    const v: unknown = JSON.parse(bruto)
    if (!objeto(v) || ![1, 2, 3, 4].includes(v.etapa as number)) return null
    const endereco = enderecoDigitado(v.endereco)
    if (!endereco) return null
    const dono = v.conta
    if (dono !== null && !(typeof dono === 'string' && /^[0-9a-f]{16}$/.test(dono))) return null
    if (dono !== null && dono !== conta) return null
    let c: Cotacao | null = null
    if (v.cotacao !== null) {
      c = cotacao(v.cotacao)
      if (!c) return null
      if (Date.parse(c.expiraEm) - agora < FOLGA_MS) c = null
    }
    let pedido: PedidoGuardado | null = null
    if (v.pedido !== undefined) {
      pedido = pedidoGuardado(v.pedido)
      if (!pedido || dono === null) return null
    }
    const etapa = v.etapa as Etapa
    return { etapa: etapa > 2 && !c ? 2 : etapa, endereco, cotacao: c, conta: dono, ...(pedido ? { pedido } : {}) }
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
