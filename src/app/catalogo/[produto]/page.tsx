import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TelaProduto } from '@/components/layout/TelaProduto'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { lerComentariosAprovados } from '@/lib/dados/comentarios'
import { montarPaginaProduto } from '@/lib/produto'
import { linhasComProduto, montarGaveta } from '@/lib/visao'

type Props = { params: Promise<{ produto: string }> }

/**
 * Uma pagina por produto do cadastro, gerada no build. Produto posto no painel
 * depois do build ganha a pagina na primeira visita (as listas da home e do
 * catalogo ja o mostram em ate 5 minutos); slug fora do cadastro cai no 404
 * pelo notFound() abaixo.
 */
export async function generateStaticParams() {
  const { produtos } = await carregarCatalogo()
  return produtos.map((p) => ({ produto: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pagina = montarPaginaProduto(await carregarCatalogo(), (await params).produto, [])
  if (!pagina) return {}
  const { produto, linha } = pagina
  return {
    title: `${produto.nome} · ${linha.tipo} · AMO`,
    description: produto.descricao ?? `${produto.nome}, ${linha.tipo.toLowerCase()} ${linha.regra.toLowerCase()}.`,
  }
}

export default async function PaginaDoProduto({ params }: Props) {
  const catalogo = await carregarCatalogo()
  // o slug que vai ao banco sai do cadastro, nunca direto da URL
  const { produto: slug } = await params
  const produto = catalogo.produtos.find((p) => p.slug === slug)
  if (!produto) notFound()
  const pagina = montarPaginaProduto(catalogo, produto.slug, await lerComentariosAprovados(produto.slug))
  if (!pagina) notFound()
  return <TelaProduto pagina={pagina} gaveta={montarGaveta(catalogo)} linhas={linhasComProduto(catalogo)} />
}
