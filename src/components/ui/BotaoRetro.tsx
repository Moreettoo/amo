import type { ComponentProps } from 'react'

type Props = ComponentProps<'a'> & {
  /** expresso com texto creme, para fundo claro */
  escuro?: boolean
  /** a versao da nav */
  compacto?: boolean
}

/**
 * O botao retro: pilula com sombra solida de cobre. No hover (e no foco)
 * desce 2px, a sombra encolhe e um coracao entra; no clique afunda inteiro
 * na propria sombra. O coracao e decoracao e nao entra no nome do link.
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
      <span className="btn-retro__cor" aria-hidden="true">
        ♥
      </span>
    </a>
  )
}
