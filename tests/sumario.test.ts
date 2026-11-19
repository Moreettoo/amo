import { describe, it, expect } from 'vitest'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { FRACAO_DA_LINHA, montarSumario, parAtual, secaoAtual } from '@/lib/sumario'
import { montarCatalogo } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

describe('montarSumario', () => {
  const v = montarCatalogo(CATALOGO_MISTO)

  it('sem filtro: categorias com contagem e as linhas dentro, menos a que repete o nome', () => {
    expect(montarSumario(v.capitulos, () => true)).toEqual([
      {
        id: 'doces',
        nome: 'Doces',
        contagem: 9,
        linhas: [
          { id: 'linha-bolos-no-pote', nome: 'Bolos no pote', contagem: 7 },
          { id: 'linha-bolos-inteiros', nome: 'Bolos inteiros', contagem: 2 },
        ],
      },
      { id: 'salgados', nome: 'Salgados', contagem: 2, linhas: [] },
    ])
  })

  it('com filtro: a contagem é a do que está na tela, e o item zerado continua na lista', () => {
    const s = montarSumario(v.capitulos, (p) => p.vontades.includes('fruta'))
    expect(s.map((i) => [i.id, i.contagem])).toEqual([
      ['doces', 4],
      ['salgados', 0],
    ])
    expect(s[0].linhas.map((l) => [l.id, l.contagem])).toEqual([
      ['linha-bolos-no-pote', 3],
      ['linha-bolos-inteiros', 1],
    ])
  })

  it('hoje: um item só, com a linha do pote dentro', async () => {
    const hoje = montarCatalogo(await carregarCatalogo())
    expect(montarSumario(hoje.capitulos, () => true)).toEqual([
      { id: 'doces', nome: 'Doces', contagem: 7, linhas: [{ id: 'linha-bolos-no-pote', nome: 'Bolos no pote', contagem: 7 }] },
    ])
  })
})

describe('secaoAtual', () => {
  const topos = [
    { id: 'a', topo: 400 },
    { id: 'b', topo: 900 },
    { id: 'c', topo: 1500 },
  ]

  it('a linha de leitura fica a 35% da altura da janela', () => {
    expect(FRACAO_DA_LINHA).toBe(0.35)
  })

  it('antes de qualquer seção passar da linha, vale a primeira', () => {
    expect(secaoAtual(topos, 315)).toBe('a')
  })

  it('vale a última que já passou da linha', () => {
    expect(secaoAtual(topos, 950)).toBe('b')
    expect(secaoAtual(topos, 5000)).toBe('c')
    expect(secaoAtual(topos, 900)).toBe('b')
  })

  it('sem seção na tela (o filtro esvaziou tudo), nenhuma é a atual', () => {
    expect(secaoAtual([], 315)).toBeNull()
  })
})

describe('parAtual', () => {
  const itens = montarSumario(montarCatalogo(CATALOGO_MISTO).capitulos, () => true)
  const TOPOS: Record<string, number> = {
    doces: 400,
    'linha-bolos-no-pote': 470,
    'linha-bolos-inteiros': 1600,
    salgados: 2400,
  }
  /** a medida de cada secao com a pagina rolada ate `y`; fora do DOM, null */
  const medir = (y: number, noDom: readonly string[] = Object.keys(TOPOS)) => (id: string) =>
    noDom.includes(id) ? TOPOS[id] - y : null

  it('no topo da página: a primeira categoria e a primeira linha dela', () => {
    expect(parAtual(itens, medir(0), 315)).toEqual({ categoria: 'doces', linha: 'linha-bolos-no-pote' })
  })

  it('a linha muda dentro da mesma categoria', () => {
    expect(parAtual(itens, medir(1400), 315)).toEqual({ categoria: 'doces', linha: 'linha-bolos-inteiros' })
  })

  it('categoria sem linha listada: só ela', () => {
    expect(parAtual(itens, medir(2200), 315)).toEqual({ categoria: 'salgados', linha: null })
  })

  it('seção que o filtro tirou da página não conta', () => {
    expect(parAtual(itens, medir(0, ['salgados']), 315)).toEqual({ categoria: 'salgados', linha: null })
    expect(parAtual(itens, medir(0, ['doces', 'linha-bolos-inteiros']), 315)).toEqual({
      categoria: 'doces',
      linha: 'linha-bolos-inteiros',
    })
  })

  it('sem nenhuma seção na página, nada é o atual', () => {
    expect(parAtual(itens, medir(0, []), 315)).toEqual({ categoria: null, linha: null })
  })
})
