'use client'

import { useSyncExternalStore } from 'react'

const semAssinatura = () => () => {}

/**
 * O <script> do layout, sem o aviso "Encountered a script tag" do React.
 *
 * A pagina de "nao encontrado" de uma rota que ja comecou a responder chega
 * ao navegador como arvore do servidor e e criada la, layout incluso. Um
 * <script> criado no cliente avisa no console de desenvolvimento e nao roda de
 * qualquer jeito. Na hidratacao o React usa o instantaneo do servidor (o
 * script, igual ao HTML) e depois o do cliente (nada): o script so existe no
 * HTML do servidor, que e onde ele roda.
 */
export function InlineScriptCliente({ html }: { html: string }) {
  const noServidor = useSyncExternalStore(
    semAssinatura,
    () => false,
    () => true,
  )
  if (!noServidor) return null
  return <script type="text/javascript" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
}
