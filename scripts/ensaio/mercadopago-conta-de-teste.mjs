// SO DE ENSAIO. Roda contra a conta de TESTE do Mercado Pago e responde, antes
// de qualquer codigo do site: a API de Orders de verdade bate com o contrato
// (docs/superpowers/specs/2026-11-21-amo-mercadopago-orders.md)? aceita items,
// e de que jeito? aceita o cabecalho do Device ID?
//
//   MP_TESTE_COMPRADOR_EMAIL=<e-mail do comprador de teste> node --env-file=.env.local scripts/ensaio/mercadopago-conta-de-teste.mjs
//
// Seguranca: sem MERCADOPAGO_AMBIENTE=teste, para (saida 1). Antes de criar
// qualquer coisa, GET /users/me tem de dizer test_user (saida 2): uma
// credencial de producao cobraria de verdade. Nao imprime token, chave
// publica, e-mail, QR, copia e cola, ticket_url, id completo nem corpo de
// resposta: so status HTTP, status, status_detail, prefixo de id, presenca de
// campo e codigo de erro. Tudo o que o roteiro cria termina cancelado ou
// estornado, mesmo se um caso falhar no meio.

import { randomUUID } from 'node:crypto'
import { contaDeTeste } from '../mercadopago-portao.mjs'

const API = 'https://api.mercadopago.com'
const PRAZO_MS = 15_000
const env = process.env

function sair(codigo, motivo) {
  console.log(`[ensaio] ${motivo}`)
  process.exit(codigo)
}

if (env.MERCADOPAGO_AMBIENTE !== 'teste') sair(1, 'recuso rodar sem MERCADOPAGO_AMBIENTE=teste')
for (const nome of ['MERCADOPAGO_ACCESS_TOKEN', 'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', 'MP_TESTE_COMPRADOR_EMAIL']) {
  if (!env[nome]?.trim()) sair(1, `falta ${nome} no ambiente`)
}
const EMAIL = env.MP_TESTE_COMPRADOR_EMAIL.trim()
if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(EMAIL)) sair(1, 'MP_TESTE_COMPRADOR_EMAIL fora do formato')
const TOKEN = env.MERCADOPAGO_ACCESS_TOKEN.trim()
const CHAVE_PUBLICA = env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY.trim()

// as mesmas expressoes de src/lib/mercadopago/cliente.ts (lerPedido e lerPagamento)
const RE = {
  ID: /^[A-Za-z0-9_-]{1,64}$/,
  STATUS: /^[a-z_]{1,40}$/,
  DETALHE: /^[a-z0-9_]{1,100}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  VALOR: /^\d+(\.\d{1,2})?$/,
  BASE64: /^[A-Za-z0-9+/=]{1,40000}$/,
  BANDEIRA: /^[a-z_]{2,20}$/,
  DATA: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/,
  CODIGO: /^[a-z0-9_]{1,60}$/,
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))
const seguro = (v) => (typeof v === 'string' && RE.CODIGO.test(v) ? v : '-')
const prefixo = (v) => (typeof v === 'string' && RE.ID.test(v) ? `${v.slice(0, 3)}...` : '-')

