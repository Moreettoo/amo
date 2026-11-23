# AMO · Entrega pelo Uber Direct · Design Spec

**Data:** 2026-11-23
**Status:** aprovada pelo dono em 2026-11-23, depois da revisão de um
construtor (as respostas dele estão nas seções 5, 8 e 13).
**Anda junto com:** `2026-11-18-amo-backend-design.md` (a spec do back-end).
Esta spec troca, nela, a cotação de exemplo (§10.2), o "quem chama a corrida
é a equipe" (§10.1) e o não objetivo "chamar a corrida do Uber
automaticamente" (§2). Onde as duas divergirem sobre entrega, vale esta.
**Fonte da API:** a documentação oficial (developer.uber.com/docs/deliveries)
e o resumo em `docs/guia_t_cnico_e_arquitetural_completo_do_uber_direct.md`.
Onde o guia e a documentação divergirem, vale a documentação.

---

## 1. O pedido

Do dono, em 2026-11-23, com as chaves do Uber Direct em mãos: "fazer a parte
de frete corretamente". O frete deixa de ser de exemplo: a cliente vê o valor
real da Uber, paga esse valor, e a corrida é criada com ele.

Decisões dele nesta conversa:

- **Dois modos de entrega, escolhidos pela cliente na sacola.**
  - **Agora:** só fica ligado quando a loja está funcionando.
  - **Agendado:** pode ser escolhido a qualquer hora (madrugada, domingo),
    mas a entrega só pode ser marcada para quando a loja está aberta.
- **Os potes já ficam pré-prontos.** A cozinha não precisa de tempo de
  preparo: no "Agora", o entregador é chamado na hora.
- **Cliente ausente:** o entregador deixa o pote no local, com foto
  (`undeliverable_action: leave_at_door`). Não segue o padrão da Uber
  (`return`), que cobra a volta como outra corrida.
- **A corrida é criada assim que o pagamento é confirmado, nos dois modos**
  (caminho A, §4). Ninguém aperta botão.

E a regra que já valia (memória do projeto, 2026-11-22): **a AMO nunca paga o
frete da cliente.** O frete cotado é cobrado dela, e a corrida é criada com o
mesmo valor. Com um limite, decidido nesta conversa: **a cliente nunca paga
mais do que viu.** Se a cotação precisar ser refeita depois do pagamento e
subir, a AMO absorve a diferença e a corrida sai assim mesmo; nada é cobrado
de novo da cliente ("seria ruim para o usuário").

## 2. Objetivos, não objetivos e o que seria um fracasso

**Objetivos**

1. O valor da entrega que a cliente vê e paga é o da Uber para aquele
   endereço, aquele modo e aquela faixa.
2. Pagamento confirmado vira uma corrida na Uber, uma só, sem ninguém da
   equipe agir, e a corrida nunca se perde por uma falha de rede.
3. O pedido anda para "a caminho" e "entregue" pelo que a Uber diz.
4. Nenhuma corrida é marcada para um horário em que a loja está fechada.

**Não objetivos desta rodada**

- Painel da equipe. Problemas de entrega ficam registrados no banco e no log,
  e a equipe os vê pelo painel do Supabase (como hoje com estorno).
- Mensagens da AMO para a cliente (e-mail, WhatsApp). O link de rastreio
  aparece na página do pedido.
- Guardar a foto da entrega. Ela fica na Uber (30 dias pela API); a AMO não
  guarda imagem de porta de cliente.
- Gorjeta, entregas em lote, mais de uma cozinha, reembolso pela Uber
  (`event.refund_request`, só no suporte gerenciado por ela).
- A cliente cancelar um pedido já pago.

**Seria um fracasso, mesmo funcionando**

- Um entregador de verdade sair para um pagamento de teste, ou uma corrida de
  teste ser criada para um pagamento de verdade (§9).
