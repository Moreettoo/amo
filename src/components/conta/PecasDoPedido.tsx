import Image from 'next/image'
import type { CSSProperties } from 'react'
import type { ImagemProduto } from '@/lib/catalogo'
import { NOME_DO_ESTADO, formatarDia, formatarHora } from '@/lib/conta/textos'
import type { PedidoCompleto, PedidoNaLista } from '@/lib/dados/pedidos'
import { formatarPreco } from '@/lib/produto'
import { textoPotes } from '@/lib/sacola'

/**
 * As pecas que mostram um pedido: o fio das etapas (o coracao pousa na
 * etapa em que ele esta), os potes e a lista de pedidos. Sem estado: as
 * paginas de servidor montam com o que a camada de dados leu.
 */

type Etapa = { nome: string; quando: string | null }

/** As etapas do pedido; um cancelado para na ultima que alcancou e termina em "Cancelado". */
function etapasDe(p: PedidoCompleto): Etapa[] {
  const todas: Etapa[] = [
    { nome: 'Feito', quando: p.datas.criado },
    { nome: 'Pago', quando: p.datas.pago },
    { nome: 'Em preparo', quando: p.datas.emPreparo },
    { nome: 'A caminho', quando: p.datas.aCaminho },
    { nome: 'Entregue', quando: p.datas.entregue },
  ]
  if (p.estado !== 'cancelado') return todas
  return [...todas.filter((e) => e.quando), { nome: 'Cancelado', quando: p.datas.cancelado }]
}

/** A hora de cada etapa; o dia junto quando nao foi no dia em que o pedido foi feito. */
function momento(quando: string, criado: string) {
  const mesmoDia = formatarDia(quando) === formatarDia(criado)
  return mesmoDia ? formatarHora(quando) : `${formatarDia(quando)}, ${formatarHora(quando)}`
}

export function EtapasDoPedido({ pedido }: { pedido: PedidoCompleto }) {
  const etapas = etapasDe(pedido)
  const atual = etapas.findLastIndex((e) => e.quando)
  return (
    <ol className="etapas-pedido" aria-label="Etapas do pedido" style={{ '--n': etapas.length } as CSSProperties}>
      {etapas.map((e, i) => (
        <li
          key={e.nome}
          className={i === atual ? 'etapas-pedido__atual' : i > atual ? 'etapas-pedido__vem' : undefined}
          aria-current={i === atual ? 'step' : undefined}
        >
          {i === atual ? <span className="etapas-pedido__coracao" aria-hidden="true" /> : null}
          <span className="etapas-pedido__nome">{e.nome}</span>
          {e.quando ? <time dateTime={e.quando}>{momento(e.quando, pedido.datas.criado)}</time> : null}
        </li>
      ))}
    </ol>
  )
}

type Fotos = ReadonlyMap<string, ImagemProduto>

/** Os potes do pedido: miniatura, nome, quantos e o total de cada sabor. */
export function PotesDoPedido({ itens, fotos }: { itens: PedidoCompleto['itens']; fotos: Fotos }) {
  return (
    <ul className="potes-pedido">
      {itens.map((item) => {
        const foto = fotos.get(item.produto)
        return (
          <li key={item.produto}>
            <span className="potes-pedido__foto">
              {foto ? <Image src={foto.src} alt="" width={64} height={80} sizes="64px" /> : null}
            </span>
            <span className="potes-pedido__nome">
              <b>{item.nome}</b>
              <small>
                {item.tipo} · <span className="potes-pedido__preco">{formatarPreco(item.precoCentavos)} cada</span>
              </small>
            </span>
            <span className="potes-pedido__quantos">{textoPotes(item.quantos)}</span>
            <span className="potes-pedido__total num">{formatarPreco(item.totalCentavos)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Os pedidos numa fileira cada, do mais novo ao mais antigo; a fileira inteira leva ao pedido. */
export function ListaDePedidos({ pedidos }: { pedidos: PedidoNaLista[] }) {
  return (
    <ul className="lista-pedidos">
      {pedidos.map((p) => (
        <li key={p.numero} className={p.estado === 'cancelado' ? 'lista-pedidos__cancelado' : undefined}>
          <a href={`/conta/pedidos/${p.numero}`}>
            <b className="lista-pedidos__numero num">{p.numero}</b>
            <span className="lista-pedidos__dia">{formatarDia(p.criadoEm)}</span>
            <span className="lista-pedidos__estado">{NOME_DO_ESTADO[p.estado]}</span>
            <span className="lista-pedidos__potes">{textoPotes(p.potes)}</span>
            <span className="lista-pedidos__total num">{formatarPreco(p.totalCentavos)}</span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  )
}
