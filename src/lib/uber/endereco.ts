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
