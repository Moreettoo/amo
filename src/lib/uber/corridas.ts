import 'server-only'
import { after } from 'next/server'
import { ambientesCombinam, cozinha, uberConfigurada, uberEmTeste, type Cozinha } from '@/lib/dados/ambiente'
import {
  marcarCorridaCriada,
  marcarCorridaFalhou,
  remarcarEntrega,
  reservarCorridas,
  type CorridaReservada,
} from '@/lib/dados/entregas'
import { registrarFalha } from '@/lib/dados/erros'
import { lerLoja } from '@/lib/dados/loja'
import { rastreioSeguro } from '@/lib/dados/pedidos'
import { FAIXA, faixasLivres, hojeEmSaoPaulo, janelasDaFaixa, situacaoDaLoja, type Faixa, type Loja } from '@/lib/loja'
import { cancelarCorridaNaUber, cotarNaUber, criarCorridaNaUber } from '@/lib/uber/cliente'
import type { EnderecoUber } from '@/lib/uber/endereco'

/**
 * A corrida sai quando o pagamento e confirmado (spec 8.2). Reserva as
 * corridas a criar, confere o horario (remarca para a primeira faixa livre
 * quando ele nao serve mais), cota de novo quando precisa e cria na Uber. A
 * cliente nunca paga a diferenca: cotacao mais cara cria assim mesmo, e acima
 * de R$ 3,00 vai ao log. Nunca lanca. O log leva so codigos fixos.
 */

/** A retirada da faixa precisa estar ao menos 20 min a frente (a folga que a Uber exige). */
const FOLGA_DA_RETIRADA_MIN = 20
/** A cotacao guardada so serve com mais de 1 min de validade. */
const FOLGA_DA_COTACAO_MS = 60_000
/** Diferenca acima disto (em centavos) vai ao log como aviso. */
const DIFERENCA_DO_AVISO = 300

type Falha = { ok: false; status: number; codigo: string | null }

/** 4xx que nao seja 408 nem 429 nao melhora repetindo. */
const definitiva = (status: number): boolean => status >= 400 && status < 500 && status !== 408 && status !== 429

/** O code da Uber (ja conferido pelo cliente) ou um codigo fixo pelo status. */
const motivoDaUber = (f: Falha): string => f.codigo ?? (f.status === 0 ? 'sem_resposta' : `http_${f.status}`)

/** O horario da corrida ainda serve? Agora: a loja aberta (sem olhar a pausa). Agendado: retirada 20 min a frente, data nao fechada. */
function horarioServe(c: CorridaReservada, loja: Loja, agora: Date): boolean {
  if (c.modo === 'agora') return situacaoDaLoja({ ...loja, pausada: false }, agora).aberta
  if (!c.janelaInicio || !c.janelaFim) return false
  const inicio = new Date(c.janelaInicio)
  const retirada = inicio.getTime() - FAIXA.retiradaAntesMin * 60_000
  if (retirada < agora.getTime() + FOLGA_DA_RETIRADA_MIN * 60_000) return false
  return !loja.diasFechados.includes(hojeEmSaoPaulo(inicio))
}

type Desfecho = 'criada' | 'falhou'

async function falhou(pedido: string, motivo: string, def: boolean): Promise<Desfecho> {
  await marcarCorridaFalhou(pedido, motivo, def)
  return 'falhou'
}