- Duas corridas para o mesmo pedido.
- A cliente pagar um frete diferente do que viu.
- A AMO pagar a volta de um pote.
- Um entregador chegar à cozinha fechada.
- O endereço da cozinha, o token ou um segredo da Uber chegar ao navegador,
  a um commit ou a um log.

## 3. O que existe hoje

- `cotarEntrega` (`src/app/sacola/acoes.ts`) confere CEP, número e
  complemento, consome o limite (10 por hora por IP), busca o CEP, usa
  `cotarDeExemplo` e grava em `privado.cotacoes` por
  `privado.registrar_cotacao` (origem `exemplo`). Fora do ambiente de teste do
  Mercado Pago, recusa com `entrega_indisponivel`.
- A página de produto (`ProdutoCompra.tsx`) também chama `cotarEntrega`, só
  com CEP e número, para mostrar o valor e o prazo.
- `privado.cotacoes` já tem `origem` (`uber`, `exemplo`) e `uber_cotacao_id`.
- `privado.entregas` (`pedido_id`, `uber_entrega_id`, `status_uber`) e
  `privado.aplicar_entrega` existem e ninguém os chama. `aplicar_entrega` só
  leva a "a caminho" a partir de `em_preparo`.
- O gatilho do pedido aceita só as passagens `pago>em_preparo`,
  `em_preparo>a_caminho` e `a_caminho>entregue` no caminho da entrega.
- `criar_pedido` recusa com `loja_fechada` quando `privado.loja_aberta()` é
  falso.
- `pedidos.rastreio_url` e `aplicar_entrega` só aceitam `https` em
  `uber.com` e subdomínios. O exemplo de `tracking_url` do guia é
  `https://www.ubereats.com/orders/...`, que seria recusado.
- A reconciliação (`POST /api/tarefas/reconciliar`) existe, mas nada a chama
  ainda: a hospedagem e o agendador estão em aberto (spec do back-end, §18).
- `src/lib/loja.ts` (`situacaoDaLoja`) repete no navegador a regra de
  `privado.loja_aberta`.
- Nenhuma variável `UBER_*` está no `.env.local`.

## 4. Caminhos considerados

1. **A corrida é criada quando o pagamento é confirmado, nos dois modos.
   (escolhido pelo dono)** No agendado, a corrida nasce com a faixa marcada,
   dias antes. A corrida é criada com o `quote_id`, ainda dentro da validade
   dele quando o pagamento é rápido; se a Uber mantém esse valor até a
   execução, dias depois, ainda não está confirmado por escrito (§16), e por
   isso o valor cobrado de fato é guardado e comparado (§8.3). Um só caminho
   de criação para os dois modos. Custo: a corrida agendada fica dias registrada na Uber,
   e o cancelamento de um pedido pago precisa cancelá-la também (sem taxa
   antes de um entregador aceitar).
2. **A corrida agendada é criada perto da hora.** Menos corridas paradas na
   Uber, mas a cotação é refeita perto da hora (o preço pode ter subido, e a
   diferença seria da AMO) e depende de um agendador pontual, que ainda não
   existe. Descartado.
3. **A equipe chama a corrida.** Não há tela para isso, e o dono quer tudo
   automático. Descartado.
4. **Uma Edge Function do Supabase cria a corrida.** Dois servidores e dois
   cofres de segredo, o que a spec do back-end já recusou (§4 dela).
   Descartado.

## 5. Os modos e as faixas

### 5.1 Agora

- Ligado quando `privado.loja_aberta()` é verdadeiro (dentro do horário, sem
  vendas pausadas e, a partir de agora, fora de uma data de
  `public.dias_fechados`, §5.2; `src/lib/loja.ts` segue a mesma regra).
- A cotação vai sem janela (corrida imediata). A Uber devolve em quantos
  minutos o entregador chega à cozinha (`pickup_duration`). Se ele fosse
  chegar depois do fechamento do dia, o "Agora" é recusado para esse
  endereço (`agora_indisponivel`) e a tela oferece agendar.
