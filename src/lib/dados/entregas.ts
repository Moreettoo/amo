import 'server-only'
import { criarClienteAdmin } from '@/lib/auth/admin'
import { erroDoBanco, falhaDoBanco } from '@/lib/dados/erros'
import type { Faixa } from '@/lib/loja'

/**
 * A corrida no banco (spec 8 da entrega pelo Uber Direct): as funcoes de
 * privado que reservam, marcam e acompanham a corrida, com a chave secreta.
 * Resposta fora da forma vira falhaDoBanco; P0001 com codigo vira ErroDeRegra.
 */

export type EstadoDaCorrida = 'a_criar' | 'criando' | 'criada' | 'a_cancelar' | 'cancelada' | 'precisa_da_equipe'
const ESTADOS: readonly string[] = ['a_criar', 'criando', 'criada', 'a_cancelar', 'cancelada', 'precisa_da_equipe']
const STATUS_DO_PEDIDO: readonly string[] = ['aguardando_pagamento', 'pago', 'em_preparo', 'a_caminho', 'entregue', 'cancelado']

/** O que reservar_corridas devolve de cada corrida: so o que a Uber precisa. Datas em ISO. */
export type CorridaReservada = {
  pedido: string
  numero: string
  chave: string
  clienteNome: string | null
  clienteCelular: string | null
  cep: string
  logradouro: string | null
  numeroCasa: string | null
  complemento: string | null
  bairro: string
  cidade: string
  uf: string
  modo: 'agora' | 'agendado'
  janelaInicio: string | null
  janelaFim: string | null
  subtotalCentavos: number
  freteCentavos: number
  origem: 'uber' | 'exemplo' | null
  uberCotacaoId: string | null
  cotacaoExpiraEm: string | null
  itens: { nome: string; quantos: number; precoCentavos: number }[]
}

/** Chama uma funcao de privado com a chave secreta; o erro do banco vira erroDoBanco(funcao). */
async function chamar(funcao: string, params: Record<string, unknown>): Promise<{ data: unknown; status: number }> {
  const { data, error, status } = await criarClienteAdmin()
    .schema('privado' as never)
    .rpc(funcao as never, params as never)
  if (error) throw erroDoBanco(funcao, error as { code?: string; message?: string }, status)
  return { data, status }
}

/** A forma nao confere: sinal para virar falhaDoBanco de quem chamou. */
class Torta extends Error {}
const torta = (): never => {
  throw new Torta()
}

const texto = (v: unknown): string => (typeof v === 'string' && v !== '' ? v : torta())
const textoOuNulo = (v: unknown): string | null => (v === null ? null : texto(v))
const inteiro = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) ? v : torta())
const um = <T extends string>(v: unknown, validos: readonly string[]): T =>
  (typeof v === 'string' && validos.includes(v) ? v : torta()) as T

function dataOuNula(v: unknown): string | null {
  if (v === null) return null
  const instante = typeof v === 'string' ? Date.parse(v) : NaN
  return Number.isNaN(instante) ? torta() : new Date(instante).toISOString()
}

function lista(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return torta()
  return v.map((l) => (typeof l === 'object' && l !== null ? (l as Record<string, unknown>) : torta()))
}

/** Traduz a resposta; forma torta vira falhaDoBanco(funcao). */
function ler<T>(funcao: string, status: number, traduzir: () => T): T {
  try {
    return traduzir()
  } catch (e) {
    if (e instanceof Torta) throw falhaDoBanco(funcao, null, status)
    throw e
  }
}

function corridaReservada(l: Record<string, unknown>): CorridaReservada {
  return {
    pedido: texto(l.pedido),
    numero: texto(l.numero),
    chave: texto(l.chave),
    clienteNome: textoOuNulo(l.cliente_nome),
    clienteCelular: textoOuNulo(l.cliente_celular),
    cep: texto(l.cep),
    logradouro: textoOuNulo(l.logradouro),
    numeroCasa: textoOuNulo(l.numero_casa),
    complemento: l.complemento === null ? null : typeof l.complemento === 'string' ? l.complemento : torta(),
    bairro: texto(l.bairro),
    cidade: texto(l.cidade),
    uf: texto(l.uf),
    modo: um(l.modo, ['agora', 'agendado']),
    janelaInicio: dataOuNula(l.janela_inicio),
    janelaFim: dataOuNula(l.janela_fim),
    subtotalCentavos: inteiro(l.subtotal_centavos),
    freteCentavos: inteiro(l.frete_centavos),
    origem: l.origem === null ? null : um<'uber' | 'exemplo'>(l.origem, ['uber', 'exemplo']),
    uberCotacaoId: textoOuNulo(l.uber_cotacao_id),
    cotacaoExpiraEm: dataOuNula(l.cotacao_expira_em),
    itens: lista(l.itens).map((i) => ({ nome: texto(i.nome), quantos: inteiro(i.quantos), precoCentavos: inteiro(i.preco_centavos) })),
  }
}

/** Reserva ate maximo corridas a criar (privado.reservar_corridas): passam a criando e voltam com o que a Uber precisa. */
export async function reservarCorridas(maximo: number): Promise<CorridaReservada[]> {
  const { data, status } = await chamar('reservar_corridas', { p_maximo: maximo })
  return ler('reservar_corridas', status, () => lista(data).map(corridaReservada))
}

