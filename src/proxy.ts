import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { OPCOES_DO_COOKIE } from '@/lib/auth/cookies'
import { variavel } from '@/lib/dados/ambiente'
import { montarPolitica } from '@/lib/seguranca/politica'

/**
 * Nas rotas com dado pessoal: renova a sessao quando o token venceu (como a
 * documentacao do @supabase/ssr manda para o Next) e manda a politica de
 * seguranca com um nonce novo. Nao decide acesso: quem decide e o
 * exigirUsuario de cada pagina e de cada acao.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  // os destinos do Brick do cartao so na sacola, onde ele carrega
  const politica = montarPolitica(nonce, process.env.NODE_ENV === 'development', request.nextUrl.pathname === '/sacola')

  const repassar = () => {
    const cabecalhos = new Headers(request.headers)
    cabecalhos.set('x-nonce', nonce)
    cabecalhos.set('Content-Security-Policy', politica)
    return NextResponse.next({ request: { headers: cabecalhos } })
  }

  let resposta = repassar()
  const banco = createServerClient(variavel('NEXT_PUBLIC_SUPABASE_URL'), variavel('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    cookieOptions: OPCOES_DO_COOKIE,
    global: { headers: { 'x-amo-porta': variavel('SUPABASE_PORTA') } },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (aGravar, cabecalhosDeCache) => {
        for (const { name, value } of aGravar) request.cookies.set(name, value)
        resposta = repassar()
        for (const { name, value, options } of aGravar) resposta.cookies.set(name, value, { ...options, ...OPCOES_DO_COOKIE })
        for (const [chave, valor] of Object.entries(cabecalhosDeCache ?? {})) resposta.headers.set(chave, valor)
      },
    },
  })
  // nada entre criar o cliente e getClaims (documentacao do @supabase/ssr)
  await banco.auth.getClaims()

  resposta.headers.set('Content-Security-Policy', politica)
  return resposta
}

export const config = {
  matcher: ['/sacola', '/conta/:path*', '/entrar', '/cadastro', '/esqueci-a-senha', '/auth/:path*'],
}
