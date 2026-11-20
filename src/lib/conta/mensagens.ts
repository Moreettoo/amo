import type { CodigoDaConta } from '@/lib/auth/erros'

/** O texto de cada erro da conta (spec da autenticacao, 4.1). Puro: o formulario no navegador le daqui. */
export const MENSAGENS_DA_CONTA: Record<CodigoDaConta, string> = {
  campos_invalidos: 'Confira os campos marcados.',
  muitas_tentativas: 'Muitas tentativas. Espere um pouco e tente de novo.',
  credenciais: 'E-mail ou senha não conferem.',
  codigo_invalido: 'Código inválido ou vencido. Peça outro.',
  senha_fraca: 'Escolha outra senha: esta é fácil de adivinhar.',
  senha_vazada: 'Escolha outra senha: esta já apareceu em vazamentos.',
  senha_igual: 'A senha nova precisa ser diferente da atual.',
  captcha: 'Não conseguimos confirmar que você não é um robô. Tente de novo.',
  pedido_em_aberto: 'Você tem um pedido em andamento. A conta pode ser excluída depois que ele for entregue ou cancelado.',
  tente_de_novo: 'Não deu certo agora. Tente de novo em instantes.',
}

/** O que as telas de Minha conta podem ouvir das acoes (src/app/conta/acoes.ts). */
export type CodigoDeErro =
  | 'campos_invalidos'
  | 'muitas_tentativas'
  | 'tente_de_novo'
  | 'limite_de_enderecos'
  | 'endereco_nao_encontrado'
  | 'pedido_invalido'
  | 'senha_atual_errada'
  | 'senha_fraca'
  | 'senha_vazada'
  | 'senha_igual'
  | 'captcha'

export const MENSAGENS: Record<CodigoDeErro, string> = {
  campos_invalidos: MENSAGENS_DA_CONTA.campos_invalidos,
  muitas_tentativas: MENSAGENS_DA_CONTA.muitas_tentativas,
  tente_de_novo: MENSAGENS_DA_CONTA.tente_de_novo,
  limite_de_enderecos: 'Você já tem 5 endereços guardados. Remova um para guardar outro.',
  endereco_nao_encontrado: 'Não encontramos esse endereço. Recarregue a página e tente de novo.',
  pedido_invalido: 'Não encontramos esse pedido, ou ele já não pode ser cancelado.',
  senha_atual_errada: 'A senha atual não confere.',
  senha_fraca: MENSAGENS_DA_CONTA.senha_fraca,
  senha_vazada: MENSAGENS_DA_CONTA.senha_vazada,
  senha_igual: MENSAGENS_DA_CONTA.senha_igual,
  captcha: MENSAGENS_DA_CONTA.captcha,
}

export type AvisoDaConta = 'salvo' | 'confira_os_dois_emails' | 'senha_trocada' | 'pedido_cancelado'

export const AVISOS: Record<AvisoDaConta, string> = {
  salvo: 'Salvo.',
  confira_os_dois_emails: 'Enviamos um link para o e-mail atual e outro para o novo. A troca vale depois que você confirmar nos dois.',
  senha_trocada: 'Senha trocada. As outras sessões foram encerradas.',
  pedido_cancelado: 'Pedido cancelado.',
}
