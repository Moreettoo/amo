'use client'

import { Fragment } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Pill } from '@/components/ui/Pill'
import { Estrato } from '@/components/ui/Estrato'
import { FotoParallax } from '@/components/ui/FotoParallax'
import { EASE_AMO } from '@/lib/motion'
import { SABORES } from '@/data/sabores'

/**
 * As tres linhas do titulo, cada uma no seu estrato.
 *
 * A tese da pagina: um bolo no pote e uma seccao transversal, e o titulo e
 * essa seccao (spec §4).
 *
 * As faixas sangram de ponta a ponta da janela, nao da largura do texto. Essa
 * e a diferenca entre um estrato e um marca-texto: limitada ao bloco de texto,
 * a faixa lia como se alguem tivesse grifado o titulo, e ainda desalinhava
 * quando a primeira linha quebrava em duas. Sangrando, ela e uma camada da
 * pagina, o titulo esta dentro dela, e a foto atravessa as tres, que e
 * literalmente o que as camadas fazem no vidro.
 *
 * A progressao tem que ser em cream sobre o sage da secao, nao em sage: sage
 * sobre sage no mesmo alfa e a mesma cor, e nao existiria faixa nenhuma. E a
 * leitura correta do wireframe da spec §4 ("sage 100% -> 92% -> 84% ->
 * cream/40"): cada estagio e cream crescendo sobre o chao sage, terminando
 * perto do estrato cream que a secao seguinte usa (Estrato n=1 logo abaixo).
 * 8 -> 20 -> 34 mantem cada salto em uns 5 a 8 niveis de RGB por canal, o
 * suficiente pra ler como faixa distinta quando estao coladas, e o ultimo
 * estagio fica abaixo de 50 de proposito, pra sage continuar sendo a cor
 * dominante (spec §5.1: "sage carrega a pagina, nao cream").
 */
const LINHAS = [
  { texto: 'Um abraço em', fundo: 'bg-cream/8' },
  { texto: 'forma de', fundo: 'bg-cream/20' },
  { texto: 'sobremesa', fundo: 'bg-cream/34' },
] as const

const POTE = SABORES[0]

