import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { Fechamento, type DadosDaSacola } from '@/components/sacola/Fechamento'
import type { Linha } from '@/lib/catalogo'
import { CAMINHO_CATALOGO, type DadosGaveta } from '@/lib/visao'

type Props = {
  gaveta: DadosGaveta
  /** as linhas com produto, para o rodape */
  linhas: readonly Linha[]
  /** a cliente, a loja, o endereco principal e as chaves publicas, lidos no servidor */
  dados: DadosDaSacola
}

/**
 * A pagina da sacola: creme do topo ao corpo, o titulo em duas vozes e o
 * fechamento (o fio das etapas e o resumo). Sem JS a sacola nao existe;
 * a pagina diz isso e leva ao catalogo.
 */
export function TelaSacola({ gaveta, linhas, dados }: Props) {
  return (
    <>
      <Nav gaveta={gaveta} />
      <main id="conteudo" className="sacola-pagina scroll-mt-24">
        <div className="wrap">
          <div className="so-js">
            <Fechamento loja={gaveta.loja} dados={dados} />
          </div>
          <noscript>
            <h1 className="sacola-pagina__titulo">Sua sacola</h1>
            <div className="fechamento__vazia">
              <p>A sacola precisa do JavaScript ligado no navegador. Com ele desligado, os sabores e os preços estão no catálogo.</p>
              <a className="btn-retro btn-retro--escuro" href={CAMINHO_CATALOGO}>
                Ver o catálogo
              </a>
            </div>
          </noscript>
        </div>
      </main>
      <Footer linhas={linhas} />
    </>
  )
}