- A corrida é criada sem janela, para retirada imediata.

### 5.2 Agendado

- Pode ser escolhido a qualquer hora. Vendas pausadas desligam os dois modos
  (minha escolha: "pausar as vendas" vale para tudo).
- **Faixas de 1 hora**, em horas cheias, dentro do horário do dia em
  `public.horarios`. A cliente escolhe o dia e a faixa; não há horário exato,
  porque a Uber exige uma janela de entrega de pelo menos 60 minutos no
  agendamento.
- Para cada faixa `[s, s + 60 min]`, o servidor manda à Uber:
  `pickup_ready_dt = s − 30 min`, `pickup_deadline_dt = s`,
  `dropoff_ready_dt = s`, `dropoff_deadline_dt = s + 60 min`. Isso cumpre as
  regras da documentação (retirada com janela de 30 min ou mais, entrega
  terminando 90 min ou mais depois do início da retirada).
- **Uma faixa vale** se a retirada e a entrega cabem no horário do dia:
  `s − 30 min ≥ abre` e `s + 60 min ≤ fecha`. Com a loja das 9h às 18h, as
  faixas são 10h–11h até 17h–18h. A faixa das 9h–10h ficaria com a retirada
  às 8h30, antes de abrir.
- **De hoje até 7 dias à frente** (minha escolha). Para hoje, só as faixas com
  `s ≥ agora + 90 min`: assim um Pix pago no fim dos 30 minutos dele ainda
  cai antes de a retirada começar (`s − 30 min`), com a folga de 20 minutos
  que a Uber exige. Dia sem linha em `horarios` não tem faixa.
- **Datas fechadas.** Tabela nova `public.dias_fechados` (`data` pk, `motivo`
  opcional), de leitura pública como `horarios`, editada pela equipe no painel
  do Supabase (feriado, folga). Uma data dela não tem faixa, e o "Agora" fica
  desligado nela. Quando a equipe fecha uma data que já tem corridas
  agendadas, um gatilho as marca `precisa_da_equipe` (§8.1), sem cancelar
  nada sozinho. Pausar as vendas não mexe em pedido já agendado: só impede
  pedido novo.
- A regra das faixas mora numa função do banco
  (`privado.faixa_valida(inicio, fim)`), e o servidor e a tela usam a mesma
  regra em `src/lib/loja.ts`, como já acontece com a loja aberta. O
  navegador nunca decide: a cliente manda o início da faixa e o servidor
  confere.

Os números (30, 60, 90 minutos, 7 dias) são escolhas minhas a partir da
documentação. **A primeira coisa construída é uma cotação de teste na conta de
teste da Uber com a janela de 1 hora**, porque a documentação tem dois tipos
de agendamento: o que aceita a faixa de 1 hora e o "mesmo dia / dia seguinte",
que pede janela de entrega de 240 minutos. Qual vale depende da conta.
**Se a Uber pedir 4 horas** (decisão do dono), as faixas viram duas por dia:
manhã (10h–14h) e tarde (14h–18h), com as mesmas regras de caber no horário;
só os números de `faixa_valida` e o rótulo da tela mudam.

## 6. A cotação

`cotarEntrega` passa a receber também `modo` (`agora` ou `agendado`) e, no
agendado, `faixa` (o início, em ISO). Sem `modo` (a página de produto), o
servidor cota o "Agora" se ele estiver ligado, senão a primeira faixa livre,
e a resposta diz qual cotou.

Ordem, a mesma de hoje com dois passos novos:

1. Confere cada campo (o modo é um de dois; a faixa, uma data ISO que
   `faixa_valida` aceita para agora).
2. Consome o limite: **30 por hora por IP** (era 10; trocar de faixa ou de
   modo é uma cotação nova).
