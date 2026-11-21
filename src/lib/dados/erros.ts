import 'server-only'

const CURTO = /^[A-Za-z0-9_.-]{1,64}$/
const curto = (valor: unknown) => (typeof valor === 'string' && CURTO.test(valor) ? valor : null)

/**
 * O registro de uma falha do Supabase (Auth ou banco) no log do servidor: o
 * lugar, o codigo, o status e o nome do erro. A mensagem crua nunca entra
 * (pode trazer o e-mail da cliente, um valor ou um detalhe do banco), nem
 * campo nenhum alem desses quatro; texto fora do formato curto de um codigo
 * vira null. E a unica peca que escreve falha do Supabase no log: quem
 * traduz o erro para a tela (falhaDoBanco, traduzirErroDoAuth) a chama.
 */
export function registrarFalha(onde: string, erro: unknown): void {
  const { code, status, name } = (typeof erro === 'object' && erro !== null ? erro : {}) as Record<string, unknown>
  console.error('Falha do Supabase', {
    onde: curto(onde),
    code: curto(code),
    status: typeof status === 'number' && Number.isInteger(status) ? status : null,
    name: curto(name),
  })
}

/**
 * O erro que sobe quando o banco falha. Diz onde e o codigo; a mensagem crua
 * do banco nunca entra (ela pode trazer nome de tabela, valor ou detalhe que
 * nao deve chegar a um log nem a pagina). A falha vai ao log do servidor.
 * Sem codigo, diz o status HTTP da resposta (0 quando nem houve resposta).
 */
export function falhaDoBanco(onde: string, erro: { code?: string } | null, status?: number): Error {
  registrarFalha(onde, status === undefined ? erro : { ...erro, status })
  const motivo = erro?.code || (status === undefined ? 'sem código' : `HTTP ${status}`)
  return new Error(`Falha no banco (${onde}): ${motivo}`)
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
export function erroDoBanco(onde: string, erro: { code?: string; message?: string } | null, status?: number): Error {
  if (erro?.code === 'P0001' && erro.message && FORMATO_DE_CODIGO.test(erro.message)) return new ErroDeRegra(erro.message)
  return falhaDoBanco(onde, erro, status)
}
