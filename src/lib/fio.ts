/**
 * O fio que liga as secoes da home: um traco so, que sai do script do hero,
 * sublinha o script de cada secao, passa por tras de cada foto (como o
 * barbante que prende a etiqueta ao pote) e termina num coracao.
 *
 * Aqui mora so a geometria, sem DOM: caixas medidas entram, caminhos SVG
 * saem. Quem mede e quem desenha e src/components/layout/Fio.tsx.
 *
 * A pagina vem em blocos. Um bloco `pagina` usa as coordenadas do <main>.
 * Um bloco `janela` e um painel que fica preso na tela enquanto a pagina
 * rola (Hoje o dia pede): o trecho do fio dele mora dentro do painel e usa
 * as coordenadas do painel, para andar junto com ele.
 */

export type Caixa = { l: number; t: number; r: number; b: number }

export type Ancora = {
  /** inicio: de onde o fio sai. sub: script que ele sublinha. atras: foto
   *  ou cartao por tras do qual ele passa. fim: frase que ganha o coracao. */
  tipo: 'inicio' | 'sub' | 'atras' | 'fim'
  caixa: Caixa
  /** ancoras da mesma secao tem o mesmo numero */
  secao: number
}

export type Bloco =
  | { tipo: 'pagina'; ancoras: readonly Ancora[] }
  | {
      tipo: 'janela'
      ancoras: readonly Ancora[]
      /** topo e base da secao, nas coordenadas do <main> */
      topo: number
      base: number
      /** altura do painel, que e a regua das ancoras dele */
      altura: number
      /** onde comeca o conteudo do painel: o fio cruza acima disso */
      respiro: number
    }

type No = { x: number; y: number; tx: number | null; ty: number }
type Lado = 'e' | 'd'

/** em tela estreita: quanto o fio se afasta da tela quando sai pela lateral */
const FORA = 70
/** na pagina em colunas: o raio da virada do sublinhado para a descida */
const CURVA = 80
const n = (v: number) => v.toFixed(1)
const limite = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const meio = (c: Caixa) => (c.l + c.r) / 2
/** a linha de base do script dentro da caixa dele */
const base = (c: Caixa) => c.b - (c.b - c.t) * 0.16

/** A ordem de visita numa secao: lado a lado, primeiro a que esta do lado
 *  de onde o fio vem; empilhadas, de cima para baixo. O inicio abre e o fim
 *  fecha, e o que vem abaixo do fim fica de fora. */
function ordenar(ancoras: readonly Ancora[], cx: number | null): Ancora[] {
  const porSecao = new Map<number, Ancora[]>()
  for (const a of ancoras) porSecao.set(a.secao, [...(porSecao.get(a.secao) ?? []), a])
  const saida: Ancora[] = []
  let x = cx
  for (const grupo of [...porSecao.entries()].sort((p, q) => p[0] - q[0]).map((e) => e[1])) {
    const peso = (a: Ancora) => (a.tipo === 'inicio' ? -1 : a.tipo === 'fim' ? 1 : 0)
    const ladoALado = (p: Ancora, q: Ancora) => p.caixa.b > q.caixa.t + 20 && q.caixa.b > p.caixa.t + 20
    const ordenado = [...grupo].sort((p, q) => {
      if (peso(p) !== peso(q)) return peso(p) - peso(q)
      if (x !== null && ladoALado(p, q)) return Math.abs(meio(p.caixa) - x) - Math.abs(meio(q.caixa) - x)
      return p.caixa.t - q.caixa.t
    })
    const fim = ordenado.find((a) => a.tipo === 'fim')
    for (const a of ordenado) {
      // empilhado abaixo da frase final, o fio teria de voltar para cima
      if (fim && a !== fim && a.caixa.t >= fim.caixa.b) continue
      saida.push(a)
      x = meio(a.caixa)
    }
  }
  return saida
}

/** Liga os nos com curvas de Bezier que respeitam a direcao da pena em cada
 *  um. A alca encolhe para a curva caber entre `de` e `ate` (em x). */
