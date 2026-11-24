import 'server-only'
import { uberEmTeste, variavel } from '@/lib/dados/ambiente'
import type { Cozinha } from '@/lib/dados/ambiente'
import { registrarFalha } from '@/lib/dados/erros'
import type { janelasDaFaixa } from '@/lib/loja'
import { obterToken } from '@/lib/uber/token'
import { enderecoDaUber, telefoneDaUber } from '@/lib/uber/endereco'
import type { EnderecoUber } from '@/lib/uber/endereco'

/**
 * O cliente HTTP da Uber Direct: cotar, criar, ler e cancelar. Nunca lanca:
 * devolve { ok: false, status, codigo } (status 0 sem resposta). Todo pedido
 * vai so para api.uber.com/v1/customers/<id>/..., com limite de 6 s. O log leva
 * so a operacao, o status e o code da Uber, nunca corpo, token, endereco,
 * telefone, nome nem o id da conta.
 */

export type ResultadoUber<T> = { ok: true; dados: T } | { ok: false; status: number; codigo: string | null }
export type CotacaoUber = {
  id: string
  valorCentavos: number
  minutos: number
  retiradaEmMinutos: number | null
  /** O live_mode da cotacao; null quando a Uber nao o traz (o caso real). */
  aoVivo: boolean | null
}
export type CorridaUber = {
  id: string
  status: string
  valorCentavos: number | null
  rastreioUrl: string | null
  aoVivo: boolean
}
export type Janelas = ReturnType<typeof janelasDaFaixa>

const RAIZ = 'https://api.uber.com/v1/customers/'
const ID_COTACAO = /^dqt_[A-Za-z0-9_-]{1,100}$/
const ID_CORRIDA = /^del_[A-Za-z0-9_-]{1,100}$/
const STATUS = /^[a-z_]{1,40}$/
const CODIGO = /^[a-z0-9_]{1,60}$/
// so para a cotacao: a Uber nao exige o telefone de quem recebe para cotar
const TELEFONE_DE_COTACAO = '+5511999999999'

type Operacao = 'cotar' | 'criar' | 'ler' | 'cancelar'
type Conferir<T> = (corpo: Record<string, unknown>) => ResultadoUber<T>

const falha = (status: number, codigo: string | null): { ok: false; status: number; codigo: string | null } => ({
  ok: false,
  status,
  codigo,
})
const objeto = (x: unknown): Record<string, unknown> | null =>
  typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : null
const inteiro = (x: unknown, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max
const semMilissegundos = (iso: string): string => iso.replace(/\.\d{3}Z$/, 'Z')

function janelasDoCorpo(j: Janelas | null): Record<string, string> {
  if (!j) return {}
  return {
    pickup_ready_dt: semMilissegundos(j.retiradaDe),
    pickup_deadline_dt: semMilissegundos(j.retiradaAte),
    dropoff_ready_dt: semMilissegundos(j.entregaDe),
    dropoff_deadline_dt: semMilissegundos(j.entregaAte),
  }
}

/** Um pedido a Uber: renova o token uma vez num 401, confere a resposta, loga so o minimo. */
async function chamar<T>(
  op: Operacao,
  metodo: 'GET' | 'POST',
  caminho: string,
  corpo: unknown,
  conferir: Conferir<T>,
): Promise<ResultadoUber<T>> {
  const resultado = await enviar(metodo, caminho, corpo, conferir)
  if (!resultado.ok) {
    const [status, code] = [resultado.status, resultado.codigo]
    registrarFalha(`uber.${op}`, { status, code })
  }
  return resultado
}

async function enviar<T>(
  metodo: 'GET' | 'POST',
  caminho: string,
  corpo: unknown,
  conferir: Conferir<T>,
): Promise<ResultadoUber<T>> {
  try {
    const url = `${RAIZ}${encodeURIComponent(variavel('UBER_DIRECT_CUSTOMER_ID'))}${caminho}`
    let token = await obterToken()
    if (!token) return falha(0, 'sem_token')

    for (let vez = 0; vez < 2; vez++) {
      const resposta = await fetch(url, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      })
      if (resposta.status === 401 && vez === 0) {
        token = await obterToken(true)
        if (!token) return falha(0, 'sem_token')
        continue
      }

      let lido: unknown = null
      try {
        lido = await resposta.json()
      } catch {
        lido = null
      }
      const dados = objeto(lido)
      if (!resposta.ok) {
        const code = dados?.code
        return falha(resposta.status, typeof code === 'string' && CODIGO.test(code) ? code : null)
      }
      if (!dados) return falha(resposta.status, 'resposta_torta')
      const conferido = conferir(dados)
      return conferido.ok ? conferido : falha(resposta.status, conferido.codigo)
    }
    return falha(401, null)
  } catch {
    return falha(0, null)
  }
}

function conferirCotacao(c: Record<string, unknown>): ResultadoUber<CotacaoUber> {
  if (typeof c.id !== 'string' || !ID_COTACAO.test(c.id)) return falha(200, 'resposta_torta')
  if (!inteiro(c.fee, 100000)) return falha(200, 'resposta_torta')
  if (c.currency !== 'brl') return falha(200, typeof c.currency === 'string' ? 'moeda' : 'resposta_torta')
  if (typeof c.duration !== 'number' || !Number.isFinite(c.duration) || c.duration < 0 || c.duration > 100000) {
    return falha(200, 'resposta_torta')
  }
  let retiradaEmMinutos: number | null = null
  if (c.pickup_duration !== undefined && c.pickup_duration !== null) {
    if (typeof c.pickup_duration !== 'number' || !Number.isFinite(c.pickup_duration) || c.pickup_duration < 0) {
      return falha(200, 'resposta_torta')
    }
    retiradaEmMinutos = c.pickup_duration
  }
  let aoVivo: boolean | null = null
  if (c.live_mode !== undefined && c.live_mode !== null) {
    if (typeof c.live_mode !== 'boolean') return falha(200, 'resposta_torta')
    aoVivo = c.live_mode
  }
  return { ok: true, dados: { id: c.id, valorCentavos: c.fee, minutos: c.duration, retiradaEmMinutos, aoVivo } }
}

