import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TelaCatalogo } from '@/components/layout/TelaCatalogo'
import { carregarCatalogo } from '@/lib/catalogo'
import { descricaoDaLinha, linhasComProduto, montarCatalogo, montarGaveta } from '@/lib/visao'

type Props = { params: Promise<{ linha: string }> }

/** So as linhas do cadastro existem; qualquer outro slug cai no 404. */
export const dynamicParams = false

/** Uma pagina estatica por linha com produto. */
export async function generateStaticParams() {
  return linhasComProduto(await carregarCatalogo()).map((l) => ({ linha: l.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { linha: slug } = await params
  const linha = linhasComProduto(await carregarCatalogo()).find((l) => l.slug === slug)
  if (!linha) return {}
  return { title: `${linha.nome} · Catálogo · AMO`, description: descricaoDaLinha(linha) }
}

export default async function PaginaLinha({ params }: Props) {
  const { linha } = await params
  const catalogo = await carregarCatalogo()
  if (!linhasComProduto(catalogo).some((l) => l.slug === linha)) notFound()
  return (
    <TelaCatalogo
      vista={montarCatalogo(catalogo, linha)}
      gaveta={montarGaveta(catalogo)}
      linhas={linhasComProduto(catalogo)}
    />
  )
}
