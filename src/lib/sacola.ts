import { DETALHES_DE_EXEMPLO } from '@/data/exemplos'
import type { Catalogo, ImagemProduto } from '@/lib/catalogo'

/**
 * A sacola mora no navegador (localStorage) ate o pedido ir para o servidor:
 * { slug: quantidade }. Aqui ficam as regras, sem React: ler, gravar, somar,
 * trocar a quantidade, tirar e fazer as contas. Quem desenha le pelo
 * useSacola (src/components/ui/useSacola.ts), que ouve o aviso de mudanca.
 */

export type Sacola = Readonly<Record<string, number>>

/** O que a sacola precisa saber de cada produto para se desenhar. */
export type ItemDaLoja = {
  slug: string
  nome: string
  /** "Bolo no pote" */
  tipo: string
  /** em centavos */
  preco: number
  imagem: ImagemProduto
}

export type LinhaDaSacola = ItemDaLoja & { quantos: number; total: number }

export const CHAVE_SACOLA = 'amo:sacola'
/** o aviso que a sacola mudou, nesta aba */
export const EVENTO_SACOLA = 'amo:sacola'
/** o pedido para a nav abrir a gaveta da sacola */
export const EVENTO_ABRIR_SACOLA = 'amo:abrir-sacola'
/** por sabor */
export const MAXIMO_POR_SABOR = 20

export const CAMINHO_SACOLA = '/sacola'

/** So os produtos com preco: sem preco nao ha o que vender. */
export function montarLoja(c: Catalogo): ItemDaLoja[] {
  return [...c.produtos]
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap((p) => {
      const detalhes = DETALHES_DE_EXEMPLO[p.slug]
      const linha = c.linhas.find((l) => l.slug === p.linha)
      if (!detalhes || !linha) return []
      return [{ slug: p.slug, nome: p.nome, tipo: linha.tipo, preco: detalhes.preco, imagem: p.imagem }]
    })
}

/** Aceita so inteiros de 1 ao maximo; o resto (lixo, zero, negativo) sai. */
export function limparSacola(bruta: unknown): Sacola {
  if (!bruta || typeof bruta !== 'object' || Array.isArray(bruta)) return {}
  const limpa: Record<string, number> = {}
  for (const [slug, n] of Object.entries(bruta)) {
    if (typeof n === 'number' && Number.isFinite(n) && n >= 1) limpa[slug] = Math.min(MAXIMO_POR_SABOR, Math.floor(n))
  }
  return limpa
}

export function lerSacola(): Sacola {
  try {
    return limparSacola(JSON.parse(localStorage.getItem(CHAVE_SACOLA) ?? '{}'))
  } catch {
    return {}
  }
}

function gravar(s: Sacola): Sacola {
  try {
    if (Object.keys(s).length) localStorage.setItem(CHAVE_SACOLA, JSON.stringify(s))
    else localStorage.removeItem(CHAVE_SACOLA)
  } catch {}
  window.dispatchEvent(new Event(EVENTO_SACOLA))
  return s
}

/** Troca a quantidade de um sabor; 0 tira. */
export function definirQuantidade(slug: string, quantos: number): Sacola {
  const s = { ...lerSacola() }
  if (quantos >= 1) s[slug] = Math.min(MAXIMO_POR_SABOR, Math.floor(quantos))
  else delete s[slug]
  return gravar(s)
}

/** Soma ao que ja esta; devolve quantos potes do sabor ficaram. */
export function somarNaSacola(slug: string, quantos: number): number {
  return definirQuantidade(slug, (lerSacola()[slug] ?? 0) + quantos)[slug] ?? 0
}

export const tirarDaSacola = (slug: string) => definirQuantidade(slug, 0)

export const esvaziarSacola = () => gravar({})

export const abrirGavetaDaSacola = () => window.dispatchEvent(new Event(EVENTO_ABRIR_SACOLA))

/** As linhas na ordem da loja; slug que saiu do cadastro fica de fora. */
export function linhasDaSacola(s: Sacola, loja: readonly ItemDaLoja[]): LinhaDaSacola[] {
  return loja.filter((i) => s[i.slug]).map((i) => ({ ...i, quantos: s[i.slug], total: i.preco * s[i.slug] }))
}

export const contarPotes = (linhas: readonly { quantos: number }[]) => linhas.reduce((n, l) => n + l.quantos, 0)
export const somarLinhas = (linhas: readonly { total: number }[]) => linhas.reduce((n, l) => n + l.total, 0)

export const textoPotes = (n: number) => `${n} ${n === 1 ? 'pote' : 'potes'}`
