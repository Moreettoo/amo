'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Gaveta, LINKS_DA_HOME } from '@/components/layout/Gaveta'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { IconeCamadas } from '@/components/ui/IconeCamadas'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { CAMINHO_CATALOGO, type DadosGaveta } from '@/lib/visao'

/** 12px do `top-3` + 64 de altura + 20 de folga = os 96 do DESLOCAMENTO_NAV
 *  (RolagemSuave) e do `scroll-mt-24` das secoes. */
export const ALTURA_NAV = 64

type Props = {
  gaveta: DadosGaveta
  /** a linha aberta no catalogo; null na home e em "Tudo" */
  linhaAtual?: string | null
}

/**
 * Nav em pilula creme, flutuando sobre o topo escuro da pagina. Opaca desde o
 * primeiro pixel; ao rolar muda uma coisa so, a sombra. O botao Catalogo abre
 * a gaveta; "Ver cardapio" leva a pagina do catalogo. No celular os links da
 * home moram na gaveta, e o menu de antes saiu.
 */
export function Nav({ gaveta, linhaAtual = null }: Props) {
  const [rolou, setRolou] = useState(false)
  const [aberta, setAberta] = useState(false)
  const botaoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 40)
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <>
      {/* pointer-events-none no involucro, auto nos filhos: com a margem
          negativa ele cobre o topo da pagina, e sem isso engoliria clique e
          hover de tudo que passa por baixo. */}
      <div
        style={{ marginBottom: -ALTURA_NAV }}
        className="pointer-events-none sticky top-3 z-40 px-[var(--gutter)]"
      >
        <div className="relative mx-auto max-w-[1180px]">
          {/* Sem JS o botao Catalogo some e o logo abre a pilula: volta o
              respiro que ele tinha na v2, longe da curva da ponta. */}
          <nav
            aria-label="Principal"
            style={{ height: ALTURA_NAV }}
            className={
              'pointer-events-auto flex items-center gap-2.5 rounded-full bg-creme pl-2.5 pr-2 ' +
              'transition-[box-shadow] duration-300 min-[821px]:gap-[26px] min-[821px]:pr-2.5 ' +
              '[html:not(.js)_&]:pl-4 min-[821px]:[html:not(.js)_&]:pl-6 ' +
              (rolou ? 'shadow-[0_10px_30px_-12px_rgb(0_0_0_/_0.45)]' : 'shadow-none')
            }
          >
            <button
              ref={botaoRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={aberta}
              aria-controls="gaveta"
              onClick={() => setAberta(true)}
              className="so-js botao-catalogo"
            >
              <IconeCamadas />
              <span className="max-[820px]:sr-only">Catálogo</span>
            </button>

            {/* Dimensoes intrinsecas do arquivo (tests/logo.test.ts guarda os
                dois numeros): com elas a proporcao declarada fecha exata e o
                next/image nao avisa no console. */}
            <a href="/#topo" className="shrink-0 rounded-md">
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
              {LINKS_DA_HOME.map((item, i) => (
                <li key={item.href}>
                  <LinkSublinhado href={item.href} traco={i as 0 | 1 | 2}>
                    {item.rotulo}
                  </LinkSublinhado>
                </li>
              ))}
            </ul>

            <BotaoRetro href={CAMINHO_CATALOGO} escuro compacto className="ml-auto min-[821px]:ml-0">
              Ver cardápio
            </BotaoRetro>
          </nav>
        </div>
      </div>

      {/* Fora do involucro: o <dialog> herdaria o pointer-events: none dele. */}
      <Gaveta
        id="gaveta"
        dados={gaveta}
        linhaAtual={linhaAtual}
        aberta={aberta}
        aoFechar={(devolverFoco) => {
          setAberta(false)
          if (devolverFoco) botaoRef.current?.focus()
        }}
      />
    </>
  )
}
