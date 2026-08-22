'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { SABORES } from '@/data/sabores'
import { Estrato } from '@/components/ui/Estrato'

const ID_PAINEL = 'preview-sabor'
const idAba = (slug: string) => `aba-${slug}`

export function ListaPinada() {
  const [ativo, setAtivo] = useState(0)
  const refSecao = useRef<HTMLElement | null>(null)
  const refsAba = useRef<(HTMLButtonElement | null)[]>([])

  // O scroll dirige exatamente o mesmo estado que o clique. Gesto nunca é o
  // único caminho — é só um caminho a mais.
  useEffect(() => {
    const secao = refSecao.current
    if (!secao) return

    const aoRolar = () => {
      const r = secao.getBoundingClientRect()
      const percorrido = -r.top
      const total = r.height - window.innerHeight
      if (total <= 0) return
      const p = Math.min(Math.max(percorrido / total, 0), 0.999)
      setAtivo(Math.floor(p * SABORES.length))
    }

    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  const mover = (delta: number) => {
    const proximo = (ativo + delta + SABORES.length) % SABORES.length
    setAtivo(proximo)
    refsAba.current[proximo]?.focus()
  }

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      mover(1)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      mover(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setAtivo(0)
      refsAba.current[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      const ultimo = SABORES.length - 1
      setAtivo(ultimo)
      refsAba.current[ultimo]?.focus()
    }
  }

  const sabor = SABORES[ativo]

  return (
    <section
      ref={refSecao}
      aria-labelledby="lista-titulo"
      className="relative bg-cream"
      style={{ height: `${SABORES.length * 55}vh` }}
    >
      <div className="sticky top-0 flex min-h-screen items-center">
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-10 px-5 py-16 md:grid-cols-[0.85fr_1fr] md:gap-16 md:px-10">
          <div
            id={ID_PAINEL}
            role="tabpanel"
            aria-labelledby={idAba(sabor.slug)}
            className="order-2 overflow-hidden rounded-[24px] md:order-1"
          >
            <div className="aspect-[3/4] w-full">
              <Image
                key={sabor.slug}
                src={sabor.imagem}
                alt={sabor.alt}
                width={sabor.largura}
                height={sabor.altura}
                loading="lazy"
                sizes="(max-width: 768px) 90vw, 40vw"
                className="h-full w-full object-cover motion-safe:animate-[fadeIn_300ms_ease-out]"
              />
            </div>
          </div>

          <div className="order-1 md:order-2">
            <h2
              id="lista-titulo"
              className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-ink/55"
            >
              Todos os sabores
            </h2>

            <div
              role="tablist"
              aria-orientation="vertical"
              aria-labelledby="lista-titulo"
              onKeyDown={aoTeclar}
              className="mt-7 flex flex-col items-start gap-1"
            >
              {SABORES.map((s, i) => {
                const selecionado = i === ativo
                return (
                  <button
                    key={s.slug}
                    id={idAba(s.slug)}
                    ref={(el) => {
                      refsAba.current[i] = el
                    }}
                    role="tab"
                    type="button"
                    aria-selected={selecionado}
                    aria-controls={ID_PAINEL}
                    tabIndex={selecionado ? 0 : -1}
                    onClick={() => setAtivo(i)}
                    className={
                      'rounded-lg text-left font-display ' +
                      'text-[clamp(2rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.02em] ' +
                      'transition-[color,opacity] duration-300 ' +
                      'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
                      'focus-visible:outline-rosewood-forte ' +
                      (selecionado ? 'text-ink' : 'text-ink/25 hover:text-ink/50')
                    }
                  >
                    <span translate="no">{s.nome}</span>
                  </button>
                )
              })}
            </div>

            <p className="mt-7 min-h-[3rem] max-w-[36ch] font-sans text-[0.9375rem] leading-[1.6] text-ink/70">
              {sabor.sabor} — {sabor.frase}
            </p>
          </div>
        </div>
      </div>

      <Estrato
        n={4}
        corDestino="fill-ink"
        className="absolute bottom-0 left-0 -mb-px"
      />
    </section>
  )
}
