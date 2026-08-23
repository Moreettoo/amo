import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { Selos } from '@/components/sections/Selos'
import { AMarca } from '@/components/sections/AMarca'
import { Sabores } from '@/components/sections/Sabores'
import { Ritual } from '@/components/sections/Ritual'
import { ListaPinada } from '@/components/sections/ListaPinada'
import { Bento } from '@/components/sections/Bento'
import { FaixaAssinatura } from '@/components/sections/FaixaAssinatura'
import { CtaFinal } from '@/components/sections/CtaFinal'

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main id="conteudo" className="scroll-mt-28">
        <Hero />
        <Selos />
        <AMarca />
        <Sabores />
        <Ritual />
        <ListaPinada />
        <Bento />
        <FaixaAssinatura />
        <CtaFinal />
      </main>
      <Footer />
    </>
  )
}
