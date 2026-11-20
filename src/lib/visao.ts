import { montarLoja, type ItemDaLoja } from '@/lib/sacola'
import type { Catalogo, Categoria, Formato, ImagemProduto, Linha, Produto } from '@/lib/catalogo'
import { listarNomes } from '@/lib/vontade'

/**
 * A visao: o que a pagina mostra, decidido uma vez, no servidor, a partir do
 * cadastro. Funcao pura e sem import de valor do cadastro (dele, so tipo),
 * para o cliente poder usar `filtrar` e `FILTRO_VAZIO` sem puxar o cadastro
 * junto.
 */

export type Filtro = { linha: string | null; selo: string | null; vontade: string | null }

export const FILTRO_VAZIO: Filtro = { linha: null, selo: null, vontade: null }

export type OpcaoLinha = { slug: string; nome: string; contagem: number }
export type OpcaoSelo = { id: string; nome: string }
export type GrupoVontade = {
  slug: string
  palavra: string
  produtos: Produto[]
  /** a foto grande da vontade: um produto que nao e a capa de outra */
  capa: Produto
}

export type Visao = {
  destaque: Produto
  /** da esquerda para a direita, o destaque no meio */
  palco: Produto[]
  /** a regra da linha do destaque, no selo do hero */
  regraDoDestaque: string
  /** slug da linha para o tipo no singular */
  tipos: Record<string, string>
  /** id do selo para o nome */
  nomesDosSelos: Record<string, string>
  /** so as vontades com produto */
  vontades: GrupoVontade[]
  /** as linhas com produto, por ordem */
  rotulos: Linha[]
  /** as mesmas, so quando ha 2 ou mais */
  linhasNoFinal: Linha[]
  fotoDaMarca: ImagemProduto
  /** a foto do fecho da pagina */
  fotoDoFinal: ImagemProduto
  /** a vitrine da home (montarVitrine) */
  vitrine: Produto[]
  /** as linhas com a contagem, para os atalhos da vitrine; vazio com uma so */
  linhasNaVitrine: OpcaoLinha[]
  /** quantas receitas ha */
  total: number
}

