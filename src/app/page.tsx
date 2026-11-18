import { Fio } from '@/components/layout/Fio'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { AMarca } from '@/components/sections/AMarca'
import { Final } from '@/components/sections/Final'
import { Hero } from '@/components/sections/Hero'
import { HojeODiaPede } from '@/components/sections/HojeODiaPede'
import { Rotulos } from '@/components/sections/Rotulos'
import { Vitrine } from '@/components/sections/Vitrine'
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
      <main id="conteudo" className="relative scroll-mt-24">
        <Fio />
        <Hero palco={visao.palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />
        <Vitrine
          produtos={visao.vitrine}
          linhas={visao.linhasNaVitrine}
          total={visao.total}
          tipos={visao.tipos}
          nomesDosSelos={visao.nomesDosSelos}
        />
        <HojeODiaPede vontades={visao.vontades} tipos={visao.tipos} />
        <Rotulos linhas={visao.rotulos} nomesDosSelos={visao.nomesDosSelos} />
        <AMarca foto={visao.fotoDaMarca} />
        <Final linhas={visao.linhasNoFinal} foto={visao.fotoDoFinal} />
      </main>
      <Footer linhas={visao.rotulos} />
    </>
  )
}
