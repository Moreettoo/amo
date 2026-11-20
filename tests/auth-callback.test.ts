// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * O link do e-mail de troca de endereco. Com "Secure email change", a troca
 * so vale depois dos dois links (o do e-mail atual e o do novo): o primeiro
 * diz que falta o outro; o segundo, que trocou.
 */

const verifyOtp = vi.fn(async () => ({ data: {}, error: null as unknown }))
const getUser = vi.fn(async () => ({ data: { user: { email: 'nova@exemplo.com', new_email: null as string | null } }, error: null }))
vi.mock('@/lib/auth/servidor', () => ({ criarClienteServidor: async () => ({ auth: { verifyOtp, getUser } }) }))
const { GET } = await import('@/app/auth/callback/route')

const destino = async (consulta: string) => {
  const resposta = await GET(new NextRequest(`http://localhost:3000/auth/callback?${consulta}`))
  const url = new URL(resposta.headers.get('location')!)
  return `${url.pathname}${url.search}`
}

const ACESSO = '/conta/perfil/email-e-senha'

beforeEach(() => {
  verifyOtp.mockClear()
  verifyOtp.mockResolvedValue({ data: {}, error: null })
  getUser.mockResolvedValue({ data: { user: { email: 'nova@exemplo.com', new_email: null } }, error: null })
})

it('os dois links confirmados: a troca vale, e a tela diz isso', async () => {
  expect(await destino('type=email_change&token_hash=abcdef0123456789')).toBe(`${ACESSO}?aviso=email-trocado`)
  expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abcdef0123456789', type: 'email_change' })
})

it('so o primeiro link: a tela diz que falta confirmar no outro e-mail', async () => {
  getUser.mockResolvedValueOnce({ data: { user: { email: 'antiga@exemplo.com', new_email: 'nova@exemplo.com' } }, error: null })
  expect(await destino('type=email_change&token_hash=abcdef0123456789')).toBe(`${ACESSO}?aviso=falta-o-outro-email`)
})

it.each([
  'type=recovery&token_hash=abcdef0123456789',
  'type=signup&token_hash=abcdef0123456789',
  'type=email_change&token_hash=curto',
  'type=email_change&token_hash=%3Cscript%3E0123456789',
])('%s: link invalido, sem chamar o Supabase', async (consulta) => {
  expect(await destino(consulta)).toBe(`${ACESSO}?aviso=link-invalido`)
  expect(verifyOtp).not.toHaveBeenCalled()
})

it('link vencido ou ja usado: link invalido', async () => {
  verifyOtp.mockResolvedValueOnce({ data: {}, error: { code: 'otp_expired' } })
  expect(await destino('type=email_change&token_hash=abcdef0123456789')).toBe(`${ACESSO}?aviso=link-invalido`)
})
