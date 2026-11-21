/**
 * Para onde a cliente volta depois de entrar. So caminho interno: comeca com
 * "/", e o segundo caractere nao e "/" nem "\" (os dois levariam para outro
 * site). Confere tambem a forma decodificada, porque "%2F%2F" vira "//" no
 * navegador. Puro: serve a pagina, a acao e o proxy.
 */
const PADRAO = '/conta'
const CONTROLE = /[\u0000-\u001f\u007f-\u009f]/

function interno(caminho: string): boolean {
  return caminho.startsWith('/') && caminho[1] !== '/' && caminho[1] !== '\\' && !CONTROLE.test(caminho)
}

export function voltaSegura(bruto: unknown): string {
  if (typeof bruto !== 'string' || bruto.length === 0 || bruto.length > 512) return PADRAO
  let decodificado: string
  try {
    decodificado = decodeURIComponent(bruto)
  } catch {
    return PADRAO
  }
  return interno(bruto) && interno(decodificado) ? bruto : PADRAO
}
