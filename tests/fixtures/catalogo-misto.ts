import type { Catalogo, Produto } from '@/lib/catalogo'
import { CATEGORIAS } from '@/data/categorias'
import { LINHAS } from '@/data/linhas'
import { PRODUTOS } from '@/data/produtos'
import { SELOS } from '@/data/selos'
import { VONTADES } from '@/data/vontades'

/**
 * O cadastro de hoje mais os exemplos do prototipo (bolos inteiros e
 * salgados), em duas categorias: doces e salgados. Serve para provar que a pagina se adapta sem mudar componente.
 * A foto e emprestada: o que importa aqui e a forma dos dados.
 */
const FOTO = { src: '/produtos/prestigio.webp', alt: 'Foto de teste', largura: 666, altura: 1000 }

const exemplo = (p: Omit<Produto, 'imagem'>): Produto => ({ ...p, imagem: FOTO })

export const CATALOGO_MISTO: Catalogo = {
  categorias: [...CATEGORIAS, { slug: 'salgados', nome: 'Salgados', ordem: 2 }],
  linhas: [
    ...LINHAS,
    {
      slug: 'bolos-inteiros',
      categoria: 'doces',
      nome: 'Bolos inteiros',
      tipo: 'Bolo inteiro',
      regra: 'Zero açúcar',
      selos: ['adocante'],
      frase: 'Frase da linha',
      corDoRotulo: 'linho',
      ordem: 2,
    },
    {
      slug: 'salgados',
      categoria: 'salgados',
      nome: 'Salgados',
      tipo: 'Salgado',
      regra: 'Massa integral',
      selos: ['integral', 'sem-conservante'],
      frase: 'Frase da linha',
      corDoRotulo: 'kraft',
      ordem: 3,
    },
  ],
  selos: [
    ...SELOS,
    { id: 'integral', nome: 'Integral', ordem: 8 },
    { id: 'sem-conservante', nome: 'Sem conservante', ordem: 9 },
  ],
  vontades: [...VONTADES],
  produtos: [
    ...PRODUTOS,
    exemplo({
      slug: 'torta-de-frango',
      nome: 'Torta de frango',
      linha: 'salgados',
      formato: 'unidade',
      selos: ['integral', 'sem-conservante'],
      vontades: ['salgado'],
      ordem: 8,
    }),
    exemplo({
      slug: 'cenoura-com-cacau',
      nome: 'Cenoura com cacau',
      linha: 'bolos-inteiros',
      formato: 'inteiro',
      selos: ['zero-acucar'],
      vontades: ['chocolate', 'classico'],
      ordem: 9,
    }),
    exemplo({
      slug: 'quiche-de-alho-poro',
      nome: 'Quiche de alho-poró',
      linha: 'salgados',
      formato: 'unidade',
      selos: ['integral'],
      vontades: ['salgado'],
      ordem: 10,
    }),
    exemplo({
      slug: 'chocolate-com-morango',
      nome: 'Chocolate com morango',
      linha: 'bolos-inteiros',
      formato: 'inteiro',
      selos: ['zero-acucar'],
      vontades: ['chocolate', 'fruta'],
      ordem: 11,
    }),
  ],
}
