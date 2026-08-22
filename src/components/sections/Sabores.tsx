import { SABORES } from '@/data/sabores'
import { SaborCard } from '@/components/ui/SaborCard'
import { Reveal } from '@/components/ui/Reveal'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Estrato } from '@/components/ui/Estrato'

export function Sabores() {
  return (
    <section
      id="sabores"
      aria-labelledby="sabores-titulo"
      className="scroll-mt-28 bg-cream"
    >
      <div className="mx-auto max-w-[1280px] px-5 pb-[clamp(4.5rem,9vw,8rem)] md:px-10">
        <Reveal>
          <Etiqueta>Os sabores</Etiqueta>
          <h2
            id="sabores-titulo"
            className="mt-6 max-w-[22ch] text-[clamp(1.875rem,4vw,3.5rem)] leading-[1.05] tracking-[-0.015em] text-ink"
          >
            Cada pote tem um nome
          </h2>
          <p className="mt-4 max-w-[46ch] font-sans text-[1.0625rem] leading-[1.65] text-ink/70">
            Escolha pelo sabor, ou pelo que você está sentindo.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div data-grade className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {SABORES.map((s) => (
              <SaborCard key={s.slug} sabor={s} />
            ))}

            <div
              data-painel
              className="flex flex-col justify-center gap-3 rounded-[24px] bg-sage p-8 md:col-span-2 lg:col-span-1"
            >
              <p className="font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.01em] text-ink">
                Um abraço em forma de sobremesa
              </p>
              <span aria-hidden="true" className="text-lg text-rosewood-forte">
                ♥
              </span>
            </div>
          </div>
        </Reveal>
      </div>

      <Estrato n={2} corDestino="fill-sage" className="-mb-px" />
    </section>
  )
}
