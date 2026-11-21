import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'

const usuario = { id: 'usuario-1', email: 'maria@exemplo.com', nome: 'Maria', celular: '11987654321' }
let logada = false
vi.mock('@/lib/auth', () => ({
  obterUsuario: async () => (logada ? usuario : null),
  exigirUsuario: async () => usuario,
}))
type Resposta = Record<string, unknown> | null
const respostas: Record<string, Resposta> = {}
const acao = (nome: string) =>
  vi.fn(async () => {
    await new Promise((r) => setTimeout(r, 5))
    return respostas[nome] ?? { ok: true }
  })
const acoes = {
  entrar: acao('entrar'), cadastrar: acao('cadastrar'), confirmarCadastro: acao('confirmarCadastro'), reenviarCodigo: acao('reenviarCodigo'),
  pedirCodigoDeSenha: acao('pedirCodigoDeSenha'), trocarSenhaComCodigo: acao('trocarSenhaComCodigo'), excluirConta: acao('excluirConta'),
}
vi.mock('@/lib/auth/acoes', () => acoes)
const rpc = vi.fn(async () => ({ data: [{ pode: true, motivo: null as string | null }], error: null }))
vi.mock('@/lib/auth/servidor', () => ({ criarClienteServidor: async () => ({ rpc }) }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-nonce': 'nonce-de-teste' }) }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECIONOU ${url}`)
  },
}))
const reinicios: unknown[] = []
vi.mock('@/components/conta/Turnstile', () => ({
  Turnstile: ({ reiniciar }: { reiniciar: unknown }) => {
    reinicios.push(reiniciar)
    return <input type="hidden" name="cf-turnstile-response" value="tok" readOnly />
  },
}))

const { default: PaginaEntrar } = await import('@/app/entrar/page')
const { default: PaginaCadastro } = await import('@/app/cadastro/page')
const { default: PaginaEsqueci } = await import('@/app/esqueci-a-senha/page')
const { default: PaginaExcluir } = await import('@/app/conta/excluir/page')
const { default: PaginaExcluida } = await import('@/app/conta/excluida/page')

const sp = (volta?: string) => ({ searchParams: Promise.resolve(volta ? { volta } : {}) })
const principal = () => screen.getByRole('main')

beforeEach(() => {
  logada = false
  reinicios.length = 0
  for (const k of Object.keys(respostas)) delete respostas[k]
  for (const f of Object.values(acoes)) f.mockClear()
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '1x00000000000000000000AA')
  rpc.mockResolvedValue({ data: [{ pode: true, motivo: null }], error: null })
})

