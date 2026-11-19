import type { Produto } from '@/lib/catalogo'
import type { Capitulo } from '@/lib/visao'

/**
 * As contas do sumario do catalogo, puras: o que ele lista e qual secao e a
 * atual. O componente so mede a pagina e desenha.
 */

export type LinhaDoSumario = { id: string; nome: string; contagem: number }
export type ItemDoSumario = { id: string; nome: string; contagem: number; linhas: LinhaDoSumario[] }

/**
 * Um item por capitulo, com as linhas dele dentro. A contagem e a do que o
 * filtro deixa na tela; o item zerado continua na lista. A linha que repete
 * o nome da categoria nao entra: seria o mesmo item duas vezes.
 */
export function montarSumario(capitulos: readonly Capitulo[], visivel: (p: Produto) => boolean): ItemDoSumario[] {
  return capitulos.map((c) => {
    const linhas = c.linhas.map((l) => ({ ...l, contagem: l.produtos.filter(visivel).length }))
    return {
      id: c.slug,
      nome: c.nome,
      contagem: linhas.reduce((n, l) => n + l.contagem, 0),
      linhas: linhas.filter((l) => l.mostraNome).map((l) => ({ id: l.id, nome: l.nome, contagem: l.contagem })),
    }
  })
}

/** A linha de leitura: a secao e a atual depois que o comeco dela passa
 *  desta fracao da altura da janela. */
export const FRACAO_DA_LINHA = 0.35

/**
 * A secao em que a pessoa esta: a ultima cujo comeco ja passou da linha de
 * leitura. `topos` vem na ordem da pagina, medidos a partir do topo da
 * janela. No topo da pagina, antes de qualquer uma passar, vale a primeira;
 * sem secao na tela, nenhuma.
 */
export function secaoAtual(topos: readonly { id: string; topo: number }[], linha: number): string | null {
  if (topos.length === 0) return null
  let atual = topos[0].id
  for (const t of topos) if (t.topo <= linha) atual = t.id
  return atual
}

/** Onde a pessoa esta: a categoria e, quando ela tem linhas no sumario, a
 *  linha. */
export type ParAtual = { categoria: string | null; linha: string | null }

export const SEM_PAR: ParAtual = { categoria: null, linha: null }

/**
 * O par atual. `topoDe` mede o comeco de uma secao a partir do topo da
 * janela e devolve null para a que o filtro tirou da pagina: essa nao
 * conta. A linha e sempre uma da categoria atual (a ultima dela que passou
 * da linha de leitura; antes disso, a primeira).
 */
export function parAtual(
  itens: readonly ItemDoSumario[],
  topoDe: (id: string) => number | null,
  linha: number,
): ParAtual {
  const medidos = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const topo = topoDe(id)
      return topo === null ? [] : [{ id, topo }]
    })
  const categoria = secaoAtual(medidos(itens.map((i) => i.id)), linha)
  const dona = itens.find((i) => i.id === categoria)
  return { categoria, linha: dona ? secaoAtual(medidos(dona.linhas.map((l) => l.id)), linha) : null }
}
