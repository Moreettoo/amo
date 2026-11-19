import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TelaProduto } from '@/components/layout/TelaProduto'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarPaginaProduto } from '@/lib/produto'
import { linhasComProduto, montarGaveta } from '@/lib/visao'

type Props = { params: Promise<{ produto: string }> }

/** Uma pagina por produto do cadastro, gerada no build. */
export async function generateStaticParams() {
  const { produtos } = await carregarCatalogo()
  return produtos.map((p) => ({ produto: p.slug }))
}

/** Slug fora do cadastro cai no 404. */
export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pagina = montarPaginaProduto(await carregarCatalogo(), (await params).produto)
  if (!pagina) return {}
  const { produto, linha, detalhes } = pagina
  return {
    title: `${produto.nome} · ${linha.tipo} · AMO`,
    description: detalhes?.descricao ?? `${produto.nome}, ${linha.tipo.toLowerCase()} ${linha.regra.toLowerCase()}.`,
  }
}

export default async function PaginaDoProduto({ params }: Props) {
  const catalogo = await carregarCatalogo()
  const pagina = montarPaginaProduto(catalogo, (await params).produto)
  if (!pagina) notFound()
  return <TelaProduto pagina={pagina} gaveta={montarGaveta(catalogo)} linhas={linhasComProduto(catalogo)} />
}
