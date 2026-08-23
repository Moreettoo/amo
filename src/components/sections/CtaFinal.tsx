import Image from 'next/image'
import { Reveal } from '@/components/ui/Reveal'
import { Pill } from '@/components/ui/Pill'
import { Estrato } from '@/components/ui/Estrato'
import { SABORES } from '@/data/sabores'

const FOTO = SABORES[1] // Raízes / Paçoca

export function CtaFinal() {
  return (
    <section aria-labelledby="cta-titulo cta-subtitulo" className="bg-sage">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 py-[clamp(4.5rem,9vw,8rem)] md:grid-cols-[1.1fr_1fr] md:gap-16 md:px-10">
        <Reveal>
          <h2
            id="cta-titulo"
            className="max-w-[20ch] text-[clamp(1.875rem,4.4vw,3.75rem)] leading-[1.05] tracking-[-0.015em] text-ink"
          >
            Para quem ama comer bem
          </h2>
          {/* A marca (§7.5) usa o mesmo H2 verbatim — repetição de propósito
              da assinatura da marca, não descuido de copy (ver PARK #2,
              progress.md). Isso deixa as duas <section> com o mesmo nome
              acessível computado, o que o axe reprova (landmark-unique):
              dois landmarks "region" indistinguíveis pra quem navega por
              landmark. A correção NÃO é copy nova: toda string deste
              projeto é transcrita do rótulo físico, com uma única exceção
              sinalizada e pendente do cliente (§7.5/§13) — um span
              só-leitor-de-tela com prosa inventada ("convite final", tentativa
              anterior) criaria uma segunda exceção em silêncio, e
              só-leitor-de-tela não isenta: é copy mostrada a gente de
              verdade. Em vez disso, aria-labelledby soma o parágrafo "Sete
              sabores. Zero açúcar." abaixo — texto já visível, já aprovado,
              já na página — ao heading. O nome acessível computado da seção
              passa a ser "Para quem ama comer bem Sete sabores. Zero
              açúcar.", que diverge do nome de A marca sem acrescentar uma
              palavra que não estivesse já aprovada. */}
          <p
            id="cta-subtitulo"
            className="mt-5 font-sans text-[1.0625rem] leading-[1.65] text-ink/75"
          >
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
