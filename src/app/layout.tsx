import type { Metadata, Viewport } from 'next'
import { Bodoni_Moda, Parisienne, Jost } from 'next/font/google'
import './globals.css'

const bodoni = Bodoni_Moda({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  preload: true,
  variable: '--fonte-bodoni',
})

const parisienne = Parisienne({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--fonte-parisienne',
})

const jost = Jost({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  preload: false,
  variable: '--fonte-jost',
})

export const metadata: Metadata = {
  title: 'AMO — Bolos no pote zero açúcar',
  description:
    'Sete sabores de bolo no pote, montados à mão, cozidos a vapor e adoçados com eritritol e stevia. Para quem ama comer bem.',
}

export const viewport: Viewport = {
  themeColor: '#C3CDB4',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${bodoni.variable} ${parisienne.variable} ${jost.variable}`}
    >
      <body>
        {/* Sem JavaScript, a hidratação nunca acontece — o HTML do servidor
            fica congelado no estado `initial` que o Motion já grava inline
            (opacity:0 no Reveal, no hero e nas 3 faixas). `whileInView` e
            `animate` nunca disparam sem React vivo, então título, parágrafos
            e CTAs do Hero e todo <Reveal> da página ficam permanentemente em
            branco — metade visível é só a barra de anúncio, a nav, o rodapé
            e o que não passa por Motion. `!important` é necessário: bate a
            especificidade do style inline que o SSR do Motion escreveu, sem
            precisar tocar na coreografia (spec §6.1) nem no orçamento de
            performance dela (spec §14.8) — ambas seguem intactas quando JS
            carrega normalmente. `data-anim` marca cada elemento animado do
            Hero e de <Reveal>; `data-faixa` já marcava as 3 faixas do H1. */}
        <noscript>
          <style>{`
            [data-anim],
            [data-faixa] {
              opacity: 1 !important;
              transform: none !important;
            }
          `}</style>
        </noscript>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-cream"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  )
}
