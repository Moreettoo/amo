// PROVA SEM DINHEIRO NA PRODUCAO. Confere, antes de o site ir ao ar, que a
// credencial de producao do Mercado Pago cria um Pix pela API de Orders (o que
// tambem prova a chave Pix da conta), sem mexer em dinheiro: o Pix de R$ 1,00
// e cancelado na hora e o codigo nunca e impresso, entao ninguem consegue
// paga-lo. So com o OK do dono, dado na hora:
//
//   MP_PROVA_EMAIL=<e-mail do pagador> node --env-file=.env.producao.local scripts/producao/mercadopago-prova-sem-dinheiro.mjs --confirmo-producao
//
// O portao e o contrario do roteiro de teste: exige MERCADOPAGO_AMBIENTE
// diferente de teste e GET /users/me de uma conta real (sem test_user). Nao
// imprime token, e-mail, QR, copia e cola nem ticket_url: so status HTTP,
// status, status_detail, se o QR veio e codigo de erro.

import { randomBytes, randomUUID } from 'node:crypto'
import { contaReal } from '../mercadopago-portao.mjs'

const API = 'https://api.mercadopago.com'
const env = process.env

function sair(codigo, motivo) {
  console.log(`[prova] ${motivo}`)
  process.exit(codigo)
}

if (!process.argv.includes('--confirmo-producao')) sair(1, 'recuso rodar sem --confirmo-producao (o OK do dono, dado na hora)')
if (env.MERCADOPAGO_AMBIENTE?.trim() === 'teste') sair(1, 'recuso rodar com MERCADOPAGO_AMBIENTE=teste: esta prova e so da producao')
if (!env.MERCADOPAGO_ACCESS_TOKEN?.trim()) sair(1, 'falta MERCADOPAGO_ACCESS_TOKEN no ambiente')
const EMAIL = env.MP_PROVA_EMAIL?.trim() ?? ''
if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(EMAIL)) sair(1, 'falta MP_PROVA_EMAIL, ou fora do formato')
const TOKEN = env.MERCADOPAGO_ACCESS_TOKEN.trim()

const seguro = (v) => (typeof v === 'string' && /^[a-z0-9_]{1,60}$/.test(v) ? v : '-')

async function chamar(metodo, caminho, { corpo, chave } = {}) {
  const cabecalhos = { Authorization: `Bearer ${TOKEN}` }
  if (chave) cabecalhos['X-Idempotency-Key'] = chave
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'
  try {
    const r = await fetch(`${API}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(15_000),
    })
    let json = null
    try {
      json = JSON.parse(await r.text())
    } catch {
      json = null
    }
    return { http: r.status, json }
  } catch {
    return { http: 0, json: null }
  }
}

const erro = (json) => seguro(Array.isArray(json?.errors) ? json.errors[0]?.code : json?.code)
const estado = (json) => `${seguro(json?.status)}/${seguro(json?.status_detail)}`

const eu = await chamar('GET', '/users/me')
if (eu.http !== 200 || !contaReal(eu.json)) sair(2, `portao: a credencial nao e de uma conta real no Brasil (http=${eu.http}); nada foi criado`)
console.log('[prova] portao: conta real do Mercado Pago no Brasil')

const chave = randomUUID()
const criado = await chamar('POST', '/v1/orders', {
  chave,
  corpo: {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: '1.00',
    external_reference: `prova-sem-dinheiro-${randomBytes(4).toString('hex')}`,
    payer: { email: EMAIL },
    transactions: { payments: [{ amount: '1.00', payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }] },
  },
})
// 402: o pedido nasceu com a transacao recusada, e vem dentro de data (contrato, 1.2)
const pedido = criado.http === 402 && typeof criado.json?.data === 'object' && criado.json.data !== null ? criado.json.data : criado.json
const pagamento = Array.isArray(pedido?.transactions?.payments) ? pedido.transactions.payments[0] : undefined
const metodo = pagamento?.payment_method
const temId = typeof pedido?.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(pedido.id)
console.log(
  `[prova] criar: http=${criado.http} pedido=${estado(pedido)} pagamento=${estado(pagamento)} qr_veio=${Boolean(metodo?.qr_code && metodo?.qr_code_base64) ? 'sim' : 'nao'} erro=${erro(criado.json)}`,
)
if (!temId) sair(3, 'o Pix nao nasceu: nada a cancelar')
if (pedido.status === 'failed') sair(3, `o Pix nasceu recusado (${seguro(pagamento?.status_detail)}): ninguem pode paga-lo, nada a cancelar`)

const cancelado = await chamar('POST', `/v1/orders/${pedido.id}/cancel`, { chave: `${chave}-cancelar` })
const lido = await chamar('GET', `/v1/orders/${pedido.id}`)
console.log(`[prova] cancelar: http=${cancelado.http} ${estado(cancelado.json)} | lido depois: http=${lido.http} ${estado(lido.json)}`)
if (lido.json?.status !== 'canceled') {
  console.log(`[prova] ATENCAO: o Pix nao ficou cancelado. Cancele no painel do Mercado Pago o pedido ${pedido.id}.`)
  process.exit(4)
}
console.log('[prova] ok: Pix criado e cancelado; nenhum dinheiro mexeu')
