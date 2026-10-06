import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { PilulaLink } from '@/components/ui/Pilula'
import { CAMINHO_CATALOGO, caminhoDaLinha } from '@/lib/visao'

type Props = {
  /** vazio quando ha uma linha so (montarVisao decide) */
  linhas: readonly { slug: string; nome: string }[]
}

/** O fecho, expresso: chamada final e, com varias linhas, um atalho para a
 *  pagina de cada uma no catalogo. */
export function Final({ linhas }: Props) {
  return (
    <section aria-labelledby="titulo-final" className="final superficie-escura">
      <div className="wrap">
        <h2 id="titulo-final">
          Escolha o seu <span translate="no">AMO</span>.
        </h2>
        <p>Cada receita tem a sua versão saudável.</p>
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
    </section>
  )
}