/** Altura da nav, que flutua sobre esta secao por causa do -mb dela. */
const RESPIRO_NAV = 'pt-[104px] md:pt-[120px]'

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
    // overflow-x-clip, nao overflow-hidden: as faixas usam 100vw e 100vw
    // inclui a largura da barra de rolagem, entao sem recorte a pagina ganha
    // rolagem horizontal. `clip` recorta sem criar container de rolagem, o
    // que importa porque um container de rolagem aqui quebraria o sticky de
    // qualquer descendente futuro.
    <section
      aria-labelledby="hero-titulo"
      className="relative overflow-x-clip bg-sage"
    >
      <div
        className={`mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-20 md:grid-cols-[1.25fr_1fr] md:gap-14 md:px-10 md:pb-28 ${RESPIRO_NAV}`}
      >
        <div>
          <motion.div data-anim {...anim(0.95)}>
            <Etiqueta>Zero açúcar · Cozido a vapor</Etiqueta>
          </motion.div>

          <h1
            id="hero-titulo"
            className="mt-7 flex flex-col text-[clamp(2.5rem,5.9vw,5rem)] font-normal leading-[1.02] tracking-[-0.01em] text-ink"
          >
            {LINHAS.map((l, i) => (
              <Fragment key={l.texto}>
                {/* `isolate` e o que faz o -z-10 da faixa valer alguma coisa:
                    sem ele este span (relative, z-index auto) nao abre
                    stacking context propria, e o filho de z-index negativo
                    escapa pra stacking context raiz. Ali ele pinta antes do
                    proprio background da <section> (que tambem e so
                    `relative`, sem z-index, entao cai no mesmo balde "auto"
                    da raiz), e o sage opaco da secao cobre a faixa por cima.
                    Com `isolate`, a faixa fica presa dentro da stacking
                    context deste span, que so e pintada (como unidade) na vez
                    do span na arvore, ou seja: depois que o fundo da section
                    já pintou. */}
                <span className="relative isolate block">
                  {/* left/width em vez de translate porque o transform deste
                      elemento pertence ao Motion (scaleY da entrada). Somar um
                      -translate-x-1/2 do Tailwind aqui seria sobrescrito pelo
                      transform inline que o Motion escreve.

                      `inset-y-0`: a faixa e exatamente a caixa de linha, nem um
                      décimo de em a mais. Duas coisas dependem disso.

                      (1) Encaixe. Caixas de linha se ladrilham por definicao,
                      entao faixa nenhuma sobra nem falta. Qualquer inset
                      negativo aqui volta a sobrepor as vizinhas, e como elas
                      sao cream translucido a sobreposicao pinta cream duas
                      vezes e deixa uma tarja mais escura em cada emenda. Isso
                      era metade do motivo dos estratos lerem como sujeira em
                      vez de camada: `inset-y-[-0.06em]` sangrava 0.06em pra
                      cada lado e as faixas se sobrepunham em 0.12em, 11px
                      medidos.

                      (2) Centragem optica. Medida a tinta real (canvas,
                      actualBoundingBox) da Bree Serif em 80px, a folga acima da
                      tinta e a de baixo ficam iguais com deslocamento zero. Com
                      qualquer deslocamento pra baixo a tinta sobe dentro da
                      faixa, e na primeira linha os ascendentes de "Um abraço"
                      escapam por cima da borda. Este numero e uma propriedade da
                      familia: se o display trocar, re-medir. */}
                  <motion.span
                    aria-hidden="true"
                    data-faixa
                    {...animFaixa(0.05 + i * 0.09)}
                    className={`absolute inset-y-0 left-[calc(50%-50vw)] -z-10 w-screen origin-top ${l.fundo}`}
                  />
                  <motion.span
                    data-anim
                    className="block"
                    {...anim(0.35 + i * 0.11)}
                  >
                    {l.texto}
                  </motion.span>
                </span>
                {/* Espaco real como irmao de DOM entre as linhas: e o que da ao
                    h1 o nome acessivel "Um abraço em forma de sobremesa" em vez
                    de palavras coladas. Fica invisivel porque e um no de texto
                    so-espaco filho direto de um container flex (o h1 e `flex
                    flex-col`), e essa spec descarta esse no. Se uma mudanca
                    futura tirar o `flex` do h1 e depender so do `block` de cada
                    span, este espaco deixa de ser descartado e vira um
                    caractere visivel. */}
                {i < LINHAS.length - 1 && ' '}
              </Fragment>
            ))}
          </h1>

          <motion.p
            data-anim
            {...anim(0.95)}
            className="mt-8 font-script text-[clamp(1.875rem,3vw,2.5rem)] leading-tight text-rosewood-forte"
          >
            Para quem ama comer bem.
          </motion.p>

          <motion.p
            data-anim
            {...anim(0.95)}
            className="mt-5 max-w-[46ch] font-sans text-[1.0625rem] leading-[1.7] text-ink/85"
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
            {/* A anotacao saiu do script e do ink/60. Em Parisienne 18px sobre
                sage ela media 3.40:1, e 18px nao e texto grande: reprovava o
                piso de 4.5:1. Em Poppins 15px com ink/85 mede 6.5:1, e a seta
                saiu de blush (1.22:1, invisivel) pra rosewood-forte. */}
            <span className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-0.5 text-lg leading-none text-rosewood-forte"
              >
                ↘
              </span>
              <span className="max-w-[20ch] font-sans text-[0.9375rem] font-medium leading-snug text-ink/85">
                zero açúcar, sem abrir mão do doce
              </span>
            </span>
          </motion.div>
        </div>

        <motion.div data-anim {...anim(0.75)}>
          <FotoParallax
            sabor={POTE}
            sizes="(max-width: 768px) 90vw, 40vw"
            preload
            className="rounded-[20px]"
          />
        </motion.div>
      </div>

      <Estrato n={1} corDestino="fill-cream" className="-mb-px" />
    </section>
  )
}
