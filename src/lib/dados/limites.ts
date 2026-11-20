import 'server-only'
import { criarClienteAdmin } from '@/lib/auth/admin'

/**
 * Conta uma tentativa e diz se ainda pode (privado.consumir_limite, que guarda
 * so o hash da chave). Falso quando estourou e tambem quando a consulta
 * falhou: na duvida, fecha.
 */
export async function consumirLimite(chave: string, maximo: number, janelaSegundos: number): Promise<boolean> {
  try {
    const { data, error } = await criarClienteAdmin()
      .schema('privado' as never)
      .rpc('consumir_limite' as never, { p_chave: chave, p_maximo: maximo, p_janela_segundos: janelaSegundos } as never)
    return !error && data === true
  } catch {
    return false
  }
}
