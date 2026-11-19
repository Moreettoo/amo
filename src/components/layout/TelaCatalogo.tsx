import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { CatalogoPagina } from '@/components/sections/CatalogoPagina'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { TopoCatalogo } from '@/components/sections/TopoCatalogo'
import type { Linha } from '@/lib/catalogo'
import type { DadosGaveta, VistaCatalogo } from '@/lib/visao'

type Props = {
  vista: VistaCatalogo
  gaveta: DadosGaveta
  /** as linhas com produto, para o rodape */
  linhas: readonly Linha[]
}

/**
 * A pagina do catalogo montada: a rota so carrega o cadastro e chama esta
 * tela. Creme do topo ao corpo, ela termina como a home: um bloco expresso
 * com a assinatura da marca.
 */
export function TelaCatalogo({ vista, gaveta, linhas }: Props) {
  return (
    <>
      <Nav gaveta={gaveta} />
      <main id="conteudo" className="scroll-mt-24">
        <TopoCatalogo vista={vista} />
        <CatalogoPagina vista={vista} />
        <div className="catalogo__fecho superficie-escura">
          <FaixaCobre />
        </div>
      </main>
      <Footer linhas={linhas} />
    </>
  )
}
