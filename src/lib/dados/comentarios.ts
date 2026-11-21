import 'server-only'
import type { Tables } from '@/lib/dados/banco'
import { falhaDoBanco } from '@/lib/dados/erros'
import { criarClienteDoCatalogo } from '@/lib/dados/publico'
import type { Comentario, Nota } from '@/lib/produto'

type LinhaDoComentario = Pick<Tables<'comentarios'>, 'id' | 'produto' | 'nome_exibido' | 'nota' | 'texto' | 'criado_em'>

/** O dia (AAAA-MM-DD) em Sao Paulo: um comentario das 22h30 e do dia em que foi escrito. */
const DIA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })

const NOTAS: readonly number[] = [1, 2, 3, 4, 5]

/** A linha do banco no formato da pagina; nota fora de 1 a 5 descarta o comentario. */
export function montarComentario(linha: LinhaDoComentario): Comentario | null {
  if (!NOTAS.includes(linha.nota)) return null
  return {
    id: linha.id,
    produto: linha.produto,
    nome: linha.nome_exibido,
    nota: linha.nota as Nota,
    data: DIA.format(new Date(linha.criado_em)),
    texto: linha.texto,
  }
}

/**
 * Os comentarios aprovados de um sabor, do mais novo para o mais antigo. Le
 * como visitante: a regra do banco entrega so os aprovados, e o visitante nao
 * pode nem citar `status` nem `user_id`.
 */
export async function lerComentariosAprovados(produto: string): Promise<Comentario[]> {
  const { data, error, status } = await criarClienteDoCatalogo()
    .from('comentarios')
    .select('id, produto, nome_exibido, nota, texto, criado_em')
    .eq('produto', produto)
    .order('criado_em', { ascending: false })
  if (error) throw falhaDoBanco('comentarios', error, status)
  return (data ?? []).flatMap((linha) => montarComentario(linha) ?? [])
}
