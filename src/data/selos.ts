import type { Selo } from '@/lib/catalogo'

/**
 * Os selos do rotulo, mais o "Zero açúcar" dos produtos. O id casa com a
 * chave em components/icons/selos.tsx; selo sem icone desenhado cai no
 * icone generico.
 */
export const SELOS: readonly Selo[] = [
  { id: 'zero-acucar', nome: 'Zero açúcar' },
  { id: 'adocante', nome: 'Adoçado com eritritol e stevia' },
  { id: 'vapor', nome: 'Cozido a vapor' },
  { id: 'fibras', nome: 'Fonte de fibras' },
  { id: 'vidro', nome: 'Pote de vidro reutilizável' },
  { id: 'ingredientes', nome: 'Ingredientes selecionados' },
  { id: 'artesanal', nome: 'Produzido artesanalmente' },
]
