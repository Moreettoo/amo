/**
 * A loja aberta ou fechada, pela mesma regra de privado.loja_aberta no banco:
 * aberta se nao esta pausada e ha horario do dia da semana de Sao Paulo com
 * abre <= agora < fecha. Puro: o navegador pode importar.
 */

export type Horario = { dia: number; abre: string; fecha: string }

export type SituacaoDaLoja =
  | { aberta: true; fecha: string }
  | { aberta: false; pausada: true }
  | { aberta: false; pausada: false; abre: { dia: number; hora: string } | null }

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

/** O dia da semana e a hora de Sao Paulo, esta como 'HH:MM:SS' (compara com o time do banco). */
function emSaoPaulo(agora: Date): { dia: number; hora: string } {
  const p = Object.fromEntries(FORMATO.formatToParts(agora).map((x) => [x.type, x.value]))
  return { dia: SEMANA[p.weekday], hora: `${p.hour}:${p.minute}:${p.second}` }
}

export function situacaoDaLoja(horarios: readonly Horario[], pausada: boolean, agora: Date): SituacaoDaLoja {
  if (pausada) return { aberta: false, pausada: true }
  const { dia, hora } = emSaoPaulo(agora)
  const hoje = horarios.find((h) => h.dia === dia)
  if (hoje && hoje.abre <= hora && hora < hoje.fecha) return { aberta: true, fecha: hoje.fecha }
  if (hoje && hora < hoje.abre) return { aberta: false, pausada: false, abre: { dia, hora: hoje.abre } }
  for (let i = 1; i <= 7; i++) {
    const d = (dia + i) % 7
    const h = horarios.find((x) => x.dia === d)
    if (h) return { aberta: false, pausada: false, abre: { dia: d, hora: h.abre } }
  }
  return { aberta: false, pausada: false, abre: null }
}

/** '09:00:00' vira '9h'; '18:30:00' vira '18h30'. */
function horaEscrita(time: string): string {
  const [h, m] = time.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export function textoDaLoja(s: SituacaoDaLoja, agora: Date): string {
  if (s.aberta) return `Pedidos até as ${horaEscrita(s.fecha)}.`
  if (s.pausada) return 'As vendas estão pausadas agora. Volte daqui a pouco.'
  if (!s.abre) return 'A cozinha está fechada por enquanto.'
  const hoje = emSaoPaulo(agora).dia
  const quando = s.abre.dia === hoje ? 'hoje' : s.abre.dia === (hoje + 1) % 7 ? 'amanhã' : DIAS[s.abre.dia]
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
