import 'server-only'
import { variavel } from '@/lib/dados/ambiente'
import { registrarFalha } from '@/lib/dados/erros'

const BASE = 'https://api.mercadopago.com/v1/orders'
const PRAZO_MS = 6000

export type PedidoMp = {
  id: string
  status: string
  detalhe: string
  referencia: string | null
  valorCentavos: number | null
  pagamento: {
    id: string | null
    status: string
    detalhe: string
    bandeira: string | null
    parcelas: number | null
    pix: { copiaECola: string; qrBase64: string; expiraEm: string | null } | null
    desafioUrl: string | null
  } | null
}

export type ResultadoMp = { ok: true; pedido: PedidoMp } | { ok: false; status: number; codigo: string | null }

/** Centavos inteiros em texto com duas casas (9280 vira '92.80'). */
export function valorEmReais(centavos: number): string {
  if (!Number.isSafeInteger(centavos) || centavos < 0) throw new RangeError('centavos invalidos')
  return (centavos / 100).toFixed(2)
}

const ID = /^[A-Za-z0-9_-]{1,64}$/
const STATUS = /^[a-z_]{1,40}$/
const DETALHE = /^[a-z0-9_]{1,100}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALOR = /^\d+(\.\d{1,2})?$/
const BASE64 = /^[A-Za-z0-9+/=]{1,40000}$/
const BANDEIRA = /^[a-z_]{2,20}$/
const DATA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/
const CODIGO = /^[a-z0-9_]{1,60}$/

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Obj) : null)
const texto = (v: unknown, re: RegExp): string | null => (typeof v === 'string' && re.test(v) ? v : null)

function centavos(v: unknown): number | null {
  const t = texto(v, VALOR)
  if (!t) return null
  const [inteiro, frac = ''] = t.split('.')
  const n = Number(inteiro) * 100 + Number(frac.padEnd(2, '0'))
  return Number.isSafeInteger(n) ? n : null
}

function copiaECola(v: unknown): string | null {
  if (typeof v !== 'string' || v.length < 1 || v.length > 1000) return null
  // sem controle, < nem >
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i)
    if (c < 0x20 || (c >= 0x7f && c <= 0x9f) || c === 0x3c || c === 0x3e) return null
  }
  return v
}

function dataIso(v: unknown): string | null {
  if (typeof v !== 'string' || !DATA.test(v)) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function urlDoDesafio(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 2000) return null
  try {
    const u = new URL(v)
    const h = u.hostname.toLowerCase()
    const host = h === 'mercadopago.com.br' || h === 'mercadopago.com' || h.endsWith('.mercadopago.com.br') || h.endsWith('.mercadopago.com')
    return u.protocol === 'https:' && host && !u.username && !u.password && !u.port ? u.toString() : null
  } catch {
    return null
  }
}

function lerPagamento(bruto: unknown): PedidoMp['pagamento'] {
  const p = obj(bruto)
  if (!p) return null
  const status = texto(p.status, STATUS)
  if (!status) return null
  const metodo = obj(p.payment_method)
  const qr = copiaECola(metodo?.qr_code)
  const qrBase64 = texto(metodo?.qr_code_base64, BASE64)
  const parcelas = metodo?.installments
  return {
    id: texto(p.id, ID),
    status,
    detalhe: texto(p.status_detail, DETALHE) ?? '',
    bandeira: texto(metodo?.id, BANDEIRA),
    parcelas: typeof parcelas === 'number' && Number.isInteger(parcelas) && parcelas >= 1 && parcelas <= 12 ? parcelas : null,
    pix: qr && qrBase64 ? { copiaECola: qr, qrBase64, expiraEm: dataIso(p.date_of_expiration) } : null,
    desafioUrl: urlDoDesafio(obj(metodo?.transaction_security)?.url),
  }
}

