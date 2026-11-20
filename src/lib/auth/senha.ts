import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { traduzirErroDoAuth, type CodigoDaConta } from '@/lib/auth/erros'
import { variavel } from '@/lib/dados/ambiente'

/**
 * Confere a senha de quem ja esta logada (para excluir a conta), num cliente
 * a parte, sem cookie: a sessao atual nao muda. O Supabase nao tem outro jeito
 * de conferir uma senha, entao isto e um login; a sessao que ele abre morre
 * com a conta, logo em seguida.
 */
export async function senhaConfere(email: string, senha: string, captchaToken: string): Promise<true | CodigoDaConta> {
  const banco = createClient(variavel('NEXT_PUBLIC_SUPABASE_URL'), variavel('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { error } = await banco.auth.signInWithPassword({ email, password: senha, options: { captchaToken } })
  return error ? traduzirErroDoAuth(error) : true
}
