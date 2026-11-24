// SO DE ENSAIO. O site nunca importa este arquivo: ele entra apenas no
// servidor de ensaio, pela linha de comando, e nenhum codigo do site muda por
// ele:
//
//   NODE_OPTIONS=--import=./scripts/ensaio/uber-falsa.mjs npm run dev
//
// Troca o fetch global so para https://auth.uber.com/oauth/v2/token e para
// https://api.uber.com/v1/customers/<conta>/... e responde como a Uber Direct
// de teste (formas conferidas no ensaio real, supabase/README.md). Nada e
// cobrado e nada sai da maquina:
//
// - token: um fixo, que vale 30 dias;
// - cotacao (POST delivery_quotes): id dqt_..., currency brl, fee em centavos
//   que cresce com os digitos do CEP de entrega, e sem live_mode (como a real);
// - corrida (POST deliveries): id del_..., live_mode false, tracking_url em
//   direct-order.uber.com; a cada GET ela anda pending, pickup,
//   pickup_complete, dropoff e delivered, de 20 em 20 s desde a criacao;
// - cancelar (POST deliveries/<id>/cancel): canceled; de novo, 409; ja
//   entregue, 409.
//
// Qualquer outro endereco passa para o fetch de verdade. O id da corrida traz
// a hora da criacao e o valor, para outro processo do servidor de
// desenvolvimento responder a mesma corrida.
//
// So vale no ensaio: sem UBER_DIRECT_AMBIENTE=teste, ou com NODE_ENV=production,
// ate a Uber passa para o fetch de verdade (um NODE_OPTIONS esquecido num
// ambiente de verdade nao vira corrida falsa). A conferencia e na hora da
// chamada: no --import, o .env.local ainda nao foi lido.

const TOKEN = 'https://auth.uber.com/oauth/v2/token'
const RAIZ = 'https://api.uber.com/v1/customers/'
const PASSO_MS = 20_000
const ESTADOS = ['pending', 'pickup', 'pickup_complete', 'dropoff', 'delivered']
const TRINTA_DIAS = 30 * 24 * 60 * 60
const ID_DA_CORRIDA = /^del_ensaio_([0-9a-z]+)_(\d+)$/
const ID_DA_COTACAO = /^dqt_ensaio_(\d+)_[0-9a-f]{8}$/

/** id -> { criadoEm, fee, cancelada }. Outro processo refaz a corrida pelo id. */
const corridas = new Map()
/** chave de idempotencia -> id da corrida, so dentro deste processo. */
const criacoes = new Map()

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
const erro = (status, code) => json(status, { code, message: `${code} (ensaio)` })

function lerJson(texto) {
  try {
    const x = JSON.parse(texto ?? '')
    return typeof x === 'object' && x !== null ? x : {}
  } catch {
    return {}
  }
}

/** O CEP da entrega: o endereco vai como texto JSON dentro do corpo. */
function digitosDoCep(endereco) {
  const e = typeof endereco === 'string' ? lerJson(endereco) : (endereco ?? {})
  return String(e.zip_code ?? '').replace(/\D/g, '')
}

/** R$ 8,00 mais 20 centavos por unidade da soma dos digitos do CEP. */
function freteDoCep(cep) {
  const soma = [...cep].reduce((s, d) => s + Number(d), 0)
  return 800 + soma * 20
}

function cotar(corpoEmTexto) {
  const corpo = lerJson(corpoEmTexto)
  const cep = digitosDoCep(corpo.dropoff_address)
  if (cep.length !== 8) return erro(400, 'invalid_params')
  const fee = freteDoCep(cep)
  const agora = Date.now()
  const aleatorio = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  return json(200, {
    kind: 'delivery_quote',
    id: `dqt_ensaio_${fee}_${aleatorio}`,
    created: new Date(agora).toISOString(),
    expires: new Date(agora + 15 * 60_000).toISOString(),
    fee,
    currency: 'brl',
    currency_type: 'BRL',
    dropoff_eta: new Date(agora + 45 * 60_000).toISOString(),
    duration: 30,
    pickup_duration: 12,
  })
}

function corpoDaCorrida(id, c, agora) {
  const passos = Math.min(ESTADOS.length - 1, Math.floor((agora - c.criadoEm) / PASSO_MS))
  const status = c.cancelada ? 'canceled' : ESTADOS[Math.max(0, passos)]
  return {
    kind: 'delivery',
    id,
    status,
    complete: status === 'delivered',
    fee: c.fee,
    currency: 'brl',
    live_mode: false,
    tracking_url: `https://direct-order.uber.com/orders/${id}`,
    created: new Date(c.criadoEm).toISOString(),
    updated: new Date(agora).toISOString(),
  }
}

