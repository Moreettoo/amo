import 'server-only'

/**
 * As variaveis de ambiente do servidor. Todo modulo de servidor le process.env
 * so por aqui. O acesso e literal (process.env.NOME) para o Next saber o que
 * e cada uma, e acontece na hora da chamada, nunca no topo do modulo.
 */
type Nome =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  | 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'
  | 'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY'
  | 'MERCADOPAGO_ACCESS_TOKEN'
  | 'MERCADOPAGO_WEBHOOK_SECRET'
  | 'TAREFAS_SEGREDO'
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
    case 'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY':
      return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
    case 'MERCADOPAGO_ACCESS_TOKEN':
      return process.env.MERCADOPAGO_ACCESS_TOKEN
    case 'MERCADOPAGO_WEBHOOK_SECRET':
      return process.env.MERCADOPAGO_WEBHOOK_SECRET
    case 'TAREFAS_SEGREDO':
      return process.env.TAREFAS_SEGREDO
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

/** Verdadeiro so com MERCADOPAGO_AMBIENTE igual a teste; ausente ou outro valor e producao. */
export function mercadoPagoEmTeste(): boolean {
  return process.env.MERCADOPAGO_AMBIENTE?.trim() === 'teste'
}

/** A chave publica do Mercado Pago, que o Brick usa no navegador; vazia ou ausente, null. */
export function chavePublicaDoMercadoPago(): string | null {
  const valor = ler('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY')?.trim()
  return valor ? valor : null
}
