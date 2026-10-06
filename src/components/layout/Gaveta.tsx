'use client'

import Image from 'next/image'
import { useEffect, useRef, type CSSProperties, type MouseEvent, type SyntheticEvent } from 'react'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import {
  CAMINHO_CATALOGO,
  caminhoDaLinha,
  contarReceitas,
  textoVerReceitas,
  type DadosGaveta,
} from '@/lib/visao'

/** Os links da home: na nav (desktop) e no pe da gaveta (celular). */
export const LINKS_DA_HOME = [
  { href: '/#hoje', rotulo: 'Hoje o dia pede' },
  { href: '/#rotulos', rotulo: 'O que é saudável' },
  { href: '/#marca', rotulo: 'A marca' },
] as const

/** A duracao de gaveta-sai e fundo-sai em movimento.css. */
export const DURACAO_SAIDA = 250

/**
 * A borda ondulada: as camadas do bolo de lado, numa caixa de 28 x 900
 * esticada na altura da janela. Cada curva termina onde a proxima comeca e
 * com a mesma tangente, entao a onda nao quebra.
 */
function onda(base: number, amplitude: number, passo: number): string {
  let d = `M0,0 L${base},0`
  for (let y = 0; y < 900; y += passo) {
    d += ` C${base + amplitude},${y + passo / 3} ${base - amplitude},${y + (2 * passo) / 3} ${base},${y + passo}`
  }
  return `${d} L0,900 Z`
}

const ONDAS = [
  { cor: 'cobre', d: onda(21, 6, 180) },
  { cor: 'caramelo', d: onda(13, 5, 140) },
  { cor: 'creme', d: onda(5, 4, 160) },
] as const

/** Os itens entram um depois do outro; o atraso vem de --i (movimento.css). */
const ordem = (i: number) => ({ '--i': i }) as CSSProperties

function animaSaida(): boolean {
  return (
    document.documentElement.classList.contains('js') &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  )
}

