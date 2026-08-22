import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const arquivo = (n: string) => resolve(import.meta.dirname, '../public/marca', n)

// Valores medidos nos PNGs verificados no commit 5730c6f (task-3-report.md):
// a review compositou os dois arquivos sobre os valores reais de
// --color-sage/--color-ink e rodou um scan pixel a pixel — 246.223 px de
// cobre em logo-amo.png e 417.247 na lockup, zero abaixo de alpha 0.5, alpha
// mínimo exatamente 1.0, sem perfuração e sem clipping em nenhuma das 8
// bordas. Se as constantes do script (SAT_MIN, VAL_MIN, RAMPA, MINIMO_ALPHA,
// MARGEM) mudarem algum dia, estes valores têm que ser RE-MEDIDOS a partir
// de um novo run verificado — nunca apenas alargados para calar uma falha.
// Uma banda alargada até parar de acusar é pior do que nenhuma banda.
const DIMENSOES_CONHECIDAS: Record<string, { largura: number; altura: number }> = {
  'logo-amo.png': { largura: 2194, altura: 649 }, // nav — 1.36 MiB
  'logo-amo-lockup.png': { largura: 2372, altura: 1365 }, // footer — 2.95 MiB
}
const TOLERANCIA_DIMENSAO = 0.05 // ±5%

// Cru de propósito: não decodifica o PNG, não olha um pixel sequer, só o
// tamanho do arquivo em disco. Existe só para pegar o caso em que o script
// produz uma imagem inteira (ou quase inteira) transparente — o que
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
  // qualquer opacidade — isto já aconteceu nesta tarefa, com RAMPA=0.10, e
  // as asserções acima teriam passado do mesmo jeito —, (c) o glifo for
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
    // vez de casamentos de regex — com um item de array por iteração, isso
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
})
