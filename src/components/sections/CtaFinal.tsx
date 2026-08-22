import Image from 'next/image'
import { Reveal } from '@/components/ui/Reveal'
import { Pill } from '@/components/ui/Pill'
import { Estrato } from '@/components/ui/Estrato'
import { SABORES } from '@/data/sabores'

const FOTO = SABORES[1] // Raízes / Paçoca

export function CtaFinal() {
  return (
    <section aria-labelledby="cta-titulo" className="bg-sage">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 py-[clamp(4.5rem,9vw,8rem)] md:grid-cols-[1.1fr_1fr] md:gap-16 md:px-10">
        <Reveal>
          <h2
            id="cta-titulo"
            className="max-w-[20ch] text-[clamp(1.875rem,4.4vw,3.75rem)] leading-[1.05] tracking-[-0.015em] text-ink"
          >
            Para quem ama comer bem
          </h2>
          <p className="mt-5 font-sans text-[1.0625rem] leading-[1.65] text-ink/75">
            Sete sabores. Zero açúcar.
          </p>
          <div className="mt-8">
            <Pill href="#sabores">Ver os sabores</Pill>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-[24px]">
            <div className="aspect-[4/3]">
              <Image
                src={FOTO.imagem}
                alt={FOTO.alt}
                width={FOTO.largura}
                height={FOTO.altura}
                loading="lazy"
                sizes="(max-width: 768px) 90vw, 42vw"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </Reveal>
      </div>

      <Estrato n={5} corDestino="fill-ink" className="-mb-px" />
    </section>
  )
}
