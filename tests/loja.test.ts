import { describe, expect, it } from 'vitest'
import {
  FAIXA,
  faixaValida,
  faixasLivres,
  fechamentoDeHoje,
  janelasDaFaixa,
  resumoDosHorarios,
  situacaoDaLoja,
  textoDaLoja,
  type Horario,
  type Loja,
} from '@/lib/loja'

const horario = (dia: number, abre = '09:00:00', fecha = '18:00:00'): Horario => ({ dia, abre, fecha })
const segAoSab = [1, 2, 3, 4, 5, 6].map((d) => horario(d))
const hoje = (agora: string, pausada = false, h: Horario[] = segAoSab) => {
  const data = new Date(agora)
  const s = situacaoDaLoja({ horarios: h, pausada, diasFechados: [] }, data)
  return { s, texto: textoDaLoja(s) }
}

describe('situacaoDaLoja e textoDaLoja', () => {
  it('sabado 14h: aberta', () => {
    expect(hoje('2026-11-21T17:00:00Z')).toEqual({ s: { aberta: true, fecha: '18:00:00' }, texto: 'Pedidos até as 18h.' })
  })
  it('sabado 18h: fechada, abre segunda', () => {
    expect(hoje('2026-11-21T21:00:00Z')).toEqual({
      s: { aberta: false, pausada: false, abre: { dia: 1, hora: '09:00:00', emDias: 2 } },
      texto: 'A cozinha abre segunda às 9h.',
    })
  })
  it('domingo 10h: abre amanha', () => {
    const { s, texto } = hoje('2026-11-22T13:00:00Z')
    expect(s).toEqual({ aberta: false, pausada: false, abre: { dia: 1, hora: '09:00:00', emDias: 1 } })
    expect(texto).toBe('A cozinha abre amanhã às 9h.')
  })
  it('segunda 8h59: abre hoje', () => {
    const { s, texto } = hoje('2026-11-23T11:59:59Z')
    expect(s).toEqual({ aberta: false, pausada: false, abre: { dia: 1, hora: '09:00:00', emDias: 0 } })
    expect(texto).toBe('A cozinha abre hoje às 9h.')
  })
  it('sexta 18h: abre sabado amanha', () => {
    const { s, texto } = hoje('2026-11-20T21:00:00Z')
    expect(s).toEqual({ aberta: false, pausada: false, abre: { dia: 6, hora: '09:00:00', emDias: 1 } })
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
  it('so abre um dia por semana: depois de fechar diz o dia, nao hoje', () => {
    expect(hoje('2026-11-23T22:00:00Z', false, [horario(1)])).toEqual({
      s: { aberta: false, pausada: false, abre: { dia: 1, hora: '09:00:00', emDias: 7 } },
      texto: 'A cozinha abre segunda às 9h.',
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

describe('faixas de entrega', () => {
  const loja: Loja = { horarios: segAoSab, pausada: false, diasFechados: [] }
  const agora = new Date('2026-11-24T12:00:00Z') // terca, 9h de Sao Paulo

  it('as medidas da faixa', () => {
    expect(FAIXA).toEqual({ duracaoMin: 60, retiradaAntesMin: 30, antecedenciaMin: 90, diasAFrente: 7 })
  })
  it('a primeira faixa de hoje respeita os 90 minutos', () => {
    expect(faixasLivres(loja, agora)[0]).toEqual({ inicio: '2026-11-24T14:00:00.000Z', fim: '2026-11-24T15:00:00.000Z' })
  })
  it('um dia inteiro tem 8 faixas, de 10h a 17h', () => {
    const dia = faixasLivres(loja, agora).filter((f) => f.inicio.startsWith('2026-11-25'))
    expect(dia).toHaveLength(8)
    expect(dia[0].inicio).toBe('2026-11-25T13:00:00.000Z')
    expect(dia[7].fim).toBe('2026-11-25T21:00:00.000Z')
  })
  it('domingo nao tem faixa', () => {
    expect(faixasLivres(loja, agora).some((f) => f.inicio.startsWith('2026-11-29'))).toBe(false)
  })
  it('data fechada nao tem faixa', () => {
    expect(faixasLivres({ ...loja, diasFechados: ['2026-11-25'] }, agora).some((f) => f.inicio.startsWith('2026-11-25'))).toBe(false)
  })
  it('o horizonte e de 7 dias', () => {
    const todas = faixasLivres(loja, agora)
    expect(todas.at(-1)!.inicio.startsWith('2026-12-01')).toBe(true)
    expect(todas.some((f) => f.inicio.startsWith('2026-12-02'))).toBe(false)
  })
  it('pausada: sem faixa, a menos que se ignore a pausa', () => {
    expect(faixasLivres({ ...loja, pausada: true }, agora)).toEqual([])
    expect(faixasLivres({ ...loja, pausada: true }, agora, false).length).toBeGreaterThan(0)
  })
  it('faixaValida recusa inicio fora da grade e duracao errada', () => {
    expect(faixaValida(loja, { inicio: '2026-11-25T13:30:00.000Z', fim: '2026-11-25T14:30:00.000Z' }, agora)).toBe(false)
    expect(faixaValida(loja, { inicio: '2026-11-25T13:00:00.000Z', fim: '2026-11-25T13:59:00.000Z' }, agora)).toBe(false)
    expect(faixaValida(loja, { inicio: '2026-11-25T13:00:00.000Z', fim: '2026-11-25T14:00:00.000Z' }, agora)).toBe(true)
    expect(faixaValida(loja, { inicio: '2026-11-24T13:00:00.000Z', fim: '2026-11-24T14:00:00.000Z' }, agora)).toBe(false)
    expect(faixaValida(loja, { inicio: 'lixo', fim: 'lixo' }, agora)).toBe(false)
  })
  it('as janelas: retirada 30 min antes, entrega na faixa', () => {
    expect(janelasDaFaixa({ inicio: '2026-11-25T13:00:00.000Z', fim: '2026-11-25T14:00:00.000Z' })).toEqual({
      retiradaDe: '2026-11-25T12:30:00.000Z',
      retiradaAte: '2026-11-25T13:00:00.000Z',
      entregaDe: '2026-11-25T13:00:00.000Z',
      entregaAte: '2026-11-25T14:00:00.000Z',
    })
  })
  it('horario que abre 9h30 comeca as 10h (ate 12h: 10h e 11h); 10h30 comeca as 11h', () => {
    const l: Loja = { ...loja, horarios: [horario(2, '09:30:00', '12:00:00')] }
    expect(faixasLivres(l, new Date('2026-11-24T03:00:00Z')).map((f) => f.inicio).filter((i) => i.startsWith('2026-11-24'))).toEqual(['2026-11-24T13:00:00.000Z', '2026-11-24T14:00:00.000Z'])
    const m: Loja = { ...loja, horarios: [horario(2, '10:30:00', '13:00:00')] }
    expect(faixasLivres(m, new Date('2026-11-24T03:00:00Z')).map((f) => f.inicio).filter((i) => i.startsWith('2026-11-24'))).toEqual([
      '2026-11-24T14:00:00.000Z',
      '2026-11-24T15:00:00.000Z',
    ])
  })
  it('fechamentoDeHoje', () => {
    expect(fechamentoDeHoje(loja, agora)?.toISOString()).toBe('2026-11-24T21:00:00.000Z')
    expect(fechamentoDeHoje({ ...loja, diasFechados: ['2026-11-24'] }, agora)).toBeNull()
    expect(fechamentoDeHoje(loja, new Date('2026-11-29T15:00:00Z'))).toBeNull()
  })
})

describe('situacaoDaLoja com datas fechadas', () => {
  it('hoje fechado: abre no proximo dia aberto', () => {
    const loja: Loja = { horarios: segAoSab, pausada: false, diasFechados: ['2026-11-24'] }
    const s = situacaoDaLoja(loja, new Date('2026-11-24T12:00:00Z'))
    expect(s).toEqual({ aberta: false, pausada: false, abre: { dia: 3, hora: '09:00:00', emDias: 1 } })
    expect(textoDaLoja(s)).toBe('A cozinha abre amanhã às 9h.')
  })
  it('o proximo dia tambem fechado: pula', () => {
    const loja: Loja = { horarios: segAoSab, pausada: false, diasFechados: ['2026-11-24', '2026-11-25'] }
    expect(situacaoDaLoja(loja, new Date('2026-11-24T12:00:00Z'))).toEqual({
      aberta: false,
      pausada: false,
      abre: { dia: 4, hora: '09:00:00', emDias: 2 },
    })
  })
})
