import 'server-only'
import { RolarAteAtual } from '@/components/conta/FormsDaConta'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import type { Usuario } from '@/lib/auth'
import { sair } from '@/lib/auth/acoes'
import type { ImagemProduto } from '@/lib/catalogo'
import { primeiroNome } from '@/lib/conta/textos'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { linhasComProduto, montarGaveta } from '@/lib/visao'

/**
 * A casca de Minha conta: o sumario da conta preso a esquerda, como o do
 * catalogo (.impeccable/surfaces/src-app-conta-page-tsx.md), e a tela da
 * parte escolhida a direita. Cada item do sumario e uma pagina: o atual sai
 * do servidor, sem JavaScript. No celular o sumario vira a fileira de
 * etiquetas presa embaixo da nav.
 */

export type ParteDaConta = 'pedido' | 'pedidos' | 'perfil' | 'enderecos' | 'acesso'

const PARTES: { parte: ParteDaConta; href: string; rotulo: string }[] = [
  { parte: 'pedido', href: '/conta', rotulo: 'Pedido atual' },
  { parte: 'pedidos', href: '/conta/pedidos', rotulo: 'Pedidos' },
  { parte: 'perfil', href: '/conta/perfil', rotulo: 'Seus dados' },
  { parte: 'enderecos', href: '/conta/perfil/enderecos', rotulo: 'Endereços' },
  { parte: 'acesso', href: '/conta/perfil/email-e-senha', rotulo: 'E-mail e senha' },
]

export type DadosDoPainel = Awaited<ReturnType<typeof lerDadosDoPainel>>

/** A loja para a nav e o rodape, e a foto de cada sabor (as miniaturas dos pedidos). */
export async function lerDadosDoPainel() {
  const catalogo = await carregarCatalogo()
  return {
    gaveta: montarGaveta(catalogo),
    linhas: linhasComProduto(catalogo),
    fotos: new Map<string, ImagemProduto>(catalogo.produtos.map((p) => [p.slug, p.imagem])),
  }
}

type Props = { atual: ParteDaConta; usuario: Usuario; dados: DadosDoPainel; children: React.ReactNode }

export function PainelDaConta({ atual, usuario, dados, children }: Props) {
  return (
    <>
      <Nav gaveta={dados.gaveta} />
      <div className="painel-pagina">
        <div className="wrap painel">
          <aside className="painel__lado">
            <p className="painel__ola">
              <b>Olá, {primeiroNome(usuario.nome)}</b>
              <span>{usuario.email}</span>
            </p>
            <nav aria-label="Sua conta" className="painel__sumario">
              <p className="painel__rotulo" aria-hidden="true">
                Sua conta
              </p>
              <ul className="painel__trilho">
                {PARTES.map(({ parte, href, rotulo }) => (
                  <li key={parte} className={parte === atual ? 'painel__item painel__item--atual' : 'painel__item'}>
                    <a href={href} aria-current={parte === atual ? 'page' : undefined}>
                      {rotulo}
                    </a>
                    {parte === atual ? <span className="painel__coracao" aria-hidden="true" /> : null}
                  </li>
                ))}
              </ul>
              <RolarAteAtual />
              <form action={sair} className="painel__sair">
                <button type="submit">Sair</button>
              </form>
            </nav>
          </aside>
          <main id="conteudo" className="painel__tela scroll-mt-24">
            {children}
          </main>
        </div>
      </div>
      <Footer linhas={dados.linhas} />
    </>
  )
}

type CabecaProps = {
  titulo: React.ReactNode
  /** a segunda voz, em script e em minuscula */
  frase: string
  /** o que acompanha o titulo, a direita pela base (no celular, embaixo) */
  lado?: React.ReactNode
  /** a volta para a lista, em cima do titulo */
  trilha?: { href: string; rotulo: string; atual: string }
}

/** O titulo em duas vozes de cada tela da conta. */
export function CabecaDaConta({ titulo, frase, lado, trilha }: CabecaProps) {
  return (
    <header className="painel__cabeca">
      <div>
        {trilha ? (
          <nav aria-label="Trilha" className="painel__trilha">
            <a href={trilha.href}>{trilha.rotulo}</a>
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M3.5 1.5 7 5l-3.5 3.5" />
            </svg>
            <span aria-current="page">{trilha.atual}</span>
          </nav>
        ) : null}
        <h1 className="painel__titulo">
          {titulo} <em>{frase}</em>
        </h1>
      </div>
      {lado ? <div className="painel__junto">{lado}</div> : null}
    </header>
  )
}
