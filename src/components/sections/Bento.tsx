import Image from 'next/image'
import { SABORES } from '@/data/sabores'
import { SELOS } from '@/data/selos'
import { ICONES_SELO } from '@/components/icons/selos'
import { Reveal } from '@/components/ui/Reveal'

const FOTO_INK = SABORES[5]  // Intensamente / Chocolate, escura, casa com ink
const FOTO_SAGE = SABORES[2] // Leveza / Maracujá, clara, casa com sage

export function Bento() {
  return (
    <section
      aria-label="A marca em detalhe"
      className="bg-ink px-5 py-[clamp(4.5rem,9vw,8rem)] md:px-10"
    >
      <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          {/* Sem ring. O `ring-cream/12` media 1.43:1 sobre ink: nao chegava
              nem perto dos 3:1 que uma borda precisa pra delimitar, e como a
              celula e ink sobre uma secao ink, ele era a unica coisa
              separando as duas. Quem separa agora e o respiro interno e a
              foto, que e o que a celula tem de verdade. */}
          <div
            data-celula
            className="relative h-full overflow-hidden rounded-[24px] bg-ink"
          >
            {/* Ancorado dentro da celula. Antes ficava em -top-6 e o topo das
                letras era cortado pelo raio do canto, o que lia como sobra de
                render em vez de marca d'agua. */}
            <span
              data-fantasma
              aria-hidden="true"
              className="pointer-events-none absolute left-6 top-5 select-none font-display text-[clamp(4.5rem,12vw,10rem)] leading-none tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_rgb(250_242_233_/_0.22)]"
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
          {/* justify-center, nao justify-between. A celula estica pra altura da
              celula ink ao lado, e com between os quatro tiles ficavam no topo
              e a assinatura no rodape, com um vazio de uns 200px no meio que
              lia como bug de layout. Centrado, o bloco e um bloco. */}
          <div
            data-celula
            className="flex h-full flex-col justify-center gap-10 rounded-[24px] bg-sand p-8"
          >
            <ul className="grid grid-cols-2 gap-5">
              {SELOS.slice(0, 4).map((s) => {
                const Icone = ICONES_SELO[s.id]
                return (
                  <li key={s.id} className="flex flex-col gap-2.5">
                    <span className="text-ink">
                      <Icone />
                    </span>
                    <span className="font-sans text-[0.6875rem] font-semibold uppercase leading-[1.35] tracking-[0.1em] text-ink/85">
                      {s.nome}
                    </span>
                  </li>
                )
              })}
            </ul>
            {/* Nao e o script: e display. O script tem dois lugares na pagina
                (hero e A marca) e um terceiro em 24px sobre sand, a 3.10:1,
                seria justo o caso onde ele nao aguenta. */}
            <p className="font-display text-[clamp(1.375rem,2.2vw,1.875rem)] leading-tight tracking-[-0.01em] text-ink">
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
