import 'server-only'
import { registrarFalha } from '@/lib/dados/erros'

/**
 * O que a tela da conta pode ouvir. A mensagem crua do Supabase nunca passa:
 * cada erro vira um destes codigos, e a tela mostra o texto da spec (4.1).
 */
export type CodigoDaConta =
  | 'campos_invalidos'
  | 'muitas_tentativas'
  | 'credenciais'
  | 'codigo_invalido'
  | 'senha_fraca'
  | 'senha_vazada'
  | 'senha_igual'
  | 'captcha'
  | 'pedido_em_aberto'
  | 'tente_de_novo'

type ErroDoAuth = { code?: string; status?: number; reasons?: string[] } | null | undefined

/**
 * O codigo da tela para um erro do Auth; o erro vai ao log do servidor
 * (registrarFalha: o lugar, o codigo, o status e o nome). Uma chamada por
 * erro recebido, ate quando a tela o responde como sucesso.
 */
export function traduzirErroDoAuth(erro: ErroDoAuth, onde: string): CodigoDaConta {
  if (erro) registrarFalha(onde, erro)
  return codigoDoAuth(erro)
}

function codigoDoAuth(erro: ErroDoAuth): CodigoDaConta {
  switch (erro?.code) {
    case 'invalid_credentials':
      return 'credenciais'
    case 'otp_expired':
      return 'codigo_invalido'
    case 'weak_password':
      return erro.reasons?.includes('pwned') ? 'senha_vazada' : 'senha_fraca'
    case 'same_password':
      return 'senha_igual'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'muitas_tentativas'
    case 'captcha_failed':
      return 'captcha'
    case 'email_address_invalid':
    case 'validation_failed':
      return 'campos_invalidos'
    default:
      return 'tente_de_novo'
  }
}

/**
 * O limite de envio de e-mail do Supabase so dispara quando um e-mail sairia:
 * na recuperacao, so para conta que existe; no cadastro, so para conta nova.
 * Mostra-lo diria se a conta existe, entao quem deve a mesma resposta com e
 * sem conta (spec 4.1) o trata como sucesso. O limite por IP vale para todos
 * e continua aparecendo.
 */
export const limiteDeEmailDoSupabase = (erro: ErroDoAuth): boolean => erro?.code === 'over_email_send_rate_limit'

/** Erro 4xx que nao e CAPTCHA nem limite por IP: nao diz nada sobre a conta existir. */
export function erroQueNaoRevelaNada(erro: ErroDoAuth): boolean {
  if (limiteDeEmailDoSupabase(erro)) return true
  const codigo = codigoDoAuth(erro)
  const status = erro?.status ?? 0
  return status >= 400 && status < 500 && codigo !== 'captcha' && codigo !== 'muitas_tentativas'
}
