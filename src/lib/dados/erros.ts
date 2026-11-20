import 'server-only'

/**
 * O erro que sobe quando o banco falha. Diz onde e o codigo; a mensagem crua
 * do banco nunca entra (ela pode trazer nome de tabela, valor ou detalhe que
 * nao deve chegar a um log nem a pagina).
 */
export function falhaDoBanco(onde: string, erro: { code?: string } | null): Error {
  return new Error(`Falha no banco (${onde}): ${erro?.code || 'sem código'}`)
}

/**
 * Uma regra do banco que a cliente pode ouvir (limite de enderecos, pedido
 * que nao e dela): o codigo vem das funcoes do banco, que levantam P0001 com
 * a mensagem no formato de codigo.
 */
export class ErroDeRegra extends Error {
  readonly codigo: string

  constructor(codigo: string) {
    super(codigo)
    this.name = 'ErroDeRegra'
    this.codigo = codigo
  }
}

const FORMATO_DE_CODIGO = /^[a-z][a-z_]{2,39}$/

/** P0001 com mensagem no formato de codigo vira ErroDeRegra; o resto, falhaDoBanco. */
export function erroDoBanco(onde: string, erro: { code?: string; message?: string } | null): Error {
  if (erro?.code === 'P0001' && erro.message && FORMATO_DE_CODIGO.test(erro.message)) return new ErroDeRegra(erro.message)
  return falhaDoBanco(onde, erro)
}
