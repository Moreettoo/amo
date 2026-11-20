'use client'

import { useActionState, useState } from 'react'
import { pedirCodigoDeSenha, trocarSenhaComCodigo, type RespostaDaConta } from '@/lib/auth/acoes'
import { Campo, CampoSenha, Enviar, ErroGeral, erroDe } from '@/components/conta/pecas'
import { Turnstile } from '@/components/conta/Turnstile'

/**
 * Recuperar a senha em dois passos sobre o fio, com o coracao no atual: o
 * e-mail, depois o codigo e a senha nova. O e-mail passa de um passo ao outro
 * dentro da pagina, nunca na URL.
 */
export function FormEsqueci({ chaveDoTurnstile, nonce }: { chaveDoTurnstile: string; nonce: string }) {
  const [passo, setPasso] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [pedido, pedir, pedindo] = useActionState(async (anterior: RespostaDaConta | null, form: FormData) => {
    const resposta = await pedirCodigoDeSenha(anterior, form)
    if (resposta.ok) setPasso(2)
    return resposta
  }, null)
  const [troca, trocar, trocando] = useActionState(trocarSenhaComCodigo, null)

  return (
    <ol className="passos">
      <li className={passo === 1 ? 'passo passo--atual' : 'passo'}>
        <h2 className="passo__nome">1. Seu e-mail</h2>
        {passo === 1 ? (
          <form action={pedir} className="porta__form" noValidate>
            <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erroDe(pedido, 'email')} />
            <Turnstile chave={chaveDoTurnstile} nonce={nonce} reiniciar={pedido} />
            <ErroGeral resposta={pedido} />
            <Enviar enviando={pedindo} rotulo="Enviar o código" rotuloEnviando="Enviando o código" />
            <p className="conta__nota">
              <button type="button" className="conta__texto-botao" onClick={() => setPasso(2)}>
                Já tenho o código
              </button>
            </p>
          </form>
        ) : (
          <p className="passo__dica">{email || 'O e-mail da sua conta.'}</p>
        )}
      </li>
      <li className={passo === 2 ? 'passo passo--atual' : 'passo'}>
        <h2 className="passo__nome">2. Código e senha nova</h2>
        {passo === 2 ? (
          <form action={trocar} className="porta__form" noValidate>
            {pedido?.ok ? <p className="conta__texto">Se houver conta com esse e-mail, enviamos um código.</p> : null}
            <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erroDe(troca, 'email')} />
            <Campo rotulo="Código" name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={9} largura="meio" erro={erroDe(troca, 'codigo')} />
            <CampoSenha rotulo="Senha nova" name="senha" autoComplete="new-password" dica="8 caracteres ou mais." erro={erroDe(troca, 'senha')} />
            <ErroGeral resposta={troca} />
            <Enviar enviando={trocando} rotulo="Trocar a senha" rotuloEnviando="Trocando a senha" />
          </form>
        ) : (
          <p className="passo__dica">O código que chega no e-mail e a senha nova.</p>
        )}
      </li>
    </ol>
  )
}
