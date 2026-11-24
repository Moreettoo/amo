# AMO · O pagamento de verdade · Design Spec

**Data:** 2026-11-23
**Status:** aprovada pelo dono em 2026-11-23 ("pode seguir"), depois da
revisão de um construtor. O que a revisão pediu foi resolvido por mim, e cada
resposta está marcada como "minha decisão" (§6, §8, §9 e §11). O `cloudflared`
da §6 foi instalado em `D:\ferramentas\cloudflared\cloudflared.exe` (versão
2026.10.7, SHA-256 do GitHub e assinatura da Cloudflare conferidos), a pedido
do dono, no disco D.
**Sessão:** amo-66, a do pagamento. A entrega pelo Uber Direct continua com a
sessão amo-fa, pelo plano `docs/superpowers/plans/2026-11-23-amo-entrega-uber-servidor.md`.
**Anda junto com:** `2026-11-18-amo-backend-design.md` (§10, o pagamento),
`2026-11-21-amo-mercadopago-orders.md` (o contrato do Mercado Pago) e
`2026-11-23-amo-entrega-uber-direct-design.md` (a corrida que sai quando o
pagamento é aprovado). Esta spec não muda nenhuma regra delas. Ela acrescenta
o ensaio com o Mercado Pago de verdade, as correções que ele pedir, o que
melhora a aprovação do cartão e a lista da produção.

---

## 1. O pedido

Do dono, em 2026-11-23: esta sessão fica com "a parte mais delicada, a
integração do pagamento"; "todas as keys e dados de teste/prod estão nos
envs". Não há data para a primeira venda de verdade ("Não tem uma data
específica"). Ele deixou o como comigo: escolhi o caminho 1 da §4 e disse a
ele que seguiria com esse caminho.

Daí o escopo: provar o pagamento contra o Mercado Pago de verdade, com as
credenciais de teste; corrigir o que o ensaio mostrar; e deixar a produção
numa lista pronta para quando houver hospedagem.

## 2. O que existe hoje

- **O pagamento está construído (etapa 3) e nunca falou com o Mercado Pago de
  verdade.** Ele tem Pix e cartão pela API de Orders, o Card Payment Brick, o
  desafio do banco (3DS), o aviso assinado (`/api/webhooks/mercadopago`) e a
  reconciliação (`/api/tarefas/reconciliar`). Também estorna sozinho o que foi
  pago a mais e cancela no Mercado Pago o que terminou do lado de cá. Tudo foi
  testado com `fetch` falso (Vitest) e com um Mercado Pago falso no servidor
  de ensaio (`scripts/ensaio/mercadopago-falso.mjs`). O "portão do cartão" de
  `supabase/README.md` continua "ainda não ensaiado".
- **As credenciais foram conferidas em 2026-11-23 por `GET /users/me`**, só
  leitura, sem imprimir nada além de três sinais:
  - a do `.env.local` é de um usuário de teste do Mercado Pago, no Brasil (`MLB`);
  - a de `.env.producao.local` é de uma conta real, no Brasil.

  Cada arquivo tem a sua chave pública e a sua assinatura secreta do aviso, de
  64 caracteres, diferentes entre os dois. A assinatura só existe depois que o
  aviso é salvo no painel: ele já foi configurado em algum endereço, e o ensaio
  troca esse endereço pelo do túnel. `MERCADOPAGO_AMBIENTE=teste` está no
  `.env.local`. O Next não carrega `.env.producao.local` (o nome não é dos que
  ele lê), e isso é de propósito.
- **Falta `TAREFAS_SEGREDO` no `.env.local`.** Por isso a reconciliação local
  responde 500.
- **Do jeito que o código está, o Pix de teste não é aprovado.** Pelo contrato
  (§5) e pela página de teste do Pix da API de Orders, o pedido com
  `payer.first_name: "APRO"` é aprovado depois de criado. O código manda só
  `payer.email`. Um Pix de teste não pode ser pago de outro jeito.
