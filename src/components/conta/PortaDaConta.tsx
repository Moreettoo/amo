'use client'

import { useActionState, useCallback, useState, type CSSProperties, type MouseEvent } from 'react'
import {
  cadastrar,
  confirmarCadastro,
  entrar,
  reenviarCodigo,
  type RespostaDaConta,
} from '@/lib/auth/acoes'
import { mascararCelular } from '@/lib/pedido'
import { Campo, CampoSenha, Enviar, ErroGeral, Marcar, erroDe } from '@/components/conta/pecas'
import { Turnstile } from '@/components/conta/Turnstile'

type Aba = 'entrar' | 'cadastro'
type Props = { aba: Aba; volta: string; chaveDoTurnstile: string; nonce: string }
type Verificacao = { chave: string; nonce: string }

/**
 * As duas portas: Entrar e Criar conta numa coluna so, com o coracao pousado
 * no fio embaixo da aba atual. Com JavaScript a troca de aba nao recarrega e
 * leva o e-mail digitado; sem ele, as abas sao links para /entrar e /cadastro.
 */
export function PortaDaConta({ aba: inicial, volta, chaveDoTurnstile, nonce }: Props) {
  const [aba, setAba] = useState<Aba>(inicial)
  const [email, setEmail] = useState('')
  const [codigoPara, setCodigoPara] = useState<string | null>(null)
  const verificacao = { chave: chaveDoTurnstile, nonce }
  const destino = (a: Aba) => `/${a}?volta=${encodeURIComponent(volta)}`

  const trocar = (a: Aba) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setAba(a)
    setCodigoPara(null)
    window.history.replaceState(null, '', destino(a))
  }
  const pedirCodigo = useCallback((para: string) => {
    setAba('cadastro')
    setEmail(para)
    setCodigoPara(para)
  }, [])

  return (
    <div className="porta">
      <nav className="porta__abas" aria-label="Entrar ou criar conta" style={{ '--lado': aba === 'entrar' ? 0 : 1 } as CSSProperties}>
        <a href={destino('entrar')} aria-current={aba === 'entrar' ? 'page' : undefined} onClick={trocar('entrar')}>
          Entrar
        </a>
        <a href={destino('cadastro')} aria-current={aba === 'cadastro' ? 'page' : undefined} onClick={trocar('cadastro')}>
          Criar conta
        </a>
        <span className="porta__trilho" aria-hidden="true">
          <span className="porta__coracao" />
        </span>
      </nav>

      {aba === 'entrar' ? (
        <FormEntrar email={email} setEmail={setEmail} volta={volta} verificacao={verificacao} aoPedirCodigo={pedirCodigo} />
      ) : codigoPara ? (
        <FormCodigo email={codigoPara} volta={volta} verificacao={verificacao} aoTrocarEmail={() => setCodigoPara(null)} />
      ) : (
        <FormCadastro email={email} setEmail={setEmail} verificacao={verificacao} aoPedirCodigo={pedirCodigo} />
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
      <Turnstile {...verificacao} reiniciar={resposta} />
      <ErroGeral resposta={resposta} />
      <Enviar enviando={enviando} rotulo="Entrar" rotuloEnviando="Entrando" />
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
      <Turnstile {...verificacao} reiniciar={resposta} />
      <ErroGeral resposta={resposta} />
      <Enviar enviando={enviando} rotulo="Criar conta" rotuloEnviando="Criando a conta" />
      <p className="conta__nota">Enviamos um código de 6 dígitos para confirmar o seu e-mail.</p>
    </form>
  )
}

function FormCodigo({ email, volta, verificacao, aoTrocarEmail }: { email: string; volta: string; verificacao: Verificacao; aoTrocarEmail: () => void }) {
  const [resposta, agir, enviando] = useActionState(confirmarCadastro, null)
  const [reenvio, reenviar, reenviando] = useActionState(reenviarCodigo, null)
  return (
    <div className="porta__codigo">
      <p className="conta__texto">
        Enviamos um código de 6 dígitos para <b>{email}</b>.
      </p>
      <form action={agir} className="porta__form" noValidate>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="volta" value={volta} />
        <Campo rotulo="Código" name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={9} largura="meio" erro={erroDe(resposta, 'codigo')} />
        <ErroGeral resposta={resposta} />
        <Enviar enviando={enviando} rotulo="Confirmar" rotuloEnviando="Conferindo o código" />
      </form>
      <form action={reenviar} className="porta__reenviar" noValidate>
        <input type="hidden" name="email" value={email} />
        <Turnstile {...verificacao} reiniciar={reenvio} />
        <ErroGeral resposta={reenvio} />
        <p className="conta__nota" aria-live="polite">
          {reenvio?.ok && reenvio.aviso === 'codigo_reenviado' ? 'Enviamos outro código.' : ''}
        </p>
        <div className="conta__acoes">
          <button type="submit" className="conta__texto-botao" disabled={reenviando}>
            {reenviando ? 'Reenviando' : 'Reenviar código'}
          </button>
          <button type="button" className="conta__texto-botao" onClick={aoTrocarEmail}>
            Usar outro e-mail
          </button>
        </div>
      </form>
    </div>
  )
}
