import type { Metadata } from 'next'
import { CabecaDaConta, PainelDaConta, lerDadosDoPainel } from '@/components/conta/PainelDaConta'
import { EtapasDoPedido, ListaDePedidos, PotesDoPedido } from '@/components/conta/PecasDoPedido'
import { exigirUsuario } from '@/lib/auth'
import { FRASE_DO_ESTADO, descreverPagamento, formatarHora } from '@/lib/conta/textos'
import { lerPedido, lerPedidos, type EstadoDoPedido, type PedidoCompleto } from '@/lib/dados/pedidos'
import { formatarPreco } from '@/lib/produto'
import { textoPotes } from '@/lib/sacola'
import { CAMINHO_CATALOGO } from '@/lib/visao'

export const metadata: Metadata = { title: 'Minha conta · AMO', robots: { index: false } }

const EM_ANDAMENTO: ReadonlySet<EstadoDoPedido> = new Set(['aguardando_pagamento', 'pago', 'em_preparo', 'a_caminho'])

/** O que acompanha o titulo do pedido: quando chega e o caminho para acompanhar. */
function Chegada({ pedido }: { pedido: PedidoCompleto }) {
  const { minutos, rastreioUrl } = pedido.entrega
  if (pedido.estado === 'aguardando_pagamento') {
    return (
      <>
        <span className="painel__apoio">Falta o pagamento</span>
        <p>Assim que ele for aprovado, o pedido entra na fila.</p>
        <a className="link-seta" href={`/conta/pedidos/${pedido.numero}`}>
          Ver o pedido
        </a>
      </>
    )
  }
  return (
    <>
      <span className="painel__apoio">Entrega pelo Uber</span>
      {pedido.estado === 'a_caminho' && pedido.datas.aCaminho ? (
        <p>
          Saiu às {formatarHora(pedido.datas.aCaminho)}. Chega em cerca de {minutos} minutos.
        </p>
      ) : (
        <p>Sai quando ficar pronto e chega em cerca de {minutos} minutos.</p>
      )}
      {pedido.estado === 'a_caminho' && rastreioUrl ? (
        <a className="btn-retro btn-retro--escuro" href={rastreioUrl} target="_blank" rel="noopener noreferrer">
          Acompanhar no Uber
        </a>
      ) : null}
    </>
  )
}

function PedidoAtual({ pedido, fotos }: { pedido: PedidoCompleto; fotos: Awaited<ReturnType<typeof lerDadosDoPainel>>['fotos'] }) {
  const potes = pedido.itens.reduce((soma, i) => soma + i.quantos, 0)
  const pagamento = descreverPagamento(pedido.pagamento)
  return (
    <>
      <CabecaDaConta titulo={`Pedido ${pedido.numero}`} frase={FRASE_DO_ESTADO[pedido.estado]} lado={<Chegada pedido={pedido} />} />
      <EtapasDoPedido pedido={pedido} />
      <PotesDoPedido itens={pedido.itens} fotos={fotos} />
      <p className="painel__total">
        <b>Total</b>
        <span className="painel__conta">
          {formatarPreco(pedido.subtotalCentavos)} em {textoPotes(potes)} e {formatarPreco(pedido.freteCentavos)} de entrega
          {pagamento ? `, pago com ${pagamento}` : ''}
        </span>
        <strong className="num">{formatarPreco(pedido.totalCentavos)}</strong>
      </p>
      <p className="painel__mais">
        <a className="link-seta" href={`/conta/pedidos/${pedido.numero}`}>
          Ver o pedido completo
        </a>
      </p>
    </>
  )
}

export default async function PaginaDaConta() {
  const usuario = await exigirUsuario('/conta')
  const [dados, pedidos] = await Promise.all([lerDadosDoPainel(), lerPedidos(usuario.id)])
  const emAndamento = pedidos.find((p) => EM_ANDAMENTO.has(p.estado))
  const atual = emAndamento ? await lerPedido(usuario.id, emAndamento.numero) : null
  const anteriores = pedidos.filter((p) => p.numero !== atual?.numero).slice(0, 3)

  return (
    <PainelDaConta atual="pedido" usuario={usuario} dados={dados}>
      {atual ? (
        <PedidoAtual pedido={atual} fotos={dados.fotos} />
      ) : (
        <>
          <CabecaDaConta titulo="Nenhum pedido" frase="a caminho" />
          <p className="painel__lead">Quando bater a vontade, os sabores estão no catálogo. Cada pedido aparece aqui, do preparo até a sua porta.</p>
          <p className="painel__mais">
            <a className="btn-retro btn-retro--escuro" href={CAMINHO_CATALOGO}>
              Ver o catálogo
            </a>
          </p>
        </>
      )}

      {anteriores.length > 0 ? (
        <section className="painel__bloco" aria-labelledby="anteriores">
          <div className="painel__bloco-topo">
            <h2 id="anteriores" className="painel__subtitulo">
              {atual ? 'Pedidos anteriores' : 'Seus pedidos'}
            </h2>
            <a className="link-seta" href="/conta/pedidos">
              Ver todos os pedidos
            </a>
          </div>
          <ListaDePedidos pedidos={anteriores} />
        </section>
      ) : null}
    </PainelDaConta>
  )
}
