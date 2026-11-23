import 'server-only'
import type { EnderecoUber } from '@/lib/uber/endereco'

/**
 * As variaveis de ambiente do servidor. Todo modulo de servidor le process.env
 * so por aqui. O acesso e literal (process.env.NOME) para o Next saber o que
 * e cada uma, e acontece na hora da chamada, nunca no topo do modulo.
 */
type Nome =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  | 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'
  | 'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY'
  | 'MERCADOPAGO_ACCESS_TOKEN'
  | 'MERCADOPAGO_WEBHOOK_SECRET'
  | 'TAREFAS_SEGREDO'
  | 'SUPABASE_PORTA'
  | 'SUPABASE_SECRET_KEY'
  | 'UBER_DIRECT_CUSTOMER_ID'
  | 'UBER_DIRECT_CLIENT_ID'
  | 'UBER_DIRECT_CLIENT_SECRET'
  | 'UBER_DIRECT_WEBHOOK_SECRET'
  | 'COZINHA_ENDERECO'

function ler(nome: Nome): string | undefined {
  switch (nome) {
    case 'NEXT_PUBLIC_SUPABASE_URL':
      return process.env.NEXT_PUBLIC_SUPABASE_URL
    case 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':
      return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    case 'NEXT_PUBLIC_TURNSTILE_SITE_KEY':
      return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    case 'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY':
      return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
    case 'MERCADOPAGO_ACCESS_TOKEN':
      return process.env.MERCADOPAGO_ACCESS_TOKEN
    case 'MERCADOPAGO_WEBHOOK_SECRET':
      return process.env.MERCADOPAGO_WEBHOOK_SECRET
    case 'TAREFAS_SEGREDO':
      return process.env.TAREFAS_SEGREDO
    case 'SUPABASE_PORTA':
      return process.env.SUPABASE_PORTA
    case 'SUPABASE_SECRET_KEY':
      return process.env.SUPABASE_SECRET_KEY
    case 'UBER_DIRECT_CUSTOMER_ID':
      return process.env.UBER_DIRECT_CUSTOMER_ID
    case 'UBER_DIRECT_CLIENT_ID':
      return process.env.UBER_DIRECT_CLIENT_ID
    case 'UBER_DIRECT_CLIENT_SECRET':
      return process.env.UBER_DIRECT_CLIENT_SECRET
    case 'UBER_DIRECT_WEBHOOK_SECRET':
      return process.env.UBER_DIRECT_WEBHOOK_SECRET
    case 'COZINHA_ENDERECO':
      return process.env.COZINHA_ENDERECO
  }
}

/** O valor da variavel; ausente ou so com espacos lanca erro com o nome (nunca o valor). */
export function variavel(nome: Nome): string {
  const valor = ler(nome)
  if (!valor?.trim()) throw new Error(`Falta a variável de ambiente ${nome}`)
  return valor
}

/** Verdadeiro so com MERCADOPAGO_AMBIENTE igual a teste; ausente ou outro valor e producao. */
export function mercadoPagoEmTeste(): boolean {
  return process.env.MERCADOPAGO_AMBIENTE?.trim() === 'teste'
}

/** A chave publica do Mercado Pago, que o Brick usa no navegador; vazia ou ausente, null. */
export function chavePublicaDoMercadoPago(): string | null {
  const valor = ler('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY')?.trim()
  return valor ? valor : null
}

/** Verdadeiro com as tres credenciais da Uber presentes e nao vazias. */
export function uberConfigurada(): boolean {
  return (['UBER_DIRECT_CUSTOMER_ID', 'UBER_DIRECT_CLIENT_ID', 'UBER_DIRECT_CLIENT_SECRET'] as const).every(
    (nome) => !!ler(nome)?.trim(),
  )
}

/** Verdadeiro so com UBER_DIRECT_AMBIENTE igual a teste; ausente ou outro valor e producao. */
export function uberEmTeste(): boolean {
  return process.env.UBER_DIRECT_AMBIENTE?.trim() === 'teste'
}

/** A Uber e o Mercado Pago estao no mesmo ambiente (os dois em teste ou os dois em producao). */
export function ambientesCombinam(): boolean {
  return uberEmTeste() === mercadoPagoEmTeste()
}

export type Cozinha = { nome: 'AMO Sabores Saudáveis'; endereco: EnderecoUber; telefone: string }

const COZINHA_INVALIDA = 'COZINHA_ENDERECO invalido'
const SEM_CONTROLE_NEM_ANGULO = /^[^\p{Cc}<>]*$/u

function textoDaCozinha(bruto: unknown, min: number, max: number): string {
  if (typeof bruto !== 'string') throw new Error(COZINHA_INVALIDA)
  const texto = bruto.trim()
  if (texto.length < min || texto.length > max || !SEM_CONTROLE_NEM_ANGULO.test(texto)) throw new Error(COZINHA_INVALIDA)
  return texto
}

/**
 * O endereco e o telefone da cozinha, de COZINHA_ENDERECO (um objeto JSON com
 * logradouro, numero, complemento, bairro, cidade, uf, cep e telefone). Os
 * limites repetem os de privado.cotacoes. O CEP sai com 8 digitos, a UF em
 * maiuscula e o telefone com 10 ou 11 digitos, sem o 55. Qualquer defeito lanca
 * a mesma mensagem fixa: nunca o valor, nem o erro do JSON.parse.
 */
export function cozinha(): Cozinha {
  let bruto: unknown
  try {
    bruto = JSON.parse(variavel('COZINHA_ENDERECO'))
  } catch {
    throw new Error(COZINHA_INVALIDA)
  }
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) throw new Error(COZINHA_INVALIDA)
  const c = bruto as Record<string, unknown>

  const numero = textoDaCozinha(c.numero, 1, 10)
  if (!/^[0-9A-Za-z][0-9A-Za-z /-]{0,9}$/.test(numero)) throw new Error(COZINHA_INVALIDA)

  const cepTexto = textoDaCozinha(c.cep, 8, 9)
  if (!/^(\d{8}|\d{5}-\d{3})$/.test(cepTexto)) throw new Error(COZINHA_INVALIDA)

  const uf = textoDaCozinha(c.uf, 2, 2).toUpperCase()
  if (!/^[A-Z]{2}$/.test(uf)) throw new Error(COZINHA_INVALIDA)

  const telefoneTexto = textoDaCozinha(c.telefone, 1, 30)
  if (/[A-Za-z]/.test(telefoneTexto)) throw new Error(COZINHA_INVALIDA)
  let telefone = telefoneTexto.replace(/\D/g, '')
  if ((telefone.length === 12 || telefone.length === 13) && telefone.startsWith('55')) telefone = telefone.slice(2)
  if (telefone.length !== 10 && telefone.length !== 11) throw new Error(COZINHA_INVALIDA)

  return {
    nome: 'AMO Sabores Saudáveis',
    endereco: {
      logradouro: textoDaCozinha(c.logradouro, 2, 120),
      numero,
      complemento: c.complemento === '' ? '' : textoDaCozinha(c.complemento, 0, 60),
      bairro: textoDaCozinha(c.bairro, 1, 60),
      cidade: textoDaCozinha(c.cidade, 2, 60),
      uf,
      cep: cepTexto.replace(/\D/g, ''),
    },
    telefone,
  }
}
