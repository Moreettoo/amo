'use client'

import { useActionState } from 'react'
import { excluirConta } from '@/lib/auth/acoes'
import { MENSAGENS_DA_CONTA } from '@/lib/conta/mensagens'
import { CampoSenha, Enviar, ErroGeral, Marcar, erroDe } from '@/components/conta/pecas'
import { Turnstile } from '@/components/conta/Turnstile'

/** Excluir a conta: o que some e o que fica, a senha de novo e a confirmacao. */
export function FormExcluir({ podeExcluir, chaveDoTurnstile, nonce }: { podeExcluir: boolean; chaveDoTurnstile: string; nonce: string }) {
  const [resposta, agir, enviando] = useActionState(excluirConta, null)

  if (resposta?.ok && resposta.aviso === 'conta_excluida') {
    return (
      <div className="conta__fim" role="status">
        <p className="conta__texto">Sua conta foi excluída.</p>
        <a className="btn-retro btn-retro--escuro conta__enviar" href="/">
          Voltar para a página inicial
        </a>
      </div>
    )
  }
  if (!podeExcluir) {
    return (
      <div className="conta__fim">
        <p className="conta__texto">{MENSAGENS_DA_CONTA.pedido_em_aberto}</p>
        <p className="conta__nota">
          <a href="/conta/pedidos">Ver os pedidos</a>
        </p>
      </div>
    )
  }
  return (
    <form action={agir} className="porta__form" noValidate>
      <p className="conta__texto">
        Somem o seu perfil, os endereços e os comentários. Os pedidos ficam, sem o seu nome, celular, e-mail e endereço: só os potes e os valores.
      </p>
      <CampoSenha rotulo="Senha" name="senha" autoComplete="current-password" erro={erroDe(resposta, 'senha')} />
      <Marcar nome="confirmo" erro={erroDe(resposta, 'confirmo')}>
        Entendo que a conta não volta depois de excluída.
      </Marcar>
      <Turnstile chave={chaveDoTurnstile} nonce={nonce} reiniciar={resposta} />
      <ErroGeral resposta={resposta} />
      <Enviar enviando={enviando} rotulo="Excluir minha conta" rotuloEnviando="Excluindo a conta" />
    </form>
  )
}
