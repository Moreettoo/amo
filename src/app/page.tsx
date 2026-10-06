import { FiltroProvider } from '@/components/FiltroProvider'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { AMarca } from '@/components/sections/AMarca'
import { Cardapio } from '@/components/sections/Cardapio'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { Final } from '@/components/sections/Final'
import { Hero } from '@/components/sections/Hero'
import { HojeODiaPede } from '@/components/sections/HojeODiaPede'
import { Rotulos } from '@/components/sections/Rotulos'
import { Camadas } from '@/components/ui/Camadas'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarGaveta, montarVisao } from '@/lib/visao'

/**
 * A home. Server Component: carrega o cadastro, decide uma vez o que
 * aparece (montarVisao) e entrega dados prontos para as secoes. O
 * FiltroProvider envolve o <main> e o rodape, que tambem filtra.
 */
export default async function Home() {
  const catalogo = await carregarCatalogo()
  const visao = montarVisao(catalogo)
  return (
    <FiltroProvider>
      <Nav gaveta={montarGaveta(catalogo)} />
      <main id="conteudo" className="scroll-mt-24">
        <Hero palco={visao.palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />
        <Camadas estrato="heroCardapio" />
        <Cardapio
          produtos={visao.produtos}
          tipos={visao.tipos}
          nomesDosSelos={visao.nomesDosSelos}
          filtrosLinha={visao.filtrosLinha}
          filtrosSelo={visao.filtrosSelo}
          vontades={visao.vontades}
        />
        <Camadas estrato="cardapioHoje" />
        <HojeODiaPede vontades={visao.vontades} tipos={visao.tipos} />
        <Camadas estrato="hojeRotulos" />
        <Rotulos linhas={visao.rotulos} nomesDosSelos={visao.nomesDosSelos} />
        <Camadas estrato="rotulosMarca" />
        <AMarca foto={visao.fotoDaMarca} />
        <FaixaCobre />
        <Final linhas={visao.linhasNoFinal} />
      </main>
      <Footer linhas={visao.rotulos} filtraLinha={visao.filtrosLinha.length > 0} />
    </FiltroProvider>
  )
}
