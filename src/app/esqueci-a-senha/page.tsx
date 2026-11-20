import type { Metadata } from 'next'
import { FormEsqueci } from '@/components/conta/FormEsqueci'
import { TelaConta, lerDadosDaTela } from '@/components/conta/TelaConta'

export const metadata: Metadata = { title: 'Esqueci a senha · AMO', robots: { index: false } }

export default async function PaginaEsqueci() {
  const { gaveta, linhas, nonce, chaveDoTurnstile } = await lerDadosDaTela()
  return (
    <TelaConta gaveta={gaveta} linhas={linhas} titulo="Vamos criar" frase="uma senha nova">
      <FormEsqueci chaveDoTurnstile={chaveDoTurnstile} nonce={nonce} />
      <p className="conta__nota conta__nota--fim">
        <a href="/entrar">Voltar para entrar</a>
      </p>
    </TelaConta>
  )
}
