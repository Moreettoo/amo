'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { Sumario } from '@/components/sections/Sumario'
import { GradeProdutos } from '@/components/ui/GradeProdutos'
import { Pilula } from '@/components/ui/Pilula'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import type { Produto } from '@/lib/catalogo'
import { montarSumario } from '@/lib/sumario'
import { contarReceitas, filtrar, type LinhaDoCapitulo, type VistaCatalogo } from '@/lib/visao'

/** A vontade de chegada (`?vontade=chocolate`, vinda do Hoje o dia pede).
 *  So vale uma vontade que filtra alguma coisa na vista; o resto e ignorado. */
export function vontadeDaBusca(busca: string, validas: readonly { slug: string }[]): string | null {
  const pedida = new URLSearchParams(busca).get('vontade')
  return pedida && validas.some((v) => v.slug === pedida) ? pedida : null
}

// A busca da URL como fonte externa: no servidor e na hidratacao ela e
// vazia, entao o HTML do servidor sai completo e sem filtro; logo depois o
// cliente le a de verdade. A pagina nao troca de URL sem navegar.
const semAssinatura = () => () => {}
const buscaDoCliente = () => window.location.search
const buscaDoServidor = () => ''

type LinhaNaTela = LinhaDoCapitulo & { visiveis: Produto[] }

type Props = { vista: VistaCatalogo }

/**
 * O corpo do catalogo: os filtros de vontade e de selo, valendo para a
 * pagina inteira, e um capitulo por categoria com as linhas dela dentro.
 * Categoria e linha nao sao filtro nem rota: sao secoes da mesma pagina,
 * cada uma com o seu id, e o sumario leva ate elas.
 */
