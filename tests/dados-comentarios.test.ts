// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { montarComentario } from '@/lib/dados/comentarios'

const linha = { id: 'c1', produto: 'prestigio', nome_exibido: 'Carla M.', nota: 5, texto: 'Molhadinho até o fundo.', criado_em: '2026-11-15T15:00:00+00:00' }

describe('montarComentario', () => {
  it('troca os nomes das colunas e deixa a data no formato da pagina', () => {
    expect(montarComentario(linha)).toEqual({ id: 'c1', produto: 'prestigio', nome: 'Carla M.', nota: 5, data: '2026-11-15', texto: 'Molhadinho até o fundo.' })
  })
  it('a data e o dia em Sao Paulo, nao em UTC', () => {
    expect(montarComentario({ ...linha, criado_em: '2026-11-16T01:30:00+00:00' })?.data).toBe('2026-11-15')
  })
  it.each([0, 6, 4.5])('nota fora de 1 a 5 (%s) descarta o comentario', (nota) => {
    expect(montarComentario({ ...linha, nota })).toBeNull()
  })
})
