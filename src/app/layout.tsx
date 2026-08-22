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
