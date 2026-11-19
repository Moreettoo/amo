'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  CHAVE_SACOLA,
  EVENTO_SACOLA,
  lerSacola,
  linhasDaSacola,
  type ItemDaLoja,
  type LinhaDaSacola,
  type Sacola,
} from '@/lib/sacola'

/** O texto gravado e a chave do cache: ler de novo so quando ele muda. */
let cache: { texto: string | null; sacola: Sacola } = { texto: null, sacola: {} }

function instantaneo(): Sacola {
  let texto: string | null = null
  try {
    texto = localStorage.getItem(CHAVE_SACOLA)
  } catch {}
  if (texto !== cache.texto) cache = { texto, sacola: lerSacola() }
  return cache.sacola
}

function assinar(avisar: () => void) {
  // a outra aba avisa pelo storage; esta, pelo evento da sacola
  const doOutroLado = (e: StorageEvent) => {
    if (e.key === null || e.key === CHAVE_SACOLA) avisar()
  }
  window.addEventListener(EVENTO_SACOLA, avisar)
  window.addEventListener('storage', doOutroLado)
  return () => {
    window.removeEventListener(EVENTO_SACOLA, avisar)
    window.removeEventListener('storage', doOutroLado)
  }
}

/** No servidor e na hidratacao a sacola ainda nao e conhecida: null. */
const noServidor = () => null

/**
 * As linhas da sacola, ja com nome, foto e preco da loja. `null` enquanto o
 * navegador nao leu a sacola (no servidor e no primeiro desenho), para a
 * pagina nao dizer "sacola vazia" a quem tem potes nela.
 */
export function useSacola(loja: readonly ItemDaLoja[]): LinhaDaSacola[] | null {
  const sacola = useSyncExternalStore(assinar, instantaneo, noServidor)
  return useMemo(() => (sacola ? linhasDaSacola(sacola, loja) : null), [sacola, loja])
}
