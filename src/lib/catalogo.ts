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

export type Selo = { id: string; nome: string }

export type Vontade = { slug: string; palavra: string; ordem: number }

export type CorDoRotulo = 'papel' | 'linho' | 'kraft'

export type Linha = {
  slug: string
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
  semRepetir('slug de linha', c.linhas.map((l) => l.slug))
  semRepetir('slug de produto', c.produtos.map((p) => p.slug))
  semRepetir('id de selo', c.selos.map((s) => s.id))
  semRepetir('slug de vontade', c.vontades.map((v) => v.slug))

  const linhas = new Set(c.linhas.map((l) => l.slug))
  const selos = new Set(c.selos.map((s) => s.id))
  const vontades = new Set(c.vontades.map((v) => v.slug))

  for (const l of c.linhas) {
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
