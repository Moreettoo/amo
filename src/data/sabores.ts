export type CorTampa = 'vinho' | 'terracota' | 'amarelo' | 'dourado'

export type Sabor = {
  /** identificador estável; virá de sabores.slug no Supabase */
  slug: string
  /** nome poético da etiqueta */
  nome: string
  /** sabor, em caps no card */
  sabor: string
  /** a frase da etiqueta */
  frase: string
  /** caminho a partir de /public */
  imagem: string
  /** descrição da foto, pt-BR */
  alt: string
  corTampa: CorTampa
  largura: number
  altura: number
}

export const SABORES: readonly Sabor[] = [
  {
    slug: 'aconchego-prestigio',
    nome: 'Aconchego',
    sabor: 'Prestígio',
    frase: 'Um abraço em forma de sobremesa',
    imagem: '/sabores/aconchego-prestigio.webp',
    alt: 'Pote de vidro com bolo Aconchego sabor prestígio, coberto de coco ralado, ao lado de pedaços de chocolate e coco fresco',
    corTampa: 'vinho',
    largura: 666,
    altura: 1000,
  },
  {
    slug: 'raizes-pacoca',
    nome: 'Raízes',
    sabor: 'Paçoca',
    frase: 'O sabor que desperta boas lembranças',
    imagem: '/sabores/raizes-pacoca.webp',
    alt: 'Pote de vidro com bolo Raízes sabor paçoca, com amendoins inteiros por cima, ao lado de cubos de paçoca',
    corTampa: 'terracota',
    largura: 714,
    altura: 1000,
  },
  {
    slug: 'leveza-maracuja',
    nome: 'Leveza',
    sabor: 'Mousse de Maracujá',
    frase: 'Para dias mais leves',
    imagem: '/sabores/leveza-maracuja.webp',
    alt: 'Pote de vidro com mousse de maracujá Leveza, com sementes de maracujá na cobertura, ao lado de maracujás cortados',
    corTampa: 'amarelo',
    largura: 800,
    altura: 951,
  },
  {
    slug: 'encontro-frutas-vermelhas',
    nome: 'Encontro',
    sabor: 'Frutinho com Frutas Vermelhas',
    frase: 'Quando o doce encontra o azedinho perfeito',
    imagem: '/sabores/encontro-frutas-vermelhas.webp',
    alt: 'Pote de vidro com bolo Encontro de frutas vermelhas, com calda vermelha por cima, ao lado de framboesas e amoras',
    corTampa: 'dourado',
    largura: 750,
    altura: 1000,
  },
  {
    slug: 'carinho-beijinho',
    nome: 'Carinho',
    sabor: 'Beijinho',
    frase: 'Para adoçar o coração',
    imagem: '/sabores/carinho-beijinho.webp',
    alt: 'Pote de vidro com bolo Carinho sabor beijinho, com coco ralado na cobertura, ao lado de doces de beijinho em prato branco',
    corTampa: 'vinho',
    largura: 666,
    altura: 1000,
  },
  {
    slug: 'intensamente-chocolate',
    nome: 'Intensamente',
    sabor: 'Chocolate',
    frase: 'Para os apaixonados por chocolate',
    imagem: '/sabores/intensamente-chocolate.webp',
    alt: 'Pote de vidro com bolo Intensamente de chocolate, com raspas de chocolate por cima, ao lado de barras de chocolate meio amargo',
    corTampa: 'vinho',
    largura: 750,
    altura: 1000,
  },
  {
    slug: 'energia-frutas-amarelas',
    nome: 'Energia',
    sabor: 'Frutas Amarelas',
    frase: 'Manga, pêssego e maracujá',
    imagem: '/sabores/energia-frutas-amarelas.webp',
    alt: 'Pote de vidro com bolo Energia de frutas amarelas, com calda de maracujá na cobertura, ao lado de manga cortada em cubos',
    corTampa: 'dourado',
    largura: 750,
    altura: 1000,
  },
] as const
