/**
 * A tarja de rodape impressa no rotulo, citada em cheio.
 *
 * Estatica de proposito. Marquee e autoplay acima de 5 s (exigiria controle de
 * pausa pelas guidelines) e e tell de template. Tarja tem borda reta e texto
 * parado, que e o que a embalagem faz.
 *
 * A superficie e rosewood-forte, nao rosewood puro. Cream sobre #B9707A media
 * 3.35:1: passa o piso de 3:1 de texto grande e reprova o de 4.5:1, e passar
 * raspando no piso mais permissivo e o pior lugar pra deixar a unica faixa
 * colorida da pagina. Em #9B5E66 da 4.52:1, AA cheio em qualquer corpo.
 *
 * O display uniforme ajuda aqui de graca: o que a razao de contraste nao media
 * era a haste fina do didone em caixa alta, que sumia sobre o rosa antes de o
 * numero reprovar. Um slab de espessura unica nao tem haste fina pra sumir.
 */
export function FaixaAssinatura() {
  return (
    <div className="bg-rosewood-forte px-5 py-10 text-center md:py-14">
      <p className="font-display text-[clamp(1.125rem,2.4vw,2rem)] uppercase leading-tight tracking-[0.06em] text-cream">
        Um abraço em forma de sobremesa{' '}
        <span aria-hidden="true" className="opacity-70">
          ✦
        </span>
      </p>
    </div>
  )
}
