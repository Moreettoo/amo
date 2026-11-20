import 'server-only'

/**
 * As variaveis de ambiente que a camada de dados usa. So a camada de dados le
 * process.env. O acesso e literal (process.env.NOME) para o Next saber o que
 * e cada uma, e acontece na hora da chamada, nunca no topo do modulo.
 */
type Nome =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  | 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'
  | 'SUPABASE_PORTA'
  | 'SUPABASE_SECRET_KEY'

function ler(nome: Nome): string | undefined {
  switch (nome) {
    case 'NEXT_PUBLIC_SUPABASE_URL':
      return process.env.NEXT_PUBLIC_SUPABASE_URL
    case 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':
      return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    case 'NEXT_PUBLIC_TURNSTILE_SITE_KEY':
      return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    case 'SUPABASE_PORTA':
      return process.env.SUPABASE_PORTA
    case 'SUPABASE_SECRET_KEY':
      return process.env.SUPABASE_SECRET_KEY
  }
}

/** O valor da variavel; ausente ou so com espacos lanca erro com o nome (nunca o valor). */
export function variavel(nome: Nome): string {
  const valor = ler(nome)
  if (!valor?.trim()) throw new Error(`Falta a variável de ambiente ${nome}`)
  return valor
}
