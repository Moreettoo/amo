import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { variavel } from '@/lib/dados/ambiente'
import type { Database } from '@/lib/dados/banco'

/** Um preco trocado no painel aparece no site em ate 5 minutos. */
export const CACHE_DO_CATALOGO_SEGUNDOS = 300
export const ETIQUETA_DO_CATALOGO = 'catalogo'

/**
 * O cliente sem sessao com a porta do banco (spec 5, regra 6) em toda chamada.
 * So o que muda no fetch (cache) vem de fora, para os dois clientes nunca
 * divergirem no cabecalho da porta. O fetch e lido na hora da chamada, para o
 * teste poder trocar o global.
 */
function criarClienteComPorta(opcoesDoFetch: () => RequestInit): SupabaseClient<Database> {
  return createClient<Database>(variavel('NEXT_PUBLIC_SUPABASE_URL'), variavel('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: { 'x-amo-porta': variavel('SUPABASE_PORTA') },
      fetch: (entrada, opcoes) => fetch(entrada, { ...opcoes, ...opcoesDoFetch() }),
    },
  })
}

/**
 * O cliente do catalogo: as leituras ficam no cache do Next por 5 minutos, e as
 * paginas do catalogo continuam estaticas.
 */
export function criarClienteDoCatalogo(): SupabaseClient<Database> {
  return criarClienteComPorta(
    () => ({ next: { revalidate: CACHE_DO_CATALOGO_SEGUNDOS, tags: [ETIQUETA_DO_CATALOGO] } }) as RequestInit,
  )
}

/**
 * O cliente do visitante: sem cache. Le o que tem de estar em dia a cada
 * chamada (horario e pausa da loja).
 */
export function criarClienteDoVisitante(): SupabaseClient<Database> {
  return criarClienteComPorta(() => ({ cache: 'no-store' }))
}
