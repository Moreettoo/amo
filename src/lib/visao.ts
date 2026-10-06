import type { Catalogo, Formato, ImagemProduto, Linha, Produto } from '@/lib/catalogo'

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

export const porOrdem = (a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem

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

/** O endereco do catalogo e o de cada linha. */
export const CAMINHO_CATALOGO = '/catalogo'
export const caminhoDaLinha = (slug: string) => `${CAMINHO_CATALOGO}/${slug}`

/** "1 receita", "7 receitas". */
export const contarReceitas = (n: number) => `${n} ${n === 1 ? 'receita' : 'receitas'}`

/** A chamada para o catalogo: "Ver a receita", "Ver as 11 receitas". */
export const textoVerReceitas = (n: number) => (n === 1 ? 'Ver a receita' : `Ver as ${n} receitas`)

/** A descricao da pagina da linha: nome, regra e, quando ha, a frase. */
export const descricaoDaLinha = (l: Linha) =>
  `${l.nome}, ${l.regra.toLowerCase()}.${l.frase ? ` ${l.frase}.` : ''}`

export const TITULO_TUDO = 'O catálogo inteiro'
export const LEAD_TUDO = 'Cada linha com a sua regra no rótulo.'

/** As linhas com pelo menos um produto, por ordem. So elas ganham pagina,
 *  lugar na gaveta e atalho: linha sem produto ainda nao tem foto. */
export function linhasComProduto(c: Catalogo): Linha[] {
  return [...c.linhas].sort(porOrdem).filter((l) => c.produtos.some((p) => p.linha === l.slug))
}

/** A foto que representa a linha: a do destaque, se ele for da linha; senao
 *  a do primeiro produto dela por ordem. */
export type Capa = { produto: string; imagem: ImagemProduto; formato: Formato }

function capaDaLinha(produtosPorOrdem: readonly Produto[], linha: string): Capa {
  const daLinha = produtosPorOrdem.filter((p) => p.linha === linha)
  const p = daLinha.find((x) => x.destaque) ?? daLinha[0]
  return { produto: p.slug, imagem: p.imagem, formato: p.formato }
}

export type LinhaNaGaveta = { slug: string; nome: string; regra: string; contagem: number; capa: Capa }
export type SaborNaGaveta = { slug: string; nome: string; imagem: ImagemProduto }
export type DadosGaveta = {
  linhas: LinhaNaGaveta[]
  /** todos os produtos */
  total: number
  /** so com uma linha: os produtos dela, por ordem; senao vazio */
  sabores: SaborNaGaveta[]
}

export function montarGaveta(c: Catalogo): DadosGaveta {
  const produtos = [...c.produtos].sort(porOrdem)
  const linhas = linhasComProduto(c)
  return {
    linhas: linhas.map((l) => ({
      slug: l.slug,
      nome: l.nome,
      regra: l.regra,
      contagem: produtos.filter((p) => p.linha === l.slug).length,
      capa: capaDaLinha(produtos, l.slug),
    })),
    total: produtos.length,
    sabores:
      linhas.length === 1
        ? produtos
            .filter((p) => p.linha === linhas[0].slug)
            .map((p) => ({ slug: p.slug, nome: p.nome, imagem: p.imagem }))
        : [],
  }
}

const TAMANHO_DA_VITRINE = 4

/** A vitrine da home: o destaque, o primeiro de cada outra linha (mostra o
 *  alcance do catalogo) e o resto por ordem, ate 4. */
export function montarVitrine(c: Catalogo): Produto[] {
  const produtos = [...c.produtos].sort(porOrdem)
  const destaque = produtos.find((p) => p.destaque) ?? produtos[0]
  const escolhidos = [destaque]
  for (const l of linhasComProduto(c)) {
    if (l.slug === destaque.linha) continue
    const primeiro = produtos.find((p) => p.linha === l.slug)
    if (primeiro) escolhidos.push(primeiro)
  }
  for (const p of produtos) if (!escolhidos.includes(p)) escolhidos.push(p)
  return escolhidos.slice(0, TAMANHO_DA_VITRINE)
}

export type ItemDeLinha = {
  /** '/catalogo' em "Tudo" */
  href: string
  nome: string
  contagem: number
  /** o contorno do icone: o formato da capa da linha; null em "Tudo" */
  formato: Formato | null
  atual: boolean
}
export type OpcaoVontade = { slug: string; palavra: string; contagem: number }
export type GrupoDoCatalogo = { slug: string; nome: string; href: string; produtos: Produto[] }

export type VistaCatalogo = {
  /** null em "Tudo" */
  linha: Linha | null
  titulo: string
  /** a frase da linha com ponto final; null quando a linha nao tem frase */
  lead: string | null
  contagem: number
  /** uma numa linha; ate 3 em "Tudo", uma por linha */
  capas: Capa[]
  /** a coluna de linhas; vazia com menos de 2 */
  itensLinha: ItemDeLinha[]
  /** um por linha da vista, com os produtos por ordem */
  grupos: GrupoDoCatalogo[]
  /** so as vontades que alguns produtos da vista tem e outros nao */
  vontades: OpcaoVontade[]
  /** so os selos que alguns produtos da vista tem e outros nao */
  selos: OpcaoSelo[]
  tipos: Record<string, string>
  nomesDosSelos: Record<string, string>
}

/**
 * A vista do catalogo. `slug` nulo e "Tudo", ou a linha unica quando so ha
 * uma. Slug sem pagina e erro de programacao: a rota ja filtrou.
 */
export function montarCatalogo(c: Catalogo, slug: string | null): VistaCatalogo {
  const produtos = [...c.produtos].sort(porOrdem)
  const linhas = linhasComProduto(c)
  const linha = slug === null ? (linhas.length === 1 ? linhas[0] : null) : linhas.find((l) => l.slug === slug)
  if (linha === undefined) throw new Error(`Linha sem página no catálogo: ${slug}`)

  const daVista = linha ? produtos.filter((p) => p.linha === linha.slug) : produtos
  const contar = (pred: (p: Produto) => boolean) => daVista.filter(pred).length
  // filtro que todos ou nenhum tem nao muda nada na tela
  const filtraAlgo = (n: number) => n > 0 && n < daVista.length

  return {
    linha,
    titulo: linha ? linha.nome : TITULO_TUDO,
    lead: linha ? (linha.frase ? `${linha.frase}.` : null) : LEAD_TUDO,
    contagem: daVista.length,
    capas: (linha ? [linha] : linhas.slice(0, 3)).map((l) => capaDaLinha(produtos, l.slug)),
    itensLinha:
      linhas.length < 2
        ? []
        : [
            { href: CAMINHO_CATALOGO, nome: 'Tudo', contagem: produtos.length, formato: null, atual: linha === null },
            ...linhas.map((l) => ({
              href: caminhoDaLinha(l.slug),
              nome: l.nome,
              contagem: produtos.filter((p) => p.linha === l.slug).length,
              formato: capaDaLinha(produtos, l.slug).formato,
              atual: linha?.slug === l.slug,
            })),
          ],
    grupos: (linha ? [linha] : linhas).map((l) => ({
      slug: l.slug,
      nome: l.nome,
      href: caminhoDaLinha(l.slug),
      produtos: daVista.filter((p) => p.linha === l.slug),
    })),
    vontades: [...c.vontades]
      .sort(porOrdem)
      .map((v) => ({ slug: v.slug, palavra: v.palavra, contagem: contar((p) => p.vontades.includes(v.slug)) }))
      .filter((v) => filtraAlgo(v.contagem)),
    selos: c.selos
      .filter((s) => filtraAlgo(contar((p) => p.selos.includes(s.id))))
      .map((s) => ({ id: s.id, nome: s.nome })),
    tipos: Object.fromEntries(c.linhas.map((l) => [l.slug, l.tipo])),
    nomesDosSelos: Object.fromEntries(c.selos.map((s) => [s.id, s.nome])),
  }
}
