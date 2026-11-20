import type { Metadata } from 'next'
import { TelaConta, lerDadosDaTela } from '@/components/conta/TelaConta'

export const metadata: Metadata = { title: 'Conta excluída · AMO', robots: { index: false } }

/** Para onde excluirConta leva depois de apagar a conta e a sessao. */
export default async function PaginaExcluida() {
  const { gaveta, linhas } = await lerDadosDaTela()
  return (
    <TelaConta gaveta={gaveta} linhas={linhas} titulo="Excluir" frase="sua conta">
      <div className="conta__fim">
        <p className="conta__texto">Sua conta foi excluída.</p>
        <a className="btn-retro btn-retro--escuro conta__enviar" href="/">
          Voltar para a página inicial
        </a>
      </div>
    </TelaConta>
  )
}
