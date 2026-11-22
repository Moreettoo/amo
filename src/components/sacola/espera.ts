import type { SituacaoDoPedido } from '@/lib/fechamento/tipos'

/**
 * As regras puras da espera do pagamento: o ritmo das perguntas ao servidor,
 * quando a espera termina e a hora em que o codigo Pix vence.
 */

const MINUTO = 60_000

/** Ate quando a espera pergunta sozinha: no Pix, 30 min, o tempo do codigo. */
export const ESPERA_DO_PIX_MS = 30 * MINUTO
/** No desafio do banco (3DS), 40 min: o tempo que a cliente tem (contrato do Mercado Pago, 1.2). */
export const ESPERA_DO_DESAFIO_MS = 40 * MINUTO

/** O ritmo: a cada 5 s nos 2 primeiros minutos, a cada 15 s ate o fim da espera (30 min no Pix); depois para (null). */
export function proximaEspera(desde: number, agora: number, ate: number = ESPERA_DO_PIX_MS): number | null {
  const passou = agora - desde
  if (passou < 2 * MINUTO) return 5_000
  if (passou < ate) return 15_000
  return null
}

/** A tentativa que acabou sem pagar: o codigo dela nao vale mais. */
const SEM_CODIGO = new Set(['expirado', 'cancelado', 'recusado'])

/** O pedido saiu da espera, ou a tentativa acabou: nao ha mais o que perguntar. */
export function terminou(s: SituacaoDoPedido): boolean {
  return s.estado !== 'aguardando_pagamento' || (s.pagamento !== null && SEM_CODIGO.has(s.pagamento.estado))
}

/** Pago: o pedido seguiu (pago, em preparo, a caminho ou entregue). */
export function aprovado(s: SituacaoDoPedido): boolean {
  return s.estado !== 'aguardando_pagamento' && s.estado !== 'cancelado'
}

/** O pedido ainda espera, mas o codigo da tentativa acabou (vencido, trocado por outro, recusado): pede-se outro. */
export function codigoAcabou(s: SituacaoDoPedido): boolean {
  return s.estado === 'aguardando_pagamento' && terminou(s)
}

/** A mesma situacao, para a espera so avisar quando alguma coisa muda. */
export function mesmaSituacao(a: SituacaoDoPedido, b: SituacaoDoPedido): boolean {
  const pa = a.pagamento
  const pb = b.pagamento
  return (
    a.numero === b.numero &&
    a.estado === b.estado &&
    pa?.forma === pb?.forma &&
    pa?.estado === pb?.estado &&
    pa?.recusa === pb?.recusa &&
    pa?.desafioUrl === pb?.desafioUrl &&
    pa?.pix?.copiaECola === pb?.pix?.copiaECola &&
    pa?.pix?.qrBase64 === pb?.pix?.qrBase64 &&
    pa?.pix?.expiraEm === pb?.pix?.expiraEm
  )
}

const HORA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** "14:32", na hora de Sao Paulo. */
export function horaDeSaoPaulo(iso: string): string {
  return HORA.format(new Date(iso))
}