function lerPedido(bruto: unknown): PedidoMp | null {
  const o = obj(bruto)
  if (!o) return null
  const id = texto(o.id, ID)
  const status = texto(o.status, STATUS)
  if (!id || !status) return null
  const pagamentos = obj(o.transactions)?.payments
  return {
    id,
    status,
    detalhe: texto(o.status_detail, DETALHE) ?? '',
    referencia: texto(o.external_reference, UUID),
    valorCentavos: centavos(o.total_amount),
    pagamento: Array.isArray(pagamentos) ? lerPagamento(pagamentos[0]) : null,
  }
}

function codigoDoErro(corpo: unknown): string | null {
  const o = obj(corpo)
  if (!o) return null
  const primeiro = Array.isArray(o.errors) ? obj(o.errors[0]) : null
  return texto(primeiro?.code, CODIGO) ?? texto(o.code, CODIGO)
}

const FALHA_LOCAL: Promise<ResultadoMp> = Promise.resolve({ ok: false, status: 0, codigo: null })
const totalValido = (c: number) => Number.isSafeInteger(c) && c >= 0

async function chamar(
  operacao: string,
  metodo: 'GET' | 'POST',
  caminho: string,
  chave: string | null,
  corpo: unknown,
): Promise<ResultadoMp> {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  try {
    const cabecalhos: Record<string, string> = { Authorization: `Bearer ${variavel('MERCADOPAGO_ACCESS_TOKEN')}` }
    if (chave) cabecalhos['X-Idempotency-Key'] = chave
    if (metodo === 'POST') cabecalhos['Content-Type'] = 'application/json'

    const limite = new Promise<never>((_, rejeitar) => {
      temporizador = setTimeout(() => rejeitar(new Error('prazo')), PRAZO_MS)
    })
    const lida = (async () => {
      const r = await fetch(`${BASE}${caminho}`, {
        method: metodo,
        headers: cabecalhos,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        cache: 'no-store',
        signal: AbortSignal.timeout(PRAZO_MS),
      })
      let json: unknown = null
      try {
        json = JSON.parse(await r.text())
      } catch {
        json = null
      }
      return { r, json }
    })()
    lida.catch(() => {})
    const { r: resposta, json } = await Promise.race([lida, limite])

    // 402: o pedido foi criado e a transacao falhou. A API o devolve dentro de
    // data (ensaio de 2026-11-23); sem data, vale o corpo inteiro.
    if (resposta.ok || resposta.status === 402) {
      const dentro = resposta.status === 402 ? obj(obj(json)?.data) : null
      const pedido = lerPedido(dentro ?? json)
      if (pedido) return { ok: true, pedido }
    }
    const codigo = codigoDoErro(json)
    registrarFalha(`mercadopago.${operacao}`, { status: resposta.status, code: codigo })
    return { ok: false, status: resposta.status, codigo }
  } catch {
    registrarFalha(`mercadopago.${operacao}`, { status: 0 })
    return { ok: false, status: 0, codigo: null }
  } finally {
    clearTimeout(temporizador)
  }
}

/** Um item do pedido no Mercado Pago, em centavos. */
export type ItemMp = { titulo: string; quantidade: number; precoCentavos: number }

/**
 * Os potes do pedido e, com frete, a entrega como mais um item: a API confere
 * que os itens somam o total do pedido (contrato, 1.3).
 */
export function itensParaOMp(itens: { nome: string; quantos: number; precoCentavos: number }[], freteCentavos: number): ItemMp[] {
  const potes = itens.map((i) => ({ titulo: i.nome, quantidade: i.quantos, precoCentavos: i.precoCentavos }))
  return freteCentavos > 0 ? [...potes, { titulo: 'Entrega', quantidade: 1, precoCentavos: freteCentavos }] : potes
}

/**
 * O campo items do corpo, so quando os itens somam o total: a API recusaria o
 * pedido inteiro (order_items_total_amount_mismatch), e item e informacao a
 * mais, que nunca barra o pagamento.
 */
