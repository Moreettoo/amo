// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lerLoja } from '@/lib/dados/loja'

let respostas: Record<string, { corpo: unknown; status: number }>
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemplo.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'chave')
  vi.stubEnv('SUPABASE_PORTA', 'porta')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('fetch', async (entrada: RequestInfo | URL) => {
    const tabela = new URL(String(entrada)).pathname.split('/').pop() as string
    const r = respostas[tabela]
    return new Response(JSON.stringify(r.corpo), { status: r.status, headers: { 'content-type': 'application/json', 'retry-after': '0' } })
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('lerLoja', () => {
  it('devolve os horarios na forma da interface e a pausa', async () => {
    respostas = {
      horarios: { corpo: [{ dia_da_semana: 1, abre: '09:00:00', fecha: '18:00:00' }], status: 200 },
      loja: { corpo: [{ vendas_pausadas: false }], status: 200 },
    }
    expect(await lerLoja()).toEqual({ horarios: [{ dia: 1, abre: '09:00:00', fecha: '18:00:00' }], pausada: false })
  })
  it('sem linha em loja, pausada', async () => {
    respostas = { horarios: { corpo: [], status: 200 }, loja: { corpo: [], status: 200 } }
    expect((await lerLoja()).pausada).toBe(true)
  })
  it('erro HTTP 503 rejeita', async () => {
    respostas = { horarios: { corpo: {}, status: 503 }, loja: { corpo: [], status: 200 } }
    await expect(lerLoja()).rejects.toThrow('Falha no banco (loja): HTTP 503')
  })
})