export const porOrdem = (a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem

/** A foto da secao A marca; sem esse produto no catalogo, vale a do destaque. */
const SLUG_DA_FOTO_DA_MARCA = 'beijinho'

export function montarVisao(c: Catalogo): Visao {
  const produtos = [...c.produtos].sort(porOrdem)
  const destaque = produtos.find((p) => p.destaque) ?? produtos[0]

  // As laterais mostram o alcance do cardapio: primeiro quem e de outra linha
  // ou outro formato, depois o resto, sempre por ordem. Dentro de cada grupo
  // vem antes quem a pagina nao mostra em outro lugar (a vitrine logo abaixo
  // e a foto da marca), para a mesma foto nao aparecer duas vezes seguidas.
  const outros = produtos.filter((p) => p.slug !== destaque.slug)
  const diferente = (p: Produto) => p.linha !== destaque.linha || p.formato !== destaque.formato
  const jaNaPagina = new Set([...montarVitrine(c).map((p) => p.slug), SLUG_DA_FOTO_DA_MARCA])
  const ineditosPrimeiro = (lista: Produto[]) => [
    ...lista.filter((p) => !jaNaPagina.has(p.slug)),
    ...lista.filter((p) => jaNaPagina.has(p.slug)),
  ]
  const laterais = [
    ...ineditosPrimeiro(outros.filter(diferente)),
    ...ineditosPrimeiro(outros.filter((p) => !diferente(p))),
  ].slice(0, 2)
  const palco = laterais.length === 0 ? [destaque] : [laterais[0], destaque, ...laterais.slice(1)]

  const contar = (pred: (p: Produto) => boolean) => produtos.filter(pred).length

  const rotulos = linhasComProduto(c)
  const linhasNaVitrine =
    rotulos.length >= 2
      ? rotulos.map((l) => ({ slug: l.slug, nome: l.nome, contagem: contar((p) => p.linha === l.slug) }))
      : []

  const grupos = [...c.vontades]
    .sort(porOrdem)
    .map((v) => ({
      slug: v.slug,
      palavra: v.palavra,
      produtos: produtos.filter((p) => p.vontades.includes(v.slug)),
    }))
    .filter((g) => g.produtos.length > 0)

  // Cada vontade abre com uma foto so dela: a primeira do grupo que ainda
  // nao e a capa de outra vontade nem a foto do hero. Sem sobra, repete.
  const capasUsadas = new Set([destaque.slug])
  const vontades = grupos.map((g) => {
    const capa = g.produtos.find((p) => !capasUsadas.has(p.slug)) ?? g.produtos[0]
    capasUsadas.add(capa.slug)
    return { ...g, capa }
  })

  // O fecho mostra quem menos apareceu: o ultimo por ordem fora do palco e
  // da foto da marca.
  const noPalco = new Set(palco.map((p) => p.slug))
  const doFinal =
    [...produtos].reverse().find((p) => !noPalco.has(p.slug) && p.slug !== SLUG_DA_FOTO_DA_MARCA) ?? destaque

  return {
    destaque,
    palco,
    regraDoDestaque: c.linhas.find((l) => l.slug === destaque.linha)?.regra ?? '',
    tipos: Object.fromEntries(c.linhas.map((l) => [l.slug, l.tipo])),
    nomesDosSelos: Object.fromEntries(c.selos.map((s) => [s.id, s.nome])),
    vontades,
    rotulos,
    linhasNoFinal: rotulos.length >= 2 ? rotulos : [],
    fotoDaMarca: (produtos.find((p) => p.slug === SLUG_DA_FOTO_DA_MARCA) ?? destaque).imagem,
    fotoDoFinal: doFinal.imagem,
    vitrine: montarVitrine(c),
    linhasNaVitrine,
    total: produtos.length,
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

/**
 * Os enderecos. O catalogo e uma pagina so, e categoria, linha e produto sao
 * ancoras dela: a categoria e o produto pelo slug, a linha por "linha-<slug>"
 * (uma linha pode ter o mesmo slug da categoria dela, como "salgados").
 */
export const CAMINHO_CATALOGO = '/catalogo'
/** Minha conta: sem sessao, leva a /entrar e volta para ca. */
export const CAMINHO_DA_CONTA = '/conta'
export const idDaLinha = (slug: string) => `linha-${slug}`
export const caminhoDaCategoria = (slug: string) => `${CAMINHO_CATALOGO}#${slug}`
export const caminhoDaLinha = (slug: string) => `${CAMINHO_CATALOGO}#${idDaLinha(slug)}`
/** A pagina de um produto: /catalogo/prestigio. */
export const caminhoDoProduto = (slug: string) => `${CAMINHO_CATALOGO}/${slug}`

/** "1 receita", "7 receitas". */
export const contarReceitas = (n: number) => `${n} ${n === 1 ? 'receita' : 'receitas'}`

/** A chamada para o catalogo: "Ver a receita", "Ver as 11 receitas". */
export const textoVerReceitas = (n: number) => (n === 1 ? 'Ver a receita' : `Ver as ${n} receitas`)

const TITULO_DO_CATALOGO = 'O catálogo inteiro'
const LEAD_DO_CATALOGO = 'Cada linha com a sua regra no rótulo.'

/** As linhas com pelo menos um produto, por ordem. So elas ganham lugar no
 *  catalogo, na gaveta e nos atalhos: linha sem produto ainda nao tem foto. */
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
  /** os produtos a venda, com preco: a gaveta da sacola, ao lado, se desenha com eles */
  loja: ItemDaLoja[]
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
    loja: montarLoja(c),
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

/** As categorias com pelo menos um produto, por ordem: a mesma regra das
 *  linhas. Categoria cadastrada antes de ter produto nao aparece. */
export function categoriasComProduto(c: Catalogo): Categoria[] {
  const comProduto = new Set(linhasComProduto(c).map((l) => l.categoria))
  return [...c.categorias].sort(porOrdem).filter((x) => comProduto.has(x.slug))
}

export type OpcaoVontade = { slug: string; palavra: string; contagem: number }

export type LinhaDoCapitulo = {
  slug: string
  /** o id da secao da linha na pagina (idDaLinha) */
  id: string
  nome: string
  regra: string
  /** falso quando o nome repete o da categoria ("Salgados" em Salgados): o
   *  titulo da linha fica so para leitor de tela e ela sai do sumario */
  mostraNome: boolean
  /** por ordem */
  produtos: Produto[]
}
/** Um capitulo do catalogo: a categoria com as linhas dela. O slug e o id da
 *  secao na pagina. */
export type Capitulo = { slug: string; nome: string; linhas: LinhaDoCapitulo[] }

export type VistaCatalogo = {
  titulo: string
  lead: string
  contagem: number
  /** um por categoria com produto, por ordem */
  capitulos: Capitulo[]
  /** ha o que escolher: 2 ou mais categorias, ou 2 ou mais linhas */
  temSumario: boolean
  /** so as vontades que alguns produtos tem e outros nao */
  vontades: OpcaoVontade[]
  /** so os selos que alguns produtos tem e outros nao */
  selos: OpcaoSelo[]
  tipos: Record<string, string>
  nomesDosSelos: Record<string, string>
}

/** "Doces, salgados e refeições. Cada linha com a sua regra no rótulo.": o
 *  primeiro nome como esta no cadastro, os outros em minuscula. */
function categoriasEALead(categorias: readonly Categoria[]): string {
  const nomes = categorias.map((x, i) => (i === 0 ? x.nome : x.nome.toLowerCase()))
  return `${listarNomes(nomes)}. ${LEAD_DO_CATALOGO}`
}

/** No topo, as categorias so sao ditas quando ha mais de uma: com uma so, o
 *  capitulo logo abaixo ja diz. */
function leadDoCatalogo(categorias: readonly Categoria[]): string {
  return categorias.length < 2 ? LEAD_DO_CATALOGO : categoriasEALead(categorias)
}

/** A descricao da pagina (o <meta>): sempre diz as categorias. */
export function descricaoDoCatalogo(c: Catalogo): string {
  return categoriasEALead(categoriasComProduto(c))
}

/** A vista do catalogo: a pagina inteira, em capitulos. */
export function montarCatalogo(c: Catalogo): VistaCatalogo {
  const produtos = [...c.produtos].sort(porOrdem)
  const linhas = linhasComProduto(c)
  const categorias = categoriasComProduto(c)
  const contar = (pred: (p: Produto) => boolean) => produtos.filter(pred).length
  // filtro que todos ou nenhum tem nao muda nada na tela
  const filtraAlgo = (n: number) => n > 0 && n < produtos.length

  return {
    titulo: TITULO_DO_CATALOGO,
    lead: leadDoCatalogo(categorias),
    contagem: produtos.length,
    capitulos: categorias.map((cat) => ({
      slug: cat.slug,
      nome: cat.nome,
      linhas: linhas
        .filter((l) => l.categoria === cat.slug)
        .map((l) => ({
          slug: l.slug,
          id: idDaLinha(l.slug),
          nome: l.nome,
          regra: l.regra,
          mostraNome: l.nome !== cat.nome,
          produtos: produtos.filter((p) => p.linha === l.slug),
        })),
    })),
    temSumario: categorias.length >= 2 || linhas.length >= 2,
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
