import 'server-only'
import { criarClienteAdmin } from '@/lib/auth/admin'
import { erroDoBanco, falhaDoBanco } from '@/lib/dados/erros'
import type { EstadoDaTentativa } from '@/lib/mercadopago/traducao'

/** Chama uma funcao de privado com a chave secreta; o erro do banco vira erroDoBanco(funcao). */
async function chamar(funcao: string, params: Record<string, unknown>): Promise<{ data: unknown; status: number }> {
  const { data, error, status } = await criarClienteAdmin()
    .schema('privado' as never)
    .rpc(funcao as never, params as never)
  if (error) throw erroDoBanco(funcao, error as { code?: string; message?: string }, status)
  return { data, status }
}

const linhas = (data: unknown): Record<string, unknown>[] => (Array.isArray(data) ? (data as Record<string, unknown>[]) : [])

/** O que o Mercado Pago disse de uma tentativa (privado.aplicar_pagamento): devolve os estados em que tentativa e pedido ficaram. */
export async function aplicarPagamento(a: {
  tentativa: string
  mpPedidoId: string | null
  mpPagamentoId: string | null
  status: EstadoDaTentativa
  detalhe: string
  valorCentavos: number
  bandeira?: string | null
  final?: string | null
  parcelas?: number | null
  pixCopiaECola?: string | null
  pixQrBase64?: string | null
  pixExpiraEm?: string | null
  recusa?: string | null
}): Promise<{ tentativa: string; pedido: string }> {
  const { data, status } = await chamar('aplicar_pagamento', {
    p_pagamento: a.tentativa,
    p_mp_pedido_id: a.mpPedidoId,
    p_mp_pagamento_id: a.mpPagamentoId,
    p_status: a.status,
    p_detalhe: a.detalhe,
    p_valor_centavos: a.valorCentavos,
    p_cartao_bandeira: a.bandeira ?? null,
    p_cartao_final: a.final ?? null,
    p_parcelas: a.parcelas ?? null,
    p_pix_copia_e_cola: a.pixCopiaECola ?? null,
    p_pix_qr_base64: a.pixQrBase64 ?? null,
    p_pix_expira_em: a.pixExpiraEm ?? null,
    p_recusa: a.recusa ?? null,
  })
  const linha = linhas(data)[0]
  if (!linha || typeof linha.pagamento_status !== 'string' || typeof linha.pedido_status !== 'string') {
    throw falhaDoBanco('aplicar_pagamento', null, status)
  }
  return { tentativa: linha.pagamento_status, pedido: linha.pedido_status }
}

/** As tentativas encerradas aqui que o Mercado Pago ainda tem como pendentes (todas, ou so as do pedido). */
export async function tentativasACancelarNoMp(pedidoId?: string): Promise<{ tentativa: string; mpPedidoId: string }[]> {
  const { data } = await chamar('pagamentos_a_cancelar_no_mp', { p_pedido: pedidoId ?? null })
  return linhas(data).map((l) => ({ tentativa: String(l.pagamento_id), mpPedidoId: String(l.mp_pedido_id) }))
}

/** O pedido do Mercado Pago de uma tentativa, ou null. */
export async function mpPedidoDaTentativa(tentativa: string): Promise<string | null> {
  const { data } = await chamar('mp_pedido_da_tentativa', { p_pagamento: tentativa })
  return typeof data === 'string' ? data : null
}

/** Tentativas pendentes ha mais de 10 minutos e estornos devidos, para a reconciliacao conferir. */
export async function pagamentosAReconciliar(): Promise<{ tentativa: string; mpPedidoId: string | null; status: string }[]> {
  const { data } = await chamar('pagamentos_a_reconciliar', {})
  return linhas(data).map((l) => ({
    tentativa: String(l.pagamento_id),
    mpPedidoId: typeof l.mp_pedido_id === 'string' ? l.mp_pedido_id : null,
    status: String(l.status),
  }))
}

/** Registra um aviso do Mercado Pago: 'novo', 'ja_tratado' ou 'tratar_de_novo'. */
export async function registrarEventoWebhook(e: {
  eventoId: string
  tipo: string | null
  recursoId: string | null
}): Promise<{ evento: number; situacao: 'novo' | 'ja_tratado' | 'tratar_de_novo' }> {
  const { data, status } = await chamar('registrar_evento_webhook', {
    p_origem: 'mercadopago',
    p_evento_id: e.eventoId,
    p_tipo: e.tipo,
    p_recurso_id: e.recursoId,
  })
  const linha = linhas(data)[0]
  const situacao = linha?.situacao
  if (!linha || typeof linha.evento !== 'number' || (situacao !== 'novo' && situacao !== 'ja_tratado' && situacao !== 'tratar_de_novo')) {
    throw falhaDoBanco('registrar_evento_webhook', null, status)
  }
  return { evento: linha.evento, situacao }
}

/** Fecha o aviso: sem erro, tratado; com erro, fica em aberto para tratar de novo. */
export async function concluirEventoWebhook(evento: number, erro: string | null): Promise<void> {
  await chamar('concluir_evento_webhook', { p_evento: evento, p_erro: erro })
}
