import 'server-only'
import { criarClienteServidor } from '@/lib/auth/servidor'
import type { EnderecoNovo } from '@/lib/conta/regras'
import { erroDoBanco, falhaDoBanco } from '@/lib/dados/erros'

/**
 * Os enderecos da cliente logada (ate 5, um principal: as duas regras moram
 * no banco). Toda leitura e escrita filtra pelo id que veio de exigirUsuario,
 * alem da RLS. As escritas por id devolvem false quando nada mudou: o
 * endereco nao existe ou nao e dela.
 */

export type Endereco = EnderecoNovo & { id: string }

const COLUNAS = 'id, apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, principal'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function lerEnderecos(usuarioId: string): Promise<Endereco[]> {
  const banco = await criarClienteServidor()
  const { data, error } = await banco
    .from('enderecos')
    .select(COLUNAS)
    .eq('user_id', usuarioId)
    .order('principal', { ascending: false })
    .order('criado_em', { ascending: true })
  if (error) throw falhaDoBanco('enderecos', error)
  return data
}

/** Quantos enderecos ela tem (o numero do sumario), sem trazer as linhas. */
export async function contarEnderecos(usuarioId: string): Promise<number> {
  const banco = await criarClienteServidor()
  const { count, error } = await banco.from('enderecos').select('id', { count: 'exact', head: true }).eq('user_id', usuarioId)
  if (error) throw falhaDoBanco('enderecos', error)
  return count ?? 0
}

/** O dono vem da sessao (user_id tem auth.uid() por padrao). */
export async function criarEndereco(novo: EnderecoNovo): Promise<void> {
  const banco = await criarClienteServidor()
  const { error } = await banco.from('enderecos').insert(novo)
  if (error) throw erroDoBanco('enderecos', error)
}

export async function alterarEndereco(usuarioId: string, id: string, novo: EnderecoNovo): Promise<boolean> {
  if (!UUID.test(id)) return false
  const banco = await criarClienteServidor()
  const { data, error } = await banco.from('enderecos').update(novo).eq('id', id).eq('user_id', usuarioId).select('id')
  if (error) throw erroDoBanco('enderecos', error)
  return data.length > 0
}

export async function apagarEndereco(usuarioId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false
  const banco = await criarClienteServidor()
  const { data, error } = await banco.from('enderecos').delete().eq('id', id).eq('user_id', usuarioId).select('id')
  if (error) throw erroDoBanco('enderecos', error)
  return data.length > 0
}

/** O banco tira o principal dos outros (gatilho um_principal). */
export async function tornarEnderecoPrincipal(usuarioId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false
  const banco = await criarClienteServidor()
  const { data, error } = await banco.from('enderecos').update({ principal: true }).eq('id', id).eq('user_id', usuarioId).select('id')
  if (error) throw erroDoBanco('enderecos', error)
  return data.length > 0
}
