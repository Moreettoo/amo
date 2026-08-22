import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main id="conteudo" />
      <Footer />
    </>
  )
}
