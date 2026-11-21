/**
 * As regras do pedido que a tela e a conta usam: as formas de pagamento, a
 * mascara do celular e as regras do nome e do celular. O pedido em si fecha
 * no servidor (src/app/sacola/acoes.ts), que recalcula precos e frete: o
 * navegador nunca diz o total que vale.
 */

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

/** O nome tem de dar para o entregador chamar; null quando serve. */
export function erroDoNome(nome: string): string | null {
  return nome.trim().length < 2 ? 'Diga o seu nome, para o entregador chamar.' : null
}

/** Celular com DDD e 9 dígitos, o terceiro sendo 9; null quando serve. */
export function erroDoCelular(celular: string): string | null {
  const cel = digitos(celular)
  return cel.length !== 11 || cel[2] !== '9' ? 'Confira o celular: DDD e 9 números, como (11) 98765-4321.' : null
}
