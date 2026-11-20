import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { variavel } from '@/lib/dados/ambiente'
import type { Database } from '@/lib/dados/banco'

/**
 * O cliente da chave secreta: sem sessao e sem cookie, com a porta. A chave
 * secreta nao le tabela nenhuma (spec 5, regra 5): serve so as funcoes de
 * privado (o limite de tentativas) e a API de administracao do Auth (apagar a
 * conta, e nos testes, criar contas de ensaio).
 */
export function criarClienteAdmin(): SupabaseClient<Database> {
  return createClient<Database>(variavel('NEXT_PUBLIC_SUPABASE_URL'), variavel('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-amo-porta': variavel('SUPABASE_PORTA') } },
  })
}
