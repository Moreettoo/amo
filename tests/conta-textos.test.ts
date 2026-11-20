import { describe, expect, it } from 'vitest'
import {
  FRASE_DO_ESTADO,
  MOTIVO_DO_CANCELAMENTO,
  NOME_DO_ESTADO,
  descreverEntrega,
  descreverPagamento,
  formatarDataEHora,
  formatarDia,
  formatarHora,
  primeiroNome,
} from '@/lib/conta/textos'

const entrega = {
  cep: '03183002',
  logradouro: 'Rua Cuiabá',
  numero: '412',
  complemento: 'apto 31',
  bairro: 'Alto da Mooca',
  cidade: 'São Paulo',
  uf: 'SP',
  minutos: 25,
  rastreioUrl: null,
}

describe('os textos de Minha conta', () => {
  it('nomeia cada estado, e a frase em script vai em minuscula', () => {
    expect(NOME_DO_ESTADO).toEqual({
      aguardando_pagamento: 'Aguardando pagamento',
      pago: 'Pago',
      em_preparo: 'Em preparo',
      a_caminho: 'A caminho',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
    })
    for (const frase of Object.values(FRASE_DO_ESTADO)) expect(frase).toBe(frase.toLowerCase())
    for (const motivo of Object.values(MOTIVO_DO_CANCELAMENTO)) expect(motivo).toMatch(/\.$/)
  })

  it('data e hora na hora de Sao Paulo', () => {
    expect(formatarDataEHora('2026-11-15T17:30:00+00:00')).toBe('15 de novembro de 2026, 14h30')
    expect(formatarHora('2026-11-20T17:02:00+00:00')).toBe('14h02')
    expect(formatarHora('2026-11-20T12:05:00+00:00')).toBe('9h05')
  })

  it('o dia sem o ano no ano corrente, com o ano nos outros', () => {
    const agora = new Date('2026-11-20T15:00:00-03:00')
    expect(formatarDia('2026-11-08T15:00:00-03:00', agora)).toBe('8 de novembro')
    expect(formatarDia('2025-12-30T15:00:00-03:00', agora)).toBe('30 de dezembro de 2025')
    // 2h30 de 1 de janeiro em UTC ainda e 31 de dezembro em Sao Paulo: vale o dia de Sao Paulo
    expect(formatarDia('2026-01-01T02:30:00+00:00', agora)).toBe('31 de dezembro de 2025')
  })

  it('a entrega com o retrato e sem ele (pedido anonimizado)', () => {
    expect(descreverEntrega(entrega)).toBe('Rua Cuiabá, 412, apto 31 · Alto da Mooca, São Paulo, SP · CEP 03183-002')
    expect(descreverEntrega({ ...entrega, complemento: '' })).toBe('Rua Cuiabá, 412 · Alto da Mooca, São Paulo, SP · CEP 03183-002')
    expect(descreverEntrega({ ...entrega, logradouro: null, numero: null, complemento: null, cep: '03183' })).toBe(
      'Alto da Mooca, São Paulo, SP · CEP 03183',
    )
  })

  it('o pagamento: Pix, cartao com bandeira e parcelas, ou nada', () => {
    expect(descreverPagamento({ forma: 'pix', parcelas: null, cartaoBandeira: null, cartaoFinal: null })).toBe('Pix')
    expect(descreverPagamento({ forma: 'cartao', parcelas: 2, cartaoBandeira: 'visa', cartaoFinal: '4242' })).toBe('Cartão Visa final 4242 em 2x')
    expect(descreverPagamento({ forma: 'cartao', parcelas: 1, cartaoBandeira: 'master', cartaoFinal: '1234' })).toBe('Cartão Mastercard final 1234')
    expect(descreverPagamento({ forma: 'cartao', parcelas: null, cartaoBandeira: 'outra_bandeira', cartaoFinal: '9876' })).toBe('Cartão Outra bandeira final 9876')
    expect(descreverPagamento(null)).toBeNull()
  })

  it('o primeiro nome', () => {
    expect(primeiroNome('  Mariana  Costa ')).toBe('Mariana')
    expect(primeiroNome('')).toBe('')
  })
})
