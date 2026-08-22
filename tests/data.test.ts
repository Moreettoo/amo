import { describe, it, expect } from 'vitest'
import { existsSync, statSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import imageSize from 'image-size'
import { SABORES } from '@/data/sabores'
import { SELOS } from '@/data/selos'
import { RITUAL } from '@/data/ritual'

const publico = (p: string) => resolve(import.meta.dirname, '../public', p.replace(/^\//, ''))

describe('SABORES', () => {
  it('tem exatamente 7 sabores', () => {
    expect(SABORES).toHaveLength(7)
  })

  it('não repete slug', () => {
    const slugs = SABORES.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(7)
  })

  it('usa slug em kebab-case sem acento', () => {
    for (const s of SABORES) {
      expect(s.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('não deixa campo de texto vazio', () => {
    for (const s of SABORES) {
      expect(s.nome.trim().length).toBeGreaterThan(0)
      expect(s.sabor.trim().length).toBeGreaterThan(0)
      expect(s.frase.trim().length).toBeGreaterThan(0)
      expect(s.alt.trim().length).toBeGreaterThan(0)
    }
  })

  it('tem alt descritivo, não só o nome do produto', () => {
    for (const s of SABORES) {
      expect(s.alt.length).toBeGreaterThan(25)
      expect(s.alt).not.toBe(s.nome)
    }
  })

  it('aponta para arquivo de imagem que existe em public/', () => {
    for (const s of SABORES) {
      const caminho = publico(s.imagem)
      expect(existsSync(caminho), `faltando: ${s.imagem}`).toBe(true)
      expect(statSync(caminho).size).toBeGreaterThan(1000)
    }
  })

  it('declara dimensão positiva e retrato em toda foto', () => {
    for (const s of SABORES) {
      expect(s.largura).toBeGreaterThan(0)
      expect(s.altura).toBeGreaterThan(0)
      expect(s.largura / s.altura).toBeLessThan(1)
    }
  })

  it('não aponta dois sabores para a mesma foto', () => {
    const imagens = SABORES.map((s) => s.imagem)
    expect(new Set(imagens).size).toBe(SABORES.length)
  })

  it('declara a dimensão real de cada foto, não uma aproximação', () => {
    for (const s of SABORES) {
      const dimensions = imageSize(readFileSync(publico(s.imagem)))
      expect({ slug: s.slug, largura: dimensions.width, altura: dimensions.height }).toEqual({
        slug: s.slug,
        largura: s.largura,
        altura: s.altura,
      })
    }
  })
})

describe('SELOS', () => {
  it('tem os 6 selos do rótulo', () => {
    expect(SELOS).toHaveLength(6)
  })

  it('não repete id e não deixa nome vazio', () => {
    expect(new Set(SELOS.map((s) => s.id)).size).toBe(6)
    for (const s of SELOS) expect(s.nome.trim().length).toBeGreaterThan(0)
  })
})

describe('RITUAL', () => {
  it('tem os 4 passos', () => {
    expect(RITUAL).toHaveLength(4)
  })

  it('numera 1,2,3,4 sem furo e em ordem', () => {
    expect(RITUAL.map((p) => p.ordem)).toEqual([1, 2, 3, 4])
  })
})
