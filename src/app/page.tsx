import { FiltroProvider } from '@/components/FiltroProvider'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { Hero } from '@/components/sections/Hero'
import { Camadas } from '@/components/ui/Camadas'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'

/**
 * A home. Server Component: carrega o cadastro, decide uma vez o que
 * aparece (montarVisao) e entrega dados prontos para as secoes.
 */
export default async function Home() {
  const visao = montarVisao(await carregarCatalogo())
  return (
    <FiltroProvider>
      <Nav />
      <main id="conteudo" className="scroll-mt-24">
        <Hero palco={visao.palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />
        <Camadas estrato="heroCardapio" />
      </main>
      <Footer linhas={visao.rotulos} filtraLinha={visao.filtrosLinha.length > 0} />
    </FiltroProvider>
  )
}
