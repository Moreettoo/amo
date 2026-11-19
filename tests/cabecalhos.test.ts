// @vitest-environment node
import { expect, it } from 'vitest'
import config from '../next.config'

const regras = await config.headers!()
const todos = Object.fromEntries(regras.find((r) => r.source === '/(.*)')!.headers.map((h) => [h.key, h.value]))

it('toda resposta leva os cabecalhos de seguranca', () => {
  expect(todos['Strict-Transport-Security']).toBe('max-age=63072000')
  expect(todos['X-Content-Type-Options']).toBe('nosniff')
  expect(todos['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  expect(todos['X-Frame-Options']).toBe('DENY')
  expect(todos['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()')
})

it('a CSP fecha o que a pagina nao usa e nao libera dominio de fora', () => {
  const csp = todos['Content-Security-Policy']
  for (const diretiva of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
    expect(csp).toContain(diretiva)
  }
  expect(csp).not.toContain('unsafe-eval')
  expect(csp).not.toMatch(/https?:|\*/)
})

it('o servidor nao se anuncia', () => {
  expect(config.poweredByHeader).toBe(false)
})
