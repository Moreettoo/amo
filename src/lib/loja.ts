/**
 * A loja aberta ou fechada, pela mesma regra de privado.loja_aberta no banco:
 * aberta se nao esta pausada, a data de Sao Paulo nao esta fechada e ha horario
 * do dia da semana com abre <= agora < fecha. Tambem as faixas de entrega. Puro: o navegador pode importar.
 */

export type Horario = { dia: number; abre: string; fecha: string }

export type SituacaoDaLoja =
  | { aberta: true; fecha: string }
  | { aberta: false; pausada: true }
  | { aberta: false; pausada: false; abre: { dia: number; hora: string; emDias: number } | null }

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const SEMANA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

const FORMATO = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const PARTES = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** A data (AAAA-MM-DD), o dia da semana e a hora de Sao Paulo, esta como 'HH:MM:SS' (compara com o time do banco). */
function emSaoPaulo(agora: Date): { data: string; dia: number; hora: string } {
  const p = Object.fromEntries(FORMATO.formatToParts(agora).map((x) => [x.type, x.value]))
  const q = Object.fromEntries(PARTES.formatToParts(agora).map((x) => [x.type, x.value]))
  return { data: `${q.year}-${q.month}-${q.day}`, dia: SEMANA[p.weekday], hora: `${p.hour}:${p.minute}:${p.second}` }
}

/** A data de hoje em Sao Paulo, AAAA-MM-DD. */
export function hojeEmSaoPaulo(agora: Date): string {
  return emSaoPaulo(agora).data
}

