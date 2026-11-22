'use client'

import type { RefObject } from 'react'
import type { SituacaoDoPedido } from '@/lib/fechamento/tipos'
import { NOMES_DO_PAGAMENTO, type Pagamento } from '@/lib/pedido'
import { CartaoMercadoPago, type ControleDoCartao } from './CartaoMercadoPago'
import { EsperaDoPagamento } from './EsperaDoPagamento'

/** O cartao oferecido, so com a chave publica do Mercado Pago: o que o Brick precisa. */
export type CartaoDaEtapa = {
  chave: string
  nonce: string
  valorCentavos: number
  aoPronto: () => void
  aoFalhar: () => void
  controle: RefObject<ControleDoCartao | null>
}

type Props = {
  /** o id do formulario, que o botao do resumo envia pelo atributo form */
  id: string
  forma: Pagamento
  aoMudarForma: (forma: Pagamento) => void
  /** a frase do ultimo erro do pagamento (ou da recusa do cartao), na linha de erro da etapa */
  aviso: string | null
  aoPagar: () => void
  /** o pagamento em curso: as opcoes travam, e a forma nao troca no meio */
  travada: boolean
  /** o cartao, com a chave publica; sem ela, so o Pix */
  cartao: CartaoDaEtapa | null
  /** o desafio do banco (3DS): a tentativa com a URL dele e o que fazer quando a espera vir mudar */
  desafio: { situacao: SituacaoDoPedido; aoMudar: (s: SituacaoDoPedido) => void } | null
}

/**
 * A etapa 4: como pagar. O botao do resumo envia o formulario (paga com o
 * Pix ou com o cartao); com o cartao, o Brick do Mercado Pago aparece
 * embaixo das opcoes. No desafio do banco, a pagina do banco toma o lugar
 * das opcoes, num iframe, e a espera do pagamento decide. A linha de erro,
 * uma regiao viva sempre no lugar, diz o que deu errado quando o pagamento
 * fica nesta etapa.
 */
export function EtapaPagamento({ id, forma, aoMudarForma, aviso, aoPagar, travada, cartao, desafio }: Props) {
  const formas: readonly Pagamento[] = cartao ? ['pix', 'cartao'] : ['pix']
  const url = desafio?.situacao.pagamento?.desafioUrl
  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        aoPagar()
      }}
    >
      {desafio && url ? (
        <div className="desafio">
          <iframe id={`${id}-desafio`} className="desafio__janela" src={url} title="Confirmação do banco" />
          <EsperaDoPagamento numero={desafio.situacao.numero} inicial={desafio.situacao} aoMudar={desafio.aoMudar} />
        </div>
      ) : (
        <>
          <fieldset className="pagamento" disabled={travada}>
            <legend className="sr-only">Como pagar</legend>
            {formas.map((f) => (
              <label key={f} className="pagamento__opcao">
                <input type="radio" name="pagamento" value={f} checked={forma === f} onChange={() => aoMudarForma(f)} />
                <span>{NOMES_DO_PAGAMENTO[f]}</span>
              </label>
            ))}
          </fieldset>
          {forma === 'cartao' && cartao ? <CartaoMercadoPago {...cartao} /> : null}
        </>
      )}
      <p className="etapa__erro" aria-live="polite">
        {aviso ?? ''}
      </p>
    </form>
  )
}