/** Uma corrida reservada, do horario ate a Uber. Lanca so por erro do banco (quem chama trata). */
async function criarUma(c: CorridaReservada, loja: Loja, coz: Cozinha): Promise<Desfecho> {
  if (c.origem !== 'uber') return falhou(c.pedido, 'cotacao_de_exemplo', true)
  if (!ambientesCombinam()) return falhou(c.pedido, 'ambientes_trocados', true)
  if (!c.clienteNome || !c.clienteCelular || !c.logradouro || !c.numeroCasa) {
    return falhou(c.pedido, 'dados_incompletos', true)
  }
  const entrega: EnderecoUber = {
    logradouro: c.logradouro,
    numero: c.numeroCasa,
    complemento: c.complemento ?? '',
    bairro: c.bairro,
    cidade: c.cidade,
    uf: c.uf,
    cep: c.cep,
  }

  const agora = new Date()
  let faixa: Faixa | null = c.modo === 'agendado' && c.janelaInicio && c.janelaFim ? { inicio: c.janelaInicio, fim: c.janelaFim } : null
  let remarcou = false
  if (!horarioServe(c, loja, agora)) {
    const nova = faixasLivres(loja, agora, false)[0]
    if (!nova) return falhou(c.pedido, 'sem_faixa', true)
    await remarcarEntrega(c.pedido, nova)
    faixa = nova
    remarcou = true
  }
  const janelas = faixa ? janelasDaFaixa(faixa) : null

  let cotacaoId = c.uberCotacaoId
  let valorCotado: number | null = null
  const expira = c.cotacaoExpiraEm ? Date.parse(c.cotacaoExpiraEm) : NaN
  if (remarcou || !cotacaoId || !(expira - agora.getTime() > FOLGA_DA_COTACAO_MS)) {
    const cotada = await cotarNaUber({ retirada: coz.endereco, telefoneRetirada: coz.telefone, entrega, janelas })
    if (!cotada.ok) return falhou(c.pedido, motivoDaUber(cotada), definitiva(cotada.status))
    if (cotada.dados.aoVivo !== null && cotada.dados.aoVivo !== !uberEmTeste()) {
      registrarFalha('uber.ao_vivo_trocado', { code: 'ao_vivo_trocado' })
      return falhou(c.pedido, 'ao_vivo_trocado', true)
    }
    cotacaoId = cotada.dados.id
    valorCotado = cotada.dados.valorCentavos
  }

  const criada = await criarCorridaNaUber({
    cotacaoId,
    chave: c.chave,
    numeroDoPedido: c.numero,
    cozinha: coz,
    cliente: { nome: c.clienteNome, celular: c.clienteCelular, endereco: entrega },
    itens: c.itens,
    subtotalCentavos: c.subtotalCentavos,
    janelas,
  })
  if (!criada.ok) return falhou(c.pedido, motivoDaUber(criada), definitiva(criada.status))

  // Um entregador de verdade nunca sai com o site em teste, nem o contrario: cancela antes de tudo.
  if (criada.dados.aoVivo !== !uberEmTeste()) {
    await cancelarCorridaNaUber(criada.dados.id)
    await marcarCorridaFalhou(c.pedido, 'ao_vivo_trocado', true)
    registrarFalha('uber.ao_vivo_trocado', { code: 'ao_vivo_trocado' })
    return 'falhou'
  }

  const valor = criada.dados.valorCentavos ?? valorCotado
  if (valor !== null && valor - c.freteCentavos > DIFERENCA_DO_AVISO) {
    registrarFalha('uber.frete_maior', { code: 'frete_maior' })
  }

  await marcarCorridaCriada({
    pedido: c.pedido,
    uberEntregaId: criada.dados.id,
    valorUberCentavos: criada.dados.valorCentavos,
    rastreioUrl: rastreioSeguro(criada.dados.rastreioUrl),
    statusUber: criada.dados.status,
  })
  return 'criada'
}

/** Cria as corridas a criar, ate maximo. Sem as credenciais da Uber, nem reserva. Nunca lanca. */
export async function criarCorridasPendentes(maximo = 3): Promise<{ criadas: number; falhas: number }> {
  const contas = { criadas: 0, falhas: 0 }
  try {
    if (!uberConfigurada()) return contas
    let coz: Cozinha
    try {
      coz = cozinha()
    } catch {
      registrarFalha('uber.cozinha', { code: 'cozinha_invalida' })
      return contas
    }
    const loja = await lerLoja()
    const reservadas = await reservarCorridas(maximo)
    for (const c of reservadas) {
      try {
        if ((await criarUma(c, loja, coz)) === 'criada') contas.criadas++
        else contas.falhas++
      } catch {
        contas.falhas++
        registrarFalha('uber.corrida', { code: 'excecao' })
        try {
          await marcarCorridaFalhou(c.pedido, 'excecao', false)
        } catch {
          // a reserva parada volta sozinha em 2 minutos (reservar_corridas)
        }
      }
    }
  } catch {
    registrarFalha('uber.corridas', { code: 'excecao' })
  }
  return contas
}

/** Agenda a criacao das corridas para depois da resposta. Fora de uma requisicao, registra e nao faz nada. */
export function pedirCorridas(): void {
  try {
    after(() => criarCorridasPendentes())
  } catch {
    registrarFalha('uber.after', { code: 'fora_da_requisicao' })
  }
}