function conferirCorrida(c: Record<string, unknown>): ResultadoUber<CorridaUber> {
  if (typeof c.id !== 'string' || !ID_CORRIDA.test(c.id)) return falha(200, 'resposta_torta')
  if (typeof c.status !== 'string' || !STATUS.test(c.status)) return falha(200, 'resposta_torta')
  if (typeof c.live_mode !== 'boolean') return falha(200, 'resposta_torta')
  let valorCentavos: number | null = null
  if (c.fee !== undefined && c.fee !== null) {
    if (!inteiro(c.fee, 100000)) return falha(200, 'resposta_torta')
    valorCentavos = c.fee
  }
  let rastreioUrl: string | null = null
  if (c.tracking_url !== undefined && c.tracking_url !== null) {
    if (typeof c.tracking_url !== 'string' || c.tracking_url.length > 500) return falha(200, 'resposta_torta')
    let u: URL
    try {
      u = new URL(c.tracking_url)
    } catch {
      return falha(200, 'resposta_torta')
    }
    if (u.protocol !== 'https:') return falha(200, 'resposta_torta')
    rastreioUrl = c.tracking_url
  }
  return { ok: true, dados: { id: c.id, status: c.status, valorCentavos, rastreioUrl, aoVivo: c.live_mode } }
}

/** Cota a entrega: da cozinha ao endereco da cliente, agora ou na janela da faixa. */
export async function cotarNaUber(p: {
  retirada: EnderecoUber
  telefoneRetirada: string
  entrega: EnderecoUber
  janelas: Janelas | null
}): Promise<ResultadoUber<CotacaoUber>> {
  let corpo: Record<string, unknown>
  try {
    corpo = {
      pickup_address: enderecoDaUber(p.retirada),
      dropoff_address: enderecoDaUber(p.entrega),
      pickup_phone_number: telefoneDaUber(p.telefoneRetirada),
      dropoff_phone_number: TELEFONE_DE_COTACAO,
      ...janelasDoCorpo(p.janelas),
    }
  } catch {
    registrarFalha('uber.cotar', { status: 0, code: 'dados_invalidos' })
    return falha(0, 'dados_invalidos')
  }
  return chamar('cotar', 'POST', '/delivery_quotes', corpo, conferirCotacao)
}

/** O celular como a Uber quer: tira o que nao e digito e o 55 do pais, depois poe +55. */
function celularDaCliente(celular: string): string {
  let d = celular.replace(/\D/g, '')
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  return telefoneDaUber(d)
}

/** Cria a corrida com a cotacao dada; a chave e a idempotency_key da Uber. */
export async function criarCorridaNaUber(p: {
  cotacaoId: string
  chave: string
  numeroDoPedido: string
  cozinha: Cozinha
  cliente: { nome: string; celular: string; endereco: EnderecoUber }
  itens: { nome: string; quantos: number; precoCentavos: number }[]
  subtotalCentavos: number
  janelas: Janelas | null
}): Promise<ResultadoUber<CorridaUber>> {
  let corpo: Record<string, unknown>
  try {
    corpo = {
      quote_id: p.cotacaoId,
      idempotency_key: p.chave,
      pickup_name: p.cozinha.nome,
      pickup_address: enderecoDaUber(p.cozinha.endereco),
      pickup_phone_number: telefoneDaUber(p.cozinha.telefone),
      dropoff_name: p.cliente.nome,
      dropoff_address: enderecoDaUber(p.cliente.endereco),
      dropoff_phone_number: celularDaCliente(p.cliente.celular),
      manifest_items: p.itens.map((i) => ({ name: i.nome, quantity: i.quantos, size: 'small', price: i.precoCentavos })),
      manifest_total_value: p.subtotalCentavos,
      manifest_reference: p.numeroDoPedido,
      external_id: p.numeroDoPedido,
      deliverable_action: 'deliverable_action_meet_at_door',
      undeliverable_action: 'leave_at_door',
      dropoff_verification: { picture: true },
      ...janelasDoCorpo(p.janelas),
      ...(uberEmTeste() ? { test_specifications: { robo_courier_specification: { mode: 'auto' } } } : {}),
    }
  } catch {
    registrarFalha('uber.criar', { status: 0, code: 'dados_invalidos' })
    return falha(0, 'dados_invalidos')
  }
  return chamar('criar', 'POST', '/deliveries', corpo, conferirCorrida)
}

/** Le a corrida. O id passa pela regra antes de entrar no caminho. */
export async function lerCorridaNaUber(id: string): Promise<ResultadoUber<CorridaUber>> {
  if (!ID_CORRIDA.test(id)) return idInvalido('ler')
  return chamar('ler', 'GET', `/deliveries/${id}`, undefined, conferirCorrida)
}

/** Cancela a corrida. O id passa pela regra antes de entrar no caminho. */
export async function cancelarCorridaNaUber(id: string): Promise<ResultadoUber<CorridaUber>> {
  if (!ID_CORRIDA.test(id)) return idInvalido('cancelar')
  return chamar('cancelar', 'POST', `/deliveries/${id}/cancel`, {}, conferirCorrida)
}

function idInvalido(op: Operacao): { ok: false; status: number; codigo: string | null } {
  registrarFalha(`uber.${op}`, { status: 0, code: 'id_invalido' })
  return falha(0, 'id_invalido')
}
