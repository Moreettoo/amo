// SO DE ENSAIO. O site nunca importa este arquivo: ele entra apenas no
// servidor de ensaio, pela linha de comando, e nenhum codigo do site muda por
// ele:
//
//   NODE_OPTIONS=--import=./scripts/ensaio/mercadopago-falso.mjs npm run dev
//
// Troca o fetch global so para https://api.mercadopago.com/v1/orders e
// responde como o contrato (docs/superpowers/specs/2026-11-21-amo-mercadopago-orders.md,
// secoes 1 a 3). Nada e cobrado e nada sai da maquina:
//
// - criar com Pix: 201 action_required / waiting_transfer, com um QR de ensaio
//   (um PNG com cara de QR, que app nenhum le) e o copia e cola 00020126-ensaio;
// - criar com cartao: 201 processed / accredited, como o cartao APRO;
// - ler (GET) o mesmo pedido: o Pix continua esperando ate 20 s depois de
//   criado e dali em diante volta processed / accredited;
// - cancelar: canceled / canceled; de novo, 409 order_already_canceled; ja
//   pago, 409 cannot_cancel_order;
// - estornar: refunded / refunded; de novo, 409 order_already_refunded; ainda
//   nao pago, 409 cannot_refund_order (codigo do ensaio, fora do contrato).
//
// Qualquer outro endereco passa para o fetch de verdade. O id do pedido traz a
// hora da criacao, o valor e a referencia, para outro processo do servidor de
// desenvolvimento responder o mesmo pedido.
//
// So vale no ensaio: sem MERCADOPAGO_AMBIENTE=teste, ou com NODE_ENV=production,
// ate o /v1/orders passa para o fetch de verdade (um NODE_OPTIONS esquecido num
// ambiente de verdade nao vira Pix falso pago). A conferencia e na hora da
// chamada: no --import, o .env.local ainda nao foi lido.

import { deflateSync } from 'node:zlib'

const BASE = 'https://api.mercadopago.com/v1/orders'
const APROVA_EM_MS = 20_000
const PIX_VALE_MS = 30 * 60_000
const COPIA_E_COLA = '00020126-ensaio'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALOR = /^\d+\.\d{2}$/
const ID_DO_ENSAIO = /^ORDENSAIO([0-9a-z]+)_([0-9a-z]+)_([0-9a-f]{32})$/

// --- o QR de ensaio: um PNG em tons de cinza, feito aqui, sem dependencia ---

const LADO = 25
const ESCALA = 8
const MARGEM = 4

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes) {
  let c = 0xffffffff
  for (const b of bytes) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function blocoPng(tipo, dados) {
  const nome = Buffer.from(tipo, 'ascii')
  const tamanho = Buffer.alloc(4)
  tamanho.writeUInt32BE(dados.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([nome, dados])))
  return Buffer.concat([tamanho, nome, dados, crc])
}

/** Os modulos: os tres olhos, as linhas de tempo e o resto sorteado pela semente. */
function modulos(semente) {
  const escuro = Array.from({ length: LADO }, () => new Array(LADO).fill(false))
  const fixo = Array.from({ length: LADO }, () => new Array(LADO).fill(false))
  const olho = (linha, coluna) => {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const l = linha + i
        const c = coluna + j
        if (l < 0 || c < 0 || l >= LADO || c >= LADO) continue
        fixo[l][c] = true
        const dentro = i >= 0 && i <= 6 && j >= 0 && j <= 6
        const borda = i === 0 || i === 6 || j === 0 || j === 6
        const miolo = i >= 2 && i <= 4 && j >= 2 && j <= 4
        escuro[l][c] = dentro && (borda || miolo)
      }
    }
  }
  olho(0, 0)
  olho(0, LADO - 7)
  olho(LADO - 7, 0)
  for (let k = 8; k < LADO - 8; k++) {
    escuro[6][k] = escuro[k][6] = k % 2 === 0
    fixo[6][k] = fixo[k][6] = true
  }
  let x = semente
  for (let l = 0; l < LADO; l++) {
    for (let c = 0; c < LADO; c++) {
      if (fixo[l][c]) continue
      x = (Math.imul(x, 1103515245) + 12345) >>> 0
      escuro[l][c] = ((x >>> 16) & 1) === 1
    }
  }
  return escuro
}

