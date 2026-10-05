import { Reveal } from '@/components/ui/Reveal'
import { Pill } from '@/components/ui/Pill'
import { Estrato } from '@/components/ui/Estrato'
import { FotoParallax } from '@/components/ui/FotoParallax'
import { SABORES } from '@/data/sabores'

const FOTO = SABORES[1] // Raízes / Paçoca

export function CtaFinal() {
  return (
    <section aria-labelledby="cta-titulo cta-subtitulo" className="bg-sage">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 py-[clamp(4.5rem,9vw,8rem)] md:grid-cols-[1.1fr_1fr] md:gap-16 md:px-10">
        <Reveal>
          <h2
            id="cta-titulo"
            className="max-w-[20ch] text-[clamp(1.875rem,4.4vw,3.5rem)] leading-[1.1] tracking-[-0.008em] text-ink"
          >
            Para quem ama comer bem
          </h2>
          {/* A marca (§7.5) usa o mesmo H2 verbatim: repeticao de proposito da
              assinatura da marca, nao descuido de copy (ver PARK #2,
              progress.md). Isso deixa as duas <section> com o mesmo nome
              acessivel computado, o que o axe reprova (landmark-unique): dois
              landmarks "region" indistinguiveis pra quem navega por landmark.
              A correcao NAO e copy nova: toda string deste projeto e
              transcrita do rotulo fisico, com uma unica excecao sinalizada e
              pendente do cliente (§7.5/§13), e um span so-leitor-de-tela com
              prosa inventada ("convite final", tentativa anterior) criaria uma
              segunda excecao em silencio. So-leitor-de-tela nao isenta: e copy
              mostrada a gente de verdade. Em vez disso, aria-labelledby soma o
              paragrafo "Sete sabores. Zero açúcar." abaixo (texto já visivel,
              já aprovado, já na pagina) ao heading. O nome acessivel computado
              da secao passa a ser "Para quem ama comer bem Sete sabores. Zero
              açúcar.", que diverge do nome de A marca sem acrescentar uma
              palavra que nao estivesse já aprovada. */}
          <p
            id="cta-subtitulo"
            className="mt-5 font-sans text-[1.0625rem] leading-[1.7] text-ink/85"
          >
            Sete sabores. Zero açúcar.
          </p>
          <div className="mt-8">
            <Pill href="#sabores">Ver os sabores</Pill>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <FotoParallax
            sabor={FOTO}
            sizes="(max-width: 768px) 90vw, 42vw"
            className="rounded-[24px]"
            proporcao="aspect-[4/3]"
          />
        </Reveal>
      </div>

      <Estrato n={5} corDestino="fill-ink" className="-mb-px" />
    </section>
  )
}
