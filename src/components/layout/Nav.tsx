'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const ITENS = [
  { href: '#sabores', rotulo: 'Sabores' },
  { href: '#marca', rotulo: 'A marca' },
  { href: '#ritual', rotulo: 'O ritual' },
] as const

/** 12px de `top-3` + 88px de altura. O mesmo numero vive em RolagemSuave
 *  (deslocamento da ancora) e no `scroll-mt-28` das secoes. */
const ALTURA = 88

/**
 * Nav flutuante, opaca desde o primeiro pixel.
 *
 * Antes ela era `bg-transparent` e virava `bg-sage/95` com backdrop-blur ao
 * rolar. Dois problemas de verdade nisso: sage translucido por cima das fotos
 * dos potes borrava a foto e a barra num cinza-esverdeado sem forma, e o
 * rotulo em ink/100 sobre sage a 95% mudava de contraste conforme o que
 * passava por baixo. A referencia nunca faz isso: a barra dela e opaca,
 * chapada, do primeiro ao ultimo scroll.
 *
 * Aqui a superficie e cream com filete sand, o que da 13.64:1 no rotulo e
 * mantem o logo legivel (a arte e cobre sobre transparencia: sobre ink ela
 * desaparece, e foi o que aconteceu no rodape). Ao rolar muda uma coisa so, a
 * sombra. Altura nunca. Zero deslocamento de layout.
 *
 * O `-mb-[88px]` e o que faz a barra flutuar sobre o sage do hero em vez de
 * sentar numa faixa cream propria: sem ele a nav ocupava 88px de fluxo entre
 * a barra ink e o hero, e aparecia uma tarja cream que ninguem desenhou.
 */
export function Nav() {
  const [rolou, setRolou] = useState(false)
  const [aberto, setAberto] = useState(false)
  const botaoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 40)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false)
        botaoRef.current?.focus()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto])

  return (
    // pointer-events-none no invólucro, auto nos filhos: com margem negativa
    // ele cobre os 88px de cima do hero, e sem isso engoliria clique e hover
    // de tudo que passar por baixo.
    <div
      style={{ marginBottom: -ALTURA }}
      className="pointer-events-none sticky top-3 z-40 px-3 md:top-4 md:px-6"
    >
      <div className="relative mx-auto max-w-[1280px]">
        <nav
          aria-label="Principal"
          style={{ height: ALTURA }}
          className={
            'pointer-events-auto flex items-center justify-between ' +
            'rounded-[20px] border border-sand bg-cream px-5 md:px-8 ' +
            'transition-[box-shadow] duration-[240ms] ' +
            (rolou ? 'shadow-[0_10px_36px_-12px_rgb(46_36_31_/_0.22)]' : 'shadow-none')
          }
        >
          <a href="#conteudo" className="shrink-0">
            {/* Dimensoes intrinsecas do arquivo, nao um par arredondado. Com
                149x44 a proporcao declarada (3.3864) divergia da real e, na
                altura md de 44px, a largura calculada caia fora do atributo:
                o next/image lia uma das duas dimensoes como "nao modificada
                por CSS" e avisava no console. Declarando o intrinseco, as duas
                sao modificadas por CSS e a proporcao fecha exata.

                714 e nao 649: o recorte da faixa superior do lockup estava
                decepando a base do "A", a cauda do "m" e o fundo do pote (ver
                fim_da_faixa_superior em scripts/recortar-logo.py). Se estes
                numeros forem mexidos, tem que ser porque o asset foi gerado de
                novo, e tests/logo.test.ts guarda os dois. */}
            <Image
              src="/marca/logo-amo.png"
              alt="AMO Sabores Saudáveis"
              width={2245}
              height={714}
              loading="eager"
              fetchPriority="low"
              sizes="150px"
              className="h-9 w-auto md:h-11"
            />
          </a>

          <ul className="hidden items-center gap-9 md:flex">
            {ITENS.map((i) => (
              <li key={i.href}>
                <a
                  href={i.href}
                  className="font-sans text-[0.78125rem] font-semibold uppercase tracking-[0.1em] text-ink transition-colors duration-200 hover:text-rosewood-forte"
                >
                  {i.rotulo}
                </a>
              </li>
            ))}
          </ul>

          {/* Preenchido em sand, nao contorno em ink/20: aquele filete media
              1.43:1 sobre cream e nao chegava perto do piso de 3:1 exigido
              pra borda que identifica um controle. Nenhum alfa de ink chega a
              3:1 sobre cream, entao a forma do botao passa a ser carregada
              pelo preenchimento. */}
          <button
            ref={botaoRef}
            type="button"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={aberto}
            aria-controls="menu-mobile"
            onClick={() => setAberto((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-full bg-sand transition-colors duration-200 hover:bg-sage md:hidden"
          >
            <span aria-hidden="true" className="text-lg leading-none text-ink">
              {aberto ? '×' : '≡'}
            </span>
          </button>
        </nav>

        {/* Absoluto: se o painel entrasse no fluxo, a margem negativa do
            invólucro teria que mudar junto com ele a cada abertura. */}
        <div
          id="menu-mobile"
          hidden={!aberto}
          style={{ top: ALTURA + 8 }}
          className="pointer-events-auto absolute inset-x-0 rounded-[20px] border border-sand bg-cream px-6 py-5 shadow-[0_10px_36px_-12px_rgb(46_36_31_/_0.22)] md:hidden"
        >
          <ul className="flex flex-col gap-4">
            {ITENS.map((i) => (
              <li key={i.href}>
                <a
                  href={i.href}
                  onClick={() => {
                    setAberto(false)
                    botaoRef.current?.focus()
                  }}
                  className="font-sans text-[0.875rem] font-semibold uppercase tracking-[0.1em] text-ink"
                >
                  {i.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
