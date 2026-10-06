'use client'

import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { CardProduto } from '@/components/ui/CardProduto'
import type { Produto } from '@/lib/catalogo'
import { EASE_AMO } from '@/lib/motion'

type Props = {
  produtos: readonly Produto[]
  tipos: Readonly<Record<string, string>>
  nomesDosSelos: Readonly<Record<string, string>>
  /** cada card vira alvo de ancora (o link de sabor da gaveta) */
  comAncora?: boolean
}

const MOLA = [0.34, 1.4, 0.64, 1] as const

/**
 * A grade de cards com o FLIP do Motion: quem fica desliza para o novo
 * lugar, quem entra cresce. Sob movimento reduzido o MotionConfig desliga o
 * deslocamento.
 */
export function GradeProdutos({ produtos, tipos, nomesDosSelos, comAncora = false }: Props) {
  return (
    <MotionConfig reducedMotion="user">
      <ul role="list" className="grade">
        <AnimatePresence mode="popLayout" initial={false}>
          {produtos.map((p) => (
            <motion.li
              key={p.slug}
              id={comAncora ? p.slug : undefined}
              className={comAncora ? 'scroll-mt-24' : undefined}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              transition={{
                layout: { duration: 0.56, ease: EASE_AMO },
                default: { duration: 0.42, delay: 0.09, ease: MOLA },
              }}
            >
              <CardProduto produto={p} tipo={tipos[p.linha] ?? ''} nomesDosSelos={nomesDosSelos} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </MotionConfig>
  )
}
