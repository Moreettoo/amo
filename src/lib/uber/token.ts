import 'server-only'
import { uberConfigurada, variavel } from '@/lib/dados/ambiente'
import { guardarTokenUber, lerTokenUber, reservarRenovacaoToken } from '@/lib/dados/entregas'
import { registrarFalha } from '@/lib/dados/erros'

/**
 * O token da Uber, um para o site inteiro. Dura 30 dias e a Uber limita os
 * pedidos de token por hora, entao ele mora no cofre do banco e so quem
 * ganha a vez (reservarRenovacaoToken) renova; os outros esperam 1 s e
 * releem. Nunca lanca: sem token devolve null. O log leva so "uber.token" e
 * o status HTTP, nunca o corpo, o token ou as credenciais.
 */

const URL_DO_TOKEN = 'https://auth.uber.com/oauth/v2/token'
const DOIS_DIAS = 2 * 24 * 60 * 60 * 1000

type Guardado = { token: string; expiraEm: number }
let memoria: Guardado | null = null

/** So para testes: esquece a copia em memoria. */
export function esquecerTokenEmMemoria(): void {
  memoria = null
}

const dormir = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const folga = (g: Guardado | null): number => (g ? g.expiraEm - Date.now() : -Infinity)

/** O token do banco; null sem token guardado; undefined quando o banco falhou (o erro ja foi ao log). */
async function doBanco(): Promise<Guardado | null | undefined> {
  try {
    const l = await lerTokenUber()
    return l ? { token: l.token, expiraEm: Date.parse(l.expiraEm) } : null
  } catch {
    return undefined
  }
}

/** Pede um token novo a Uber. Falha vira null e vai ao log; nunca lanca. */
async function pedirNovo(): Promise<Guardado | null> {
  let status = 0
  try {
    const resposta = await fetch(URL_DO_TOKEN, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: variavel('UBER_DIRECT_CLIENT_ID'),
        client_secret: variavel('UBER_DIRECT_CLIENT_SECRET'),
        grant_type: 'client_credentials',
        scope: 'eats.deliveries',
      }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    status = resposta.status
    if (!resposta.ok) throw new Error('recusado')
    const corpo: unknown = await resposta.json()
    const { access_token: token, expires_in: segundos } = (corpo ?? {}) as Record<string, unknown>
    if (typeof token !== 'string' || token === '') throw new Error('sem token')
    if (typeof segundos !== 'number' || !Number.isInteger(segundos) || segundos <= 0) throw new Error('validade torta')
    const novo = { token, expiraEm: Date.now() + segundos * 1000 }
    await guardarTokenUber(novo.token, new Date(novo.expiraEm).toISOString())
    return novo
  } catch {
    registrarFalha('uber.token', { status })
    return null
  }
}

/**
 * O token para chamar a Uber. renovar = true depois de um 401: rele o banco e
 * adota o token valido que for diferente do que falhou; so se nao houver
 * pede outro, mesmo que o guardado pareca valido. Null quando nao ha como obter.
 */
export async function obterToken(renovar = false): Promise<string | null> {
  if (!uberConfigurada()) return null

  if (!renovar && folga(memoria) > DOIS_DIAS) return memoria!.token

  const anterior = memoria
  const lido = await doBanco()
  // sem o banco nao ha como guardar o token novo: nao gasta pedido da Uber
  if (lido === undefined) return null
  // depois de um 401: se outro ja renovou (token valido e diferente do que falhou), adota
  if (renovar && lido !== null && lido.token !== anterior?.token && folga(lido) > 0) {
    memoria = lido
    return lido.token
  }
  const guardado = renovar ? null : lido
  if (!renovar && folga(guardado) > DOIS_DIAS) {
    memoria = guardado
    return guardado!.token
  }

  let vez = false
  try {
    vez = await reservarRenovacaoToken()
  } catch {
    return null
  }

  if (vez) {
    const novo = await pedirNovo()
    if (novo) {
      memoria = novo
      return novo.token
    }
    // a renovacao falhou: o token que ainda nao venceu serve (so sem 401)
    if (!renovar && folga(guardado) > 0) {
      memoria = guardado
      return guardado!.token
    }
    return null
  }

  // outro chamador renova: espera 1 s e rele uma vez
  await dormir(1000)
  const reli = (await doBanco()) ?? null
  const aceita = renovar ? reli !== null && reli.token !== anterior?.token && folga(reli) > 0 : folga(reli) > 0
  if (aceita) {
    memoria = reli
    return reli!.token
  }
  return null
}
