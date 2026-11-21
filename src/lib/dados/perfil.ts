import 'server-only'
import { criarClienteServidor } from '@/lib/auth/servidor'
import { erroDoBanco, falhaDoBanco } from '@/lib/dados/erros'

/**
 * O perfil da cliente logada, com a sessao dela: o filtro pelo id que veio
 * de exigirUsuario e a RLS valem juntos, um nao dispensa o outro.
 */

export type Perfil = { nome: string; celular: string; aceitaMarketing: boolean }

export async function lerPerfil(usuarioId: string): Promise<Perfil | null> {
  const banco = await criarClienteServidor()
  const { data, error, status } = await banco.from('perfis').select('nome, celular, marketing_aceito_em').eq('id', usuarioId).maybeSingle()
  if (error) throw falhaDoBanco('perfis', error, status)
  if (!data) return null
  return { nome: data.nome, celular: data.celular, aceitaMarketing: data.marketing_aceito_em !== null }
}

export async function gravarPerfil(usuarioId: string, dados: { nome: string; celular: string }): Promise<void> {
  const banco = await criarClienteServidor()
  const { error, status } = await banco.from('perfis').update({ nome: dados.nome, celular: dados.celular }).eq('id', usuarioId)
  if (error) throw erroDoBanco('perfis', error, status)
}

/** O aceite de novidades tem data: quem grava e o banco (definir_marketing). */
export async function gravarMarketing(aceita: boolean): Promise<void> {
  const banco = await criarClienteServidor()
  const { error, status } = await banco.rpc('definir_marketing', { p_aceita: aceita })
  if (error) throw erroDoBanco('definir_marketing', error, status)
}

export async function podeExcluirConta(): Promise<{ pode: boolean; motivo: string | null }> {
  const banco = await criarClienteServidor()
  const { data, error, status } = await banco.rpc('pode_excluir_conta')
  if (error) throw falhaDoBanco('pode_excluir_conta', error, status)
  const linha = data?.[0]
  if (!linha) throw falhaDoBanco('pode_excluir_conta', null)
  return { pode: linha.pode, motivo: linha.pode ? null : (linha.motivo ?? null) }
}
