import type { Catalogo, Categoria, Linha, Produto, Selo, Vontade } from '@/lib/catalogo'

/**
 * O cadastro de hoje, igual a carga do banco de desenvolvimento
 * (supabase/migrations/*_carga_catalogo.sql e *_selos_ordem.sql). Os testes de
 * unidade usam este, nunca o banco: tests/setup.ts troca o carregador por ele, e
 * tests/banco/catalogo.test.ts prova que o banco traz exatamente isto.
 */

/**
 * As categorias do catalogo, acima das linhas. Hoje so os doces; salgados e
 * refeicoes entram aqui quando tiverem produto com foto.
 */
export const CATEGORIAS: readonly Categoria[] = [{ slug: 'doces', nome: 'Doces', ordem: 1 }]

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

/** A ordem aqui e a ordem do Hoje o dia pede. Vontade sem produto nao aparece. */
export const VONTADES: readonly Vontade[] = [
  { slug: 'chocolate', palavra: 'Chocolate', ordem: 1 },
  { slug: 'fruta', palavra: 'Fruta', ordem: 2 },
  { slug: 'coco', palavra: 'Coco', ordem: 3 },
  { slug: 'classico', palavra: 'Um clássico', ordem: 4 },
  { slug: 'salgado', palavra: 'Algo salgado', ordem: 5 },
]

/**
 * As linhas de produto. Hoje so a do pote; o ritual que era secao na v1
 * mora aqui, no modo de aproveitar do rotulo.
 */
export const LINHAS: readonly Linha[] = [
  {
    slug: 'bolos-no-pote',
    categoria: 'doces',
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

/**
 * Os 7 potes de hoje. Nome e o nome do produto; as frases sao as das
 * etiquetas. As dimensoes sao as do arquivo (tests/catalogo.test.ts mede).
 */
const PRODUTOS_SEM_DETALHES: readonly Produto[] = [
  {
    slug: 'prestigio',
    nome: 'Prestígio',
    linha: 'bolos-no-pote',
    formato: 'pote',
    frase: 'Um abraço em forma de sobremesa',
    imagem: {
      src: '/produtos/prestigio.webp',
      alt: 'Pote de vidro com bolo de prestígio, coberto de coco ralado, ao lado de pedaços de chocolate e coco fresco',
      largura: 666,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['chocolate', 'coco', 'classico'],
    destaque: true,
    ordem: 1,
  },
  {
    slug: 'pacoca',
    nome: 'Paçoca',
    linha: 'bolos-no-pote',
    formato: 'pote',
    frase: 'O sabor que desperta boas lembranças',
    imagem: {
      src: '/produtos/pacoca.webp',
      alt: 'Pote de vidro com bolo de paçoca, com amendoins inteiros por cima, ao lado de cubos de paçoca',
      largura: 714,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['classico'],
    ordem: 2,
  },
  {
    slug: 'mousse-de-maracuja',
    nome: 'Mousse de maracujá',
    linha: 'bolos-no-pote',
    formato: 'pote',
    frase: 'Para dias mais leves',
    imagem: {
      src: '/produtos/mousse-de-maracuja.webp',
      alt: 'Pote de vidro com mousse de maracujá, com sementes de maracujá na cobertura, ao lado de maracujás cortados',
      largura: 800,
      altura: 951,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['fruta'],
    ordem: 3,
  },
  {
    slug: 'ninho-com-frutas-vermelhas',
    nome: 'Ninho com frutas vermelhas',
    linha: 'bolos-no-pote',
    formato: 'pote',
    frase: 'Quando o doce encontra o azedinho perfeito',
    imagem: {
      src: '/produtos/ninho-com-frutas-vermelhas.webp',
      alt: 'Pote de vidro com bolo de ninho com frutas vermelhas, com calda vermelha por cima, ao lado de framboesas e amoras',
      largura: 750,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['fruta'],
    ordem: 4,
  },
  {
    slug: 'beijinho',
    nome: 'Beijinho',
    linha: 'bolos-no-pote',
    formato: 'pote',
    frase: 'Para adoçar o coração',
    imagem: {
      src: '/produtos/beijinho.webp',
      alt: 'Pote de vidro com bolo de beijinho, com coco ralado na cobertura, ao lado de doces de beijinho em prato branco',
      largura: 666,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['coco', 'classico'],
    ordem: 5,
  },
  {
    slug: 'chocolate',
    nome: 'Chocolate',
    linha: 'bolos-no-pote',
    formato: 'pote',
    frase: 'Para os apaixonados por chocolate',
    imagem: {
      src: '/produtos/chocolate.webp',
      alt: 'Pote de vidro com bolo de chocolate, com raspas de chocolate por cima, ao lado de barras de chocolate meio amargo',
      largura: 750,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['chocolate'],
    ordem: 6,
  },
  {
    slug: 'frutas-amarelas',
    nome: 'Frutas amarelas',
    linha: 'bolos-no-pote',
    formato: 'pote',
    frase: 'Manga, pêssego e maracujá',
    imagem: {
      src: '/produtos/frutas-amarelas.webp',
      alt: 'Pote de vidro com bolo de frutas amarelas, com calda de maracujá na cobertura, ao lado de manga cortada em cubos',
      largura: 750,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['fruta'],
    ordem: 7,
  },
]

/** Preco em centavos e a descricao de cada sabor, como na carga do banco. */
const DETALHES: Readonly<Record<string, { preco: number; descricao: string }>> = {
  prestigio: {
    preco: 1890,
    descricao:
      'Massa de chocolate úmida, cozida a vapor, com creme de coco e coco ralado por cima. Zero açúcar, adoçado com eritritol e stevia.',
  },
  pacoca: {
    preco: 1890,
    descricao:
      'Massa fofinha com creme de paçoca e amendoim inteiro por cima, o gosto de festa junina sem o açúcar.',
  },
  'mousse-de-maracuja': {
    preco: 1890,
    descricao:
      'Massa leve com mousse de maracujá aerado e as sementes da fruta na cobertura. Azedinho na medida.',
  },
  'ninho-com-frutas-vermelhas': {
    preco: 2190,
    descricao:
      'Creme de leite Ninho entre camadas de massa branca, com calda de frutas vermelhas que corta o doce.',
  },
  beijinho: {
    preco: 1890,
    descricao: 'Massa branca com creme de coco cremoso e coco ralado por cima, como o docinho da festa.',
  },
  chocolate: {
    preco: 1890,
    descricao:
      'Massa de cacau com creme de chocolate meio amargo e raspas por cima. Para quem não abre mão do chocolate.',
  },
  'frutas-amarelas': {
    preco: 2090,
    descricao: 'Massa leve com creme de manga, pêssego e calda de maracujá. Fresco, de fruta mesmo.',
  },
}

export const PRODUTOS: readonly Produto[] = PRODUTOS_SEM_DETALHES.map((p) => ({ ...p, ...DETALHES[p.slug] }))

export const CADASTRO: Catalogo = {
  categorias: [...CATEGORIAS],
  linhas: [...LINHAS],
  produtos: [...PRODUTOS],
  selos: [...SELOS],
  vontades: [...VONTADES],
}
