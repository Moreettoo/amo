import type { Metadata } from 'next'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { TITULO_NAO_ENCONTRADA } from '@/lib/textos'
import { CAMINHO_CATALOGO, linhasComProduto, montarGaveta } from '@/lib/visao'

export const metadata: Metadata = { title: TITULO_NAO_ENCONTRADA }

/**
 * O 404 do site inteiro: o slug de linha que nao existe e qualquer endereco
 * sem rota. Nav e rodape como nas outras paginas, e o topo escuro do
 * catalogo na ordem do hero: o titulo em duas vozes, o "Erro 404" no lugar
 * da regra da linha (abaixo do titulo, nunca como rotulo acima dele), a
 * frase e os dois caminhos de volta.
 */
export default async function NaoEncontrada() {
  const catalogo = await carregarCatalogo()
  return (
    <>
      <Nav gaveta={montarGaveta(catalogo)} />
      <main id="conteudo" className="scroll-mt-24">
        <div className="topo-catalogo topo-catalogo--so superficie-escura">
          <div className="wrap">
            <h1 className="topo-catalogo__titulo">
              Página não <em>encontrada</em>
            </h1>
            <div className="topo-catalogo__regra">
              <SeloCarimbo texto="Erro 404" />
            </div>
            <p className="topo-catalogo__lead">Este endereço não existe ou mudou. As receitas continuam no catálogo.</p>
            <div className="topo-catalogo__acoes">
              <BotaoRetro href={CAMINHO_CATALOGO}>Ver o catálogo</BotaoRetro>
              <LinkSublinhado href="/">Voltar ao início</LinkSublinhado>
            </div>
          </div>
        </div>
      </main>
      <Footer linhas={linhasComProduto(catalogo)} />
    </>
  )
}
