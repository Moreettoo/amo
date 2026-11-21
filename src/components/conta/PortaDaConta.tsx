'use client'

import { useActionState, useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import {
  cadastrar,
  confirmarCadastro,
  entrar,
  reenviarCodigo,
  type RespostaDaConta,
} from '@/lib/auth/acoes'
import { mascararCelular } from '@/lib/pedido'
import { Campo, CampoSenha, Envio, ErroGeral, Marcar, erroDe } from '@/components/conta/pecas'
import { Turnstile } from '@/components/conta/Turnstile'

type Aba = 'entrar' | 'cadastro'
type Props = {
  aba: Aba
  volta: string
  chaveDoTurnstile: string
  nonce: string
  /**
   * As abas sao a pagina aberta (/entrar e /cadastro): a atual leva
   * aria-current="page". Dentro de outra pagina (a sacola) elas so trocam o
   * formulario no lugar, e a atual se marca so no desenho.
   */
  abasDaPagina?: boolean
}
type Verificacao = { chave: string; nonce: string }

/**
 * As duas portas: Entrar e Criar conta numa coluna so, com o coracao pousado
 * no fio embaixo da aba atual. Com JavaScript a troca de aba nao recarrega e
 * leva o e-mail digitado; sem ele, as abas sao links para /entrar e /cadastro.
 */
export function PortaDaConta({ aba: inicial, volta, chaveDoTurnstile, nonce, abasDaPagina = true }: Props) {
  const [aba, setAba] = useState<Aba>(inicial)
  const [email, setEmail] = useState('')
  const [codigoPara, setCodigoPara] = useState<string | null>(null)
  // de entrar com o e-mail nao confirmado, o codigo ainda nao saiu
  const [enviarCodigo, setEnviarCodigo] = useState(false)
  const verificacao = { chave: chaveDoTurnstile, nonce }
  const destino = (a: Aba) => `/${a}?volta=${encodeURIComponent(volta)}`
  const marca = (a: Aba) =>
    aba === a ? { className: 'porta__aba--atual', 'aria-current': abasDaPagina ? ('page' as const) : undefined } : {}

  const trocar = (a: Aba) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    // o endereco fica o da pagina: trocado para o da outra aba, o cookie que a
    // acao de cadastro grava fazia o Next montar a outra pagina, e o passo do
    // codigo sumia (ensaio de 2026-11-20). Sem JavaScript as abas sao links.
    setAba(a)
    setCodigoPara(null)
  }
  const pedirCodigo = useCallback((para: string, enviar: boolean) => {
    setAba('cadastro')
    setEmail(para)
    setCodigoPara(para)
    setEnviarCodigo(enviar)
  }, [])

  return (
    <div className="porta">
      <nav className="porta__abas" aria-label="Entrar ou criar conta" style={{ '--lado': aba === 'entrar' ? 0 : 1 } as CSSProperties}>
        <a href={destino('entrar')} {...marca('entrar')} onClick={trocar('entrar')}>
          Entrar
        </a>
        <a href={destino('cadastro')} {...marca('cadastro')} onClick={trocar('cadastro')}>
          Criar conta
        </a>
        <span className="porta__trilho" aria-hidden="true">
          <span className="porta__coracao" />
        </span>
      </nav>

      {aba === 'entrar' ? (
        <FormEntrar email={email} setEmail={setEmail} volta={volta} verificacao={verificacao} aoPedirCodigo={(para) => pedirCodigo(para, true)} />
      ) : codigoPara ? (
        <FormCodigo email={codigoPara} volta={volta} verificacao={verificacao} enviarAoAbrir={enviarCodigo} aoTrocarEmail={() => setCodigoPara(null)} />
      ) : (
        <FormCadastro email={email} setEmail={setEmail} verificacao={verificacao} aoPedirCodigo={(para) => pedirCodigo(para, false)} />
      )}
    </div>
  )
}

type FormProps = {
  email: string
  setEmail: (email: string) => void
  verificacao: Verificacao
  aoPedirCodigo: (email: string) => void
}

/** A acao, e o passo do codigo quando ela pede. */
function useAcaoQuePodePedirCodigo(acao: typeof entrar, aoPedirCodigo: (email: string) => void) {
  return useActionState(async (anterior: RespostaDaConta | null, form: FormData) => {
    const resposta = await acao(anterior, form)
    if (resposta.ok && resposta.passo === 'codigo' && resposta.email) aoPedirCodigo(resposta.email)
    return resposta
  }, null)
}

