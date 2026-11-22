'use server'

import { updateTag } from 'next/cache'
import { headers } from 'next/headers'
import { obterUsuario } from '@/lib/auth'
import { lerIp } from '@/lib/auth/ip'
import { buscarCep } from '@/lib/dados/cep'
import { cotarDeExemplo, registrarCotacao, VALIDADE_DA_COTACAO_MS } from '@/lib/dados/cotacao'
import { mercadoPagoEmTeste } from '@/lib/dados/ambiente'
import { ErroDeRegra, registrarFalha } from '@/lib/dados/erros'
import { conferirNumeroDoPedido } from '@/lib/conta/regras'
import { criarPedido, iniciarPagamento, lerPedidoParaPagar, lerUltimaTentativa } from '@/lib/dados/fechamento'
import { aplicarPagamento, mpPedidoDaTentativa, tentativasACancelarDaCliente } from '@/lib/dados/pagamentos'
import { criarPedidoCartao, criarPedidoPix, type PedidoMp } from '@/lib/mercadopago/cliente'
import { traduzir } from '@/lib/mercadopago/traducao'
import { aplicarRespostaDoMp, cancelarNoMp, guardarIdsDoMp, sincronizarTentativa } from '@/lib/mercadopago/sincronizar'
import { consumirLimite } from '@/lib/dados/limites'
import { ETIQUETA_DO_CATALOGO } from '@/lib/dados/publico'
import type {
  CodigoDoFechamento,
  EstadoDoPedido,
  ItemDoPedido,
  PagamentoNaTela,
  RespostaDaCotacao,
  RespostaDoPagamento,
  RespostaDoPedido,
  SituacaoDoPedido,
} from '@/lib/fechamento/tipos'

/**
 * A cotacao da entrega no servidor. Ordem (backend 11): cada campo conferido,
 * o limite, o CEP, a conta, o registro. Campo invalido nao gasta limite.
 */

const CEP = /^\d{5}-?\d{3}$/
const NUMERO = /^[0-9A-Za-z][0-9A-Za-z /-]{0,9}$/
const PROIBIDO = /[\u0000-\u001f\u007f-\u009f<>]/

type Campos = Partial<Record<'cep' | 'numero' | 'complemento', string>>

const falha = (erro: CodigoDoFechamento, campos?: Campos): RespostaDaCotacao =>
  campos ? { ok: false, erro, campos } : { ok: false, erro }

export async function cotarEntrega(entrada: unknown): Promise<RespostaDaCotacao> {
  if (typeof entrada !== 'object' || entrada === null) return falha('campos_invalidos')
  const { cep: c, numero: n, complemento: o } = entrada as Record<string, unknown>
  if (typeof c !== 'string' || typeof n !== 'string' || (o !== undefined && typeof o !== 'string')) {
    return falha('campos_invalidos')
  }

  const cepTexto = c.trim()
  const numero = n.trim()
  const complemento = (o ?? '').trim()
  const campos: Campos = {}
  if (!CEP.test(cepTexto)) campos.cep = 'Confira o CEP: ele tem 8 números.'
  if (numero === '') campos.numero = 'Falta o número da casa ou do prédio.'
  else if (!NUMERO.test(numero)) campos.numero = 'Use só letras e números no número, até 10.'
  if (complemento.length > 60 || PROIBIDO.test(complemento)) campos.complemento = 'Use até 60 letras, sem < nem >.'
  if (Object.keys(campos).length > 0) return falha('campos_invalidos', campos)

  const cep = cepTexto.replace('-', '')

  try {
    if (!(await consumirLimite(`cotar:ip:${lerIp(await headers())}`, 10, 3600))) return falha('muitas_tentativas')

    const achado = await buscarCep(cep)
    if (!achado || achado.logradouro.length < 2 || !achado.bairro || !achado.cidade || !achado.uf) {
      return falha('cep_nao_encontrado')
    }

    const cotado = cotarDeExemplo(cep)
    if (!cotado) return falha('fora_da_area')
    if (!mercadoPagoEmTeste()) return falha('entrega_indisponivel')

    const usuario = await obterUsuario()
    const endereco = {
      cep,
      numero,
      complemento,
      logradouro: achado.logradouro,
      bairro: achado.bairro,
      cidade: achado.cidade,
      uf: achado.uf,
    }
    const id = await registrarCotacao({ usuarioId: usuario?.id ?? null, ...cotado, ...endereco })
    return {
      ok: true,
      cotacao: {
        id,
        valorCentavos: cotado.valorCentavos,
        minutos: cotado.minutos,
        expiraEm: new Date(Date.now() + VALIDADE_DA_COTACAO_MS).toISOString(),
        exemplo: true,
        endereco,
      },
    }
  } catch (erro) {
    registrarFalha('cotar_entrega', erro)
    return falha('tente_de_novo')
  }
}

