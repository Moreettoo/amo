'use client'

import { BotaoRetro } from '@/components/ui/BotaoRetro'
import type { CodigoDoFechamento, Cotacao, SituacaoDoPedido } from '@/lib/fechamento/tipos'
import { formatarPreco } from '@/lib/produto'
import type { LinhaDaSacola } from '@/lib/sacola'
import { CAMINHO_CATALOGO } from '@/lib/visao'
import { EsperaDoPagamento } from './EsperaDoPagamento'
import { aprovado, codigoAcabou } from './espera'
import { PainelDoPix } from './PainelDoPix'
import { deExemplo, ruaENumero, Titulo } from './pecas'

type Props = {
  situacao: SituacaoDoPedido
  /** os potes do pedido, como estavam quando ele foi fechado */
  linhas: readonly LinhaDaSacola[]
  /** a cotacao da entrega com que o pedido foi fechado */
  entrega: Cotacao
  /** o total que o servidor devolveu ao fechar o pedido */
  total: number
  aoGerarOutro: () => void
  /** a espera viu o pedido mudar */
  aoMudar: (s: SituacaoDoPedido) => void
  /** enquanto o codigo novo e pedido */
  gerando?: boolean
  /** o que deu errado ao pedir o codigo novo */
  erro?: CodigoDoFechamento | null
}

/**
 * O pedido feito: o titulo "Pedido N" em duas vozes ("aguardando o Pix" ou
 * a espera da confirmacao do cartao e, pago, "recebido", que volta a
 * receber o foco), o Pix com a espera enquanto o pagamento nao chega (o
 * cartao pendente, so a espera) e, pago, "Pagamento aprovado." com o caminho
 * para acompanhar. Embaixo, o que foi pedido, a entrega e o total.
 */
export function PedidoFeito({ situacao, linhas, entrega, total, aoGerarOutro, aoMudar, gerando = false, erro = null }: Props) {
  const pago = aprovado(situacao)
  // a tentativa que acabou nao tem QR para pagar, mesmo que a resposta traga um
  const acabou = codigoAcabou(situacao)
  const pix = acabou ? null : (situacao.pagamento?.pix ?? null)
  const doCartao = situacao.pagamento?.forma === 'cartao'
  const { complemento } = entrega.endereco
  return (
    <section className="feito" aria-labelledby="pedido-feito">
      {/* a chave troca com o estado: o titulo novo recebe o foco */}
      <Titulo key={pago ? 'recebido' : 'aguardando'} frase={pago ? 'recebido' : doCartao ? 'aguardando a confirmação do cartão' : 'aguardando o Pix'} id="pedido-feito" foco>
        Pedido {situacao.numero}
      </Titulo>
      <p className="feito__estado" role="status">
        {pago ? 'Pagamento aprovado.' : ''}
      </p>
      {pago ? (
        <a className="etapa__alterar feito__acompanhar" href={`/conta/pedidos/${situacao.numero}`}>
          Acompanhar em Minha conta
        </a>
      ) : (
        <>
          {/* o cartao pendente nao tem codigo: so a espera, que diz em texto */}
          {doCartao ? null : pix || acabou ? (
            <PainelDoPix
              pix={pix}
              aoGerarOutro={aoGerarOutro}
              recusado={situacao.pagamento?.estado === 'recusado'}
              gerando={gerando}
              erro={erro}
            />
          ) : (
            <p className="feito__gerando">Gerando o código Pix.</p>
          )}
          <EsperaDoPagamento numero={situacao.numero} inicial={situacao} aoMudar={aoMudar} />
        </>
      )}
      <dl className="feito__contas">
        {linhas.map((l) => (
          <div key={l.slug}>
            <dt>
              {l.quantos} × {l.nome}
            </dt>
            <dd>{formatarPreco(l.total)}</dd>
          </div>
        ))}
        <div>
          <dt>
            Entrega pelo Uber{deExemplo(entrega)}, {ruaENumero(entrega)}
            {complemento ? `, ${complemento}` : ''}
          </dt>
          <dd>{formatarPreco(entrega.valorCentavos)}</dd>
        </div>
        <div className="resumo__total">
          <dt>Total, {situacao.pagamento?.forma === 'cartao' ? 'no cartão' : 'no Pix'}</dt>
          <dd>{formatarPreco(total)}</dd>
        </div>
      </dl>
      <BotaoRetro href={CAMINHO_CATALOGO} escuro>
        Voltar ao catálogo
      </BotaoRetro>
    </section>
  )
}
