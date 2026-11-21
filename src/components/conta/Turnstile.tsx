'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef, useState } from 'react'

type ApiDoTurnstile = {
  render: (lugar: HTMLElement, opcoes: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: ApiDoTurnstile
  }
}

type Props = { chave: string; nonce: string; reiniciar: unknown }

/** O que a tela diz a quem envia antes de o widget dar o token. */
export const FALTA_UM_INSTANTE = 'Falta só um instante: estamos confirmando que você não é um robô.'

const temToken = (form: HTMLFormElement) => (form.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value ?? '') !== ''

/**
 * A verificacao contra robos (Cloudflare Turnstile). Aparece so quando precisa
 * ("interaction-only"); o widget cria, dentro do formulario, o campo
 * cf-turnstile-response, que a acao repassa ao Supabase. O token vale uma vez:
 * cada resposta da acao reinicia o widget.
 *
 * O envio que chega antes do token (autopreenchimento e clique imediato) nao
 * sai: falharia no Supabase e gastaria uma tentativa. Ele espera, a linha de
 * baixo diz que falta um instante, e segue sozinho quando o token chega.
 */
export function Turnstile({ chave, nonce, reiniciar }: Props) {
  const lugar = useRef<HTMLDivElement>(null)
  const id = useRef<string | null>(null)
  const esperando = useRef(false)
  const [segurado, setSegurado] = useState(false)

  const desenhar = useCallback(() => {
    if (!lugar.current || !window.turnstile || id.current) return
    id.current = window.turnstile.render(lugar.current, {
      sitekey: chave,
      appearance: 'interaction-only',
      language: 'pt-br',
      theme: 'light',
      callback: () => {
        if (!esperando.current) return
        esperando.current = false
        setSegurado(false)
        // depois do widget terminar de gravar o token no campo
        setTimeout(() => lugar.current?.closest('form')?.requestSubmit(), 0)
      },
    })
  }, [chave])

  useEffect(() => {
    desenhar()
    return () => {
      if (id.current) window.turnstile?.remove(id.current)
      id.current = null
    }
  }, [desenhar])

  useEffect(() => {
    if (id.current) window.turnstile?.reset(id.current)
  }, [reiniciar])

  // no proprio formulario, antes do React: o envio sem token nem chega a acao
  useEffect(() => {
    const form = lugar.current?.closest('form')
    if (!form) return
    const aoEnviar = (evento: SubmitEvent) => {
      if (temToken(form)) return
      evento.preventDefault()
      esperando.current = true
      setSegurado(true)
    }
    form.addEventListener('submit', aoEnviar)
    return () => form.removeEventListener('submit', aoEnviar)
  }, [])

  return (
    <div className="turnstile">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" nonce={nonce} strategy="afterInteractive" onLoad={desenhar} />
      <div ref={lugar} />
      <p className="turnstile__espera" role="status">
        {segurado ? FALTA_UM_INSTANTE : ''}
      </p>
    </div>
  )
}