3. Busca o CEP.
4. **Sem as variáveis `UBER_DIRECT_*`**: a conta de exemplo, só com o Mercado
   Pago em teste (como hoje). **Com elas**: pede a cotação à Uber
   (`POST /v1/customers/{customer_id}/delivery_quotes`):
   - `pickup_address` e `dropoff_address` como JSON estruturado serializado
     (`street_address`, `city`, `state`, `zip_code`, `country: "BR"`), montado
     por **uma única função** a partir dos campos guardados. A criação da
     corrida usa a mesma função com os mesmos campos, e a string sai idêntica
     (senão a Uber recusa com "delivery location changed").
   - `pickup_phone_number` da cozinha; as janelas no agendado.
   - Confere a resposta: `currency` é `brl`, `fee` é inteiro entre 0 e 100000,
     o id tem o formato esperado, e `live_mode` bate com o ambiente (§9).
5. Grava a cotação com `origem = 'uber'`, `uber_cotacao_id`, o valor (`fee`),
   os minutos (`duration`), o modo, a faixa e `expira_em` (o menor entre o
   `expires` da Uber e 15 minutos).

Erros da Uber viram códigos curtos: fora da cobertura ou sem entregador
(`address_undeliverable*`) vira `fora_da_area`; 429 vira
`entrega_indisponivel`; 5xx e rede viram `tente_de_novo`. A mensagem crua da
Uber nunca vai à página nem ao log com dado pessoal.

`privado.cotacoes` ganha `modo` e `janela_inicio`, `janela_fim` (nulas no
agora), com `check` de coerência. `registrar_cotacao` ganha esses parâmetros.

## 7. O pedido

`public.pedidos` ganha `entrega_modo` (`agora`, `agendado`),
`entrega_janela_inicio` e `entrega_janela_fim` (nulas no agora), copiadas da
cotação por `criar_pedido`. Imutáveis, como o resto do retrato.

`criar_pedido` troca a regra da loja:

- modo `agora`: exige `privado.loja_aberta()` (como hoje).
- modo `agendado`: exige vendas não pausadas e `privado.faixa_valida` da
  faixa da cotação, conferida de novo agora (a faixa pode ter passado do
  limite de 60 minutos enquanto a cliente fazia login).
- Recusa com `loja_fechada` ou com o código novo `faixa_indisponivel`.

O resto de `criar_pedido` não muda: total do banco, um pedido aguardando por
cliente, cotação vencida recusada.

`iniciar_pagamento` confere a faixa de novo no agendado (`faixa_valida` agora)
e recusa com `faixa_indisponivel`: a tela leva a cliente de volta à etapa de
entrega para escolher outra faixa, como já faz com a cotação vencida.

O gatilho do pedido passa a aceitar `pago>a_caminho` (os potes estão prontos;
a equipe pode nunca marcar "em preparo"). E aceita uma única mudança no
retrato da entrega: de `agora` para `agendado`, com a faixa preenchida, feita
só por função de `privado` (§8.2, a corrida remarcada).

## 8. A corrida

### 8.1 A intenção nasce com o pagamento

Quando `aplicar_pagamento` leva o pedido a `pago`, ela grava, **na mesma
transação**, a linha de `privado.entregas` com `estado = 'a_criar'` e uma
`chave` (uuid) que será a `idempotency_key` da Uber. Assim a corrida não pode
ser esquecida: se o servidor cair depois do pagamento, a linha está lá.

`privado.entregas` ganha: `estado` (`a_criar`, `criando`, `criada`,
`a_cancelar`, `cancelada`, `precisa_da_equipe`), `chave`, `tentativas`,
`valor_uber_centavos` (o `fee` da corrida criada), `motivo` (código curto) e
`criado_em`.

### 8.2 Criar

Logo depois de aplicar o pagamento, em qualquer caminho que o aplique (a
resposta do pagamento, a pergunta da tela, o aviso do Mercado Pago, a
reconciliação), o servidor chama `criarCorrida(pedido)`. Ela nunca lança e
nunca atrasa a resposta à cliente além do necessário.

