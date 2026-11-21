import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { traduzirErroDoAuth, type CodigoDaConta } from '@/lib/auth/erros'
import { variavel } from '@/lib/dados/ambiente'
import { registrarFalha } from '@/lib/dados/erros'

/**
 * Confere a senha de quem ja esta logada (para excluir a conta e para trocar
 * a senha), num cliente a parte, sem cookie: a sessao atual nao muda. O
 * Supabase nao tem outro jeito de conferir uma senha, entao isto e um login; a
 * sessao que ele abre nao fica viva: encerra-se logo que a senha confere
 * (escopo local, so aquela sessao; as outras da cliente continuam).
 */
export async function senhaConfere(email: string, senha: string, captchaToken: string): Promise<true | CodigoDaConta> {
  const banco = createClient(variavel('NEXT_PUBLIC_SUPABASE_URL'), variavel('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { error } = await banco.auth.signInWithPassword({ email, password: senha, options: { captchaToken } })
  if (error) return traduzirErroDoAuth(error, 'senhaConfere')
  const { error: erroAoSair } = await banco.auth.signOut({ scope: 'local' })
  if (erroAoSair) registrarFalha('senhaConfere', erroAoSair)
  return true
}
