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
  | 'cartao_ilegivel'
  | 'agora_indisponivel'
  | 'faixa_indisponivel'

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
  tentativas_esgotadas: 'Foram muitas tentativas de pagamento neste pedido. Calcule a entrega de novo para fazer outro pedido.',
  pagamento_indisponivel: 'O pagamento não respondeu agora. Tente de novo em instantes.',
  pagamento_recusado: 'O pagamento foi recusado. Confira os dados ou use outro cartão.',
  // o Brick nao devolveu o cartao (campo faltando ou errado): ele marca os campos, e a etapa diz isto
  cartao_ilegivel: 'Confira os dados do cartão.',
  agora_indisponivel: 'O Uber não chega antes de a cozinha fechar. Agende a entrega.',
  faixa_indisponivel: 'Essa faixa não está mais disponível. Escolha outra.',
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

export type EstadoDoPedido = 'aguardando_pagamento' | 'pago' | 'em_preparo' | 'a_caminho' | 'entregue' | 'cancelado'

export type PagamentoNaTela = {
  forma: 'pix' | 'cartao'
  estado: string
  recusa: string | null
  pix: { copiaECola: string; qrBase64: string; expiraEm: string | null } | null
  desafioUrl: string | null
}

export type SituacaoDoPedido = { numero: string; estado: EstadoDoPedido; pagamento: PagamentoNaTela | null }

export type RespostaDoPagamento = { ok: true; situacao: SituacaoDoPedido } | { ok: false; erro: CodigoDoFechamento }

const RECUSAS: Record<string, string> = {
  insufficient_amount: 'O cartão não tem limite para este valor.',
  card_insufficient_amount: 'O cartão não tem limite para este valor.',
  bad_filled_card_data: 'Confira os dados do cartão.',
  rejected_by_issuer: 'O banco do cartão recusou. Fale com ele ou use outro cartão.',
  required_call_for_authorize: 'O banco do cartão recusou. Fale com ele ou use outro cartão.',
  high_risk: 'O pagamento foi recusado por segurança. Tente outro cartão.',
  cc_rejected_3ds_challenge: 'A confirmação do banco não foi concluída. Tente de novo.',
  '3ds_challenge_expired': 'A confirmação do banco não foi concluída. Tente de novo.',
  max_attempts_exceeded: 'Foram muitas tentativas com este cartão. Use outro.',
  card_disabled: 'Este cartão está desativado. Use outro.',
  invalid_installments: 'Escolha outro número de parcelas.',
}

/** O texto da recusa do cartao para a tela; codigo desconhecido ou ausente cai no texto geral. */
export function mensagemDaRecusa(recusa: string | null): string {
  return (recusa !== null && Object.hasOwn(RECUSAS, recusa) ? RECUSAS[recusa] : null) ?? MENSAGENS_DO_FECHAMENTO.pagamento_recusado
}

/**
 * O texto do comentario antes da conferencia, no navegador e na acao: a quebra
 * de linha do Windows (CRLF) vira a de todo lugar (LF) e a tabulacao vira
 * espaco. O banco recusa os dois como controle.
 */
export function normalizarComentario(texto: string): string {
  return texto.replace(/\r\n/g, '\n').replace(/\t/g, ' ')
}

/** As frases do comentario da pagina de produto. */
export const TEXTOS_DO_COMENTARIO = {
  sem_sessao: 'Entre na sua conta para comentar.',
  comentario_nao_permitido: 'Só quem já recebeu este sabor pode comentar.',
} as const