1. `privado.reservar_corrida(pedido)`: trava a linha, passa de `a_criar` para
   `criando` (ou retoma uma `criando` parada há mais de 2 minutos) e devolve
   só o que a Uber precisa: nome, celular, endereço do retrato, itens (nome,
   quantidade, preço), subtotal, número, modo, faixa, a cotação (id e
   validade), o frete cobrado e a chave. Se outra chamada já reservou, não
   devolve nada e esta para.
2. **O horário ainda serve?** No agora, a loja aberta e a data não fechada;
   no agendado, a retirada da faixa ainda pelo menos 20 minutos à frente.
   **Não serve** (um "Agora" pago depois do fechamento; uma faixa paga tarde
   demais pelo Mercado Pago): a corrida é **remarcada para a primeira faixa
   livre** (a próxima de hoje, ou a do próximo dia aberto), o pedido passa a
   agendado com essa faixa (§7) e a página do pedido mostra a nova faixa.
   Decisão do dono.
3. **A cotação ainda vale (com folga de 1 minuto) e o horário não mudou:**
   cria com ela. **Venceu ou o horário mudou:** cota de novo, com o mesmo
   endereço. A corrida sai com a nova cotação **qualquer que seja o valor**: a
   cliente nunca paga a diferença, a AMO absorve (decisão do dono). A
   diferença fica gravada (`valor_uber_centavos` contra `frete_centavos`), e
   acima de R$ 3,00 vai ao log como aviso para a equipe.
4. `POST /v1/customers/{customer_id}/deliveries` com:
   - `quote_id`, `idempotency_key` = a chave;
   - `pickup_name` "AMO Sabores Saudáveis", endereço e telefone da cozinha;
   - `dropoff_name` (nome da cliente), `dropoff_address` (a mesma função da
     cotação), `dropoff_phone_number` (`+55` + celular), `dropoff_notes`
     (vazio nesta rodada);
   - `manifest_items` (nome, quantidade, `size: small`, preço),
     `manifest_total_value` = subtotal, `manifest_reference` e `external_id` =
     número do pedido;
   - `deliverable_action: deliverable_action_meet_at_door`,
     `undeliverable_action: leave_at_door`,
     `dropoff_verification: { picture: true }`;
   - no agendado, as janelas da faixa (§5.2);
   - em teste, `test_specifications.robo_courier_specification.mode: auto`.
5. Resposta boa: `privado.marcar_corrida_criada(pedido, uber_id, fee,
   tracking_url, status)` grava `criada` e o id, e chama a mesma lógica de
   `aplicar_entrega`.
6. Falha: `privado.marcar_corrida_falhou(pedido, motivo)` volta para
   `a_criar` e soma a tentativa. Depois de 5 tentativas, ou com um erro que
   não melhora repetindo (4xx de parâmetro, conta bloqueada), vai para
   `precisa_da_equipe`. Repetir com a mesma chave nunca cria duas corridas: a
   Uber deduplica por 60 minutos, e a linha travada impede duas chamadas ao
   mesmo tempo.

### 8.3 Acompanhar (`POST /api/webhooks/uber`)

1. Lê o corpo **cru** e confere `x-uber-signature`: HMAC-SHA256 em hex do
   corpo cru com `UBER_DIRECT_WEBHOOK_SECRET` (a chave de assinatura do
   webhook, não o `client_secret`), comparação em tempo constante. Errada:
   401, sem dizer o porquê.
2. Só `event.delivery_status` é tratado. `event.courier_update` (a cada 20
   s) responde 200 sem registrar nada. Outros tipos: 200, ignorados.
3. `registrar_evento_webhook('uber', id do evento, kind, delivery_id)`.
   `ja_tratado`: 200 e para.
4. Acha o pedido pelo `uber_entrega_id`. Busca a corrida na Uber
   (`GET /deliveries/{id}`) e aplica o que ela responde, não o corpo do aviso
   (mesma disciplina do Mercado Pago).
