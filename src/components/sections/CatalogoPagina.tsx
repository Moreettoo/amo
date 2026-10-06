'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
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
