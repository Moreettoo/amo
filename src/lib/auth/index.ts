import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { criarClienteServidor } from '@/lib/auth/servidor'
import { voltaSegura } from '@/lib/auth/volta'

/**
 * Quem esta logada. A identidade vem do Auth (getUser, validado no Supabase,
 * que pega sessao revogada), nunca de getSession nem de um campo do
 * formulario; nome e celular vem do perfil, pela porta.
 */
export type Usuario = { id: string; email: string; nome: string; celular: string }

export const obterUsuario = cache(async (): Promise<Usuario | null> => {
  try {
    const banco = await criarClienteServidor()
    const { data, error } = await banco.auth.getUser()
    if (error || !data.user?.email) return null
    const { data: perfil } = await banco.from('perfis').select('nome, celular').eq('id', data.user.id).maybeSingle()
    if (!perfil) return null
    return { id: data.user.id, email: data.user.email, nome: perfil.nome, celular: perfil.celular }
  } catch {
    return null
  }
})

/** A cliente, ou o redirecionamento para entrar e voltar a `volta`. */
export async function exigirUsuario(volta: string): Promise<Usuario> {
  const usuario = await obterUsuario()
  if (!usuario) redirect(`/entrar?volta=${encodeURIComponent(voltaSegura(volta))}`)
  return usuario
}
