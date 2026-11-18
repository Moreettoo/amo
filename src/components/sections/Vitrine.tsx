import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { CardProduto } from '@/components/ui/CardProduto'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { PilulaLink } from '@/components/ui/Pilula'
import type { Produto } from '@/lib/catalogo'
import { CAMINHO_CATALOGO, caminhoDaLinha, textoVerReceitas, type OpcaoLinha } from '@/lib/visao'

type Props = {
  produtos: readonly Produto[]
  /** os atalhos de linha; vazio com uma linha so */
  linhas: readonly OpcaoLinha[]
  total: number
  tipos: Readonly<Record<string, string>>
  nomesDosSelos: Readonly<Record<string, string>>
}

/**
 * O cardapio da home virou vitrine: ate 4 receitas e o caminho para o
 * catalogo, onde mora o filtro. Sem filtro, sem FLIP, sem regiao viva.
 */
export function Vitrine({ produtos, linhas, total, tipos, nomesDosSelos }: Props) {
  return (
    <section id="cardapio" aria-labelledby="titulo-cardapio" className="cardapio grao scroll-mt-24">
      <div className="wrap">
        <div className="vitrine__topo">
          <div>
            <h2 id="titulo-cardapio" className="titulo-secao">
              Escolha <em data-fio="sub">pelo sabor</em>
            </h2>
          </div>
          <LinkSublinhado href={CAMINHO_CATALOGO} traco={2} className="vitrine__ver">
            {textoVerReceitas(total)}
            <svg className="vitrine__seta" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </LinkSublinhado>
        </div>

        <ul role="list" className="grade">
          {produtos.map((p) => (
            <li key={p.slug}>
              <CardProduto
                produto={p}
                tipo={tipos[p.linha] ?? ''}
                nomesDosSelos={nomesDosSelos}
                href={`${CAMINHO_CATALOGO}#produto-${p.slug}`}
              />
            </li>
          ))}
        </ul>

        <div className="vitrine__pe">
          {linhas.length > 0 ? (
            <>
              <p id="vitrine-linhas" className="vitrine__rotulo">
                Direto para uma linha
              </p>
              <ul aria-labelledby="vitrine-linhas" className="vitrine__linhas">
                {linhas.map((l) => (
                  <li key={l.slug}>
                    <PilulaLink href={caminhoDaLinha(l.slug)}>
                      {l.nome} <small>{l.contagem}</small>
                    </PilulaLink>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <BotaoRetro href={CAMINHO_CATALOGO} escuro className="vitrine__botao">
            Ver o catálogo inteiro
          </BotaoRetro>
        </div>
      </div>
    </section>
  )
}
