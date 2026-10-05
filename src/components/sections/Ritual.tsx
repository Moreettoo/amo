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
            className="mt-6 max-w-[22ch] text-[clamp(1.875rem,4vw,3.5rem)] leading-[1.1] tracking-[-0.008em] text-ink"
          >
            Como aproveitar seu <span translate="no">AMO</span>
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          {/* <ol> porque a ordem carrega informacao: nao se guarda o pote antes
              de abrir. O proprio rotulo numera de 1 a 4.

              O numeral saiu de tras do texto. Em sand/70 sobre sage ele media
              1.01:1, ou seja: nao era um fantasma, era nada, e ainda por cima
              colidia com o titulo do passo (em "A saboreie sem culpa" o 03
              atravessava a palavra). Agora e um numeral solido em ink, acima do
              titulo, com um filete separando cada passo. E o que a referencia
              faz na secao de processo dela, e passa a ser legivel: 9.16:1. */}
          <ol className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {RITUAL.map((p) => (
              <li key={p.ordem} className="border-t border-ink/25 pt-5">
                <span
                  data-numeral
                  aria-hidden="true"
                  className="block select-none font-display text-[clamp(2.25rem,4vw,3.25rem)] leading-none tracking-[-0.03em] text-ink"
                >
                  {String(p.ordem).padStart(2, '0')}
                </span>
                <span className="mt-5 block max-w-[16ch] font-display text-[clamp(1.375rem,2.2vw,1.875rem)] leading-[1.15] tracking-[-0.01em] text-ink">
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
