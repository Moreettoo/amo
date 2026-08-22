export type Selo = {
  /** casa com a chave em components/icons/selos.tsx */
  id: 'ingredientes' | 'vapor' | 'vidro' | 'fibras' | 'adocante' | 'artesanal'
  nome: string
}

export const SELOS: readonly Selo[] = [
  { id: 'ingredientes', nome: 'Ingredientes selecionados' },
  { id: 'vapor', nome: 'Cozido a vapor' },
  { id: 'vidro', nome: 'Pote de vidro reutilizável' },
  { id: 'fibras', nome: 'Fonte de fibras' },
  { id: 'adocante', nome: 'Adoçado com eritritol e stevia' },
  { id: 'artesanal', nome: 'Produzido artesanalmente' },
] as const
