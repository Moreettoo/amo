import 'server-only'
import { validarCatalogo, type Catalogo, type CorDoRotulo, type Linha, type Produto } from '@/lib/catalogo'
import type { Tables } from '@/lib/dados/banco'
import { falhaDoBanco } from '@/lib/dados/erros'
import { criarClientePublico } from '@/lib/dados/publico'

/**
 * O cadastro vem do banco: as cinco tabelas do catalogo, lidas como visitante
 * (com o cache de 5 minutos do cliente publico), viram o Catalogo que as
 * paginas ja usavam. Cadastro torto lanca erro: no build, derruba o build; na
 * renovacao do cache, o Next continua servindo a pagina anterior.
 */

export type TabelasDoCatalogo = {
  categorias: Tables<'categorias'>[]
  linhas: Tables<'linhas'>[]
  produtos: Tables<'produtos'>[]
  selos: Tables<'selos'>[]
  vontades: Tables<'vontades'>[]
}

const CORES: readonly string[] = ['papel', 'linho', 'kraft'] satisfies CorDoRotulo[]

const recusar = (problema: string): never => {
  throw new Error(`Cadastro inválido:\n${problema}`)
}

function modoDeAproveitar(l: Tables<'linhas'>): Linha['modoDeAproveitar'] {
  const modo = l.modo_de_aproveitar
  if (modo === null) return undefined
  const valido =
    typeof modo === 'object' &&
    !Array.isArray(modo) &&
    typeof modo.titulo === 'string' &&
    modo.titulo.trim() !== '' &&
    Array.isArray(modo.passos) &&
    modo.passos.length > 0 &&
    modo.passos.every((p) => typeof p === 'string')
  if (!valido) return recusar(`linha ${l.slug}: modo de aproveitar fora do formato`)
  return { titulo: modo.titulo as string, passos: modo.passos as string[] }
}

function montarLinha(l: Tables<'linhas'>): Linha {
  if (!CORES.includes(l.cor_do_rotulo)) recusar(`linha ${l.slug}: cor do rótulo desconhecida`)
  const modo = modoDeAproveitar(l)
  return {
    slug: l.slug,
    categoria: l.categoria,
    nome: l.nome,
    tipo: l.tipo,
    regra: l.regra,
    selos: l.selos,
    ...(l.frase !== null && { frase: l.frase }),
    ...(modo && { modoDeAproveitar: modo }),
    corDoRotulo: l.cor_do_rotulo as CorDoRotulo,
    ordem: l.ordem,
  }
}

function montarProduto(p: Tables<'produtos'>): Produto {
  return {
    slug: p.slug,
    nome: p.nome,
    linha: p.linha,
    formato: p.formato,
    ...(p.frase !== null && { frase: p.frase }),
    imagem: { src: p.imagem_src, alt: p.imagem_alt, largura: p.imagem_largura, altura: p.imagem_altura },
    selos: p.selos,
    vontades: p.vontades,
    ...(p.destaque && { destaque: true }),
    ordem: p.ordem,
    ...(p.descricao !== null && { descricao: p.descricao }),
    ...(p.a_venda && p.preco_centavos !== null && { preco: p.preco_centavos }),
  }
}

/** As linhas do banco no formato do cadastro. Pura. */
export function montarCatalogoDoBanco(t: TabelasDoCatalogo): Catalogo {
  return {
    categorias: t.categorias.map((c) => ({ slug: c.slug, nome: c.nome, ordem: c.ordem })),
    linhas: t.linhas.map(montarLinha),
    produtos: t.produtos.map(montarProduto),
    selos: t.selos.map((s) => ({ id: s.id, nome: s.nome, ordem: s.ordem })),
    vontades: t.vontades.map((v) => ({ slug: v.slug, palavra: v.palavra, ordem: v.ordem })),
  }
}

/** Le as cinco tabelas, monta e valida. */
export async function carregarCatalogo(): Promise<Catalogo> {
  const banco = criarClientePublico()
  const [categorias, linhas, produtos, selos, vontades] = await Promise.all([
    banco.from('categorias').select('slug, nome, ordem').order('ordem'),
    banco
      .from('linhas')
      .select('slug, categoria, nome, tipo, regra, selos, frase, modo_de_aproveitar, cor_do_rotulo, ordem')
      .order('ordem'),
    banco
      .from('produtos')
      .select(
        'slug, nome, linha, formato, frase, descricao, imagem_src, imagem_alt, imagem_largura, imagem_altura, selos, vontades, destaque, ordem, preco_centavos, a_venda',
      )
      .order('ordem'),
    banco.from('selos').select('id, nome, ordem').order('ordem'),
    banco.from('vontades').select('slug, palavra, ordem').order('ordem'),
  ])
  const lidas = { categorias, linhas, produtos, selos, vontades }
  for (const [tabela, { error }] of Object.entries(lidas)) {
    if (error) throw falhaDoBanco(tabela, error)
  }
  const catalogo = montarCatalogoDoBanco({
    categorias: categorias.data ?? [],
    linhas: linhas.data ?? [],
    produtos: produtos.data ?? [],
    selos: selos.data ?? [],
    vontades: vontades.data ?? [],
  })
  const problemas = validarCatalogo(catalogo)
  if (problemas.length > 0) recusar(problemas.join('\n'))
  return catalogo
}
