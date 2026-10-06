import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { FotoParallax } from '@/components/ui/FotoParallax'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import type { Produto } from '@/lib/catalogo'

type Props = {
  /** da esquerda para a direita, com o destaque no meio */
  palco: readonly Produto[]
  destaque: Produto
  /** a regra da linha do destaque, no selo */
  regra: string
}

/**
 * Hero, expresso. A copy e da marca, nao de um produto. O que vem do
 * cadastro e o palco e o selo. A foto do destaque e a unica da pagina com
 * pre-carregamento (tests/pagina.test.tsx guarda isso no DOM e no codigo).
 */
export function Hero({ palco, destaque, regra }: Props) {
  return (
    <section id="topo" aria-labelledby="titulo-hero" className="hero superficie-escura scroll-mt-24">
      <div className="wrap">
        <p className="hero__pilula">Sabores saudáveis</p>
        <h1 id="titulo-hero" className="hero__titulo">
          <span className="hero__linha">
            <span>Para quem</span>
          </span>{' '}
          <span className="hero__linha">
            <span>
              ama <em>comer</em>
            </span>
          </span>{' '}
          <span className="hero__linha">
            <span>
              <em>bem.</em>
            </span>
          </span>
        </h1>
        <p className="hero__lead">
          Receitas em versão saudável. Cada uma diz no rótulo o que tem e o que não tem.
        </p>
        <div className="hero__acoes">
          <BotaoRetro href="#cardapio">Ver o cardápio</BotaoRetro>
          <LinkSublinhado href="#hoje" traco={1}>
            Escolher pela vontade
          </LinkSublinhado>
        </div>

        <div className="palco">
          {palco.map((p) => {
            const meio = p.slug === destaque.slug
            return (
              <div
                key={p.slug}
                className={`palco__item palco__item--${meio ? 'meio' : 'lado'} palco__item--${classeDoFormato(p.formato)}`}
              >
                <div className="arco-foto">
                  {meio ? (
                    <FotoParallax
                      imagem={p.imagem}
                      sizes="(max-width: 820px) 40vw, 330px"
                      preload
                      className="h-full w-full"
                      proporcao="h-full w-full"
                    />
                  ) : (
                    <FotoParallax
                      imagem={p.imagem}
                      sizes="(max-width: 820px) 30vw, 270px"
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
          <div className="palco__selo">
            <SeloCarimbo texto={regra} />
          </div>
        </div>
      </div>
    </section>
  )
}
