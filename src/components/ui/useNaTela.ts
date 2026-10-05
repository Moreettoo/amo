'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Liga uma vez, quando o elemento entra na tela, e para de observar.
 *
 * Quem usa poe a classe `play` com o booleano; o estado escondido de antes
 * do `play` mora em src/app/estilos/movimento.css, atras de `html.js`. No
 * servidor `visto` e falso e a classe nao existe, mas sem JS o portao
 * `html.js` tambem nao existe, entao nada fica escondido.
 */
export function useNaTela<T extends Element>() {
  const ref = useRef<T>(null)
  const [visto, setVisto] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visto) return
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisto(true)
          observador.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [visto])

  return [ref, visto] as const
}
