import { CATEGORIAS } from '@/data/categorias'
import { LINHAS } from '@/data/linhas'
import { PRODUTOS } from '@/data/produtos'
import { SELOS } from '@/data/selos'
import { VONTADES } from '@/data/vontades'

/**
 * O cadastro, no formato das tabelas que o Supabase vai receber.
 *
 * Nenhum componente importa src/data direto: tudo passa por
 * carregarCatalogo(). Quando o Supabase entrar, troca so ela.
 */

export type Selo = { id: string; nome: string; ordem: number }

export type Vontade = { slug: string; palavra: string; ordem: number }

/** O capitulo do catalogo: "Doces". Fica acima da linha. */
export type Categoria = { slug: string; nome: string; ordem: number }

export type CorDoRotulo = 'papel' | 'linho' | 'kraft'

export type Linha = {
  slug: string
  /** slug de Categoria */
  categoria: string
  /** plural, para filtro e rotulo: "Bolos no pote" */
  nome: string
  /** singular, acima do nome no card: "Bolo no pote" */
  tipo: string
  /** a regra saudavel da linha: "Zero açúcar" */
  regra: string
  /** ids de Selo, na ordem do rotulo */
  selos: string[]
  /** faixa do rotulo, sem o coracao (ele e decoracao) */
  frase?: string
  modoDeAproveitar?: { titulo: string; passos: string[] }
  corDoRotulo: CorDoRotulo
  ordem: number
}

/** Formato decide a moldura da foto. Um formato novo cai na moldura neutra. */
export type Formato = 'pote' | 'inteiro' | 'unidade' | (string & {})

export type ImagemProduto = { src: string; alt: string; largura: number; altura: number }

export type Produto = {
  slug: string
  /** o nome do produto, nunca nome poetico */
  nome: string
  /** slug de Linha */
  linha: string
  formato: Formato
  frase?: string
  imagem: ImagemProduto
  /** ids de Selo */
  selos: string[]
  /** slugs de Vontade */
  vontades: string[]
  destaque?: boolean
  ordem: number
}

export type Catalogo = {
  categorias: Categoria[]
  linhas: Linha[]
  produtos: Produto[]
  selos: Selo[]
  vontades: Vontade[]
}

/** Lista de problemas do cadastro; vazia quando esta tudo certo. */
export function validarCatalogo(c: Catalogo): string[] {
  const problemas: string[] = []

  const semRepetir = (o_que: string, chaves: string[]) => {
    const vistas = new Set<string>()
    for (const k of chaves) {
      if (vistas.has(k)) problemas.push(`${o_que} repetido: ${k}`)
      vistas.add(k)
    }
  }
  semRepetir('slug de categoria', c.categorias.map((x) => x.slug))
  semRepetir('slug de linha', c.linhas.map((l) => l.slug))
  semRepetir('slug de produto', c.produtos.map((p) => p.slug))
  semRepetir('id de selo', c.selos.map((s) => s.id))
  semRepetir('slug de vontade', c.vontades.map((v) => v.slug))
  // categoria, linha e produto sao alvos de ancora na mesma pagina do
  // catalogo: a categoria e o produto pelo slug, a linha por "linha-<slug>"
  semRepetir('id de âncora', [
    ...new Set(c.categorias.map((x) => x.slug)),
    ...new Set(c.linhas.map((l) => `linha-${l.slug}`)),
    ...new Set(c.produtos.map((p) => p.slug)),
  ])

  const categorias = new Set(c.categorias.map((x) => x.slug))
  const linhas = new Set(c.linhas.map((l) => l.slug))
  const selos = new Set(c.selos.map((s) => s.id))
  const vontades = new Set(c.vontades.map((v) => v.slug))

  for (const l of c.linhas) {
    if (!categorias.has(l.categoria)) problemas.push(`linha ${l.slug}: categoria inexistente ${l.categoria}`)
    // A linha com o nome da categoria nao repete o nome na pagina nem entra
    // no sumario. Sozinha, tudo bem: a categoria ja a nomeia. Ao lado de
    // outras, ficaria sem nome e sem lugar no sumario.
    const categoria = c.categorias.find((x) => x.slug === l.categoria)
    if (categoria?.nome === l.nome && c.linhas.some((o) => o !== l && o.categoria === l.categoria)) {
      problemas.push(`linha ${l.slug}: mesmo nome da categoria ${l.categoria}, que tem outras linhas`)
    }
    for (const s of l.selos) {
      if (!selos.has(s)) problemas.push(`linha ${l.slug}: selo inexistente ${s}`)
    }
  }

  for (const p of c.produtos) {
    if (!linhas.has(p.linha)) problemas.push(`produto ${p.slug}: linha inexistente ${p.linha}`)
    for (const s of p.selos) {
      if (!selos.has(s)) problemas.push(`produto ${p.slug}: selo inexistente ${s}`)
    }
    for (const v of p.vontades) {
      if (!vontades.has(v)) problemas.push(`produto ${p.slug}: vontade inexistente ${v}`)
    }
    if (!p.imagem?.src?.startsWith('/')) {
      problemas.push(`produto ${p.slug}: imagem sem caminho absoluto`)
    }
    if (!p.imagem?.alt?.trim()) problemas.push(`produto ${p.slug}: imagem sem alt`)
    if (!(p.imagem?.largura > 0 && p.imagem?.altura > 0)) {
      problemas.push(`produto ${p.slug}: imagem sem dimensões`)
    }
  }

  if (c.produtos.filter((p) => p.destaque).length > 1) {
    problemas.push('mais de um produto em destaque')
  }
  if (c.produtos.length === 0) problemas.push('catálogo sem produto')
  else if (!c.produtos.some((p) => p.vontades.length > 0)) {
    problemas.push('nenhum produto com vontade')
  }

  return problemas
}

/**
 * Le o cadastro e valida. Cadastro ruim lanca erro, e o erro derruba o build
 * em vez de chegar a pagina. Assincrona desde ja para o Supabase entrar sem
 * mudar quem chama.
 */
export async function carregarCatalogo(): Promise<Catalogo> {
  const catalogo: Catalogo = {
    categorias: [...CATEGORIAS],
    linhas: [...LINHAS],
    produtos: [...PRODUTOS],
    selos: [...SELOS],
    vontades: [...VONTADES],
  }
  const problemas = validarCatalogo(catalogo)
  if (problemas.length > 0) {
    throw new Error(`Cadastro inválido:\n${problemas.join('\n')}`)
  }
  return catalogo
}
