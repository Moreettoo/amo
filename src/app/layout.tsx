import type { Metadata, Viewport } from 'next'
import { Caprasimo, DM_Sans } from 'next/font/google'
import { InlineScript, MARCAR_JS } from '@/components/InlineScript'
import { RolagemSuave } from '@/components/RolagemSuave'
import './globals.css'

/**
 * Display. Caprasimo tem um peso so (400): e a letra gorda e redonda de
 * confeitaria de bairro que a direcao "retro doce" pede. `preload` porque
 * ela esta no H1, acima da dobra.
 */
const caprasimo = Caprasimo({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
  preload: true,
  variable: '--fonte-caprasimo',
})

/**
 * Texto. DM Sans e variavel em peso e em tamanho optico (`opsz`), entao o
 * corpo de 18 px e o rotulo de 13 px saem cada um com o desenho do seu
 * tamanho, sem baixar arquivo extra por peso.
 */
const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz'],
  display: 'swap',
  preload: true,
  variable: '--fonte-dm-sans',
})

export const metadata: Metadata = {
  title: 'AMO · Bolos no pote zero açúcar',
  description:
    'Sete sabores de bolo no pote, montados à mão, cozidos a vapor e adoçados com eritritol e stevia. Para quem ama comer bem.',
}

export const viewport: Viewport = {
  themeColor: '#2B1B16',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${caprasimo.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={MARCAR_JS} />
      </head>
      <body>
        <RolagemSuave />
        <a
          href="#conteudo"
          className="superficie-escura sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-expresso focus:px-5 focus:py-3 focus:text-sm focus:text-creme"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  )
}