- **O Mercado Pago recebe só o e-mail**, e o CPF quando o Brick pede. Não
  recebe nenhum item nem o identificador do aparelho (Device ID). A
  documentação dele diz que o Device ID e os dados do pedido melhoram a
  aprovação do cartão e evitam recusar pagamento legítimo. Diz também que a
  API de Orders aceita `items` na raiz do pedido. Nas referências de outros
  tipos de pedido, a soma dos itens tem de bater com `total_amount` (senão a
  recusa é `order_items_total_amount_mismatch`). Para o pedido online, o
  roteiro da §5 confirma.
- **Não há site no ar.** Não existe projeto da AMO na Vercel nem repositório
  remoto. Em produção, o aviso de pagamento e o agendador da reconciliação
  dependem disso (backend §18).
- **Não havia programa de túnel nesta máquina** (nem `cloudflared`, nem `ngrok`). O `cloudflared` foi instalado depois, no disco D (ver o Status).
- **A entrega (amo-fa), em 2026-11-23:**
  - Prontas: as tasks T1 a T4. A T4 (aprovada em `534cdcf`) mantém a
    assinatura de `iniciar_pagamento` e acrescenta a recusa
    `faixa_indisponivel`, que `pagar` já traduz.
  - Em andamento: a T5. Ela põe um gatilho em `public.pedidos`: quando o
    pedido vira pago, grava a corrida `a_criar` em `privado.entregas`, na mesma
    transação do pagamento; quando ele é cancelado, manda a corrida para
    `a_cancelar`. Nenhuma chamada à Uber sai daí, e as funções do pagamento
    não mudam.
  - Faltam: as tasks T6 a T13. A T9 liga a corrida a `aplicarRespostaDoMp`. A
    T11 mexe na rota da reconciliação e cria `npm run reconciliar`. A T13 usa
    um túnel, com o dono.

## 3. Objetivos, não objetivos e o que seria um fracasso

**Objetivos**

1. Cada caminho do pagamento roda contra o Mercado Pago de verdade, em teste,
   e o resultado fica anotado. Os caminhos são:
   - o Pix criado, pago e cancelado;
   - o cartão aprovado, recusado com nova tentativa, pendente e com desafio;
   - a troca de forma de pagamento, que cancela a anterior lá;
   - o pagamento a mais, que é estornado;
   - o aviso assinado;
   - a reconciliação.
2. Toda diferença entre a API de verdade e o código vira um teste que falha,
   uma correção e uma linha no contrato do Mercado Pago.
3. O cartão chega à produção com o Device ID e os itens do pedido (a entrega
   entra como mais um item). Assim o antifraude dele recusa menos cartão bom.
4. A produção fica numa lista que se cumpre numa sessão só, quando houver
   hospedagem. A lista tem uma prova sem dinheiro e uma com dinheiro.

**Não objetivos**

- Hospedagem, domínio e banco de produção. Eles são da preparação para ir ao
  ar, que é das duas sessões (backend §15, etapa 4). Esta spec só diz o que o
  pagamento precisa deles.
- Tudo o que é da Uber (as tasks T5 a T13 do plano dela).
- Estorno automático quando a equipe cancela um pedido pago. Ele continua no
  painel do Mercado Pago, como a spec do back-end decidiu (§10.1).
- A cliente cancelar um pedido pago, cartão salvo e parcelas com juros.
- Mandar ao Mercado Pago o nome, o telefone ou o endereço da cliente (§8).

**Seria um fracasso, mesmo funcionando**

- Dinheiro de verdade mexer no ensaio, ou uma credencial de produção entrar
  nele.
- Aparecer num commit, num log ou na saída de um script qualquer um destes:
  a senha do comprador de teste, um token, uma assinatura secreta ou um dado
  pessoal.
- Um entregador de verdade sair por causa de uma prova de pagamento.
- O trabalho do pagamento quebrar o da entrega, mudando sem combinar uma
  função do banco ou um arquivo das tasks dela.
