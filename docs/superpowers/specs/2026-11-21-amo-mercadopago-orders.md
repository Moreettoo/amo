# AMO · O contrato do Mercado Pago (API de Orders)

**Data:** 2026-11-21. Lido na documentação oficial (mercadopago.com.br/developers,
em inglês) e, onde ela cala, no código dos SDKs oficiais. É a referência da
etapa 3 (`docs/superpowers/plans/2026-11-21-amo-etapa-3-servidor.md` e o
plano da tela que vem depois dele) e
completa a §10 de `2026-11-18-amo-backend-design.md`, que deixou para a etapa
3 o reenvio da chave de idempotência e os domínios da CSP.

Fontes principais (prefixo `https://www.mercadopago.com.br/developers/en`):
`/reference/online-payments/checkout-api/create-order/post`, `.../get-order/get`,
`.../cancel-order/post`, `.../refund-order/post`,
`/docs/checkout-api-orders/payment-integration/websites/pix`,
`.../websites/cards`, `/docs/checkout-api-orders/payment-management/integrate-3ds`,
`.../status/order-status`, `.../status/transaction-status`,
`.../integration-errors/api`, `/docs/checkout-api-orders/notifications`,
`/docs/checkout-api-orders/resources/credentials`, `.../resources/test-cards`,
`/docs/checkout-api-orders/integration-test/pix`, e, para o botão de fora do
Brick, `/docs/checkout-bricks/card-payment-brick/visual-customizations/hide-element`
e `/docs/checkout-bricks/card-payment-brick/advanced-features/additional-data`.

## 1. Chamadas

Base `https://api.mercadopago.com`. Todo `POST` leva `Authorization: Bearer
<MERCADOPAGO_ACCESS_TOKEN>`, `Content-Type: application/json` e
`X-Idempotency-Key` (obrigatória, 1 a 128 caracteres). O `GET` leva só o
`Authorization`.

| Para quê | Chamada | Chave de idempotência (decisão da AMO) |
| --- | --- | --- |
| criar o pedido (Pix ou cartão) | `POST /v1/orders` | o `id` da tentativa (`pagamentos.id`) |
| ler o pedido | `GET /v1/orders/{id}` | não tem |
| cancelar | `POST /v1/orders/{id}/cancel`, sem corpo | `<id da tentativa>-cancelar` |
| estornar tudo | `POST /v1/orders/{id}/refund`, sem corpo | `<id da tentativa>-estornar` |

### 1.1 Criar, Pix

```json
{
  "type": "online",
  "processing_mode": "automatic",
  "total_amount": "92.80",
  "external_reference": "<id da tentativa>",
  "payer": { "email": "<e-mail da conta>" },
  "transactions": {
    "payments": [
      { "amount": "92.80", "payment_method": { "id": "pix", "type": "bank_transfer" }, "expiration_time": "PT30M" }
    ]
  }
}
```

- `total_amount` e `amount` são texto com duas casas, iguais (senão 400
  `invalid_total_amount`). Saem de `pedidos.total_centavos`: `(centavos / 100).toFixed(2)`.
- `external_reference`: até 64 caracteres, só letras, números, `-` e `_`. O
  UUID da tentativa cabe (36).
- Pix pede só o e-mail; CPF não. `expiration_time` no pagamento, em ISO 8601:
  mínimo 30 min (`PT30M`). Nunca o `expiration_time` do pedido (é do modo manual).
- Resposta (201): `id` (`ORD...`), `status` `action_required`,
  `status_detail` `waiting_transfer`; em `transactions.payments[0]`: `id`
  (`PAY...`), `status`, `status_detail`, `date_of_expiration` e, em
  `payment_method`, `qr_code` (copia e cola), `qr_code_base64` (PNG) e
  `ticket_url`.
- A criação pode voltar `processing` ainda sem o QR: ele chega depois, pelo
  `GET` ou pelo aviso.
- Um Pix não pago só expira do lado do Mercado Pago 30 dias depois do prazo; a
  documentação recomenda cancelar. A AMO cancela no Mercado Pago a tentativa
  que terminou do nosso lado (expirada ou trocada) e que ele ainda dá como
  pendente (reconciliação e troca de tentativa).

### 1.2 Criar, cartão

```json
{
  "type": "online",
  "processing_mode": "automatic",
  "total_amount": "92.80",
  "external_reference": "<id da tentativa>",
  "payer": { "email": "<e-mail da conta>", "identification": { "type": "CPF", "number": "<se o Brick pediu>" } },
  "transactions": {
    "payments": [
      { "amount": "92.80", "payment_method": { "id": "master", "type": "credit_card", "token": "<token do Brick>", "installments": 1 } }
    ]
  },
  "config": { "online": { "transaction_security": { "validation": "on_fraud_risk", "liability_shift": "required" } } }
}
```

