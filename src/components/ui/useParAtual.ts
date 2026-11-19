'use client'

import { useEffect, useState } from 'react'
import { FRACAO_DA_LINHA, parAtual, SEM_PAR, type ItemDoSumario, type ParAtual } from '@/lib/sumario'

/**
 * A secao do catalogo em que a pessoa esta, medida na pagina: a cada rolagem
 * e a cada mudanca de tamanho da janela (um quadro por vez) mede o comeco
 * das secoes do sumario e pergunta ao `parAtual`. Mede de novo quando a
 * lista muda, porque o filtro tira e devolve secoes. No servidor e antes de
 * montar nao ha par: o HTML sai sem item atual.
 */
export function useParAtual(itens: readonly ItemDoSumario[]): ParAtual {
  const [par, setPar] = useState<ParAtual>(SEM_PAR)

  useEffect(() => {
    let quadro = 0
    const medir = () => {
      quadro = 0
      const novo = parAtual(
        itens,
        (id) => document.getElementById(id)?.getBoundingClientRect().top ?? null,
        window.innerHeight * FRACAO_DA_LINHA,
      )
      setPar((antes) => (antes.categoria === novo.categoria && antes.linha === novo.linha ? antes : novo))
    }
    const pedir = () => {
      if (!quadro) quadro = requestAnimationFrame(medir)
    }
    pedir()
    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    return () => {
      if (quadro) cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', pedir)
      window.removeEventListener('resize', pedir)
    }
  }, [itens])

  return par
}
