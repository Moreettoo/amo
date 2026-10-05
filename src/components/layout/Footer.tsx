'use client'

import Image from 'next/image'
import { useFiltro } from '@/components/FiltroProvider'

const ANCORAS = [
  { href: '#marca', rotulo: 'A marca' },
  { href: '#rotulos', rotulo: 'O que é saudável aqui' },
  { href: '#hoje', rotulo: 'Hoje o dia pede' },
] as const

type Props = {
  linhas: readonly { slug: string; nome: string }[]
  /** so aplica o filtro de linha quando ele existe na tela */
  filtraLinha: boolean
}

/** O coracao que cresce na frente do link. Decorativo: fica fora do nome. */
function Coracao() {
  return (
    <span className="rodape-link__cor" aria-hidden="true">
      ♥
    </span>
  )
}

export function Footer({ linhas, filtraLinha }: Props) {
  const { definir } = useFiltro()
  return (
    <footer className="rodape grao">
      <div className="wrap">
        <div className="rodape__grade">
          <div className="rodape__logo">
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
                  <a
                    href="#cardapio"
                    className="rodape-link"
                    onClick={filtraLinha ? () => definir({ linha: l.slug, selo: null, vontade: null }) : undefined}
                  >
                    <Coracao />
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
                    <Coracao />
                    {a.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 id="rodape-contato">Contato</h2>
            <ul aria-labelledby="rodape-contato">
              <li className="rodape__texto">contato@amo.com.br</li>
              <li className="rodape__texto">@amo</li>
              <li className="rodape__texto">(00) 00000-0000</li>
            </ul>
            <p className="rodape__aviso">Contato provisório, a definir.</p>
          </div>
        </div>

        <p className="rodape__copy">
          © 2026 <span translate="no">AMO</span> Sabores Saudáveis
        </p>
      </div>
    </footer>
  )
}
