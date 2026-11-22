import { describe, expect, it } from 'vitest'
import {
  aprovado,
  codigoAcabou,
  ESPERA_DO_DESAFIO_MS,
  ESPERA_DO_PIX_MS,
  horaDeSaoPaulo,
  mesmaSituacao,
  proximaEspera,
  terminou,
} from '@/components/sacola/espera'
import type { SituacaoDoPedido } from '@/lib/fechamento/tipos'

const MINUTO = 60_000
const desde = Date.parse('2026-11-21T15:00:00.000Z')

const pix = { copiaECola: '000201-codigo', qrBase64: 'iVBORw0KGgo=', expiraEm: '2026-11-21T17:32:00.000Z' }
const situacao = (estado: SituacaoDoPedido['estado'], tentativa: string, comPix = true): SituacaoDoPedido => ({
  numero: '123456',
  estado,
  pagamento: { forma: 'pix', estado: tentativa, recusa: null, pix: comPix ? pix : null, desafioUrl: null },
})

describe('o ritmo da espera do pagamento', () => {
  it('5 s nos 2 primeiros minutos, 15 s até 30 min, depois para', () => {
    expect(proximaEspera(desde, desde + 1 * MINUTO)).toBe(5000)
    expect(proximaEspera(desde, desde + 3 * MINUTO)).toBe(15000)
    expect(proximaEspera(desde, desde + 31 * MINUTO)).toBeNull()
  })

  it('nas viradas: 0 s e 1:59 ainda 5 s; 2:00 já 15 s; 30:00 para', () => {
    expect(proximaEspera(desde, desde)).toBe(5000)
    expect(proximaEspera(desde, desde + 2 * MINUTO - 1)).toBe(5000)
    expect(proximaEspera(desde, desde + 2 * MINUTO)).toBe(15000)
    expect(proximaEspera(desde, desde + 30 * MINUTO - 1)).toBe(15000)
    expect(proximaEspera(desde, desde + 30 * MINUTO)).toBeNull()
  })

  it('o desafio do banco espera até 40 min (contrato do Mercado Pago, 1.2); o Pix, 30', () => {
    expect(ESPERA_DO_PIX_MS).toBe(30 * MINUTO)
    expect(ESPERA_DO_DESAFIO_MS).toBe(40 * MINUTO)
    expect(proximaEspera(desde, desde + 1 * MINUTO, ESPERA_DO_DESAFIO_MS)).toBe(5000)
    expect(proximaEspera(desde, desde + 35 * MINUTO, ESPERA_DO_DESAFIO_MS)).toBe(15000)
    expect(proximaEspera(desde, desde + 40 * MINUTO - 1, ESPERA_DO_DESAFIO_MS)).toBe(15000)
    expect(proximaEspera(desde, desde + 40 * MINUTO, ESPERA_DO_DESAFIO_MS)).toBeNull()
    expect(proximaEspera(desde, desde + 35 * MINUTO, ESPERA_DO_PIX_MS)).toBeNull()
  })
})

describe('quando a espera termina', () => {
  it('o pedido saiu de aguardando_pagamento, ou a tentativa acabou expirada, cancelada ou recusada', () => {
    expect(terminou(situacao('aguardando_pagamento', 'pendente'))).toBe(false)
    expect(terminou(situacao('aguardando_pagamento', 'pendente', false))).toBe(false)
    expect(terminou(situacao('pago', 'aprovado', false))).toBe(true)
    expect(terminou(situacao('cancelado', 'cancelado', false))).toBe(true)
    for (const fim of ['expirado', 'cancelado', 'recusado']) expect(terminou(situacao('aguardando_pagamento', fim, false))).toBe(true)
  })

  it('aprovado é o pedido que seguiu (pago, em preparo, a caminho, entregue); o código acabou pede outro', () => {
    for (const estado of ['pago', 'em_preparo', 'a_caminho', 'entregue'] as const) expect(aprovado(situacao(estado, 'aprovado', false))).toBe(true)
    expect(aprovado(situacao('aguardando_pagamento', 'pendente'))).toBe(false)
    expect(aprovado(situacao('cancelado', 'cancelado', false))).toBe(false)
    expect(codigoAcabou(situacao('aguardando_pagamento', 'expirado', false))).toBe(true)
    expect(codigoAcabou(situacao('aguardando_pagamento', 'cancelado', false))).toBe(true)
    expect(codigoAcabou(situacao('aguardando_pagamento', 'pendente'))).toBe(false)
    expect(codigoAcabou(situacao('cancelado', 'cancelado', false))).toBe(false)
  })

  it('a mesma situação não é mudança; outro estado, outra tentativa ou outro código é', () => {
    expect(mesmaSituacao(situacao('aguardando_pagamento', 'pendente'), situacao('aguardando_pagamento', 'pendente'))).toBe(true)
    expect(mesmaSituacao(situacao('aguardando_pagamento', 'pendente'), situacao('pago', 'aprovado'))).toBe(false)
    expect(mesmaSituacao(situacao('aguardando_pagamento', 'pendente'), situacao('aguardando_pagamento', 'pendente', false))).toBe(false)
    const outroCodigo = situacao('aguardando_pagamento', 'pendente')
    outroCodigo.pagamento = { ...outroCodigo.pagamento!, pix: { ...pix, copiaECola: '000201-outro' } }
    expect(mesmaSituacao(situacao('aguardando_pagamento', 'pendente'), outroCodigo)).toBe(false)
  })
})

describe('a hora do vencimento do Pix', () => {
  it('HH:MM na hora de São Paulo', () => {
    expect(horaDeSaoPaulo('2026-11-21T17:32:00.000Z')).toBe('14:32')
    expect(horaDeSaoPaulo('2026-11-22T02:05:00.000Z')).toBe('23:05')
  })
})
