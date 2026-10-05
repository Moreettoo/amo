'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { FILTRO_VAZIO, type Filtro } from '@/lib/visao'

/**
 * O filtro do cardapio, compartilhado. E o que deixa o "Ver as 3 no
 * cardapio" do Hoje o dia pede, as pilulas do Final e os links do Rodape
 * filtrarem o cardapio de outra secao sem mexer em DOM.
 */
type ContextoFiltro = Filtro & {
  definir: (parcial: Partial<Filtro>) => void
  limpar: () => void
}

const Contexto = createContext<ContextoFiltro | null>(null)

export function FiltroProvider({ children }: { children: ReactNode }) {
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_VAZIO)
  const definir = useCallback(
    (parcial: Partial<Filtro>) => setFiltro((atual) => ({ ...atual, ...parcial })),
    [],
  )
  const limpar = useCallback(() => setFiltro(FILTRO_VAZIO), [])
  const valor = useMemo(() => ({ ...filtro, definir, limpar }), [filtro, definir, limpar])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useFiltro(): ContextoFiltro {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useFiltro precisa de um FiltroProvider acima')
  return contexto
}
