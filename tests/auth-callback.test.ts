// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * O link do e-mail de troca de endereco. Com "Secure email change", a troca
 * so vale depois dos dois links (o do e-mail atual e o do novo): o primeiro
 * diz que falta o outro; o segundo, que trocou. O sinal e o do proprio
 * verify: o primeiro link nao abre sessao, o ultimo abre. Vale com e sem a
 * sessao no cookie (o link aberto no celular, ou no navegador do app de
 * e-mail, chega sem ela).
 */

type Verificado = { data: { user: unknown; session: unknown }; error: unknown }
const SEM_SESSAO: Verificado = { data: { user: null, session: null }, error: null }
const COM_SESSAO: Verificado = { data: { user: { email: 'nova@exemplo.com' }, session: { access_token: 'token-de-teste' } }, error: null }
const verifyOtp = vi.fn(async (): Promise<Verificado> => SEM_SESSAO)
const getUser = vi.fn(async () => ({ data: { user: null as unknown }, error: null as unknown }))
vi.mock('@/lib/auth/servidor', () => ({ criarClienteServidor: async () => ({ auth: { verifyOtp, getUser } }) }))
const { GET } = await import('@/app/auth/callback/route')

const destino = async (consulta: string) => {
  const resposta = await GET(new NextRequest(`http://localhost:3000/auth/callback?${consulta}`))
  const url = new URL(resposta.headers.get('location')!)
  return `${url.pathname}${url.search}`
}

const ACESSO = '/conta/perfil/email-e-senha'
const LINK = 'type=email_change&token_hash=abcdef0123456789'

beforeEach(() => {
  verifyOtp.mockClear()
  verifyOtp.mockResolvedValue(SEM_SESSAO)
  getUser.mockResolvedValue({ data: { user: null }, error: null })
})

it('o ultimo link: o verify abre a sessao, a troca vale, e a tela diz isso', async () => {
  verifyOtp.mockResolvedValueOnce(COM_SESSAO)
  expect(await destino(LINK)).toBe(`${ACESSO}?aviso=email-trocado`)
  expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abcdef0123456789', type: 'email_change' })
})

it('so o primeiro link, num navegador sem sessao: falta confirmar no outro e-mail', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400 } })
  expect(await destino(LINK)).toBe(`${ACESSO}?aviso=falta-o-outro-email`)
})

it('so o primeiro link, logada: falta confirmar no outro e-mail', async () => {
  getUser.mockResolvedValue({ data: { user: { email: 'antiga@exemplo.com', new_email: 'nova@exemplo.com' } }, error: null })
  expect(await destino(LINK)).toBe(`${ACESSO}?aviso=falta-o-outro-email`)
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
  verifyOtp.mockResolvedValueOnce({ data: { user: null, session: null }, error: { code: 'otp_expired' } })
  expect(await destino(LINK)).toBe(`${ACESSO}?aviso=link-invalido`)
})
