import { describe, it, expect } from 'vitest'
import { carregarCatalogo, validarCatalogo, type Catalogo } from '@/lib/catalogo'
import { filtrar, montarVisao, FILTRO_VAZIO } from '@/lib/visao'
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
  it('o destaque é o Prestígio e o palco vai Paçoca, Prestígio, Mousse de maracujá', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.destaque.slug).toBe('prestigio')
    expect(slugs(v.palco)).toEqual(['pacoca', 'prestigio', 'mousse-de-maracuja'])
    expect(v.regraDoDestaque).toBe('Zero açúcar')
  })

  it('não mostra filtro que não filtraria nada', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.filtrosLinha).toEqual([])
    expect(v.filtrosSelo).toEqual([])
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
    expect(slugs(v.rotulos)).toEqual(['pote'])
    expect(v.fotoDaMarca.src).toBe('/produtos/beijinho.webp')
  })

  it('tipos e nomes dos selos por chave', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.tipos.pote).toBe('Bolo no pote')
    expect(v.nomesDosSelos.fibras).toBe('Fonte de fibras')
  })
})

describe('montarVisao com o catálogo misto', () => {
  it('a fixture é um cadastro válido', () => {
    expect(validarCatalogo(CATALOGO_MISTO)).toEqual([])
  })

  it('volta o filtro de linha, com a contagem de cada uma', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(v.filtrosLinha).toEqual([
      { slug: 'pote', nome: 'Bolos no pote', contagem: 7 },
      { slug: 'inteiro', nome: 'Bolos inteiros', contagem: 2 },
      { slug: 'salgado', nome: 'Salgados', contagem: 2 },
    ])
  })

  it('só os selos que alguns têm e outros não', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(v.filtrosSelo.map((s) => s.id)).toEqual(['zero-acucar', 'fibras', 'integral', 'sem-conservante'])
  })

  it('Algo salgado volta, e as linhas aparecem no rótulo e no final', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(v.vontades.at(-1)?.slug).toBe('salgado')
    expect(slugs(v.rotulos)).toEqual(['pote', 'inteiro', 'salgado'])
    expect(slugs(v.linhasNoFinal)).toEqual(['pote', 'inteiro', 'salgado'])
  })

  it('o palco prefere linha ou formato diferente do destaque', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(slugs(v.palco)).toEqual(['torta-de-frango', 'prestigio', 'cenoura-com-cacau'])
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
  const v = montarVisao(CATALOGO_MISTO)

  it('sem filtro, todos', () => {
    expect(filtrar(v.produtos, FILTRO_VAZIO)).toHaveLength(11)
  })

  it('linha, selo e vontade se combinam com E', () => {
    expect(slugs(filtrar(v.produtos, { linha: 'inteiro', selo: null, vontade: 'fruta' }))).toEqual([
      'chocolate-com-morango',
    ])
    expect(slugs(filtrar(v.produtos, { linha: 'salgado', selo: 'integral', vontade: null }))).toEqual([
      'torta-de-frango',
      'quiche-de-alho-poro',
    ])
  })

  it('combinação sem produto devolve vazio', () => {
    expect(filtrar(v.produtos, { linha: 'salgado', selo: 'fibras', vontade: null })).toEqual([])
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

  it('corpoDaPalavra encolhe a palavra longa para caber na coluna', () => {
    expect(corpoDaPalavra(5)).toBe('min(112px, 27.74vw)')
    expect(corpoDaPalavra(12)).toBe('min(83px, 11.56vw)')
    expect(corpoDaPalavra(27)).toBe('min(37px, 5.14vw)')
  })

  it('textos de quantidade no singular e no plural', () => {
    expect(contarOpcoes(1)).toBe('1 opção')
    expect(contarOpcoes(3)).toBe('3 opções')
    expect(textoVerNoCardapio(1)).toBe('Ver no cardápio')
    expect(textoVerNoCardapio(3)).toBe('Ver as 3 no cardápio')
  })
})
