'use client'

import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { CardProduto } from '@/components/ui/CardProduto'
import type { Produto } from '@/lib/catalogo'
import { EASE_AMO } from '@/lib/motion'
import { caminhoDoProduto } from '@/lib/visao'

type Props = {
  produtos: readonly Produto[]
  tipos: Readonly<Record<string, string>>
  nomesDosSelos: Readonly<Record<string, string>>
  /** cada card vira alvo de ancora (o link de sabor da gaveta) */
  comAncora?: boolean
  /** o card que entra ja no lugar, sem crescer: o alvo de uma ancora que o
   *  filtro escondia, medido pela rolagem no mesmo clique em que volta */
  semEntrada?: string | null
  /** o nivel do titulo de cada card (CardProduto) */
  nivel?: 3 | 4
  /** o slug do card cuja foto e a pre-carregada da pagina */
  precarregar?: string
}

/**
 * A grade de cards com o FLIP do Motion: quem fica desliza para o novo
 * lugar, quem entra cresce. Tudo na curva da casa (EASE_AMO): a mola de
 * antes passava do ponto e voltava, e o site novo nao tem quique. Sob
 * movimento reduzido o MotionConfig desliga o deslocamento.
 */
export function GradeProdutos({
  produtos,
  tipos,
  nomesDosSelos,
  comAncora = false,
  semEntrada = null,
  nivel,
  precarregar,
}: Props) {
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
              initial={p.slug === semEntrada ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              transition={{
                layout: { duration: 0.56, ease: EASE_AMO },
                default: { duration: 0.42, delay: 0.09, ease: EASE_AMO },
              }}
            >
              <CardProduto
                produto={p}
                tipo={tipos[p.linha] ?? ''}
                nomesDosSelos={nomesDosSelos}
                href={caminhoDoProduto(p.slug)}
                nivel={nivel}
                precarregada={p.slug === precarregar}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </MotionConfig>
  )
}
