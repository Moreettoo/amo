// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HOSTIS } from './fixtures/hostis'

type Resposta = { data: unknown; error: unknown }
const ordem: string[] = []
const fazer = (nome: string) => vi.fn(async (...argumentos: unknown[]): Promise<Resposta> => {
  void argumentos
  ordem.push(nome)
  return { data: {}, error: null }
})
const auth = {
  signInWithPassword: fazer('signInWithPassword'), signUp: fazer('signUp'), verifyOtp: fazer('verifyOtp'),
  resend: fazer('resend'), resetPasswordForEmail: fazer('resetPasswordForEmail'), updateUser: fazer('updateUser'), signOut: fazer('signOut'),
}
const rpc = vi.fn()
vi.mock('@/lib/auth/servidor', () => ({ criarClienteServidor: async () => ({ auth, rpc }) }))
const deleteUser = vi.fn()
vi.mock('@/lib/auth/admin', () => ({ criarClienteAdmin: () => ({ auth: { admin: { deleteUser } } }) }))
const consumirLimite = vi.fn()
vi.mock('@/lib/dados/limites', () => ({ consumirLimite }))
const senhaConfere = vi.fn()
vi.mock('@/lib/auth/senha', () => ({ senhaConfere }))
const apagarCookiesDaSessao = vi.fn()
vi.mock('@/lib/auth/cookies', () => ({ apagarCookiesDaSessao, OPCOES_DO_COOKIE: {} }))
const usuario = { id: 'usuario-1', email: 'maria@exemplo.com', nome: 'Maria', celular: '11987654321' }
let logada = true
vi.mock('@/lib/auth', () => ({
  exigirUsuario: async (volta: string) => {
    if (!logada) throw new Error(`REDIRECIONOU /entrar?volta=${encodeURIComponent(volta)}`)
    return usuario
  },
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '1.2.3.4' }) }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECIONOU ${url}`)
  },
}))

const acoes = await import('@/lib/auth/acoes')
type Acao = (anterior: null, form: FormData) => Promise<unknown>

const form = (campos: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}
const chamar = async (acao: Acao, campos: Record<string, string>): Promise<Record<string, unknown>> => {
  try {
    return (await acao(null, form(campos))) as Record<string, unknown>
  } catch (e) {
    return { lancou: (e as Error).message }
  }
}
const erroDoAuth = (code: string, extra: object = {}): Resposta => ({ data: {}, error: { code, status: 400, message: `texto cru ${code}`, ...extra } })

const CADASTRO = { nome: ' Maria  José ', celular: '(11) 98765-4321', email: 'Maria@Exemplo.com', senha: '12345678', termos: 'on', 'cf-turnstile-response': 'tok' }
const ENTRAR = { email: '  Maria@Exemplo.com ', senha: 'qualquer', volta: '/sacola', 'cf-turnstile-response': 'tok' }
const TROCAR = { email: 'maria@exemplo.com', codigo: '123456', senha: 'senha-nova-1' }
const EXCLUIR = { senha: 'atual', confirmo: 'on', 'cf-turnstile-response': 'tok' }

beforeEach(() => {
  ordem.length = 0
  logada = true
  vi.clearAllMocks()
  for (const [nome, fn] of Object.entries(auth)) {
    fn.mockImplementation(async () => {
      ordem.push(nome)
      return { data: {}, error: null }
    })
  }
  consumirLimite.mockResolvedValue(true)
  senhaConfere.mockResolvedValue(true)
  deleteUser.mockResolvedValue({ data: {}, error: null })
  apagarCookiesDaSessao.mockResolvedValue(undefined)
  rpc.mockResolvedValue({ data: [{ pode: true, motivo: null }], error: null })
})

const TODAS: [string, Acao, Record<string, string>][] = [
  ['entrar', acoes.entrar, ENTRAR],
  ['cadastrar', acoes.cadastrar, CADASTRO],
  ['confirmarCadastro', acoes.confirmarCadastro, { email: 'maria@exemplo.com', codigo: '123456', volta: '/conta' }],
  ['reenviarCodigo', acoes.reenviarCodigo, { email: 'maria@exemplo.com', 'cf-turnstile-response': 'tok' }],
  ['pedirCodigoDeSenha', acoes.pedirCodigoDeSenha, { email: 'maria@exemplo.com', 'cf-turnstile-response': 'tok' }],
  ['trocarSenhaComCodigo', acoes.trocarSenhaComCodigo, TROCAR],
  ['excluirConta', acoes.excluirConta, EXCLUIR],
]
const CHAVES = ['ok', 'passo', 'email', 'aviso', 'erro', 'campos']

describe.each(TODAS)('%s', (_, acao, validos) => {
  it('campo invalido nao gasta limite nem chama o Supabase', async () => {
    const vazios = Object.fromEntries(Object.keys(validos).map((k) => [k, k === 'volta' ? '/conta' : '']))
    expect(await chamar(acao, vazios)).toMatchObject({ ok: false, erro: 'campos_invalidos' })
    expect(consumirLimite).not.toHaveBeenCalled()
    expect(ordem).toEqual([])
  })
  it('limite estourado nao chama o Supabase', async () => {
    consumirLimite.mockResolvedValue(false)
    expect(await chamar(acao, validos)).toMatchObject({ ok: false, erro: 'muitas_tentativas' })
    expect(ordem).toEqual([])
  })
  it('Supabase fora do ar vira tente_de_novo, sem o texto cru', async () => {
    for (const fn of Object.values(auth)) fn.mockRejectedValue(new Error('texto cru do erro'))
    rpc.mockRejectedValue(new Error('texto cru do erro'))
    const r = await chamar(acao, validos)
    expect(r).toMatchObject({ ok: false, erro: 'tente_de_novo' })
    expect(JSON.stringify(r)).not.toContain('texto cru')
  })
  it('so devolve as chaves combinadas', async () => {
    const r = await chamar(acao, validos)
    if (!('lancou' in r)) for (const k of Object.keys(r)) expect(CHAVES).toContain(k)
  })
  it.each(HOSTIS.map((h) => [h.slice(0, 24), h]))('entrada hostil %j em cada campo: nunca excecao solta', async (_, hostil) => {
    for (const campo of Object.keys(validos)) {
      const r = await chamar(acao, { ...validos, [campo]: hostil })
      const lancou = typeof r.lancou === 'string' ? r.lancou : ''
      expect(r.ok === true || r.erro === 'campos_invalidos' || lancou.startsWith('REDIRECIONOU /')).toBe(true)
      expect(lancou).not.toMatch(/^REDIRECIONOU \/\//)
    }
  })
})

describe('entrar', () => {
  it('e-mail aparado e em minusculas, limites por IP e por e-mail, token do CAPTCHA repassado', async () => {
    await chamar(acoes.entrar, ENTRAR)
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'maria@exemplo.com', password: 'qualquer', options: { captchaToken: 'tok' } })
    expect(consumirLimite).toHaveBeenCalledWith('entrar:ip:1.2.3.4', 10, 900)
    expect(consumirLimite).toHaveBeenCalledWith('entrar:email:maria@exemplo.com', 10, 900)
  })
  it.each([['/sacola', '/sacola'], ['//mal.com', '/conta']])('sucesso com volta %j vai para %s', async (volta, destino) => {
    expect(await chamar(acoes.entrar, { ...ENTRAR, volta })).toEqual({ lancou: `REDIRECIONOU ${destino}` })
  })
  it.each([['invalid_credentials', 'credenciais'], ['captcha_failed', 'captcha'], ['over_request_rate_limit', 'muitas_tentativas']])(
    '%s vira %s',
    async (code, erro) => {
      auth.signInWithPassword.mockResolvedValue(erroDoAuth(code))
      expect(await chamar(acoes.entrar, ENTRAR)).toMatchObject({ ok: false, erro })
    },
  )
  it('e-mail nao confirmado leva ao passo do codigo', async () => {
    auth.signInWithPassword.mockResolvedValue(erroDoAuth('email_not_confirmed'))
    expect(await chamar(acoes.entrar, ENTRAR)).toEqual({ ok: true, passo: 'codigo', email: 'maria@exemplo.com' })
  })
})

describe('cadastrar', () => {
  it('sucesso e conta que ja existe dao a mesma resposta', async () => {
    const certo = await chamar(acoes.cadastrar, CADASTRO)
    auth.signUp.mockResolvedValue(erroDoAuth('user_already_exists'))
    expect(await chamar(acoes.cadastrar, CADASTRO)).toEqual(certo)
    expect(certo).toEqual({ ok: true, passo: 'codigo', email: 'maria@exemplo.com' })
  })
  it('manda os metadados que o gatilho do banco confere', async () => {
    await chamar(acoes.cadastrar, CADASTRO)
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'maria@exemplo.com',
      password: '12345678',
      options: {
        captchaToken: 'tok',
        data: { nome: 'Maria José', celular: '11987654321', aceite_termos: true, versao_termos: '2026-11-18', aceite_marketing: false },
      },
    })
    expect(consumirLimite).toHaveBeenCalledWith('cadastrar:ip:1.2.3.4', 5, 3600)
  })
  it('sem aceitar os termos, erro no campo termos', async () => {
    const semTermos: Record<string, string> = { ...CADASTRO }
    delete semTermos.termos
    expect(await chamar(acoes.cadastrar, semTermos)).toMatchObject({ ok: false, erro: 'campos_invalidos', campos: { termos: expect.any(String) } })
  })
  it('senha vazada', async () => {
    auth.signUp.mockResolvedValue(erroDoAuth('weak_password', { reasons: ['pwned'] }))
    expect(await chamar(acoes.cadastrar, CADASTRO)).toMatchObject({ ok: false, erro: 'senha_vazada' })
  })
})

describe('confirmarCadastro', () => {
  it('codigo colado com espaco', async () => {
    await chamar(acoes.confirmarCadastro, { email: 'maria@exemplo.com', codigo: '123 456', volta: '/conta' })
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'maria@exemplo.com', token: '123456', type: 'email' })
    expect(consumirLimite).toHaveBeenCalledWith('confirmar:email:maria@exemplo.com', 10, 3600)
  })
  it('codigo vencido volta ao passo do codigo com o e-mail', async () => {
    auth.verifyOtp.mockResolvedValue(erroDoAuth('otp_expired'))
    expect(await chamar(acoes.confirmarCadastro, { email: 'maria@exemplo.com', codigo: '123456', volta: '/conta' })).toEqual({
      ok: false,
      erro: 'codigo_invalido',
      passo: 'codigo',
      email: 'maria@exemplo.com',
    })
  })
})

describe('pedirCodigoDeSenha', () => {
  it('com e sem conta, a mesma resposta', async () => {
    const certo = await chamar(acoes.pedirCodigoDeSenha, { email: 'maria@exemplo.com', 'cf-turnstile-response': 'tok' })
    auth.resetPasswordForEmail.mockResolvedValue(erroDoAuth('email_address_not_authorized'))
    expect(await chamar(acoes.pedirCodigoDeSenha, { email: 'outra@exemplo.com', 'cf-turnstile-response': 'tok' })).toEqual({
      ...certo,
      email: 'outra@exemplo.com',
    })
    expect(certo).toEqual({ ok: true, passo: 'senha-nova', email: 'maria@exemplo.com' })
  })
})

describe('trocarSenhaComCodigo', () => {
  it('confere o codigo, troca a senha, encerra as outras sessoes e vai para /conta', async () => {
    expect(await chamar(acoes.trocarSenhaComCodigo, TROCAR)).toEqual({ lancou: 'REDIRECIONOU /conta' })
    expect(ordem).toEqual(['verifyOtp', 'updateUser', 'signOut'])
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'maria@exemplo.com', token: '123456', type: 'recovery' })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'others' })
  })
  it('senha igual a atual nao encerra sessao nenhuma', async () => {
    auth.updateUser.mockResolvedValue(erroDoAuth('same_password'))
    expect(await chamar(acoes.trocarSenhaComCodigo, TROCAR)).toMatchObject({ ok: false, erro: 'senha_igual' })
    expect(auth.signOut).not.toHaveBeenCalled()
  })
})

describe('excluirConta', () => {
  it('sem sessao, manda entrar', async () => {
    logada = false
    expect(await chamar(acoes.excluirConta, EXCLUIR)).toEqual({ lancou: 'REDIRECIONOU /entrar?volta=%2Fconta%2Fexcluir' })
  })
  it('com pedido em aberto, nem confere a senha', async () => {
    rpc.mockResolvedValue({ data: [{ pode: false, motivo: 'pedido_em_aberto' }], error: null })
    expect(await chamar(acoes.excluirConta, EXCLUIR)).toMatchObject({ ok: false, erro: 'pedido_em_aberto' })
    expect(senhaConfere).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
  })
  it('senha errada nao apaga', async () => {
    senhaConfere.mockResolvedValue(false)
    expect(await chamar(acoes.excluirConta, EXCLUIR)).toMatchObject({ ok: false, erro: 'credenciais' })
    expect(deleteUser).not.toHaveBeenCalled()
  })
  it('apaga a conta da sessao, os cookies e avisa', async () => {
    expect(await chamar(acoes.excluirConta, EXCLUIR)).toEqual({ ok: true, aviso: 'conta_excluida' })
    expect(senhaConfere).toHaveBeenCalledWith('maria@exemplo.com', 'atual', 'tok')
    expect(deleteUser).toHaveBeenCalledWith('usuario-1')
    expect(apagarCookiesDaSessao).toHaveBeenCalled()
    expect(consumirLimite).toHaveBeenCalledWith('excluir:usuario-1', 3, 3600)
  })
})

describe('sair', () => {
  it('encerra esta sessao e volta para a home', async () => {
    await expect(acoes.sair()).rejects.toThrow('REDIRECIONOU /')
    expect(auth.signOut).toHaveBeenCalledWith()
  })
})
