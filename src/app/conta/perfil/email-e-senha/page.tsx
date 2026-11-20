import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { FormEmail, FormSenha } from '@/components/conta/FormsDaConta'
import { CabecaDaConta, PainelDaConta, lerDadosDoPainel } from '@/components/conta/PainelDaConta'
import { exigirUsuario } from '@/lib/auth'
import { variavel } from '@/lib/dados/ambiente'

export const metadata: Metadata = { title: 'E-mail e senha · AMO', robots: { index: false } }

export default async function PaginaDoAcesso() {
  const usuario = await exigirUsuario('/conta/perfil/email-e-senha')
  const dados = await lerDadosDoPainel()
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <PainelDaConta atual="acesso" usuario={usuario} dados={dados}>
      <CabecaDaConta titulo="E-mail e senha" frase="bem guardados" />
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