5. `concluir_evento_webhook`, 200. Falha depois do passo 3: guarda o erro,
   500. A Uber só tenta 3 vezes; a reconciliação cobre o resto.

`aplicar_entrega` passa a aceitar a partir de `pago` e `em_preparo`:
`pickup_complete` e `dropoff` levam a `a_caminho`; `delivered` leva a
`a_caminho` e depois a `entregue` na mesma chamada. Um estado velho nunca
volta o pedido (o gatilho já recusa). Cada `GET` também atualiza
`valor_uber_centavos` com o `fee` que a Uber informa, para a diferença
contra o frete cobrado ficar à vista enquanto a trava de preço não estiver
confirmada (§16).

**A Uber cancelou** (`canceled` sem ter sido pedido por nós: sem entregador,
entregador desistiu): a entrega volta para `a_criar` com uma chave nova e
cria **uma segunda corrida**, pelos mesmos passos de §8.2 (horário, nova
cotação, a AMO absorve a diferença). Se a segunda também for cancelada pela
Uber, vai para `precisa_da_equipe`. Decisão do dono. `returned` (não deveria
acontecer com `leave_at_door`) vai direto para `precisa_da_equipe`. Nenhum
dos dois muda o estado do pedido.

### 8.4 Cancelar

Se a equipe cancelar um pedido pago pelo painel, um gatilho em `pedidos`
passa a corrida `criada` para `a_cancelar` (e uma `a_criar` direto para
`cancelada`). A reconciliação chama
`POST /deliveries/{id}/cancel` e grava `cancelada`. Antes de um entregador
aceitar, não há taxa; depois, a Uber pode cobrar, e isso fica registrado no
`motivo`. O estorno do Mercado Pago continua com a equipe, como hoje.

### 8.5 Reconciliação

A mesma rota, no mesmo prazo de 50 s, ganha três listas:

1. entregas `a_criar` (e `criando` paradas há mais de 2 minutos): `criarCorrida`;
2. entregas `a_cancelar`: cancelar na Uber;
3. entregas `criada` sem estado final e sem atualização há mais de 10
   minutos: `GET /deliveries/{id}` e `aplicar_entrega`.

**Ela precisa rodar a cada 5 minutos.** Hoje nada a chama. Se a hospedagem
não tiver agendador, `pg_cron` com `pg_net` chama a rota com o segredo das
tarefas (a spec do back-end já previa). Sem isso, uma corrida que falhou na
primeira tentativa fica parada.

**Nesta rodada o site não tem endereço público** (a hospedagem continua em
aberto, spec do back-end §18). Então: no desenvolvimento, a reconciliação roda
por um comando (`npm run`) que chama a rota com o segredo; o ensaio na conta de
teste da Uber (§14) usa um túnel temporário até o computador do dono, só para
os avisos chegarem; o agendador de 5 minutos e o cadastro definitivo da URL do
aviso entram junto com a hospedagem, na preparação para ir ao ar.

## 9. Teste e produção nunca se misturam

- `UBER_DIRECT_AMBIENTE=teste` liga a conta de teste da Uber (credenciais de
  teste do painel `direct.uber.com`, Robo Courier). Sem a variável, é
  produção.
- **Os dois ambientes andam juntos:** Mercado Pago em teste exige Uber em
  teste, e Mercado Pago em produção exige Uber em produção. A combinação
  errada recusa a cotação com `entrega_indisponivel` e vai ao log.
- E a resposta confirma: `live_mode` da cotação e da corrida tem de bater
  com o ambiente. Se não bater, a cotação é recusada e a corrida não é
  criada (`precisa_da_equipe`).

## 10. A chave de acesso da Uber

- `POST https://auth.uber.com/oauth/v2/token`, `client_credentials`, escopo
  `eats.deliveries`. O token vale 30 dias, a emissão é limitada a 100 por
  hora, e emitir demais derruba os anteriores.
