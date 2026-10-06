'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { GradeProdutos } from '@/components/ui/GradeProdutos'
import { IconeCamadas } from '@/components/ui/IconeCamadas'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import { PapelRotulo } from '@/components/ui/PapelRotulo'
import { Pilula } from '@/components/ui/Pilula'
import { contarReceitas, filtrar, type VistaCatalogo } from '@/lib/visao'

/** A vontade de chegada (`?vontade=chocolate`, vinda do Hoje o dia pede).
 *  So vale uma vontade que filtra alguma coisa na vista; o resto e ignorado. */
export function vontadeDaBusca(busca: string, validas: readonly { slug: string }[]): string | null {
  const v = new URLSearchParams(busca).get('vontade')
  return v !== null && validas.some((x) => x.slug === v) ? v : null
}

// A busca da URL como fonte externa: no servidor e na hidratacao ela e
// vazia, entao o HTML do servidor sai completo e sem filtro; logo depois o
// cliente le a de verdade. A pagina nao troca de URL sem navegar.
const semAssinatura = () => () => {}
const buscaDoCliente = () => window.location.search
const buscaDoServidor = () => ''

type Props = { vista: VistaCatalogo }

/**
 * O corpo do catalogo: a coluna de linhas (com 2 ou mais), os filtros de
 * vontade e de selo, os grupos de receitas e, numa linha, o rotulo dela. A
 * linha nao e filtro: e a rota.
 */
export function CatalogoPagina({ vista }: Props) {
  const busca = useSyncExternalStore(semAssinatura, buscaDoCliente, buscaDoServidor)
  // undefined: a pessoa ainda nao escolheu, e vale a vontade da URL
  const [escolhida, setEscolhida] = useState<string | null | undefined>(undefined)
  const [selo, setSelo] = useState<string | null>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)

  const vontade = escolhida === undefined ? vontadeDaBusca(busca, vista.vontades) : escolhida
  const grupos = vista.grupos.map((g) => ({ ...g, visiveis: filtrar(g.produtos, { linha: null, selo, vontade }) }))
  const mostrando = grupos.reduce((n, g) => n + g.visiveis.length, 0)
  const tudo = vista.linha === null
  // os slugs que o filtro tirou da tela, numa string para a dependencia do efeito
  const escondidos = grupos
    .flatMap((g) => g.produtos.filter((p) => !g.visiveis.includes(p)).map((p) => p.slug))
    .join(' ')

  // O sabor da gaveta que o filtro escondeu nao tem card no DOM, e o
  // RolagemSuave nao teria para onde rolar. Na captura, antes da gaveta (o
  // onClick do React) e do RolagemSuave (os dois ouvem na bolha), o filtro
  // sai, e o flushSync poe o card no DOM antes deles procurarem o alvo.
  useEffect(() => {
    if (!escondidos) return
    const fora = new Set(escondidos.split(' '))
    function aoClicar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return
      const url = new URL(link.href)
      if (url.host !== window.location.host || url.pathname !== window.location.pathname) return
      if (!fora.has(decodeURIComponent(url.hash.slice(1)))) return
      flushSync(() => {
        setEscolhida(null)
        setSelo(null)
      })
    }
    document.addEventListener('click', aoClicar, true)
    return () => document.removeEventListener('click', aoClicar, true)
  }, [escondidos])

  // O botao clicado some da tela; o foco vai para o titulo das receitas em
  // vez de cair no <body>.
  function verTodas() {
    setEscolhida(null)
    setSelo(null)
    tituloRef.current?.focus()
  }

  return (
    <div className="catalogo grao">
      <div className="wrap catalogo__corpo">
        {/* div e nao aside: dentro do <main>, um complementary reprova no axe
            (landmark-complementary-is-top-level). O landmark e o nav. */}
        {vista.itensLinha.length > 0 ? (
          <div className="catalogo__lado">
            <nav aria-label="Linhas" className="catalogo__linhas">
              <p className="rotulo-secao catalogo__rotulo">Linhas</p>
              <ul>
                {vista.itensLinha.map((i) => (
                  <li key={i.href}>
                    <a href={i.href} aria-current={i.atual ? 'page' : undefined} className="catalogo__linha">
                      <span
                        className={`catalogo__forma catalogo__forma--${i.formato === null ? 'tudo' : classeDoFormato(i.formato)}`}
                        aria-hidden="true"
                      >
                        {i.formato === null ? <IconeCamadas /> : null}
                      </span>
                      <span className="catalogo__linha-nome">{i.nome}</span>
                      <span className="catalogo__linha-conta">{i.contagem}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <a href="/#hoje" className="catalogo__hoje">
                <span>Não sabe o que escolher?</span>
                <b>
                  Hoje o dia pede
                  <svg className="catalogo__seta" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </b>
              </a>
            </nav>
          </div>
        ) : null}

        <div className="catalogo__receitas">
          <h2 ref={tituloRef} tabIndex={-1} className="sr-only">
            Receitas
          </h2>

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
                      onClick={() => setEscolhida(vontade === v.slug ? null : v.slug)}
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
                    onClick={() => setSelo(selo === s.id ? null : s.id)}
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

          {grupos.map((g) =>
            g.visiveis.length === 0 ? null : (
              <section
                key={g.slug}
                aria-labelledby={tudo ? `grupo-${g.slug}` : undefined}
                className="catalogo__grupo"
              >
                {tudo ? (
                  <div className="catalogo__grupo-topo">
                    <h2 id={`grupo-${g.slug}`}>{g.nome}</h2>
                    <LinkSublinhado href={g.href}>{`Ver só ${g.nome.toLowerCase()}`}</LinkSublinhado>
                  </div>
                ) : null}
                <GradeProdutos
                  produtos={g.visiveis}
                  tipos={vista.tipos}
                  nomesDosSelos={vista.nomesDosSelos}
                  comAncora
                />
              </section>
            ),
          )}

          {mostrando === 0 ? (
            <p className="cardapio__vazio">
              Nenhuma receita com esse filtro ainda.{' '}
              <button type="button" onClick={verTodas}>
                Ver todas
              </button>
            </p>
          ) : null}

          {vista.linha ? (
            <section aria-labelledby="titulo-rotulo-linha" className="catalogo__rotulo-linha">
              <h2 id="titulo-rotulo-linha" className="rotulo-secao">
                O rótulo da linha
              </h2>
              <PapelRotulo linha={vista.linha} nomesDosSelos={vista.nomesDosSelos} giro="-1deg" largo />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
