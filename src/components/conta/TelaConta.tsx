import 'server-only'
import { headers } from 'next/headers'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import type { Linha } from '@/lib/catalogo'
import { variavel } from '@/lib/dados/ambiente'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { linhasComProduto, montarGaveta, type DadosGaveta } from '@/lib/visao'

/**
 * O que toda tela da conta le no servidor: a loja (para a nav e o rodape), o
 * nonce desta visita (proxy.ts) e a chave publica do Turnstile.
 */
export async function lerDadosDaTela() {
  const catalogo = await carregarCatalogo()
  return {
    gaveta: montarGaveta(catalogo),
    linhas: linhasComProduto(catalogo),
    nonce: (await headers()).get('x-nonce') ?? '',
    chaveDoTurnstile: variavel('NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
  }
}

type Props = {
  gaveta: DadosGaveta
  /** as linhas com produto, para o rodape */
  linhas: readonly Linha[]
  titulo: string
  /** a segunda voz do titulo, em script */
  frase: string
  children: React.ReactNode
}

/**
 * A casca das telas da conta, a mesma de TelaSacola: a nav e o rodape do site,
 * uma coluna estreita centrada e o titulo em duas vozes (Poppins leve e a
 * frase em script).
 */
export function TelaConta({ gaveta, linhas, titulo, frase, children }: Props) {
  return (
    <>
      <Nav gaveta={gaveta} />
      <main id="conteudo" className="conta-pagina scroll-mt-24">
        <div className="wrap">
          <div className="conta">
            <h1 className="conta__titulo">
              {titulo} <em>{frase}</em>
            </h1>
            {children}
          </div>
        </div>
      </main>
      <Footer linhas={linhas} />
    </>
  )
}
