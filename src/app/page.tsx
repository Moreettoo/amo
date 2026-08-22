import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main id="conteudo">
        <Hero />
      </main>
      <Footer />
    </>
  )
}
