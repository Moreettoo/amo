import type { Metadata } from 'next'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { Camadas } from '@/components/ui/Camadas'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { carregarCatalogo } from '@/lib/catalogo'
import { CAMINHO_CATALOGO, linhasComProduto, montarGaveta } from '@/lib/visao'

export const metadata: Metadata = { title: 'Página não encontrada · AMO' }

/**
 * O 404 do site inteiro: o slug de linha que nao existe e qualquer endereco
 * sem rota. Nav e rodape como nas outras paginas, e o topo escuro do
 * catalogo com os dois caminhos de volta.
 */
export default async function NaoEncontrada() {
  const catalogo = await carregarCatalogo()
  return (
    <>
      <Nav gaveta={montarGaveta(catalogo)} />
      <main id="conteudo" className="scroll-mt-24">
        <div className="topo-catalogo superficie-escura">
          <div className="wrap">
            <p className="rotulo-secao">Erro 404</p>
            <h1 className="topo-catalogo__titulo">Página não encontrada</h1>
            <p className="topo-catalogo__lead">Este endereço não existe ou mudou. As receitas continuam no catálogo.</p>
            <div className="topo-catalogo__acoes">
              <BotaoRetro href={CAMINHO_CATALOGO}>Ver o catálogo</BotaoRetro>
              <LinkSublinhado href="/">Voltar ao início</LinkSublinhado>
            </div>
          </div>
        </div>
        <Camadas estrato="heroCardapio" />
      </main>
      <Footer linhas={linhasComProduto(catalogo)} />
    </>
  )
}
