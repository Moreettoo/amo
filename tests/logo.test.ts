import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { resolve } from 'node:path'

const arquivo = (n: string) => resolve(import.meta.dirname, '../public/marca', n)

/**
 * Decodificador de PNG do mínimo necessário: 8 bits por canal, RGBA (color
 * type 6), sem entrelaçamento. Devolve só o canal alpha.
 *
 * Existe porque a asserção que de verdade importa aqui, "a arte não está
 * cortada na borda", precisa de pixel, e nenhuma das outras precisava: as que
 * já existiam leem bytes do IHDR e o tamanho em disco. Foi exatamente essa
 * lacuna que deixou passar o corte da base do logo da nav, com a arte saindo
 * pela borda de baixo em quatro linhas seguidas, enquanto o comentário deste
 * arquivo afirmava "sem clipping em nenhuma das 8 bordas" porque uma revisão
 * havia conferido isso à mão, uma vez, fora do repositório.
 *
 * O desfiltro é sequencial de propósito: os filtros do PNG (Up, Average,
 * Paeth) referenciam a linha anterior, então não há como ler só as bordas.
 */
function alphaDoPng(buf: Buffer): { largura: number; altura: number; alpha: Uint8Array } {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  const largura = buf.readUInt32BE(16)
  const altura = buf.readUInt32BE(20)
  expect(buf[24], 'profundidade de bits').toBe(8)
  expect(buf[25], 'color type').toBe(6)
  expect(buf[28], 'entrelaçamento').toBe(0)

  // Concatena todo IDAT: o PNG pode partir o fluxo em vários chunks.
  const pedacos: Buffer[] = []
  let i = 8
  while (i < buf.length) {
    const tam = buf.readUInt32BE(i)
    const tipo = buf.subarray(i + 4, i + 8).toString('ascii')
    if (tipo === 'IDAT') pedacos.push(buf.subarray(i + 8, i + 8 + tam))
    if (tipo === 'IEND') break
    i += 12 + tam
  }
  const cru = inflateSync(Buffer.concat(pedacos))

  const canais = 4
  const porLinha = largura * canais
  const alpha = new Uint8Array(largura * altura)
  const atual = new Uint8Array(porLinha)
  const anterior = new Uint8Array(porLinha)

  for (let y = 0; y < altura; y++) {
    const base = y * (porLinha + 1)
    const filtro = cru[base]
    for (let x = 0; x < porLinha; x++) {
      const bruto = cru[base + 1 + x]
      const a = x >= canais ? atual[x - canais] : 0
      const b = anterior[x]
      const c = x >= canais ? anterior[x - canais] : 0
      let previsto = 0
      if (filtro === 1) previsto = a
      else if (filtro === 2) previsto = b
      else if (filtro === 3) previsto = (a + b) >> 1
      else if (filtro === 4) {
        // Paeth
        const p = a + b - c
        const da = Math.abs(p - a)
        const db = Math.abs(p - b)
        const dc = Math.abs(p - c)
        previsto = da <= db && da <= dc ? a : db <= dc ? b : c
      }
      atual[x] = (bruto + previsto) & 0xff
    }
    for (let x = 0; x < largura; x++) alpha[y * largura + x] = atual[x * canais + 3]
    anterior.set(atual)
  }

  return { largura, altura, alpha }
}

/** Meio-opaco ou mais conta como conteúdo, o mesmo piso do script de recorte. */
const OPACO = 128

