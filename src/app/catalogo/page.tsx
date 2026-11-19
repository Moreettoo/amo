import type { Metadata } from 'next'
import { TelaCatalogo } from '@/components/layout/TelaCatalogo'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { descricaoDoCatalogo, linhasComProduto, montarCatalogo, montarGaveta } from '@/lib/visao'

/** O titulo e fixo; a descricao diz as categorias que o cadastro tem. */
export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Catálogo · AMO', description: descricaoDoCatalogo(await carregarCatalogo()) }
}

/** O catalogo inteiro numa pagina so: um capitulo por categoria, com as
 *  linhas dentro. Categoria, linha e produto sao ancoras dela. */
export default async function PaginaCatalogo() {
  const catalogo = await carregarCatalogo()
  return (
    <TelaCatalogo
      vista={montarCatalogo(catalogo)}
      gaveta={montarGaveta(catalogo)}
      linhas={linhasComProduto(catalogo)}
    />
  )
}
