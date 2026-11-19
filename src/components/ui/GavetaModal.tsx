'use client'

import { useEffect, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'

/** A duracao de gaveta-sai e fundo-sai em movimento.css. */
export const DURACAO_SAIDA = 250

function animaSaida(): boolean {
  return (
    document.documentElement.classList.contains('js') &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  )
}

type Props = {
  id: string
  titulo: string
  /** o nome do botao de fechar: "Fechar o catálogo" */
  rotuloFechar: string
  /** a da esquerda (catalogo) ou a da direita (sacola) */
  lado?: 'esquerda' | 'direita'
  aberta: boolean
  /** a gaveta fechou de vez; `devolverFoco` e falso quando um link da
   *  propria pagina levou o foco para o alvo */
  aoFechar: (devolverFoco: boolean) => void
  children: ReactNode
}

/**
 * A casca das gavetas: um <dialog> modal, uma folha creme de borda reta com
 * o fio cobre no lado que abre. O navegador cuida da camada de cima, do
 * fundo inerte e de prender o foco; aqui fica a abertura, a saida animada e
 * o que cada clique faz. A entrada e CSS puro (movimento.css, sob [open]);
 * a saida espera o CSS tocar antes do close().
 */
export function GavetaModal({ id, titulo, rotuloFechar, lado = 'esquerda', aberta, aoFechar, children }: Props) {
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
    // O painel cobre a caixa do <dialog> inteira: clique com alvo no proprio
    // <dialog> so pode ter vindo do fundo.
    if (e.target === e.currentTarget) return fechar()
    // Quem pede para fechar sem ser link (o "Continuar escolhendo")
    if ((e.target as Element).closest('[data-fecha-gaveta]')) return fechar()
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

  // data-lenis-prevent no proprio <dialog>: o alvo da roda sobre o fundo
  // (::backdrop) e ele. Sem allow-discrete (Safari ate 17.3) o autoToggle
  // nao para o Lenis, e a roda ali rolaria a pagina de tras. O painel, que
  // rola sozinho, herda.
  return (
    <dialog
      id={id}
      ref={ref}
      aria-labelledby={`${id}-titulo`}
      className={lado === 'direita' ? 'gaveta gaveta--direita' : 'gaveta'}
      data-lenis-prevent
      onCancel={aoCancelar}
      onClose={aoFecharNativo}
      onClick={aoClicar}
    >
      <div className="gaveta__painel">
        <div className="gaveta__topo">
          <h2 id={`${id}-titulo`}>{titulo}</h2>
          <button
            ref={fecharRef}
            type="button"
            className="gaveta__fechar"
            aria-label={rotuloFechar}
            onClick={fechar}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
