import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { FormEmail, FormSenha } from '@/components/conta/FormsDaConta'
import { CabecaDaConta, PainelDaConta, lerDadosDoPainel } from '@/components/conta/PainelDaConta'
import { exigirUsuario } from '@/lib/auth'
import { variavel } from '@/lib/dados/ambiente'

export const metadata: Metadata = { title: 'E-mail e senha · AMO', robots: { index: false } }

const ACESSO = '/conta/perfil/email-e-senha'

/** O que o link da troca de e-mail diz ao voltar (src/app/auth/callback/route.ts). */
const AVISOS_DO_LINK: Record<string, string> = {
  'email-trocado': 'E-mail trocado. Ele já vale para entrar e para os pedidos.',
  'falta-o-outro-email': 'Falta confirmar no outro e-mail: a troca vale depois dos dois links.',
  'link-invalido': 'Esse link venceu ou já foi usado. Se ainda quiser trocar, peça de novo.',
}

type Props = { searchParams: Promise<{ aviso?: string | string[] }> }

export default async function PaginaDoAcesso({ searchParams }: Props) {
  const { aviso } = await searchParams
  const conhecido = typeof aviso === 'string' && Object.hasOwn(AVISOS_DO_LINK, aviso) ? aviso : null
  // sem sessao (o link aberto noutro navegador), o aviso ja conferido vai no
  // volta: ela entra e o encontra aqui
  const usuario = await exigirUsuario(conhecido ? `${ACESSO}?aviso=${conhecido}` : ACESSO)
  const dados = await lerDadosDoPainel(usuario.id)
  const nonce = (await headers()).get('x-nonce') ?? ''
  const avisoDoLink = conhecido ? AVISOS_DO_LINK[conhecido] : null

  return (
    <PainelDaConta atual="acesso" usuario={usuario} dados={dados}>
      <CabecaDaConta titulo="E-mail e senha" frase="bem guardados" />
      {avisoDoLink ? (
        <p className="painel__aviso" role="status">
          {avisoDoLink}
        </p>
      ) : null}
      <div className="trocas">
        <section aria-labelledby="trocar-email">
          <h2 id="trocar-email" className="painel__subtitulo">
            Trocar o e-mail
          </h2>
          <FormEmail email={usuario.email} />
        </section>
        <section aria-labelledby="trocar-senha">
          <h2 id="trocar-senha" className="painel__subtitulo">
            Trocar a senha
          </h2>
          <FormSenha chave={variavel('NEXT_PUBLIC_TURNSTILE_SITE_KEY')} nonce={nonce} />
        </section>
      </div>
    </PainelDaConta>
  )
}