/** A Uber criou a corrida: grava o id e o que ela disse; devolve o estado em que a corrida ficou. */
export async function marcarCorridaCriada(a: {
  pedido: string
  uberEntregaId: string
  valorUberCentavos: number | null
  rastreioUrl: string | null
  statusUber: string
}): Promise<EstadoDaCorrida> {
  const { data, status } = await chamar('marcar_corrida_criada', {
    p_pedido: a.pedido,
    p_uber_entrega_id: a.uberEntregaId,
    p_valor_uber_centavos: a.valorUberCentavos,
    p_rastreio_url: a.rastreioUrl,
    p_status_uber: a.statusUber,
  })
  return ler('marcar_corrida_criada', status, () => um<EstadoDaCorrida>(data, ESTADOS))
}

/** A criacao na Uber falhou: conta a tentativa; devolve o estado em que a corrida ficou. */
export async function marcarCorridaFalhou(pedido: string, motivo: string, definitiva: boolean): Promise<EstadoDaCorrida> {
  const { data, status } = await chamar('marcar_corrida_falhou', { p_pedido: pedido, p_motivo: motivo, p_definitiva: definitiva })
  return ler('marcar_corrida_falhou', status, () => um<EstadoDaCorrida>(data, ESTADOS))
}

/** O pedido pago passa a agendado na faixa dada (faixa_indisponivel se ela nao vale). */
export async function remarcarEntrega(pedido: string, faixa: Faixa): Promise<void> {
  await chamar('remarcar_entrega', { p_pedido: pedido, p_inicio: faixa.inicio, p_fim: faixa.fim })
}

/** O que a Uber disse da corrida (lido pelo GET, nunca do aviso). null quando o id nao e de corrida nossa. */
export async function aplicarEntrega(a: {
  uberEntregaId: string
  statusUber: string
  rastreioUrl: string | null
  valorUberCentavos: number | null
}): Promise<{ pedido: string; pedidoStatus: string; estado: EstadoDaCorrida } | null> {
  const { data, status } = await chamar('aplicar_entrega', {
    p_uber_entrega_id: a.uberEntregaId,
    p_status_uber: a.statusUber,
    p_rastreio_url: a.rastreioUrl,
    p_valor_uber_centavos: a.valorUberCentavos,
  })
  return ler('aplicar_entrega', status, () => {
    const linha = lista(data)[0]
    if (!linha) return null
    return {
      pedido: texto(linha.pedido),
      pedidoStatus: um<string>(linha.pedido_status, STATUS_DO_PEDIDO),
      estado: um<EstadoDaCorrida>(linha.estado, ESTADOS),
    }
  })
}

/** As corridas que o servidor cancela na Uber. */
export async function corridasACancelar(): Promise<{ pedido: string; uberEntregaId: string }[]> {
  const { data, status } = await chamar('corridas_a_cancelar', {})
  return ler('corridas_a_cancelar', status, () =>
    lista(data).map((l) => ({ pedido: texto(l.pedido), uberEntregaId: texto(l.uber_entrega_id) })),
  )
}

/** A Uber confirmou o cancelamento que pedimos. */
export async function corridaCancelada(pedido: string): Promise<void> {
  await chamar('corrida_cancelada', { p_pedido: pedido })
}

/** Os ids das corridas criadas sem noticia ha mais de 10 minutos, para perguntar a Uber. */
export async function corridasAConferir(): Promise<string[]> {
  const { data, status } = await chamar('corridas_a_conferir', {})
  return ler('corridas_a_conferir', status, () => lista(data).map((l) => texto(l.uber_entrega_id)))
}

/** O token da Uber do site inteiro (privado.ler_token_uber); null quando ainda nao ha token guardado. */
export async function lerTokenUber(): Promise<{ token: string; expiraEm: string } | null> {
  const { data, status } = await chamar('ler_token_uber', {})
  return ler('ler_token_uber', status, () => {
    const linhas = lista(data)
    if (linhas.length === 0) return null
    const expiraEm = dataOuNula(linhas[0].expira_em)
    return { token: texto(linhas[0].token), expiraEm: expiraEm ?? torta() }
  })
}

/** Guarda o token novo no cofre (cria o segredo na primeira vez, troca depois). */
export async function guardarTokenUber(token: string, expiraEm: string): Promise<void> {
  await chamar('guardar_token_uber', { p_token: token, p_expira_em: expiraEm })
}

/** Verdadeiro para um so chamador a cada 60 s: quem renova o token. */
export async function reservarRenovacaoToken(): Promise<boolean> {
  const { data, status } = await chamar('reservar_renovacao_token', {})
  return ler('reservar_renovacao_token', status, () => (typeof data === 'boolean' ? data : torta()))
}

/** Passa a precisa_da_equipe as a_cancelar sem id paradas ha mais de 10 minutos (cancelamento incerto); devolve quantas. */
export async function escalarCancelamentosIncertos(): Promise<number> {
  const { data, status } = await chamar('escalar_cancelamentos_incertos', {})
  return ler('escalar_cancelamentos_incertos', status, () => inteiro(data))
}
