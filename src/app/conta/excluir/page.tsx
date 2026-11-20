import type { Metadata } from 'next'
import { FormExcluir } from '@/components/conta/FormExcluir'
import { TelaConta, lerDadosDaTela } from '@/components/conta/TelaConta'
import { exigirUsuario } from '@/lib/auth'
import { criarClienteServidor } from '@/lib/auth/servidor'

export const metadata: Metadata = { title: 'Excluir a conta · AMO', robots: { index: false } }

export default async function PaginaExcluir() {
  await exigirUsuario('/conta/excluir')
  const { data, error } = await (await criarClienteServidor()).rpc('pode_excluir_conta')
  // na duvida, mostra o formulario: a acao confere de novo antes de apagar
  const podeExcluir = error ? true : data?.[0]?.pode !== false
  const { gaveta, linhas, nonce, chaveDoTurnstile } = await lerDadosDaTela()
  return (
    <TelaConta gaveta={gaveta} linhas={linhas} titulo="Excluir" frase="sua conta">
      <FormExcluir podeExcluir={podeExcluir} chaveDoTurnstile={chaveDoTurnstile} nonce={nonce} />
    </TelaConta>
  )
}
