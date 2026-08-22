import type { Selo } from '@/data/selos'

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
  focusable: 'false' as const,
}

/** folha com nervura: ingrediente escolhido a dedo */
const Ingredientes = () => (
  <svg {...base}>
    <path d="M12 21c0-6 3-11 8-13-1 8-4 12-8 13Z" />
    <path d="M12 21C8 20 5 16 4 8c5 2 8 7 8 13Z" />
    <path d="M12 21v-6" />
  </svg>
)

/** panela com vapor subindo */
const Vapor = () => (
  <svg {...base}>
    <path d="M4 13h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" />
    <path d="M9 9c0-1.2 1-1.8 1-3s-1-1.6-1-2.6" />
    <path d="M14 9c0-1.2 1-1.8 1-3s-1-1.6-1-2.6" />
  </svg>
)

/** o pote de vidro com coração — o próprio ícone da marca */
const Vidro = () => (
  <svg {...base}>
    <path d="M7 4h10M8 4v2.5L7 8v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8l-1-1.5V4" />
    <path d="M12 16c-1.6-1.2-2.6-2.1-2.6-3.1a1.3 1.3 0 0 1 2.6-.6 1.3 1.3 0 0 1 2.6.6c0 1-1 1.9-2.6 3.1Z" />
  </svg>
)

/** espiga de trigo: fibra */
const Fibras = () => (
  <svg {...base}>
    <path d="M12 21V9" />
    <path d="M12 9c0-2 1.4-3.6 3-4 .4 1.8-.6 3.6-3 4Z" />
    <path d="M12 9c0-2-1.4-3.6-3-4-.4 1.8.6 3.6 3 4Z" />
    <path d="M12 14c0-2 1.4-3.6 3-4 .4 1.8-.6 3.6-3 4Z" />
    <path d="M12 14c0-2-1.4-3.6-3-4-.4 1.8.6 3.6 3 4Z" />
  </svg>
)

/** gota cortada: adoça sem açúcar */
const Adocante = () => (
  <svg {...base}>
    <path d="M12 3.5c2.8 3.4 4.5 5.8 4.5 8.2a4.5 4.5 0 0 1-9 0c0-2.4 1.7-4.8 4.5-8.2Z" />
    <path d="M5 19 19 5" />
  </svg>
)

/** duas mãos: feito à mão */
const Artesanal = () => (
  <svg {...base}>
    <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M11 12V4.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M14 12V6.5a1.5 1.5 0 0 1 3 0V15a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-2a1.5 1.5 0 0 1 3 0" />
  </svg>
)

export const ICONES_SELO: Record<Selo['id'], () => React.JSX.Element> = {
  ingredientes: Ingredientes,
  vapor: Vapor,
  vidro: Vidro,
  fibras: Fibras,
  adocante: Adocante,
  artesanal: Artesanal,
}
