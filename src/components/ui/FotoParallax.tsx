'use client'

import Image from 'next/image'
import { useRef, useSyncExternalStore } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import type { ImagemProduto } from '@/lib/catalogo'

/**
 * A foto que anda um pouco mais devagar que a pagina.
 *
 * A caixa recorta; a foto dentro dela e ampliada em 1.1 e translada de -4% a
 * +4% da propria altura conforme a caixa cruza a janela. Os 10% de sobra da
 * ampliacao cobrem os 4% de translado, entao nunca aparece borda vazia.
 *
 * `data-parallax` marca o unico lugar onde o HTML do servidor pode sair com
 * `transform` inline: aqui ele e o deslocamento de rolagem e nao esconde
 * nada (tests/ssr.test.tsx).
 */
const CONSULTA_REDUZIR = '(prefers-reduced-motion: reduce)'
function assinarReduzir(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_REDUZIR)
  consulta.addEventListener('change', avisar)
  return () => consulta.removeEventListener('change', avisar)
}
const reduzirNoCliente = () => window.matchMedia(CONSULTA_REDUZIR).matches
const reduzirNoServidor = () => false

type Props = {
  imagem: ImagemProduto
  sizes: string
  /** verdadeiro apenas na foto do destaque no hero, o elemento de LCP */
  preload?: boolean
  /** sem preload: lazy por padrao; eager para as laterais do hero */
  carregamento?: 'lazy' | 'eager'
  /** 'low' nas laterais do hero: o React 19 poe <link rel="preload"> em todo
   *  <img> que nao e lazy nem de prioridade baixa, e o destaque tem que ser o
   *  unico pre-carregado */
  prioridade?: 'low' | 'auto'
  /** classes da caixa que recorta */
  className?: string
  /** classes do miolo que se move; sem elas a foto dita a altura */
  proporcao?: string
}

export function FotoParallax({
  imagem,
  sizes,
  preload = false,
  carregamento = 'lazy',
  prioridade = 'auto',
  className,
  proporcao,
}: Props) {
  const refCaixa = useRef<HTMLDivElement>(null)
  // A preferencia so vale depois da hidratacao: na primeira renderizacao o
  // cliente repete o HTML do servidor (com o transform) e so entao tira o
  // deslocamento. Lida direto no render, ela divergia do servidor e o React
  // acusava erro de hidratacao em quem pede movimento reduzido.
  const reduzir = useSyncExternalStore(assinarReduzir, reduzirNoCliente, reduzirNoServidor)

  // Os hooks rodam sempre, com ou sem reduced-motion: o que muda sao os
  // valores do style, porque a ordem de hooks nao pode depender de media query.
  const { scrollYProgress } = useScroll({
    target: refCaixa,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], ['-4%', '4%'])

  return (
    <div ref={refCaixa} className={`overflow-hidden ${className ?? ''}`}>
      <motion.div
        data-parallax
        style={{ y: reduzir ? 0 : y, scale: reduzir ? 1 : 1.1 }}
        className={proporcao}
      >
        <Image
          src={imagem.src}
          alt={imagem.alt}
          width={imagem.largura}
          height={imagem.altura}
          {...(preload ? { preload: true } : { loading: carregamento, fetchPriority: prioridade })}
          sizes={sizes}
          className={proporcao ? 'h-full w-full object-cover' : 'h-auto w-full object-cover'}
        />
      </motion.div>
    </div>
  )
}
