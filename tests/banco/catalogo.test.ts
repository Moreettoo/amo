import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import imageSize from 'image-size'
import { expect, it } from 'vitest'
import { validarCatalogo } from '@/lib/catalogo'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { CADASTRO } from '../fixtures/cadastro'

const c = await carregarCatalogo()
const publico = (src: string) => resolve(import.meta.dirname, '../../public', src.slice(1))

it('o cadastro do banco passa na validacao', () => {
  expect(validarCatalogo(c)).toEqual([])
})
it('traz os 7 potes, todos com preco e descricao', () => {
  expect(c.produtos).toHaveLength(7)
  expect(c.produtos.find((p) => p.slug === 'prestigio')).toMatchObject({ preco: 1890, destaque: true })
  for (const p of c.produtos) {
    expect(p.preco, p.slug).toBeGreaterThan(0)
    expect(p.descricao, p.slug).toBeTruthy()
  }
})
it('os selos vem na ordem do cadastro', () => {
  expect(c.selos.map((s) => s.id)).toEqual(['zero-acucar', 'adocante', 'vapor', 'fibras', 'vidro', 'ingredientes', 'artesanal'])
})
it('toda foto do banco existe em public, com as medidas declaradas', () => {
  for (const p of c.produtos) {
    expect(existsSync(publico(p.imagem.src)), p.imagem.src).toBe(true)
    const medida = imageSize(readFileSync(publico(p.imagem.src)))
    expect([medida.width, medida.height], p.slug).toEqual([p.imagem.largura, p.imagem.altura])
  }
})

it('o banco de desenvolvimento traz exatamente o cadastro da fixture', () => {
  expect(c).toEqual(CADASTRO)
})
