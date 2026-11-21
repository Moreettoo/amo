import Image from 'next/image'
import { Coracao } from '@/components/icons/Coracao'
import { caminhoDaLinha } from '@/lib/visao'

const ANCORAS = [
  { href: '/#marca', rotulo: 'A marca' },
  { href: '/#rotulos', rotulo: 'O que é saudável aqui' },
  { href: '/#hoje', rotulo: 'Hoje o dia pede' },
] as const

type Props = {
  linhas: readonly { slug: string; nome: string }[]
}

/** O coracao que entra na frente do link. Decorativo: fica fora do nome. */
function CoracaoDoLink() {
  return (
    <span className="rodape-link__cor" aria-hidden="true">
      <Coracao />
    </span>
  )
}

/**
 * Rodape. A coluna de contato volta quando houver contato de verdade: o
 * provisorio ("(00) 00000-0000") era a ultima coisa que a visitante via.
 */
export function Footer({ linhas }: Props) {
  return (
    <footer className="rodape">
      <div className="wrap">
        <div className="rodape__grade">
          <div className="rodape__logo">
            {/* Lazy de proposito. O aviso de LCP do next/image so vale para
                imagem lazy: em tela curta e sem foto (a porta da conta, o 404)
                este logo e o maior elemento visivel e o aviso aparece em
                desenvolvimento. Eager, ele baixaria em toda pagina longa,
                onde fica longe da primeira tela. O logo da Nav ja nasce eager. */}
            <Image
              src="/marca/logo-amo-lockup.png"
              alt="AMO Sabores Saudáveis · para quem ama comer bem"
              width={2372}
              height={1365}
              loading="lazy"
              sizes="230px"
              className="h-auto w-[200px] min-[821px]:w-[230px]"
            />
          </div>
          <div>
            <h2 id="rodape-linhas">Linhas</h2>
            <ul aria-labelledby="rodape-linhas">
              {linhas.map((l) => (
                <li key={l.slug}>
                  <a href={caminhoDaLinha(l.slug)} className="rodape-link">
                    <CoracaoDoLink />
                    {l.nome}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 id="rodape-marca">A marca</h2>
            <ul aria-labelledby="rodape-marca">
              {ANCORAS.map((a) => (
                <li key={a.href}>
                  <a href={a.href} className="rodape-link">
                    <CoracaoDoLink />
                    {a.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="rodape__copy">
          © 2026 <span translate="no">AMO</span> Sabores Saudáveis
        </p>
      </div>
    </footer>
  )
}
