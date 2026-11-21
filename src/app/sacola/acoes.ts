'use server'

import { headers } from 'next/headers'
import { obterUsuario } from '@/lib/auth'
import { lerIp } from '@/lib/auth/ip'
import { buscarCep } from '@/lib/dados/cep'
import { cotarDeExemplo, registrarCotacao, VALIDADE_DA_COTACAO_MS } from '@/lib/dados/cotacao'
import { mercadoPagoEmTeste } from '@/lib/dados/ambiente'
import { registrarFalha } from '@/lib/dados/erros'
import { consumirLimite } from '@/lib/dados/limites'
import type { CodigoDoFechamento, RespostaDaCotacao } from '@/lib/fechamento/tipos'

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
