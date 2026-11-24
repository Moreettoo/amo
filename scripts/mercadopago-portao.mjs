// O portao dos scripts do Mercado Pago (o roteiro na conta de teste e a prova
// sem dinheiro na producao). O tipo da conta vem da resposta de
// GET https://api.mercadopago.com/users/me, nunca do prefixo da credencial
// (contrato, secao 5: teste e producao comecam com APP_USR-). Na duvida, os
// dois recusam.

/** @param {unknown} v */
const tagsDe = (v) => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  const u = /** @type {Record<string, unknown>} */ (v)
  return u.site_id === 'MLB' && Array.isArray(u.tags) ? u.tags : null
}

/**
 * Conta de teste do Mercado Pago no Brasil: o roteiro de teste so segue com ela.
 * @param {unknown} usuario a resposta de GET /users/me
 * @returns {boolean}
 */
export function contaDeTeste(usuario) {
  const tags = tagsDe(usuario)
  return tags !== null && tags.includes('test_user')
}

/**
 * Conta real do Mercado Pago no Brasil: a prova de producao so segue com ela.
 * @param {unknown} usuario a resposta de GET /users/me
 * @returns {boolean}
 */
export function contaReal(usuario) {
  const tags = tagsDe(usuario)
  return tags !== null && !tags.includes('test_user')
}
