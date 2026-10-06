'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import Lenis from 'lenis'

/**
 * A rolagem que desliza, igual a da referencia (o lunarossa.framer.website
 * roda esta mesma biblioteca).
 *
 * O Lenis nao sequestra o scroll com transform num wrapper: ele move o
 * scrollTop real do documento, um frame por vez. Isso mantem intactos
 * `position: sticky` (a nav e o Hoje o dia pede dependem disso),
 * `getBoundingClientRect` e o `useScroll` do Motion.
 *
 * Alem de ligar o Lenis, oferece `useRolagem().rolarPara`, para quem precisa
 * rolar ate um ponto exato (as abas do Hoje o dia pede).
 */

/** Nav: 12px de `top-3` + 64px de altura + 20 de folga. Mora no
 *  `scroll-mt-24` das secoes, e e de la que os dois caminhos o leem: o
 *  navegador sem Lenis e o proprio Lenis, cujo scrollTo(elemento) ja desconta
 *  o scroll-margin-top do alvo. Passar offset por cima dobrava a distancia. */
export const DESLOCAMENTO_NAV = -96

type OpcoesRolagem = { aoTerminar?: () => void }
type Rolagem = { rolarPara: (y: number, opcoes?: OpcoesRolagem) => void }

/** Sem Lenis (movimento reduzido, ou antes de montar): salto nativo. */
function rolarNativo(y: number, opcoes?: OpcoesRolagem) {
  window.scrollTo({ top: y })
  opcoes?.aoTerminar?.()
}

const ContextoRolagem = createContext<Rolagem>({ rolarPara: rolarNativo })

export function useRolagem(): Rolagem {
  return useContext(ContextoRolagem)
}

/**
 * A ancora e conduzida aqui, e nao pela opcao `anchors` do Lenis, por dois
 * motivos concretos:
 *
 * 1. O `onClick` do Lenis nao chama preventDefault. A acao default do
 *    navegador roda depois dele e salta pro alvo na hora; no frame seguinte
 *    o Lenis reescreve a posicao interpolada dele e a pagina pula pro
 *    destino, volta pro inicio e so entao desliza.
 * 2. Foco. Prevenindo o default, o navegador deixa de mover o foco de
 *    teclado pro alvo, e o "Pular para o conteudo" viraria um link que rola a
 *    tela e nao leva ninguem a lugar nenhum. Como o default e nosso, o foco
 *    tambem tem que ser.
 */
function conduzirAncora(lenis: Lenis, evento: MouseEvent) {
  if (evento.defaultPrevented || evento.button !== 0) return
  if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return

  const alcancado = evento.target
  if (!(alcancado instanceof Element)) return
  const link = alcancado.closest('a[href]')
  if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return

  const url = new URL(link.href)
  const aqui = new URL(window.location.href)
  if (url.host !== aqui.host || url.pathname !== aqui.pathname) return
  if (!url.hash || url.hash === '#') return

  const alvo = document.querySelector(decodeURIComponent(url.hash))
  if (!(alvo instanceof HTMLElement)) return

  evento.preventDefault()
  window.history.pushState(null, '', url.hash)
  // Parado (a gaveta acabou de soltar a pagina e o Lenis ainda nao voltou):
  // o scrollTo dele seria ignorado, entao a rolagem vai pelo navegador.
  if (lenis.isStopped) alvo.scrollIntoView({ behavior: 'smooth' })
  else lenis.scrollTo(alvo)

  // tabindex -1 temporario: deixa-lo no DOM poria os alvos numa ordem de
  // tabulacao que ninguem pediu. preventScroll e obrigatorio: sem ele o
  // navegador rola pro elemento focado e atropela a interpolacao do Lenis.
  const jaFocavel = alvo.matches('a[href], button, input, select, textarea, [tabindex]')
  if (!jaFocavel) {
    alvo.setAttribute('tabindex', '-1')
    alvo.addEventListener('blur', () => alvo.removeAttribute('tabindex'), { once: true })
  }
  alvo.focus({ preventScroll: true })
}

export function RolagemSuave({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    let aoClicar: ((evento: MouseEvent) => void) | null = null

    const desmontar = () => {
      if (aoClicar) document.removeEventListener('click', aoClicar)
      aoClicar = null
      lenisRef.current?.destroy()
      lenisRef.current = null
    }

    const sincronizar = () => {
      // Sob prefers-reduced-motion a instancia nao existe: a rolagem volta a
      // ser a nativa e a ancora volta a ser a do navegador (o `scroll-mt-24`
      // das secoes cuida do deslocamento). Destruir em vez de `stop()`, que
      // congelaria a pagina em vez de libera-la.
      if (consulta.matches) return desmontar()
      if (lenisRef.current) return

      const lenis = new Lenis({
        autoRaf: true,
        autoToggle: true,
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
      })
      lenisRef.current = lenis
      aoClicar = (evento) => conduzirAncora(lenis, evento)
      document.addEventListener('click', aoClicar)
    }

    sincronizar()
    consulta.addEventListener('change', sincronizar)
    return () => {
      consulta.removeEventListener('change', sincronizar)
      desmontar()
    }
  }, [])

  const rolarPara = useCallback((y: number, opcoes?: OpcoesRolagem) => {
    const lenis = lenisRef.current
    if (!lenis) return rolarNativo(y, opcoes)
    lenis.scrollTo(y, { onComplete: () => opcoes?.aoTerminar?.() })
  }, [])

  const valor = useMemo(() => ({ rolarPara }), [rolarPara])
  return <ContextoRolagem.Provider value={valor}>{children}</ContextoRolagem.Provider>
}
