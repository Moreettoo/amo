'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { situacaoDoPedido } from '@/app/sacola/acoes'
import type { SituacaoDoPedido } from '@/lib/fechamento/tipos'
import { ESPERA_DO_PIX_MS, mesmaSituacao, PAUSA_NO_LIMITE_MS, proximaEspera, terminou } from './espera'

type Props = {
  numero: string
  /** a situacao de onde a espera parte; uma situacao nova (um codigo novo) recomeca o ritmo */
  inicial: SituacaoDoPedido
  /** a situacao mudou: o codigo chegou, o pagamento foi aprovado, o codigo venceu */
  aoMudar: (s: SituacaoDoPedido) => void
  /** o texto de quando a espera para, se a pagina que a mostra ja e a do pedido (sem o link para ela mesma) */
  textoAoParar?: string
  /** ate quando pergunta sozinha, em ms: 30 min no Pix (o padrao), 40 min no desafio do banco */
  ate?: number
}

type Resposta = Awaited<ReturnType<typeof situacaoDoPedido>>

/**
 * A espera do pagamento: pergunta ao servidor (situacaoDoPedido) no ritmo de
 * proximaEspera ate o pedido sair de aguardando_pagamento ou a tentativa
 * acabar. Com a aba escondida nao pergunta; ao voltar, pergunta uma vez e
 * retoma o ritmo. Erro de rede, ou resposta de erro, nao muda o que a tela
 * mostra; depois de muitas_tentativas, a proxima pergunta espera 60 s. Nada
 * gira: a espera e dita em texto.
 */
export function EsperaDoPagamento({ numero, inicial, aoMudar, textoAoParar, ate = ESPERA_DO_PIX_MS }: Props) {
  // a situacao com que o ritmo acabou (30 min sem mudanca, ou o ate dado); outra inicial recomeca
  const [parouEm, setParouEm] = useState<SituacaoDoPedido | null>(null)
  const avisar = useEffectEvent((s: SituacaoDoPedido) => aoMudar(s))

  useEffect(() => {
    if (terminou(inicial)) return
    const desde = Date.now()
    let ultima = inicial
    let viva = true
    let perguntando = false
    let relogio: ReturnType<typeof setTimeout> | undefined
    const escondida = () => document.visibilityState === 'hidden'

    /** Marca a proxima pergunta (no ritmo, ou depois da pausa dada); false quando o ritmo acabou. */
    const agendar = (pausa?: number): boolean => {
      clearTimeout(relogio)
      if (!viva || escondida()) return true
      const ms = proximaEspera(desde, Date.now(), ate)
      if (ms === null) return false
      relogio = setTimeout(perguntar, pausa ?? ms)
      return true
    }

    async function perguntar() {
      if (perguntando) return
      perguntando = true
      let r: Resposta | null
      try {
        r = await situacaoDoPedido({ numero })
      } catch {
        // a rede caiu: a tela fica como estava e a proxima pergunta vem no ritmo
        r = null
      }
      perguntando = false
      if (!viva) return
      if (r?.ok) {
        if (!mesmaSituacao(ultima, r.situacao)) {
          ultima = r.situacao
          avisar(r.situacao)
        }
        if (terminou(r.situacao)) return
      }
      // o limite de perguntas da hora: a proxima espera, e a tela fica como estava
      const pausa = r !== null && !r.ok && r.erro === 'muitas_tentativas' ? PAUSA_NO_LIMITE_MS : undefined
      if (!agendar(pausa)) setParouEm(inicial)
    }

    const aoTrocarDeAba = () => {
      clearTimeout(relogio)
      if (!escondida()) void perguntar()
    }

    document.addEventListener('visibilitychange', aoTrocarDeAba)
    agendar()
    return () => {
      viva = false
      clearTimeout(relogio)
      document.removeEventListener('visibilitychange', aoTrocarDeAba)
    }
  }, [numero, inicial, ate])

  if (terminou(inicial)) return null
  return (
    <p className="espera" aria-live="polite">
      {parouEm === inicial ? (
        (textoAoParar ?? (
          <>
            Paramos de conferir sozinhos. Se você já pagou, veja o pedido em <a href={`/conta/pedidos/${numero}`}>Minha conta</a>.
          </>
        ))
      ) : (
        'Assim que o pagamento for confirmado, esta página avisa sozinha.'
      )}
    </p>
  )
}
