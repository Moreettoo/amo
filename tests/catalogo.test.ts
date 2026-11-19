import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import imageSize from 'image-size'
import { validarCatalogo, type Catalogo } from '@/lib/catalogo'
import { CADASTRO, LINHAS, PRODUTOS, SELOS } from './fixtures/cadastro'

/** Copia funda do cadastro real, para cada teste estragar a sua. */
const real = (): Catalogo => structuredClone(CADASTRO)

const publico = (src: string) => resolve(import.meta.dirname, '../public', src.slice(1))

describe('validarCatalogo', () => {
  it('aceita o cadastro real', () => {
    expect(validarCatalogo(real())).toEqual([])
  })

  it.each<[string, (c: Catalogo) => void, RegExp]>([
    ['slug de produto repetido', (c) => { c.produtos[1].slug = c.produtos[0].slug }, /slug de produto repetido/],
    ['slug de categoria repetido', (c) => { c.categorias.push({ ...c.categorias[0] }) }, /slug de categoria repetido: doces/],
    ['linha com categoria inexistente', (c) => { c.linhas[0].categoria = 'nao-existe' }, /linha bolos-no-pote: categoria inexistente nao-existe/],
    ['produto com o slug de uma categoria (duas âncoras iguais na página)', (c) => { c.produtos[0].slug = 'doces' }, /id de âncora repetido: doces/],
    ['produto com o id de uma linha (duas âncoras iguais na página)', (c) => { c.produtos[0].slug = 'linha-bolos-no-pote' }, /id de âncora repetido: linha-bolos-no-pote/],
    [
      'linha com o nome da categoria ao lado de outras linhas (o sumário não teria como distinguir)',
      (c) => { c.linhas.push({ ...c.linhas[0], slug: 'doces-da-casa', nome: 'Doces' }) },
      /linha doces-da-casa: mesmo nome da categoria doces, que tem outras linhas/,
    ],
    ['slug de linha repetido', (c) => { c.linhas.push({ ...c.linhas[0] }) }, /slug de linha repetido/],
    ['produto com linha inexistente', (c) => { c.produtos[0].linha = 'torta' }, /linha inexistente torta/],
    ['produto com selo inexistente', (c) => { c.produtos[0].selos.push('vegano') }, /selo inexistente vegano/],
    ['produto com vontade inexistente', (c) => { c.produtos[0].vontades.push('azedo') }, /vontade inexistente azedo/],
    ['linha com selo inexistente', (c) => { c.linhas[0].selos.push('organico') }, /linha bolos-no-pote: selo inexistente organico/],
    ['imagem sem caminho absoluto', (c) => { c.produtos[0].imagem.src = 'produtos/x.webp' }, /caminho absoluto/],
    ['imagem sem alt', (c) => { c.produtos[0].imagem.alt = '  ' }, /sem alt/],
    ['imagem sem dimensões', (c) => { c.produtos[0].imagem.largura = 0 }, /sem dimensões/],
    ['dois destaques', (c) => { c.produtos[1].destaque = true }, /mais de um produto em destaque/],
    ['catálogo vazio', (c) => { c.produtos = [] }, /catálogo sem produto/],
    ['nenhum produto com vontade', (c) => { for (const p of c.produtos) p.vontades = [] }, /nenhum produto com vontade/],
  ])('recusa %s', (_, estragar, problema) => {
    const c = real()
    estragar(c)
    expect(validarCatalogo(c).join('\n')).toMatch(problema)
  })
})

describe('os dados de hoje', () => {
  it('os selos tem ordem, de 1 a 7, sem repetir', () => {
    expect(SELOS.map((s) => s.ordem)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('Encontro é Ninho com frutas vermelhas', () => {
    expect(PRODUTOS.find((p) => p.slug === 'ninho-com-frutas-vermelhas')?.nome).toBe(
      'Ninho com frutas vermelhas',
    )
  })

  it('nenhum nome poético em nome, alt ou caminho de foto', () => {
    const poeticos = /Aconchego|Raízes|Leveza|Encontro|Carinho|Intensamente|Energia|Frutinho/i
    for (const p of PRODUTOS) {
      expect(`${p.nome} ${p.imagem.alt} ${p.imagem.src}`).not.toMatch(poeticos)
    }
  })

  it('só o Prestígio é destaque', () => {
    expect(PRODUTOS.filter((p) => p.destaque).map((p) => p.slug)).toEqual(['prestigio'])
  })

  it('toda foto existe em public e tem as dimensões declaradas', () => {
    for (const p of PRODUTOS) {
      expect(existsSync(publico(p.imagem.src)), p.imagem.src).toBe(true)
      const medida = imageSize(readFileSync(publico(p.imagem.src)))
      expect(medida.width, p.slug).toBe(p.imagem.largura)
      expect(medida.height, p.slug).toBe(p.imagem.altura)
    }
  })

  it('o rótulo do pote traz os 6 selos e o modo de aproveitar', () => {
    const pote = LINHAS[0]
    expect(pote.selos).toEqual(['adocante', 'vapor', 'fibras', 'vidro', 'ingredientes', 'artesanal'])
    expect(pote.modoDeAproveitar?.passos).toEqual([
      'Abra com amor',
      'Pegue sua colher',
      'A saboreie sem culpa',
      'Cuide do pote de vidro',
    ])
  })
})