function itensDoCorpo(itens: ItemMp[], totalCentavos: number): Obj {
  if (itens.length === 0) return {}
  const legiveis = itens.every((i) => Number.isSafeInteger(i.precoCentavos) && i.precoCentavos >= 0 && Number.isSafeInteger(i.quantidade) && i.quantidade > 0)
  const soma = legiveis ? itens.reduce((total, i) => total + i.precoCentavos * i.quantidade, 0) : -1
  if (soma !== totalCentavos) {
    registrarFalha('mercadopago.itens', { code: 'itens_nao_somam' })
    return {}
  }
  return { items: itens.map((i) => ({ title: i.titulo, unit_price: valorEmReais(i.precoCentavos), quantity: i.quantidade })) }
}

export function criarPedidoPix(p: { tentativa: string; totalCentavos: number; email: string; itens: ItemMp[] }): Promise<ResultadoMp> {
  if (!totalValido(p.totalCentavos)) return FALHA_LOCAL
  const valor = valorEmReais(p.totalCentavos)
  return chamar('criar_pix', 'POST', '', p.tentativa, {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: valor,
    external_reference: p.tentativa,
    payer: { email: p.email },
    ...itensDoCorpo(p.itens, p.totalCentavos),
    transactions: {
      payments: [{ amount: valor, payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }],
    },
  })
}

export function criarPedidoCartao(p: {
  tentativa: string
  totalCentavos: number
  email: string
  cartao: { token: string; bandeira: string; tipo: 'credit_card' | 'debit_card'; parcelas: number }
  documento: { tipo: 'CPF'; numero: string } | null
  itens: ItemMp[]
}): Promise<ResultadoMp> {
  if (!totalValido(p.totalCentavos)) return FALHA_LOCAL
  const valor = valorEmReais(p.totalCentavos)
  const payer: Obj = { email: p.email }
  if (p.documento) payer.identification = { type: p.documento.tipo, number: p.documento.numero }
  return chamar('criar_cartao', 'POST', '', p.tentativa, {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: valor,
    external_reference: p.tentativa,
    payer,
    ...itensDoCorpo(p.itens, p.totalCentavos),
    transactions: {
      payments: [
        {
          amount: valor,
          payment_method: { id: p.cartao.bandeira, type: p.cartao.tipo, token: p.cartao.token, installments: p.cartao.parcelas },
        },
      ],
    },
    config: { online: { transaction_security: { validation: 'on_fraud_risk', liability_shift: 'required' } } },
  })
}

export function lerPedidoMp(id: string): Promise<ResultadoMp> {
  if (!ID.test(id)) return FALHA_LOCAL
  return chamar('ler', 'GET', `/${id}`, null, undefined)
}

/**
 * Cancelar e estornar: um 500 idempotency_validation_failed (contrato, secao
 * 3) e reenviado uma vez, com chave nova. Repetir e seguro: um segundo
 * cancelamento responde 409 order_already_canceled e um segundo estorno total,
 * 409 order_already_refunded. A criacao nunca e reenviada.
 */
async function postComReenvio(operacao: string, caminho: string, chave: string): Promise<ResultadoMp> {
  const r = await chamar(operacao, 'POST', caminho, chave, undefined)
  if (r.ok || r.status !== 500 || r.codigo !== 'idempotency_validation_failed') return r
  return chamar(operacao, 'POST', caminho, `${chave}-2`, undefined)
}

export function cancelarPedidoMp(id: string, tentativa: string): Promise<ResultadoMp> {
  if (!ID.test(id)) return FALHA_LOCAL
  return postComReenvio('cancelar', `/${id}/cancel`, `${tentativa}-cancelar`)
}

export function estornarPedidoMp(id: string, tentativa: string): Promise<ResultadoMp> {
  if (!ID.test(id)) return FALHA_LOCAL
  return postComReenvio('estornar', `/${id}/refund`, `${tentativa}-estornar`)
}
