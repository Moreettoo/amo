/**
 * Os codigos, os textos e os tipos do fechamento do pedido que a tela usa.
 * Puro: nenhum import do servidor, para a tela poder importar.
 */

export type CodigoDoFechamento =
  | 'campos_invalidos'
  | 'muitas_tentativas'
  | 'tente_de_novo'
  | 'cep_nao_encontrado'
  | 'fora_da_area'
  | 'entrega_indisponivel'
  | 'sem_sessao'
  | 'email_nao_confirmado'
  | 'loja_fechada'
  | 'produto_indisponivel'
  | 'cotacao_vencida'
  | 'muitos_pedidos'
  | 'total_mudou'
  | 'pedido_invalido'
  | 'tentativas_esgotadas'
  | 'pagamento_indisponivel'
  | 'pagamento_recusado'

export const MENSAGENS_DO_FECHAMENTO: Record<CodigoDoFechamento, string> = {
  campos_invalidos: 'Confira os campos marcados.',
  muitas_tentativas: 'Muitas tentativas. Espere um pouco e tente de novo.',
  tente_de_novo: 'Não deu certo agora. Tente de novo em instantes.',
  cep_nao_encontrado: 'Não achamos esse CEP. Confira os números.',
  fora_da_area: 'O Uber ainda não chega neste CEP. Hoje a entrega é só na Grande São Paulo.',
  entrega_indisponivel: 'A entrega ainda não está disponível. Tente de novo mais tarde.',
  sem_sessao: 'Entre na sua conta para continuar.',
  email_nao_confirmado: 'Confirme o seu e-mail com o código que enviamos para continuar.',
  loja_fechada: 'A cozinha está fechada agora, e o pedido não foi feito.',
  produto_indisponivel: 'Um dos sabores saiu do cardápio. Confira os potes.',
  cotacao_vencida: 'O valor da entrega venceu. Calcule de novo.',
  muitos_pedidos: 'Muitos pedidos em pouco tempo. Espere um pouco e tente de novo.',
  total_mudou: 'Os preços mudaram desde que você abriu a sacola. Confira o novo total.',
  pedido_invalido: 'Esse pedido não pode mais ser pago. Faça o pedido de novo.',
  tentativas_esgotadas: 'Foram muitas tentativas de pagamento neste pedido. Faça o pedido de novo.',
  pagamento_indisponivel: 'O pagamento não respondeu agora. Tente de novo em instantes.',
  pagamento_recusado: 'O pagamento foi recusado. Confira os dados ou use outro cartão.',
}

export type EnderecoDaCotacao = {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export type Cotacao = {
  id: string
  valorCentavos: number
  minutos: number
  expiraEm: string
  exemplo: boolean
  endereco: EnderecoDaCotacao
}

export type RespostaDaCotacao =
  | { ok: true; cotacao: Cotacao }
  | { ok: false; erro: CodigoDoFechamento; campos?: Partial<Record<'cep' | 'numero' | 'complemento', string>> }

export type ItemDoPedido = { produto: string; quantos: number }

export type RespostaDoPedido =
  | { ok: true; pedido: { numero: string; totalCentavos: number } }
  | { ok: false; erro: CodigoDoFechamento }
