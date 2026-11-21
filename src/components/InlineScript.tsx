import { InlineScriptCliente } from './InlineScriptCliente'

/**
 * Script que roda durante o parse do HTML, antes da primeira pintura.
 *
 * Padrao do guia do proprio Next 16
 * (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md):
 * `suppressHydrationWarning` para a hidratacao nao reclamar do script. Em
 * navegacao de cliente ele nao roda de novo, e nao precisa: a classe ja esta
 * no <html>. A criacao dele no cliente (o "nao encontrado" que chega depois
 * da resposta comecar) e tratada em InlineScriptCliente.
 */
export function InlineScript({ html }: { html: string }) {
  return <InlineScriptCliente html={html} />
}

// o script que o layout poe aqui mora num modulo so de constante, que a politica de seguranca tambem le
export { MARCAR_JS } from '@/lib/script-do-topo'
