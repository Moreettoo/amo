/**
 * A fronteira curva entre dois estratos da página.
 *
 * Cinco fronteiras, cinco curvas, nenhuma repetida — é a assinatura da spec
 * (§4): camada de sobremesa assenta torta, não reta. As três fronteiras que
 * ficam retas de propósito (anúncio→hero, bento→faixa, faixa→CTA) simplesmente
 * não usam este componente: tarja tem borda reta.
 */
const CURVAS = {
  // 1. hero → selos: onda suave subindo da esquerda para a direita
  1: 'M0,34 C200,10 360,54 560,38 C760,22 920,58 1120,42 C1280,29 1370,46 1440,36 L1440,80 L0,80 Z',
  // 2. sabores → ritual: uma barriga funda no meio
  2: 'M0,18 C240,26 400,66 720,58 C1040,50 1200,14 1440,24 L1440,80 L0,80 Z',
  // 3. ritual → lista: assimétrica, lobo grande à direita
  3: 'M0,44 C160,52 300,20 480,26 C700,33 880,68 1120,60 C1280,55 1360,30 1440,22 L1440,80 L0,80 Z',
  // 4. lista → bento: rasa, muitas ondulações curtas
  4: 'M0,30 C120,44 200,20 320,32 C440,44 520,22 640,34 C760,46 840,24 960,36 C1080,48 1180,26 1280,34 C1360,40 1400,30 1440,34 L1440,80 L0,80 Z',
  // 5. CTA final → footer: um único inchaço largo à esquerda do centro
  5: 'M0,52 C260,64 420,12 700,20 C980,28 1160,58 1440,44 L1440,80 L0,80 Z',
} as const

type Props = {
  n: keyof typeof CURVAS
  /** classe Tailwind de fill, ex. "fill-cream" — a cor do estrato de baixo */
  corDestino: string
  className?: string
}

export function Estrato({ n, corDestino, className }: Props) {
  return (
    <svg
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={`block h-8 w-full md:h-14 ${className ?? ''}`}
    >
      <path d={CURVAS[n]} className={corDestino} />
    </svg>
  )
}
