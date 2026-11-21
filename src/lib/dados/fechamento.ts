import 'server-only'
import { criarClienteServidor } from '@/lib/auth/servidor'
import { erroDoBanco, falhaDoBanco } from '@/lib/dados/erros'
import { conferirNumeroDoPedido } from '@/lib/conta/regras'
import type { ItemDoPedido } from '@/lib/fechamento/tipos'

/**
 * Cria o pedido pela public.criar_pedido, com a sessao da cliente: o banco
 * confere tudo e poe o preco. O id do pedido nao sai daqui; so o numero e o total.
 */
export async function criarPedido(e: {
  itens: ItemDoPedido[]
  cotacao: string
  totalVisto: number
  guardarEndereco: boolean
}): Promise<{ numero: string; totalCentavos: number }> {
  const banco = await criarClienteServidor()
  const { data, error, status } = await banco.rpc('criar_pedido', {
    p_itens: e.itens,
    p_cotacao: e.cotacao,
    p_total_visto: e.totalVisto,
    p_guardar_endereco: e.guardarEndereco,
  })
  if (error) throw erroDoBanco('criar_pedido', error, status)
  const linha = data?.[0]
  if (!linha || typeof linha.numero !== 'string' || !Number.isInteger(linha.total_centavos)) {
    throw falhaDoBanco('criar_pedido', null, status)
  }
  return { numero: linha.numero, totalCentavos: linha.total_centavos }
}

/** O pedido da cliente pelo numero (a RLS limita aos dela), ou null: numero fora do formato nem vai ao banco. */
export async function lerPedidoParaPagar(numero: string): Promise<{ id: string; totalCentavos: number; estado: string } | null> {
  const conferido = conferirNumeroDoPedido(numero)
  if (!conferido) return null
  const banco = await criarClienteServidor()
  const { data, error, status } = await banco
    .from('pedidos')
    .select('id, total_centavos, status')
    .eq('numero', conferido)
    .maybeSingle()
  if (error) throw erroDoBanco('pedidos', error, status)
  if (!data) return null
  return { id: data.id, totalCentavos: data.total_centavos, estado: data.status }
}

/** Abre a tentativa de pagamento (public.iniciar_pagamento) e devolve o id dela. */
export async function iniciarPagamento(pedidoId: string, forma: 'pix' | 'cartao'): Promise<string> {
  const banco = await criarClienteServidor()
  const { data, error, status } = await banco.rpc('iniciar_pagamento', { p_pedido: pedidoId, p_forma: forma })
  if (error) throw erroDoBanco('iniciar_pagamento', error, status)
  if (typeof data !== 'string' || !data) throw falhaDoBanco('iniciar_pagamento', null, status)
  return data
}

/**
 * A tentativa que a tela mostra: a aprovada, quando houver (a que pagou, nao
 * uma cancelada ou estornada depois dela), senao a mais recente; null se
 * ainda nao houve.
 */
export async function lerUltimaTentativa(pedidoId: string): Promise<{
  id: string
  forma: 'pix' | 'cartao'
  status: string
  recusa: string | null
  pixCopiaECola: string | null
  pixQrBase64: string | null
  pixExpiraEm: string | null
  criadoEm: string
} | null> {
  const banco = await criarClienteServidor()
  const ler = async (soAAprovada: boolean) => {
    let consulta = banco
      .from('pagamentos')
      .select('id, forma, status, recusa, pix_copia_e_cola, pix_qr_base64, pix_expira_em, criado_em')
      .eq('pedido_id', pedidoId)
    if (soAAprovada) consulta = consulta.eq('status', 'aprovado')
    const { data, error, status } = await consulta.order('criado_em', { ascending: false }).limit(1).maybeSingle()
    if (error) throw erroDoBanco('pagamentos', error, status)
    return data
  }
  const data = (await ler(true)) ?? (await ler(false))
  if (!data) return null
  return {
    id: data.id,
    forma: data.forma === 'cartao' ? 'cartao' : 'pix',
    status: data.status,
    recusa: data.recusa,
    pixCopiaECola: data.pix_copia_e_cola,
    pixQrBase64: data.pix_qr_base64,
    pixExpiraEm: data.pix_expira_em,
    criadoEm: data.criado_em,
  }
}