- `payment_method.id` é a bandeira (`formData.payment_method_id` do Brick);
  `type` é `credit_card` ou `debit_card` (`additionalData.paymentTypeId`, do
  `getAdditionalData()`, §6); `token` tem 32 ou 33 caracteres, vale uma vez;
  `installments` inteiro.
- O Mercado Pago **não devolve os 4 últimos dígitos**. Eles vêm do Brick
  (`additionalData.lastFourDigits`, do `getAdditionalData()`), conferidos
  como 4 dígitos.
- HTTP 402: o pedido foi criado e a transação falhou; o corpo traz o pedido.
- **3DS** (com o `config` acima, pedido só quando há risco): o pedido volta
  `action_required` / `pending_challenge`, com a URL do desafio em
  `transactions.payments[0].payment_method.transaction_security.url`. A página
  mostra a URL num `iframe`; a cliente tem 40 min; o `postMessage`
  `{ status: "COMPLETE" }` do iframe não é o resultado: o resultado vem pelo
  `GET` ou pelo aviso (`processed`/`accredited`, `failed`/`cc_rejected_3ds_challenge`
  ou `canceled`/`expired`).
- A URL do desafio só vem na criação: o banco da AMO não a guarda, e a
  situação lida depois (`situacaoDoPedido`) não a traz. A tela a guarda na
  memória e mantém o `iframe` até o resultado (aprovado, a tentativa acabada
  ou o pedido cancelado); a resposta ainda pendente não o tira. A espera do
  desafio pergunta por até 40 min; a do Pix, 30.

## 2. Estados e a tradução para os da AMO (backend §10.3)

O servidor lê `status` e `status_detail` do primeiro pagamento
(`transactions.payments[0]`) e, sem ele, os do pedido.

| Mercado Pago | AMO | `recusa` |
| --- | --- | --- |
| `processed` + `accredited` | `aprovado` | |
| `created`; `action_required` (`waiting_transfer`, `waiting_payment`, `pending_challenge`, `waiting_capture`, `waiting_retry`); `processing` (`in_process`, `pending_review_manual`, `in_review`); `in_review` | `pendente` | |
| `failed` + qualquer detalhe, menos `expired` | `recusado` | o `status_detail` (ex.: `insufficient_amount`, `high_risk`, `rejected_by_issuer`) |
| `canceled` + `canceled` ou `canceled_transaction` | `cancelado` | |
| `canceled` ou `failed` + `expired`; pagamento `expired` | `expirado` | |
| `refunded` + `refunded`; `processed` + `refunded` (resposta do estorno) | `estornado` | |
| `charged_back` (qualquer detalhe) | `contestado` | |
| `processed` + `partially_refunded` | `aprovado` (a AMO não faz estorno parcial; fica registrado no detalhe) | |
| qualquer outro | erro de tradução: o servidor não aplica nada e registra a falha | |

O desfecho de uma contestação (`settled`, `reimbursed`) é contraditório na
documentação; o pagamento fica `contestado` e a equipe resolve no painel.

## 3. Idempotência e erros

- Mesma chave com corpo diferente: 409 `idempotency_key_already_used`. Mesma
  chave enquanto a primeira chamada roda: 423 `resource_locked`. 500
  `idempotency_validation_failed`: reenviar com chave nova. Mesma chave com o
  mesmo corpo: **não documentado**. A AMO não reenvia a criação: se ela falha
  ou demora (6 s), a tentativa fica pendente sem `ORD`, a tela diz "não deu
  certo agora", e a reconciliação a cancela depois de 10 minutos. Se o
  Mercado Pago a tiver criado e ela for paga, o aviso chega pelo
  `external_reference` e vale a §10.3.
- Cancelar: 409 `order_already_canceled` vale como cancelado; 409
  `cannot_cancel_order` quer dizer que ela andou (pode ter sido paga): o
  servidor lê o pedido e aplica.
- Estornar: 409 `order_already_refunded` vale como estornado;
  `order_refund_already_in_process` fica `a_estornar` para a próxima rodada.
- 401 `invalid_credentials`: credencial errada (ou de teste antiga, `TEST-`,
  que a API de Orders não aceita).
- O corpo de erro não tem formato documentado: o servidor guarda no log só o
  status HTTP e, quando houver, o código curto (por `registrarFalha`), nunca o
  corpo.

## 4. O aviso (`POST /api/webhooks/mercadopago`)

- Cadastrado só no painel da aplicação (não vai no pedido), com o evento
  "Order (Mercado Pago)" e, para contestação, "Chargebacks". Salvar gera a
  assinatura secreta (`MERCADOPAGO_WEBHOOK_SECRET`).
- Chega como `POST <url>?data.id=ORD...&type=order` (ou
  `type=topic_chargebacks_wh`), com os cabeçalhos `x-signature: ts=<ts>,v1=<hex>`
  e `x-request-id`.