// Valores medidos nos PNGs verificados no commit 5730c6f (task-3-report.md):
// a review compositou os dois arquivos sobre os valores reais de
// --color-sage/--color-ink e rodou um scan pixel a pixel, 246.223 px de
// cobre em logo-amo.png e 417.247 na lockup, zero abaixo de alpha 0.5, alpha
// mínimo exatamente 1.0, sem perfuração e sem clipping em nenhuma das 8
// bordas. Se as constantes do script (SAT_MIN, VAL_MIN, RAMPA, MINIMO_ALPHA,
// MARGEM) mudarem algum dia, estes valores têm que ser RE-MEDIDOS a partir
// de um novo run verificado, nunca apenas alargados para calar uma falha.
// Uma banda alargada até parar de acusar é pior do que nenhuma banda.
// RE-MEDIDO em 2026-08-23, não alargado: o recorte da faixa superior do lockup
// era uma fração fixa (`int(A * 0.46)`) da altura da origem, e a faixa termina
// em 49% dela. O corte entrava 48 linhas dentro do desenho e decepava a base do
// "A", a cauda do "m" e o fundo do pote; o `MARGEM` de respiro é clampado no
// limite do próprio corte, então nem sobrava moldura transparente pra denunciar.
// Com a fronteira medida (fim_da_faixa_superior), o asset da nav passou de
// 2194x649 para 2245x714, e os dois arquivos agora têm 16 px de margem
// transparente exatos nos quatro lados. O lockup do rodapé não mudou de tamanho,
// o que confirma que a correção mexeu só no recorte curto.
const DIMENSOES_CONHECIDAS: Record<string, { largura: number; altura: number }> = {
  'logo-amo.png': { largura: 2245, altura: 714 }, // nav, 1.51 MiB
  'logo-amo-lockup.png': { largura: 2372, altura: 1365 }, // footer, 2.95 MiB
}
const TOLERANCIA_DIMENSAO = 0.05 // ±5%

// Cru de propósito: não decodifica o PNG, não olha um pixel sequer, só o
// tamanho do arquivo em disco. Existe só para pegar o caso em que o script
// produz uma imagem inteira (ou quase inteira) transparente, o que
// comprime para poucos KB. Um PNG real com a arte do logo nestas dimensões
// nunca chega perto deste piso.
const TAMANHO_MINIMO_BYTES = 200 * 1024

