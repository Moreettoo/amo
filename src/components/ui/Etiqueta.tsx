/**
 * O badge elíptico — cita a etiqueta oval pendurada no barbante do pote.
 *
 * Elipse é rótulo, pill é ação. A forma diz se aquilo é informação ou botão,
 * então este componente nunca pode virar interativo.
 */
type Props = {
  children: React.ReactNode
  className?: string
}

export function Etiqueta({ children, className }: Props) {
  return (
    <span
      className={
        'inline-block rounded-[50%] border border-ink/25 px-6 py-2 ' +
        'font-sans text-[0.6875rem] font-medium uppercase tracking-[0.18em] ' +
        `text-ink/70 ${className ?? ''}`
      }
    >
      {children}
    </span>
  )
}
