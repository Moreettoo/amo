import type { Metadata, Viewport } from 'next'
import { Bree_Serif, Parisienne, Poppins } from 'next/font/google'
import { RolagemSuave } from '@/components/RolagemSuave'
import './globals.css'

/**
 * O display saiu do Bodoni Moda.
 *
 * Bodoni e um didone: haste grossa com filete fino no mesmo caractere, e e
 * exatamente esse contraste que o cliente rejeitou. Bree Serif e um slab de
 * traco praticamente uniforme, entao a letra tem uma espessura so. Continua
 * sendo serifada, o que mantem a relacao com o "A" serifado do logo, e e
 * quente e artesanal em vez de editorial fria.
 *
 * Peso unico (400), de proposito: nao existe 500 nem 600 nesta familia, e
 * pedir um peso que nao existe faria o navegador engordar o desenho por
 * sintese, que e justamente como se estraga um slab. Onde antes havia
 * `font-medium`/`font-semibold` em cima do display, o peso foi removido.
 *
 * `preload` porque ela esta no H1, acima da dobra.
 */
const bree = Bree_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
  preload: true,
  variable: '--fonte-bree',
})

const parisienne = Parisienne({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--fonte-parisienne',
})

/**
 * A sans da referencia. O lunarossa.framer.website usa Poppins 400/500/600
 * em todo corpo e rotulo, e o motivo de trocar o Jost por ela e medido, nao
 * estetico: a altura-x da Poppins e bem maior no mesmo corpo, e era
 * exatamente no rotulo pequeno em caixa alta que a pagina ficava dificil de
 * ler. Poppins nao e variavel, entao os pesos vao listados.
 */
const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
  variable: '--fonte-poppins',
})

export const metadata: Metadata = {
  title: 'AMO · Bolos no pote zero açúcar',
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
      className={`${bree.variable} ${parisienne.variable} ${poppins.variable}`}
    >
      <body>
        {/* Sem JavaScript, a hidratacao nunca acontece: o HTML do servidor
            fica congelado no estado `initial` que o Motion já grava inline
            (opacity:0 no Reveal, no hero e nas 3 faixas). `whileInView` e
            `animate` nunca disparam sem React vivo, entao titulo, paragrafos
            e CTAs do Hero e todo <Reveal> da pagina ficariam permanentemente
            em branco; metade visivel seria só a barra de anuncio, a nav, o
            rodape e o que nao passa por Motion. `!important` e necessario:
            bate a especificidade do style inline que o SSR do Motion
            escreveu, sem precisar tocar na coreografia (spec §6.1) nem no
            orcamento de performance dela (spec §14.8), que seguem intactas
            quando JS carrega normalmente. `data-anim` marca cada elemento
            animado do Hero e de <Reveal>; `data-faixa` marca as 3 faixas do
            H1. `data-cortina` marca a foto da lista pinada, que sem JS ficaria
            recortada pelo clip-path inicial da cortina. */}
        <noscript>
          <style>{`
            [data-anim],
            [data-faixa] {
              opacity: 1 !important;
              transform: none !important;
            }
            [data-cortina] {
              animation: none !important;
              clip-path: none !important;
            }
          `}</style>
        </noscript>
        <RolagemSuave />
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
