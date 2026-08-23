import Image from 'next/image'
import { SABORES } from '@/data/sabores'
import { SELOS } from '@/data/selos'
import { ICONES_SELO } from '@/components/icons/selos'
import { Reveal } from '@/components/ui/Reveal'

const FOTO_INK = SABORES[5]  // Intensamente / Chocolate — escura, casa com ink
const FOTO_SAGE = SABORES[2] // Leveza / Maracujá — clara, casa com sage

export function Bento() {
  return (
    <section
      aria-label="A marca em detalhe"
      className="bg-ink px-5 py-[clamp(4.5rem,9vw,8rem)] md:px-10"
    >
      <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div
            data-celula
            className="relative h-full overflow-hidden rounded-[24px] bg-ink ring-1 ring-cream/12"
          >
            <span
              data-fantasma
              aria-hidden="true"
              className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[clamp(6rem,16vw,13rem)] leading-none tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_rgb(250_242_233_/_0.13)]"
            >
              AMO
            </span>

            <div className="relative grid items-center gap-8 p-8 md:grid-cols-[1.1fr_1fr] md:p-10">
              <p className="font-display text-[clamp(1.75rem,3.4vw,3rem)] leading-[1.1] tracking-[-0.015em] text-cream">
                Um abraço em forma de sobremesa
              </p>
              <div className="overflow-hidden rounded-[20px]">
                <div className="aspect-[3/4]">
                  <Image
                    src={FOTO_INK.imagem}
                    alt={FOTO_INK.alt}
                    width={FOTO_INK.largura}
                    height={FOTO_INK.altura}
                    loading="lazy"
                    sizes="(max-width: 768px) 88vw, 30vw"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div
            data-celula
            className="flex h-full flex-col justify-between gap-8 rounded-[24px] bg-sand p-8"
          >
            <ul className="grid grid-cols-2 gap-4">
              {SELOS.slice(0, 4).map((s) => {
                const Icone = ICONES_SELO[s.id]
                return (
                  <li key={s.id} className="flex flex-col gap-2.5">
                    <span className="text-ink/70">
                      <Icone />
                    </span>
                    <span className="font-sans text-[0.6875rem] font-medium uppercase leading-[1.3] tracking-[0.1em] text-ink/70">
                      {s.nome}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="font-script text-[clamp(1.5rem,2.4vw,2.125rem)] leading-tight text-rosewood-forte">
              <span translate="no">AMO</span> por você. Por seu <span translate="no">AMO</span>.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="lg:col-span-3">
          <div
            data-celula
            className="grid items-center gap-8 rounded-[24px] bg-sage p-8 md:grid-cols-[1fr_1.2fr] md:p-10"
          >
            <div className="overflow-hidden rounded-[20px]">
              <div className="aspect-[3/4] md:aspect-[4/3]">
                <Image
                  src={FOTO_SAGE.imagem}
                  alt={FOTO_SAGE.alt}
                  width={FOTO_SAGE.largura}
                  height={FOTO_SAGE.altura}
                  loading="lazy"
                  sizes="(max-width: 768px) 88vw, 38vw"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <p className="font-display text-[clamp(1.5rem,2.8vw,2.5rem)] leading-[1.15] tracking-[-0.015em] text-ink">
              Pote de&nbsp;vidro reutilizável. Lava, guarda, usa de novo.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
