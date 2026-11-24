import 'server-only'
import { criarClienteServidor } from '@/lib/auth/servidor'
import { conferirNumeroDoPedido } from '@/lib/conta/regras'
import { ErroDeRegra, erroDoBanco, falhaDoBanco } from '@/lib/dados/erros'

/**
 * Os pedidos da cliente logada, so para ler (quem escreve pedido e o
 * fechamento, na etapa 3). Nada que identifique alguem sai daqui: nem id, nem
 * e-mail, nome ou celular gravados no pedido, nem o Pix.
 */

import type { EstadoDoPedido } from '@/lib/fechamento/tipos'

export type { EstadoDoPedido }

export type PedidoNaLista = { numero: string; estado: EstadoDoPedido; criadoEm: string; totalCentavos: number; potes: number }

export type PedidoCompleto = {
  numero: string
  estado: EstadoDoPedido
  motivoDoCancelamento: 'cliente' | 'pagamento' | 'expirado' | 'loja' | null
  datas: { criado: string; pago: string | null; emPreparo: string | null; aCaminho: string | null; entregue: string | null; cancelado: string | null }
  subtotalCentavos: number
  freteCentavos: number
  totalCentavos: number
  itens: { produto: string; nome: string; tipo: string; precoCentavos: number; quantos: number; totalCentavos: number }[]
  entrega: {
    cep: string
    logradouro: string | null
    numero: string | null
    complemento: string | null
    bairro: string
    cidade: string
    uf: string
    minutos: number
    rastreioUrl: string | null
  }
  /** so a tentativa aprovada */
  pagamento: { forma: 'pix' | 'cartao'; parcelas: number | null; cartaoBandeira: string | null; cartaoFinal: string | null } | null
  /** so quando o pedido aguarda e a ultima tentativa e um Pix pendente, com QR e ainda valido */
  pixPendente: PixPendente | null
}

export type PixPendente = { copiaECola: string; qrBase64: string; expiraEm: string | null }

type TentativaLida = {
  forma: string
  status: string
  criado_em: string
  pix_copia_e_cola: string | null
  pix_qr_base64: string | null
  pix_expira_em: string | null
}

/** O Pix que ainda espera: pedido aguardando, ultima tentativa Pix pendente, com QR e sem vencer. */
export function pixPendenteDe(estado: string, tentativas: TentativaLida[], agora: number = Date.now()): PixPendente | null {
  if (estado !== 'aguardando_pagamento') return null
  const ultima = [...tentativas].sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em))[0]
  if (!ultima || ultima.forma !== 'pix' || ultima.status !== 'pendente') return null
  if (!ultima.pix_copia_e_cola || !ultima.pix_qr_base64) return null
  if (ultima.pix_expira_em && Date.parse(ultima.pix_expira_em) <= agora) return null
  return { copiaECola: ultima.pix_copia_e_cola, qrBase64: ultima.pix_qr_base64, expiraEm: ultima.pix_expira_em }
}

/**
 * O link de rastreio so passa se for https do Uber: uber.com ou um subdominio,
 * como direct-order.uber.com (o rastreio da Uber Direct). Dominio parecido
 * (uber.com.golpe.io, golpe-uber.com) nao passa.
 */
export function rastreioSeguro(url: unknown): string | null {
  if (typeof url !== 'string') return null
  try {
    const { protocol, hostname, username, password } = new URL(url)
    if (protocol !== 'https:' || username || password) return null
    return hostname === 'uber.com' || hostname.endsWith('.uber.com') ? url : null
  } catch {
    return null
  }
}

/** Os 50 mais recentes; potes e a soma de quantos de cada item. */
/** Quantos pedidos ela tem (o numero do sumario), sem trazer as linhas. */
export async function contarPedidos(usuarioId: string): Promise<number> {
  const banco = await criarClienteServidor()
  const { count, error, status } = await banco.from('pedidos').select('id', { count: 'exact', head: true }).eq('user_id', usuarioId)
  if (error) throw falhaDoBanco('pedidos', error, status)
  return count ?? 0
}

