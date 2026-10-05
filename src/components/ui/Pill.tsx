type Props = {
  children: React.ReactNode
  /** ancora interna. Sem href o componente vira <button> */
  href?: string
  className?: string
}

const BASE =
  'inline-flex items-center gap-2 rounded-full bg-rosewood-forte px-7 py-4 ' +
  'font-sans text-[0.78125rem] font-semibold uppercase tracking-[0.1em] text-cream ' +
  'transition-[background-color,transform] duration-200 ' +
  'hover:bg-ink hover:-translate-y-0.5 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-rosewood-forte'

export function Pill({ children, href, className }: Props) {
  const classe = `${BASE} ${className ?? ''}`

  if (href) {
    // <a> puro, nao next/link. Para ancora na mesma pagina o Link nao traz
    // nada (nao ha rota pra prefetch) e traz um problema: ele roda o proprio
    // scroll via scrollIntoView, o que brigaria com a interpolacao do Lenis
    // pelo mesmo scrollTop. Os docs do Next confirmam o comportamento e
    // confirmam que o Link renderiza justamente um <a>.
    return (
      <a href={href} className={classe}>
        {children}
        <span aria-hidden="true">→</span>
      </a>
    )
  }

  return (
    <button type="button" className={classe}>
      {children}
    </button>
  )
}
