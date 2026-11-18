import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ler = (caminho: string) => readFileSync(resolve(import.meta.dirname, '..', caminho), 'utf8')

describe('layout', () => {
  const layout = ler('src/app/layout.tsx')

  it('marca o <html> com a classe js antes da primeira pintura', () => {
    expect(layout).toMatch(/<head>\s*<InlineScript html=\{MARCAR_JS\} \/>\s*<\/head>/)
    expect(layout).toMatch(/<html[^>]*suppressHydrationWarning/)
  })

  it('usa Allura e Poppins, e mais nenhuma família', () => {
    expect(layout).toMatch(/import \{ Allura, Poppins \} from 'next\/font\/google'/)
    expect(layout).not.toMatch(/Bree|Parisienne|Caprasimo|DM_Sans|Pinyon/)
  })

  it('pinta a barra do navegador de expresso', () => {
    expect(layout).toMatch(/themeColor: '#2B1B16'/)
  })

  it('não tem mais o <noscript> de resgate: nada nasce escondido sem JS', () => {
    expect(layout).not.toMatch(/<noscript>/)
  })
})

describe('globals.css', () => {
  const css = ler('src/app/globals.css')

  it('esconde o que só funciona com JS quando ele não carregou', () => {
    expect(css).toMatch(/html:not\(\.js\) \.so-js\s*\{\s*display:\s*none !important;/)
  })

  it('emite os tokens mesmo sem uso em utilitário', () => {
    expect(css).toMatch(/@theme static \{/)
  })
})
