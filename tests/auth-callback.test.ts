// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const verifyOtp = vi.fn(async () => ({ data: {}, error: null as unknown }))
vi.mock('@/lib/auth/servidor', () => ({ criarClienteServidor: async () => ({ auth: { verifyOtp } }) }))
const { GET } = await import('@/app/auth/callback/route')

const destino = async (consulta: string) => {
  const url = new URL((await GET(new NextRequest(`http://localhost/auth/callback?${consulta}`))).headers.get('location')!)
  return url.pathname + url.search
}

beforeEach(() => {
  verifyOtp.mockClear()
  verifyOtp.mockResolvedValue({ data: {}, error: null })
})

it('troca de e-mail confirmada vai para o perfil', async () => {
  expect(await destino('type=email_change&token_hash=abcdef0123456789')).toBe('/conta/perfil?aviso=email-trocado')
  expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abcdef0123456789', type: 'email_change' })
})

it.each([
  'type=recovery&token_hash=abcdef0123456789',
  'type=signup&token_hash=abcdef0123456789',
  'type=email_change&token_hash=curto',
  'type=email_change&token_hash=%3Cscript%3E0123456789',
])('%s vai para entrar, sem chamar o Supabase', async (consulta) => {
  expect(await destino(consulta)).toBe('/entrar?aviso=link-invalido')
  expect(verifyOtp).not.toHaveBeenCalled()
})

it('link vencido vai para entrar', async () => {
  verifyOtp.mockResolvedValue({ data: {}, error: { code: 'otp_expired' } })
  expect(await destino('type=email_change&token_hash=abcdef0123456789')).toBe('/entrar?aviso=link-invalido')
})
