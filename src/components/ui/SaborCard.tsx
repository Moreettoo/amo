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
    // flex-col com a frase em mt-auto: a grade já estica todos os cards da
    // linha pra mesma altura, e sem isso a frase de "Encontro" (cujo sabor
    // ocupa duas linhas) descia sozinha e desalinhava o pe da linha inteira.
    //
    // bg-papel, nao bg-white. #FFF puro nao esta na paleta e encostado no
    // cream lia frio e acinzentado, como se o card fosse de outro projeto.
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-transparent bg-papel transition-[border-color,transform,box-shadow] duration-200 hover:border-blush hover:shadow-[0_8px_32px_-8px_rgb(46_36_31_/_0.12)] motion-safe:hover:-translate-y-[3px]">
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

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${TAMPA[sabor.corTampa]}`}
          />
          {/* O nome saiu do script. Ele e o identificador principal do card, e
              Parisienne em 24px e um traco fio de cabelo: dava pra ler, mas
              lendo com esforco, no lugar onde a pessoa mais precisa nao ter
              esforco. O script continua na pagina, nas duas linhas de
              assinatura da marca, onde passa dos 28px. */}
          <h3 className="font-display text-[1.375rem] leading-tight tracking-[-0.005em] text-ink">
            <span translate="no">{sabor.nome}</span>
          </h3>
        </div>

        <p className="font-sans text-[0.78125rem] font-semibold uppercase leading-[1.35] tracking-[0.1em] text-ink/75">
          {sabor.sabor}
        </p>

        <p className="mt-auto pt-3 font-sans text-sm leading-[1.6] text-ink/80">
          {sabor.frase}
        </p>
      </div>
    </article>
  )
}