function qrDeEnsaio(texto) {
  let semente = 0x811c9dc5
  for (const ch of texto) semente = Math.imul(semente ^ ch.charCodeAt(0), 0x01000193) >>> 0
  const escuro = modulos(semente)
  const lado = (LADO + 2 * MARGEM) * ESCALA
  const linhas = Buffer.alloc((lado + 1) * lado)
  for (let y = 0; y < lado; y++) {
    const inicio = y * (lado + 1)
    const l = Math.floor(y / ESCALA) - MARGEM
    for (let xx = 0; xx < lado; xx++) {
      const c = Math.floor(xx / ESCALA) - MARGEM
      const ponto = l >= 0 && c >= 0 && l < LADO && c < LADO && escuro[l][c]
      linhas[inicio + 1 + xx] = ponto ? 0x00 : 0xff
    }
  }
  const cabeca = Buffer.alloc(13)
  cabeca.writeUInt32BE(lado, 0)
  cabeca.writeUInt32BE(lado, 4)
  cabeca[8] = 8 // 8 bits por ponto, tons de cinza (tipo 0)
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const png = Buffer.concat([assinatura, blocoPng('IHDR', cabeca), blocoPng('IDAT', deflateSync(linhas)), blocoPng('IEND', Buffer.alloc(0))])
  return png.toString('base64')
}

const QR_BASE64 = qrDeEnsaio(COPIA_E_COLA)

// --- os pedidos do ensaio ---

/** id -> { criadoEm, centavos, referencia, tipo, bandeira, parcelas, fim: null | 'cancelado' | 'estornado' } */
const pedidos = new Map()
/**
 * chave de idempotencia da criacao -> { corpo, id }. A idempotencia so vale
 * dentro deste processo: outro processo do servidor (o Next pode ter mais de
 * um) nao conhece a chave e, com ela repetida, cria outro pedido.
 */
const criacoes = new Map()

