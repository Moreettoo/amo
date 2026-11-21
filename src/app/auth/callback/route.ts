import { NextResponse, type NextRequest } from 'next/server'
import { criarClienteServidor } from '@/lib/auth/servidor'

/**
 * O link do e-mail de troca de endereco (modelo "Change email address", com
 * token_hash). So aceita esse tipo: cadastro e senha nova sao por codigo
 * digitado na pagina, nunca por link.
 */
const FORMATO_DO_HASH = /^[A-Za-z0-9_-]{10,200}$/
const ACESSO = '/conta/perfil/email-e-senha'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ir = (caminho: string) => NextResponse.redirect(new URL(caminho, request.url))
  // a tela da troca diz o que aconteceu; sem sessao, exigirUsuario leva a entrar e volta para ela
  const invalido = () => ir(`${ACESSO}?aviso=link-invalido`)
  const tipo = request.nextUrl.searchParams.get('type')
  const hash = request.nextUrl.searchParams.get('token_hash') ?? ''
  if (tipo !== 'email_change' || !FORMATO_DO_HASH.test(hash)) return invalido()
  try {
    const banco = await criarClienteServidor()
    const { data, error } = await banco.auth.verifyOtp({ token_hash: hash, type: 'email_change' })
    if (error) return invalido()
    // com "Secure email change" o primeiro dos dois links so confirma um lado e
    // o verify nao abre sessao; o ultimo troca o e-mail e abre. O sinal vem do
    // verify, nao do cookie: o link aberto noutro navegador chega sem sessao
    return ir(`${ACESSO}?aviso=${data.session ? 'email-trocado' : 'falta-o-outro-email'}`)
  } catch {
    return invalido()
  }
}