- Mudar um comportamento que o dono aprovou sem avisar a ele.

## 4. Caminhos considerados

1. **Roteiro direto na API, depois o ensaio no navegador com túnel.
   (escolhido)** O roteiro acha, sozinho e rápido, os erros de formato e de
   regra da API. O navegador prova o Brick, a CSP, o desafio e o aviso. O dono
   age duas vezes: instala o túnel e cadastra a URL dele no painel do Mercado
   Pago de teste.
2. **Só o ensaio no navegador.** Tem uma peça a menos, mas cada erro da API
   aparece misturado com a tela.
3. **Uma versão de teste na Vercel.** Dá endereço fixo e dispensa o túnel, mas
   cria o projeto e o repositório remoto e expõe o banco de desenvolvimento
   antes da hora. Sem data para ir ao ar, não compensa.

## 5. O roteiro direto na API

O roteiro é `scripts/ensaio/mercadopago-conta-de-teste.mjs`, no molde de
`scripts/ensaio/uber-conta-de-teste.mjs`. Ele roda com
`node --env-file=.env.local`, nunca com outro arquivo.

1. **Portão.** O roteiro exige `MERCADOPAGO_AMBIENTE=teste`. Depois chama
   `GET /users/me` e só segue se `tags` tiver `test_user` e o `site_id` for
   `MLB`. Qualquer outra resposta encerra o roteiro (código de saída 2) antes
   de ele criar qualquer coisa.
2. **Quem paga.** O pagador é o e-mail do comprador de teste, passado na linha
   de comando (`MP_TESTE_COMPRADOR_EMAIL=... node ...`). O roteiro nunca o
   imprime nem o grava.
3. **Os casos.** Cada caso sai numa linha de resultado.
   - **Pix sem `APRO`.** O pedido nasce `action_required`/`waiting_transfer`,
     com `qr_code`, `qr_code_base64` e `date_of_expiration`. Cancelar dá
     `canceled`. Cancelar de novo dá 409 `order_already_canceled`.
   - **Pix com `APRO`.** O pedido é aprovado depois de criado: o roteiro o lê
     por `GET` por até 60 s. Estornar dá o estado que o contrato espera.
     Estornar de novo dá 409 `order_already_refunded`.
   - **Cartão.** O token vem de `POST /v1/card_tokens?public_key=...`, com os
     cartões de teste do contrato §5.
     - `APRO` aprova.
     - `OTHE` responde 402, com o pedido e o detalhe da recusa.
     - `CONT` fica pendente.
     - `APRO-CHOK` volta `pending_challenge`, com a URL do desafio. O host
       dessa URL tem de caber na CSP e em `urlDoDesafio`.

     Se a API não emitir o token fora do navegador, os casos do cartão ficam
     só para o navegador (§6), e o roteiro anota isso.
   - **Itens.** O roteiro manda os itens de dois jeitos: somando só o
     subtotal, e com a entrega como item, somando o total. Ele anota qual
     jeito a API aceita e o código da recusa do outro.
   - **Device ID.** O roteiro manda o cabeçalho `X-meli-session-id` com um
     valor de ensaio e confere que a resposta não muda. O valor de verdade só
     o navegador tem (§6).
   - **Chave de idempotência repetida.** Uma vez com o mesmo corpo e outra com
     um corpo diferente. O contrato (§3) diz que o primeiro caso não é
     documentado.
4. **O que sai na tela.** O roteiro mostra só:
   - o status HTTP, o `status` e o `status_detail`;
   - os prefixos dos ids;
   - se cada campo que `lerPedido` lê veio ou não;
   - os códigos de erro.

   Ele nunca mostra um corpo, um token, o QR, o `ticket_url` ou o e-mail.
5. **No fim**, todo pedido criado termina cancelado ou estornado, mesmo que um
   caso falhe no meio.

O resultado vai para `supabase/README.md`, na seção "Mercado Pago: o que o
ensaio mostrou". Cada fato novo também vai para a seção certa do contrato do
Mercado Pago.

