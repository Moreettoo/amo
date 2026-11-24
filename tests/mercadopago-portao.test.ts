// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { contaDeTeste, contaReal } from '../scripts/mercadopago-portao.mjs'

/**
 * O portao dos scripts do Mercado Pago: o tipo da conta vem do GET /users/me,
 * e na duvida os dois recusam (um roteiro de teste com credencial real, ou a
 * prova de producao com credencial de teste, nunca seguem).
 */
describe('o portao dos scripts do Mercado Pago', () => {
  it('conta de teste', () => {
    expect(contaDeTeste({ id: 1, site_id: 'MLB', tags: ['normal', 'test_user'] })).toBe(true)
    expect(contaReal({ id: 1, site_id: 'MLB', tags: ['normal', 'test_user'] })).toBe(false)
  })

  it('conta real', () => {
    expect(contaReal({ id: 1, site_id: 'MLB', tags: ['normal'] })).toBe(true)
    expect(contaDeTeste({ id: 1, site_id: 'MLB', tags: ['normal'] })).toBe(false)
  })

  it('na duvida, recusa', () => {
    for (const u of [
      null,
      undefined,
      'x',
      [],
      {},
      { site_id: 'MLB' },
      { site_id: 'MLA', tags: ['test_user'] },
      { site_id: 'MLA', tags: ['normal'] },
      { site_id: 'MLB', tags: 'test_user' },
      { site_id: 'MLB', tags: null },
    ]) {
      expect(contaDeTeste(u)).toBe(false)
      expect(contaReal(u)).toBe(false)
    }
  })
})
