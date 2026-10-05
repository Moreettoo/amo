'use client'

import type { ReactNode } from 'react'
import { useNaTela } from '@/components/ui/useNaTela'

/**
 * A foto enche de baixo pra cima, como o pote recebendo a massa, quando
 * entra na tela. Quem quer encher de novo (o Hoje o dia pede, ao trocar de
 * vontade) remonta o componente com outra `key`.
 */
export function PoteEnche({ children }: { children: ReactNode }) {
  const [ref, visto] = useNaTela<HTMLDivElement>()
  return (
    <div ref={ref} className={`liq${visto ? ' play' : ''}`}>
      {children}
    </div>
  )
}