## 6. O ensaio no navegador

**Antes**

- **Código e banco combinando.** A branch do pagamento parte do último commit
  da entrega cuja migration já está aplicada no banco de desenvolvimento
  (hoje, a T5 em andamento). Como o gatilho da T5 roda na mesma transação do
  pagamento, um erro nele desfaria a aplicação do pagamento: o ensaio confere
  também esse encaixe.
- **Lugar de trabalho só do pagamento.** Um worktree e uma branch só dele
  (`feat/pagamento-de-verdade`). O servidor de ensaio roda na porta 3001, para
  não disputar a 3000 com o do dono nem com o da outra sessão.
- **Segredo da reconciliação.** `TAREFAS_SEGREDO` é gerado aqui e acrescentado
  ao `.env.local`. A amo-fa fica avisada, porque ia pedir essa variável ao dono
  na T11.
- **A conta de ensaio.** A conta da AMO para o ensaio nasce por
  `admin.createUser` (`email_confirm: true`), **com o e-mail do comprador de
  teste**. Assim o `payer.email` é o dele, e a cota de e-mail do Supabase de
  desenvolvimento não é gasta.
- **A loja aberta** na hora do ensaio, pelo procedimento de
  `supabase/README.md`.
- **O Pix que é aprovado.** O arquivo `scripts/ensaio/mercadopago-pix-aprova.mjs`
  é carregado por `NODE_OPTIONS=--import=...`, como o falso de hoje, mas não
  responde nada no lugar do Mercado Pago. Ele só acrescenta
  `payer.first_name: "APRO"` ao corpo dos `POST /v1/orders` de Pix e passa a
  chamada para o Mercado Pago de verdade.
  - Ele só liga com `MERCADOPAGO_AMBIENTE=teste` e fora de
    `NODE_ENV=production`, e diz no terminal quando ligou.
  - O código do site não muda.
  - Para testar o Pix que fica esperando, o servidor é reiniciado sem ele.
- **O túnel.**
  1. O `cloudflared` já está em `D:\ferramentas\cloudflared\cloudflared.exe`.
  2. Eu abro `D:\ferramentas\cloudflared\cloudflared.exe tunnel --url http://localhost:3001`.
  3. O dono entra no painel do Mercado Pago com o **vendedor de teste** e
     cadastra `<túnel>/api/webhooks/mercadopago` no aplicativo dele, na parte
     de Webhooks:
     - com os eventos "Order (Mercado Pago)" e "Chargebacks";
     - com a mesma URL nos campos de teste e de produção, porque esse
       aplicativo só serve a teste.
  4. O dono confere que a assinatura secreta mostrada no painel é a do
     `.env.local`.
  5. O "Simular" do painel tem de chegar com 200.

  Se a T13 da Uber cair no mesmo dia, um túnel e um servidor servem às duas,
  como combinado com a amo-fa.

**O que se confere** (o portão do cartão de `supabase/README.md`, mais o Pix e
o aviso)

1. O Brick aparece a 390 e a 1440 px. O console não mostra violação de CSP no
   `npm run dev` **nem** no `npm run build` seguido de `npm start`: a CSP de
   produção é mais estrita que a de desenvolvimento.
2. Os cartões de teste se comportam como o contrato diz:
   - `APRO` aprova;
   - `OTHE` recusa e deixa tentar de novo, com um token novo;
   - `CONT` fica pendente e anda pelo aviso;
   - `APRO-CHOK` mostra o desafio, e ele fica na tela até o resultado.

   O `getAdditionalData` traz `paymentTypeId`.
3. `window.MP_DEVICE_SESSION_ID` existe depois que o SDK carrega. O valor não é
   impresso.
4. **Pix aprovado:** o pedido vira pago, a sacola esvazia e Minha conta mostra
   o pedido pago. No banco, o pedido ganha uma linha só em
   `privado.entregas`, mesmo que o aviso e a reconciliação apliquem o mesmo
   pagamento de novo.
