import { SELOS } from '@/data/selos'
import { ICONES_SELO } from '@/components/icons/selos'
import { Reveal } from '@/components/ui/Reveal'
import { Etiqueta } from '@/components/ui/Etiqueta'

export function Selos() {
  return (
    <section
      id="selos"
      aria-labelledby="selos-titulo"
      className="scroll-mt-28 bg-cream px-5 py-[clamp(4.5rem,9vw,8rem)] md:px-10"
    >
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <Etiqueta>O que vai no pote</Etiqueta>
          <h2
            id="selos-titulo"
            className="mt-6 max-w-[24ch] text-[clamp(1.875rem,4vw,3.5rem)] leading-[1.05] tracking-[-0.015em] text-ink"
          >
            Feito pra comer sem culpa
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          <ul className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {SELOS.map((s) => {
              const Icone = ICONES_SELO[s.id]
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-4 rounded-[20px] bg-sand/40 p-5"
                >
                  <span className="text-ink/70">
                    <Icone />
                  </span>
                  <span className="font-sans text-[0.8125rem] font-medium uppercase leading-[1.35] tracking-[0.1em] text-ink/80">
                    {s.nome}
                  </span>
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
