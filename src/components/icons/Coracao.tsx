/**
 * O coracao da marca, desenhado. O caractere U+2665 pode virar emoji
 * colorido em alguns celulares; o SVG tem sempre a cor do texto.
 */
export function Coracao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 20.6s-7.6-4.7-7.6-10.3a4.3 4.3 0 0 1 7.6-2.7 4.3 4.3 0 0 1 7.6 2.7c0 5.6-7.6 10.3-7.6 10.3z" />
    </svg>
  )
}
