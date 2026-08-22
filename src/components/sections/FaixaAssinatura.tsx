/**
 * A tarja de rodapé impressa no rótulo, citada em cheio.
 *
 * Estática de propósito. Marquee é autoplay acima de 5 s — exigiria controle
 * de pausa pelas guidelines — e é tell de template. Tarja tem borda reta e
 * texto parado; é o que a embalagem faz.
 *
 * Superfície em rosewood puro (#B9707A): o texto aqui é Bodoni caps grande,
 * então cream sobre rosewood a 3.35:1 satisfaz o limite de texto grande (3:1).
 * Em texto de tamanho normal seria rosewood-forte.
 */
export function FaixaAssinatura() {
  return (
    <div className="bg-rosewood px-5 py-9 text-center md:py-12">
      <p className="font-display text-[clamp(1.125rem,2.6vw,2.25rem)] uppercase leading-tight tracking-[0.06em] text-cream">
        Um abraço em forma de sobremesa{' '}
        <span aria-hidden="true" className="opacity-70">
          ✦
        </span>
      </p>
    </div>
  )
}