function FormEntrar({ email, setEmail, volta, verificacao, aoPedirCodigo }: FormProps & { volta: string }) {
  const [resposta, agir, enviando] = useAcaoQuePodePedirCodigo(entrar, aoPedirCodigo)
  return (
    <form action={agir} className="porta__form" noValidate>
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erroDe(resposta, 'email')} />
      <CampoSenha rotulo="Senha" name="senha" autoComplete="current-password" erro={erroDe(resposta, 'senha')} />
      <input type="hidden" name="volta" value={volta} />
      <Envio resposta={resposta} enviando={enviando} rotulo="Entrar" rotuloEnviando="Entrando">
        <Turnstile {...verificacao} reiniciar={resposta} />
      </Envio>
      <p className="conta__nota">
        <a href="/esqueci-a-senha">Esqueci a senha</a>
      </p>
    </form>
  )
}

function FormCadastro({ email, setEmail, verificacao, aoPedirCodigo }: FormProps) {
  const [resposta, agir, enviando] = useAcaoQuePodePedirCodigo(cadastrar, aoPedirCodigo)
  const [celular, setCelular] = useState('')
  return (
    <form action={agir} className="porta__form" noValidate>
      <div className="porta__par">
        <Campo rotulo="Nome" name="nome" autoComplete="name" largura="meio" erro={erroDe(resposta, 'nome')} />
        <Campo
          rotulo="Celular"
          name="celular"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          largura="meio"
          value={celular}
          onChange={(e) => setCelular(mascararCelular(e.target.value))}
          erro={erroDe(resposta, 'celular')}
        />
      </div>
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erroDe(resposta, 'email')} />
      <CampoSenha rotulo="Senha" name="senha" autoComplete="new-password" dica="8 caracteres ou mais." erro={erroDe(resposta, 'senha')} />
      <Marcar nome="termos" erro={erroDe(resposta, 'termos')}>
        Li e aceito os termos de uso e a política de privacidade.
      </Marcar>
      <Marcar nome="novidades">Quero receber novidades e sabores novos por e-mail.</Marcar>
      <Envio resposta={resposta} enviando={enviando} rotulo="Criar conta" rotuloEnviando="Criando a conta">
        <Turnstile {...verificacao} reiniciar={resposta} />
      </Envio>
      <p className="conta__nota">Enviamos um código de 6 dígitos para confirmar o seu e-mail.</p>
    </form>
  )
}

type CodigoProps = { email: string; volta: string; verificacao: Verificacao; enviarAoAbrir: boolean; aoTrocarEmail: () => void }

/**
 * O passo do codigo. Depois de criar a conta o codigo ja saiu. De entrar com
 * o e-mail nao confirmado, ele sai ao abrir, pelo mesmo caminho do "Reenviar
 * codigo" (o mesmo limite, e um token novo do Turnstile: o do login ja foi
 * gasto); a tela so diz que enviou depois que enviou.
 */
function FormCodigo({ email, volta, verificacao, enviarAoAbrir, aoTrocarEmail }: CodigoProps) {
  const [resposta, agir, enviando] = useActionState(confirmarCadastro, null)
  const [enviados, setEnviados] = useState(enviarAoAbrir ? 0 : 1)
  const [reenvio, reenviar, reenviando] = useActionState(async (anterior: RespostaDaConta | null, form: FormData) => {
    const r = await reenviarCodigo(anterior, form)
    if (r.ok) setEnviados((n) => n + 1)
    return r
  }, null)
  const formDoReenvio = useRef<HTMLFormElement>(null)
  const pediu = useRef(false)
  useEffect(() => {
    if (!enviarAoAbrir || pediu.current) return
    pediu.current = true
    formDoReenvio.current?.requestSubmit()
  }, [enviarAoAbrir])
  const jaEnviou = enviados > 0
  return (
    <div className="porta__codigo">
      <p className="conta__texto">
        {jaEnviou ? 'Enviamos um código de 6 dígitos para ' : 'Falta confirmar o e-mail '}
        <b>{email}</b>.
      </p>
      <form action={agir} className="porta__form" noValidate>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="volta" value={volta} />
        <Campo rotulo="Código" name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={9} largura="meio" erro={erroDe(resposta, 'codigo')} />
        <Envio resposta={resposta} enviando={enviando} rotulo="Confirmar" rotuloEnviando="Conferindo o código" />
      </form>
      <form ref={formDoReenvio} action={reenviar} className="porta__reenviar" noValidate>
        <input type="hidden" name="email" value={email} />
        <div className="conta__acoes">
          <button type="submit" className="conta__texto-botao" disabled={reenviando}>
            {jaEnviou ? (reenviando ? 'Reenviando' : 'Reenviar código') : reenviando ? 'Enviando' : 'Enviar código'}
          </button>
          <button type="button" className="conta__texto-botao" onClick={aoTrocarEmail}>
            Usar outro e-mail
          </button>
        </div>
        <Turnstile {...verificacao} reiniciar={reenvio} />
        <ErroGeral resposta={reenvio} />
        <p className="conta__nota" aria-live="polite">
          {reenvio?.ok && reenvio.aviso === 'codigo_reenviado' && enviados > 1 ? 'Enviamos outro código.' : ''}
        </p>
      </form>
    </div>
  )
}
