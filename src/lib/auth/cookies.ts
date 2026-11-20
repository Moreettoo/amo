import 'server-only'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * O cookie da sessao: httpOnly (nenhum script da pagina le o token), Lax
 * (o login sobrevive a um link vindo de fora, um formulario de outro site nao
 * leva o cookie) e Secure em producao. O navegador nao fala com o Supabase, e
 * por isso ninguem precisa ler o cookie fora do servidor.
 */
export const OPCOES_DO_COOKIE: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

/** Apaga os cookies da sessao (os do Supabase comecam com "sb-"). */
export async function apagarCookiesDaSessao(): Promise<void> {
  const pote = await cookies()
  for (const { name } of pote.getAll()) {
    if (name.startsWith('sb-')) pote.delete(name)
  }
}
