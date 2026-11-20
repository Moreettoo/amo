/**
 * As rotas que mostram ou recebem dado pessoal (spec do backend, 11): nelas o
 * proxy.ts manda a politica com nonce e renova a sessao. Sem alias "@": o
 * next.config.ts importa este arquivo.
 */
export const ROTAS_COM_NONCE = ['/sacola', '/conta', '/entrar', '/cadastro', '/esqueci-a-senha', '/auth'] as const

/** A fonte da regra de cabecalhos do next.config.ts: toda rota, menos essas e o que esta abaixo delas. */
export const FONTE_SEM_NONCE = `/((?!(?:${ROTAS_COM_NONCE.map((r) => r.slice(1)).join('|')})(?:/|$)).*)`
