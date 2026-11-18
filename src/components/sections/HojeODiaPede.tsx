'use client'

import Image from 'next/image'
import { useMotionValueEvent, useScroll } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useRolagem } from '@/components/RolagemSuave'
import { PalavraTroca } from '@/components/ui/PalavraTroca'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { Pilula } from '@/components/ui/Pilula'
import { PoteEnche } from '@/components/ui/PoteEnche'
import { useTrava } from '@/components/ui/useTrava'
import { CAMINHO_CATALOGO, type GrupoVontade } from '@/lib/visao'
import {
  contarOpcoes,
  indicePorProgresso,
  listarNomes,
  posicaoDoIndice,
  textoVerNoCardapio,
} from '@/lib/vontade'

/** A mesma condicao do CSS que prende a secao (src/app/estilos/hoje.css).
 *  Em janela baixa o conteudo nao cabe em 100svh, entao nao prende; numa
 *  coluna so (ate 820px) ele e mais alto e pede 800px. */
export const CONSULTA_PINO =
  '(prefers-reduced-motion: no-preference) and (min-width: 821px) and (min-height: 700px), ' +
  '(prefers-reduced-motion: no-preference) and (max-width: 820px) and (min-height: 800px)'

function estaPinado(): boolean {
  return document.documentElement.classList.contains('js') && window.matchMedia(CONSULTA_PINO).matches
}

type Props = {
  vontades: readonly GrupoVontade[]
  tipos: Readonly<Record<string, string>>
}

/**
 * Hoje o dia pede: a secao pinada de hoje, agora escolhendo pela vontade.
 *
 * Pinada (JS, sem movimento reduzido, janela alta): o trilho tem
 * 100svh + n * 55svh e o progresso da rolagem nele escolhe a vontade. As
 * pilulas sao abas; escolher uma rola ate o trecho dela e trava a selecao
 * durante a rolagem, para a palavra nao passar pelas do meio. Sem pino, as
 * abas so trocam o conteudo.
 */
export function HojeODiaPede({ vontades, tipos }: Props) {
  const n = vontades.length
  const [indice, setIndice] = useState(0)
  const [trocou, setTrocou] = useState(false)
  const indiceRef = useRef(0)
  const trilhoRef = useRef<HTMLDivElement>(null)
  const abasRef = useRef<(HTMLButtonElement | null)[]>([])
  const { travar, soltar, travada } = useTrava(1600, sincronizarComRolagem)
  const { rolarPara } = useRolagem()

  function mudar(i: number) {
    if (i === indiceRef.current) return
    indiceRef.current = i
    setIndice(i)
    setTrocou(true)
  }

  /** O trilho medido agora: onde ele comeca e quanto a pagina corre nele. */
  function medirTrilho() {
    const trilho = trilhoRef.current
    if (!trilho || !estaPinado()) return null
    const curso = trilho.offsetHeight - window.innerHeight
    if (curso <= 0) return null
    return { topo: trilho.getBoundingClientRect().top + window.scrollY, curso }
  }

  /** Ao soltar a trava, a selecao volta a seguir a posicao real da pagina,
   *  que pode nao ser a escolhida: a pessoa pode ter girado a roda no meio. */
  function sincronizarComRolagem() {
    const t = medirTrilho()
    if (t) mudar(indicePorProgresso((window.scrollY - t.topo) / t.curso, n))
  }

  // Roda, toque ou tecla de rolagem: a pessoa assumiu a rolagem, a trava solta.
  useEffect(() => {
    const assumiu = () => {
      if (travada()) soltar()
    }
    window.addEventListener('wheel', assumiu, { passive: true })
    window.addEventListener('touchstart', assumiu, { passive: true })
    return () => {
      window.removeEventListener('wheel', assumiu)
      window.removeEventListener('touchstart', assumiu)
    }
  }, [travada, soltar])

  const { scrollYProgress } = useScroll({ target: trilhoRef, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (travada() || !estaPinado()) return
    mudar(indicePorProgresso(p, n))
  })

  function escolher(i: number) {
    const t = medirTrilho()
    mudar(i)
    if (!t) return
    travar(i)
    rolarPara(posicaoDoIndice(i, n, t.topo, t.curso), { aoTerminar: soltar })
  }

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const alvos: Record<string, number> = { ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: n - 1 }
    const destino = alvos[e.key]
    if (destino === undefined) return
    e.preventDefault()
    const i = (destino + n) % n
    abasRef.current[i]?.focus()
    escolher(i)
  }

  const grupo = vontades[indice]
  const principal = grupo.capa
  const outros = grupo.produtos.filter((p) => p.slug !== principal.slug)
  const quantos = grupo.produtos.length

  return (
    <section id="hoje" aria-labelledby="titulo-hoje" className="hoje scroll-mt-24">
      <div ref={trilhoRef} className="hoje__trilho" style={{ '--n': n } as CSSProperties}>
        <div className="hoje__painel">
          <div className="wrap hoje__grade">
            <div className="hoje__texto">
              <h2 id="titulo-hoje">Hoje o dia pede</h2>

              <div role="tabpanel" id="hoje-painel" aria-labelledby={`hoje-aba-${grupo.slug}`}>
                <PalavraTroca palavra={`${grupo.palavra}.`} />
                <p className="hoje__frase">
                  <b>{contarOpcoes(quantos)}:</b> {listarNomes(grupo.produtos.map((p) => p.nome))}.
                </p>
                <div className="hoje__opcoes">
                  <LinkSublinhado href={`${CAMINHO_CATALOGO}?vontade=${grupo.slug}`} traco={2}>
                    {textoVerNoCardapio(quantos)}
                  </LinkSublinhado>
                </div>
              </div>

              <div role="tablist" aria-label="Vontades" className="hoje__abas so-js" onKeyDown={aoTeclar}>
                {vontades.map((v, i) => (
                  <Pilula
                    key={v.slug}
                    ref={(el) => {
                      abasRef.current[i] = el
                    }}
                    role="tab"
                    id={`hoje-aba-${v.slug}`}
                    aria-selected={i === indice}
                    aria-controls="hoje-painel"
                    tabIndex={i === indice ? 0 : -1}
                    onClick={() => escolher(i)}
                  >
                    {v.palavra} <small>{v.produtos.length}</small>
                  </Pilula>
                ))}
              </div>

              <div className="hoje__progresso" aria-hidden="true">
                <span>
                  {indice + 1} / {n}
                </span>
                <span className="hoje__barra">
                  <i style={{ '--progresso': (indice + 1) / n } as CSSProperties} />
                </span>
                <span className="hoje__dica">role pra trocar</span>
              </div>
            </div>

            <div className="hoje__lado">
              <div key={grupo.slug} className={`hoje__pilha${trocou ? ' troca' : ''}`} aria-hidden="true">
                {outros.slice(0, 2).map((p) => (
                  <div key={p.slug} className="hoje__mini">
                    <Image
                      src={p.imagem.src}
                      alt=""
                      width={p.imagem.largura}
                      height={p.imagem.altura}
                      loading="lazy"
                      sizes="104px"
                    />
                  </div>
                ))}
              </div>
              <div className="hoje__moldura">
                <PoteEnche key={principal.slug}>
                  <Image
                    src={principal.imagem.src}
                    alt={principal.imagem.alt}
                    width={principal.imagem.largura}
                    height={principal.imagem.altura}
                    loading="lazy"
                    sizes="(max-width: 820px) 180px, 340px"
                  />
                </PoteEnche>
              </div>
              <div className="etiqueta" aria-hidden="true">
                <b>{principal.nome}</b>
                <small>{tipos[principal.linha]}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
