import type { Metadata } from 'next'
import { connection } from 'next/server'
import { TelaSacola } from '@/components/layout/TelaSacola'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { linhasComProduto, montarGaveta } from '@/lib/visao'

export const metadata: Metadata = {
  title: 'Sacola · AMO',
  description: 'Os potes que você escolheu, a entrega pelo Uber e o fechamento do pedido.',
  robots: { index: false },
}

/** A sacola e o fechamento do pedido. A sacola mora no navegador; a pagina
 *  so traz a loja (nome, foto e preco de cada sabor). */
export default async function PaginaSacola() {
  // a politica com nonce (proxy.ts) exige a pagina montada a cada visita
  await connection()
  const catalogo = await carregarCatalogo()
  return <TelaSacola gaveta={montarGaveta(catalogo)} linhas={linhasComProduto(catalogo)} />
}
