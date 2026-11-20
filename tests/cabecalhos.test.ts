// @vitest-environment node
import { expect, it } from 'vitest'
// @ts-expect-error: o Next nao publica os tipos do path-to-regexp que ele usa nas regras de cabecalho
import { pathToRegexp } from 'next/dist/compiled/path-to-regexp'
import config from '../next.config'
import { FONTE_SEM_NONCE } from '../src/lib/seguranca/rotas'

const regras = await config.headers!()
const valores = (fonte: string) => Object.fromEntries(regras.find((r) => r.source === fonte)!.headers.map((h) => [h.key, h.value]))
const todos = { ...valores('/(.*)'), ...valores(FONTE_SEM_NONCE) }

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

it('a regra de toda rota nao manda CSP; a CSP estatica fica fora das rotas com nonce', () => {
  expect(valores('/(.*)')['Content-Security-Policy']).toBeUndefined()
  const casa = (u: string) => pathToRegexp(FONTE_SEM_NONCE, [], {}).test(u)
  for (const u of ['/', '/catalogo', '/catalogo/prestigio', '/contato']) expect(casa(u), u).toBe(true)
  for (const u of ['/sacola', '/conta', '/conta/perfil', '/entrar', '/cadastro', '/esqueci-a-senha', '/auth/callback']) expect(casa(u), u).toBe(false)
})