const PRODUTO = /^[a-z0-9]+(-[a-z0-9]+)*$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CODIGOS_DO_BANCO: Record<string, CodigoDoFechamento> = {
  sem_sessao: 'sem_sessao',
  email_nao_confirmado: 'email_nao_confirmado',
  loja_fechada: 'loja_fechada',
  produto_indisponivel: 'produto_indisponivel',
  muitos_pedidos: 'muitos_pedidos',
  total_mudou: 'total_mudou',
  cotacao_invalida: 'cotacao_vencida',
  cotacao_vencida: 'cotacao_vencida',
  itens_invalidos: 'campos_invalidos',
}

/** O banco viu outro preco ou outro cardapio: o catalogo guardado no cache (5 min) ja nao vale. */
const MUDOU_O_CATALOGO = new Set<CodigoDoFechamento>(['total_mudou', 'produto_indisponivel'])

/**
 * Derruba o cache do catalogo (updateTag: a proxima leitura espera o banco,
 * em vez de servir o velho), para a pagina que a tela pede de novo ja vir com
 * os precos e o cardapio novos. Nunca lanca: falha so vai ao log.
 */
function invalidarCatalogo(): void {
  try {
    updateTag(ETIQUETA_DO_CATALOGO)
  } catch (erro) {
    registrarFalha('invalidar_catalogo', erro)
  }
}

const semOMais = (o: object, chaves: string[]) => {
  const tem = Object.keys(o)
  return tem.length === chaves.length && chaves.every((k) => tem.includes(k))
}

function conferirItens(valor: unknown): ItemDoPedido[] | null {
  if (!Array.isArray(valor) || valor.length < 1 || valor.length > 30) return null
  const vistos = new Set<string>()
  const itens: ItemDoPedido[] = []
  for (const bruto of valor) {
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return null
    if (!semOMais(bruto, ['produto', 'quantos'])) return null
    const { produto, quantos } = bruto as Record<string, unknown>
    if (typeof produto !== 'string' || produto.length > 80 || !PRODUTO.test(produto)) return null
    if (typeof quantos !== 'number' || !Number.isInteger(quantos) || quantos < 1 || quantos > 20) return null
    if (vistos.has(produto)) return null
    vistos.add(produto)
    itens.push({ produto, quantos })
  }
  return itens
}

/**
 * Cancela no Mercado Pago as tentativas da cliente (de qualquer pedido dela)
 * que terminaram aqui e la seguem abertas, e espera. Nunca lanca: falha so
 * vai ao log e nunca barra quem chamou.
 */
async function cancelarAsDaClienteNoMp(usuarioId: string): Promise<void> {
  try {
    const velhas = await tentativasACancelarDaCliente(usuarioId)
    await Promise.allSettled(
      velhas.map(async (velha) => {
        try {
          await cancelarNoMp(velha.tentativa, velha.mpPedidoId)
        } catch (erro) {
          registrarFalha('cancelar_tentativa_anterior', erro)
        }
      }),
    )
  } catch (erro) {
    registrarFalha('tentativas_a_cancelar', erro)
  }
}

/**
 * Fecha o pedido. Ordem (backend 11): a sessao, cada campo conferido, o banco,
 * a traducao do codigo. Sem limite aqui: o banco limita a 10 pedidos por hora.
 * Criado o pedido, o que aguardava foi cancelado aqui (criar_pedido); as
 * tentativas dele que o Mercado Pago ainda tem abertas sao canceladas la (o
 * QR antigo deixa de valer).
 */
