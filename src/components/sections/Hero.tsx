'use client'

import { Fragment } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Pill } from '@/components/ui/Pill'
import { Estrato } from '@/components/ui/Estrato'
import { EASE_AMO } from '@/lib/motion'
import { SABORES } from '@/data/sabores'

/**
 * As três linhas do título, cada uma em sua faixa de tonalidade.
 * É a tese da página: um bolo no pote é uma secção transversal, e o
 * título é essa secção. Ver spec §4.
 *
 * A seção por trás das faixas já é `bg-sage` (linha ~48) — compor sage sobre
 * sage no mesmo alpha é a mesma cor, então as três faixas têm que progredir
 * em `cream`, não em `sage`, pra existirem como faixas visíveis. É a leitura
 * correta do wireframe da spec §4 ("sage 100% → sage 92% → sage 84% →
 * cream/40"): cada estágio é cream aumentando sobre o chão sage, terminando
 * perto do estrato cream que a seção seguinte já usa (Estrato n=1 logo
 * abaixo). Progressão 10 → 22 → 36: cada salto muda uns 6-8 níveis de RGB
 * por canal — sutil isoladamente, mas nítido com faixas coladas lado a lado
 * (contraste simultâneo) — e 36 fica abaixo de 50 de propósito, pra sage
 * continuar sendo a cor dominante da faixa (spec §5.1: "sage carrega a
 * página, não cream"), só a última faixa já puxando visivelmente pro cream
 * que vem a seguir.
 */
const LINHAS = [
  { texto: 'Um abraço em', fundo: 'bg-cream/10' },
  { texto: 'forma de', fundo: 'bg-cream/22' },
  { texto: 'sobremesa', fundo: 'bg-cream/36' },
] as const

const POTE = SABORES[0]

export function Hero() {
  const reduzir = useReducedMotion()

  // Sob reduced-motion nada anima: tudo já nasce no estado final.
  const anim = (delay: number) =>
    reduzir
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: EASE_AMO },
        }

  const animFaixa = (delay: number) =>
    reduzir
      ? {}
      : {
          initial: { scaleY: 0, opacity: 0 },
          animate: { scaleY: 1, opacity: 1 },
          transition: { duration: 0.5, delay, ease: EASE_AMO },
        }

  return (
    <section aria-labelledby="hero-titulo" className="relative bg-sage pt-8 md:pt-4">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-20 md:grid-cols-[1.15fr_1fr] md:gap-14 md:px-10 md:pb-28">
        <div>
          <motion.div data-anim {...anim(0.95)}>
            <Etiqueta>Zero açúcar · Cozido a vapor</Etiqueta>
          </motion.div>

          <h1
            id="hero-titulo"
            className="mt-7 flex flex-col text-[clamp(2.75rem,7.5vw,6.5rem)] font-normal leading-[0.94] tracking-[-0.02em] text-ink"
          >
            {LINHAS.map((l, i) => (
              <Fragment key={l.texto}>
                {/* `isolate` é o que faz o -z-10 da faixa valer alguma coisa:
                    sem ele, este span (relative, z-index auto) não abre
                    stacking context própria, e o filho de z-index negativo
                    escapa pra stacking context raiz — aí ele pinta antes do
                    próprio background da <section> (que também é só
                    `relative`, sem z-index, então cai no mesmo balde "auto"
                    da raiz), e o sage opaco da seção cobre a faixa por cima.
                    Com `isolate`, a faixa fica presa dentro da stacking
                    context deste span, que só é pintada (como unidade) na
                    vez do span na árvore — ou seja, depois que o fundo da
                    section já pintou. */}
                <span className="relative isolate">
                  <motion.span
                    aria-hidden="true"
                    data-faixa
                    {...animFaixa(0.05 + i * 0.09)}
                    className={`absolute inset-x-0 inset-y-[-0.06em] -z-10 origin-top ${l.fundo}`}
                  />
                  <motion.span
                    data-anim
                    className="block"
                    {...anim(0.35 + i * 0.11)}
                  >
                    {l.texto}
                  </motion.span>
                </span>
                {/* Espaço real como irmão de DOM entre as linhas — é o que dá ao
                    h1 o nome acessível "Um abraço em forma de sobremesa" em vez
                    de palavras coladas. Fica invisível porque é um nó de texto
                    só-espaço filho direto de um container flex/grid (o h1 é
                    `flex flex-col`), e essa spec descarta esse nó. Se uma
                    mudança futura tirar o `flex` do h1 e depender só do
                    `block` de cada span, este espaço deixa de ser descartado
                    e vira um caractere visível. */}
                {i < LINHAS.length - 1 && ' '}
              </Fragment>
            ))}
          </h1>

          <motion.p
            data-anim
            {...anim(0.95)}
            className="mt-7 font-script text-[clamp(1.75rem,3vw,2.5rem)] leading-tight text-rosewood-forte"
          >
            Para quem ama comer bem.
          </motion.p>

          <motion.p
            data-anim
            {...anim(0.95)}
            className="mt-5 max-w-[46ch] font-sans text-[1.0625rem] leading-[1.65] text-ink/75"
          >
            Sete sabores de bolo no pote, montados à mão e adoçados com eritritol
            e&nbsp;stevia. Em pote de&nbsp;vidro que fica com você.
          </motion.p>

          <motion.div
            data-anim
            {...anim(0.95)}
            className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4"
          >
            <Pill href="#sabores">Ver os sabores</Pill>
            <span className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 text-lg text-blush">
                ↘
              </span>
              <span className="max-w-[18ch] font-script text-lg leading-tight text-ink/60">
                zero açúcar, sem abrir mão do doce
              </span>
            </span>
          </motion.div>
        </div>

        <motion.div data-anim {...anim(0.75)} className="relative">
          <div className="overflow-hidden rounded-[20px]">
            <Image
              src={POTE.imagem}
              alt={POTE.alt}
              width={POTE.largura}
              height={POTE.altura}
              priority
              sizes="(max-width: 768px) 90vw, 42vw"
              className="h-auto w-full object-cover"
            />
          </div>
        </motion.div>
      </div>

      <Estrato n={1} corDestino="fill-cream" className="-mb-px" />
    </section>
  )
}
