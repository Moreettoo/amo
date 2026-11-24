import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * A assinatura do aviso da Uber: HMAC-SHA256 em hex minusculo do corpo cru
 * (UTF-8), com a chave de assinatura do webhook. O corpo nunca e lido como
 * JSON antes daqui. Ausente, vazia ou de outro tamanho e falso.
 */
export function conferirAssinaturaUber(corpo: string, assinatura: string | null, segredo: string): boolean {
  if (!assinatura) return false
  const esperado = Buffer.from(createHmac('sha256', segredo).update(corpo, 'utf8').digest('hex'))
  const recebido = Buffer.from(assinatura)
  if (recebido.length !== esperado.length) return false
  return timingSafeEqual(recebido, esperado)
}
