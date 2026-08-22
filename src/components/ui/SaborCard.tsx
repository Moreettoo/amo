import Image from 'next/image'
import type { CorTampa, Sabor } from '@/data/sabores'

/** A cor real da tampa daquele pote na foto. Casa card e fotografia. */
const TAMPA: Record<CorTampa, string> = {
  vinho: 'bg-[#8E2F3C]',
  terracota: 'bg-[#B0603A]',
  amarelo: 'bg-[#D9A72C]',
  dourado: 'bg-[#C9A24A]',
}

export function SaborCard({ sabor }: { sabor: Sabor }) {
  return (
    <article className="group overflow-hidden rounded-[24px] border border-transparent bg-white transition-[border-color,transform,box-shadow] duration-200 hover:border-blush hover:shadow-[0_8px_32px_-8px_rgb(46_36_31_/_0.12)] motion-safe:hover:-translate-y-[3px]">
      <div className="aspect-[3/4] overflow-hidden">
        <Image
          src={sabor.imagem}
          alt={sabor.alt}
          width={sabor.largura}
          height={sabor.altura}
          loading="lazy"
          sizes="(max-width: 640px) 92vw, (max-width: 768px) 46vw, (max-width: 1024px) 31vw, 23vw"
          className="h-full w-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${TAMPA[sabor.corTampa]}`}
          />
          <h3 className="font-script text-[clamp(1.5rem,2.2vw,2rem)] leading-none text-ink">
            <span translate="no">{sabor.nome}</span>
          </h3>
        </div>

        <p className="font-sans text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-ink/55">
          {sabor.sabor}
        </p>

        <p className="mt-1 font-sans text-sm leading-[1.55] text-ink/70">
          {sabor.frase}
        </p>
      </div>
    </article>
  )
}