function desenhar(
  nos: No[],
  de: number,
  ate: number,
  coracao: { dir: number; tamanho: number } | null,
): string {
  if (nos.length < 2) return ''
  nos.forEach((p, i) => {
    if (p.tx !== null) return
    // atras da foto o fio segue reto de onde veio para onde vai
    const a = nos[i - 1] ?? p
    const b = nos[i + 1] ?? p
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
    p.tx = (b.x - a.x) / d
    p.ty = (b.y - a.y) / d
  })
  let d = `M${n(nos[0].x)} ${n(nos[0].y)}`
  for (let i = 1; i < nos.length; i++) {
    const a = nos[i - 1]
    const b = nos[i]
    const ax = a.tx ?? 0
    const bx = b.tx ?? 0
    if (ax === 0 && bx === 0 && Math.abs(a.x - b.x) < 0.5) {
      d += ` L${n(b.x)} ${n(b.y)}`
      continue
    }
    const h = Math.hypot(b.x - a.x, b.y - a.y) * 0.38
    const cabe = (x: number, t: number) =>
      t < 0 ? Math.min(h, Math.max(8, (x - de) / -t)) : t > 0 ? Math.min(h, Math.max(8, (ate - x) / t)) : h
    const ha = cabe(a.x, ax)
    const hb = cabe(b.x, -bx)
    d += ` C${n(a.x + ax * ha)} ${n(a.y + a.ty * ha)} ${n(b.x - bx * hb)} ${n(b.y - b.ty * hb)} ${n(b.x)} ${n(b.y)}`
  }
  if (coracao) {
    // o coracao do logo, num traco so, a partir da ponta de baixo
    const p = nos[nos.length - 1]
    const t = coracao.tamanho
    const k = coracao.dir
    const c = { x: p.x, y: p.y - t }
    d += ` C${n(c.x + k * t * 1.6)} ${n(c.y - t * 0.2)} ${n(c.x + k * t * 0.9)} ${n(c.y - t * 1.5)} ${n(c.x)} ${n(c.y - t * 0.45)}`
    d += ` C${n(c.x - k * t * 0.9)} ${n(c.y - t * 1.5)} ${n(c.x - k * t * 1.6)} ${n(c.y - t * 0.2)} ${n(p.x)} ${n(p.y)}`
  }
  return d
}

/**
 * Um caminho SVG por bloco, na ordem dos blocos.
 *
 * `largo` e a pagina em colunas (desktop): o fio corta de uma ancora a outra
 * em curvas longas e, depois de sublinhar, desce pela margem.
 *
 * Em tela estreita o texto ocupa a largura toda e nao sobra margem. Ali o
 * fio nao desce reto pela beirada: ele sai da tela por uma lateral, numa
 * curva aberta, e volta mais abaixo pela mesma lateral. O que se ve sao so
 * as curvas de entrada e de saida; a descida acontece fora da tela (o SVG
 * corta o que passa da largura).
 */
