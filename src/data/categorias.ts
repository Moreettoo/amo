import type { Categoria } from '@/lib/catalogo'

/**
 * As categorias do catalogo, acima das linhas. Hoje so os doces; salgados e
 * refeicoes entram aqui quando tiverem produto com foto.
 */
export const CATEGORIAS: readonly Categoria[] = [{ slug: 'doces', nome: 'Doces', ordem: 1 }]