/** Uma chamada que nunca lanca: { http, json } (http 0 sem resposta). */
async function chamar(metodo, caminho, { corpo, chave, extras = {}, autorizado = true } = {}) {
  const cabecalhos = { ...extras }
  if (autorizado) cabecalhos.Authorization = `Bearer ${TOKEN}`
  if (chave) cabecalhos['X-Idempotency-Key'] = chave
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'
  try {
    const r = await fetch(`${API}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(PRAZO_MS),
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

function codigoDoErro(json) {
  if (typeof json !== 'object' || json === null) return '-'
  const primeiro = Array.isArray(json.errors) ? json.errors[0] : null
  return seguro(primeiro?.code ?? json.code)
}

const pagamentoDe = (o) => (Array.isArray(o?.transactions?.payments) ? o.transactions.payments[0] : undefined)

function copiaECola(v) {
  if (typeof v !== 'string' || v.length < 1 || v.length > 1000) return false
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i)
    if (c < 0x20 || (c >= 0x7f && c <= 0x9f) || c === 0x3c || c === 0x3e) return false
  }
  return true
}

function hostDoDesafio(v) {
  if (typeof v !== 'string') return null
  try {
    return new URL(v).hostname.toLowerCase()
  } catch {
    return 'url_ilegivel'
  }
}

function desafioAceito(v) {
  if (typeof v !== 'string' || v.length > 2000) return false
  try {
    const u = new URL(v)
    const h = u.hostname.toLowerCase()
    const host = h === 'mercadopago.com.br' || h === 'mercadopago.com' || h.endsWith('.mercadopago.com.br') || h.endsWith('.mercadopago.com')
    return u.protocol === 'https:' && host && !u.username && !u.password && !u.port
  } catch {
    return false
  }
}

/** "ok", "diverge" ou "ausente" para cada campo que o cliente le. */
function campos(o, quais) {
  const p = pagamentoDe(o)
  const m = p?.payment_method
  const regras = {
    id: [o?.id, (v) => RE.ID.test(v)],
    status: [o?.status, (v) => RE.STATUS.test(v)],
    status_detail: [o?.status_detail, (v) => RE.DETALHE.test(v)],
    external_reference: [o?.external_reference, (v) => RE.UUID.test(v)],
    total_amount: [o?.total_amount, (v) => RE.VALOR.test(v)],
    'pag.id': [p?.id, (v) => RE.ID.test(v)],
    'pag.status': [p?.status, (v) => RE.STATUS.test(v)],
    'pag.status_detail': [p?.status_detail, (v) => RE.DETALHE.test(v)],
    'pag.bandeira': [m?.id, (v) => RE.BANDEIRA.test(v)],
    'pag.parcelas': [m?.installments, (v) => Number.isInteger(v) && v >= 1 && v <= 12],
    'pag.qr_code': [m?.qr_code, copiaECola],
    'pag.qr_code_base64': [m?.qr_code_base64, (v) => RE.BASE64.test(v)],
    'pag.date_of_expiration': [p?.date_of_expiration, (v) => RE.DATA.test(v)],
    'pag.desafio': [m?.transaction_security?.url, desafioAceito],
  }
  return quais
    .map((nome) => {
      const [valor, confere] = regras[nome]
      if (valor === undefined || valor === null) return `${nome}=ausente`
      return `${nome}=${typeof valor === typeof '' || typeof valor === 'number' ? (confere(valor) ? 'ok' : 'diverge') : 'diverge'}`
    })
    .join(' ')
}

/** Os caminhos das chaves de uma resposta, sem nenhum valor (lista: o primeiro item). */
function estrutura(v, base = '', fundo = 4) {
  if (fundo === 0 || typeof v !== 'object' || v === null) return []
  if (Array.isArray(v)) return v.length ? [`${base}[${v.length}]`, ...estrutura(v[0], `${base}[0]`, fundo - 1)] : [`${base}[0]`]
  return Object.keys(v)
    .filter((k) => /^[A-Za-z0-9_.-]{1,60}$/.test(k))
    .flatMap((k) => {
      const caminho = base ? `${base}.${k}` : k
      const filho = v[k]
      return typeof filho === 'object' && filho !== null ? estrutura(filho, caminho, fundo - 1) : [caminho]
    })
}

const criados = []

function anotar(caso, r, quais = []) {
  // 402: o pedido criado com a transacao recusada vem dentro de data (visto em 2026-11-23)
  const o = r.http === 402 && typeof r.json?.data === 'object' && r.json.data !== null ? r.json.data : r.json
  const p = pagamentoDe(o)
  const temPedido = (r.http >= 200 && r.http < 300) || r.http === 402
  if (temPedido && typeof o?.id === 'string' && RE.ID.test(o.id)) criados.push(o.id)
  if (r.http === 402 || caso.includes('estornar')) {
    console.log(`[${caso}: estrutura] ${estrutura(r.json).join(' ') || 'vazia'}`)
    const erros = Array.isArray(r.json?.errors) ? r.json.errors.map((e) => seguro(e?.code)).join(',') : '-'
    if (r.http === 402) console.log(`[${caso}: codigos] errors=${erros} code=${seguro(r.json?.code)}`)
  }
  const partes = [
    `[${caso}]`,
    `http=${r.http}`,
    `pedido=${prefixo(o?.id)} ${seguro(o?.status)}/${seguro(o?.status_detail)}`,
    `pagamento=${prefixo(p?.id)} ${seguro(p?.status)}/${seguro(p?.status_detail)}`,
    `erro=${temPedido ? '-' : codigoDoErro(o)}`,
  ]
  if (temPedido && quais.length) partes.push(`| ${campos(o, quais)}`)
  console.log(partes.join(' '))
  return o
}

const reais = (centavos) => (centavos / 100).toFixed(2)

function pedidoPix({ centavos, primeiroNome, itens }) {
  const valor = reais(centavos)
  const corpo = {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: valor,
    external_reference: randomUUID(),
    payer: primeiroNome ? { email: EMAIL, first_name: primeiroNome } : { email: EMAIL },
    transactions: { payments: [{ amount: valor, payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }] },
  }
  if (itens) corpo.items = itens
  return corpo
}

function pedidoCartao({ centavos, token }) {
  const valor = reais(centavos)
  return {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: valor,
    external_reference: randomUUID(),
    payer: { email: EMAIL, identification: { type: 'CPF', number: '12345678909' } },
    transactions: {
      payments: [{ amount: valor, payment_method: { id: 'master', type: 'credit_card', token, installments: 1 } }],
    },
    config: { online: { transaction_security: { validation: 'on_fraud_risk', liability_shift: 'required' } } },
  }
}

const criar = (corpo, extras) => chamar('POST', '/v1/orders', { corpo, chave: randomUUID(), extras })
const ler = (id) => chamar('GET', `/v1/orders/${id}`)
const cancelar = (id) => chamar('POST', `/v1/orders/${id}/cancel`, { chave: randomUUID() })
const estornar = (id) => chamar('POST', `/v1/orders/${id}/refund`, { chave: randomUUID() })

const CAMPOS_DO_PIX = ['id', 'status', 'status_detail', 'external_reference', 'total_amount', 'pag.id', 'pag.status', 'pag.status_detail', 'pag.qr_code', 'pag.qr_code_base64', 'pag.date_of_expiration']
const CAMPOS_DO_CARTAO = ['id', 'status', 'status_detail', 'external_reference', 'total_amount', 'pag.id', 'pag.status', 'pag.status_detail', 'pag.bandeira', 'pag.parcelas']

async function pixSemAprovar() {
  const o = anotar('pix sem APRO: criar', await criar(pedidoPix({ centavos: 1000 })), CAMPOS_DO_PIX)
  if (typeof o?.id !== 'string') return
  anotar('pix sem APRO: cancelar', await cancelar(o.id), ['status', 'status_detail'])
  anotar('pix sem APRO: cancelar de novo', await cancelar(o.id))
}

async function pixAprovado() {
  const o = anotar('pix APRO: criar', await criar(pedidoPix({ centavos: 1000, primeiroNome: 'APRO' })), CAMPOS_DO_PIX)
  if (typeof o?.id !== 'string') return
  let lido = null
  for (let i = 0; i < 12; i++) {
    await esperar(5000)
    const r = await ler(o.id)
    lido = r.json
    if (lido?.status === 'processed') break
  }
  const p = pagamentoDe(lido)
  console.log(`[pix APRO: lido em ate 60 s] pedido=${seguro(lido?.status)}/${seguro(lido?.status_detail)} pagamento=${seguro(p?.status)}/${seguro(p?.status_detail)}`)
  if (lido?.status !== 'processed') return
  anotar('pix APRO: estornar', await estornar(o.id), ['status', 'status_detail', 'pag.status', 'pag.status_detail'])
  anotar('pix APRO: estornar de novo', await estornar(o.id))
}

async function tokenDoCartao(titular) {
  const r = await chamar('POST', `/v1/card_tokens?public_key=${encodeURIComponent(CHAVE_PUBLICA)}`, {
    autorizado: false,
    corpo: {
      card_number: '5480832801033311',
      expiration_month: 11,
      expiration_year: 2030,
      security_code: '123',
      cardholder: { name: titular, identification: { type: 'CPF', number: '12345678909' } },
    },
  })
  const token = typeof r.json?.id === 'string' && /^[A-Za-z0-9-]{20,100}$/.test(r.json.id) ? r.json.id : null
  if (!token) console.log(`[cartao ${titular}: token] http=${r.http} erro=${codigoDoErro(r.json)} (casos de cartao so no navegador)`)
  return token
}

async function cartoes() {
  for (const titular of ['APRO', 'OTHE', 'CONT', 'APRO-CHOK']) {
    const token = await tokenDoCartao(titular)
    if (!token) return
    const quais = titular === 'APRO-CHOK' ? [...CAMPOS_DO_CARTAO, 'pag.desafio'] : CAMPOS_DO_CARTAO
    const o = anotar(`cartao ${titular}`, await criar(pedidoCartao({ centavos: 1000, token })), quais)
    const url = pagamentoDe(o)?.payment_method?.transaction_security?.url
    if (url !== undefined && url !== null) console.log(`[cartao ${titular}: desafio] host=${hostDoDesafio(url)}`)
  }
}

const POTES = [{ title: 'Pote de ensaio', unit_price: '20.00', quantity: 2 }]
const ENTREGA = { title: 'Entrega', unit_price: '18.10', quantity: 1 }

async function itens() {
  const a = anotar('itens A (so os potes, total com a entrega)', await criar(pedidoPix({ centavos: 5810, itens: POTES })))
  const b = anotar('itens B (potes + entrega)', await criar(pedidoPix({ centavos: 5810, itens: [...POTES, ENTREGA] })))
  if (typeof b?.id === 'string') {
    const lido = (await ler(b.id)).json
    console.log(`[itens B: lido] items no pedido=${Array.isArray(lido?.items) ? lido.items.length : 'ausente'}`)
  }
  if (typeof a?.id !== 'string' && typeof b?.id !== 'string') {
    const numeros = [...POTES, ENTREGA].map((i) => ({ ...i, unit_price: Number(i.unit_price) }))
    anotar('itens C (unit_price como numero)', await criar(pedidoPix({ centavos: 5810, itens: numeros })))
  }
}

async function dispositivo() {
  anotar(
    'device id (itens B + X-meli-session-id)',
    await criar(pedidoPix({ centavos: 5810, itens: [...POTES, ENTREGA] }), { 'X-meli-session-id': 'ensaio-0000000000' }),
  )
}

async function chaveRepetida() {
  const chave = randomUUID()
  const corpo = pedidoPix({ centavos: 1000 })
  const r1 = await chamar('POST', '/v1/orders', { corpo, chave })
  anotar('chave repetida: primeira', r1)
  const r2 = await chamar('POST', '/v1/orders', { corpo, chave })
  anotar('chave repetida: mesmo corpo', r2)
  const mesmo = typeof r1.json?.id === 'string' && r1.json.id === r2.json?.id
  console.log(`[chave repetida: mesmo corpo] devolveu o mesmo pedido=${mesmo ? 'sim' : 'nao'}`)
  anotar('chave repetida: outro corpo', await chamar('POST', '/v1/orders', { corpo: { ...corpo, total_amount: '11.00' }, chave }))
}

async function limpar() {
  const resumo = {}
  for (const id of new Set(criados)) {
    const lido = (await ler(id)).json
    let fim = seguro(lido?.status)
    if (['created', 'action_required', 'processing'].includes(lido?.status)) {
      const r = await cancelar(id)
      fim = `${seguro(lido?.status)}->cancelar:${r.http}${r.http === 200 ? '' : `:${codigoDoErro(r.json)}`}`
    }
    else if (lido?.status === 'processed') fim = `estornar:${(await estornar(id)).http}`
    resumo[fim] = (resumo[fim] ?? 0) + 1
  }
  console.log(`[limpeza] ${Object.entries(resumo).map(([k, n]) => `${k}=${n}`).join(' ') || 'nada criado'}`)
}

const eu = await chamar('GET', '/users/me')
if (eu.http !== 200 || !contaDeTeste(eu.json)) sair(2, `portao: a credencial nao e de usuario de teste no Brasil (http=${eu.http}); nada foi criado`)
console.log('[ensaio] portao: usuario de teste do Mercado Pago no Brasil')

try {
  await pixSemAprovar()
  await pixAprovado()
  await cartoes()
  await itens()
  await dispositivo()
  await chaveRepetida()
} finally {
  await limpar()
}
