'use client'

import { useEffect, useState } from 'react'
import { corpoDaPalavra } from '@/lib/vontade'

const SAIDA_MS = 200
const SAIDA_POR_LETRA_MS = 12

function semAnimacao(): boolean {
  return (
    !document.documentElement.classList.contains('js') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * A palavra grande do Hoje o dia pede. Ao trocar, as letras velhas caem e
 * somem; depois as novas sobem uma a uma e o sublinhado se redesenha.
 *
 * `saindo` e derivado (a palavra pedida ainda nao e a exibida), e o unico
 * setState mora no timeout: se a vontade trocar de novo antes da saida
 * terminar, o efeito reinicia o relogio e a troca termina na ultima
 * palavra pedida. O leitor de tela le sempre a palavra pedida, inteira.
 */
export function PalavraTroca({ palavra }: { palavra: string }) {
  const [exibida, setExibida] = useState(palavra)
  const [entrando, setEntrando] = useState(false)
  const saindo = palavra !== exibida

  useEffect(() => {
    if (!saindo) return
    const espera = semAnimacao() ? 0 : SAIDA_MS + exibida.length * SAIDA_POR_LETRA_MS
    const relogio = window.setTimeout(() => {
      setExibida(palavra)
      setEntrando(true)
    }, espera)
    return () => window.clearTimeout(relogio)
  }, [saindo, palavra, exibida])

  const estado = saindo ? 'sai' : entrando ? 'entra' : ''
  const passo = saindo ? 0.012 : 0.028
  const letras = Array.from(exibida)

  return (
    <p className="palavra" style={{ fontSize: corpoDaPalavra(letras.length) }}>
      <span className="sr-only">{palavra}</span>
      <span key={`${exibida}:${estado}`} aria-hidden="true">
        {letras.map((letra, i) => (
          <span
            key={i}
            className={`palavra__letra${estado ? ` ${estado}` : ''}`}
            style={estado ? { animationDelay: `${(i * passo).toFixed(3)}s` } : undefined}
          >
            {letra === ' ' ? ' ' : letra}
          </span>
        ))}
      </span>
      <svg
        key={`traco:${exibida}`}
        className={`palavra__traco${entrando ? ' desenha' : ''}`}
        viewBox="0 0 300 16"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path pathLength={1} d="M3,10 C60,3 110,14 170,7 C215,2 260,12 297,5" />
      </svg>
    </p>
  )
}
