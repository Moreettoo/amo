import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CancelarPedido } from '@/components/conta/FormsDaConta'
import { CabecaDaConta, PainelDaConta, lerDadosDoPainel } from '@/components/conta/PainelDaConta'
import { EtapasDoPedido, PotesDoPedido } from '@/components/conta/PecasDoPedido'
import { exigirUsuario } from '@/lib/auth'
import { conferirNumeroDoPedido } from '@/lib/conta/regras'
import { FRASE_DO_ESTADO, MOTIVO_DO_CANCELAMENTO, descreverEntrega, descreverPagamento, formatarDataEHora } from '@/lib/conta/textos'
import { lerPedido } from '@/lib/dados/pedidos'
import { formatarPreco } from '@/lib/produto'
import { textoPotes } from '@/lib/sacola'

export const metadata: Metadata = { title: 'Pedido · AMO', robots: { index: false } }

type Props = { params: Promise<{ numero: string }>; searchParams: Promise<{ cancelado?: string | string[] }> }

export default async function PaginaDoPedido({ params, searchParams }: Props) {
  const bruto = (await params).numero
  const numero = conferirNumeroDoPedido(bruto)
  const usuario = await exigirUsuario(numero ? `/conta/pedidos/${numero}` : '/conta/pedidos')
  if (!numero) notFound()
  const [dados, pedido] = await Promise.all([lerDadosDoPainel(usuario.id), lerPedido(usuario.id, numero)])
  if (!pedido) notFound()

  const potes = pedido.itens.reduce((soma, i) => soma + i.quantos, 0)
  const pagamento = descreverPagamento(pedido.pagamento)
  const rastreio = pedido.estado === 'a_caminho' ? pedido.entrega.rastreioUrl : null
  // depois de cancelar, a acao volta para ca com ?cancelado=1
  const acabouDeCancelar = (await searchParams).cancelado === '1' && pedido.estado === 'cancelado'

  return (
    <PainelDaConta atual="pedidos" usuario={usuario} dados={dados}>
      <CabecaDaConta
        titulo={
          <>
            Pedido <span className="painel__numero">{pedido.numero}</span>
          </>
        }
        frase={FRASE_DO_ESTADO[pedido.estado]}
        trilha={{ href: '/conta/pedidos', rotulo: 'Pedidos', atual: pedido.numero }}
      />
      {acabouDeCancelar ? (
        <p className="painel__aviso" role="status">
          Pedido cancelado.
        </p>
      ) : null}
      <p className="painel__lead">
        Feito em {formatarDataEHora(pedido.datas.criado)}.
        {pedido.motivoDoCancelamento ? ` ${MOTIVO_DO_CANCELAMENTO[pedido.motivoDoCancelamento]}` : ''}
      </p>
      <EtapasDoPedido pedido={pedido} />

      <div className="pedido">
        <PotesDoPedido itens={pedido.itens} fotos={dados.fotos} />
        <div className="pedido__resumo">
          <dl className="pedido__contas">
            <div>
              <dt>Subtotal, {textoPotes(potes)}</dt>
              <dd className="num">{formatarPreco(pedido.subtotalCentavos)}</dd>
            </div>
            <div>
              <dt>Entrega pelo Uber</dt>
              <dd className="num">{formatarPreco(pedido.freteCentavos)}</dd>
            </div>
            <div className="pedido__soma">
              <dt>Total</dt>
              <dd className="num">{formatarPreco(pedido.totalCentavos)}</dd>
            </div>
          </dl>
          {rastreio ? (
            <a className="btn-retro btn-retro--escuro pedido__acompanhar" href={rastreio} target="_blank" rel="noopener noreferrer">
              Acompanhar no Uber
            </a>
          ) : null}
          {pedido.estado === 'aguardando_pagamento' ? <CancelarPedido numero={pedido.numero} /> : null}
          <dl className="pedido__dados">
            <div>
              <dt>Entregar em</dt>
              <dd>
                {descreverEntrega(pedido.entrega)
                  .split(' · ')
                  .map((parte) => (
                    <span key={parte} className="pedido__linha">
                      {parte}
                    </span>
                  ))}
              </dd>
            </div>
            {pagamento || pedido.estado === 'aguardando_pagamento' ? (
              <div>
                <dt>Pagamento</dt>
                <dd>{pagamento ?? 'Ainda não aprovado'}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </PainelDaConta>
  )
}
