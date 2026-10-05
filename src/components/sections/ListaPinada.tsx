'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SABORES } from '@/data/sabores'
import { Estrato } from '@/components/ui/Estrato'

const ID_PAINEL = 'preview-sabor'
const idAba = (slug: string) => `aba-${slug}`

export function ListaPinada() {
  // Um estado so, com o indice anterior junto. A cortina precisa saber de
  // onde veio pra deixar a foto de antes por baixo enquanto a nova entra; com
  // dois useState separados o par podia ficar desalinhado por um render, e o
  // updater tem que ser puro (o StrictMode roda ele duas vezes), entao nao
  // cabe um setAnterior dentro do setAtivo.
  const [{ ativo, anterior }, setEstado] = useState({ ativo: 0, anterior: 0 })
  const refSecao = useRef<HTMLElement | null>(null)
  const refsAba = useRef<(HTMLButtonElement | null)[]>([])

  const trocar = useCallback((i: number) => {
    setEstado((e) => (e.ativo === i ? e : { ativo: i, anterior: e.ativo }))
  }, [])

  // O scroll dirige exatamente o mesmo estado que o clique. Gesto nunca e o
  // unico caminho, e so um caminho a mais.
  useEffect(() => {
    const secao = refSecao.current
    if (!secao) return

    const aoRolar = () => {
      const r = secao.getBoundingClientRect()
      const percorrido = -r.top
      const total = r.height - window.innerHeight
      if (total <= 0) return
      const p = Math.min(Math.max(percorrido / total, 0), 0.999)
      trocar(Math.floor(p * SABORES.length))
    }

    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [trocar])

  const mover = (delta: number) => {
    const proximo = (ativo + delta + SABORES.length) % SABORES.length
    trocar(proximo)
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
      trocar(0)
      refsAba.current[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      const ultimo = SABORES.length - 1
      trocar(ultimo)
      refsAba.current[ultimo]?.focus()
    }
  }

  const sabor = SABORES[ativo]
  const saborAnterior = SABORES[anterior]

  return (
    <section
      ref={refSecao}
      aria-labelledby="lista-titulo"
      className="relative bg-cream"
      style={{ height: `${SABORES.length * 55}vh` }}
    >
      <div className="sticky top-0 flex min-h-screen items-center">
        {/* Tres colunas com filete entre elas, e filete acima e abaixo da
            grade inteira: e a forma da secao equivalente na referencia, onde
            a foto, o rotulo fixo e a lista ficam em compartimentos separados
            por regua. Antes eram dois blocos soltos no branco, e a secao nao
            tinha desenho nenhum. No mobile a grade empilha e os filetes
            verticais somem, porque coluna de uma so coluna nao tem o que
            separar. */}
        <div className="mx-auto w-full max-w-[1280px] px-5 py-16 md:px-10">
          <div className="grid gap-8 border-y border-ink/20 py-10 md:grid-cols-[0.85fr_10rem_1fr] md:gap-0 md:py-12">
            <div
              id={ID_PAINEL}
              role="tabpanel"
              aria-labelledby={idAba(sabor.slug)}
              className="relative order-2 overflow-hidden rounded-[24px] md:order-1 md:mr-10"
            >
              <div className="aspect-[3/4] w-full">
                {/* Duas camadas: a foto de antes fica parada por baixo e a nova
                    entra por cima descendo a cortina (clip-path de 0 a 100%).
                    Com uma camada so, a parte ainda nao revelada mostraria o
                    fundo da secao e a troca lia como buraco em vez de
                    substituicao. `key` no slug e o que faz a animacao
                    disparar de novo a cada troca. */}
                <Image
                  key={`base-${saborAnterior.slug}`}
                  src={saborAnterior.imagem}
                  alt=""
                  aria-hidden="true"
                  width={saborAnterior.largura}
                  height={saborAnterior.altura}
                  loading="lazy"
                  sizes="(max-width: 768px) 90vw, 40vw"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <Image
                  key={sabor.slug}
                  data-cortina
                  src={sabor.imagem}
                  alt={sabor.alt}
                  width={sabor.largura}
                  height={sabor.altura}
                  loading="lazy"
                  sizes="(max-width: 768px) 90vw, 40vw"
                  className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[revelaCortina_420ms_var(--ease-amo)]"
                />
              </div>
            </div>

            <div className="order-1 md:order-2 md:self-stretch md:border-l md:border-ink/20 md:pl-8">
              <h2
                id="lista-titulo"
                className="font-sans text-[0.78125rem] font-semibold uppercase tracking-[0.1em] text-ink"
              >
                Todos os sabores
              </h2>
            </div>

            <div className="order-3 md:self-stretch md:border-l md:border-ink/20 md:pl-10">
              <div
                role="tablist"
                aria-orientation="vertical"
                aria-labelledby="lista-titulo"
                onKeyDown={aoTeclar}
                className="flex flex-col items-start gap-1"
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
                      onClick={() => trocar(i)}
                      className={
                        'rounded-lg text-left font-display ' +
                        'text-[clamp(1.875rem,4.2vw,3.5rem)] leading-[1.12] tracking-[-0.01em] ' +
                        'transition-[color] duration-300 ' +
                        'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
                        'focus-visible:outline-rosewood-forte ' +
                        // ink/25 media 1.64:1, e estes nomes nao sao
                        // decoracao: sao os rotulos de sete <button> reais.
                        // Nenhum alfa de ink chega a 4.5:1 sobre cream (o
                        // maximo util, /55, da 3.44), mas em 32px pra cima
                        // isto e texto grande e o piso e 3:1. /55 passa, /25
                        // nao passava em piso nenhum.
                        (selecionado ? 'text-ink' : 'text-ink/55 hover:text-ink/80')
                      }
                    >
                      <span translate="no">{s.nome}</span>
                    </button>
                  )
                })}
              </div>

              <p className="mt-7 min-h-[3rem] max-w-[36ch] font-sans text-[0.9375rem] leading-[1.6] text-ink/85">
                {sabor.sabor} · {sabor.frase}
              </p>
            </div>
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
