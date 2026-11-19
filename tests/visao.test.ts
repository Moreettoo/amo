import { describe, it, expect } from 'vitest'
import { validarCatalogo, type Catalogo } from '@/lib/catalogo'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import {
  CAMINHO_CATALOGO,
  caminhoDaCategoria,
  descricaoDoCatalogo,
  caminhoDaLinha,
  categoriasComProduto,
  contarReceitas,
  filtrar,
  FILTRO_VAZIO,
  linhasComProduto,
  montarCatalogo,
  montarGaveta,
  montarVisao,
  montarVitrine,
  textoVerReceitas,
} from '@/lib/visao'
import type { Linha } from '@/lib/catalogo'
import {
  contarOpcoes,
  corpoDaPalavra,
  indicePorProgresso,
  listarNomes,
  posicaoDoIndice,
  textoVerNoCardapio,
} from '@/lib/vontade'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const slugs = (xs: readonly { slug: string }[]) => xs.map((x) => x.slug)
const copia = (c: Catalogo): Catalogo => JSON.parse(JSON.stringify(c))

describe('montarVisao com o cadastro de hoje', () => {
  it('o destaque é o Prestígio, e as laterais do palco são sabores que a vitrine e a marca não mostram', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.destaque.slug).toBe('prestigio')
    expect(slugs(v.palco)).toEqual(['chocolate', 'prestigio', 'frutas-amarelas'])
    expect(v.regraDoDestaque).toBe('Zero açúcar')
  })

  it('a vitrine com 4, o total, e nenhum atalho de linha', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(slugs(v.vitrine)).toEqual(['prestigio', 'pacoca', 'mousse-de-maracuja', 'ninho-com-frutas-vermelhas'])
    expect(v.total).toBe(7)
    expect(v.linhasNaVitrine).toEqual([])
    expect(v.linhasNoFinal).toEqual([])
  })

  it('vontades com produto, na ordem do cadastro; Algo salgado some', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.vontades.map((g) => [g.slug, g.produtos.length])).toEqual([
      ['chocolate', 2],
      ['fruta', 3],
      ['coco', 2],
      ['classico', 3],
    ])
    expect(slugs(v.vontades[0].produtos)).toEqual(['prestigio', 'chocolate'])
  })

  it('um rótulo só, e a foto da marca é a do Beijinho', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(slugs(v.rotulos)).toEqual(['bolos-no-pote'])
    expect(v.fotoDaMarca.src).toBe('/produtos/beijinho.webp')
  })

  it('tipos e nomes dos selos por chave', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.tipos['bolos-no-pote']).toBe('Bolo no pote')
    expect(v.nomesDosSelos.fibras).toBe('Fonte de fibras')
  })
})

describe('montarVisao com o catálogo misto', () => {
  it('a fixture é um cadastro válido', () => {
    expect(validarCatalogo(CATALOGO_MISTO)).toEqual([])
  })

  it('os atalhos de linha da vitrine voltam, com a contagem de cada uma', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(v.linhasNaVitrine).toEqual([
      { slug: 'bolos-no-pote', nome: 'Bolos no pote', contagem: 7 },
      { slug: 'bolos-inteiros', nome: 'Bolos inteiros', contagem: 2 },
      { slug: 'salgados', nome: 'Salgados', contagem: 2 },
    ])
  })

  it('Algo salgado volta, e as linhas aparecem no rótulo e no final', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(v.vontades.at(-1)?.slug).toBe('salgado')
    expect(slugs(v.rotulos)).toEqual(['bolos-no-pote', 'bolos-inteiros', 'salgados'])
    expect(slugs(v.linhasNoFinal)).toEqual(['bolos-no-pote', 'bolos-inteiros', 'salgados'])
  })

  it('o palco prefere linha ou formato diferente do destaque', () => {
    const v = montarVisao(CATALOGO_MISTO)
    // torta de frango e cenoura com cacau ja abrem a vitrine; o palco mostra as outras duas
    expect(slugs(v.palco)).toEqual(['quiche-de-alho-poro', 'prestigio', 'chocolate-com-morango'])
  })
})

