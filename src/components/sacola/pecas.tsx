'use client'

import Image from 'next/image'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Quantidade } from '@/components/ui/Quantidade'
import type { Cotacao } from '@/lib/fechamento/tipos'
import { formatarPreco } from '@/lib/produto'
import { definirQuantidade, tirarDaSacola, type LinhaDaSacola } from '@/lib/sacola'
import { CAMINHO_CATALOGO } from '@/lib/visao'
import type { Etapa } from './progresso'

/** A Regra do Exemplo Dito: enquanto a cotacao for de exemplo, o valor da entrega diz isso. */
export const deExemplo = (c: Cotacao) => (c.exemplo ? ' (valor de exemplo)' : '')
/** "Rua Gomes de Carvalho, 10" */
export const ruaENumero = (c: Cotacao) => `${c.endereco.logradouro}, ${c.endereco.numero}`

/** O fio de 1 px pela margem e o coracao na etapa atual, que desliza ate ela. */
export function Fio({ etapa, id, children }: { etapa: Etapa; id: string; children: ReactNode }) {
  const lista = useRef<HTMLOListElement>(null)
  const [y, setY] = useState<number | null>(null)

  useLayoutEffect(() => {
    const medir = () => {
      const alvo = document.getElementById(`${id}-t${etapa}`)
      const ol = lista.current
      if (!alvo || !ol) return
      const a = alvo.getBoundingClientRect()
      setY(a.top - ol.getBoundingClientRect().top + a.height / 2)
    }
    // o titulo da etapa atual so muda de altura quando a etapa muda (as de
    // cima ja sao resumo) ou quando a janela muda de largura
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [etapa, id])

  return (
    <ol ref={lista} className="etapas" aria-label="Etapas do pedido">
      {y !== null ? <span className="etapas__coracao" aria-hidden="true" style={{ '--y': `${y}px` } as CSSProperties} /> : null}
      {children}
    </ol>
  )
}

export function ListaDePotes({ linhas }: { linhas: readonly LinhaDaSacola[] }) {
  return (
    <ul className="potes" aria-label="Potes na sacola">
      {linhas.map((l) => (
        <li key={l.slug} className="pote">
          <Image src={l.imagem.src} alt="" width={l.imagem.largura} height={l.imagem.altura} sizes="64px" />
          <p className="pote__nome">
            <a href={`${CAMINHO_CATALOGO}/${l.slug}`}>{l.nome}</a>
            <small>{l.tipo}</small>
            <small>{formatarPreco(l.preco)} cada</small>
          </p>
          <div className="pote__acoes">
            <Quantidade valor={l.quantos} de={l.nome} compacta aoMudar={(n) => definirQuantidade(l.slug, n)} />
            <button type="button" className="sacola__tirar" aria-label={`Tirar ${l.nome} da sacola`} onClick={() => tirarDaSacola(l.slug)}>
              Tirar
            </button>
          </div>
          <b className="pote__preco">{formatarPreco(l.total)}</b>
        </li>
      ))}
    </ul>
  )
}

/** O h1 da pagina, em duas vozes: segue o estado (lendo, vazia, aberta, feita). */
export function Titulo({ children, frase, id, foco }: { children: ReactNode; frase?: string; id?: string; foco?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (foco) ref.current?.focus()
  }, [foco])
  return (
    <h1 ref={ref} id={id} tabIndex={foco ? -1 : undefined} className="sacola-pagina__titulo">
      {children} {frase ? <em>{frase}</em> : null}
    </h1>
  )
}
