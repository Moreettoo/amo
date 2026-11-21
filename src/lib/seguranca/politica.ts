import { createHash } from 'node:crypto'
import { MARCAR_JS } from '../script-do-topo'

/**
 * A politica de seguranca das paginas com dado pessoal (spec da autenticacao,
 * 6). O script do topo entra pelo hash: o layout e o mesmo das paginas
 * estaticas e nao pode ler o nonce sem deixar o site inteiro dinamico. O
 * proxy importa este arquivo: o script vem de um modulo so de constante, e
 * nao do componente que o poe na pagina.
 */
export const HASH_DO_SCRIPT_DO_TOPO = `'sha256-${createHash('sha256').update(MARCAR_JS).digest('base64')}'`

export function montarPolitica(nonce: string, desenvolvimento: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${HASH_DO_SCRIPT_DO_TOPO}${desenvolvimento ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    'frame-src https://challenges.cloudflare.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}