/** A corrida pelo id; criada em outro processo, refeita a partir do proprio id. */
function acharCorrida(id) {
  const guardada = corridas.get(id)
  if (guardada) return guardada
  const m = ID_DA_CORRIDA.exec(id)
  if (!m) return null
  const refeita = { criadoEm: parseInt(m[1], 36), fee: Number(m[2]), cancelada: false }
  corridas.set(id, refeita)
  return refeita
}

function criar(corpoEmTexto) {
  const corpo = lerJson(corpoEmTexto)
  const chave = typeof corpo.idempotency_key === 'string' ? corpo.idempotency_key : ''
  if (chave && criacoes.has(chave)) {
    const id = criacoes.get(chave)
    return json(200, corpoDaCorrida(id, corridas.get(id), Date.now()))
  }
  const cotacao = ID_DA_COTACAO.exec(typeof corpo.quote_id === 'string' ? corpo.quote_id : '')
  if (!cotacao) return erro(400, 'invalid_params')
  const agora = Date.now()
  const fee = Number(cotacao[1])
  const id = `del_ensaio_${agora.toString(36)}_${fee}`
  corridas.set(id, { criadoEm: agora, fee, cancelada: false })
  if (chave) criacoes.set(chave, id)
  return json(200, corpoDaCorrida(id, corridas.get(id), agora))
}

function responder(metodo, caminho, corpoEmTexto) {
  const agora = Date.now()
  if (metodo === 'POST' && caminho === '/delivery_quotes') return cotar(corpoEmTexto)
  if (metodo === 'POST' && caminho === '/deliveries') return criar(corpoEmTexto)

  const m = /^\/deliveries\/([A-Za-z0-9_-]+)(\/cancel)?$/.exec(caminho)
  if (!m) return erro(404, 'not_found')
  const [, id, cancelar] = m
  const c = acharCorrida(id)
  if (!c) return erro(404, 'unknown_delivery')
  if (!cancelar) return metodo === 'GET' ? json(200, corpoDaCorrida(id, c, agora)) : erro(405, 'method_not_allowed')
  if (metodo !== 'POST') return erro(405, 'method_not_allowed')
  if (c.cancelada) return erro(409, 'delivery_already_canceled')
  if (corpoDaCorrida(id, c, agora).status === 'delivered') return erro(409, 'cannot_cancel_delivery')
  c.cancelada = true
  return json(200, corpoDaCorrida(id, c, agora))
}

// --- a troca do fetch ---

const fetchDeVerdade = globalThis.fetch

/** O ensaio, lido na hora da chamada: UBER_DIRECT_AMBIENTE=teste e fora de um build de producao. */
const noEnsaio = () => process.env.UBER_DIRECT_AMBIENTE?.trim() === 'teste' && process.env.NODE_ENV !== 'production'

function enderecoDe(entrada) {
  if (typeof entrada === 'string') return entrada
  if (entrada instanceof URL) return entrada.href
  return typeof entrada?.url === 'string' ? entrada.url : ''
}

globalThis.fetch = async function fetchDoEnsaio(entrada, init) {
  const endereco = enderecoDe(entrada)
  const eToken = endereco === TOKEN
  if (!eToken && !endereco.startsWith(RAIZ)) return fetchDeVerdade(entrada, init)
  if (!noEnsaio()) {
    console.warn('[ensaio] Uber falsa desligada (sem UBER_DIRECT_AMBIENTE=teste, ou com NODE_ENV=production): a chamada vai a Uber de verdade.')
    return fetchDeVerdade(entrada, init)
  }

  if (eToken) {
    console.warn('[ensaio] Uber falsa: POST /oauth/v2/token 200')
    return json(200, { access_token: 'ensaio-token-da-uber-falsa', token_type: 'Bearer', expires_in: TRINTA_DIAS, scope: 'eats.deliveries' })
  }

  const pedido = entrada instanceof Request ? entrada : null
  const metodo = (init?.method ?? pedido?.method ?? 'GET').toUpperCase()
  let corpo = init?.body
  if (corpo === undefined && pedido && metodo !== 'GET') corpo = await pedido.text()
  // o que vem depois de /v1/customers/<conta>
  const caminho = endereco.slice(RAIZ.length).split('?')[0].replace(/^[^/]*/, '')

  const resposta = responder(metodo, caminho, typeof corpo === 'string' ? corpo : undefined)
  let estado = ''
  try {
    const lido = await resposta.clone().json()
    estado = lido.status ? ` ${lido.status}` : lido.code ? ` ${lido.code}` : ''
  } catch {
    estado = ''
  }
  console.warn(`[ensaio] Uber falsa: ${metodo} ${caminho.replace(/\/del_[A-Za-z0-9_-]+/, '/<id>')} ${resposta.status}${estado}`)
  return resposta
}

console.warn(
  `[ensaio] Uber falsa ligada neste processo (pid ${process.pid}). Com UBER_DIRECT_AMBIENTE=teste, nada vai a Uber de verdade.`,
)