export function tracarFio(blocos: readonly Bloco[], largura: number, largo: boolean): string[] {
  const xFora = (l: Lado) => (l === 'e' ? -FORA : largura + FORA)
  const oposto = (l: Lado): Lado => (l === 'e' ? 'd' : 'e')
  let cx: number | null = null
  /** em tela estreita: a lateral por onde o fio saiu; nulo se ele esta na tela */
  let lado: Lado | null = null
  let yUlt = 0
  let entrada: No | null = null
  // a margem da pagina em colunas: fora da coluna de conteudo (1128 px)
  const margem = Math.max(10, (largura - 1128) / 2 - 46)

  return blocos.map((bloco, i) => {
    const nos: No[] = entrada ? [entrada] : []
    entrada = null
    let coracao: { dir: number; tamanho: number } | null = null
    let semFoto: number | null = null
    const sai = (l: Lado, y: number) => nos.push({ x: xFora(l), y, tx: l === 'e' ? -1 : 1, ty: 0.12 })
    const entra = (l: Lado, y: number) => nos.push({ x: xFora(l), y, tx: l === 'e' ? 1 : -1, ty: 0.12 })

    const visita = ordenar(bloco.ancoras, cx)
    for (const [v, { tipo, caixa: c, secao }] of visita.entries()) {
      const b = base(c)
      const altura = c.b - c.t
      const seguinte = visita[v + 1]
      if (tipo === 'inicio') {
        // um floreio curto sob o fim da frase, como a rubrica de uma assinatura
        nos.push({ x: c.l + (c.r - c.l) * 0.5, y: b + 12, tx: 1, ty: 0.1 }, { x: c.r + 2, y: b + 4, tx: 1, ty: -0.14 })
        cx = c.r
        yUlt = b
        if (!largo) {
          // no celular a foto vem logo abaixo do titulo: o floreio segue para
          // fora da tela em vez de mergulhar nela
          sai('d', b - 8)
          lado = 'd'
          semFoto = secao
        }
      } else if (tipo === 'sub') {
        let dir = cx !== null && cx > meio(c) ? -1 : 1
        if (!largo) {
          const l: Lado = lado ?? 'd'
          dir = l === 'd' ? -1 : 1
          entra(l, b - 30)
        }
        const de = dir > 0 ? c.l + 4 : c.r + 12
        const ate = dir > 0 ? c.r + 14 : c.l - 6
        const naSecao = seguinte !== undefined && seguinte.secao === secao
        // Depois de sublinhar, o fio segue ate a margem e desce por ela:
        // embaixo do titulo vem o texto da secao, e ele nao risca texto.
        const desce = largo && !(naSecao && seguinte.caixa.t < c.b)
        const naMargem = dir < 0 ? margem : largura - margem
        // Com a margem colada no fim do sublinhado, a virada faria quina: o
        // fio se afasta CURVA px (sem colar na beira), a ponta do sublinhado
        // ja comeca a cair e a queda e longa. Com a margem longe, a curva ja
        // e aberta e passa por cima do texto da secao.
        const apertado = desce && Math.abs(naMargem - ate) < CURVA * 2
        nos.push({ x: de, y: b + 5, tx: dir, ty: 0.07 }, { x: ate, y: b + 5, tx: dir, ty: apertado ? 0.18 : -0.07 })
        cx = ate
        yUlt = b + 5
        if (largo) {
          if (apertado) {
            const x = dir < 0 ? Math.max(12, Math.min(naMargem, ate - CURVA)) : Math.min(largura - 12, Math.max(naMargem, ate + CURVA))
            nos.push({ x, y: b + 5 + CURVA * 2.1, tx: dir * 0.12, ty: 1 })
            cx = x
          } else if (desce) {
            // a pena chega a margem ainda abrindo para fora: a descida ganha barriga
            nos.push({ x: naMargem, y: b + 5 + Math.max(90, Math.abs(naMargem - ate) * 0.35), tx: dir * 0.2, ty: 1 })
            cx = naMargem
          }
        } else if (naSecao && seguinte.tipo === 'atras' && seguinte.caixa.t - c.b < 160) {
          // o cartao vem logo abaixo do titulo: o fio enrola direto para tras dele
          lado = null
        } else {
          lado = dir < 0 ? 'e' : 'd'
          sai(lado, b + 27)
        }
      } else if (tipo === 'atras') {
        if (!largo && semFoto === secao) continue
        const centro = { x: meio(c), y: (c.t + c.b) / 2 }
        if (!largo && lado) {
          entra(lado, c.t + altura * 0.35)
        } else if (largo && bloco.tipo === 'janela' && cx !== null && Math.abs(centro.x - cx) > 240) {
          // no painel preso o fio cruza por cima do conteudo, e nao por ele
          const y = Math.max(bloco.respiro - 30, bloco.respiro * 0.55)
          nos.push({ x: (cx + centro.x) / 2, y, tx: Math.sign(centro.x - cx), ty: 0 })
        }
        nos.push({ ...centro, tx: null, ty: 0 })
        yUlt = c.b
        if (largo) {
          // no painel preso ele sai pela margem do lado da foto, sem passar
          // pela legenda dela
          cx =
            bloco.tipo !== 'janela'
              ? centro.x
              : centro.x > largura / 2
                ? Math.min(largura - 12, c.r + 52)
                : Math.max(12, c.l - 52)
        } else if (seguinte !== undefined && seguinte.tipo === 'atras' && seguinte.caixa.t - c.b < 240) {
          // do cartao para a foto logo abaixo, direto
          lado = null
        } else {
          lado = lado ? oposto(lado) : 'd'
          sai(lado, c.b - altura * 0.2)
        }
      } else {
        let dir = cx !== null && cx > meio(c) ? -1 : 1
        if (!largo) {
          const l: Lado = lado ?? 'e'
          dir = l === 'd' ? -1 : 1
          entra(l, b - 24)
        }
        if (dir > 0) {
          // vindo da esquerda, passa por baixo da frase antes de subir ao coracao
          nos.push({ x: c.l + 4, y: b + 7, tx: 1, ty: 0.07 }, { x: c.r + 8, y: b + 7, tx: 1, ty: -0.07 })
        }
        nos.push({ x: Math.min(c.r + (largo ? 40 : 26), largura - 20), y: b - 2, tx: dir * 0.97, ty: 0.24 })
        coracao = { dir, tamanho: largo ? 13 : 10 }
      }
    }

    // a passagem para o bloco seguinte: o fio entra e sai do painel preso
    // descendo, no mesmo x dos dois lados da emenda
    const proximo = blocos[i + 1]
    if (proximo && nos.length > 0) {
      const fundo = bloco.tipo === 'janela' ? bloco.altura : proximo.tipo === 'janela' ? proximo.topo : null
      if (fundo !== null) {
        let x: number
        if (largo) {
          const ultimo = nos[nos.length - 1]
          const anda = bloco.tipo === 'janela' ? 0 : Math.sign(ultimo.tx ?? 0)
          x = limite((cx ?? ultimo.x) + anda * 56, 12, largura - 12)
        } else {
          if (!lado) {
            lado = 'd'
            sai(lado, yUlt)
          }
          x = lado === 'e' ? -FORA * 1.6 : largura + FORA * 1.6
        }
        nos.push({ x, y: fundo, tx: 0, ty: 1 })
        cx = x
        const outroLado = bloco.tipo === 'janela' ? bloco.base : 0
        entrada = { x, y: outroLado, tx: 0, ty: 1 }
        yUlt = outroLado
      }
    }
    const folga = largo ? 4 : -FORA * 2.4
    return desenhar(nos, folga, largura - folga, coracao)
  })
}
