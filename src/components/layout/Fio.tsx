'use client'

import { useEffect, useRef } from 'react'
import { tracarFio, type Ancora, type Bloco, type Caixa } from '@/lib/fio'

/** A partir daqui a home esta em colunas (o hero abre em duas). */
const LARGURA_EM_COLUNAS = 900
/** de quantos em quantos px o traco e amostrado para saber ate onde desenhar */
const PASSO = 6
const SVG = 'http://www.w3.org/2000/svg'

type Trecho = {
  caminho: SVGPathElement
  total: number
  /** ate onde a pena ja desceu (em y), a cada PASSO do traco */
  tabela: number[]
  /** so no painel preso: o trecho se desenha ao longo da secao inteira */
  janela: { topo: number; base: number } | null
  atual: number
}

/** A caixa do elemento dentro de `raiz`, pelo layout: ignora transform, e
 *  por isso nao muda com o parallax nem com as animacoes de entrada. */
function caixaEm(el: HTMLElement, raiz: HTMLElement): Caixa {
  let x = 0
  let y = 0
  let no: HTMLElement | null = el
  while (no && no !== raiz) {
    x += no.offsetLeft
    y += no.offsetTop
    no = no.offsetParent as HTMLElement | null
  }
  return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight }
}

/**
 * O fio que liga as secoes da home. Fica no <main>, por cima do fundo das
 * secoes e por baixo das fotos e dos cartoes (que sao posicionados e vem
 * depois dele no DOM).
 *
 * As secoes marcam as ancoras com `data-fio` (inicio, sub, atras, fim). Um
 * painel preso na tela marca `data-fio-janela` e leva o proprio
 * <svg class="fio fio--janela">: o trecho do fio dele e desenhado la dentro.
 *
 * O traco acompanha a rolagem: a ponta fica um pouco abaixo do meio da tela.
 * Com movimento reduzido ele ja nasce inteiro. Sem JavaScript nao ha fio, e
 * a pagina segue completa: ele e enfeite (aria-hidden).
 */
