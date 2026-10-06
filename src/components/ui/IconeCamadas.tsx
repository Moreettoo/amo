/** Tres ondas, as camadas do bolo vistas pelo vidro: o icone do catalogo. */
export function IconeCamadas({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 7c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
      <path d="M3 12c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
      <path d="M3 17c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
    </svg>
  )
}
