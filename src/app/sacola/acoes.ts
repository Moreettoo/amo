'use server'

import { headers } from 'next/headers'
import { obterUsuario } from '@/lib/auth'
import { lerIp } from '@/lib/auth/ip'
import { buscarCep } from '@/lib/dados/cep'
import { cotarDeExemplo, registrarCotacao, VALIDADE_DA_COTACAO_MS } from '@/lib/dados/cotacao'
import { mercadoPagoEmTeste } from '@/lib/dados/ambiente'
import { ErroDeRegra, registrarFalha } from '@/lib/dados/erros'
import { criarPedido } from '@/lib/dados/fechamento'
import { consumirLimite } from '@/lib/dados/limites'
import type { CodigoDoFechamento, ItemDoPedido, RespostaDaCotacao, RespostaDoPedido } from '@/lib/fechamento/tipos'

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
 * Fecha o pedido. Ordem (backend 11): a sessao, cada campo conferido, o banco,
 * a traducao do codigo. Sem limite aqui: o banco limita a 10 pedidos por hora.
 */
export async function fecharPedido(entrada: unknown): Promise<RespostaDoPedido> {
  try {
    if (!(await obterUsuario())) return { ok: false, erro: 'sem_sessao' }

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
    return { ok: true, pedido }
  } catch (erro) {
    if (erro instanceof ErroDeRegra && erro.codigo in CODIGOS_DO_BANCO) {
      return { ok: false, erro: CODIGOS_DO_BANCO[erro.codigo] }
    }
    if (!(erro instanceof ErroDeRegra)) registrarFalha('fechar_pedido', erro)
    return { ok: false, erro: 'tente_de_novo' }
  }
}
