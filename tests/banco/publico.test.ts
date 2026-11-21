import { expect, it } from 'vitest'
import { criarClienteDoCatalogo } from '@/lib/dados/publico'

it('le a loja pela porta, como visitante', async () => {
  const { data, error } = await criarClienteDoCatalogo().from('loja').select('vendas_pausadas')
  expect(error).toBeNull()
  expect(data).toHaveLength(1)
})

it('como visitante, nao le perfil de ninguem', async () => {
  const { data, error } = await criarClienteDoCatalogo().from('perfis').select('nome')
  expect(data).toBeNull()
  expect(error?.code).toBe('42501')
})
