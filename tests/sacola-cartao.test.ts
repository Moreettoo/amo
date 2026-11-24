import { describe, expect, it } from 'vitest'
import { cartaoDoBrick } from '@/components/sacola/CartaoMercadoPago'

/** O que sai do Brick para pagarComCartao: o Device ID so quando ha. */
describe('cartaoDoBrick e o Device ID', () => {
  const lido = {
    formData: { token: 't'.repeat(32), payment_method_id: 'master', installments: 1 },
    additionalData: { paymentTypeId: 'credit_card', lastFourDigits: '3311' },
    dispositivo: 'armor.abc123def456',
  }

  it('leva o dispositivo quando ha', () => {
    expect(cartaoDoBrick(lido)?.dispositivo).toBe('armor.abc123def456')
  })

  it('sem dispositivo, a chave nao vai', () => {
    expect(cartaoDoBrick({ ...lido, dispositivo: null })).not.toHaveProperty('dispositivo')
  })

  it('o resto do cartao nao muda por causa dele', () => {
    expect(cartaoDoBrick({ ...lido, dispositivo: null })).toEqual({ token: 't'.repeat(32), bandeira: 'master', tipo: 'credit_card', parcelas: 1, final: '3311' })
  })
})
