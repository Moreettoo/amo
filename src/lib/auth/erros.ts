import 'server-only'

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

export function traduzirErroDoAuth(erro: ErroDoAuth): CodigoDaConta {
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

/** Erro 4xx que nao e CAPTCHA nem limite: nao diz nada sobre a conta existir. */
export function erroQueNaoRevelaNada(erro: ErroDoAuth): boolean {
  const codigo = traduzirErroDoAuth(erro)
  const status = erro?.status ?? 0
  return status >= 400 && status < 500 && codigo !== 'captcha' && codigo !== 'muitas_tentativas'
}
