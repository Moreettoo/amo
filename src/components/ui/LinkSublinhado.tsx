import type { ComponentProps } from 'react'

/** Tres tracos a mao, para os links vizinhos nao sairem iguais. */
const TRACOS = [
  'M2,5 C20,8 40,2 60,6 C78,8 90,3 98,5',
  'M2,6 C25,2 45,8 65,4 C80,1 90,6 98,3',
  'M2,4 C22,7 42,2 62,5 C80,8 90,4 98,6',
] as const

type Props = ComponentProps<'a'> & { traco?: 0 | 1 | 2 }

/**
 * Link com o sublinhado desenhado a mao no hover e no foco.
 *
 * `pathLength=1` normaliza o comprimento do traco; com `stroke-dasharray:
 * 1 2` e `stroke-dashoffset: 1.1` o traco some inteiro, sem sobrar o ponto
 * que um dashoffset de exatamente 1 deixava na ponta arredondada.
 */
export function LinkSublinhado({ traco = 0, className, children, ...resto }: Props) {
  return (
    <a {...resto} className={`link-sub${className ? ` ${className}` : ''}`}>
      {children}
      <svg className="link-sub__traco" viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d={TRACOS[traco]} />
      </svg>
    </a>
  )
}
