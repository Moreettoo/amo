'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * A rolagem que desliza, igual a da referencia.
 *
 * O lunarossa.framer.website roda esta mesma biblioteca: inspecionando a
 * pagina, o <html> dela carrega as classes `lenis lenis-autoToggle`. Entao
 * aqui nao e aproximacao do efeito, e a mesma engrenagem.
 *
 * O Lenis nao sequestra o scroll com transform num wrapper: ele continua
 * movendo o scrollTop real do documento, um frame por vez, interpolado. Isso
 * e o que mantem intactos `position: sticky` (a Nav e a ListaPinada dependem
 * disso), `getBoundingClientRect` (a ListaPinada calcula o indice ativo com
 * ele) e os eventos nativos de `scroll` que a Nav escuta.
 */

/** Nav grudada: 12px de topo + 88px de altura. 112 deixa uma folga e e o
 *  mesmo numero do `scroll-mt-28` das secoes, que continua sendo o caminho
 *  sem JavaScript. Um numero so pra ancora, nao dois. */
const DESLOCAMENTO_NAV = -112

/**
 * A ancora e conduzida aqui, e nao pela opcao `anchors` do Lenis, por dois
 * motivos concretos:
 *
 * 1. O `onClick` do Lenis nao chama preventDefault. A acao default do
 *    navegador roda depois dele e salta pro alvo na hora; no frame seguinte
 *    o Lenis reescreve a posicao interpolada dele e a pagina pula pro
 *    destino, volta pro inicio e so entao desliza.
 * 2. Foco. Prevenindo o default, o navegador tambem deixa de mover o foco de
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
  lenis.scrollTo(alvo, { offset: DESLOCAMENTO_NAV })

  // <main> e <section> nao sao focaveis por natureza. tabindex -1 e temporario
  // de proposito: deixá-lo no DOM poria os alvos numa ordem de tabulacao que
  // ninguem pediu. preventScroll e obrigatorio: sem ele o navegador rola pro
  // elemento focado e atropela a interpolacao do Lenis no mesmo frame.
  const jaFocavel = alvo.matches('a[href], button, input, select, textarea, [tabindex]')
  if (!jaFocavel) {
    alvo.setAttribute('tabindex', '-1')
    alvo.addEventListener('blur', () => alvo.removeAttribute('tabindex'), { once: true })
  }
  alvo.focus({ preventScroll: true })
}

export function RolagemSuave() {
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lenis: Lenis | null = null
    let aoClicar: ((evento: MouseEvent) => void) | null = null

    const desmontar = () => {
      if (aoClicar) document.removeEventListener('click', aoClicar)
      aoClicar = null
      lenis?.destroy()
      lenis = null
    }

    const sincronizar = () => {
      // Sob prefers-reduced-motion a instancia nao existe: a rolagem volta a
      // ser a nativa do navegador, sem interpolacao nenhuma, e a ancora volta
      // a ser a do proprio navegador (o `scroll-mt-28` das secoes cuida do
      // deslocamento). Destruir em vez de `stop()`, que congelaria a pagina
      // em vez de liberá-la.
      if (consulta.matches) return desmontar()
      if (lenis) return

      lenis = new Lenis({
        autoRaf: true,
        autoToggle: true,
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
      })
      const instancia = lenis
      aoClicar = (evento) => conduzirAncora(instancia, evento)
      document.addEventListener('click', aoClicar)
    }

    sincronizar()
    consulta.addEventListener('change', sincronizar)
    return () => {
      consulta.removeEventListener('change', sincronizar)
      desmontar()
    }
  }, [])

  return null
}
