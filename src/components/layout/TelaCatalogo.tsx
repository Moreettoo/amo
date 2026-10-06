import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { CatalogoPagina } from '@/components/sections/CatalogoPagina'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { TopoCatalogo } from '@/components/sections/TopoCatalogo'
import { Camadas } from '@/components/ui/Camadas'
import type { Linha } from '@/lib/catalogo'
import type { DadosGaveta, VistaCatalogo } from '@/lib/visao'

type Props = {
  vista: VistaCatalogo
  gaveta: DadosGaveta
  /** as linhas com produto, para o rodape */
  linhas: readonly Linha[]
}

/** A pagina do catalogo montada: as duas rotas so carregam o cadastro e
 *  chamam esta tela. */
export function TelaCatalogo({ vista, gaveta, linhas }: Props) {
  return (
    <>
      <Nav gaveta={gaveta} linhaAtual={vista.linha?.slug ?? null} />
      <main id="conteudo" className="scroll-mt-24">
        <TopoCatalogo vista={vista} />
        <Camadas estrato="heroCardapio" />
        <CatalogoPagina vista={vista} />
        <FaixaCobre />
      </main>
      <Footer linhas={linhas} />
    </>
  )
}