export function Fio() {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    const main = svg?.parentElement
    // jsdom nao mede caminho SVG; la o fio simplesmente nao se desenha
    if (!svg || !main || typeof SVGPathElement === 'undefined' || !('getTotalLength' in SVGPathElement.prototype)) {
      return
    }
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)')
    let trechos: Trecho[] = []
    let quadro = 0
    let medida = 0

    function novoCaminho(em: SVGSVGElement, d: string): SVGPathElement {
      const caminho = document.createElementNS(SVG, 'path')
      caminho.setAttribute('d', d)
      em.append(caminho)
      return caminho
    }

    function ajustar(em: SVGSVGElement, largura: number, altura: number) {
      em.replaceChildren()
      em.setAttribute('width', String(largura))
      em.setAttribute('height', String(altura))
      em.setAttribute('viewBox', `0 0 ${largura} ${altura}`)
    }

    function medir() {
      if (!svg || !main) return
      const largura = main.clientWidth
      const janelas = [...main.querySelectorAll<HTMLElement>('[data-fio-janela]')]
      const secoes = new Map<Element | null, number>()
      const blocos: Bloco[] = []
      const telas: (HTMLElement | null)[] = []
      for (const el of main.querySelectorAll<HTMLElement>('[data-fio]')) {
        const janela = janelas.find((j) => j.contains(el)) ?? null
        const dona = el.closest('section')
        if (!secoes.has(dona)) secoes.set(dona, secoes.size)
        const ancora: Ancora = {
          tipo: el.dataset.fio as Ancora['tipo'],
          caixa: caixaEm(el, janela ?? main),
          secao: secoes.get(dona) ?? 0,
        }
        if (blocos.length > 0 && telas[telas.length - 1] === janela) {
          ;(blocos[blocos.length - 1].ancoras as Ancora[]).push(ancora)
          continue
        }
        if (janela) {
          const secao = caixaEm(janela.closest('section') ?? janela, main)
          const conteudo = janela.querySelector<HTMLElement>(':scope > :not(svg)')
          blocos.push({
            tipo: 'janela',
            ancoras: [ancora],
            topo: secao.t,
            base: secao.b,
            altura: janela.offsetHeight,
            respiro: conteudo ? conteudo.offsetTop : 0,
          })
        } else {
          blocos.push({ tipo: 'pagina', ancoras: [ancora] })
        }
        telas.push(janela)
      }

      const caminhos = tracarFio(blocos, largura, largura >= LARGURA_EM_COLUNAS)
      const antes = trechos.map((t) => (t.total > 0 ? t.atual / t.total : 0))
      ajustar(svg, largura, main.offsetHeight)
      const prontas = new Set<SVGSVGElement>()
      trechos = []
      blocos.forEach((bloco, i) => {
        const janela = telas[i]
        const em = janela ? janela.querySelector<SVGSVGElement>(':scope > svg.fio--janela') : svg
        if (!em || !caminhos[i]) return
        if (janela && !prontas.has(em)) {
          ajustar(em, janela.clientWidth, janela.offsetHeight)
          prontas.add(em)
        }
        const caminho = novoCaminho(em, caminhos[i])
        const total = caminho.getTotalLength()
        const tabela: number[] = []
        let maior = -Infinity
        for (let l = 0; l <= total; l += PASSO) {
          maior = Math.max(maior, caminho.getPointAtLength(l).y)
          tabela.push(maior)
        }
        const atual = (antes[trechos.length] ?? 0) * total
        caminho.style.strokeDasharray = `${total} ${total}`
        caminho.style.strokeDashoffset = String(total - atual)
        trechos.push({
          caminho,
          total,
          tabela,
          janela: bloco.tipo === 'janela' ? { topo: bloco.topo, base: bloco.base } : null,
          atual,
        })
      })
      pedir()
    }

    /** o comprimento do traco ja desenhado quando a pena esta na altura y */
    function ate(trecho: Trecho, y: number): number {
      if (trecho.janela) {
        const { topo, base } = trecho.janela
        return Math.max(0, Math.min(1, (y - topo) / Math.max(1, base - topo))) * trecho.total
      }
      const { tabela, total } = trecho
      let a = 0
      let b = tabela.length - 1
      if (b < 0 || y >= tabela[b]) return total
      while (a < b) {
        const m = (a + b) >> 1
        if (tabela[m] < y) a = m + 1
        else b = m
      }
      return Math.min(total, a * PASSO)
    }

    function desenhar() {
      quadro = 0
      if (!main) return
      // a ponta da pena: 60% da tela, chegando ao pe da pagina no fim da rolagem
      const fim = document.documentElement.scrollHeight - window.innerHeight
      const p = fim > 0 ? Math.min(1, window.scrollY / fim) : 1
      const pena = -main.getBoundingClientRect().top + window.innerHeight * (0.6 + 0.4 * p)
      let falta = false
      for (const t of trechos) {
        const alvo = reduzir.matches ? t.total : ate(t, pena)
        t.atual = reduzir.matches || Math.abs(alvo - t.atual) < 0.6 ? alvo : t.atual + (alvo - t.atual) * 0.16
        t.caminho.style.strokeDashoffset = String(t.total - t.atual)
        if (t.atual !== alvo) falta = true
      }
      if (falta) pedir()
    }

    function pedir() {
      if (!quadro) quadro = requestAnimationFrame(desenhar)
    }

    function remedir() {
      cancelAnimationFrame(medida)
      medida = requestAnimationFrame(medir)
    }

    const observador = new ResizeObserver(remedir)
    observador.observe(main)
    for (const j of main.querySelectorAll('[data-fio-janela]')) observador.observe(j)
    window.addEventListener('scroll', pedir, { passive: true })
    reduzir.addEventListener('change', remedir)
    void document.fonts?.ready.then(remedir)
    medir()

    return () => {
      observador.disconnect()
      window.removeEventListener('scroll', pedir)
      reduzir.removeEventListener('change', remedir)
      cancelAnimationFrame(quadro)
      cancelAnimationFrame(medida)
      svg.replaceChildren()
      for (const s of main.querySelectorAll('svg.fio--janela')) s.replaceChildren()
    }
  }, [])

  return <svg ref={ref} className="fio" aria-hidden="true" focusable="false" />
}