5. **Pix esperando, trocado pelo cartão:** o Pix anterior aparece cancelado no
   Mercado Pago.
6. **Dinheiro que chega para um pedido que não espera mais** (o estorno
   automático). O código não deixa pagar duas vezes de propósito: antes de
   cobrar de novo, ele cancela lá a tentativa anterior. Por isso o caso é
   montado assim (minha decisão, a partir da revisão):
   1. um Pix criado pela sacola, com o `mercadopago-pix-aprova.mjs` ligado;
   2. o servidor parado logo em seguida, antes de a aprovação chegar ao site
      (sem servidor, nem a espera da tela nem o aviso aplicam nada);
   3. o pedido cancelado no banco de desenvolvimento, como a equipe faria pelo
      painel (`status = 'cancelado'`, motivo `loja`);
   4. o servidor de volta, com a reconciliação rodada (ou o aviso que o
      Mercado Pago reenvia).

   A tentativa aprovada vira `a_estornar` e termina `estornado`. O aviso que
   chegar depois não muda mais nada.
7. **Aviso e reconciliação:** os avisos chegam assinados, sem nenhum 401 no
   log. A reconciliação conta o que conferiu. Ela roda por `curl` com
   `TAREFAS_SEGREDO`, ou por `npm run reconciliar` depois que a T11 o criar.

Se a T9 da Uber já estiver valendo com as credenciais de teste dela, um pedido
pago também cria uma corrida de teste (Robo Courier). Isso não muda nada no
pagamento. Uma cotação de exemplo vira `precisa_da_equipe` na entrega, e o
ensaio segue.

**No fim**

- a limpeza de "Limpar depois" (`supabase/README.md`);
- o horário da loja de volta ao normal;
- a URL do túnel apagada no painel;
- o servidor parado e a porta livre.

O resultado de cada item vai para `supabase/README.md`, com a data.

## 7. As correções

Para cada diferença que o roteiro ou o navegador mostrar:

1. uma linha nova no contrato do Mercado Pago, com o fato observado e a data;
2. um teste Vitest que falha com o formato de verdade: o `fetch` falso devolve
   a resposta observada, sem dado pessoal;
3. a correção;
4. o caso de novo no roteiro ou no navegador.

**Os arquivos do pagamento**, que eu posso mexer direto:

- `src/lib/mercadopago/cliente.ts`, `traducao.ts` e `assinatura.ts`;
- `src/components/sacola/CartaoMercadoPago.tsx`;
- `src/lib/seguranca/politica.ts`.

**Os arquivos que a entrega também mexe**, só depois de avisar a amo-fa e
combinar a ordem:

- `src/lib/mercadopago/sincronizar.ts`;
- `src/app/sacola/acoes.ts`;
- `src/app/api/tarefas/reconciliar/route.ts`;
- `src/lib/dados/pagamentos.ts`.

**As funções compartilhadas do banco** não mudam sem combinar: `criar_pedido`,
`iniciar_pagamento`, `aplicar_pagamento`, `guardar_pedido` e
`aplicar_entrega`.

Se uma correção mudar o que a cliente vê, ou algo que o dono aprovou, ela volta
ao dono antes.

## 8. A aprovação do cartão

- **Device ID.**
  - O SDK do Mercado Pago, que a sacola já carrega para o Brick, cria
    `window.MP_DEVICE_SESSION_ID`.
  - `CartaoMercadoPago` lê esse valor junto com o cartão e o manda a
    `pagarComCartao` como um campo a mais.
  - O servidor confere o formato: texto curto, sem espaço nem caractere de
    controle, com o tamanho máximo definido pelo ensaio. Depois manda o valor
    no cabeçalho `X-meli-session-id`, só na criação do pedido de cartão.
  - Se o valor faltar ou vier fora do formato, o pagamento segue sem ele. O
    Device ID nunca barra a cliente.
  - Se o ensaio mostrar que o SDK não cria a variável, o cabeçalho não vai, e
    nenhum script novo entra na sacola. O `security.js` do Mercado Pago, que
    seria a alternativa, mudaria a CSP e o que roda na página do pagamento.
    O fato volta ao dono, que decide. (minha decisão, a partir da revisão)
