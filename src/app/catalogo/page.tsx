import type { Metadata } from 'next'
import { TelaCatalogo } from '@/components/layout/TelaCatalogo'
import { carregarCatalogo } from '@/lib/catalogo'
import { linhasComProduto, montarCatalogo, montarGaveta } from '@/lib/visao'

export const metadata: Metadata = { title: 'Catálogo · AMO' }

/** "Tudo": todas as receitas, agrupadas por linha. Com uma linha so, a
 *  pagina dela (montarCatalogo decide). */
export default async function PaginaCatalogo() {
  const catalogo = await carregarCatalogo()
  return (
    <TelaCatalogo
      vista={montarCatalogo(catalogo, null)}
      gaveta={montarGaveta(catalogo)}
      linhas={linhasComProduto(catalogo)}
    />
  )
}
