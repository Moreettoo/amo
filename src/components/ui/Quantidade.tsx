'use client'

import { MAXIMO_POR_SABOR, textoPotes } from '@/lib/sacola'

type Props = {
  valor: number
  aoMudar: (n: number) => void
  /** o sabor, quando ha mais de um contador na tela: "Mais um pote de Paçoca" */
  de?: string
  /** a versao baixa, da gaveta e da sacola */
  compacta?: boolean
}

/** O contador de potes: menos, o numero, mais. De 1 ao maximo por sabor. */
export function Quantidade({ valor, aoMudar, de, compacta }: Props) {
  const sufixo = de ? ` de ${de}` : ''
  return (
    <div
      className={compacta ? 'quantidade quantidade--compacta' : 'quantidade'}
      role="group"
      aria-label={de ? `Quantidade de ${de}` : 'Quantidade'}
    >
      <button
        type="button"
        className="quantidade__botao"
        aria-label={`Menos um pote${sufixo}`}
        disabled={valor <= 1}
        onClick={() => aoMudar(Math.max(1, valor - 1))}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12h12" />
        </svg>
      </button>
      <output className="quantidade__valor" aria-live="polite" aria-label={textoPotes(valor)}>
        {valor}
      </output>
      <button
        type="button"
        className="quantidade__botao"
        aria-label={`Mais um pote${sufixo}`}
        disabled={valor >= MAXIMO_POR_SABOR}
        onClick={() => aoMudar(Math.min(MAXIMO_POR_SABOR, valor + 1))}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12h12M12 6v12" />
        </svg>
      </button>
    </div>
  )
}
