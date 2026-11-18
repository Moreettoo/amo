import type { Metadata, Viewport } from 'next'
import { Allura, Poppins } from 'next/font/google'
import { InlineScript, MARCAR_JS } from '@/components/InlineScript'
import { RolagemSuave } from '@/components/RolagemSuave'
import './globals.css'

/**
 * Script. Allura: limpa e facil de ler, entre a caligrafia formal e a
 * assinatura (escolha do cliente em 2026-11-18, entre quatro scripts
 * gratuitas). So entra em frases curtas: o "comer bem." do H1, a frase de cada
 * secao e a palavra do Hoje o dia pede. `preload` porque esta no H1.
 */
const script = Allura({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
  preload: true,
  variable: '--fonte-script',
})

/**
 * Texto e titulos. Poppins nao e variavel: os quatro pesos que a pagina usa
 * (300 nos titulos, 400 no corpo, 500 e 600 nos rotulos) vem declarados.
 */
const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  preload: true,
  variable: '--fonte-poppins',
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
      className={`${script.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={MARCAR_JS} />
      </head>
      <body>
        <RolagemSuave>
          <a
            href="#conteudo"
            className="superficie-escura sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-expresso focus:px-5 focus:py-3 focus:text-sm focus:text-creme"
          >
            Pular para o conteúdo
          </a>
          {children}
        </RolagemSuave>
      </body>
    </html>
  )
}