export async function fecharPedido(entrada: unknown): Promise<RespostaDoPedido> {
  try {
    const usuario = await obterUsuario()
    if (!usuario) return { ok: false, erro: 'sem_sessao' }

    if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
      return { ok: false, erro: 'campos_invalidos' }
    }
    const { itens: i, cotacao, totalVisto, guardarEndereco } = entrada as Record<string, unknown>
    const itens = conferirItens(i)
    if (
      !itens ||
      typeof cotacao !== 'string' ||
      !UUID.test(cotacao) ||
      typeof totalVisto !== 'number' ||
      !Number.isInteger(totalVisto) ||
      totalVisto < 1 ||
      totalVisto > 10_000_000 ||
      typeof guardarEndereco !== 'boolean'
    ) {
      return { ok: false, erro: 'campos_invalidos' }
    }

    const pedido = await criarPedido({ itens, cotacao, totalVisto, guardarEndereco })
    await cancelarAsDaClienteNoMp(usuario.id)
    return { ok: true, pedido }
  } catch (erro) {
    if (erro instanceof ErroDeRegra && Object.hasOwn(CODIGOS_DO_BANCO, erro.codigo)) {
      const codigo = CODIGOS_DO_BANCO[erro.codigo]
      if (MUDOU_O_CATALOGO.has(codigo)) invalidarCatalogo()
      return { ok: false, erro: codigo }
    }
    if (!(erro instanceof ErroDeRegra)) registrarFalha('fechar_pedido', erro)
    return { ok: false, erro: 'tente_de_novo' }
  }
}

const TOKEN_DO_CARTAO = /^[A-Za-z0-9-]{20,100}$/
const BANDEIRA = /^[a-z_]{2,20}$/
const FINAL = /^\d{4}$/

type Cartao = { token: string; bandeira: string; tipo: 'credit_card' | 'debit_card'; parcelas: number }
type Documento = { tipo: 'CPF'; numero: string }
type DadosDoCartao = { cartao: Cartao; final: string; documento: Documento | null }

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const soAs = (o: object, obrigatorias: string[], opcionais: string[] = []) =>
  Object.keys(o).every((k) => obrigatorias.includes(k) || opcionais.includes(k)) && obrigatorias.every((k) => k in o)

/** Os campos do cartao (com o numero do pedido ja conferido a parte), ou null se algum estiver fora da regra. O CPF so passa como 11 digitos. */
function conferirCartao(e: Record<string, unknown>): DadosDoCartao | null {
  if (!soAs(e, ['numero', 'token', 'bandeira', 'tipo', 'parcelas', 'final'], ['documento'])) return null
  const { token, bandeira, tipo, parcelas, final, documento } = e
  if (typeof token !== 'string' || !TOKEN_DO_CARTAO.test(token)) return null
  if (typeof bandeira !== 'string' || !BANDEIRA.test(bandeira)) return null
  if (tipo !== 'credit_card' && tipo !== 'debit_card') return null
  if (typeof parcelas !== 'number' || !Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) return null
  if (typeof final !== 'string' || !FINAL.test(final)) return null
  let doc: Documento | null = null
  if (documento !== undefined) {
    if (!objeto(documento) || !soAs(documento, ['tipo', 'numero']) || documento.tipo !== 'CPF') return null
    if (typeof documento.numero !== 'string') return null
    const numero = documento.numero.replace(/\D/g, '')
    if (numero.length !== 11) return null
    doc = { tipo: 'CPF', numero }
  }
  return { cartao: { token, bandeira, tipo, parcelas }, final, documento: doc }
}

const CODIGOS_DE_INICIAR: Record<string, CodigoDoFechamento> = {
  pedido_invalido: 'pedido_invalido',
  muitas_tentativas: 'tentativas_esgotadas',
  sem_sessao: 'sem_sessao',
}

/** So um 4xx de recusa (nao 409, 423 nem 429) encerra a tentativa; sem resposta, 2xx ilegivel, 5xx e esses tres a deixam pendente. */
const criacaoRecusada = (status: number) => status >= 400 && status < 500 && status !== 409 && status !== 423 && status !== 429

