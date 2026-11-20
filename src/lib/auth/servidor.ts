import 'server-only'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { OPCOES_DO_COOKIE } from '@/lib/auth/cookies'
import { variavel } from '@/lib/dados/ambiente'
import type { Database } from '@/lib/dados/banco'

/**
 * O cliente do Supabase com a sessao da cliente, lida e gravada nos cookies.
 * Toda chamada leva a porta do banco (spec 5, regra 6). Um cliente novo por
 * pedido, nunca compartilhado.
 */
export async function criarClienteServidor(): Promise<SupabaseClient<Database>> {
  const pote = await cookies()
  return createServerClient<Database>(variavel('NEXT_PUBLIC_SUPABASE_URL'), variavel('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    cookieOptions: OPCOES_DO_COOKIE,
    global: { headers: { 'x-amo-porta': variavel('SUPABASE_PORTA') } },
    cookies: {
      getAll: () => pote.getAll(),
      setAll: (aGravar) => {
        try {
          for (const { name, value, options } of aGravar) pote.set(name, value, options)
        } catch {
          // Componente de servidor nao grava cookie; quem renova a sessao
          // nessas paginas e o proxy.ts, antes de a pagina renderizar.
        }
      },
    },
  })
}
