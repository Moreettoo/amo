import { describe, expect, it } from 'vitest'
import { tracarFio, type Ancora, type Bloco, type Caixa } from '@/lib/fio'

const caixa = (l: number, t: number, w: number, h: number): Caixa => ({ l, t, r: l + w, b: t + h })
const ancora = (tipo: Ancora['tipo'], secao: number, c: Caixa): Ancora => ({ tipo, secao, caixa: c })

/** os pontos finais de cada comando do caminho, na ordem */
function pontos(d: string): { x: number; y: number }[] {
  return [...d.matchAll(/([MLC])([^MLC]+)/g)].map((m) => {
    const numeros = m[2].trim().split(/\s+/).map(Number)
    return { x: numeros[numeros.length - 2], y: numeros[numeros.length - 1] }
  })
}
const todosOsNumeros = (d: string) => d.replace(/[MLC]/g, ' ').trim().split(/\s+/).map(Number)

/** a home em colunas: hero, vitrine, painel preso, rotulos, marca e fecho */
function paginaLarga(): Bloco[] {
  return [
    {
      tipo: 'pagina',
      ancoras: [
        ancora('inicio', 0, caixa(156, 250, 660, 190)),
        ancora('atras', 0, caixa(686, 140, 380, 570)),
        ancora('sub', 1, caixa(150, 930, 270, 80)),
      ],
    },
    {
      tipo: 'janela',
      topo: 1760,
      base: 2400,
      altura: 640,
      respiro: 120,
      ancoras: [ancora('atras', 2, caixa(883, 140, 340, 425))],
    },
    {
      tipo: 'pagina',
      ancoras: [
        ancora('sub', 3, caixa(150, 2700, 250, 80)),
        ancora('atras', 3, caixa(600, 2500, 680, 480)),
        ancora('atras', 4, caixa(156, 3200, 440, 550)),
        ancora('sub', 4, caixa(700, 3440, 300, 80)),
        ancora('fim', 5, caixa(156, 4150, 300, 33)),
        ancora('atras', 5, caixa(760, 3900, 500, 400)),
      ],
    },
  ]
}

/** a mesma home numa coluna so */
function paginaEstreita(): Bloco[] {
  return [
    {
      tipo: 'pagina',
      ancoras: [
        ancora('inicio', 0, caixa(20, 150, 300, 80)),
        ancora('atras', 0, caixa(20, 225, 350, 280)),
        ancora('sub', 1, caixa(16, 1210, 170, 60)),
      ],
    },
    {
      tipo: 'janela',
      topo: 2190,
      base: 3100,
      altura: 910,
      respiro: 90,
      ancoras: [ancora('atras', 2, caixa(98, 96, 195, 244))],
    },
    {
      tipo: 'pagina',
      ancoras: [
        ancora('sub', 3, caixa(16, 3260, 150, 50)),
        ancora('atras', 3, caixa(20, 3370, 350, 640)),
        ancora('atras', 4, caixa(20, 4110, 338, 422)),
        ancora('sub', 4, caixa(16, 4640, 190, 55)),
        ancora('fim', 5, caixa(20, 5140, 248, 27)),
        ancora('atras', 5, caixa(20, 5290, 338, 270)),
      ],
    },
  ]
}

