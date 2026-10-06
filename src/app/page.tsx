import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { AMarca } from '@/components/sections/AMarca'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { Final } from '@/components/sections/Final'
import { Hero } from '@/components/sections/Hero'
import { HojeODiaPede } from '@/components/sections/HojeODiaPede'
import { Rotulos } from '@/components/sections/Rotulos'
import { Vitrine } from '@/components/sections/Vitrine'
import { Camadas } from '@/components/ui/Camadas'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarGaveta, montarVisao } from '@/lib/visao'

/**
 * A home. Server Component: carrega o cadastro, decide uma vez o que
 * aparece (montarVisao) e entrega dados prontos para as secoes. O filtro
 * mora no catalogo; aqui a vitrine e os atalhos so levam ate ele.
 */
export default async function Home() {
  const catalogo = await carregarCatalogo()
  const visao = montarVisao(catalogo)
  return (
    <>
      <Nav gaveta={montarGaveta(catalogo)} />
      <main id="conteudo" className="scroll-mt-24">
        <Hero palco={visao.palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />
        <Camadas estrato="heroCardapio" />
        <Vitrine
          produtos={visao.vitrine}
          linhas={visao.linhasNaVitrine}
          total={visao.total}
          tipos={visao.tipos}
          nomesDosSelos={visao.nomesDosSelos}
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
      <Footer linhas={visao.rotulos} />
    </>
  )
}
