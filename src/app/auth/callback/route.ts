import { NextResponse, type NextRequest } from 'next/server'
import { criarClienteServidor } from '@/lib/auth/servidor'

/**
 * O link do e-mail de troca de endereco (modelo "Change email address", com
 * token_hash). So aceita esse tipo: cadastro e senha nova sao por codigo
 * digitado na pagina, nunca por link.
 */
const FORMATO_DO_HASH = /^[A-Za-z0-9_-]{10,200}$/

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ir = (caminho: string) => NextResponse.redirect(new URL(caminho, request.url))
  const invalido = () => ir('/entrar?aviso=link-invalido')
  const tipo = request.nextUrl.searchParams.get('type')
  const hash = request.nextUrl.searchParams.get('token_hash') ?? ''
  if (tipo !== 'email_change' || !FORMATO_DO_HASH.test(hash)) return invalido()
  try {
    const banco = await criarClienteServidor()
    const { error } = await banco.auth.verifyOtp({ token_hash: hash, type: 'email_change' })
    if (error) return invalido()
  } catch {
    return invalido()
  }
  return ir('/conta/perfil?aviso=email-trocado')
}
