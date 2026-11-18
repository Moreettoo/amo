'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Gaveta, LINKS_DA_HOME } from '@/components/layout/Gaveta'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { IconeCamadas } from '@/components/ui/IconeCamadas'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { CAMINHO_CATALOGO, type DadosGaveta } from '@/lib/visao'

/** 64 de altura + 32 de folga = os 96 do DESLOCAMENTO_NAV
 *  (RolagemSuave) e do `scroll-mt-24` das secoes. */
export const ALTURA_NAV = 64

type Props = {
  gaveta: DadosGaveta
  /** a linha aberta no catalogo; null na home e em "Tudo" */
  linhaAtual?: string | null
}

/**
 * Nav em linha: barra creme de fora a fora, com um fio embaixo. Opaca desde o
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
      {/* A margem negativa deixa a barra por cima do topo da pagina, que ja
          reserva a altura dela. Opaca e de fora a fora: nao ha o que clicar
          por baixo. */}
      <div style={{ marginBottom: -ALTURA_NAV }} className="sticky top-0 z-40">
        <nav
          aria-label="Principal"
          style={{ height: ALTURA_NAV }}
          className={
            'border-b border-expresso/15 bg-creme px-[var(--gutter)] transition-[box-shadow] duration-300 ' +
            (rolou ? 'shadow-[0_12px_30px_-22px_rgb(43_27_22_/_0.5)]' : 'shadow-none')
          }
        >
          <div className="mx-auto flex h-full max-w-[1128px] items-center gap-2.5 min-[821px]:gap-[26px]">
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
            <a href="/#topo" className="flex min-h-[44px] shrink-0 items-center rounded-md">
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
          </div>
        </nav>
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