- **Um token para o site inteiro**, guardado cifrado no Supabase Vault (a
  extensão já está ligada), lido e trocado só por funções de `privado`
  executáveis pela `service_role`. Cada instância do servidor guarda uma
  cópia em memória.
- Renova quando faltam 2 dias, ou uma vez ao receber 401. Só uma instância
  renova por vez (`privado.reservar_renovacao_token()`, que dá a vez a uma
  só por 60 s); as outras releem do banco.
- O token, o `client_secret` e a chave do webhook nunca vão a log.

## 11. A tela

- **Etapa de entrega:** CEP, número, complemento e a escolha do modo. "Agora"
  aparece desligado com a frase do porquê ("A cozinha abre às 9h") quando a
  loja está fechada ou a Uber não chegaria antes do fechamento. "Agendar"
  abre o dia (até 7 à frente, só dias com faixa) e a faixa. Trocar modo,
  dia ou faixa pede uma cotação nova. O visual passa antes pelos esboços do
  Impeccable, para o dono escolher, e segue o `DESIGN.md` (fino e delicado).
- **Resumo e pedido feito:** "Chega em cerca de 35 min" no agora; "Entrega
  agendada: terça, 25/11, das 14h às 15h" no agendado.
- **Página de produto:** mostra o valor do agora, ou, com a loja fechada, o
  da primeira faixa com o dia ("entrega agendada a partir de amanhã, 10h").
- **Página do pedido (Minha conta):** a faixa agendada e o link "Acompanhar
  a entrega" quando o pedido está a caminho.