describe.each([
  ['/entrar', () => PaginaEntrar(sp())],
  ['/cadastro', () => PaginaCadastro(sp())],
  ['/esqueci-a-senha', () => PaginaEsqueci()],
  ['/conta/excluir', () => PaginaExcluir()],
  ['/conta/excluida', () => PaginaExcluida()],
])('%s', (_, montar) => {
  it('um h1, sem pular nivel, campos com rotulo, sem reticencias, axe limpo', async () => {
    const { container } = render(await montar())
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const niveis = [...container.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]))
    for (let i = 1; i < niveis.length; i++) expect(niveis[i] - niveis[i - 1]).toBeLessThanOrEqual(1)
    for (const campo of principal().querySelectorAll('input:not([type=hidden])')) expect((campo as HTMLInputElement).labels?.length).toBeGreaterThan(0)
    expect(principal().textContent).not.toMatch(/\.\.\.|…/)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('as duas portas', () => {
  it('ja logada, /entrar vai direto para o destino', async () => {
    logada = true
    await expect(PaginaEntrar(sp('/sacola'))).rejects.toThrow('REDIRECIONOU /sacola')
  })
  it('ja logada, /cadastro com destino de fora vai para /conta', async () => {
    logada = true
    await expect(PaginaCadastro(sp('//mal.com'))).rejects.toThrow('REDIRECIONOU /conta')
  })
  it('as abas sao links com a volta, e a atual e marcada', async () => {
    render(await PaginaEntrar(sp('/sacola')))
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar?volta=%2Fsacola')
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro?volta=%2Fsacola')
  })
  it('trocar de aba nao recarrega e leva o e-mail', async () => {
    const u = userEvent.setup()
    render(await PaginaEntrar(sp()))
    await u.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await u.click(screen.getByRole('link', { name: 'Criar conta' }))
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria@exemplo.com')
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('aria-current', 'page')
  })
  it('trocar de aba nao troca o endereco: a resposta da acao volta para a mesma pagina', async () => {
    // com o endereco trocado para /cadastro, o cookie que a acao de cadastro
    // grava fazia o Next montar a outra pagina e o passo do codigo sumia
    // (ensaio de 2026-11-20)
    const trocar = vi.spyOn(window.history, 'replaceState')
    const u = userEvent.setup()
    render(await PaginaEntrar(sp()))
    await u.click(screen.getByRole('link', { name: 'Criar conta' }))
    expect(trocar).not.toHaveBeenCalled()
    trocar.mockRestore()
  })
  it('depois de criar a conta, o passo do codigo', async () => {
    respostas.cadastrar = { ok: true, passo: 'codigo', email: 'maria@exemplo.com' }
    const u = userEvent.setup()
    render(await PaginaCadastro(sp()))
    await u.click(screen.getByRole('button', { name: 'Criar conta' }))
    const codigo = await screen.findByLabelText('Código')
    expect(codigo).toHaveAttribute('autocomplete', 'one-time-code')
    expect(principal()).toHaveTextContent('maria@exemplo.com')
  })
  it('senha errada: a frase da tela, o e-mail continua no campo', async () => {
    respostas.entrar = { ok: false, erro: 'credenciais' }
    const u = userEvent.setup()
    render(await PaginaEntrar(sp()))
    await u.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await u.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha não conferem.')
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria@exemplo.com')
  })
  it('erro de campo fica embaixo do campo, ligado a ele', async () => {
    respostas.cadastrar = { ok: false, erro: 'campos_invalidos', campos: { celular: 'Confira o celular.' } }
    const u = userEvent.setup()
    render(await PaginaCadastro(sp()))
    await u.click(screen.getByRole('button', { name: 'Criar conta' }))
    const celular = screen.getByLabelText('Celular')
    await vi.waitFor(() => expect(celular).toHaveAttribute('aria-invalid', 'true'))
    expect(document.getElementById(celular.getAttribute('aria-describedby')!)).toHaveTextContent('Confira o celular.')
  })
  it('CAPTCHA recusado: a frase e o widget reinicia', async () => {
    respostas.entrar = { ok: false, erro: 'captcha' }
    const u = userEvent.setup()
    render(await PaginaEntrar(sp()))
    const antes = reinicios.at(-1)
    await u.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('robô')
    expect(reinicios.at(-1)).not.toBe(antes)
  })
  it('CAPTCHA recusado no cadastro: o que foi digitado continua', async () => {
    respostas.cadastrar = { ok: false, erro: 'captcha' }
    const u = userEvent.setup()
    render(await PaginaCadastro(sp()))
    await u.type(screen.getByLabelText('Nome'), 'Maria')
    await u.type(screen.getByLabelText('Senha'), 'segredo-123')
    await u.click(screen.getByLabelText(/Li e aceito/))
    await u.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('robô')
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(screen.getByLabelText('Nome')).toHaveValue('Maria')
    expect(screen.getByLabelText('Senha')).toHaveValue('segredo-123')
    expect(screen.getByLabelText(/Li e aceito/)).toBeChecked()
  })
  it('enviando, o botao fica desabilitado', async () => {
    // a acao so responde quando o teste solta: o botao e conferido no meio do envio
    let soltar = () => {}
    acoes.entrar.mockImplementationOnce(() => new Promise((r) => (soltar = () => r({ ok: false, erro: 'credenciais' }))))
    const u = userEvent.setup()
    render(await PaginaEntrar(sp()))
    await u.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('button', { name: 'Entrando' })).toBeDisabled()
    await act(async () => soltar())
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeEnabled()
  })
  it('mostrar a senha', async () => {
    const u = userEvent.setup()
    render(await PaginaEntrar(sp()))
    await u.click(screen.getByRole('button', { name: 'mostrar' }))
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'mostrar' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('entrar com o e-mail ainda nao confirmado', () => {
  const ENVIADO = { ok: true, passo: 'codigo', email: 'maria@exemplo.com', aviso: 'codigo_reenviado' }
  const entrarSemConfirmar = async () => {
    respostas.entrar = { ok: true, passo: 'codigo', email: 'maria@exemplo.com' }
    const u = userEvent.setup()
    render(await PaginaEntrar(sp()))
    await u.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await u.type(screen.getByLabelText('Senha'), 'segredo-123')
    await u.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByLabelText('Código')
    return u
  }
  const formDoReenvio = (i = 0) => (acoes.reenviarCodigo.mock.calls[i] as unknown[])[1] as FormData

  it('o codigo sai de verdade, pelo caminho do reenviar, e so entao a tela diz que enviou', async () => {
    let soltar = () => {}
    acoes.reenviarCodigo.mockImplementationOnce(() => new Promise((r) => (soltar = () => r(ENVIADO))))
    await entrarSemConfirmar()
    await vi.waitFor(() => expect(acoes.reenviarCodigo).toHaveBeenCalledTimes(1))
    expect(formDoReenvio().get('email')).toBe('maria@exemplo.com')
    expect(formDoReenvio().get('cf-turnstile-response')).toBe('tok')
    expect(principal()).not.toHaveTextContent('Enviamos')
    expect(principal()).toHaveTextContent('Falta confirmar o e-mail maria@exemplo.com.')
    await act(async () => soltar())
    expect(await screen.findByText(/Enviamos um código de 6 dígitos para/)).toHaveTextContent('maria@exemplo.com')
    expect(principal()).not.toHaveTextContent('Enviamos outro código.')
    expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeEnabled()
  })

  it.each([
    ['muitas_tentativas', 'Muitas tentativas. Espere um pouco e tente de novo.'],
    ['captcha', 'Não conseguimos confirmar que você não é um robô. Tente de novo.'],
    ['tente_de_novo', 'Não deu certo agora. Tente de novo em instantes.'],
  ])('o envio que falha (%s) diz isso, e a tela nao diz que enviou', async (erro, texto) => {
    respostas.reenviarCodigo = { ok: false, erro, passo: 'codigo', email: 'maria@exemplo.com' }
    await entrarSemConfirmar()
    expect(await screen.findByRole('alert')).toHaveTextContent(texto)
    expect(principal()).not.toHaveTextContent('Enviamos')
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeEnabled()
  })

  it('o reenvio depois do primeiro envio diz que mandou outro', async () => {
    respostas.reenviarCodigo = ENVIADO
    const u = await entrarSemConfirmar()
    await screen.findByText(/Enviamos um código de 6 dígitos para/)
    await u.click(screen.getByRole('button', { name: 'Reenviar código' }))
    expect(await screen.findByText('Enviamos outro código.')).toBeInTheDocument()
    expect(acoes.reenviarCodigo).toHaveBeenCalledTimes(2)
  })

  it('depois de criar a conta o codigo ja saiu: a tela nao pede outro sozinha', async () => {
    respostas.cadastrar = { ok: true, passo: 'codigo', email: 'maria@exemplo.com' }
    const u = userEvent.setup()
    render(await PaginaCadastro(sp()))
    await u.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText(/Enviamos um código de 6 dígitos para/)).toHaveTextContent('maria@exemplo.com')
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(acoes.reenviarCodigo).not.toHaveBeenCalled()
  })
})

describe('esqueci a senha e excluir a conta', () => {
  it('depois do e-mail, o codigo e a senha nova', async () => {
    respostas.pedirCodigoDeSenha = { ok: true, passo: 'senha-nova', email: 'maria@exemplo.com' }
    const u = userEvent.setup()
    render(await PaginaEsqueci())
    await u.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await u.click(screen.getByRole('button', { name: 'Enviar o código' }))
    expect(await screen.findByLabelText('Código')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha nova')).toBeInTheDocument()
  })
  it('com pedido em aberto, nao ha campo de senha', async () => {
    rpc.mockResolvedValue({ data: [{ pode: false, motivo: 'pedido_em_aberto' }], error: null })
    render(await PaginaExcluir())
    expect(principal()).toHaveTextContent('pedido em andamento')
    expect(screen.queryByLabelText('Senha')).toBeNull()
  })
  it('excluida, diz e leva para a home', async () => {
    render(await PaginaExcluida())
    expect(principal()).toHaveTextContent('Sua conta foi excluída.')
    expect(screen.getByRole('link', { name: 'Voltar para a página inicial' })).toHaveAttribute('href', '/')
  })
})
