// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { comPiso } from '@/lib/auth/tempo'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

/** O instante em que a promessa terminou (bem ou mal), ou null enquanto nao terminou. */
const quandoTermina = (promessa: Promise<unknown>) => {
  let em: number | null = null
  promessa.then(
    () => (em = Date.now()),
    () => (em = Date.now()),
  )
  return () => em
}

it('trabalho rapido espera ate o piso', async () => {
  const inicio = Date.now()
  const fim = quandoTermina(comPiso(1000, async () => 'pronto'))
  await vi.advanceTimersByTimeAsync(999)
  expect(fim()).toBeNull()
  await vi.advanceTimersByTimeAsync(1)
  expect(fim()).toBe(inicio + 1000)
})

it('trabalho lento nao ganha espera a mais', async () => {
  const inicio = Date.now()
  const fim = quandoTermina(comPiso(1000, () => new Promise((r) => setTimeout(r, 1500))))
  await vi.advanceTimersByTimeAsync(1500)
  expect(fim()).toBe(inicio + 1500)
})

it('erro tambem espera o piso e chega a quem chamou', async () => {
  const inicio = Date.now()
  const promessa = comPiso(1000, async () => {
    throw new Error('caiu')
  })
  const fim = quandoTermina(promessa)
  const falha = expect(promessa).rejects.toThrow('caiu')
  await vi.advanceTimersByTimeAsync(1000)
  await falha
  expect(fim()).toBe(inicio + 1000)
})
