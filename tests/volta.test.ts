import { describe, expect, it } from 'vitest'
import { voltaSegura } from '@/lib/auth/volta'

describe('voltaSegura', () => {
  it.each(['/conta', '/conta/pedidos/AMO-2B7KQ9XZ', '/sacola', '/catalogo/prestigio?x=1#y', '/conta/perfil/email-e-senha?aviso=link-invalido'])('aceita %s', (c) => {
    expect(voltaSegura(c)).toBe(c)
  })
  it.each([
    '//mal.com', '/\\mal.com', '/%2F%2Fmal.com', '%2F%2Fmal.com', 'javascript:alert(1)', 'https://mal.com',
    'conta', '', ' /conta', '/conta\u0000x', '/conta\nx', '/conta\u0085', '/conta\u009fx', null, 42, '/' + 'a'.repeat(600),
  ])('recusa %j e volta para /conta', (c) => {
    expect(voltaSegura(c)).toBe('/conta')
  })
})
