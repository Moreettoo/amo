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
