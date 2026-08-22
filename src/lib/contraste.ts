/** Luminância relativa por WCAG 2.1, formula
 *  https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
function luminancia(hex: string): number {
  const v = hex.replace('#', '')
  const canais = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2]
}

/** Razão de contraste entre duas cores hex. Ordem não importa. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  const alto = Math.max(la, lb)
  const baixo = Math.min(la, lb)
  return (alto + 0.05) / (baixo + 0.05)
}

/** Extrai os --color-* de um texto CSS. Fonte única de verdade é o CSS. */
export function lerTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  const re = /--color-([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    tokens[m[1]] = m[2].toUpperCase()
  }
  return tokens
}