- **Itens.**
  - A criação do pedido, nas duas formas de pagamento, leva `items` com o
    nome, a quantidade e o preço de cada pote, lidos do banco
    (`itens_do_pedido`).
  - A entrega entra como mais um item, com o frete, para a soma bater com
    `total_amount`.
  - O roteiro confirma a regra da soma (§5) antes.
  - Nenhum valor vem da página.
- **Nenhum dado pessoal novo.** O nome, o telefone e o endereço da cliente não
  vão ao Mercado Pago (backend §12, "Mínimo"). O Device ID e os itens não
  identificam a cliente. Se em produção o cartão for muito recusado por risco,
  esta decisão volta ao dono, com os números.

O Device ID e os itens não mudam nada no teste, porque lá o resultado do
cartão sai do nome do titular. O ensaio só confere que a API aceita os
campos.

## 9. Teste e produção nunca se misturam

- O ambiente continua declarado por `MERCADOPAGO_AMBIENTE` (contrato §5).
- O roteiro e o `mercadopago-pix-aprova.mjs` só ligam em teste. O roteiro
  também confere, pela API, que a credencial é de usuário de teste.
- Nenhum comando de ensaio carrega `.env.producao.local`, e o arquivo nunca é
  renomeado para um nome que o Next leia.
- Antes de ir ao ar, a credencial de produção só é usada na prova sem dinheiro
  da §10, e com o OK do dono na hora. A prova é um script à parte, fora de
  `scripts/ensaio/` (por exemplo,
  `scripts/producao/mercadopago-prova-sem-dinheiro.mjs`), e é o único comando
  que carrega esse arquivo (`node --env-file=.env.producao.local`). O portão
  dele é o contrário do portão do roteiro: exige `MERCADOPAGO_AMBIENTE`
  diferente de `teste`, `GET /users/me` de uma conta real (sem `test_user`) e
  uma confirmação escrita na linha de comando. (minha decisão, a partir da
  revisão)

## 10. A produção: a lista

Esta lista é para a sessão em que o site for ao ar. Os itens do dono estão
marcados com **(dono)**.

1. **(dono) A conta do Mercado Pago de produção:**
   - MFA ligado;
   - uma chave Pix cadastrada, porque a API recusa o Pix de quem não tem chave;
   - o nome que aparece na fatura do cartão;
   - a conta liberada para receber cartão.
2. **A prova sem dinheiro.** Ela pode rodar antes da hospedagem, com o OK do
   dono.
   - É o script à parte da §9, com o portão dele.
   - Ele cria um Pix de R$ 1,00, sem imprimir o QR, e o cancela na hora. O
     pagador é o e-mail da loja, dado na linha de comando.
   - Isso confirma a credencial, a API de Orders liberada para o aplicativo e
     a chave Pix.
   - Ninguém consegue pagar esse Pix: o código não aparece em lugar nenhum, e
     o pedido é cancelado em segundos.
3. **(dono) O aplicativo de produção no painel:**
   - a URL `https://<domínio>/api/webhooks/mercadopago`;
   - os eventos "Order (Mercado Pago)" e "Chargebacks";
   - a assinatura secreta igual à `MERCADOPAGO_WEBHOOK_SECRET` de produção;
   - o "Simular" chegando com 200.
4. **As variáveis na hospedagem:**
   - **Em produção:** `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`,
     `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`, tiradas de
     `.env.producao.local`; **sem** `MERCADOPAGO_AMBIENTE` (ou com qualquer
     valor que não seja `teste`); e um `TAREFAS_SEGREDO` novo.
   - **Nos ambientes de pré-visualização:** as credenciais de teste, com
     `MERCADOPAGO_AMBIENTE=teste`.
   - `MERCADOPAGO_CLIENT_ID` e `MERCADOPAGO_CLIENT_SECRET` não sobem, porque o
     site não os usa.