describe('montarVisao nas bordas', () => {
  it('sem destaque marcado, vale o primeiro por ordem', async () => {
    const c = copia(await carregarCatalogo())
    for (const p of c.produtos) delete p.destaque
    c.produtos.reverse()
    expect(montarVisao(c).destaque.slug).toBe('prestigio')
  })

  it('com um produto só, o palco é só ele', async () => {
    const c = copia(await carregarCatalogo())
    c.produtos = c.produtos.slice(0, 1)
    expect(slugs(montarVisao(c).palco)).toEqual(['prestigio'])
  })
})

describe('filtrar', () => {
  const produtos = CATALOGO_MISTO.produtos

  it('sem filtro, todos', () => {
    expect(filtrar(produtos, FILTRO_VAZIO)).toHaveLength(11)
  })

  it('linha, selo e vontade se combinam com E', () => {
    expect(slugs(filtrar(produtos, { linha: 'bolos-inteiros', selo: null, vontade: 'fruta' }))).toEqual([
      'chocolate-com-morango',
    ])
    expect(slugs(filtrar(produtos, { linha: 'salgados', selo: 'integral', vontade: null }))).toEqual([
      'torta-de-frango',
      'quiche-de-alho-poro',
    ])
  })

  it('combinação sem produto devolve vazio', () => {
    expect(filtrar(produtos, { linha: 'salgados', selo: 'fibras', vontade: null })).toEqual([])
  })
})

describe('as contas do Hoje o dia pede', () => {
  it('indicePorProgresso divide o curso em n trechos iguais', () => {
    expect(indicePorProgresso(0, 4)).toBe(0)
    expect(indicePorProgresso(0.24, 4)).toBe(0)
    expect(indicePorProgresso(0.25, 4)).toBe(1)
    expect(indicePorProgresso(0.9999, 4)).toBe(3)
  })

  it('indicePorProgresso nunca sai do intervalo, nem com entrada inválida', () => {
    expect(indicePorProgresso(1, 4)).toBe(3)
    expect(indicePorProgresso(7, 4)).toBe(3)
    expect(indicePorProgresso(-0.5, 4)).toBe(0)
    expect(indicePorProgresso(Number.NaN, 4)).toBe(0)
    expect(indicePorProgresso(0.5, 0)).toBe(0)
  })

  it('posicaoDoIndice mira o meio do trecho de cada vontade', () => {
    expect(posicaoDoIndice(0, 4, 1000, 2000)).toBe(1250)
    expect(posicaoDoIndice(3, 4, 1000, 2000)).toBe(2750)
  })

  it('listarNomes junta com vírgula e "e"', () => {
    expect(listarNomes(['Prestígio'])).toBe('Prestígio')
    expect(listarNomes(['Prestígio', 'Chocolate'])).toBe('Prestígio e Chocolate')
    expect(listarNomes(['A', 'B', 'C'])).toBe('A, B e C')
    expect(listarNomes([])).toBe('')
  })

  it('corpoDaPalavra encolhe a palavra longa para caber na própria coluna (cqi), não na janela', () => {
    // Achado da revisao final: em vw a conta supunha a janela inteira, e no
    // desktop a palavra so tem a coluna de texto; entre 821 e ~960px ela
    // empurrava a foto para fora.
    expect(corpoDaPalavra(5)).toBe('min(112px, 29.68cqi)')
    expect(corpoDaPalavra(12)).toBe('min(83px, 12.37cqi)')
    expect(corpoDaPalavra(27)).toBe('min(37px, 5.50cqi)')
  })

  it('textos de quantidade no singular e no plural', () => {
    expect(contarOpcoes(1)).toBe('1 opção')
    expect(contarOpcoes(3)).toBe('3 opções')
    expect(textoVerNoCardapio(1)).toBe('Ver no cardápio')
    expect(textoVerNoCardapio(3)).toBe('Ver as 3 no cardápio')
  })
})

/** Uma linha cadastrada antes de ter produto (a foto ainda nao chegou). */
const SEM_PRODUTO: Linha = {
  slug: 'tortas',
  categoria: 'doces',
  nome: 'Tortas',
  tipo: 'Torta',
  regra: 'Massa integral',
  selos: [],
  corDoRotulo: 'papel',
  ordem: 0,
}

