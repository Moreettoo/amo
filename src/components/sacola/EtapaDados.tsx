'use client'

import { useId } from 'react'
import { PortaDaConta } from '@/components/conta/PortaDaConta'
import { mascararCelular } from '@/lib/pedido'
import type { DadosDaSacola } from './Fechamento'

type Props = {
  /** o id do formulario, que o botao do resumo envia pelo atributo form */
  id: string
  usuario: DadosDaSacola['usuario']
  porta: DadosDaSacola['porta']
  /** "Guardar este endereco em Minha conta": a escolha fica no fechamento, que a leva ao pedido */
  guardar: boolean
  aoMudarGuardar: (guardar: boolean) => void
  aoContinuar: () => void
}

/** Para onde a porta leva depois de entrar ou de confirmar o codigo. */
const VOLTA = '/sacola'

/**
 * A etapa 3. Logada: os dados da conta, com que o pedido sai (trocar e em
 * Minha conta), e a caixa de guardar o endereco da entrega. Deslogada: a
 * porta da conta, com os formularios de /entrar e /cadastro como sao; a acao
 * leva de volta a /sacola, e o progresso da aba devolve esta etapa. A porta
 * tem os proprios botoes, e o do resumo fica desligado ate ela entrar.
 */
export function EtapaDados({ id, usuario, porta, guardar, aoMudarGuardar, aoContinuar }: Props) {
  const caixa = useId()

  if (!usuario) {
    return (
      <div className="etapa__porta">
        <PortaDaConta aba="entrar" volta={VOLTA} chaveDoTurnstile={porta.chaveDoTurnstile} nonce={porta.nonce} />
      </div>
    )
  }

  return (
    <form
      id={id}
      className="dados"
      onSubmit={(e) => {
        e.preventDefault()
        aoContinuar()
      }}
    >
      <dl className="dados__conta">
        <div className="dados__item">
          <dt>Nome</dt>
          <dd>{usuario.nome}</dd>
        </div>
        <div className="dados__item">
          <dt>Celular (WhatsApp)</dt>
          <dd>{mascararCelular(usuario.celular)}</dd>
        </div>
        <div className="dados__item dados__item--largo">
          <dt>E-mail</dt>
          <dd>{usuario.email}</dd>
        </div>
      </dl>
      <a className="etapa__alterar dados__trocar" href="/conta/perfil">
        Trocar em Minha conta
      </a>
      <div className="marcar dados__guardar">
        <input id={caixa} type="checkbox" checked={guardar} onChange={(e) => aoMudarGuardar(e.target.checked)} />
        <span className="marcar__visto" aria-hidden="true" />
        <label htmlFor={caixa}>Guardar este endereço em Minha conta</label>
      </div>
    </form>
  )
}
