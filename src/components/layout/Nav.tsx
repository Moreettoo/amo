'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'

const ITENS = [
  { href: '#hoje', rotulo: 'Hoje o dia pede' },
  { href: '#rotulos', rotulo: 'O que é saudável' },
  { href: '#marca', rotulo: 'A marca' },
] as const

/** 12px do `top-3` + 64 de altura + 20 de folga = os 96 do DESLOCAMENTO_NAV
 *  (RolagemSuave) e do `scroll-mt-24` das secoes. */
export const ALTURA_NAV = 64

/**
 * Nav em pilula creme, flutuando sobre o hero. Opaca desde o primeiro
 * pixel; ao rolar muda uma coisa so, a sombra. Um botao de cardapio so: o
 * cliente apontou que "Cardapio" e "Ver cardapio" lado a lado faziam a
 * mesma coisa.
 */
export function Nav() {
  const [rolou, setRolou] = useState(false)
  const [aberto, setAberto] = useState(false)
  const botaoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 40)
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

  const fechar = () => {
    setAberto(false)
    botaoRef.current?.focus()
  }

  return (
    // pointer-events-none no involucro, auto nos filhos: com a margem
    // negativa ele cobre o topo do hero, e sem isso engoliria clique e hover
    // de tudo que passa por baixo.
    <div
      style={{ marginBottom: -ALTURA_NAV }}
      className="pointer-events-none sticky top-3 z-40 px-[var(--gutter)]"
    >
      <div className="relative mx-auto max-w-[1180px]">
        <nav
          aria-label="Principal"
          style={{ height: ALTURA_NAV }}
          className={
            'pointer-events-auto flex items-center gap-2 rounded-full bg-creme pl-4 pr-2 ' +
            'transition-[box-shadow] duration-300 min-[821px]:gap-[30px] min-[821px]:pl-6 min-[821px]:pr-2.5 ' +
            (rolou ? 'shadow-[0_10px_30px_-12px_rgb(0_0_0_/_0.45)]' : 'shadow-none')
          }
        >
          {/* Dimensoes intrinsecas do arquivo (tests/logo.test.ts guarda os
              dois numeros): com elas a proporcao declarada fecha exata e o
              next/image nao avisa no console. */}
          <a href="#topo" className="shrink-0 rounded-md">
            <Image
              src="/marca/logo-amo.png"
              alt="AMO Sabores Saudáveis"
              width={2245}
              height={714}
              loading="eager"
              fetchPriority="low"
              sizes="100px"
              className="h-[26px] w-auto min-[821px]:h-[30px]"
            />
          </a>

          <ul className="ml-auto hidden items-center gap-[30px] min-[821px]:flex">
            {ITENS.map((item, i) => (
              <li key={item.href}>
                <LinkSublinhado href={item.href} traco={i as 0 | 1 | 2}>
                  {item.rotulo}
                </LinkSublinhado>
              </li>
            ))}
          </ul>

          <BotaoRetro href="#cardapio" escuro compacto className="ml-auto min-[821px]:ml-0">
            Ver cardápio
          </BotaoRetro>

          <button
            ref={botaoRef}
            type="button"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={aberto}
            aria-controls="menu-mobile"
            onClick={() => setAberto((v) => !v)}
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-expresso text-expresso min-[821px]:hidden"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {aberto ? '×' : '≡'}
            </span>
          </button>
        </nav>

        {/* Absoluto: se o painel entrasse no fluxo, a margem negativa do
            involucro teria que mudar junto a cada abertura. */}
        <div
          id="menu-mobile"
          hidden={!aberto}
          style={{ top: ALTURA_NAV + 8 }}
          className="pointer-events-auto absolute inset-x-0 rounded-[24px] bg-creme px-6 py-5 shadow-[0_10px_30px_-12px_rgb(0_0_0_/_0.45)] min-[821px]:hidden"
        >
          <ul className="flex flex-col gap-2">
            {ITENS.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={fechar} className="block py-2 text-[17px] font-semibold text-expresso">
                  {item.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
