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
 *
 * Ao soltar, chama `aoSoltar`: quem usa rele a posicao real da pagina, que
 * pode nao ser a escolhida (a pessoa girou a roda no meio do caminho).
 */
export function useTrava(validadeMs = 1600, aoSoltar?: () => void) {
  const destino = useRef<number | null>(null)
  const relogio = useRef<number | undefined>(undefined)
  const avisar = useRef(aoSoltar)

  useEffect(() => {
    avisar.current = aoSoltar
  }, [aoSoltar])

  const soltar = useCallback(() => {
    window.clearTimeout(relogio.current)
    if (destino.current === null) return
    destino.current = null
    avisar.current?.()
  }, [])

  const travar = useCallback(
    (i: number) => {
      window.clearTimeout(relogio.current)
      destino.current = i
      relogio.current = window.setTimeout(soltar, validadeMs)
    },
    [validadeMs, soltar],
  )

  const travada = useCallback(() => destino.current !== null, [])

  useEffect(() => () => window.clearTimeout(relogio.current), [])

  return { travar, soltar, travada }
}