- Assinatura: o texto `id:<data.id da URL, em minúsculas>;request-id:<x-request-id>;ts:<ts>;`
  (parte ausente sai inteira), HMAC-SHA256 em hexadecimal com a assinatura
  secreta, comparado em tempo constante. Os SDKs usam o `data.id` sem passar
  para minúsculas: a AMO aceita as duas formas. O `ts` vem às vezes em
  milissegundos, às vezes em segundos: entra no texto como veio.
- Responder 200 em menos de 22 s; sem isso, ele reenvia a cada 15 min.
- Do corpo, nada é usado: o servidor lê o pedido pelo `GET`.

## 5. Credenciais e testes

- As credenciais de teste (do painel, em "Teste", ou as de um usuário de
  teste) **também começam com `APP_USR-`**: o prefixo não diz se é teste ou
  produção, e a API não documenta como saber. Por isso a AMO declara o
  ambiente: `MERCADOPAGO_AMBIENTE=teste` no desenvolvimento; sem a variável,
  ou com outro valor, o servidor se comporta como produção (e recusa a
  cotação de exemplo, backend §13).
- Access token: `APP_USR-<números>-<6 números>-<32 hexadecimais>-<números>`.
  Chave pública: `APP_USR-<UUID>` (vai ao navegador por desenho).
- Cartões de teste (validade 11/30): Mastercard `5480 8328 0103 3311`, Visa
  `4235 6477 2802 5682` (CVV 123); o nome do titular decide: `APRO` aprova,
  `OTHE` recusa, `CONT` fica pendente; CPF `12345678909`. 3DS: `APRO-CHOK`
  mostra o desafio.
- Pix de teste: `payer.first_name: "APRO"` aprova sozinho depois de criado.
  Não há como simular a expiração.

## 6. O formulário do cartão (Card Payment Brick)

- Script `https://sdk.mercadopago.com/js/v2`, carregado com o nonce da página.
- `const mp = new MercadoPago(<chave pública>, { locale: 'pt-BR' })` e
  `mp.bricks().create('cardPayment', '<id do lugar>', { initialization: { amount: <reais> }, customization: { visual: { hidePaymentButton: true } }, callbacks: { onReady, onError } })`.
- Com `hidePaymentButton`, o botão de fora (o do resumo da sacola) chama
  `controller.getFormData()`, que resolve com o próprio `formData`, plano
  (`token`, `payment_method_id`, `issuer_id`, `installments`, `payer.email`,
  `payer.identification`), ou sem nada quando um campo está errado (o Brick
  marca o campo). Os dados adicionais **não** vêm nele: vêm de outra chamada,
  `controller.getAdditionalData()`, que devolve uma Promise e só pode ser
  chamada depois de `getFormData()` (com o botão do próprio Brick, eles chegam
  no segundo argumento do `onSubmit`). A página "Additional data" do Card
  Payment Brick documenta os campos `bin`, `lastFourDigits` e `cardholderName`:
  https://www.mercadopago.com.br/developers/en/docs/checkout-bricks/card-payment-brick/advanced-features/additional-data
- O tipo do cartão (o `payment_method.type` do §1.2) vem de
  `additionalData.paymentTypeId`. Esse campo vem do exemplo da API de Orders
  para cartões, que preenche `type: additionalData.paymentTypeId`
  (https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/websites/cards),
  e não está na tabela de dados adicionais: o ensaio com a chave de teste
  confirma o campo (`supabase/README.md`, "O que é do dono"). A AMO aceita só
  `credit_card` e `debit_card`, e o final vem de `lastFourDigits` (4 dígitos).
  Sem o token, sem um desses tipos ou sem o final, a tela diz
  `cartao_ilegivel` ("Confira os dados do cartão.") e nada sai: o pedido não
  fecha e nada é cobrado. Nunca um `tipo` ou um `final` vazio.
- Ao sair da etapa, `controller.unmount()`.
- **CSP**: não há lista oficial. Observada no `js/v2` (v2.83.7):
  `script-src https://sdk.mercadopago.com https://http2.mlstatic.com`;
  `connect-src https://api.mercadopago.com https://api-static.mercadopago.com https://api.mercadolibre.com https://http2.mlstatic.com`;
  `frame-src https://secure-fields.mercadopago.com https://www.mercadopago.com.br` (o
  segundo para o 3DS); `img-src https://http2.mlstatic.com`. Com
  `'strict-dynamic'`, o que o script com nonce carrega é aceito; a lista de
  domínios serve aos navegadores sem `'strict-dynamic'`. Para o desafio, a
  política da AMO aceita no `frame-src` os hosts que o servidor aceita na URL
  dele: `mercadopago.com`, `mercadopago.com.br` e os subdomínios dos dois.
  Conferir no console, com a chave pública de teste, antes de ir ao ar: é o
  portão do ensaio do cartão (`supabase/README.md`, "O que é do dono").