function situacaoDaResposta(
  numero: string,
  forma: 'pix' | 'cartao',
  aplicado: { tentativa: string; pedido: string },
  pedido: PedidoMp,
): RespostaDoPagamento {
  const estado = aplicado.tentativa
  // o QR e o desafio so com a tentativa pendente e o pedido ainda aguardando
  const pendente = estado === 'pendente' && aplicado.pedido === 'aguardando_pagamento'
  const pagamento: PagamentoNaTela = {
    forma,
    estado,
    recusa: estado === 'recusado' ? (traduzir(pedido)?.recusa ?? null) : null,
    pix: pendente && forma === 'pix' ? (pedido.pagamento?.pix ?? null) : null,
    desafioUrl: pendente && forma === 'cartao' ? (pedido.pagamento?.desafioUrl ?? null) : null,
  }
  return { ok: true, situacao: { numero, estado: aplicado.pedido as EstadoDoPedido, pagamento } }
}

type Ultima = NonNullable<Awaited<ReturnType<typeof lerUltimaTentativa>>>

/** A situacao como o banco a tem: o Pix so aparece com a tentativa pendente e o pedido aguardando; o desafio nao e guardado. */
function situacaoDoBanco(numero: string, estado: string, ultima: Ultima | null): SituacaoDoPedido {
  const pendente = ultima?.status === 'pendente' && estado === 'aguardando_pagamento'
  return {
    numero,
    estado: estado as EstadoDoPedido,
    pagamento: ultima && {
      forma: ultima.forma,
      estado: ultima.status,
      recusa: ultima.recusa,
      pix:
        pendente && ultima.pixCopiaECola && ultima.pixQrBase64
          ? { copiaECola: ultima.pixCopiaECola, qrBase64: ultima.pixQrBase64, expiraEm: ultima.pixExpiraEm }
          : null,
      desafioUrl: null,
    },
  }
}

/** O que o banco tem agora, para a tela, quando a resposta do Mercado Pago nao serve ou nem houve chamada. */
async function situacaoLida(numero: string, pedidoId: string): Promise<RespostaDoPagamento> {
  const ultima = await lerUltimaTentativa(pedidoId)
  const atual = await lerPedidoParaPagar(numero)
  if (!ultima || !atual) return { ok: false, erro: 'pagamento_indisponivel' }
  return { ok: true, situacao: situacaoDoBanco(numero, atual.estado, ultima) }
}

/**
 * O caminho comum das duas formas. Ordem: sessao, campos, limite, pedido,
 * tentativa, cancelar as anteriores da cliente, reler o pedido, Mercado Pago,
 * guardar os ids, aplicar.
 */
async function pagar(forma: 'pix' | 'cartao', entrada: unknown): Promise<RespostaDoPagamento> {
  try {
    const usuario = await obterUsuario()
    if (!usuario) return { ok: false, erro: 'sem_sessao' }

    if (!objeto(entrada)) return { ok: false, erro: 'campos_invalidos' }
    const numero = conferirNumeroDoPedido(entrada.numero)
    const dados = forma === 'cartao' ? conferirCartao(entrada) : null
    if (!numero || (forma === 'pix' ? !soAs(entrada, ['numero']) : !dados)) return { ok: false, erro: 'campos_invalidos' }

    if (!(await consumirLimite(`pagar:${usuario.id}`, 20, 3600))) return { ok: false, erro: 'muitas_tentativas' }

    const pedido = await lerPedidoParaPagar(numero)
    if (!pedido || pedido.estado !== 'aguardando_pagamento') return { ok: false, erro: 'pedido_invalido' }

    let tentativa: string
    try {
      tentativa = await iniciarPagamento(pedido.id, forma)
    } catch (erro) {
      if (erro instanceof ErroDeRegra) {
        return { ok: false, erro: Object.hasOwn(CODIGOS_DE_INICIAR, erro.codigo) ? CODIGOS_DE_INICIAR[erro.codigo] : 'tente_de_novo' }
      }
      throw erro
    }

    // As anteriores da cliente sao canceladas la antes de criar a nova; falha aqui e registrada e nunca barra o pagamento.
    await cancelarAsDaClienteNoMp(usuario.id)

    // Cancelar la pode mostrar que o pedido acabou de ser pago (409 cannot_cancel_order le e aplica): sem cobranca nova.
    const relido = await lerPedidoParaPagar(numero)
    if (relido?.estado !== 'aguardando_pagamento') {
      try {
        await aplicarPagamento({
          tentativa,
          mpPedidoId: null,
          mpPagamentoId: null,
          status: 'cancelado',
          detalhe: relido?.estado === 'cancelado' ? 'pedido_cancelado' : 'pedido_ja_pago',
          valorCentavos: pedido.totalCentavos,
        })
      } catch (erro) {
        registrarFalha('cancelar_tentativa_nova', erro)
      }
      return situacaoLida(numero, pedido.id)
    }

    const base = { tentativa, totalCentavos: pedido.totalCentavos, email: usuario.email }
    const criado = dados ? await criarPedidoCartao({ ...base, cartao: dados.cartao, documento: dados.documento }) : await criarPedidoPix(base)

    if (!criado.ok) {
      if (criacaoRecusada(criado.status)) {
        await aplicarPagamento({
          tentativa,
          mpPedidoId: null,
          mpPagamentoId: null,
          status: 'cancelado',
          detalhe: 'criacao_recusada',
          valorCentavos: pedido.totalCentavos,
        })
      }
      return { ok: false, erro: 'pagamento_indisponivel' }
    }

    // Os ids do pedido la primeiro: se o resto falhar, a reconciliacao e o cancelamento ainda o acham.
    try {
      await guardarIdsDoMp(tentativa, criado.pedido)
    } catch (erro) {
      registrarFalha('guardar_ids_do_mp', erro)
    }

    const aplicado = await aplicarRespostaDoMp(tentativa, criado.pedido, dados?.final)
    if (aplicado) return situacaoDaResposta(numero, forma, aplicado, criado.pedido)

    // A traducao falhou ou a referencia nao confere: a tentativa existe, entao a tela recebe o que o banco tem.
    return situacaoLida(numero, pedido.id)
  } catch (erro) {
    // um ErroDeRegra (de aplicar_pagamento) tambem vai ao log, com o codigo dele
    registrarFalha(forma === 'pix' ? 'pagar_com_pix' : 'pagar_com_cartao', erro)
    return { ok: false, erro: 'tente_de_novo' }
  }
}

