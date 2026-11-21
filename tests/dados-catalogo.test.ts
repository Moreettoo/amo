// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Tables } from '@/lib/dados/banco'
import type { TabelasDoCatalogo } from '@/lib/dados/catalogo'

type Resposta = { data: unknown; error: { code: string; message?: string } | null; status?: number }
const respostas: Record<string, Resposta> = {}
const ordens: Record<string, string[]> = {}
vi.mock('@/lib/dados/publico', () => ({
  criarClienteDoCatalogo: () => ({
    from: (tabela: string) => {
      ordens[tabela] = []
      const busca = {
        order: (coluna: string) => {
          ordens[tabela].push(coluna)
          return busca
        },
        then: (ok: (r: Resposta) => unknown, falha?: (e: unknown) => unknown) =>
          Promise.resolve(respostas[tabela]).then(ok, falha),
      }
      return { select: () => busca }
    },
  }),
}))
const { carregarCatalogo, montarCatalogoDoBanco } =
  await vi.importActual<typeof import('@/lib/dados/catalogo')>('@/lib/dados/catalogo')

const produto = (extra: Partial<Tables<'produtos'>> = {}): Tables<'produtos'> => ({
  slug: 'prestigio', nome: 'Prestígio', linha: 'bolos-no-pote', formato: 'pote', frase: null, descricao: null,
  imagem_src: '/produtos/prestigio.webp', imagem_alt: 'Pote', imagem_largura: 666, imagem_altura: 1000,
  selos: ['zero-acucar'], vontades: ['coco'], destaque: false, ordem: 1, preco_centavos: null, a_venda: false,
  ...extra,
})
const linha = (extra: Partial<Tables<'linhas'>> = {}): Tables<'linhas'> => ({
  slug: 'bolos-no-pote', categoria: 'doces', nome: 'Bolos no pote', tipo: 'Bolo no pote', regra: 'Zero açúcar',
  selos: ['zero-acucar'], frase: null, modo_de_aproveitar: null, cor_do_rotulo: 'papel', ordem: 1,
  ...extra,
})
const tabelas = (extra: Partial<TabelasDoCatalogo> = {}): TabelasDoCatalogo => ({
  categorias: [{ slug: 'doces', nome: 'Doces', ordem: 1 }],
  linhas: [linha()],
  produtos: [produto()],
  selos: [{ id: 'zero-acucar', nome: 'Zero açúcar', ordem: 1 }],
  vontades: [{ slug: 'coco', palavra: 'Coco', ordem: 1 }],
  ...extra,
})
const servir = (t: TabelasDoCatalogo) => {
  for (const [nome, linhas] of Object.entries(t)) respostas[nome] = { data: linhas, error: null }
}

describe('montarCatalogoDoBanco', () => {
  it('o que e nulo ou falso no banco fica de fora do produto', () => {
    expect(montarCatalogoDoBanco(tabelas()).produtos[0]).toEqual({
      slug: 'prestigio', nome: 'Prestígio', linha: 'bolos-no-pote', formato: 'pote',
      imagem: { src: '/produtos/prestigio.webp', alt: 'Pote', largura: 666, altura: 1000 },
      selos: ['zero-acucar'], vontades: ['coco'], ordem: 1,
    })
  })
  it('a venda e com preco: o preco entra', () => {
    const c = montarCatalogoDoBanco(tabelas({ produtos: [produto({ preco_centavos: 1890, a_venda: true })] }))
    expect(c.produtos[0].preco).toBe(1890)
  })
  it('com preco mas fora de venda: sem preco', () => {
    const c = montarCatalogoDoBanco(tabelas({ produtos: [produto({ preco_centavos: 1890, a_venda: false })] }))
    expect(c.produtos[0].preco).toBeUndefined()
  })
  it('frase, descricao e destaque entram quando existem', () => {
    const c = montarCatalogoDoBanco(tabelas({ produtos: [produto({ frase: 'Um abraço', descricao: 'Massa úmida.', destaque: true })] }))
    expect(c.produtos[0]).toMatchObject({ frase: 'Um abraço', descricao: 'Massa úmida.', destaque: true })
  })
  it('a linha traz a cor do rotulo e o modo de aproveitar', () => {
    const modo = { titulo: 'Como aproveitar', passos: ['Abra', 'Coma'] }
    const c = montarCatalogoDoBanco(tabelas({ linhas: [linha({ modo_de_aproveitar: modo, frase: 'Um abraço' })] }))
    expect(c.linhas[0]).toMatchObject({ corDoRotulo: 'papel', modoDeAproveitar: modo, frase: 'Um abraço' })
  })
  it.each([[{ titulo: 'x' }], [{ titulo: 1, passos: [] }], [{ titulo: 'x', passos: ['a', 2] }], [{ titulo: 'x', passos: [] }], [[]]])(
    'modo de aproveitar fora do formato (%j) e recusado, dizendo a linha',
    (modo) => {
      expect(() => montarCatalogoDoBanco(tabelas({ linhas: [linha({ modo_de_aproveitar: modo as never })] }))).toThrow(
        'linha bolos-no-pote: modo de aproveitar fora do formato',
      )
    },
  )
  it('passo do modo de aproveitar so com espaco e recusado', () => {
    const modo = { titulo: 'Como aproveitar', passos: ['Abra o pote.', '  '] }
    expect(() => montarCatalogoDoBanco(tabelas({ linhas: [linha({ modo_de_aproveitar: modo })] }))).toThrow(
      'linha bolos-no-pote: modo de aproveitar fora do formato',
    )
  })
  it('cor de rotulo desconhecida e recusada, dizendo a linha', () => {
    expect(() => montarCatalogoDoBanco(tabelas({ linhas: [linha({ cor_do_rotulo: 'roxo' })] }))).toThrow(
      'linha bolos-no-pote: cor do rótulo desconhecida',
    )
  })
})

describe('carregarCatalogo', () => {
  it('le as cinco tabelas e entrega o cadastro validado', async () => {
    servir(tabelas())
    expect((await carregarCatalogo()).produtos.map((p) => p.slug)).toEqual(['prestigio'])
  })
  it('falha do banco: diz a tabela e o codigo, e nada mais', async () => {
    servir(tabelas())
    respostas.produtos = { data: null, error: { code: 'AMO401', message: 'texto cru com segredo' } }
    await expect(carregarCatalogo()).rejects.toThrow('Falha no banco (produtos): AMO401')
    await expect(carregarCatalogo()).rejects.not.toThrow(/segredo/)
  })
  it('banco fora do ar, sem corpo de erro: a mensagem traz o status HTTP', async () => {
    servir(tabelas())
    respostas.produtos = { data: null, error: { code: '' }, status: 503 }
    await expect(carregarCatalogo()).rejects.toThrow('Falha no banco (produtos): HTTP 503')
  })
  it('a ordem e por ordem e, no empate, por slug (selos: por id)', async () => {
    servir(tabelas())
    await carregarCatalogo()
    for (const t of ['produtos', 'linhas', 'categorias', 'vontades']) expect(ordens[t]).toEqual(['ordem', 'slug'])
    expect(ordens.selos).toEqual(['ordem', 'id'])
  })
  it('cadastro torto no banco e recusado pela validacao', async () => {
    servir(tabelas({ produtos: [produto({ selos: ['nao-existe'] })] }))
    await expect(carregarCatalogo()).rejects.toThrow(/Cadastro inválido[\s\S]*selo inexistente nao-existe/)
  })
})