/** Soma dias a uma data civil AAAA-MM-DD (calendario puro, sem fuso). */
function somaDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** O dia da semana (0 = domingo) de uma data civil AAAA-MM-DD. */
function diaDaSemana(data: string): number {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

/** 'HH:MM:SS' em minutos desde a meia-noite ('24:00:00' vale 1440). */
function minutos(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * O instante de "a data, `min` minutos depois da meia-noite, em Sao Paulo".
 * O deslocamento do fuso naquele dia sai do Intl, nunca de -03:00 fixo.
 */
function instanteEmSaoPaulo(data: string, min: number): Date {
  const [a, m, d] = data.split('-').map(Number)
  const parede = Date.UTC(a, m - 1, d, 0, min)
  let instante = parede
  for (let i = 0; i < 2; i++) {
    const q = Object.fromEntries(PARTES.formatToParts(new Date(instante)).map((x) => [x.type, x.value]))
    const vista = Date.UTC(Number(q.year), Number(q.month) - 1, Number(q.day), Number(q.hour), Number(q.minute), Number(q.second))
    instante += parede - vista
  }
  return new Date(instante)
}

export type Loja = { horarios: Horario[]; pausada: boolean; diasFechados: string[] }
export type Faixa = { inicio: string; fim: string }

/** As medidas da faixa de entrega (decisao 1): uma hora, retirada 30 min antes, 90 min de folga, 7 dias a frente. */
export const FAIXA = { duracaoMin: 60, retiradaAntesMin: 30, antecedenciaMin: 90, diasAFrente: 7 } as const

export function situacaoDaLoja(loja: Loja, agora: Date): SituacaoDaLoja {
  if (loja.pausada) return { aberta: false, pausada: true }
  const { data, dia, hora } = emSaoPaulo(agora)
  const hoje = loja.diasFechados.includes(data) ? undefined : loja.horarios.find((h) => h.dia === dia)
  if (hoje && hoje.abre <= hora && hora < hoje.fecha) return { aberta: true, fecha: hoje.fecha }
  if (hoje && hora < hoje.abre) return { aberta: false, pausada: false, abre: { dia, hora: hoje.abre, emDias: 0 } }
  for (let i = 1; i <= 14; i++) {
    const quando = somaDias(data, i)
    if (loja.diasFechados.includes(quando)) continue
    const d = diaDaSemana(quando)
    const h = loja.horarios.find((x) => x.dia === d)
    if (h) return { aberta: false, pausada: false, abre: { dia: d, hora: h.abre, emDias: i } }
  }
  return { aberta: false, pausada: false, abre: null }
}

/**
 * As faixas que a cliente pode escolher, em ordem. Faixa [s, s+60 min] com
 * retirada [s-30 min, s]: s e hora cheia, s-30 min >= abre, s+60 min <= fecha,
 * s >= agora + 90 min, ate 7 dias depois de hoje, fora das datas fechadas.
 */
export function faixasLivres(loja: Loja, agora: Date, respeitarPausa = true): Faixa[] {
  if (respeitarPausa && loja.pausada) return []
  const hoje = hojeEmSaoPaulo(agora)
  const cedo = agora.getTime() + FAIXA.antecedenciaMin * 60_000
  const faixas: Faixa[] = []
  for (let i = 0; i <= FAIXA.diasAFrente; i++) {
    const data = somaDias(hoje, i)
    if (loja.diasFechados.includes(data)) continue
    const h = loja.horarios.find((x) => x.dia === diaDaSemana(data))
    if (!h) continue
    const primeira = Math.ceil((minutos(h.abre) + FAIXA.retiradaAntesMin) / 60) * 60
    for (let s = primeira; s + FAIXA.duracaoMin <= minutos(h.fecha); s += 60) {
      const inicio = instanteEmSaoPaulo(data, s)
      if (inicio.getTime() < cedo) continue
      faixas.push({ inicio: inicio.toISOString(), fim: new Date(inicio.getTime() + FAIXA.duracaoMin * 60_000).toISOString() })
    }
  }
  return faixas
}

export function faixaValida(loja: Loja, faixa: Faixa, agora: Date, respeitarPausa = true): boolean {
  const inicio = new Date(faixa.inicio).getTime()
  const fim = new Date(faixa.fim).getTime()
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return false
  if (fim - inicio !== FAIXA.duracaoMin * 60_000) return false
  const iso = new Date(inicio).toISOString()
  return faixasLivres(loja, agora, respeitarPausa).some((f) => f.inicio === iso)
}

/** Retirada [inicio - 30 min, inicio]; entrega [inicio, fim]. */
export function janelasDaFaixa(f: Faixa): { retiradaDe: string; retiradaAte: string; entregaDe: string; entregaAte: string } {
  const inicio = new Date(f.inicio)
  return {
    retiradaDe: new Date(inicio.getTime() - FAIXA.retiradaAntesMin * 60_000).toISOString(),
    retiradaAte: inicio.toISOString(),
    entregaDe: inicio.toISOString(),
    entregaAte: new Date(f.fim).toISOString(),
  }
}

/** O instante em que a loja fecha hoje (Sao Paulo), ou null se hoje nao abre. */
export function fechamentoDeHoje(loja: Loja, agora: Date): Date | null {
  const { data, dia } = emSaoPaulo(agora)
  if (loja.diasFechados.includes(data)) return null
  const h = loja.horarios.find((x) => x.dia === dia)
  return h ? instanteEmSaoPaulo(data, minutos(h.fecha)) : null
}

/** '09:00:00' vira '9h'; '18:30:00' vira '18h30'. */
function horaEscrita(time: string): string {
  const [h, m] = time.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export function textoDaLoja(s: SituacaoDaLoja): string {
  if (s.aberta) return `Pedidos até as ${horaEscrita(s.fecha)}.`
  if (s.pausada) return 'As vendas estão pausadas agora. Volte daqui a pouco.'
  if (!s.abre) return 'A cozinha está fechada por enquanto.'
  const { emDias } = s.abre
  const quando = emDias === 0 ? 'hoje' : emDias === 1 ? 'amanhã' : DIAS[s.abre.dia]
  return `A cozinha abre ${quando} às ${horaEscrita(s.abre.hora)}.`
}

/** Os dias de segunda a domingo (a semana da loja comeca na segunda). */
const ORDEM = [1, 2, 3, 4, 5, 6, 0]

export function resumoDosHorarios(horarios: readonly Horario[]): string {
  const dias = ORDEM.map((d) => horarios.find((h) => h.dia === d)).filter((h): h is Horario => !!h)
  if (dias.length === 0) return 'Fechada por enquanto.'
  const chave = (h: Horario) => `${h.abre}|${h.fecha}`
  const faixa = (h: Horario) => `das ${horaEscrita(h.abre)} às ${horaEscrita(h.fecha)}`
  // grupos de dias seguidos (na ordem da semana) com o mesmo horario
  const grupos: Horario[][] = []
  for (const h of dias) {
    const ultimo = grupos[grupos.length - 1]
    const anterior = ultimo?.[ultimo.length - 1]
    const seguido = anterior && ORDEM.indexOf(h.dia) === ORDEM.indexOf(anterior.dia) + 1
    if (ultimo && anterior && seguido && chave(anterior) === chave(h)) ultimo.push(h)
    else grupos.push([h])
  }
  if (grupos.length === 1 && dias.length === 7) return `Todos os dias, ${faixa(dias[0])}.`
  const partes = grupos.map((g, i) => {
    const nome = g.length === 1 ? DIAS[g[0].dia] : `${DIAS[g[0].dia]} a ${DIAS[g[g.length - 1].dia]}`
    const rotulo = i === 0 && g.length > 1 ? `De ${nome}` : nome
    return `${rotulo}, ${faixa(g[0])}`
  })
  return `${partes.join('; ')}.`
}
