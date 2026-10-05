'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Trava com validade.
 *
 * Segura a selecao do Hoje o dia pede enquanto o Lenis rola ate a vontade
 * escolhida, para a palavra nao passar pelas vontades do meio. Solta pelo
 * aviso de fim da rolagem, e solta sozinha depois de `validadeMs`, porque o
 * Lenis nao chama o onComplete quando a pessoa interrompe a rolagem com a
 * roda: sem a validade, a secao ficaria surda a rolagem para sempre.
 */
export function useTrava(validadeMs = 1600) {
  const destino = useRef<number | null>(null)
  const relogio = useRef<number | undefined>(undefined)

  const soltar = useCallback(() => {
    window.clearTimeout(relogio.current)
    destino.current = null
  }, [])

  const travar = useCallback(
    (i: number) => {
      window.clearTimeout(relogio.current)
      destino.current = i
      relogio.current = window.setTimeout(() => {
        destino.current = null
      }, validadeMs)
    },
    [validadeMs],
  )

  const travada = useCallback(() => destino.current !== null, [])

  useEffect(() => () => window.clearTimeout(relogio.current), [])

  return { travar, soltar, travada }
}
