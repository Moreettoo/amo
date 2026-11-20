'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef } from 'react'

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

/**
 * A verificacao contra robos (Cloudflare Turnstile). Aparece so quando precisa
 * ("interaction-only"); o widget cria, dentro do formulario, o campo
 * cf-turnstile-response, que a acao repassa ao Supabase. O token vale uma vez:
 * cada resposta da acao reinicia o widget.
 */
export function Turnstile({ chave, nonce, reiniciar }: Props) {
  const lugar = useRef<HTMLDivElement>(null)
  const id = useRef<string | null>(null)

  const desenhar = useCallback(() => {
    if (!lugar.current || !window.turnstile || id.current) return
    id.current = window.turnstile.render(lugar.current, { sitekey: chave, appearance: 'interaction-only', language: 'pt-br', theme: 'light' })
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

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" nonce={nonce} strategy="afterInteractive" onLoad={desenhar} />
      <div ref={lugar} className="turnstile" />
    </>
  )
}
