import { vi } from 'vitest'

// Os testes de banco falam com o Supabase de desenvolvimento: as chaves e a
// porta vem do .env.local, como no site.
process.loadEnvFile('.env.local')

// Fora do Next nao ha cookies() nem headers(): cada teste usa um pote em
// memoria, um por "navegador" (trocarNavegador), e um IP fixo.
type Cookie = { name: string; value: string; options?: Record<string, unknown> }
const potes = new Map<string, Map<string, Cookie>>()
let atual = 'principal'
const pote = () => {
  if (!potes.has(atual)) potes.set(atual, new Map())
  return potes.get(atual)!
}
export const trocarNavegador = (nome: string) => {
  atual = nome
}
export const cookiesDoNavegador = (nome = atual) => [...(potes.get(nome) ?? new Map()).values()]

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [...pote().values()].map(({ name, value }) => ({ name, value })),
    get: (name: string) => pote().get(name),
    set: (name: string, value: string, options?: Record<string, unknown>) => pote().set(name, { name, value, options }),
    delete: (name: string) => pote().delete(name),
  }),
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7' }),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECIONOU ${url}`)
  },
}))
