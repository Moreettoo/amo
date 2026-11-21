import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * A verificacao contra robos segura o envio que chega antes do token
 * (autopreenchimento e clique imediato): nada vai ao servidor, a tela diz que
 * falta um instante, e o envio segue sozinho quando o token chega. O widget
 * da Cloudflare e trocado por um falso que faz o que o de verdade faz: cria o
 * campo cf-turnstile-response dentro do lugar e chama o callback com o token.
 */

const trocarSenha = vi.fn(async () => ({ ok: true }) as unknown)
vi.mock('@/app/conta/acoes', () => ({
  salvarPerfil: vi.fn(),
  definirMarketing: vi.fn(),
  salvarEndereco: vi.fn(),
  removerEndereco: vi.fn(),
  tornarPrincipal: vi.fn(),
  consultarCep: vi.fn(),
  trocarSenha,
  trocarEmail: vi.fn(),
  cancelarPedido: vi.fn(),
}))

const { FALTA_UM_INSTANTE, Turnstile } = await import('@/components/conta/Turnstile')
const { FormSenha } = await import('@/components/conta/FormsDaConta')

type Opcoes = { callback?: (token: string) => void }
let opcoes: Opcoes = {}
let lugarDoWidget: HTMLElement | null = null
const api = {
  render: vi.fn((lugar: HTMLElement, o: Opcoes) => {
    lugarDoWidget = lugar
    opcoes = o
    const campo = document.createElement('input')
    campo.type = 'hidden'
    campo.name = 'cf-turnstile-response'
    lugar.appendChild(campo)
    return 'widget-1'
  }),
  reset: vi.fn(),
  remove: vi.fn(),
}
/** O widget resolve: poe o token no campo e chama o callback, como o da Cloudflare. */
const resolver = (token: string) =>
  act(async () => {
    lugarDoWidget!.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')!.value = token
    opcoes.callback?.(token)
  })

beforeEach(() => {
  opcoes = {}
  lugarDoWidget = null
  api.render.mockClear()
  trocarSenha.mockClear()
  window.turnstile = api
})
afterEach(() => {
  delete window.turnstile
})

function Formulario({ acao }: { acao: (form: FormData) => Promise<void> }) {
  return (
    <form action={acao} noValidate>
      <input name="email" defaultValue="maria@exemplo.com" />
      <Turnstile chave="chave-de-teste" nonce="nonce-de-teste" reiniciar={null} />
      <button type="submit">Enviar</button>
    </form>
  )
}

describe('o envio antes do token', () => {
  it('espera, diz que falta um instante e nao chama a acao; com o token, segue sozinho', async () => {
    const acao = vi.fn(async (form: FormData) => void form)
    const u = userEvent.setup()
    render(<Formulario acao={acao} />)
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(acao).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(FALTA_UM_INSTANTE)
    await resolver('token-de-teste')
    await vi.waitFor(() => expect(acao).toHaveBeenCalledTimes(1))
    expect(acao.mock.calls[0][0].get('cf-turnstile-response')).toBe('token-de-teste')
    expect(acao.mock.calls[0][0].get('email')).toBe('maria@exemplo.com')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('dois cliques sem token: um envio so, quando o token chega', async () => {
    const acao = vi.fn(async (form: FormData) => void form)
    const u = userEvent.setup()
    render(<Formulario acao={acao} />)
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    await resolver('token-de-teste')
    await vi.waitFor(() => expect(acao).toHaveBeenCalledTimes(1))
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(acao).toHaveBeenCalledTimes(1)
  })

  it('com o token, envia na hora, sem frase', async () => {
    const acao = vi.fn(async (form: FormData) => void form)
    const u = userEvent.setup()
    render(<Formulario acao={acao} />)
    await resolver('token-de-teste')
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    await vi.waitFor(() => expect(acao).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('o token que chega sem envio esperando nao envia nada', async () => {
    const acao = vi.fn(async (form: FormData) => void form)
    render(<Formulario acao={acao} />)
    await resolver('token-de-teste')
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(acao).not.toHaveBeenCalled()
  })

  it('sem o script da Cloudflare, o envio continua esperando: nao gasta tentativa', async () => {
    delete window.turnstile
    const acao = vi.fn(async (form: FormData) => void form)
    const u = userEvent.setup()
    render(<Formulario acao={acao} />)
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(acao).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(FALTA_UM_INSTANTE)
  })

  it('vale para a troca de senha de Minha conta', async () => {
    const u = userEvent.setup()
    render(<FormSenha chave="chave-de-teste" nonce="nonce-de-teste" />)
    await u.type(screen.getByLabelText('Senha atual'), 'senha-atual-123')
    await u.type(screen.getByLabelText('Senha nova'), 'senha-nova-456')
    await u.click(screen.getByRole('button', { name: 'Trocar a senha' }))
    expect(trocarSenha).not.toHaveBeenCalled()
    expect(screen.getByText(FALTA_UM_INSTANTE)).toBeInTheDocument()
    await resolver('token-de-teste')
    await vi.waitFor(() => expect(trocarSenha).toHaveBeenCalledTimes(1))
  })
})
