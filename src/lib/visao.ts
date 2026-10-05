import type { Catalogo, ImagemProduto, Linha, Produto } from '@/lib/catalogo'

/**
 * A visao: o que a pagina mostra, decidido uma vez, no servidor, a partir do
 * cadastro. Funcao pura e sem import de valor (so de tipo), para o cliente
 * poder usar `filtrar` e `FILTRO_VAZIO` sem puxar o cadastro junto.
 */

export type Filtro = { linha: string | null; selo: string | null; vontade: string | null }

export const FILTRO_VAZIO: Filtro = { linha: null, selo: null, vontade: null }

export type OpcaoLinha = { slug: string; nome: string; contagem: number }
export type OpcaoSelo = { id: string; nome: string }
export type GrupoVontade = { slug: string; palavra: string; produtos: Produto[] }

export type Visao = {
  /** todos, por ordem */
  produtos: Produto[]
  destaque: Produto
  /** da esquerda para a direita, o destaque no meio */
  palco: Produto[]
  /** a regra da linha do destaque, no selo do hero */
  regraDoDestaque: string
  /** slug da linha para o tipo no singular */
  tipos: Record<string, string>
  /** id do selo para o nome */
  nomesDosSelos: Record<string, string>
  /** vazio quando ha menos de 2 linhas com produto */
  filtrosLinha: OpcaoLinha[]
  /** so os selos que alguns produtos tem e outros nao */
  filtrosSelo: OpcaoSelo[]
  /** so as vontades com produto */
  vontades: GrupoVontade[]
  /** as linhas com produto, por ordem */
  rotulos: Linha[]
  /** as mesmas, so quando ha 2 ou mais */
  linhasNoFinal: Linha[]
  fotoDaMarca: ImagemProduto
}

const porOrdem = (a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem

export function montarVisao(c: Catalogo): Visao {
  const produtos = [...c.produtos].sort(porOrdem)
  const destaque = produtos.find((p) => p.destaque) ?? produtos[0]

  // As laterais mostram o alcance do cardapio: primeiro quem e de outra linha
  // ou outro formato, depois o resto, sempre por ordem.
  const outros = produtos.filter((p) => p.slug !== destaque.slug)
  const diferente = (p: Produto) => p.linha !== destaque.linha || p.formato !== destaque.formato
  const laterais = [...outros.filter(diferente), ...outros.filter((p) => !diferente(p))].slice(0, 2)
  const palco = laterais.length === 0 ? [destaque] : [laterais[0], destaque, ...laterais.slice(1)]

  const contar = (pred: (p: Produto) => boolean) => produtos.filter(pred).length

  const rotulos = [...c.linhas].sort(porOrdem).filter((l) => produtos.some((p) => p.linha === l.slug))
  const filtrosLinha =
    rotulos.length >= 2
      ? rotulos.map((l) => ({ slug: l.slug, nome: l.nome, contagem: contar((p) => p.linha === l.slug) }))
      : []

  const filtrosSelo = c.selos
    .filter((s) => {
      const n = contar((p) => p.selos.includes(s.id))
      return n > 0 && n < produtos.length
    })
    .map((s) => ({ id: s.id, nome: s.nome }))

  const vontades = [...c.vontades]
    .sort(porOrdem)
    .map((v) => ({
      slug: v.slug,
      palavra: v.palavra,
      produtos: produtos.filter((p) => p.vontades.includes(v.slug)),
    }))
    .filter((g) => g.produtos.length > 0)

  return {
    produtos,
    destaque,
    palco,
    regraDoDestaque: c.linhas.find((l) => l.slug === destaque.linha)?.regra ?? '',
    tipos: Object.fromEntries(c.linhas.map((l) => [l.slug, l.tipo])),
    nomesDosSelos: Object.fromEntries(c.selos.map((s) => [s.id, s.nome])),
    filtrosLinha,
    filtrosSelo,
    vontades,
    rotulos,
    linhasNoFinal: rotulos.length >= 2 ? rotulos : [],
    fotoDaMarca: (produtos.find((p) => p.slug === 'beijinho') ?? destaque).imagem,
  }
}

/** Linha, selo e vontade com E; `null` nao filtra aquela dimensao. */
export function filtrar(produtos: readonly Produto[], f: Filtro): Produto[] {
  return produtos.filter(
    (p) =>
      (f.linha === null || p.linha === f.linha) &&
      (f.selo === null || p.selos.includes(f.selo)) &&
      (f.vontade === null || p.vontades.includes(f.vontade)),
  )
}
