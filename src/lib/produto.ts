import { COMENTARIOS_DE_EXEMPLO, DETALHES_DE_EXEMPLO } from '@/data/exemplos'
import type { Catalogo, Categoria, Linha, Produto } from '@/lib/catalogo'

/**
 * A pagina de um produto. O cadastro (carregarCatalogo) diz o que o produto
 * e; preco, descricao e comentarios ainda vem dos dados de exemplo
 * (src/data/exemplos.ts) e entram aqui, num lugar so, para o Supabase
 * trocar depois sem mexer na pagina.
 */

export type DetalhesDoProduto = {
  /** em centavos */
  preco: number
  descricao: string
}

export type Nota = 1 | 2 | 3 | 4 | 5

export type Comentario = {
  id: string
  /** slug de Produto */
  produto: string
  nome: string
  nota: Nota
  /** AAAA-MM-DD */
  data: string
  texto: string
}

export type ResumoDasNotas = {
  total: number
  /** com uma casa: 4.6 */
  media: number
  /** quantos comentarios por nota, da 5 para a 1 */
  porNota: readonly { nota: Nota; quantos: number }[]
}

export type PaginaProduto = {
  produto: Produto
  linha: Linha
  categoria: Categoria
  detalhes: DetalhesDoProduto | null
  /** os selos do produto e os da linha, com nome */
  selosDoProduto: readonly { id: string; nome: string }[]
  selosDaLinha: readonly { id: string; nome: string }[]
  comentarios: readonly Comentario[]
  resumo: ResumoDasNotas
}

/** Abaixo disso o resumo das notas engana mais do que ajuda (Baymard). */
export const MINIMO_PARA_RESUMO = 6

export function resumirNotas(comentarios: readonly Comentario[]): ResumoDasNotas {
  const total = comentarios.length
  const soma = comentarios.reduce((s, c) => s + c.nota, 0)
  const porNota = ([5, 4, 3, 2, 1] as const).map((nota) => ({
    nota,
    quantos: comentarios.filter((c) => c.nota === nota).length,
  }))
  return { total, media: total ? Math.round((soma / total) * 10) / 10 : 0, porNota }
}

const REAL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
/** 1890 vira "R$ 18,90" (com espaco comum, nao o inseparavel do Intl). */
export const formatarPreco = (centavos: number) => REAL.format(centavos / 100).replace(/ /g, ' ')

/** "4.6" vira "4,6". */
export const formatarNota = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const DATA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
/** "2026-11-15" vira "15 de novembro de 2026". Data fixa: "ha 3 dias" mudaria entre o servidor e o navegador. */
export const formatarData = (iso: string) => DATA.format(new Date(`${iso}T12:00:00Z`))

export const contarComentarios = (n: number) => `${n} ${n === 1 ? 'comentário' : 'comentários'}`

/** Monta a pagina pelo slug; null quando o produto nao existe. */
export function montarPaginaProduto(c: Catalogo, slug: string): PaginaProduto | null {
  const produto = c.produtos.find((p) => p.slug === slug)
  if (!produto) return null
  const linha = c.linhas.find((l) => l.slug === produto.linha)
  const categoria = linha && c.categorias.find((x) => x.slug === linha.categoria)
  if (!linha || !categoria) return null
  const nome = (id: string) => ({ id, nome: c.selos.find((s) => s.id === id)?.nome ?? id })
  const comentarios = COMENTARIOS_DE_EXEMPLO.filter((x) => x.produto === slug).sort((a, b) =>
    b.data.localeCompare(a.data),
  )
  return {
    produto,
    linha,
    categoria,
    detalhes: DETALHES_DE_EXEMPLO[slug] ?? null,
    // a regra da linha ja e um selo do produto ("Zero acucar"); nao repete
    selosDoProduto: produto.selos.map(nome),
    selosDaLinha: linha.selos.map(nome),
    comentarios,
    resumo: resumirNotas(comentarios),
  }
}