describe('tracarFio', () => {
  it('devolve um caminho por bloco, e nenhum numero invalido', () => {
    for (const [blocos, largura, largo] of [
      [paginaLarga(), 1440, true],
      [paginaEstreita(), 390, false],
    ] as const) {
      const caminhos = tracarFio(blocos, largura, largo)
      expect(caminhos).toHaveLength(blocos.length)
      for (const d of caminhos) {
        expect(d.startsWith('M')).toBe(true)
        expect(todosOsNumeros(d).every(Number.isFinite)).toBe(true)
      }
    }
  })

  it('sai de baixo do script do hero e termina no coração ao lado da frase final', () => {
    const blocos = paginaLarga()
    const caminhos = tracarFio(blocos, 1440, true)
    const inicio = pontos(caminhos[0])[0]
    // sob a metade direita de "comer bem."
    expect(inicio.x).toBeGreaterThan(156 + 330 - 1)
    expect(inicio.y).toBeGreaterThan(250 + 190 * 0.7)
    // o coracao fecha na ponta: os dois ultimos trechos voltam ao mesmo ponto
    const fim = pontos(caminhos[2])
    const ponta = fim[fim.length - 1]
    expect(fim[fim.length - 3]).toEqual(ponta)
    // a direita da frase, na altura dela
    expect(ponta.x).toBeGreaterThan(456)
    expect(ponta.y).toBeGreaterThan(4150)
    expect(ponta.y).toBeLessThan(4183)
  })

  it('em colunas o fio não sai da página', () => {
    for (const d of tracarFio(paginaLarga(), 1440, true)) {
      for (const p of pontos(d)) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(1440)
      }
    }
  })

  it('entra e sai do painel preso no mesmo x dos dois lados da emenda', () => {
    for (const [blocos, largura, largo] of [
      [paginaLarga(), 1440, true],
      [paginaEstreita(), 390, false],
    ] as const) {
      const [antes, painel, depois] = tracarFio(blocos, largura, largo).map(pontos)
      const janela = blocos[1]
      if (janela.tipo !== 'janela') throw new Error('o bloco do meio é o painel')
      const chegada = antes[antes.length - 1]
      expect(chegada.y).toBe(janela.topo)
      expect(painel[0]).toEqual({ x: chegada.x, y: 0 })
      const saida = painel[painel.length - 1]
      expect(saida.y).toBe(janela.altura)
      expect(depois[0]).toEqual({ x: saida.x, y: janela.base })
    }
  })

  it('numa coluna só não há descida reta à vista: a descida acontece fora da tela', () => {
    const caminhos = tracarFio(paginaEstreita(), 390, false)
    for (const d of caminhos) {
      const nos = pontos(d)
      const comandos = [...d.matchAll(/[MLC]/g)].map((m) => m[0])
      comandos.forEach((comando, i) => {
        if (comando !== 'L') return
        // todo trecho reto fica fora da largura da tela
        for (const p of [nos[i - 1], nos[i]]) {
          expect(p.x < 0 || p.x > 390).toBe(true)
        }
      })
    }
    // e ele de fato sai pelas duas laterais
    const xs = caminhos.flatMap((d) => pontos(d).map((p) => p.x))
    expect(Math.min(...xs)).toBeLessThan(0)
    expect(Math.max(...xs)).toBeGreaterThan(390)
  })

  it('numa coluna só a foto que vem abaixo da frase final fica de fora', () => {
    const [, , ultimo] = tracarFio(paginaEstreita(), 390, false).map(pontos)
    // nada do caminho passa da altura da frase (a foto do fecho começa em 5290)
    expect(Math.max(...ultimo.map((p) => p.y))).toBeLessThan(5200)
  })

  it('em colunas, a virada do sublinhado para a descida tem folga e não faz quina', () => {
    // "pelo sabor": o sublinhado termina em x 144, a 34 px da margem (110)
    const caminho = tracarFio(paginaLarga(), 1440, true)[0]
    const nos = pontos(caminho)
    const i = nos.findIndex((p) => Math.abs(p.x - 144) < 0.1)
    expect(i).toBeGreaterThan(0)
    const fimDoSublinhado = nos[i]
    const descida = nos[i + 1]
    expect(fimDoSublinhado.x - descida.x).toBeGreaterThanOrEqual(80)
    expect(descida.y - fimDoSublinhado.y).toBeGreaterThanOrEqual(160)
    // a ponta do sublinhado ja aponta para baixo: a curva que sai dela comeca descendo
    const [, tipo, numeros] = [...caminho.matchAll(/([MLC])([^MLC]+)/g)][i + 1]
    expect(tipo).toBe('C')
    expect(Number(numeros.trim().split(/\s+/)[1])).toBeGreaterThan(fimDoSublinhado.y)
  })

  it('sem âncoras não há fio', () => {
    expect(tracarFio([], 1440, true)).toEqual([])
    expect(tracarFio([{ tipo: 'pagina', ancoras: [] }], 1440, true)).toEqual([''])
  })
})
