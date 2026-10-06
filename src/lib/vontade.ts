/**
 * As contas do Hoje o dia pede. O trilho da secao pinada e dividido em n
 * trechos iguais, um por vontade.
 */

/** Qual vontade o progresso da rolagem (0 a 1) escolhe. */
export function indicePorProgresso(progresso: number, n: number): number {
  if (n <= 0 || !Number.isFinite(progresso)) return 0
  const p = Math.min(0.9999, Math.max(0, progresso))
  return Math.min(n - 1, Math.floor(p * n))
}

/** O scrollY que poe a vontade i no meio do trecho dela. */
export function posicaoDoIndice(i: number, n: number, topo: number, curso: number): number {
  return topo + (curso * (i + 0.5)) / n
}

/** "A", "A e B", "A, B e C". */
export function listarNomes(nomes: readonly string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? ''
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

/** O corpo cai conforme o numero de letras, para a palavra caber na coluna.
 *  Em `cqi`, a largura da propria coluna de texto (que e um container de
 *  inline-size): em vw a conta supunha a janela inteira, e no desktop a
 *  palavra so tem metade dela. */
export function corpoDaPalavra(letras: number): string {
  const px = Math.min(112, Math.round(1000 / letras))
  const cqi = (92 / (letras * 0.62)).toFixed(2)
  return `min(${px}px, ${cqi}cqi)`
}

export function contarOpcoes(n: number): string {
  return n === 1 ? '1 opção' : `${n} opções`
}

export function textoVerNoCardapio(n: number): string {
  return n === 1 ? 'Ver no cardápio' : `Ver as ${n} no cardápio`
}
