'use client'

import { useNaTela } from '@/components/ui/useNaTela'

type Cor = 'expresso' | 'cobre' | 'caramelo' | 'creme'
type Estrato = { fundo: Cor; camadas: readonly { cor: Cor; d: string }[] }

/**
 * Os estratos entre secoes: as camadas do bolo vistas pelo vidro do pote.
 * O fundo e a cor da secao de cima; a ultima camada e a cor da de baixo.
 */
export const ESTRATOS = {
  heroCardapio: {
    fundo: 'expresso',
    camadas: [
      { cor: 'cobre', d: 'M0,22 C140,6 250,34 410,22 C590,8 700,38 870,22 C1010,10 1110,30 1200,16 L1200,64 L0,64 Z' },
      { cor: 'caramelo', d: 'M0,32 C160,16 280,44 440,32 C610,18 740,48 900,32 C1030,20 1120,40 1200,28 L1200,64 L0,64 Z' },
      { cor: 'creme', d: 'M0,42 C170,28 300,56 460,44 C630,30 760,58 920,42 C1040,32 1130,50 1200,40 L1200,64 L0,64 Z' },
    ],
  },
  cardapioHoje: {
    fundo: 'creme',
    camadas: [
      { cor: 'caramelo', d: 'M0,30 C180,48 300,14 480,30 C640,44 780,12 960,28 C1060,36 1140,22 1200,30 L1200,64 L0,64 Z' },
    ],
  },
  hojeRotulos: {
    fundo: 'caramelo',
    camadas: [
      { cor: 'expresso', d: 'M0,26 C150,40 270,10 450,26 C620,40 760,8 930,24 C1050,34 1130,18 1200,26 L1200,64 L0,64 Z' },
    ],
  },
  rotulosMarca: {
    fundo: 'expresso',
    camadas: [
      { cor: 'creme', d: 'M0,34 C170,18 290,46 460,32 C630,18 770,48 940,32 C1060,22 1140,40 1200,30 L1200,64 L0,64 Z' },
    ],
  },
} as const satisfies Record<string, Estrato>

/**
 * As camadas assentam com mola quando o divisor entra na tela. `fill` vai
 * por style porque var() em atributo de apresentacao do SVG nao e confiavel
 * entre navegadores.
 */
export function Camadas({ estrato }: { estrato: keyof typeof ESTRATOS }) {
  const { fundo, camadas } = ESTRATOS[estrato]
  const [ref, visto] = useNaTela<HTMLDivElement>()
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`camadas${visto ? ' play' : ''}`}
      style={{ backgroundColor: `var(--color-${fundo})` }}
    >
      {camadas.map((c) => (
        <svg key={c.d} viewBox="0 0 1200 64" preserveAspectRatio="none">
          <path d={c.d} style={{ fill: `var(--color-${c.cor})` }} />
        </svg>
      ))}
    </div>
  )
}
