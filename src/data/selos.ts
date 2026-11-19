import type { Selo } from '@/lib/catalogo'

/**
 * Os selos do rotulo, mais o "Zero açúcar" dos produtos. O id casa com a
 * chave em components/icons/selos.tsx; selo sem icone desenhado cai no
 * icone generico.
 */
export const SELOS: readonly Selo[] = [
  { id: 'zero-acucar', nome: 'Zero açúcar', ordem: 1 },
  { id: 'adocante', nome: 'Adoçado com eritritol e stevia', ordem: 2 },
  { id: 'vapor', nome: 'Cozido a vapor', ordem: 3 },
  { id: 'fibras', nome: 'Fonte de fibras', ordem: 4 },
  { id: 'vidro', nome: 'Pote de vidro reutilizável', ordem: 5 },
  { id: 'ingredientes', nome: 'Ingredientes selecionados', ordem: 6 },
  { id: 'artesanal', nome: 'Produzido artesanalmente', ordem: 7 },
]
