import Image from 'next/image'
import Link from 'next/link'
import { SABORES } from '@/data/sabores'

const ANCORAS = [
  { href: '#marca', rotulo: 'A marca' },
  { href: '#ritual', rotulo: 'O ritual' },
  { href: '#selos', rotulo: 'Os selos' },
] as const

export function Footer() {
  return (
    <footer className="bg-ink px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1280px]">
        <Image
          src="/marca/logo-amo-lockup.png"
          alt="AMO Sabores Saudáveis — para quem ama comer bem"
          width={260}
          height={170}
          className="h-auto w-[200px] md:w-[240px]"
        />

        <hr className="my-10 border-cream/15" />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h2
              id="rodape-sabores"
              className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-cream/60"
            >
              Sabores
            </h2>
            <ul aria-labelledby="rodape-sabores" className="mt-4 flex flex-col gap-2">
              {SABORES.map((s) => (
                <li key={s.slug} className="font-sans text-sm text-cream/85">
                  <span translate="no">{s.nome}</span> · {s.sabor}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2
              id="rodape-marca"
              className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-cream/60"
            >
              A marca
            </h2>
            <ul aria-labelledby="rodape-marca" className="mt-4 flex flex-col gap-2">
              {ANCORAS.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="font-sans text-sm text-cream/85 hover:text-cream"
                  >
                    {a.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2
              id="rodape-contato"
              className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-cream/60"
            >
              Contato
            </h2>
            <ul aria-labelledby="rodape-contato" className="mt-4 flex flex-col gap-2">
              <li className="font-sans text-sm text-cream/85">contato@amo.com.br</li>
              <li className="font-sans text-sm text-cream/85">@amo</li>
              <li className="font-sans text-sm text-cream/85">(00) 00000-0000</li>
            </ul>
            <p className="mt-4 font-sans text-xs text-cream/45">
              Contato provisório, a definir.
            </p>
          </div>
        </div>

        <hr className="my-10 border-cream/15" />

        <p className="font-sans text-xs text-cream/50">
          © 2026 <span translate="no">AMO</span> Sabores Saudáveis
        </p>
      </div>
    </footer>
  )
}
