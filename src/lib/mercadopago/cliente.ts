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
  return (centavos / 100).toFixed(2)
}

const ID = /^[A-Za-z0-9_-]{1,64}$/
const STATUS = /^[a-z_]{1,40}$/
const DETALHE = /^[a-z0-9_]{1,100}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALOR = /^\d+(\.\d{1,2})?$/
const BASE64 = /^[A-Za-z0-9+/=]{1,40000}$/
const BANDEIRA = /^[a-z_]{2,20}$/
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
  if (typeof v !== 'string' || v.length > 40) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function urlDoDesafio(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 2000) return null
  try {
    const u = new URL(v)
    const h = u.hostname.toLowerCase()
    const host = h === 'mercadopago.com.br' || h === 'mercadopago.com' || h.endsWith('.mercadopago.com.br') || h.endsWith('.mercadopago.com')
    return u.protocol === 'https:' && host ? u.toString() : null
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
    if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'

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

    // 402: o pedido foi criado e a transacao falhou; o corpo traz o pedido
    if (resposta.ok || resposta.status === 402) {
      const pedido = lerPedido(json)
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

export function criarPedidoPix(p: { tentativa: string; totalCentavos: number; email: string }): Promise<ResultadoMp> {
  const valor = valorEmReais(p.totalCentavos)
  return chamar('criar_pix', 'POST', '', p.tentativa, {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: valor,
    external_reference: p.tentativa,
    payer: { email: p.email },
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
}): Promise<ResultadoMp> {
  const valor = valorEmReais(p.totalCentavos)
  const payer: Obj = { email: p.email }
  if (p.documento) payer.identification = { type: p.documento.tipo, number: p.documento.numero }
  return chamar('criar_cartao', 'POST', '', p.tentativa, {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: valor,
    external_reference: p.tentativa,
    payer,
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
  return chamar('ler', 'GET', `/${encodeURIComponent(id)}`, null, undefined)
}

export function cancelarPedidoMp(id: string, tentativa: string): Promise<ResultadoMp> {
  return chamar('cancelar', 'POST', `/${encodeURIComponent(id)}/cancel`, `${tentativa}-cancelar`, undefined)
}

export function estornarPedidoMp(id: string, tentativa: string): Promise<ResultadoMp> {
  return chamar('estornar', 'POST', `/${encodeURIComponent(id)}/refund`, `${tentativa}-estornar`, undefined)
}