function Seta() {
  return (
    <svg className="gaveta__icone" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

type Props = {
  id: string
  dados: DadosGaveta
  /** a linha aberta no catalogo, marcada com aria-current */
  linhaAtual: string | null
  aberta: boolean
  /** a gaveta fechou de vez; `devolverFoco` e falso quando um link da
   *  propria pagina levou o foco para o alvo */
  aoFechar: (devolverFoco: boolean) => void
}

/**
 * A gaveta do catalogo: um <dialog> modal vindo da esquerda. O navegador
 * cuida da camada de cima, do fundo inerte e de prender o foco; aqui fica a
 * abertura, a saida animada e o que cada clique faz. A entrada e CSS puro
 * (movimento.css, sob [open]); a saida espera o CSS tocar antes do close().
 */
export function Gaveta({ id, dados, linhaAtual, aberta, aoFechar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const devolver = useRef(true)

  useEffect(() => {
    const d = ref.current
    if (!aberta || !d) return
    window.clearTimeout(timer.current)
    d.removeAttribute('data-fechando')
    if (!d.open) d.showModal()
    fecharRef.current?.focus()
  }, [aberta])

  useEffect(() => {
    const t = timer
    return () => window.clearTimeout(t.current)
  }, [])

  /** Fecha de vez. Quem avisa e o evento close, que tambem cobre o navegador
   *  fechando sozinho (um segundo Esc seguido nao e cancelavel). */
  function concluir(devolverFoco: boolean) {
    const d = ref.current
    window.clearTimeout(timer.current)
    if (!d?.open) return
    devolver.current = devolverFoco
    d.removeAttribute('data-fechando')
    d.close()
  }

  /** Pedido de fechar (o botao, o Esc, o clique fora). Com movimento, a saida
   *  toca antes; pedido repetido no meio dela nao conta. */
  function fechar() {
    const d = ref.current
    if (!d?.open || d.hasAttribute('data-fechando')) return
    if (!animaSaida()) return concluir(true)
    d.setAttribute('data-fechando', '')
    timer.current = window.setTimeout(() => concluir(true), DURACAO_SAIDA)
  }

  function aoFecharNativo() {
    window.clearTimeout(timer.current)
    ref.current?.removeAttribute('data-fechando')
    const devolverFoco = devolver.current
    devolver.current = true
    aoFechar(devolverFoco)
  }

  function aoCancelar(e: SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault()
    fechar()
  }

  function aoClicar(e: MouseEvent<HTMLDialogElement>) {
    // Painel e borda cobrem a caixa do <dialog> inteira: clique com alvo no
    // proprio <dialog> so pode ter vindo do fundo.
    if (e.target === e.currentTarget) return fechar()
    const link = (e.target as Element).closest('a[href]')
    if (!(link instanceof HTMLAnchorElement)) return
    // Mesma pagina: fecha ja, sem animacao, para o RolagemSuave rolar ate o
    // alvo e levar o foco. Outra pagina: a navegacao troca o documento.
    // A ordem importa: este onClick (o React ouve na raiz) roda antes do
    // ouvinte de bolha do RolagemSuave no document. Se ela virasse, o foco
    // iria para um alvo ainda inerte atras do modal, e o close() depois o
    // devolveria a quem abriu a gaveta.
    if (new URL(link.href).pathname === window.location.pathname) concluir(false)
  }

  const [primeira] = dados.linhas
  const unica = dados.linhas.length === 1
  const pe = unica ? dados.sabores.length + 1 : dados.linhas.length + 1
  const atual = (slug: string) => (slug === linhaAtual ? ('page' as const) : undefined)

  // data-lenis-prevent no proprio <dialog>: o alvo da roda sobre o fundo
  // (::backdrop) e ele. Sem allow-discrete (Safari ate 17.3) o autoToggle
  // nao para o Lenis, e a roda ali rolaria a pagina de tras. O painel, que
  // rola sozinho, herda.
  return (
    <dialog
      id={id}
      ref={ref}
      aria-labelledby={`${id}-titulo`}
      className="gaveta"
      data-lenis-prevent
      onCancel={aoCancelar}
      onClose={aoFecharNativo}
      onClick={aoClicar}
    >
      <svg className="gaveta__onda" viewBox="0 0 28 900" preserveAspectRatio="none" aria-hidden="true">
        {ONDAS.map((o) => (
          <path key={o.cor} d={o.d} style={{ fill: `var(--color-${o.cor})` }} />
        ))}
      </svg>

      <div className="gaveta__painel grao">
        <div className="gaveta__topo">
          <h2 id={`${id}-titulo`}>Catálogo</h2>
          <button
            ref={fecharRef}
            type="button"
            className="gaveta__fechar"
            aria-label="Fechar o catálogo"
            onClick={fechar}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {unica ? (
          <>
            <p className="gaveta__frase">Escolha a linha ou vá direto a um sabor.</p>
            <a
              href={caminhoDaLinha(primeira.slug)}
              aria-current={atual(primeira.slug)}
              className="gaveta__unica gaveta__item"
              style={ordem(0)}
            >
              <span className="gaveta__texto">
                <span className="gaveta__regra">{primeira.regra}</span>
                <span className="gaveta__nome">{primeira.nome}</span>
                <span className="gaveta__ver">
                  {textoVerReceitas(primeira.contagem)} <Seta />
                </span>
              </span>
              <span className="gaveta__arcos" aria-hidden="true">
                {dados.sabores.slice(0, 3).map((s) => (
                  <Image
                    key={s.slug}
                    src={s.imagem.src}
                    alt=""
                    width={s.imagem.largura}
                    height={s.imagem.altura}
                    loading="lazy"
                    sizes="56px"
                  />
                ))}
              </span>
            </a>
            <p id={`${id}-sabores`} className="gaveta__rotulo">
              Os sabores
            </p>
            <ul aria-labelledby={`${id}-sabores`} className="gaveta__sabores">
              {dados.sabores.map((s, i) => (
                <li key={s.slug} className="gaveta__item" style={ordem(i + 1)}>
                  <a href={`${caminhoDaLinha(primeira.slug)}#${s.slug}`}>
                    <Image
                      src={s.imagem.src}
                      alt=""
                      width={s.imagem.largura}
                      height={s.imagem.altura}
                      loading="lazy"
                      sizes="40px"
                    />
                    {s.nome}
                    <svg className="gaveta__icone" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="gaveta__frase">Escolha uma linha para ver as receitas dela.</p>
            <ul className="gaveta__linhas">
              {dados.linhas.map((l, i) => (
                <li key={l.slug} className="gaveta__item" style={ordem(i)}>
                  <a href={caminhoDaLinha(l.slug)} aria-current={atual(l.slug)} className="gaveta__linha">
                    <span className="gaveta__moldura">
                      <span className={`gaveta__capa gaveta__capa--${classeDoFormato(l.capa.formato)}`}>
                        <Image
                          src={l.capa.imagem.src}
                          alt=""
                          width={l.capa.imagem.largura}
                          height={l.capa.imagem.altura}
                          loading="lazy"
                          sizes="70px"
                        />
                      </span>
                    </span>
                    <span className="gaveta__texto">
                      <span className="gaveta__regra">{l.regra}</span>
                      <span className="gaveta__nome">{l.nome}</span>
                      <span className="gaveta__conta">{contarReceitas(l.contagem)}</span>
                    </span>
                    <span className="gaveta__seta" aria-hidden="true">
                      <Seta />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <BotaoRetro
              href={CAMINHO_CATALOGO}
              escuro
              className="gaveta__tudo gaveta__item"
              style={ordem(dados.linhas.length)}
            >
              Ver o catálogo inteiro <span className="gaveta__total">{contarReceitas(dados.total)}</span>
            </BotaoRetro>
          </>
        )}

        <div className="gaveta__casa gaveta__item" style={ordem(pe)}>
          <p id={`${id}-casa`}>Na página inicial</p>
          <ul aria-labelledby={`${id}-casa`}>
            {LINKS_DA_HOME.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.rotulo}</a>
              </li>
            ))}
          </ul>
        </div>

        <a href="/#hoje" className="gaveta__hoje gaveta__item" style={ordem(pe)}>
          <span>Não sabe o que escolher?</span>
          <b>
            Hoje o dia pede <Seta />
          </b>
        </a>
      </div>
    </dialog>
  )
}
