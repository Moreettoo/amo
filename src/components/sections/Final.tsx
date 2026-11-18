import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { FotoParallax } from '@/components/ui/FotoParallax'
import { PilulaLink } from '@/components/ui/Pilula'
import type { ImagemProduto } from '@/lib/catalogo'
import { CAMINHO_CATALOGO, caminhoDaLinha } from '@/lib/visao'

type Props = {
  /** vazio quando ha uma linha so (montarVisao decide) */
  linhas: readonly { slug: string; nome: string }[]
  foto: ImagemProduto
}

/**
 * O fecho, expresso: a chamada final, a assinatura da marca ("AMO por voce.
 * Por seu AMO.") logo abaixo dela, o botao e uma foto. O fio da home
 * termina ao lado da assinatura, num coracao. Com varias linhas,
 * um atalho para a pagina de cada uma no catalogo.
 */
export function Final({ linhas, foto }: Props) {
  return (
    <section aria-labelledby="titulo-final" className="final superficie-escura">
      <div className="wrap final__grade">
        <div>
          <h2 id="titulo-final">
            Escolha o seu <span translate="no">AMO</span>.
          </h2>
          <p className="final__assinatura">
            <span className="final__frase" data-fio="fim">
              <span translate="no">AMO</span> por você. Por seu <span translate="no">AMO</span>.
            </span>
          </p>
          {linhas.length > 0 ? (
            <div className="final__linhas">
              {linhas.map((l) => (
                <PilulaLink key={l.slug} href={caminhoDaLinha(l.slug)} variante="clara">
                  {l.nome}
                </PilulaLink>
              ))}
            </div>
          ) : null}
          <BotaoRetro href={CAMINHO_CATALOGO} className="final__botao">
            Ver o cardápio
          </BotaoRetro>
        </div>
        <div className="arco-foto final__foto" data-fio="atras">
          <FotoParallax
            imagem={foto}
            sizes="(max-width: 820px) 90vw, 460px"
            className="h-full w-full"
            proporcao="h-full w-full"
          />
        </div>
      </div>
    </section>
  )
}