export function CatalogoPagina({ vista }: Props) {
  const busca = useSyncExternalStore(semAssinatura, buscaDoCliente, buscaDoServidor)
  // undefined: a pessoa ainda nao escolheu, e vale a vontade da URL
  const [escolhida, setEscolhida] = useState<string | null | undefined>(undefined)
  const [selo, setSelo] = useState<string | null>(null)
  // o card escondido que a gaveta chamou: volta ja no lugar, sem crescer
  const [chamado, setChamado] = useState<string | null>(null)
  const primeiroTituloRef = useRef<HTMLHeadingElement>(null)

  const vontade = escolhida === undefined ? vontadeDaBusca(busca, vista.vontades) : escolhida
  const capitulos = vista.capitulos.map((c) => ({
    ...c,
    linhas: c.linhas.map((l): LinhaNaTela => ({ ...l, visiveis: filtrar(l.produtos, { linha: null, selo, vontade }) })),
  }))
  const naTela = capitulos
    .map((c) => ({ ...c, linhas: c.linhas.filter((l) => l.visiveis.length > 0) }))
    .filter((c) => c.linhas.length > 0)
  const mostrando = naTela.reduce((n, c) => n + c.linhas.reduce((m, l) => m + l.visiveis.length, 0), 0)
  // a unica imagem pre-carregada da pagina: a primeira foto do cadastro,
  // decidida sem o filtro para o servidor e o cliente concordarem
  const primeiraFoto = vista.capitulos[0]?.linhas[0]?.produtos[0]?.slug
  const visiveis = new Set(naTela.flatMap((c) => c.linhas.flatMap((l) => l.visiveis.map((p) => p.slug))))
  // os ids que o filtro tirou da pagina (cards, e as secoes de linha e de
  // categoria que ficaram sem nenhum), numa string para a dependencia do efeito
  const escondidos = capitulos
    .flatMap((c) => [
      ...(c.linhas.every((l) => l.visiveis.length === 0) ? [c.slug] : []),
      ...c.linhas.flatMap((l) => [
        ...(l.visiveis.length === 0 ? [l.id] : []),
        ...l.produtos.filter((p) => !visiveis.has(p.slug)).map((p) => p.slug),
      ]),
    ])
    .join(' ')

  // O alvo que o filtro escondeu (o sabor da gaveta, a linha do rodape, o
  // item zerado do sumario) nao esta no DOM, e o RolagemSuave nao teria para
  // onde rolar. Na captura, antes da gaveta (o onClick do React) e do
  // RolagemSuave (os dois ouvem na bolha), o filtro sai, e o flushSync poe o
  // alvo no DOM antes deles o procurarem. O card chamado volta sem a escala
  // de entrada: a rolagem mede o alvo nesse mesmo clique, e com 0.85 ele
  // pararia embaixo da nav.
  useEffect(() => {
    if (!escondidos) return
    const fora = new Set(escondidos.split(' '))
    function aoClicar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return
      const url = new URL(link.href)
      if (url.host !== window.location.host || url.pathname !== window.location.pathname) return
      const slug = decodeURIComponent(url.hash.slice(1))
      if (!fora.has(slug)) return
      flushSync(() => {
        setEscolhida(null)
        setSelo(null)
        setChamado(slug)
      })
    }
    document.addEventListener('click', aoClicar, true)
    return () => document.removeEventListener('click', aoClicar, true)
  }, [escondidos])

  // O botao clicado some da tela; o foco vai para o titulo do primeiro
  // capitulo em vez de cair no <body>. flushSync: o titulo so volta ao DOM
  // depois que o filtro sai.
  function verTodas() {
    flushSync(() => {
      setChamado(null)
      setEscolhida(null)
      setSelo(null)
    })
    primeiroTituloRef.current?.focus()
  }

  // filtro escolhido pela pessoa: os cards voltam a entrar crescendo
  function escolherVontade(v: string | null) {
    setChamado(null)
    setEscolhida(v)
  }
  function escolherSelo(s: string | null) {
    setChamado(null)
    setSelo(s)
  }

  // A linha com o nome da categoria ("Salgados" em Salgados) nao e rotulada:
  // seriam duas regioes com o mesmo nome, uma dentro da outra.
  const rotuloDaLinha = (l: LinhaNaTela) => (l.mostraNome ? `titulo-${l.id}` : undefined)
  const topoDaLinha = (l: LinhaNaTela) => (
    <>
      <h3 id={`titulo-${l.id}`} className={l.mostraNome ? 'capitulo__linha-nome' : 'sr-only'}>
        {l.nome}
      </h3>
      <SeloCarimbo texto={l.regra} />
      <p className="capitulo__conta">{contarReceitas(l.visiveis.length)}</p>
    </>
  )
  const grade = (l: LinhaNaTela) => (
    <GradeProdutos
      produtos={l.visiveis}
      tipos={vista.tipos}
      nomesDosSelos={vista.nomesDosSelos}
      comAncora
      semEntrada={chamado}
      nivel={4}
      precarregar={primeiraFoto}
    />
  )

  return (
    <div className="catalogo">
      <div className="wrap catalogo__corpo">
        <div className="catalogo__filtros so-js">
          {vista.vontades.length > 0 ? (
            <>
              <p id="filtro-vontade" className="catalogo__filtro-rotulo">
                Na vontade de
              </p>
              <div role="group" aria-labelledby="filtro-vontade" className="catalogo__pilulas">
                {vista.vontades.map((v) => (
                  <Pilula
                    key={v.slug}
                    aria-pressed={vontade === v.slug}
                    onClick={() => escolherVontade(vontade === v.slug ? null : v.slug)}
                  >
                    {v.palavra} <small>{v.contagem}</small>
                  </Pilula>
                ))}
              </div>
            </>
          ) : null}
          {vista.selos.length > 0 ? (
            <div role="group" aria-label="Filtrar pelo selo" className="catalogo__pilulas">
              {vista.selos.map((s) => (
                <Pilula
                  key={s.id}
                  variante="selo"
                  aria-pressed={selo === s.id}
                  onClick={() => escolherSelo(selo === s.id ? null : s.id)}
                >
                  {s.nome}
                </Pilula>
              ))}
            </div>
          ) : null}
          <p aria-live="polite" className="catalogo__mostrando">
            {`Mostrando ${mostrando} de ${contarReceitas(vista.contagem)}.`}
          </p>
        </div>

        <div className={`catalogo__miolo${vista.temSumario ? ' catalogo__miolo--com-sumario' : ''}`}>
          {vista.temSumario ? <Sumario itens={montarSumario(vista.capitulos, (p) => visiveis.has(p.slug))} /> : null}
          <div className="catalogo__receitas">
            {naTela.map((c, i) => {
              const titulo = (
                <h2
                  ref={i === 0 ? primeiroTituloRef : undefined}
                  id={`titulo-${c.slug}`}
                  tabIndex={-1}
                  className="capitulo__titulo"
                >
                  {c.nome}
                </h2>
              )
              // Com uma linha so, o titulo da categoria e o topo da linha
              // dividem a mesma fileira; por isso o h2 mora dentro da secao
              // da linha. A ordem dos titulos (h2, h3, h4) e a mesma.
              const [unica] = c.linhas
              return (
                <section key={c.slug} id={c.slug} aria-labelledby={`titulo-${c.slug}`} className="capitulo scroll-mt-24">
                  {c.linhas.length === 1 ? (
                    <section id={unica.id} aria-labelledby={rotuloDaLinha(unica)} className="capitulo__linha scroll-mt-24">
                      <div className="capitulo__topo capitulo__topo--junto">
                        {titulo}
                        {topoDaLinha(unica)}
                      </div>
                      {grade(unica)}
                    </section>
                  ) : (
                    <>
                      <div className="capitulo__topo">{titulo}</div>
                      {c.linhas.map((l) => (
                        <section key={l.slug} id={l.id} aria-labelledby={rotuloDaLinha(l)} className="capitulo__linha scroll-mt-24">
                          <div className="capitulo__linha-topo">{topoDaLinha(l)}</div>
                          {grade(l)}
                        </section>
                      ))}
                    </>
                  )}
                </section>
              )
            })}

            {mostrando === 0 ? (
              <p className="cardapio__vazio">
                Nenhuma receita com esse filtro ainda.{' '}
                <button type="button" onClick={verTodas}>
                  Ver todas
                </button>
              </p>
            ) : null}

            <a href="/#hoje" className="catalogo__hoje catalogo__hoje--fim">
              <span>Não sabe o que escolher?</span>
              <b>
                Hoje o dia pede
                <svg className="catalogo__seta" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </b>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
