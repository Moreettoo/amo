import Image from 'next/image'
import { SABORES } from '@/data/sabores'

const ANCORAS = [
  { href: '#marca', rotulo: 'A marca' },
  { href: '#ritual', rotulo: 'O ritual' },
  { href: '#selos', rotulo: 'Os selos' },
] as const

const ROTULO = 'font-sans text-[0.78125rem] font-semibold uppercase tracking-[0.1em] text-cream/75'

export function Footer() {
  return (
    <footer className="bg-ink px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1280px]">
        {/* O lockup sobre um painel cream, nao direto sobre o ink.
            A arte do arquivo e cobre e marrom-escuro sobre transparencia, e o
            contorno do pote e quase preto: sobre ink, "SABORES SAUDAVEIS" e a
            linha caligrafica simplesmente desapareciam. Sem inventar uma
            versao clara da marca que o cliente nao entregou, a saida honesta e
            dar ao logo o fundo pra que ele foi desenhado. De quebra o painel
            arredondado cita a etiqueta de papel pendurada no pote. */}
        <div className="inline-block rounded-[20px] bg-cream px-7 py-6">
          <Image
            src="/marca/logo-amo-lockup.png"
            alt="AMO Sabores Saudáveis · para quem ama comer bem"
            width={2372}
            height={1365}
            loading="lazy"
            sizes="240px"
            className="h-auto w-[180px] md:w-[220px]"
          />
        </div>

        <hr className="my-10 border-cream/20" />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h2 id="rodape-sabores" className={ROTULO}>
              Sabores
            </h2>
            <ul aria-labelledby="rodape-sabores" className="mt-5 flex flex-col gap-2.5">
              {SABORES.map((s) => (
                <li key={s.slug} className="font-sans text-sm text-cream/90">
                  <span translate="no">{s.nome}</span> · {s.sabor}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 id="rodape-marca" className={ROTULO}>
              A marca
            </h2>
            <ul aria-labelledby="rodape-marca" className="mt-5 flex flex-col gap-2.5">
              {ANCORAS.map((a) => (
                <li key={a.href}>
                  {/* <a> puro: ancora na mesma pagina nao passa pelo router, e
                      o scroll dela e do Lenis. Ver Pill.tsx. */}
                  <a
                    href={a.href}
                    className="font-sans text-sm text-cream/90 transition-colors duration-200 hover:text-cream"
                  >
                    {a.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 id="rodape-contato" className={ROTULO}>
              Contato
            </h2>
            <ul aria-labelledby="rodape-contato" className="mt-5 flex flex-col gap-2.5">
              <li className="font-sans text-sm text-cream/90">contato@amo.com.br</li>
              <li className="font-sans text-sm text-cream/90">@amo</li>
              <li className="font-sans text-sm text-cream/90">(00) 00000-0000</li>
            </ul>
            {/* cream/45 media 3.96:1 e reprovava o piso de texto normal. /65
                da 6.5:1 e o aviso continua secundario pelo corpo, nao por
                estar apagado. */}
            <p className="mt-4 font-sans text-xs text-cream/65">
              Contato provisório, a definir.
            </p>
          </div>
        </div>

        <hr className="my-10 border-cream/20" />

        <p className="font-sans text-xs text-cream/65">
          © 2026 <span translate="no">AMO</span> Sabores Saudáveis
        </p>
      </div>
    </footer>
  )
}