describe('caminhos e textos', () => {
  it('os endereços: categoria, linha e produto são âncoras de /catalogo', () => {
    expect(CAMINHO_CATALOGO).toBe('/catalogo')
    expect(caminhoDaCategoria('doces')).toBe('/catalogo#doces')
    expect(caminhoDaLinha('bolos-no-pote')).toBe('/catalogo#linha-bolos-no-pote')
  })

  it('contagem e chamada no singular e no plural', () => {
    expect(contarReceitas(1)).toBe('1 receita')
    expect(contarReceitas(7)).toBe('7 receitas')
    expect(textoVerReceitas(1)).toBe('Ver a receita')
    expect(textoVerReceitas(11)).toBe('Ver as 11 receitas')
  })
})

describe('linhasComProduto', () => {
  it('só as linhas com produto, por ordem: a linha sem produto não ganha página', () => {
    const c = copia(CATALOGO_MISTO)
    c.linhas.push(SEM_PRODUTO)
    expect(slugs(linhasComProduto(c))).toEqual(['bolos-no-pote', 'bolos-inteiros', 'salgados'])
  })
})

describe('montarVitrine', () => {
  it('hoje: o destaque e os seguintes por ordem', async () => {
    expect(slugs(montarVitrine(await carregarCatalogo()))).toEqual([
      'prestigio',
      'pacoca',
      'mousse-de-maracuja',
      'ninho-com-frutas-vermelhas',
    ])
  })

  it('com várias linhas: o destaque, um de cada outra linha e o resto por ordem', () => {
    expect(slugs(montarVitrine(CATALOGO_MISTO))).toEqual([
      'prestigio',
      'cenoura-com-cacau',
      'torta-de-frango',
      'pacoca',
    ])
  })

  it('sem destaque, começa pelo primeiro por ordem', async () => {
    const c = copia(await carregarCatalogo())
    for (const p of c.produtos) delete p.destaque
    c.produtos.reverse()
    expect(montarVitrine(c)[0].slug).toBe('prestigio')
  })

  it('com menos de 4 produtos, mostra todos', async () => {
    const c = copia(await carregarCatalogo())
    c.produtos = c.produtos.slice(0, 2)
    expect(slugs(montarVitrine(c))).toEqual(['prestigio', 'pacoca'])
  })
})

describe('montarGaveta', () => {
  it('com três linhas: capa, regra e contagem de cada uma, e nenhum sabor', () => {
    const g = montarGaveta(CATALOGO_MISTO)
    expect(g.linhas.map((l) => [l.slug, l.regra, l.contagem, l.capa.produto, l.capa.formato])).toEqual([
      ['bolos-no-pote', 'Zero açúcar', 7, 'prestigio', 'pote'],
      ['bolos-inteiros', 'Zero açúcar', 2, 'cenoura-com-cacau', 'inteiro'],
      ['salgados', 'Massa integral', 2, 'torta-de-frango', 'unidade'],
    ])
    expect(g.total).toBe(11)
    expect(g.sabores).toEqual([])
  })

  it('com uma linha só: os sabores dela, por ordem', async () => {
    const g = montarGaveta(await carregarCatalogo())
    expect(slugs(g.linhas)).toEqual(['bolos-no-pote'])
    expect(slugs(g.sabores)).toEqual([
      'prestigio',
      'pacoca',
      'mousse-de-maracuja',
      'ninho-com-frutas-vermelhas',
      'beijinho',
      'chocolate',
      'frutas-amarelas',
    ])
    expect(g.sabores[0].imagem.src).toBe('/produtos/prestigio.webp')
  })

  it('a capa prefere o destaque, quando ele é da linha', () => {
    const c = copia(CATALOGO_MISTO)
    for (const p of c.produtos) p.destaque = p.slug === 'chocolate-com-morango'
    expect(montarGaveta(c).linhas.map((l) => l.capa.produto)).toEqual([
      'prestigio',
      'chocolate-com-morango',
      'torta-de-frango',
    ])
  })

  it('a linha sem produto não entra', () => {
    const c = copia(CATALOGO_MISTO)
    c.linhas.push(SEM_PRODUTO)
    expect(slugs(montarGaveta(c).linhas)).toEqual(['bolos-no-pote', 'bolos-inteiros', 'salgados'])
  })
})

describe('descricaoDoCatalogo', () => {
  it('as categorias com produto e a frase do lead', async () => {
    expect(descricaoDoCatalogo(await carregarCatalogo())).toBe('Doces. Cada linha com a sua regra no rótulo.')
    expect(descricaoDoCatalogo(CATALOGO_MISTO)).toBe('Doces e salgados. Cada linha com a sua regra no rótulo.')
  })
})

