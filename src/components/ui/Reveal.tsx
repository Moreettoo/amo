'use client'

import { motion, useReducedMotion } from 'motion/react'
import { EASE_AMO } from '@/lib/motion'

type Props = {
  children: React.ReactNode
  /** atraso em segundos, para escalonar irmãos */
  delay?: number
  className?: string
}

export function Reveal({ children, delay = 0, className }: Props) {
  const reduzir = useReducedMotion()

  // Sob prefers-reduced-motion não há transição nenhuma: o conteúdo
  // simplesmente já está no estado final.
  if (reduzir) return <div className={className}>{children}</div>

  return (
    <motion.div
      // Marcador genérico pra CSS de fallback sem JS (ver <noscript> em
      // layout.tsx): o SSR do Motion já grava opacity:0 no style inline
      // deste elemento (é o `initial`), e sem hidratação nada nunca chega a
      // `whileInView`. `data-anim` é o gancho que a regra de noscript usa pra
      // forçar o estado final visível sem precisar enumerar cada seção.
      data-anim
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.5, delay, ease: EASE_AMO }}
    >
      {children}
    </motion.div>
  )
}
