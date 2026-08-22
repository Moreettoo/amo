import Link from 'next/link'

type Props = {
  children: React.ReactNode
  /** âncora interna. Sem href o componente vira <button> */
  href?: string
  className?: string
}

const BASE =
  'inline-flex items-center gap-2 rounded-full bg-rosewood-forte px-7 py-3.5 ' +
  'font-sans text-sm font-medium tracking-wide text-cream ' +
  'transition-[background-color,transform] duration-200 ' +
  'hover:bg-ink hover:-translate-y-0.5 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-rosewood-forte'

export function Pill({ children, href, className }: Props) {
  const classe = `${BASE} ${className ?? ''}`

  if (href) {
    return (
      <Link href={href} className={classe}>
        {children}
        <span aria-hidden="true">→</span>
      </Link>
    )
  }

  return (
    <button type="button" className={classe}>
      {children}
    </button>
  )
}