describe('assets do logo', () => {
  it.each(['logo-amo.png', 'logo-amo-lockup.png'])('%s existe', (n) => {
    expect(existsSync(arquivo(n))).toBe(true)
  })

  it.each(['logo-amo.png', 'logo-amo-lockup.png'])(
    '%s é PNG com canal alpha (color type 6)',
    (n) => {
      const buf = readFileSync(arquivo(n))
      // assinatura PNG
      expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      // no chunk IHDR, o byte 25 é o color type; 6 = RGBA
      expect(buf[25]).toBe(6)
    },
  )

  it('o lockup da nav é mais largo que alto, para caber na barra', () => {
    const buf = readFileSync(arquivo('logo-amo.png'))
    const largura = buf.readUInt32BE(16)
    const altura = buf.readUInt32BE(20)
    expect(largura).toBeGreaterThan(altura)
  })

  // As asserções abaixo fecham uma lacuna real: as de cima só checam formato
  // e a relação largura/altura da nav, o que passa mesmo se (a) o script cair
  // no fallback de tela cheia sem recorte, (b) sobrar xadrez de fundo em
  // qualquer opacidade, isto já aconteceu nesta tarefa, com RAMPA=0.10, e
  // as asserções acima teriam passado do mesmo jeito, (c) o glifo for
  // cortado, ou (d) os dois arquivos forem trocados entre si (ambos são
  // "mais largos que altos" por construção, e a Task 5 consome os dois por
  // nome exato de arquivo).

  it('o lockup da nav tem proporção larga (pega troca de arquivo)', () => {
    const buf = readFileSync(arquivo('logo-amo.png'))
    const largura = buf.readUInt32BE(16)
    const altura = buf.readUInt32BE(20)
    expect(largura / altura).toBeGreaterThan(2.5)
  })

  it('o lockup completo tem proporção mais fechada que a da nav (pega troca de arquivo)', () => {
    const buf = readFileSync(arquivo('logo-amo-lockup.png'))
    const largura = buf.readUInt32BE(16)
    const altura = buf.readUInt32BE(20)
    expect(largura / altura).toBeLessThan(2.2)
  })

  it.each(Object.entries(DIMENSOES_CONHECIDAS))(
    // '%' solto (não '%%'): dobrar viraria um "especificador" para o vitest
    // por causa de uma contagem de placeholders que conta caracteres '%' em
    // vez de casamentos de regex, com um item de array por iteração, isso
    // faz o título aparecer com o objeto `esperado` despejado dentro do
    // texto. Confirmado lendo @vitest/utils/display.js e reproduzido antes
    // de escolher esta forma.
    '%s tem dimensões a até ±5% do valor conhecido-bom (pega recorte diferente e xadrez residual)',
    (n, esperado) => {
      const buf = readFileSync(arquivo(n))
      const largura = buf.readUInt32BE(16)
      const altura = buf.readUInt32BE(20)
      expect(largura).toBeGreaterThanOrEqual(esperado.largura * (1 - TOLERANCIA_DIMENSAO))
      expect(largura).toBeLessThanOrEqual(esperado.largura * (1 + TOLERANCIA_DIMENSAO))
      expect(altura).toBeGreaterThanOrEqual(esperado.altura * (1 - TOLERANCIA_DIMENSAO))
      expect(altura).toBeLessThanOrEqual(esperado.altura * (1 + TOLERANCIA_DIMENSAO))
    },
  )

  it.each(['logo-amo.png', 'logo-amo-lockup.png'])(
    '%s tem pelo menos 200KB (pega colapso para transparência total)',
    (n) => {
      const buf = readFileSync(arquivo(n))
      expect(buf.length).toBeGreaterThan(TAMANHO_MINIMO_BYTES)
    },
  )

  // Este é o guarda que faltava. Os de cima passavam com a arte cortada: eles
  // olham formato, proporção e tamanho em disco, e um recorte que decepa a base
  // do desenho não muda nenhum dos três de forma detectável. O corte real do
  // logo da nav tinha 693 px opacos na última linha, em quatro linhas seguidas,
  // e a suíte inteira passava.
  it.each(['logo-amo.png', 'logo-amo-lockup.png'])(
    '%s não tem arte encostada em nenhuma das 4 bordas',
    (n) => {
      const { largura, altura, alpha } = alphaDoPng(readFileSync(arquivo(n)))
      const px = (x: number, y: number) => alpha[y * largura + x]

      const contar = (pontos: number[]) => pontos.filter((v) => v >= OPACO).length
      const linha = (y: number) =>
        contar(Array.from({ length: largura }, (_, x) => px(x, y)))
      const coluna = (x: number) =>
        contar(Array.from({ length: altura }, (_, y) => px(x, y)))

      // Zero, não "poucos": uma silhueta tangente à borda ainda seria um corte.
      // O script devolve MARGEM px de moldura transparente por lado, então a
      // expectativa correta aqui é exatamente nenhum pixel opaco na borda.
      expect(linha(0), 'arte saindo pelo topo').toBe(0)
      expect(linha(altura - 1), 'arte saindo pela base').toBe(0)
      expect(coluna(0), 'arte saindo pela esquerda').toBe(0)
      expect(coluna(largura - 1), 'arte saindo pela direita').toBe(0)
    },
  )

  it.each(['logo-amo.png', 'logo-amo-lockup.png'])(
    '%s tem moldura transparente nos 4 lados (o respiro que o script promete)',
    (n) => {
      const { largura, altura, alpha } = alphaDoPng(readFileSync(arquivo(n)))
      const ocupada = (indices: number[]) => indices.some((i) => alpha[i] >= OPACO)

      const linhas = Array.from({ length: altura }, (_, y) =>
        ocupada(Array.from({ length: largura }, (_, x) => y * largura + x)),
      )
      const colunas = Array.from({ length: largura }, (_, x) =>
        ocupada(Array.from({ length: altura }, (_, y) => y * largura + x)),
      )

      const primeira = linhas.indexOf(true)
      const ultima = linhas.lastIndexOf(true)
      const esquerda = colunas.indexOf(true)
      const direita = colunas.lastIndexOf(true)

      // MARGEM do script é 16. Banda de 8 a 24 aceita o arredondamento do
      // recorte sem aceitar "margem que virou zero" nem "moldura que engordou
      // porque o bbox pegou ruído".
      for (const [lado, valor] of [
        ['topo', primeira],
        ['base', altura - 1 - ultima],
        ['esquerda', esquerda],
        ['direita', largura - 1 - direita],
      ] as const) {
        expect(valor, `margem ${lado}`).toBeGreaterThanOrEqual(8)
        expect(valor, `margem ${lado}`).toBeLessThanOrEqual(24)
      }
    },
  )
})
