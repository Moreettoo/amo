import 'server-only'

/**
 * O erro que sobe quando o banco falha. Diz onde e o codigo; a mensagem crua
 * do banco nunca entra (ela pode trazer nome de tabela, valor ou detalhe que
 * nao deve chegar a um log nem a pagina).
 */
export function falhaDoBanco(onde: string, erro: { code?: string } | null): Error {
  return new Error(`Falha no banco (${onde}): ${erro?.code || 'sem código'}`)
}
