import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { conferirAssinatura } from '@/lib/mercadopago/assinatura'

const SEGREDO = 'segredo-de-teste'
const AGORA = 1_800_000_000_000
const REQ = 'req-123'

function hmac(texto: string, segredo = SEGREDO) {
  return createHmac('sha256', segredo).update(texto).digest('hex')
}

function montar(opts: { dataId?: string | null; requestId?: string | null; ts?: string; segredo?: string }) {
  const ts = opts.ts ?? String(AGORA)
  let texto = ''
  if (opts.dataId) texto += `id:${opts.dataId};`
  if (opts.requestId) texto += `request-id:${opts.requestId};`
  texto += `ts:${ts};`
  return `ts=${ts},v1=${hmac(texto, opts.segredo)}`
}

function base(over: Partial<Parameters<typeof conferirAssinatura>[0]> = {}) {
  return {
    assinatura: montar({ dataId: 'ord01abc', requestId: REQ }),
    requestId: REQ,
    dataId: 'ORD01ABC',
    segredo: SEGREDO,
    agora: AGORA,
    ...over,
  }
}

describe('conferirAssinatura', () => {
  it('aceita o dataId assinado em minusculas', () => {
    expect(conferirAssinatura(base())).toBe(true)
  })
  it('aceita o dataId assinado como veio', () => {
    expect(conferirAssinatura(base({ assinatura: montar({ dataId: 'ORD01ABC', requestId: REQ }) }))).toBe(true)
  })
  it('recusa segredo errado, dataId e requestId trocados', () => {
    expect(conferirAssinatura(base({ segredo: 'outro' }))).toBe(false)
    expect(conferirAssinatura(base({ dataId: 'OUTRO' }))).toBe(false)
    expect(conferirAssinatura(base({ requestId: 'req-999' }))).toBe(false)
  })
  it('recusa v1 com um caractere a mais, sem lancar', () => {
    const a = montar({ dataId: 'ord01abc', requestId: REQ })
    expect(conferirAssinatura(base({ assinatura: a + 'a' }))).toBe(false)
    expect(conferirAssinatura(base({ assinatura: a.slice(0, -1) }))).toBe(false)
    expect(conferirAssinatura(base({ assinatura: `ts=${AGORA},v1=zz${'0'.repeat(62)}` }))).toBe(false)
  })
  it('recusa cabecalho sem v1, sem ts, vazio, null ou lixo', () => {
    expect(conferirAssinatura(base({ assinatura: `ts=${AGORA}` }))).toBe(false)
    expect(conferirAssinatura(base({ assinatura: `v1=${'a'.repeat(64)}` }))).toBe(false)
    expect(conferirAssinatura(base({ assinatura: '' }))).toBe(false)
    expect(conferirAssinatura(base({ assinatura: null }))).toBe(false)
    expect(conferirAssinatura(base({ assinatura: ',,=,x' }))).toBe(false)
  })
  it('recusa ts de 2 horas atras e de 10 min no futuro', () => {
    const velho = String(AGORA - 2 * 3600_000)
    const futuro = String(AGORA + 10 * 60_000)
    expect(conferirAssinatura(base({ assinatura: montar({ dataId: 'ord01abc', requestId: REQ, ts: velho }) }))).toBe(false)
    expect(conferirAssinatura(base({ assinatura: montar({ dataId: 'ord01abc', requestId: REQ, ts: futuro }) }))).toBe(false)
  })
  it('aceita ts em segundos', () => {
    const ts = String(Math.floor(AGORA / 1000))
    expect(conferirAssinatura(base({ assinatura: montar({ dataId: 'ord01abc', requestId: REQ, ts }) }))).toBe(true)
  })
  it('sem dataId, o texto sai sem a parte id', () => {
    expect(conferirAssinatura(base({ dataId: null, assinatura: montar({ requestId: REQ }) }))).toBe(true)
  })
})
