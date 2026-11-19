import { expect, it } from 'vitest'
import { lerComentariosAprovados } from '@/lib/dados/comentarios'

it('le os comentarios aprovados de um sabor sem erro', async () => {
  expect(Array.isArray(await lerComentariosAprovados('prestigio'))).toBe(true)
})
