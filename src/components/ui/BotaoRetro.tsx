import type { ComponentProps } from 'react'

type Props = ComponentProps<'a'> & {
  /** expresso com texto creme, para fundo claro */
  escuro?: boolean
  /** a versao da nav */
  compacto?: boolean
}

/**
 * O botao: retangulo de canto 2 px, sem sombra. No hover e no foco ele
 * inverte e vira contorno; a largura nao muda, para nao empurrar o que esta
 * ao lado. O nome do componente e da classe ficou da v2.
 */
export function BotaoRetro({ escuro, compacto, className, children, ...resto }: Props) {
  const classes = [
    'btn-retro',
    escuro && 'btn-retro--escuro',
    compacto && 'btn-retro--compacto',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <a {...resto} className={classes}>
      {children}
    </a>
  )
}
