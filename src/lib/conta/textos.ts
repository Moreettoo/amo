import type { EstadoDoPedido, PedidoCompleto } from '@/lib/dados/pedidos'

/**
 * Os textos de Minha conta que saem dos dados: o nome de cada estado, as
 * datas na hora de Sao Paulo, a entrega e o pagamento numa linha. Puro: as
 * paginas e os testes leem daqui.
 */

export const NOME_DO_ESTADO: Record<EstadoDoPedido, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  em_preparo: 'Em preparo',
  a_caminho: 'A caminho',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

/** A segunda voz do titulo do pedido, em script (sempre em minuscula: DESIGN.md). */
export const FRASE_DO_ESTADO: Record<EstadoDoPedido, string> = {
  aguardando_pagamento: 'esperando o pagamento',
  pago: 'pago, na fila',
  em_preparo: 'em preparo',
  a_caminho: 'a caminho',
  entregue: 'entregue',
  cancelado: 'cancelado',
}

export const MOTIVO_DO_CANCELAMENTO: Record<NonNullable<PedidoCompleto['motivoDoCancelamento']>, string> = {
  cliente: 'Cancelado por você.',
  pagamento: 'O pagamento não foi aprovado.',
  expirado: 'O prazo para pagar acabou.',
  loja: 'Cancelado pela AMO.',
}

const FUSO = 'America/Sao_Paulo'
const partes = (iso: string, opcoes: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, ...opcoes })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>

/** 14h02, na hora de Sao Paulo. */
export function formatarHora(iso: string): string {
  const { hour, minute } = partes(iso, { hour: 'numeric', minute: '2-digit', hourCycle: 'h23' })
  return `${Number(hour)}h${minute}`
}

/** 15 de novembro de 2026, 14h30. */
export function formatarDataEHora(iso: string): string {
  const { day, month, year } = partes(iso, { day: 'numeric', month: 'long', year: 'numeric' })
  return `${day} de ${month} de ${year}, ${formatarHora(iso)}`
}

/** 8 de novembro; com o ano quando nao e o ano corrente. */
export function formatarDia(iso: string, agora: Date = new Date()): string {
  const { day, month, year } = partes(iso, { day: 'numeric', month: 'long', year: 'numeric' })
  const anoDeAgora = partes(agora.toISOString(), { year: 'numeric' }).year
  return year === anoDeAgora ? `${day} de ${month}` : `${day} de ${month} de ${year}`
}

const cepComTraco = (cep: string) => (cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep)

/** A entrega numa linha; sem o retrato do endereco (pedido anonimizado), so o bairro em diante. */
export function descreverEntrega(e: PedidoCompleto['entrega']): string {
  const lugar = `${e.bairro}, ${e.cidade}, ${e.uf} · CEP ${cepComTraco(e.cep)}`
  if (!e.logradouro) return lugar
  const rua = [e.logradouro, e.numero, e.complemento].filter(Boolean).join(', ')
  return `${rua} · ${lugar}`
}

const BANDEIRAS: Record<string, string> = {
  visa: 'Visa',
  master: 'Mastercard',
  amex: 'American Express',
  elo: 'Elo',
  hipercard: 'Hipercard',
}
const nomeDaBandeira = (b: string) => BANDEIRAS[b] ?? `${b.charAt(0).toUpperCase()}${b.slice(1).replace(/_/g, ' ')}`

/** Pix, ou o cartao com a bandeira, o final e as parcelas; null sem pagamento aprovado. */
export function descreverPagamento(p: PedidoCompleto['pagamento']): string | null {
  if (!p) return null
  if (p.forma === 'pix') return 'Pix'
  const bandeira = p.cartaoBandeira ? ` ${nomeDaBandeira(p.cartaoBandeira)}` : ''
  const final = p.cartaoFinal ? ` final ${p.cartaoFinal}` : ''
  const parcelas = p.parcelas && p.parcelas > 1 ? ` em ${p.parcelas}x` : ''
  return `Cartão${bandeira}${final}${parcelas}`
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? ''
