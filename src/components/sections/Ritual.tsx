import { RITUAL } from '@/data/ritual'
import { Reveal } from '@/components/ui/Reveal'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Estrato } from '@/components/ui/Estrato'

export function Ritual() {
  return (
    <section
      id="ritual"
      aria-labelledby="ritual-titulo"
      className="scroll-mt-28 bg-sage"
    >
      <div className="mx-auto max-w-[1280px] px-5 py-[clamp(4.5rem,9vw,8rem)] md:px-10">
        <Reveal>
          <Etiqueta>O ritual</Etiqueta>
          <h2
            id="ritual-titulo"
            className="mt-6 max-w-[22ch] text-[clamp(1.875rem,4vw,3.5rem)] leading-[1.05] tracking-[-0.015em] text-ink"
          >
            Como aproveitar seu AMO
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          {/* <ol> porque a ordem carrega informação: não se guarda o pote
              antes de abrir. O próprio rótulo numera de 1 a 4. */}
          <ol className="mt-14 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {RITUAL.map((p) => (
              <li key={p.ordem} className="relative pt-8">
                <span
                  data-numeral
                  aria-hidden="true"
                  className="absolute left-0 top-0 select-none font-display text-[clamp(4rem,9vw,8rem)] leading-[0.7] tracking-[-0.03em] text-sand/70"
                >
                  {String(p.ordem).padStart(2, '0')}
                </span>
                <span className="relative block max-w-[16ch] font-display text-[clamp(1.375rem,2.2vw,1.875rem)] leading-[1.15] tracking-[-0.01em] text-ink">
                  {p.titulo}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>

      <Estrato n={3} corDestino="fill-cream" className="-mb-px" />
    </section>
  )
}