describe('categoriasComProduto', () => {
  it('só as categorias com produto, por ordem', () => {
    const c = copia(CATALOGO_MISTO)
    c.categorias.push({ slug: 'refeicoes', nome: 'Refeições', ordem: 0 })
    expect(slugs(categoriasComProduto(c))).toEqual(['doces', 'salgados'])
  })
})

describe('montarCatalogo', () => {
  it('hoje: um capítulo (Doces) com a linha do pote, sem sumário', async () => {
    const v = montarCatalogo(await carregarCatalogo())
    expect(v.titulo).toBe('O catálogo inteiro')
    expect(v.lead).toBe('Cada linha com a sua regra no rótulo.')
    expect(v.contagem).toBe(7)
    expect(slugs(v.capitulos)).toEqual(['doces'])
    expect(v.capitulos[0].nome).toBe('Doces')
    expect(v.capitulos[0].linhas[0]).toMatchObject({
      slug: 'bolos-no-pote',
      id: 'linha-bolos-no-pote',
      nome: 'Bolos no pote',
      regra: 'Zero açúcar',
      mostraNome: true,
    })
    expect(slugs(v.capitulos[0].linhas[0].produtos)).toEqual([
      'prestigio',
      'pacoca',
      'mousse-de-maracuja',
      'ninho-com-frutas-vermelhas',
      'beijinho',
      'chocolate',
      'frutas-amarelas',
    ])
    expect(v.temSumario).toBe(false)
  })

  it('fixture: dois capítulos, três linhas, e a linha com o nome da categoria não repete o nome', () => {
    const v = montarCatalogo(CATALOGO_MISTO)
    expect(v.lead).toBe('Doces e salgados. Cada linha com a sua regra no rótulo.')
    expect(v.contagem).toBe(11)
    expect(v.capitulos.map((c) => [c.slug, slugs(c.linhas)])).toEqual([
      ['doces', ['bolos-no-pote', 'bolos-inteiros']],
      ['salgados', ['salgados']],
    ])
    expect(v.capitulos[0].linhas.map((l) => l.mostraNome)).toEqual([true, true])
    expect(v.capitulos[1].linhas[0]).toMatchObject({ id: 'linha-salgados', regra: 'Massa integral', mostraNome: false })
    expect(v.temSumario).toBe(true)
  })

  it('uma categoria com duas linhas já pede sumário', () => {
    const c = copia(CATALOGO_MISTO)
    c.produtos = c.produtos.filter((p) => p.linha !== 'salgados')
    const v = montarCatalogo(c)
    expect(slugs(v.capitulos)).toEqual(['doces'])
    expect(v.lead).toBe('Cada linha com a sua regra no rótulo.')
    expect(v.temSumario).toBe(true)
  })

  it('categoria e linha sem produto não viram capítulo', () => {
    const c = copia(CATALOGO_MISTO)
    c.categorias.push({ slug: 'refeicoes', nome: 'Refeições', ordem: 3 })
    c.linhas.push(SEM_PRODUTO)
    const v = montarCatalogo(c)
    expect(slugs(v.capitulos)).toEqual(['doces', 'salgados'])
    expect(slugs(v.capitulos.flatMap((x) => x.linhas))).toEqual(['bolos-no-pote', 'bolos-inteiros', 'salgados'])
  })

  it('hoje: só as vontades e os selos que filtram alguma coisa', async () => {
    const v = montarCatalogo(await carregarCatalogo())
    expect(v.vontades.map((x) => [x.slug, x.palavra, x.contagem])).toEqual([
      ['chocolate', 'Chocolate', 2],
      ['fruta', 'Fruta', 3],
      ['coco', 'Coco', 2],
      ['classico', 'Um clássico', 3],
    ])
    expect(v.selos).toEqual([])
  })

  it('fixture: vontades e selos do catálogo inteiro', () => {
    const v = montarCatalogo(CATALOGO_MISTO)
    expect(v.vontades.map((x) => x.slug)).toEqual(['chocolate', 'fruta', 'coco', 'classico', 'salgado'])
    expect(v.selos.map((s) => s.id)).toEqual(['zero-acucar', 'fibras', 'integral', 'sem-conservante'])
  })
})
