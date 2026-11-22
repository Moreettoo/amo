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

/**
 * Os destinos do Card Payment Brick (contrato do Mercado Pago, 6), observados
 * no js/v2: nao ha lista oficial. Com 'strict-dynamic' o que o script com
 * nonce carrega ja e aceito; a lista serve aos navegadores sem ele. Os
 * frames mercadopago.com e mercadopago.com.br, e os subdominios deles, cobrem
 * o desafio do banco (3DS) em qualquer host do Mercado Pago que o servidor
 * aceite (urlDoDesafio, em src/lib/mercadopago/cliente.ts).
 */
const DO_MERCADO_PAGO = {
  script: ' https://sdk.mercadopago.com https://http2.mlstatic.com',
  connect: ' https://api.mercadopago.com https://api-static.mercadopago.com https://api.mercadolibre.com https://http2.mlstatic.com',
  frame: ' https://secure-fields.mercadopago.com https://mercadopago.com https://*.mercadopago.com https://mercadopago.com.br https://*.mercadopago.com.br',
  img: ' https://http2.mlstatic.com',
}

/** comMercadoPago: so a sacola, onde o Brick do cartao carrega (proxy.ts). */
export function montarPolitica(nonce: string, desenvolvimento: boolean, comMercadoPago = false): string {
  const mp = (destinos: keyof typeof DO_MERCADO_PAGO) => (comMercadoPago ? DO_MERCADO_PAGO[destinos] : '')
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${HASH_DO_SCRIPT_DO_TOPO}${desenvolvimento ? " 'unsafe-eval'" : ''}${mp('script')}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data:${mp('img')}`,
    "font-src 'self'",
    `connect-src 'self'${mp('connect')}`,
    `frame-src https://challenges.cloudflare.com${mp('frame')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}
