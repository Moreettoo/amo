import { Reveal } from '@/components/ui/Reveal'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { FotoParallax } from '@/components/ui/FotoParallax'
import { SABORES } from '@/data/sabores'

const FOTO = SABORES[4] // Carinho / Beijinho, a mais clara e delicada das sete

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
              className="mt-6 max-w-[20ch] text-[clamp(1.875rem,4vw,3.5rem)] leading-[1.1] tracking-[-0.008em] text-ink"
            >
              Para quem ama comer bem
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-7 flex max-w-[52ch] flex-col gap-5 font-sans text-[1.0625rem] leading-[1.75] text-ink/85">
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
            {/* Um dos dois lugares onde o script fica. Acima de 28px o traco da
                Parisienne aguenta, e rosewood-forte sobre cream mede 4.52:1. */}
            <p className="mt-8 font-script text-[clamp(1.75rem,2.6vw,2.25rem)] leading-tight text-rosewood-forte">
              <span translate="no">AMO</span> por você. Por seu <span translate="no">AMO</span>.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <FotoParallax
            sabor={FOTO}
            sizes="(max-width: 768px) 90vw, 42vw"
            className="rounded-[20px]"
          />
        </Reveal>
      </div>
    </section>
  )
}
