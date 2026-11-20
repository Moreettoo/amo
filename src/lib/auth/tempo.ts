import 'server-only'

/**
 * O piso de tempo das acoes que nao podem dizer se o e-mail tem conta (spec 2:
 * "por texto, tempo ou formato"). O Supabase so manda e-mail num dos casos (na
 * recuperacao, conta que existe; no cadastro, conta nova) e so roda o bcrypt
 * para conta que existe. Segurar a resposta ate o piso tira essa diferenca do
 * relogio de quem pergunta. O piso fica acima do tempo comum de cada chamada;
 * uma chamada mais lenta que ele responde no tempo dela.
 */
export const PISO_DO_ENVIO = 2500
export const PISO_DO_LOGIN = 800

/** O trabalho, mas nunca antes de `piso` milissegundos, venha ele com resposta ou com erro. */
export async function comPiso<T>(piso: number, trabalho: () => Promise<T>): Promise<T> {
  const inicio = Date.now()
  try {
    return await trabalho()
  } finally {
    const falta = piso - (Date.now() - inicio)
    if (falta > 0) await new Promise((r) => setTimeout(r, falta))
  }
}
