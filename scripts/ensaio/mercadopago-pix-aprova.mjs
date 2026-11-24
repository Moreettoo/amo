// SO DE ENSAIO. O site nunca importa este arquivo: ele entra apenas no
// servidor de ensaio, pela linha de comando, e nenhum codigo do site muda por
// ele:
//
//   NODE_OPTIONS=--import=./scripts/ensaio/mercadopago-pix-aprova.mjs npx next dev -p 3001
//
// Fala com o Mercado Pago de VERDADE, na conta de teste. So acrescenta
// payer.first_name "APRO" ao corpo da criacao de um Pix (POST /v1/orders com o
// pagamento pix): no ambiente de teste do Mercado Pago, esse nome faz o Pix ser
// aprovado sozinho logo depois de criado (contrato, secao 5). O resto do
// corpo, os cabecalhos e a chave de idempotencia vao como vieram, e qualquer
// outra chamada passa intacta.
//
// So vale no ensaio: sem MERCADOPAGO_AMBIENTE=teste, ou com NODE_ENV=production,
// tudo passa intacto. A conferencia e na hora da chamada: no --import, o
// .env.local ainda nao foi lido. Nao carregar junto com mercadopago-falso.mjs:
// com o falso, nada chega ao Mercado Pago de verdade.

const ORDERS = 'https://api.mercadopago.com/v1/orders'
const fetchDeVerdade = globalThis.fetch

/** O ensaio, lido na hora da chamada: MERCADOPAGO_AMBIENTE=teste e fora de um build de producao. */
const noEnsaio = () => process.env.MERCADOPAGO_AMBIENTE?.trim() === 'teste' && process.env.NODE_ENV !== 'production'

/** O corpo da criacao de um Pix com o nome que aprova; null quando nao e um Pix legivel. */
function comAprovacao(corpo) {
  if (typeof corpo !== 'string') return null
  let lido
  try {
    lido = JSON.parse(corpo)
  } catch {
    return null
  }
  if (typeof lido !== 'object' || lido === null || Array.isArray(lido)) return null
  const pagamentos = lido.transactions?.payments
  if (!Array.isArray(pagamentos) || pagamentos[0]?.payment_method?.id !== 'pix') return null
  const pagador = typeof lido.payer === 'object' && lido.payer !== null && !Array.isArray(lido.payer) ? lido.payer : {}
  return JSON.stringify({ ...lido, payer: { ...pagador, first_name: 'APRO' } })
}

globalThis.fetch = async function fetchDoEnsaio(entrada, init) {
  if (entrada !== ORDERS || !noEnsaio() || (init?.method ?? 'GET').toUpperCase() !== 'POST') return fetchDeVerdade(entrada, init)
  const corpo = comAprovacao(init?.body)
  if (corpo === null) return fetchDeVerdade(entrada, init)
  console.warn('[ensaio] Pix com APRO')
  return fetchDeVerdade(entrada, { ...init, body: corpo })
}

console.warn(`[ensaio] Pix que aprova ligado neste processo (pid ${process.pid}). As chamadas vao ao Mercado Pago de verdade, na conta de teste.`)
