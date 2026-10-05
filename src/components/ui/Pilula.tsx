import type { ComponentProps } from 'react'

type Extras = {
  /** padrao: contorno expresso. selo: tracejado cobre. clara: para fundo escuro */
  variante?: 'padrao' | 'selo' | 'clara'
  /** cheia sem depender de aria-pressed (a pilula da vontade ativa) */
  ativa?: boolean
}

function classes(variante: Extras['variante'] = 'padrao', ativa = false, extra?: string) {
  return ['pilula', variante !== 'padrao' && `pilula--${variante}`, ativa && 'ativa', extra]
    .filter(Boolean)
    .join(' ')
}

/**
 * A pilula que enche de baixo pra cima. Cheia quando `aria-pressed`,
 * `aria-selected` ou `ativa`; o CSS le o proprio atributo de estado, entao
 * o visual nunca desencontra do que o leitor de tela anuncia.
 */
export function Pilula({ variante, ativa, className, type = 'button', ...resto }: ComponentProps<'button'> & Extras) {
  return <button type={type} {...resto} className={classes(variante, ativa, className)} />
}

export function PilulaLink({ variante, ativa, className, ...resto }: ComponentProps<'a'> & Extras) {
  return <a {...resto} className={classes(variante, ativa, className)} />
}
