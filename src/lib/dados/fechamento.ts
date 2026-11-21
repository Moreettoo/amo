import 'server-only'
import { criarClienteServidor } from '@/lib/auth/servidor'
import { erroDoBanco, falhaDoBanco } from '@/lib/dados/erros'
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
