import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

/**
 * Regra do cliente: a app nao pode ter travessao, em nenhum lugar, nunca.
 * Nem em texto visivel, nem em comentario, nem em alt, nem em title.
 *
 * O caractere e montado por codepoint de proposito: escrito literal aqui,
 * este arquivo reprovaria a si mesmo.
 */
const TRAVESSAO = String.fromCharCode(0x2014) // em dash
const MEIA_RISCA = String.fromCharCode(0x2013) // en dash, tambem proibido
const PROIBIDOS = [
  { nome: 'travessao (U+2014)', ch: TRAVESSAO },
  { nome: 'meia-risca (U+2013)', ch: MEIA_RISCA },
]

const RAIZ = resolve(import.meta.dirname, '..')
const ALVOS = ['src', 'tests', 'scripts']
const ARQUIVOS_SOLTOS = ['README.md']
const EXTENSOES = ['.ts', '.tsx', '.css', '.md', '.mjs', '.json', '.py']

function varrer(dir: string): string[] {
  const achados: string[] = []
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada)
    if (statSync(caminho).isDirectory()) {
      achados.push(...varrer(caminho))
    } else if (EXTENSOES.some((e) => entrada.endsWith(e))) {
      achados.push(caminho)
    }
  }
  return achados
}

const arquivos = [
  ...ALVOS.flatMap((a) => varrer(join(RAIZ, a))),
  ...ARQUIVOS_SOLTOS.map((a) => join(RAIZ, a)),
]

describe('nenhum travessao na app', () => {
  it('varre pelo menos os arquivos de src e tests', () => {
    expect(arquivos.length).toBeGreaterThan(20)
  })

  it.each(PROIBIDOS)('nao existe $nome em nenhum arquivo', ({ ch }) => {
    const ofensores: string[] = []
    for (const arquivo of arquivos) {
      const conteudo = readFileSync(arquivo, 'utf8')
      if (!conteudo.includes(ch)) continue
      conteudo.split('\n').forEach((linha, i) => {
        if (linha.includes(ch)) {
          ofensores.push(`${relative(RAIZ, arquivo)}:${i + 1}: ${linha.trim()}`)
        }
      })
    }
    expect(ofensores, ofensores.join('\n')).toEqual([])
  })
})