- **Erros novos:** `agora_indisponivel` ("O Uber não chega antes de a cozinha
  fechar. Agende a entrega."), `faixa_indisponivel` ("Essa faixa não está mais
  disponível. Escolha outra.").

## 12. Segredos, dados e ataques

| Variável | Para quê |
| --- | --- |
| `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET` | cotação e corrida |
| `UBER_DIRECT_WEBHOOK_SECRET` | a chave de assinatura do webhook |
| `UBER_DIRECT_AMBIENTE` | `teste` na conta de teste; ausente em produção |
| `COZINHA_ENDERECO` | o endereço estruturado e o telefone da cozinha (JSON), conferidos ao ler; nunca vão à página |

Todas só em módulo `server-only`, nunca com `NEXT_PUBLIC_`; a varredura de
segredo do build ganha esses valores.

- **Dados à Uber:** nome, celular e endereço da cliente, o mínimo para
  entregar. Nenhuma resposta da Uber é guardada inteira: só id, estado,
  valor e link de rastreio. Nada do entregador (nome, placa, telefone,
  posição). A política de privacidade passa a citar a Uber como quem
  entrega.
- **Link de rastreio:** continua só `https`, mas a regra do domínio passa a
  aceitar o domínio que a Uber usa de fato (o ensaio mostra qual; o guia
  sugere `ubereats.com`). Uma migration troca o `check` e a função.
- **SSRF:** o servidor só chama `auth.uber.com` e `api.uber.com`, endereços
  fixos.
- **Aviso forjado ou repetido:** assinatura no corpo cru, uma vez só por id,
  e o estado vem do `GET` à Uber, não do corpo.
- **Mexer no frete ou na faixa:** o valor só sai de `privado.cotacoes`; a
  faixa é conferida por `faixa_valida` na cotação e de novo no pedido.

## 13. Os casos de borda, decididos pelo dono

| Caso | O que acontece | Onde |
| --- | --- | --- |
| "Agora" pago depois do fechamento (Pix das 17h50 pago às 18h15) | remarcada para a primeira faixa livre; a página do pedido mostra a faixa | §8.2 |
| Faixa paga tarde demais | a mesma remarcação | §8.2 |
| Faixa que passou antes de pagar | `iniciar_pagamento` recusa e a cliente escolhe outra | §7 |
| Cotação refeita mais cara | a corrida sai; a AMO absorve; a cliente nunca paga a diferença | §8.2 |
| A Uber cancela a corrida | uma segunda corrida sozinha; na segunda falha, a equipe | §8.3 |
| A equipe fecha uma data com corridas marcadas | as corridas ficam sinalizadas para a equipe, sem cancelar sozinhas | §5.2 |
| Vendas pausadas | só impedem pedido novo | §5.2 |
| A Uber pede janela de 4 horas | faixas de manhã (10h–14h) e tarde (14h–18h) | §5.2 |

Como a equipe fica sabendo de `precisa_da_equipe`: nesta rodada, pelo painel
do Supabase (uma consulta salva na documentação de `supabase/README.md`) e
pelo log. O aviso ativo (e-mail, WhatsApp) é do painel da equipe, na próxima
rodada.

## 14. Como provar

- **Banco (SQL, em `supabase/tests/`):** `faixa_valida` (borda da abertura,
  do fechamento, de agora + 90 min, de 7 dias, domingo, data fechada, vendas
  pausadas); `criar_pedido` nos dois modos e com `faixa_indisponivel`;
  `iniciar_pagamento` recusando faixa que passou; `aplicar_pagamento` grava a
  entrega `a_criar` uma vez só; `reservar_corrida` não entrega a mesma corrida
  a duas chamadas; a remarcação de `agora` para `agendado` só pela função de
  `privado`; `aplicar_entrega` a partir de `pago`, estado velho não volta;
  cancelar pedido pago marca `a_cancelar`; fechar uma data marca as corridas
  dela; inventário de permissões com as tabelas e funções novas; injeção nas
  funções novas.
- **Servidor (Vitest, Uber por `fetch` falso):** cotação nos dois modos, sem
  modo, e cada erro da Uber; a string de endereço idêntica entre cotação e
  corrida; o corpo da corrida (as duas ações, a foto, a chave, as janelas);
  cotação vencida refeita, mais cara, e a corrida criada assim mesmo;
  "Agora" pago depois do fechamento remarcado; a segunda corrida depois de um
  cancelamento da Uber, e a equipe depois do segundo; ambientes trocados
  recusados; `live_mode` errado recusado; token reaproveitado, renovado com
  401, uma renovação por vez; assinatura do aviso (certa, errada, ausente,
  corpo com `&`); reconciliação nas três listas.
- **Ensaio no navegador:** com uma Uber falsa carregada só no servidor de
  ensaio, como `scripts/ensaio/mercadopago-falso.mjs`.
- **Portão antes de produção:** o ensaio na conta de teste da Uber com o
  Robo Courier, registrado em `supabase/README.md`: cotação real nos dois
  modos; a corrida criada com `leave_at_door` aceito; as janelas da faixa
  aceitas; os avisos chegando assinados e levando o pedido a "a caminho" e
  "entregue"; o domínio do `tracking_url`; um cancelamento. Depois, o piloto
  com loja real que a Uber exige.

## 15. Deixado para quem constrói

- Os nomes e a divisão dos arquivos (provável `src/lib/uber/` espelhando
  `src/lib/mercadopago/`).
- Onde exatamente chamar `criarCorrida` depois de cada caminho que aplica o
  pagamento, desde que nenhum fique de fora.
- O formato do JSON de `COZINHA_ENDERECO`.
- O texto final das mensagens.

## 16. Pendente com a Uber (nada garantido por escrito)

Self-serve no Brasil e cobertura do CEP da cozinha; `leave_at_door` aceito
em `undeliverable_action` no Brasil; as janelas do agendamento na
configuração da conta; **se o valor da cotação usada na criação fica travado
até a execução**, inclusive na corrida agendada para dias depois (taxa de
área movimentada, espera); o domínio do `tracking_url`; a taxa de
cancelamento em reais; o prazo do piloto. O ensaio na conta de teste responde
os que dá para ver por API; o resto é com a Uber.
