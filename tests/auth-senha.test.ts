// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/dados/ambiente', () => ({ variavel: (nome: string) => `valor-de-${nome}` }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { signInWithPassword: m.signInWithPassword, signOut: m.signOut } }),
}))

import { senhaConfere } from '@/lib/auth/senha'

describe('senhaConfere', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    m.signOut.mockResolvedValue({ error: null })
  })

  it('com a senha certa, encerra so a sessao do login a parte e devolve true', async () => {
    expect(await senhaConfere('maria@exemplo.com', 'senha-certa', 'tok')).toBe(true)
    expect(m.signInWithPassword).toHaveBeenCalledWith({ email: 'maria@exemplo.com', password: 'senha-certa', options: { captchaToken: 'tok' } })
    expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('se o signOut falhar, ainda devolve true e registra a falha', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    m.signOut.mockResolvedValueOnce({ error: { code: 'unexpected_failure', status: 500, name: 'AuthApiError', message: 'segredo' } })
    expect(await senhaConfere('maria@exemplo.com', 'senha-certa', 'tok')).toBe(true)
    expect(log).toHaveBeenCalledWith('Falha do Supabase', expect.objectContaining({ onde: 'senhaConfere', code: 'unexpected_failure', status: 500 }))
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/segredo/)
    log.mockRestore()
  })

  it('com a senha errada, nao chama signOut e devolve o codigo', async () => {
    m.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { code: 'invalid_credentials', status: 400, name: 'AuthApiError' } })
    expect(await senhaConfere('maria@exemplo.com', 'errada', 'tok')).toBe('credenciais')
    expect(m.signOut).not.toHaveBeenCalled()
  })
})
