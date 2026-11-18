import { describe, it, expect } from 'vitest'
import { carregarCatalogo, validarCatalogo, type Catalogo } from '@/lib/catalogo'
import {
  CAMINHO_CATALOGO,
  caminhoDaLinha,
  contarReceitas,
  descricaoDaLinha,
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
  nome: 'Tortas',
  tipo: 'Torta',
  regra: 'Massa integral',
  selos: [],
  corDoRotulo: 'papel',
  ordem: 0,
}

describe('caminhos e textos', () => {
  it('o catálogo e a página de cada linha', () => {
    expect(CAMINHO_CATALOGO).toBe('/catalogo')
    expect(caminhoDaLinha('bolos-no-pote')).toBe('/catalogo/bolos-no-pote')
  })

  it('contagem e chamada no singular e no plural', () => {
    expect(contarReceitas(1)).toBe('1 receita')
    expect(contarReceitas(7)).toBe('7 receitas')
    expect(textoVerReceitas(1)).toBe('Ver a receita')
    expect(textoVerReceitas(11)).toBe('Ver as 11 receitas')
  })

  it('a descrição da linha, com e sem frase', async () => {
    const [pote] = (await carregarCatalogo()).linhas
    expect(descricaoDaLinha(pote)).toBe('Bolos no pote, zero açúcar. Um abraço em forma de sobremesa.')
    expect(descricaoDaLinha({ ...pote, frase: undefined })).toBe('Bolos no pote, zero açúcar.')
  })

  it('frase do cadastro que já tem pontuação no fim não ganha outro ponto', async () => {
    const [pote] = (await carregarCatalogo()).linhas
    const comFrase = (frase: string) => descricaoDaLinha({ ...pote, frase })
    expect(comFrase('Um abraço.')).toBe('Bolos no pote, zero açúcar. Um abraço.')
    expect(comFrase('Um abraço!')).toBe('Bolos no pote, zero açúcar. Um abraço!')
    expect(comFrase('Um abraço?')).toBe('Bolos no pote, zero açúcar. Um abraço?')
    // virgula, espaco e reticencias no fim viram um ponto so
    expect(comFrase('Um abraço, ')).toBe('Bolos no pote, zero açúcar. Um abraço.')
    expect(comFrase('Um abraço...')).toBe('Bolos no pote, zero açúcar. Um abraço.')
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

describe('montarCatalogo', () => {
  it('uma linha: título, lead com ponto final, contagem, capa e um grupo', async () => {
    const v = montarCatalogo(await carregarCatalogo(), 'bolos-no-pote')
    expect(v.linha?.slug).toBe('bolos-no-pote')
    expect([v.titulo, v.lead, v.contagem]).toEqual(['Bolos no pote', 'Um abraço em forma de sobremesa.', 7])
    expect(v.capas.map((c) => c.produto)).toEqual(['prestigio'])
    expect(v.grupos.map((g) => [g.slug, g.href, g.produtos.length])).toEqual([
      ['bolos-no-pote', '/catalogo/bolos-no-pote', 7],
    ])
  })

  it('com uma linha só, o catálogo sem linha é a página dela, sem coluna de linhas', async () => {
    const v = montarCatalogo(await carregarCatalogo(), null)
    expect(v.linha?.slug).toBe('bolos-no-pote')
    expect(v.itensLinha).toEqual([])
  })

  it('só as vontades e os selos que filtram alguma coisa na vista', async () => {
    const v = montarCatalogo(await carregarCatalogo(), 'bolos-no-pote')
    expect(v.vontades.map((x) => [x.slug, x.palavra, x.contagem])).toEqual([
      ['chocolate', 'Chocolate', 2],
      ['fruta', 'Fruta', 3],
      ['coco', 'Coco', 2],
      ['classico', 'Um clássico', 3],
    ])
    expect(v.selos).toEqual([])
  })

  it('"Tudo" com três linhas: grupos, capas, a coluna com o item atual, vontades e selos', () => {
    const v = montarCatalogo(CATALOGO_MISTO, null)
    expect(v.linha).toBeNull()
    expect([v.titulo, v.lead, v.contagem]).toEqual(['O catálogo inteiro', 'Cada linha com a sua regra no rótulo.', 11])
    expect(v.capas.map((c) => c.formato)).toEqual(['pote', 'inteiro', 'unidade'])
    expect(v.grupos.map((g) => [g.slug, g.produtos.length])).toEqual([
      ['bolos-no-pote', 7],
      ['bolos-inteiros', 2],
      ['salgados', 2],
    ])
    expect(v.itensLinha).toEqual([
      { href: '/catalogo', nome: 'Tudo', contagem: 11, formato: null, atual: true },
      { href: '/catalogo/bolos-no-pote', nome: 'Bolos no pote', contagem: 7, formato: 'pote', atual: false },
      { href: '/catalogo/bolos-inteiros', nome: 'Bolos inteiros', contagem: 2, formato: 'inteiro', atual: false },
      { href: '/catalogo/salgados', nome: 'Salgados', contagem: 2, formato: 'unidade', atual: false },
    ])
    expect(v.vontades.map((x) => x.slug)).toEqual(['chocolate', 'fruta', 'coco', 'classico', 'salgado'])
    expect(v.selos.map((s) => s.id)).toEqual(['zero-acucar', 'fibras', 'integral', 'sem-conservante'])
  })

  it('nos salgados, a vontade que todos têm não vira filtro; o selo que só um tem, vira', () => {
    const v = montarCatalogo(CATALOGO_MISTO, 'salgados')
    expect(v.vontades).toEqual([])
    expect(v.selos.map((s) => s.id)).toEqual(['sem-conservante'])
    expect(v.itensLinha.filter((i) => i.atual).map((i) => i.href)).toEqual(['/catalogo/salgados'])
  })

  it('o lead não dobra a pontuação que a frase do cadastro já tem', () => {
    const c = copia(CATALOGO_MISTO)
    c.linhas[1].frase = 'Assado na hora.'
    expect(montarCatalogo(c, 'bolos-inteiros').lead).toBe('Assado na hora.')
    c.linhas[1].frase = 'Assado na hora!'
    expect(montarCatalogo(c, 'bolos-inteiros').lead).toBe('Assado na hora!')
  })

  it('linha sem frase não tem lead', () => {
    const c = copia(CATALOGO_MISTO)
    delete c.linhas[1].frase
    expect(montarCatalogo(c, 'bolos-inteiros').lead).toBeNull()
  })

  it('slug sem página é erro de programação (a rota já filtrou)', () => {
    const c = copia(CATALOGO_MISTO)
    c.linhas.push(SEM_PRODUTO)
    expect(() => montarCatalogo(c, 'tortas')).toThrow(/tortas/)
    expect(() => montarCatalogo(c, 'nao-existe')).toThrow(/nao-existe/)
  })
})
