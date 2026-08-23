import Image from 'next/image'
import { Reveal } from '@/components/ui/Reveal'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { SABORES } from '@/data/sabores'

const FOTO = SABORES[4] // Carinho / Beijinho — a mais clara e delicada das sete

export function AMarca() {
  return (
    <section
      id="marca"
      aria-labelledby="marca-titulo"
      className="scroll-mt-28 bg-cream px-5 pb-[clamp(4.5rem,9vw,8rem)] md:px-10"
    >
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div>
          <Reveal>
            <Etiqueta>A marca</Etiqueta>
            <h2
              id="marca-titulo"
              className="mt-6 max-w-[20ch] text-[clamp(1.875rem,4vw,3.5rem)] leading-[1.05] tracking-[-0.015em] text-ink"
            >
              Para quem ama comer bem
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-7 flex max-w-[52ch] flex-col gap-5 font-sans text-[1.0625rem] leading-[1.7] text-ink/75">
              <p>
                <span translate="no">AMO</span> nasceu de uma ideia simples:
                sobremesa não devia cobrar nada de você depois. Cada pote é
                montado à mão, cozido a vapor e adoçado com eritritol
                e&nbsp;stevia. Açúcar, nenhum.
              </p>
              <p>
                O pote é de vidro porque ele não acaba junto com a sobremesa.
                Lava, guarda, usa de novo.
              </p>
            </div>
            <p className="mt-8 font-script text-[clamp(1.5rem,2.4vw,2rem)] text-rosewood-forte">
              <span translate="no">AMO</span> por você. Por seu <span translate="no">AMO</span>.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="overflow-hidden rounded-[20px]">
            <Image
              src={FOTO.imagem}
              alt={FOTO.alt}
              width={FOTO.largura}
              height={FOTO.altura}
              loading="lazy"
              sizes="(max-width: 768px) 90vw, 42vw"
              className="h-auto w-full object-cover"
            />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
