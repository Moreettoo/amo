/**
 * O fechamento do pedido: as regras dos dados da cliente e o envio. O envio
 * ainda e de exemplo (enviarPedidoDeExemplo): nenhum valor e cobrado e nada
 * sai do navegador. Quando o meio de pagamento for escolhido, o envio vai
 * para o servidor, que recalcula precos e frete (o navegador nunca diz o
 * total que vale).
 */

export type Dados = { nome: string; celular: string; email: string }
export type Pagamento = 'pix' | 'cartao'

export const NOMES_DO_PAGAMENTO: Readonly<Record<Pagamento, string>> = {
  pix: 'Pix',
  cartao: 'Cartão de crédito',
}

const digitos = (texto: string) => texto.replace(/\D/g, '')

/** "11987654321" vira "(11) 98765-4321" enquanto a pessoa digita. */
export function mascararCelular(texto: string): string {
  const d = digitos(texto).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export type ErrosDosDados = Partial<Record<keyof Dados, string>>

/** O nome tem de dar para o entregador chamar; null quando serve. */
export function erroDoNome(nome: string): string | null {
  return nome.trim().length < 2 ? 'Diga o seu nome, para o entregador chamar.' : null
}

/** Celular com DDD e 9 dígitos, o terceiro sendo 9; null quando serve. */
export function erroDoCelular(celular: string): string | null {
  const cel = digitos(celular)
  return cel.length !== 11 || cel[2] !== '9' ? 'Confira o celular: DDD e 9 números, como (11) 98765-4321.' : null
}

/** O que da para conferir aqui; o resto o servidor confere. */
export function validarDados(d: Dados): ErrosDosDados {
  const erros: ErrosDosDados = {}
  const nome = erroDoNome(d.nome)
  if (nome) erros.nome = nome
  const celular = erroDoCelular(d.celular)
  if (celular) erros.celular = celular
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) erros.email = 'Confira o e-mail: falta algo como nome@exemplo.com.'
  return erros
}

/** "04567-000, 120, ap. 52" */
/** EXEMPLO. Responde depois de um instante, como o servidor responderia. */
export async function enviarPedidoDeExemplo(): Promise<{ numero: string }> {
  await new Promise((r) => setTimeout(r, 700))
  return { numero: String(Date.now()).slice(-6) }
}
