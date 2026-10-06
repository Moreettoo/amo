'use client'

import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useMemo, useRef } from 'react'
import { useFiltro } from '@/components/FiltroProvider'
import { CardProduto } from '@/components/ui/CardProduto'
import { Pilula } from '@/components/ui/Pilula'
import type { Produto } from '@/lib/catalogo'
import { EASE_AMO } from '@/lib/motion'
import { filtrar, type GrupoVontade, type OpcaoLinha, type OpcaoSelo } from '@/lib/visao'

type Props = {
  produtos: readonly Produto[]
  tipos: Readonly<Record<string, string>>
  nomesDosSelos: Readonly<Record<string, string>>
  filtrosLinha: readonly OpcaoLinha[]
  filtrosSelo: readonly OpcaoSelo[]
  vontades: readonly Pick<GrupoVontade, 'slug' | 'palavra'>[]
}

const MOLA = [0.34, 1.4, 0.64, 1] as const

/**
 * O cardapio. Filtro de linha e de selo so aparecem quando filtram alguma
 * coisa (montarVisao decide); a vontade chega de fora, pelo Hoje o dia
 * pede, e aparece como pilula removivel. Quem fica desliza para o novo
 * lugar (FLIP do Motion); quem entra cresce. Sob movimento reduzido o
 * MotionConfig desliga o deslocamento.
 */
export function Cardapio({ produtos, tipos, nomesDosSelos, filtrosLinha, filtrosSelo, vontades }: Props) {
  const { linha, selo, vontade, definir, limpar } = useFiltro()
  const tituloRef = useRef<HTMLHeadingElement>(null)
  // O botao clicado some da tela (a pilula da vontade, o "Ver todas"); o foco
  // vai para o titulo do cardapio em vez de cair no <body>.
  const focarTitulo = () => tituloRef.current?.focus()
  const visiveis = useMemo(
    () => filtrar(produtos, { linha, selo, vontade }),
    [produtos, linha, selo, vontade],
  )
  const temFiltro = filtrosLinha.length > 0 || filtrosSelo.length > 0
  const palavra = vontades.find((v) => v.slug === vontade)?.palavra.toLowerCase()

  return (
    <section id="cardapio" aria-labelledby="titulo-cardapio" className="cardapio grao scroll-mt-24">
      <div className="wrap">
        <div className={`cardapio__topo${temFiltro ? ' cardapio__topo--duplo' : ''}`}>
          <div>
            <p className="rotulo-secao">O cardápio</p>
            <h2 id="titulo-cardapio" ref={tituloRef} tabIndex={-1} className="titulo-secao">
              Escolha pelo sabor
            </h2>
          </div>
          {temFiltro ? <p className="texto">Filtre pela linha ou pelo que importa pra você.</p> : null}
        </div>

        {temFiltro || palavra !== undefined ? (
          <div role="group" aria-label="Filtrar o cardápio" className="filtros so-js">
            {filtrosLinha.length > 0 ? (
              <>
                <Pilula aria-pressed={linha === null} onClick={() => definir({ linha: null })}>
                  Tudo <em>{produtos.length}</em>
                </Pilula>
                {filtrosLinha.map((l) => (
                  <Pilula key={l.slug} aria-pressed={linha === l.slug} onClick={() => definir({ linha: l.slug })}>
                    {l.nome} <em>{l.contagem}</em>
                  </Pilula>
                ))}
              </>
            ) : null}
            {filtrosLinha.length > 0 && filtrosSelo.length > 0 ? (
              <span className="filtros__sep" aria-hidden="true" />
            ) : null}
            {filtrosSelo.map((s) => (
              <Pilula
                key={s.id}
                variante="selo"
                aria-pressed={selo === s.id}
                onClick={() => definir({ selo: selo === s.id ? null : s.id })}
              >
                {s.nome}
              </Pilula>
            ))}
            {palavra !== undefined ? (
              <Pilula
                ativa
                aria-label={`Tirar o filtro de vontade: ${palavra}`}
                onClick={() => {
                  definir({ vontade: null })
                  focarTitulo()
                }}
              >
                Vontade: {palavra} <span aria-hidden="true">✕</span>
              </Pilula>
            ) : null}
          </div>
        ) : null}

        <p className="sr-only so-js" aria-live="polite">
          {`Mostrando ${visiveis.length} de ${produtos.length} receitas.`}
        </p>

        <MotionConfig reducedMotion="user">
          <ul role="list" className="grade">
            <AnimatePresence mode="popLayout" initial={false}>
              {visiveis.map((p) => (
                <motion.li
                  key={p.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                  transition={{
                    layout: { duration: 0.56, ease: EASE_AMO },
                    default: { duration: 0.42, delay: 0.09, ease: MOLA },
                  }}
                >
                  <CardProduto produto={p} tipo={tipos[p.linha] ?? ''} nomesDosSelos={nomesDosSelos} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </MotionConfig>

        {visiveis.length === 0 ? (
          <p className="cardapio__vazio">
            Nenhuma receita com esse filtro ainda.{' '}
            <button
              type="button"
              onClick={() => {
                limpar()
                focarTitulo()
              }}
            >
              Ver todas
            </button>
          </p>
        ) : null}
      </div>
    </section>
  )
}