5. **O agendador da reconciliação, a cada 5 minutos.** A Uber pede 5 minutos e
   o Mercado Pago, 10: um agendador só serve aos dois.
   - Minha recomendação é o `pg_cron` com `pg_net` no Supabase de produção,
     chamando a rota com o `TAREFAS_SEGREDO` guardado no Vault. Ele funciona
     em qualquer plano de hospedagem; o plano gratuito da Vercel só roda
     agendamento uma vez por dia.
   - A URL e o segredo entram pela configuração do ambiente, não pela
     migration. Assim o banco de desenvolvimento não chama a produção.
6. **A varredura de segredo** do build de produção sai limpa. O
   `npm run build` já roda a varredura.
7. **(dono) O primeiro pedido de verdade.**
   - É uma compra real, paga com Pix e entregue de verdade, num endereço do
     dono ou da loja. Ela prova o caminho inteiro: pagamento, aviso, corrida e
     entrega.
   - Não há como fazer um pedido de produção sem corrida. Com o Mercado Pago
     em produção, a cotação de exemplo é recusada, e a Uber também tem de
     estar em produção (`ambientesCombinam`).
   - Depois, um estorno pelo painel do Mercado Pago, para a equipe conhecer o
     caminho dela.

## 11. Junto com a sessão da entrega

| O quê | Combinado |
| --- | --- |
| Banco de desenvolvimento | um só para as duas sessões; migration ou `create or replace` em função compartilhada só depois de combinar |
| `aplicarRespostaDoMp` | a T9 liga a corrida aqui; o pagamento não reescreve esta função sem combinar |
| `registrarEventoWebhook` (`src/lib/dados/pagamentos.ts`) | a T10 troca a origem fixa `'mercadopago'` por um parâmetro; o pagamento não mexe nela sem combinar |
| Rota da reconciliação e `npm run reconciliar` | são da T11; até lá, o ensaio usa `curl` |
| `TAREFAS_SEGREDO` | nasce no ensaio do pagamento; a amo-fa é avisada |
| Túnel | um só, se as datas baterem com a T13 |
| Branches | a do pagamento parte da branch da entrega e entra depois dela, refeita sobre a última versão |
| Conversa | por mensagem entre as sessões; antes de mexer num arquivo compartilhado, eu aviso |
| `src/app/sacola/acoes.ts` | a §8 mexe em `pagar` e em `conferirCartao` (o campo novo do Device ID); a T8 mexe em `cotarEntrega`. A §8 entra na branch do pagamento antes do ensaio no navegador, com aviso, e o conflito, se houver, se resolve no rebase. (minha decisão, a partir da revisão) |

## 12. Como provar

- O roteiro (§5) e o ensaio no navegador (§6), anotados em
  `supabase/README.md`.
- Testes Vitest para cada correção (§7) e para o Device ID e os itens (§8):
  - o corpo e o cabeçalho de cada criação de pedido;
  - o Device ID ausente ou torto não barra o pagamento;
  - os itens somam o total;
  - nenhum valor da página entra nos itens.
- Antes de cada commit: `npx vitest run`, `npx tsc --noEmit`, `npm run lint` e
  `npm run build` (que roda a varredura de segredos).

## 13. Deixado para quem constrói

- Os nomes dos arquivos e das funções novas, e a forma da saída do roteiro.
- O formato exato aceito para o Device ID, depois de ver o valor de verdade.
- Onde ler os itens no servidor: na camada de dados que já lê o pedido para
  pagar, ou numa função nova dela.
- O texto do README.

## 14. Em aberto

- A hospedagem e o domínio (backend §18), e o plano da hospedagem.
- Se a API aceita a entrega como item. O roteiro responde.
- Se o vendedor de teste precisa de chave Pix para criar o Pix de teste. O
  roteiro responde; se precisar, o dono cria uma chave no painel do usuário de
  teste.
