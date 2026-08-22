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
