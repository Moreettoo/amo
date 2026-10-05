import type { Vontade } from '@/lib/catalogo'

/** A ordem aqui e a ordem do Hoje o dia pede. Vontade sem produto nao aparece. */
export const VONTADES: readonly Vontade[] = [
  { slug: 'chocolate', palavra: 'Chocolate', ordem: 1 },
  { slug: 'fruta', palavra: 'Fruta', ordem: 2 },
  { slug: 'coco', palavra: 'Coco', ordem: 3 },
  { slug: 'classico', palavra: 'Um clássico', ordem: 4 },
  { slug: 'salgado', palavra: 'Algo salgado', ordem: 5 },
]
