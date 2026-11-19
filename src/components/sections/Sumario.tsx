'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useParAtual } from '@/components/ui/useParAtual'
import type { ItemDoSumario } from '@/lib/sumario'

const classes = (...nomes: (string | false)[]) => nomes.filter(Boolean).join(' ')

type Props = { itens: readonly ItemDoSumario[] }

/**
 * O sumario do catalogo: as categorias com as linhas dentro, cada uma um
 * link para a secao dela na mesma pagina (o RolagemSuave conduz). O item em
 * que a pessoa esta leva `aria-current`, e o coracao do logo desliza pelo
 * fio ate ele. A mesma marcacao serve as duas larguras: no desktop e uma
 * coluna presa ao lado das receitas; no celular o CSS a transforma numa
 * fileira de etiquetas presa embaixo da nav. Sem JavaScript os links sao
 * ancoras comuns e nao ha item atual.
 */
export function Sumario({ itens }: Props) {
  const par = useParAtual(itens)
  const navRef = useRef<HTMLElement>(null)
  const trilhoRef = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  // onde o coracao fica, medido a partir do canto da lista: `y` e a altura
  // do item na coluna do desktop, `x` o meio da etiqueta na fileira do
  // celular. null enquanto nao ha item atual
  const [lugar, setLugar] = useState<{ x: number; y: number } | null>(null)
  const [presa, setPresa] = useState(false)
  // o item mais fundo do par: a linha, se a categoria tem linhas; senao ela
  const marcado = par.linha ?? par.categoria

  // O coracao fica no link atual. Mede de novo quando o atual muda, quando
  // a lista muda (o filtro troca contagens) e quando a janela muda de
  // tamanho (a coluna vira fileira, a lista quebra linha). O alvo e o link
  // que esta na tela: o mais fundo do par no desktop; no celular, onde as
  // linhas somem, o da categoria.
  useLayoutEffect(() => {
    const lista = listaRef.current
    if (!lista) return
    const medir = () => {
      const marcados = [...lista.querySelectorAll<HTMLElement>('[aria-current]')]
      const link =
        marcados.find((a) => a.getAttribute('aria-current') === 'location' && a.offsetParent !== null) ??
        marcados.find((a) => a.offsetParent !== null) ??
        marcados[0]
      if (!link) return setLugar(null)
      const daLista = lista.getBoundingClientRect()
      const doLink = link.getBoundingClientRect()
      setLugar({
        x: doLink.left - daLista.left + doLink.width / 2,
        y: doLink.top - daLista.top + doLink.height / 2,
      })
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [marcado, itens])

  // No celular o trilho e uma fileira que rola de lado: a etiqueta atual vem
  // para a vista. No desktop ele nao rola (as larguras sao iguais).
  useEffect(() => {
    const trilho = trilhoRef.current
    if (!trilho || !par.categoria || trilho.scrollWidth <= trilho.clientWidth) return
    // a etiqueta que esta na tela: a da categoria ou, com uma categoria so
    // (as etiquetas sao as linhas), a da linha
    const atual = [...trilho.querySelectorAll<HTMLElement>('[aria-current]')].find((el) => el.offsetParent !== null)
    if (!atual || typeof trilho.scrollTo !== 'function') return
    const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const folga = atual.getBoundingClientRect().left - trilho.getBoundingClientRect().left - 20
    trilho.scrollTo({ left: Math.max(0, trilho.scrollLeft + folga), behavior: calmo ? 'auto' : 'smooth' })
  }, [par.categoria, par.linha])

  // A fileira do celular gruda a 64 px do topo, embaixo da nav. Quando
  // gruda, um pixel dela sai da area observada (65 px abaixo do topo) e ela
  // ganha o fio de baixo, o mesmo que prende a nav. A coluna do desktop gruda
  // mais embaixo (96 px) e nunca sai dessa area.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    // so conta saindo por cima: ainda abaixo da dobra ela tambem nao esta inteira na tela
    const saiuPorCima = (e: IntersectionObserverEntry) => e.intersectionRatio < 1 && e.boundingClientRect.top < 96
    const observador = new IntersectionObserver(([entrada]) => setPresa(saiuPorCima(entrada)), {
      rootMargin: '-65px 0px 0px 0px',
      threshold: 1,
    })
    observador.observe(nav)
    return () => observador.disconnect()
  }, [])

  return (
    <nav
      ref={navRef}
      aria-label="Sumário"
      className={classes('sumario', itens.length === 1 && 'sumario--uma', presa && 'sumario--presa')}
    >
      <p className="sumario__rotulo" aria-hidden="true">
        Sumário
      </p>
      <div ref={trilhoRef} className="sumario__trilho">
        {lugar ? (
          <span
            className="sumario__coracao"
            aria-hidden="true"
            style={{ '--x': `${lugar.x}px`, '--y': `${lugar.y}px` } as CSSProperties}
          />
        ) : null}
        <ul ref={listaRef} className="sumario__lista">
          {itens.map((i) => (
            <li
              key={i.id}
              className={classes(
                'sumario__item',
                par.categoria === i.id && 'sumario__item--atual',
                i.contagem === 0 && 'sumario__item--vazio',
              )}
            >
              {/* com uma linha marcada, a categoria dela tambem diz que e a atual:
                  no celular as linhas nao aparecem, e e este o link que resta */}
              <a
                href={`#${i.id}`}
                aria-current={marcado === i.id ? 'location' : par.categoria === i.id ? 'true' : undefined}
                className="sumario__link"
              >
                <span className="sumario__nome">{i.nome}</span>{' '}
                <span className="sumario__conta">{i.contagem}</span>
              </a>
              {i.linhas.length > 0 ? (
                <ul className="sumario__linhas">
                  {i.linhas.map((l) => (
                    <li key={l.id} className={classes('sumario__linha', l.contagem === 0 && 'sumario__linha--vazia')}>
                      <a href={`#${l.id}`} aria-current={marcado === l.id ? 'location' : undefined} className="sumario__link">
                        {l.nome}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <a href="/#hoje" className="catalogo__hoje sumario__hoje">
        <span>Não sabe o que escolher?</span>
        <b>
          Hoje o dia pede
          <svg className="catalogo__seta" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </b>
      </a>
    </nav>
  )
}
