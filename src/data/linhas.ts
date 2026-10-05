import type { Linha } from '@/lib/catalogo'

/**
 * As linhas de produto. Hoje so a do pote; o ritual que era secao na v1
 * mora aqui, no modo de aproveitar do rotulo.
 */
export const LINHAS: readonly Linha[] = [
  {
    slug: 'pote',
    nome: 'Bolos no pote',
    tipo: 'Bolo no pote',
    regra: 'Zero açúcar',
    selos: ['adocante', 'vapor', 'fibras', 'vidro', 'ingredientes', 'artesanal'],
    frase: 'Um abraço em forma de sobremesa',
    modoDeAproveitar: {
      titulo: 'Como aproveitar seu AMO',
      passos: ['Abra com amor', 'Pegue sua colher', 'A saboreie sem culpa', 'Cuide do pote de vidro'],
    },
    corDoRotulo: 'papel',
    ordem: 1,
  },
]
