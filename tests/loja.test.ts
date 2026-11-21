import { describe, expect, it } from 'vitest'
import { resumoDosHorarios, situacaoDaLoja, textoDaLoja, type Horario } from '@/lib/loja'

const horario = (dia: number, abre = '09:00:00', fecha = '18:00:00'): Horario => ({ dia, abre, fecha })
const segAoSab = [1, 2, 3, 4, 5, 6].map((d) => horario(d))
const hoje = (agora: string, pausada = false, h: Horario[] = segAoSab) => {
  const data = new Date(agora)
  const s = situacaoDaLoja(h, pausada, data)
  return { s, texto: textoDaLoja(s, data) }
}

describe('situacaoDaLoja e textoDaLoja', () => {
  it('sabado 14h: aberta', () => {
    expect(hoje('2026-11-21T17:00:00Z')).toEqual({ s: { aberta: true, fecha: '18:00:00' }, texto: 'Pedidos até as 18h.' })
  })
  it('sabado 18h: fechada, abre segunda', () => {
    expect(hoje('2026-11-21T21:00:00Z')).toEqual({
      s: { aberta: false, pausada: false, abre: { dia: 1, hora: '09:00:00' } },
      texto: 'A cozinha abre segunda às 9h.',
    })
  })
  it('domingo 10h: abre amanha', () => {
    const { s, texto } = hoje('2026-11-22T13:00:00Z')
    expect(s).toEqual({ aberta: false, pausada: false, abre: { dia: 1, hora: '09:00:00' } })
    expect(texto).toBe('A cozinha abre amanhã às 9h.')
  })
  it('segunda 8h59: abre hoje', () => {
    const { s, texto } = hoje('2026-11-23T11:59:59Z')
    expect(s).toEqual({ aberta: false, pausada: false, abre: { dia: 1, hora: '09:00:00' } })
    expect(texto).toBe('A cozinha abre hoje às 9h.')
  })
  it('sexta 18h: abre sabado amanha', () => {
    const { s, texto } = hoje('2026-11-20T21:00:00Z')
    expect(s).toEqual({ aberta: false, pausada: false, abre: { dia: 6, hora: '09:00:00' } })
    expect(texto).toBe('A cozinha abre amanhã às 9h.')
  })
  it('quarta 9h: aberta', () => {
    expect(hoje('2026-11-18T12:00:00Z')).toEqual({ s: { aberta: true, fecha: '18:00:00' }, texto: 'Pedidos até as 18h.' })
  })
  it('pausada: pausada a qualquer hora', () => {
    expect(hoje('2026-11-18T12:00:00Z', true)).toEqual({
      s: { aberta: false, pausada: true },
      texto: 'As vendas estão pausadas agora. Volte daqui a pouco.',
    })
  })
  it('sem horario nenhum', () => {
    expect(hoje('2026-11-18T12:00:00Z', false, [])).toEqual({
      s: { aberta: false, pausada: false, abre: null },
      texto: 'A cozinha está fechada por enquanto.',
    })
  })
  it('fecha as 18h30', () => {
    expect(hoje('2026-11-18T12:00:00Z', false, [horario(3, '09:00:00', '18:30:00')]).texto).toBe('Pedidos até as 18h30.')
  })
})

describe('resumoDosHorarios', () => {
  it('segunda a sabado', () => {
    expect(resumoDosHorarios(segAoSab)).toBe('De segunda a sábado, das 9h às 18h.')
  })
  it('todos os dias', () => {
    expect(resumoDosHorarios([0, 1, 2, 3, 4, 5, 6].map((d) => horario(d)))).toBe('Todos os dias, das 9h às 18h.')
  })
  it('sabado diferente', () => {
    const h = [...[1, 2, 3, 4, 5].map((d) => horario(d)), horario(6, '09:00:00', '13:00:00')]
    expect(resumoDosHorarios(h)).toBe('De segunda a sexta, das 9h às 18h; sábado, das 9h às 13h.')
  })
})
