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

/**
 * A classe `js` e o portao de todo estado inicial escondido
 * (src/app/estilos/movimento.css). Sem JavaScript ela nao existe e a pagina
 * nasce no estado final, que e o que impede o hero em branco da v1.1.
 */
export const MARCAR_JS = "document.documentElement.classList.add('js')"
