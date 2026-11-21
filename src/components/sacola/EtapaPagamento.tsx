'use client'

import { MENSAGENS_DO_FECHAMENTO, type CodigoDoFechamento } from '@/lib/fechamento/tipos'
import { NOMES_DO_PAGAMENTO, type Pagamento } from '@/lib/pedido'

type Props = {
  /** o id do formulario, que o botao do resumo envia pelo atributo form */
  id: string
  forma: Pagamento
  aoMudarForma: (forma: Pagamento) => void
  /** a frase do ultimo erro do pagamento, na linha de erro da etapa */
  aviso: CodigoDoFechamento | null
  aoPagar: () => void
}

/** As formas oferecidas. O cartao entra com o Card Payment Brick, e so com a chave publica do Mercado Pago. */
const FORMAS: readonly Pagamento[] = ['pix']

/**
 * A etapa 4: como pagar. O botao do resumo envia o formulario ("Pagar com
 * Pix"); a linha de erro, uma regiao viva sempre no lugar, diz o que deu
 * errado quando o pagamento fica nesta etapa.
 */
export function EtapaPagamento({ id, forma, aoMudarForma, aviso, aoPagar }: Props) {
  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        aoPagar()
      }}
    >
      <fieldset className="pagamento">
        <legend className="sr-only">Como pagar</legend>
        {FORMAS.map((f) => (
          <label key={f} className="pagamento__opcao">
            <input type="radio" name="pagamento" value={f} checked={forma === f} onChange={() => aoMudarForma(f)} />
            <span>{NOMES_DO_PAGAMENTO[f]}</span>
          </label>
        ))}
      </fieldset>
      <p className="etapa__erro" aria-live="polite">
        {aviso ? MENSAGENS_DO_FECHAMENTO[aviso] : ''}
      </p>
    </form>
  )
}
