import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { Selos } from '@/components/sections/Selos'
import { AMarca } from '@/components/sections/AMarca'

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main id="conteudo">
        <Hero />
        <Selos />
        <AMarca />
      </main>
      <Footer />
    </>
  )
}