const semTracos = (uuid) => uuid.toLowerCase().replaceAll('-', '')
const comTracos = (h) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`

function idDoPedido(p) {
  return `ORDENSAIO${p.criadoEm.toString(36)}_${p.centavos.toString(36)}_${semTracos(p.referencia)}`
}

/** O pedido pelo id; criado em outro processo, refeito a partir do proprio id (sempre Pix). */
function acharPedido(id) {
  const visto = pedidos.get(id)
  if (visto) return visto
  const m = ID_DO_ENSAIO.exec(id)
  if (!m) return null
  const p = { criadoEm: parseInt(m[1], 36), centavos: parseInt(m[2], 36), referencia: comTracos(m[3]), tipo: 'pix', bandeira: 'pix', parcelas: null, fim: null }
  pedidos.set(id, p)
  return p
}

const pago = (p, agora) => p.tipo !== 'pix' || agora - p.criadoEm >= APROVA_EM_MS

function estadoDe(p, agora) {
  if (p.fim === 'cancelado') return { pedido: ['canceled', 'canceled'], pagamento: ['canceled', 'canceled_transaction'] }
  if (p.fim === 'estornado') return { pedido: ['refunded', 'refunded'], pagamento: ['refunded', 'refunded'] }
  if (pago(p, agora)) return { pedido: ['processed', 'accredited'], pagamento: ['processed', 'accredited'] }
  return { pedido: ['action_required', 'waiting_transfer'], pagamento: ['action_required', 'waiting_transfer'] }
}

function corpoDoPedido(id, p, agora) {
  const valor = (p.centavos / 100).toFixed(2)
  const estado = estadoDe(p, agora)
  const metodo =
    p.tipo === 'pix'
      ? { id: 'pix', type: 'bank_transfer', qr_code: COPIA_E_COLA, qr_code_base64: QR_BASE64 }
      : { id: p.bandeira, type: p.tipo, installments: p.parcelas }
  const pagamento = {
    id: id.replace(/^ORD/, 'PAY'),
    amount: valor,
    status: estado.pagamento[0],
    status_detail: estado.pagamento[1],
    payment_method: metodo,
  }
  if (p.tipo === 'pix') pagamento.date_of_expiration = new Date(p.criadoEm + PIX_VALE_MS).toISOString()
  return {
    id,
    type: 'online',
    processing_mode: 'automatic',
    external_reference: p.referencia,
    total_amount: valor,
    status: estado.pedido[0],
    status_detail: estado.pedido[1],
    created_date: new Date(p.criadoEm).toISOString(),
    transactions: { payments: [pagamento] },
  }
}

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
const erro = (status, code) => json(status, { errors: [{ code, message: `${code} (ensaio)` }] })

function criar(corpoEmTexto, chave) {
  let corpo
  try {
    corpo = JSON.parse(corpoEmTexto ?? '')
  } catch {
    return erro(400, 'bad_request')
  }
  const anterior = criacoes.get(chave)
  if (anterior) {
    if (anterior.corpo !== corpoEmTexto) return erro(409, 'idempotency_key_already_used')
    return json(201, corpoDoPedido(anterior.id, pedidos.get(anterior.id), Date.now()))
  }
  const pagamento = corpo?.transactions?.payments?.[0]
  const metodo = pagamento?.payment_method
  if (!VALOR.test(corpo?.total_amount ?? '') || pagamento?.amount !== corpo.total_amount) return erro(400, 'invalid_total_amount')
  if (!UUID.test(corpo?.external_reference ?? '')) return erro(400, 'bad_request')
  const cartao = metodo?.type === 'credit_card' || metodo?.type === 'debit_card'
  if (!(metodo?.id === 'pix' && metodo?.type === 'bank_transfer') && !cartao) return erro(400, 'bad_request')

  const [reais, frac] = corpo.total_amount.split('.')
  const p = {
    criadoEm: Date.now(),
    centavos: Number(reais) * 100 + Number(frac),
    referencia: corpo.external_reference.toLowerCase(),
    tipo: cartao ? metodo.type : 'pix',
    bandeira: cartao ? String(metodo.id) : 'pix',
    parcelas: cartao ? metodo.installments : null,
    fim: null,
  }
  const id = idDoPedido(p)
  pedidos.set(id, p)
  criacoes.set(chave, { corpo: corpoEmTexto, id })
  return json(201, corpoDoPedido(id, p, p.criadoEm))
}

function responder(metodo, caminho, cabecalhos, corpoEmTexto) {
  const autorizacao = cabecalhos.get('authorization') ?? ''
  if (!/^Bearer \S+$/.test(autorizacao)) return erro(401, 'invalid_credentials')
  const chave = cabecalhos.get('x-idempotency-key') ?? ''
  if (metodo === 'POST' && (chave.length < 1 || chave.length > 128)) return erro(400, 'bad_request')

  if (metodo === 'POST' && caminho === '') return criar(corpoEmTexto, chave)

  const m = /^\/([A-Za-z0-9_-]{1,64})(\/cancel|\/refund)?$/.exec(caminho)
  if (!m) return erro(404, 'not_found')
  const id = m[1]
  const p = acharPedido(id)
  if (!p) return erro(404, 'order_not_found')
  const agora = Date.now()

  if (metodo === 'GET' && !m[2]) return json(200, corpoDoPedido(id, p, agora))
  if (metodo !== 'POST' || !m[2]) return erro(405, 'method_not_allowed')

  if (m[2] === '/cancel') {
    if (p.fim === 'cancelado') return erro(409, 'order_already_canceled')
    if (p.fim || pago(p, agora)) return erro(409, 'cannot_cancel_order')
    p.fim = 'cancelado'
    return json(200, corpoDoPedido(id, p, agora))
  }
  if (p.fim === 'estornado') return erro(409, 'order_already_refunded')
  if (p.fim || !pago(p, agora)) return erro(409, 'cannot_refund_order')
  p.fim = 'estornado'
  return json(200, corpoDoPedido(id, p, agora))
}

// --- a troca do fetch ---

const fetchDeVerdade = globalThis.fetch

/** O ensaio, lido na hora da chamada: MERCADOPAGO_AMBIENTE=teste e fora de um build de producao. */
const noEnsaio = () => process.env.MERCADOPAGO_AMBIENTE?.trim() === 'teste' && process.env.NODE_ENV !== 'production'

function enderecoDe(entrada) {
  if (typeof entrada === 'string') return entrada
  if (entrada instanceof URL) return entrada.href
  return typeof entrada?.url === 'string' ? entrada.url : ''
}

globalThis.fetch = async function fetchDoEnsaio(entrada, init) {
  const endereco = enderecoDe(entrada)
  if (endereco !== BASE && !endereco.startsWith(`${BASE}/`)) return fetchDeVerdade(entrada, init)
  if (!noEnsaio()) {
    console.warn('[ensaio] Mercado Pago falso desligado (sem MERCADOPAGO_AMBIENTE=teste, ou com NODE_ENV=production): a chamada vai ao Mercado Pago de verdade.')
    return fetchDeVerdade(entrada, init)
  }

  const pedido = entrada instanceof Request ? entrada : null
  const metodo = (init?.method ?? pedido?.method ?? 'GET').toUpperCase()
  const cabecalhos = new Headers(init?.headers ?? pedido?.headers)
  let corpo = init?.body
  if (corpo === undefined && pedido && metodo !== 'GET') corpo = await pedido.text()
  const caminho = endereco.slice(BASE.length).split('?')[0]

  const resposta = responder(metodo, caminho, cabecalhos, typeof corpo === 'string' ? corpo : undefined)
  let estado = ''
  try {
    const lido = await resposta.clone().json()
    estado = lido.status ? ` ${lido.status}/${lido.status_detail}` : ` ${lido.errors?.[0]?.code ?? ''}`
  } catch {
    estado = ''
  }
  console.warn(`[ensaio] Mercado Pago falso: ${metodo} /v1/orders${caminho.replace(/\/[A-Za-z0-9_-]+/, '/<id>')} ${resposta.status}${estado}`)
  return resposta
}

console.warn(
  `[ensaio] Mercado Pago falso ligado neste processo (pid ${process.pid}). Com MERCADOPAGO_AMBIENTE=teste, nada vai ao Mercado Pago de verdade.`,
)
