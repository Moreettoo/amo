export type PassoRitual = {
  ordem: 1 | 2 | 3 | 4
  titulo: string
}

export const RITUAL: readonly PassoRitual[] = [
  { ordem: 1, titulo: 'Abra com amor' },
  { ordem: 2, titulo: 'Pegue sua colher' },
  { ordem: 3, titulo: 'A saboreie sem culpa' },
  { ordem: 4, titulo: 'Cuide do pote de vidro' },
] as const
