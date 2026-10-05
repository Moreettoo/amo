'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import type { Sabor } from '@/data/sabores'

/**
 * A foto que anda um pouco mais devagar que a pagina.
 *
 * Vem da referencia: lá as fotos de secao deslizam contra a rolagem em vez de
 * ficarem colada nela, e e isso que da a sensacao de profundidade que o scroll
 * interpolado sozinho nao da.
 *
 * A mecanica: a caixa recorta, a foto dentro dela e ampliada em 1.1 e
 * translada de -4% a +4% da propria altura conforme a caixa cruza a janela.
 * Os 10% de sobra da ampliacao cobrem os 4% de translado com folga, entao
 * nunca aparece borda vazia. Percentual em vez de pixel de proposito: assim a
 * amplitude acompanha o tamanho da foto em qualquer breakpoint, sem medir nada
 * em JavaScript.
 *
 * `scale` fica no mesmo transform do `y` porque as duas coisas sao a mesma
 * intencao: sangria pra poder mover. Separar em dois elementos so somaria um
 * no de layout.
 */
type Props = {
  sabor: Sabor
  sizes: string
  /** verdadeiro apenas na foto do hero, que e o elemento de LCP */
  preload?: boolean
  /** classes da caixa que recorta */
  className?: string
  /** proporcao fixa, quando a secao pede uma. Sem ela a foto dita a altura */
  proporcao?: string
}

export function FotoParallax({
  sabor,
  sizes,
  preload = false,
  className,
  proporcao,
}: Props) {
  const refCaixa = useRef<HTMLDivElement>(null)
  const reduzir = useReducedMotion()

  // Progresso de 0 a 1 entre "o topo da caixa entra por baixo da janela" e
  // "o fundo dela sai por cima". Os hooks rodam sempre, com ou sem
  // reduced-motion: o que muda e o style ser aplicado ou nao, porque a ordem
  // de hooks nao pode depender de media query.
  const { scrollYProgress } = useScroll({
    target: refCaixa,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], ['-4%', '4%'])

  return (
    <div ref={refCaixa} className={`overflow-hidden ${className ?? ''}`}>
      <motion.div
        style={reduzir ? undefined : { y, scale: 1.1 }}
        className={proporcao}
      >
        <Image
          src={sabor.imagem}
          alt={sabor.alt}
          width={sabor.largura}
          height={sabor.altura}
          {...(preload ? { preload: true } : { loading: 'lazy' as const })}
          sizes={sizes}
          className={proporcao ? 'h-full w-full object-cover' : 'h-auto w-full object-cover'}
        />
      </motion.div>
    </div>
  )
}