export async function pagarComPix(entrada: unknown): Promise<RespostaDoPagamento> {
  return pagar('pix', entrada)
}

export async function pagarComCartao(entrada: unknown): Promise<RespostaDoPagamento> {
  return pagar('cartao', entrada)
}

/**
 * Pergunta ao Mercado Pago, no maximo a cada 15 s por tentativa, enquanto o
 * pagamento espera. Ate 600 perguntas por hora por cliente: um ciclo da espera
 * (cerca de 136 em 30 min) cabe duas vezes na mesma hora, ou em duas abas.
 */
export async function situacaoDoPedido(
  entrada: unknown,
): Promise<{ ok: true; situacao: SituacaoDoPedido } | { ok: false; erro: CodigoDoFechamento }> {
  try {
    const usuario = await obterUsuario()
    if (!usuario) return { ok: false, erro: 'sem_sessao' }

    if (!objeto(entrada) || !soAs(entrada, ['numero'])) return { ok: false, erro: 'campos_invalidos' }
    const numero = conferirNumeroDoPedido(entrada.numero)
    if (!numero) return { ok: false, erro: 'campos_invalidos' }

    if (!(await consumirLimite(`situacao:${usuario.id}`, 600, 3600))) return { ok: false, erro: 'muitas_tentativas' }

    let pedido = await lerPedidoParaPagar(numero)
    if (!pedido) return { ok: false, erro: 'pedido_invalido' }
    let ultima = await lerUltimaTentativa(pedido.id)

    if (ultima?.status === 'pendente') {
      const mpPedidoId = await mpPedidoDaTentativa(ultima.id)
      if (mpPedidoId && (await consumirLimite(`mp:${ultima.id}`, 1, 15))) {
        // sincronizar que falha nao derruba a resposta: a tela recebe o que o banco tem
        try {
          await sincronizarTentativa(ultima.id, mpPedidoId)
        } catch (erro) {
          registrarFalha('situacao_do_pedido.sincronizar', erro)
        }
        pedido = (await lerPedidoParaPagar(numero)) ?? pedido
        ultima = await lerUltimaTentativa(pedido.id)
      }
    }
    return { ok: true, situacao: situacaoDoBanco(numero, pedido.estado, ultima) }
  } catch (erro) {
    registrarFalha('situacao_do_pedido', erro)
    return { ok: false, erro: 'tente_de_novo' }
  }
}
