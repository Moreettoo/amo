import 'server-only'

/** O endereco como a Uber o recebe: o CEP so com 8 digitos, a UF em maiuscula. */
export type EnderecoUber = {
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

/**
 * O endereco da Uber, sempre como texto JSON com as chaves nesta ordem. A mesma
 * funcao serve a cotacao e a corrida, para os dois textos serem identicos.
 * Lanca se o CEP nao tiver 8 digitos (o cliente da Uber trata).
 */
export function enderecoDaUber(e: EnderecoUber): string {
  const cep = e.cep.replace(/\D/g, '')
  if (cep.length !== 8) throw new Error('cep invalido')
  const complemento = e.complemento.trim()
  return JSON.stringify({
    street_address: [`${e.logradouro}, ${e.numero}`, complemento === '' ? e.bairro : `${complemento} - ${e.bairro}`],
    city: e.cidade,
    state: e.uf,
    zip_code: `${cep.slice(0, 5)}-${cep.slice(5)}`,
    country: 'BR',
  })
}

/** +55 e os 10 ou 11 digitos. Lanca com qualquer outra coisa. */
export function telefoneDaUber(digitos: string): string {
  if (!/^\d{10,11}$/.test(digitos)) throw new Error('telefone invalido')
  return `+55${digitos}`
}
