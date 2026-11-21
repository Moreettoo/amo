// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { InlineScript, MARCAR_JS } from '@/components/InlineScript'
import { HASH_DO_SCRIPT_DO_TOPO, montarPolitica } from '@/lib/seguranca/politica'

describe('montarPolitica', () => {
  it('em producao: nonce, strict-dynamic, o hash do script do topo e o Turnstile, sem eval', () => {
    const p = montarPolitica('abc', false)
    expect(p).toContain(`script-src 'self' 'nonce-abc' 'strict-dynamic' ${HASH_DO_SCRIPT_DO_TOPO}`)
    for (const d of ["default-src 'self'", 'frame-src https://challenges.cloudflare.com', "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "style-src 'self' 'unsafe-inline'"]) {
      expect(p).toContain(d)
    }
    expect(p).not.toContain('unsafe-eval')
    expect(p).not.toContain('\n')
  })
  it('em desenvolvimento libera eval', () => {
    expect(montarPolitica('abc', true)).toContain("'unsafe-eval'")
  })
  it('o hash e o do texto que o InlineScript poe na pagina', () => {
    const texto = renderToString(<InlineScript html={MARCAR_JS} />).match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]
    expect(HASH_DO_SCRIPT_DO_TOPO).toBe(`'sha256-${createHash('sha256').update(texto).digest('base64')}'`)
  })
  // o proxy importa a politica: ela nao puxa componente nem React (revisao final de 2026-11-21)
  it('o script do topo vem de um modulo so de constante, sem componente', () => {
    const ler = (caminho: string) => readFileSync(resolve(import.meta.dirname, '..', caminho), 'utf8')
    expect(ler('src/lib/seguranca/politica.ts')).not.toMatch(/components\//)
    expect(ler('src/lib/script-do-topo.ts')).not.toMatch(/^\s*import\b/m)
  })
})
