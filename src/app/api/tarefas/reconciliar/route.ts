import { createHash, timingSafeEqual } from 'node:crypto'
import { variavel } from '@/lib/dados/ambiente'
import { corridasAConferir, escalarCancelamentosIncertos } from '@/lib/dados/entregas'
import { ErroDeRegra, registrarFalha } from '@/lib/dados/erros'
import { aplicarPagamento, pagamentosAReconciliar, tentativasACancelarNoMp } from '@/lib/dados/pagamentos'
import { cancelarNoMp, estornarNoMp, sincronizarTentativa } from '@/lib/mercadopago/sincronizar'
import { cancelarCorridasPedidas, conferirCorrida, criarCorridasPendentes } from '@/lib/uber/corridas'

const PRAZO_MS = 50_000

const vazio = (status: number) => new Response(null, { status })
const sha = (texto: string) => createHash('sha256').update(texto).digest()
// O motivo vai ao log como codigo curto: o de um ErroDeRegra, ou o do caso.
const motivo = (erro: unknown, caso: string) => ({ code: erro instanceof ErroDeRegra ? erro.codigo : caso })

function autorizado(request: Request, segredo: string): boolean {
  const cabecalho = request.headers.get('authorization') ?? ''
  const apresentado = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : ''
  return timingSafeEqual(sha(apresentado), sha(segredo)) && cabecalho.startsWith('Bearer ')
}

/**
 * A reconciliacao: numa passada, com prazo de 50 s, confere as tentativas
 * paradas, cancela as que a criacao nunca respondeu, estorna o devido e
 * cancela no Mercado Pago o que terminou aqui. So as contagens saem.
 */
export async function POST(request: Request): Promise<Response> {
  let segredo: string
  try {
    segredo = variavel('TAREFAS_SEGREDO')
  } catch {
    registrarFalha('reconciliar.segredo', { code: 'sem_segredo' })
    return vazio(500)
  }
  if (!autorizado(request, segredo)) return vazio(401)

  const limite = Date.now() + PRAZO_MS
  const noPrazo = () => Date.now() < limite
  let conferidas = 0
  let canceladas = 0
  let falhas = 0

  const tentar = async (onde: string, fazer: () => Promise<unknown>): Promise<boolean> => {
    try {
      if ((await fazer()) !== null) return true
      registrarFalha(onde, { code: 'sem_resposta_do_mp' })
    } catch (erro) {
      registrarFalha(onde, motivo(erro, 'excecao'))
    }
    falhas++
    return false
  }

  try {
    for (const item of await pagamentosAReconciliar()) {
      if (!noPrazo()) break
      const { tentativa, mpPedidoId } = item
      let fez: boolean
      if (item.status === 'a_estornar') {
        if (!mpPedidoId) {
          registrarFalha('reconciliar.estorno_sem_pedido', { code: 'precisa_da_equipe' })
          falhas++
          continue
        }
        fez = await tentar('reconciliar.estornar', () => estornarNoMp(tentativa, mpPedidoId))
      } else if (mpPedidoId) {
        fez = await tentar('reconciliar.sincronizar', () => sincronizarTentativa(tentativa, mpPedidoId))
      } else {
        fez = await tentar('reconciliar.sem_pedido', () =>
          aplicarPagamento({
            tentativa,
            mpPedidoId: null,
            mpPagamentoId: null,
            status: 'cancelado',
            detalhe: 'sem_pedido_no_mp',
            valorCentavos: 0,
          }),
        )
      }
      if (fez) conferidas++
    }

    for (const { tentativa, mpPedidoId } of await tentativasACancelarNoMp()) {
      if (!noPrazo()) break
      if (await tentar('reconciliar.cancelar', () => cancelarNoMp(tentativa, mpPedidoId))) canceladas++
    }
  } catch (erro) {
    registrarFalha('reconciliar.lista', motivo(erro, 'excecao'))
    return vazio(500)
  }

  // As corridas da Uber (rede de seguranca dos avisos perdidos). Falha aqui
  // soma em falhas e nunca derruba a resposta nem o que o Mercado Pago fez.
  const corridas = { criadas: 0, canceladas: 0, conferidas: 0, incertas: 0, falhas: 0 }
  const falhou = (quantas: number) => {
    corridas.falhas += quantas
    falhas += quantas
  }
  const passo = async <T,>(onde: string, fazer: () => Promise<T>): Promise<T | null> => {
    try {
      return await fazer()
    } catch (erro) {
      registrarFalha(onde, motivo(erro, 'excecao'))
      falhou(1)
      return null
    }
  }

  if (noPrazo()) {
    const criou = await passo('reconciliar.corridas_criar', () => criarCorridasPendentes(5))
    if (criou) {
      corridas.criadas += criou.criadas
      falhou(criou.falhas)
    }
  }
  if (noPrazo()) {
    const cancelou = await passo('reconciliar.corridas_cancelar', () => cancelarCorridasPedidas())
    if (cancelou) {
      corridas.canceladas += cancelou.canceladas
      falhou(cancelou.falhas)
    }
  }
  if (noPrazo()) {
    const incertas = await passo('reconciliar.corridas_incertas', () => escalarCancelamentosIncertos())
    if (incertas) {
      corridas.incertas += incertas
      registrarFalha('reconciliar.cancelamento_incerto', { code: 'precisa_da_equipe' })
    }
  }
  if (noPrazo()) {
    const ids = await passo('reconciliar.corridas_lista', () => corridasAConferir())
    for (const id of ids ?? []) {
      if (!noPrazo()) break
      // null: lancou (o passo ja contou); false: a Uber ou o banco nao responderam
      const conferiu = await passo('reconciliar.corridas_conferir', () => conferirCorrida(id))
      if (conferiu) corridas.conferidas++
      else if (conferiu === false) falhou(1)
    }
  }

  return Response.json({ conferidas, canceladas, falhas, corridas })
}
