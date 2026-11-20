import { expect, it } from 'vitest'
import { consumirLimite } from '@/lib/dados/limites'
import { criarClienteAdmin } from '@/lib/auth/admin'

it('o limite conta e fecha no terceiro', async () => {
  const chave = `ensaio:${crypto.randomUUID()}`
  expect([await consumirLimite(chave, 2, 60), await consumirLimite(chave, 2, 60), await consumirLimite(chave, 2, 60)])
    .toEqual([true, true, false])
})

it('a chave secreta nao le tabela nenhuma', async () => {
  const { data, error } = await criarClienteAdmin().from('perfis').select('id')
  expect(data).toBeNull()
  expect(error?.code).toBe('42501')
})
