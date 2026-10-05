/**
 * Script que roda durante o parse do HTML, antes da primeira pintura.
 *
 * Padrao do guia do proprio Next 16
 * (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md):
 * `text/javascript` no servidor, `text/plain` no cliente, e
 * `suppressHydrationWarning` para a diferenca de `type` nao virar erro de
 * hidratacao. Em navegacao de cliente o script nao roda de novo, e nao
 * precisa: a classe ja esta no <html>.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * A classe `js` e o portao de todo estado inicial escondido
 * (src/app/estilos/movimento.css). Sem JavaScript ela nao existe e a pagina
 * nasce no estado final, que e o que impede o hero em branco da v1.1.
 */
export const MARCAR_JS = "document.documentElement.classList.add('js')"
