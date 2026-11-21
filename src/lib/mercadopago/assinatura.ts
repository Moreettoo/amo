import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

const PASSADO_MS = 60 * 60 * 1000
const FUTURO_MS = 5 * 60 * 1000

type Entrada = {
  assinatura: string | null
  requestId: string | null
  dataId: string | null
  segredo: string
  agora: number
}

function partes(cabecalho: string) {
  const mapa = new Map<string, string>()
  for (const parte of cabecalho.split(',')) {
    const i = parte.indexOf('=')
    if (i < 0) continue
    const chave = parte.slice(0, i).trim()
    const valor = parte.slice(i + 1).trim()
    if (chave && !mapa.has(chave)) mapa.set(chave, valor)
  }
  return mapa
}

function bate(texto: string, segredo: string, v1: Buffer) {
  const esperado = createHmac('sha256', segredo).update(texto).digest()
  return esperado.length === v1.length && timingSafeEqual(esperado, v1)
}

// Confere o x-signature do aviso: HMAC em tempo constante e dentro do prazo. Nunca lanca.
export function conferirAssinatura(e: Entrada): boolean {
  try {
    if (!e.assinatura || !e.segredo) return false
    const mapa = partes(e.assinatura)
    const ts = mapa.get('ts')
    const v1 = mapa.get('v1')
    if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[0-9a-fA-F]{64}$/.test(v1)) return false

    const tsMs = ts.length > 12 ? Number(ts) : Number(ts) * 1000
    if (!Number.isFinite(tsMs)) return false
    if (tsMs < e.agora - PASSADO_MS || tsMs > e.agora + FUTURO_MS) return false

    const recebido = Buffer.from(v1, 'hex')
    const montar = (dataId: string | null) => {
      let texto = ''
      if (dataId) texto += `id:${dataId};`
      if (e.requestId) texto += `request-id:${e.requestId};`
      return `${texto}ts:${ts};`
    }
    const minusculo = e.dataId ? e.dataId.toLowerCase() : null
    const a = bate(montar(minusculo), e.segredo, recebido)
    const b = bate(montar(e.dataId), e.segredo, recebido)
    return a || b
  } catch {
    return false
  }
}
