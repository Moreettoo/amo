/**
 * A entrega e pelo Uber, da cozinha ate a casa da cliente. A cotacao de
 * verdade vai sair do servidor (Uber Direct, com o endereco da cozinha
 * guardado la, nunca na pagina). Enquanto a conta nao existe,
 * cotarEntregaDeExemplo responde com valores inventados e estaveis, para a
 * pagina ter todos os estados: calculando, cotado e os erros.
 */

export type Cotacao = { valor: number; minutos: number }

export type ResultadoEntrega =
  | { tipo: 'cotado'; cotacao: Cotacao }
  | { tipo: 'erro'; mensagem: string }

/** So os 8 digitos. */
export const limparCep = (texto: string) => texto.replace(/\D/g, '').slice(0, 8)

/** Os digitos com o traco no lugar, enquanto a pessoa digita: "04567-000". */
export function mascararCep(texto: string): string {
  const d = limparCep(texto)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Confere o que da para conferir sem perguntar a ninguem. */
export function validarEndereco(cep: string, numero: string): string | null {
  if (limparCep(cep).length !== 8) return 'Confira o CEP: ele tem 8 números.'
  if (!numero.trim()) return 'Falta o número da casa ou do prédio.'
  return null
}

/** EXEMPLO. Grande Sao Paulo (CEP comecando por 0) entrega; o resto, nao. */
export async function cotarEntregaDeExemplo(cep: string, numero: string): Promise<ResultadoEntrega> {
  const erro = validarEndereco(cep, numero)
  if (erro) return { tipo: 'erro', mensagem: erro }
  await new Promise((r) => setTimeout(r, 700))
  const d = limparCep(cep)
  if (!d.startsWith('0')) {
    return { tipo: 'erro', mensagem: 'O Uber ainda não chega neste CEP. Hoje a entrega é só na Grande São Paulo.' }
  }
  const distancia = Number(d.slice(1, 4)) % 17
  return { tipo: 'cotado', cotacao: { valor: 790 + distancia * 45, minutos: 30 + distancia * 2 } }
}
