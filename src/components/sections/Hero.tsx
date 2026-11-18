import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { FotoParallax } from '@/components/ui/FotoParallax'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import type { Produto } from '@/lib/catalogo'
import { CAMINHO_CATALOGO } from '@/lib/visao'

type Props = {
  /** da esquerda para a direita, com o destaque no meio */
  palco: readonly Produto[]
  destaque: Produto
  /** a regra da linha do destaque, entre dois fios, logo abaixo do titulo */
  regra: string
}

/**
 * Hero, creme. "Para quem ama" em Poppins leve e "comer bem." em script,
 * que passa por cima da borda da foto do destaque. Logo abaixo vem a regra
 * da linha e o texto que diz o que e vendido. O que vem do cadastro e o
 * palco e a regra. A foto do destaque e a unica da pagina com
 * pre-carregamento (tests/pagina.test.tsx guarda isso no DOM e no codigo).
 */
export function Hero({ palco, destaque, regra }: Props) {
  return (
    <section id="topo" aria-labelledby="titulo-hero" className="hero scroll-mt-24">
      <div className="wrap hero__grade">
        <div className="hero__texto">
          <h1 id="titulo-hero" className="hero__titulo">
            <span className="hero__linha">
              <span>Para quem ama</span>
            </span>{' '}
            <em data-fio="inicio">comer bem.</em>
          </h1>
          <div className="hero__regra">
            <SeloCarimbo texto={regra} />
          </div>
          <p className="hero__lead">
            Bolos no pote zero açúcar, feitos à mão e cozidos a vapor. O rótulo diz o que tem e o que não
            tem.
          </p>
          <div className="hero__acoes">
            <BotaoRetro href={CAMINHO_CATALOGO} escuro>
              Ver o cardápio
            </BotaoRetro>
            <LinkSublinhado href="#hoje" traco={1}>
              Escolher pela vontade
            </LinkSublinhado>
          </div>
        </div>

        <div className="palco">
          {palco.map((p) => {
            const meio = p.slug === destaque.slug
            return (
              <div
                key={p.slug}
                className={`palco__item palco__item--${meio ? 'meio' : 'lado'} palco__item--${classeDoFormato(p.formato)}`}
              >
                <div className="arco-foto" data-fio={meio ? 'atras' : undefined}>
                  {meio ? (
                    <FotoParallax
                      imagem={p.imagem}
                      sizes="(max-width: 899px) 92vw, 380px"
                      preload
                      className="h-full w-full"
                      proporcao="h-full w-full"
                    />
                  ) : (
                    <FotoParallax
                      imagem={p.imagem}
                      sizes="(max-width: 899px) 45vw, 172px"
                      carregamento="eager"
                      prioridade="low"
                      className="h-full w-full"
                      proporcao="h-full w-full"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