export async function lerPedidos(usuarioId: string): Promise<PedidoNaLista[]> {
  const banco = await criarClienteServidor()
  const { data, error, status } = await banco
    .from('pedidos')
    .select('numero, status, criado_em, total_centavos, itens_do_pedido(quantos)')
    .eq('user_id', usuarioId)
    .order('criado_em', { ascending: false })
    .limit(50)
  if (error) throw falhaDoBanco('pedidos', error, status)
  return data.map((p) => ({
    numero: p.numero,
    estado: p.status as EstadoDoPedido,
    criadoEm: p.criado_em,
    totalCentavos: p.total_centavos,
    potes: p.itens_do_pedido.reduce((soma, item) => soma + item.quantos, 0),
  }))
}

// um texto literal so: e dele que o supabase-js tira o tipo da resposta
const COLUNAS_DO_PEDIDO =
  'numero, status, motivo_cancelamento, criado_em, pago_em, em_preparo_em, a_caminho_em, entregue_em, cancelado_em, subtotal_centavos, frete_centavos, total_centavos, entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_uf, entrega_minutos, rastreio_url, itens_do_pedido(produto, nome, tipo, preco_centavos, quantos, total_centavos), pagamentos(forma, parcelas, cartao_bandeira, cartao_final, aprovado_em, status, criado_em, pix_copia_e_cola, pix_qr_base64, pix_expira_em)'

export async function lerPedido(usuarioId: string, numero: string): Promise<PedidoCompleto | null> {
  if (!conferirNumeroDoPedido(numero)) return null
  const banco = await criarClienteServidor()
  const { data: p, error, status } = await banco
    .from('pedidos')
    .select(COLUNAS_DO_PEDIDO)
    .eq('user_id', usuarioId)
    .eq('numero', numero)
    .order('nome', { referencedTable: 'itens_do_pedido' })
    .maybeSingle()
  if (error) throw falhaDoBanco('pedidos', error, status)
  if (!p) return null
  const aprovado = p.pagamentos.find((t) => t.aprovado_em !== null)
  return {
    numero: p.numero,
    estado: p.status as EstadoDoPedido,
    motivoDoCancelamento: p.motivo_cancelamento as PedidoCompleto['motivoDoCancelamento'],
    datas: {
      criado: p.criado_em,
      pago: p.pago_em,
      emPreparo: p.em_preparo_em,
      aCaminho: p.a_caminho_em,
      entregue: p.entregue_em,
      cancelado: p.cancelado_em,
    },
    subtotalCentavos: p.subtotal_centavos,
    freteCentavos: p.frete_centavos,
    totalCentavos: p.total_centavos,
    itens: p.itens_do_pedido.map((i) => ({
      produto: i.produto,
      nome: i.nome,
      tipo: i.tipo,
      precoCentavos: i.preco_centavos,
      quantos: i.quantos,
      totalCentavos: i.total_centavos,
    })),
    entrega: {
      cep: p.entrega_cep,
      logradouro: p.entrega_logradouro,
      numero: p.entrega_numero,
      complemento: p.entrega_complemento,
      bairro: p.entrega_bairro,
      cidade: p.entrega_cidade,
      uf: p.entrega_uf,
      minutos: p.entrega_minutos,
      rastreioUrl: rastreioSeguro(p.rastreio_url),
    },
    pagamento: aprovado
      ? {
          forma: aprovado.forma as 'pix' | 'cartao',
          parcelas: aprovado.parcelas,
          cartaoBandeira: aprovado.cartao_bandeira,
          cartaoFinal: aprovado.cartao_final,
        }
      : null,
    pixPendente: pixPendenteDe(p.status, p.pagamentos),
  }
}

/** Acha o pedido pelo numero, so entre os da cliente, e pede ao banco que cancele. */
export async function cancelarPedidoDaCliente(usuarioId: string, numero: string): Promise<void> {
  if (!conferirNumeroDoPedido(numero)) throw new ErroDeRegra('pedido_invalido')
  const banco = await criarClienteServidor()
  const { data, error, status } = await banco.from('pedidos').select('id').eq('user_id', usuarioId).eq('numero', numero).maybeSingle()
  if (error) throw falhaDoBanco('pedidos', error, status)
  if (!data) throw new ErroDeRegra('pedido_invalido')
  const cancelado = await banco.rpc('cancelar_pedido', { p_pedido: data.id })
  if (cancelado.error) throw erroDoBanco('cancelar_pedido', cancelado.error, cancelado.status)
}
