# Banco da AMO (Supabase)

O desenho está em `docs/superpowers/specs/2026-11-18-amo-backend-design.md`;
este arquivo diz como mexer no banco sem quebrar o que o desenho garante.

- **Projeto:** `yuhrtuizxuvqvvjtcemz`, o banco de **desenvolvimento**. A
  produção nasce num projeto novo, com estas mesmas migrations (spec §15,
  etapa 4).
- **MCP:** `supabase-amo`. O `claude_ai_Supabase` aponta para outra
  organização e não deve ser usado.

## Migrations

Em `migrations/`, na ordem da versão. Cada arquivo tem o nome que o Supabase
registrou (`<versão>_<nome>.sql`), para o histórico do repositório e o do
banco baterem.

| Migration | O que cria |
| --- | --- |
| `base_fechada` | tira os acessos automáticos de `public`; cria o schema `privado` |
| `catalogo` e `carga_catalogo` | catálogo, horário (9h às 18h) e loja; a carga traz os preços de **exemplo** |
| `perfis` | perfil e o gatilho de cadastro (aceite dos termos, versão `2026-11-18`) |
| `enderecos` | até 5 por cliente, um principal |
| `pedidos` | pedidos, itens, pagamentos e as máquinas de estado |
| `fechamento` | `criar_pedido`, `iniciar_pagamento`, `cancelar_pedido`, cotação |
| `pagamento` | aplicar o que o Mercado Pago diz, avisos, entrega e limites |
| `pagamento_pelo_servidor` | `pagamentos_a_cancelar_no_mp` e `mp_pedido_da_tentativa`, para o servidor falar com o Mercado Pago |
| `comentarios` | comentário com nota, só de quem recebeu, moderado |
| `conta_e_guarda` | exclusão de conta, auditoria, expiração, guarda e as tarefas agendadas |
| `porta` | a porta da API de dados (spec §5, regra 6) |
| `ajustes_desempenho` | índice e regra de leitura apontados pelo conselheiro |
| `selos_ordem` | a ordem dos selos, para o filtro do catálogo sair na ordem do cadastro |
| `domingo_fechado` | a loja não abre aos domingos (fica 9h às 18h, de segunda a sábado) |
| `tentativas_a_cancelar_da_cliente` | as tentativas de todos os pedidos de uma cliente que o Mercado Pago ainda tem abertas, para o servidor cancelar lá |
| `expiracao_espera_o_pix` | o pedido não expira enquanto tiver um Pix pendente ainda válido |

Para aplicar uma migration nova: escrever o arquivo, aplicar com o MCP
(`apply_migration`), conferir a versão com `list_migrations` e dar ao
arquivo o nome `<versão>_<nome>.sql`. Nunca editar uma migration já
aplicada: corrigir é migration nova.

## Testes

Em `tests/`. Cada teste roda numa chamada só: o conteúdo de
`tests/_apoio.sql` seguido do conteúdo do teste. Tudo acontece numa
transação que o próprio teste desfaz no fim; nada fica gravado. O resultado
é uma linha `RESUMO` e uma linha por verificação, as falhas primeiro.

| Teste | Spec §14 | Verificações |
| --- | --- | --- |
| `01_base.sql` | 2 | 7 |
| `02_catalogo.sql` | 1 | 21 |
| `03_perfis.sql` | 1 e 6 | 29 |
| `04_enderecos.sql` | 1 | 20 |
| `05_pedidos.sql` | 1 e 4 | 37 |
| `06_fechamento.sql` | 3 | 63 |
| `07_pagamento.sql` | 4 e 5 | 46 |
| `08_comentarios.sql` | 1 | 23 |
| `09_conta_guarda.sql` | 6 | 34 |
| `10_porta.sql` | 0 | 13 |
| `11_pagamento_pelo_servidor.sql` | 4 | 26 |
| `90_permissoes.sql` | 2 | 88 |
| `91_injecao.sql` | 7 | 132 |

E o teste da porta por HTTP de verdade, pela internet:

```bash
node scripts/testar-porta.mjs
```

E os testes do site contra o banco de desenvolvimento (precisam do
`.env.local`; ficam fora do `npm test`; com o CAPTCHA ligado no painel,
precisam também do token falso da Cloudflare, ver o item 4 de "O painel do
Auth"):

```bash
npm run test:banco
```

E, depois de todo build e antes de publicar, a varredura do que vai ao
navegador (falha se um segredo do servidor estiver em `.next/static`):

```bash
npm run build && npm run varrer
```

Rodar `90_permissoes.sql` e o conselheiro de segurança (`get_advisors`)
depois de toda migration. O inventário lista cada permissão que anon,
authenticated e service_role têm; uma tabela, coluna ou função nova sem
decisão quebra o teste até entrar na lista `_esperado`. O conselheiro deve
apontar só o que é de propósito: as tabelas de `privado` sem regra de acesso
(ninguém da API lê) e as 7 funções chamáveis (as 6 da cliente e
`conferir_porta`).

Dois desvios do desenho na etapa 1, por limite do ambiente, fechados na
etapa 2 (2026-11-20):

- **Teste 6.** Nos testes SQL, a exclusão de conta roda como `postgres`, não
  como `supabase_auth_admin` (o `postgres` não pode assumir esse papel); o
  teste confere que os gatilhos em `auth.users` rodam como o dono, seja quem
  for que apague. **Fechado** pela API do Auth com a chave secreta,
  `scripts/testar-exclusao.mjs`:
  1. `node scripts/testar-exclusao.mjs` cria uma cliente de ensaio e imprime
     o `id`.
  2. Pelo MCP, com esse `id`: um pedido entregue, um comentário e um
     endereço.
  3. `node scripts/testar-exclusao.mjs --apagar <id>`.
  4. Pelo MCP: o usuário, o perfil, o endereço e o comentário somem; o pedido
     fica, com `user_id` nulo, `anonimizado_em` preenchido, nome, celular,
     e-mail, rua, número e complemento nulos e o CEP com 5 dígitos.
  5. Uma segunda cliente com um pedido `pago`: o `--apagar` falha (o Auth
     responde 500, porque o gatilho recusa) e o usuário continua existindo.

  Limpar depois, numa transação só: apagar `privado.pagamentos_mp` (os ids
  do Mercado Pago de cada pagamento) e `privado.entregas` dos pedidos da
  conta, e as cotações dela em `privado.cotacoes`; os itens de pedido são
  imutáveis (gatilho `itens_imutaveis`): `disable trigger`, apagar os itens,
  `enable trigger`; apagar pagamentos e pedidos. Só então a conta, pela API
  do Auth.
- **Teste 0.** Pela internet, o teste era feito só como visitante; com o
  token de uma cliente, a porta era testada por dentro do banco
  (`10_porta.sql`). **Fechado**: com `SUPABASE_SECRET_KEY` no `.env.local`,
  `node scripts/testar-porta.mjs` cria uma cliente de ensaio, pega o token
  dela pelo link mágico do admin e confere que, sem `x-amo-porta`, nem o
  próprio perfil sai (401 `AMO401`) e que, com a porta, sai uma linha só, a
  dela. Apaga a cliente no fim e nunca imprime o token.

## Produto novo pelo painel

O site relê o catálogo a cada 5 minutos, e um produto novo aparece na home e
no catálogo sem deploy; a página dele nasce na primeira visita. A foto, porém,
mora em `public/produtos/` e só chega com um deploy. Então: primeiro publicar
o site com a foto, depois inserir a linha em `produtos` (com `imagem_src`,
largura e altura da foto). Ao contrário, o site mostra o produto com a foto
quebrada até o deploy.

## Segredo da porta

A API de dados só responde a quem manda o cabeçalho `x-amo-porta` com o
segredo. O segredo fica só no `.env.local` (`SUPABASE_PORTA`, fora do git) e
no servidor de hospedagem; o banco guarda só o hash, em `privado.porta`.
O hash **não** está em migration: num projeto novo, ele é gravado à mão.

Gerar e gravar (num projeto novo, ou para trocar):

```bash
node -e "const c=require('crypto');const s=c.randomBytes(32).toString('base64url');console.log('segredo:',s);console.log('hash:',c.createHash('sha256').update(s).digest('hex'))"
```

```sql
insert into privado.porta (hash) values (decode('<hash>', 'hex'));
```

Para trocar sem derrubar o site: gravar o hash novo, trocar `SUPABASE_PORTA`
no servidor, conferir com `node scripts/testar-porta.mjs` e só então apagar
o hash antigo. Para desligar a porta:

```sql
alter role authenticator reset pgrst.db_pre_request;
notify pgrst, 'reload config';
```

## O painel do Auth (do dono)

O que a autenticação precisa e não mora em migration (desenho da
autenticação, §12). Vale para cada projeto, o de desenvolvimento e o de
produção.

1. **Já feito:** chave secreta, schema `privado` exposto, "Secure email
   change" e "Require current password".
2. **Código de 6 dígitos:** Authentication, Sign In / Providers, linha
   Email, "Email OTP Length" em 6 (no mesmo painel ficam os itens 3 e 5). O
   projeto de desenvolvimento nasceu com 8 e foi acertado em 2026-11-20; a
   tela e a regra do código contam 6, e um código de 8 é recusado.
3. **Código vale no máximo 1 hora** ("Email OTP Expiration" em 3600), com a
   confirmação de e-mail ligada.
4. **CAPTCHA:** Turnstile ligado, com o segredo da Cloudflare. O site recebe
   só a chave pública (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`); em desenvolvimento,
   a chave de teste `1x00000000000000000000AA` com o segredo de teste
   `1x0000000000000000000000000000000AA`, que sempre passam.
   **Ao ligar no projeto de desenvolvimento**, os testes de banco
   (`npm run test:banco`) passam a precisar de um token: o Supabase recusa
   sem ele entrar, cadastrar, reenviar o código, pedir o código de
   recuperação e excluir a conta, e a ação responde `captcha`. Hoje
   `tests/banco/auth.test.ts` chama entrar, pedir o código e excluir sem
   token. Acrescentar ao `formulario()` desse arquivo o campo
   `'cf-turnstile-response': 'XXXX.DUMMY.TOKEN.XXXX'`, o token falso que a
   Cloudflare documenta para testes: o segredo de teste o aceita, o de
   produção o recusa. Por isso esses testes nunca rodam contra a produção.
   Confirmar o código e trocar a senha com o código não pedem token.
5. **Senha:** mínimo 8; proteção contra senha vazada (plano Pro).
   "Secure password change" (reautenticação) **desligado**: com ele, quem
   está logada há mais de 24 horas não troca a senha em Minha conta (o
   Supabase devolve `reauthentication_needed`, e a tela pede para sair e
   entrar de novo). Ele não protege nada a mais: a troca já confere a senha
   atual num login à parte (`senhaConfere`). O "Require current password"
   do item 1 não foi cumprido pelo projeto de desenvolvimento no teste de
   2026-11-20 (a troca passou com a senha atual errada); por isso o código
   confere a senha por conta própria. Na produção, conferir os dois.
6. **URLs:** Site URL e a lista de redirecionamento só com
   `<site>/auth/callback`.
7. **SMTP próprio** antes de ir ao ar. O envio embutido só entrega a quem é
   membro da organização e tem um limite baixo por hora. Com o limite
   estourado, a tela responde como se tivesse enviado (desenho §8).
8. **Os três modelos de e-mail**, com o texto abaixo.

**Confirm signup.** Assunto: `Confirme o seu e-mail na AMO`

```html
<p>Olá!</p>
<p>Para confirmar o seu e-mail e terminar de criar a conta na AMO, digite este código no site:</p>
<p style="font-size:28px;letter-spacing:6px">{{ .Token }}</p>
<p>O código vale por 1 hora. Se não foi você quem pediu, é só ignorar este e-mail.</p>
<p>AMO Sabores Saudáveis</p>
```

**Reset password.** Assunto: `Seu código para criar uma senha nova`

```html
<p>Olá!</p>
<p>Para criar uma senha nova na AMO, digite este código no site:</p>
<p style="font-size:28px;letter-spacing:6px">{{ .Token }}</p>
<p>O código vale por 1 hora. Se não foi você quem pediu, a sua senha continua a mesma: é só ignorar este e-mail.</p>
<p>AMO Sabores Saudáveis</p>
```

**Change email address.** Assunto: `Confirme a troca de e-mail na AMO`

```html
<p>Olá!</p>
<p>Recebemos o pedido para trocar o e-mail da sua conta na AMO de {{ .Email }} para {{ .NewEmail }}.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change">Confirmar a troca de e-mail</a></p>
<p>Se não foi você quem pediu, ignore este e-mail: nada muda.</p>
<p>AMO Sabores Saudáveis</p>
```

## O que o servidor do site chama

O navegador não fala com o Supabase. O servidor fala, sempre com o cabeçalho
da porta.

**Com a sessão da cliente** (chave publicável): leitura das tabelas de
`public` (colunas explícitas, nunca `*` em `comentarios`) e as funções
`criar_pedido`, `iniciar_pagamento`, `cancelar_pedido`, `enviar_comentario`,
`definir_marketing` e `pode_excluir_conta`.

**Com a chave secreta** (só em módulo `server-only`): as funções de
`privado`, com `.schema('privado').rpc(...)`. Para isso o schema `privado`
precisa entrar em "Exposed schemas" no painel (spec §13, item 1); visitante
e cliente continuam sem acesso a ele. `registrar_cotacao`,
`aplicar_pagamento`, `pagamentos_a_reconciliar`,
`pagamentos_a_cancelar_no_mp`, `tentativas_a_cancelar_da_cliente`,
`mp_pedido_da_tentativa`,
`registrar_evento_webhook`, `concluir_evento_webhook`, `consumir_limite`,
`faixa_valida` e as da corrida na Uber (`reservar_corridas`,
`marcar_corrida_criada`, `marcar_corrida_falhou`, `remarcar_entrega`,
`aplicar_entrega`, `corridas_a_cancelar`, `corrida_cancelada`,
`corrida_nao_cancelavel` e `corridas_a_conferir`). A chave secreta não lê
nenhuma tabela.

Os erros de regra chegam com SQLSTATE `P0001` e a mensagem igual a um
código curto, que o servidor traduz para a tela:

| Onde | Códigos |
| --- | --- |
| cadastro | `termos_nao_aceitos`, `termos_desatualizados`, `nome_invalido`, `celular_invalido` |
| fechamento | `sem_sessao`, `email_nao_confirmado`, `loja_fechada`, `itens_invalidos`, `produto_indisponivel`, `cotacao_invalida`, `cotacao_vencida`, `muitos_pedidos`, `total_mudou` |
| pagamento | `pedido_invalido`, `forma_invalida`, `muitas_tentativas`, `status_invalido`, `pagamento_invalido` |
| comentário | `comentario_nao_permitido`, `nota_invalida`, `texto_invalido` |
| conta | `pedido_em_aberto`, `limite_de_enderecos` |
| guardas | `passagem_invalida`, `campo_imutavel`, `rastreio_invalido`, `limite_invalido` |
| corrida | `corrida_invalida`, `motivo_invalido`, `faixa_indisponivel`, `status_invalido`, `rastreio_invalido` |

## Tarefas agendadas (`pg_cron`)

| Tarefa | Quando | O que faz |
| --- | --- | --- |
| `amo-expirar-pedidos` | a cada 5 minutos | pedido aguardando pagamento há mais de 60 minutos é cancelado, e a tentativa pendente dele expira; com um Pix pendente ainda válido (`pix_expira_em` no futuro), o pedido espera o Pix acabar |
| `amo-guarda` | todo dia, 6h UTC | apaga o que passou do prazo (spec §12) |

## Mercado Pago

### A reconciliação

A rota `POST /api/tarefas/reconciliar` confere as tentativas de pagamento
paradas, cancela as que a criação nunca respondeu, tenta de novo os estornos
devidos e cancela no Mercado Pago o que terminou do lado de cá. Numa passada
só, com prazo de 50 s. Responde apenas `{ "conferidas", "canceladas", "falhas" }`.

```bash
curl -X POST -H "Authorization: Bearer $TAREFAS_SEGREDO" <site>/api/tarefas/reconciliar
```

`TAREFAS_SEGREDO` é a senha da tarefa (sem ela, 401; sem a variável no
servidor, 500). Chamar a cada 10 minutos pelo agendador da hospedagem
(etapa 4).

Fora da reconciliação, o servidor cancela no Mercado Pago as tentativas da
cliente que terminaram do lado de cá (`tentativas_a_cancelar_da_cliente`)
logo depois de ela fechar um pedido novo e antes de cada cobrança nova: o QR
de um pedido antigo deixa de valer. Se cancelar lá mostrar que o pedido
acabou de ser pago, a cobrança nova não é criada.

### O que é do dono, no painel do Mercado Pago

1. **URL do aviso:** `<site>/api/webhooks/mercadopago`.
2. **Eventos:** "Order (Mercado Pago)" e "Chargebacks".
3. **Assinatura secreta** do aviso, em `MERCADOPAGO_WEBHOOK_SECRET`.
4. **Credenciais de teste:** o Access Token em `MERCADOPAGO_ACCESS_TOKEN` e a
   chave pública em `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`.
5. `MERCADOPAGO_AMBIENTE=teste` enquanto as credenciais forem de teste.

#### O portão do cartão: o ensaio com a chave de teste

O cartão (o Card Payment Brick, a CSP dele e o desafio do banco, 3DS) só foi
testado com dublês que imitam o SDK e o servidor; nunca rodou com o Mercado
Pago de verdade. Sem `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, só o Pix aparece.
Antes de ligar a chave pública para as clientes, o cartão é ensaiado no
servidor de desenvolvimento com as credenciais de teste (os cartões e os
nomes do titular estão no contrato do Mercado Pago, §5), e o resultado fica
registrado aqui:

- o Brick visível a 390 e 1440 px;
- o console sem violação de CSP (connect, frame, font, img);
- `APRO` aprova;
- `OTHE` recusa e deixa tentar de novo, com um token novo a cada `getFormData`;
- `CONT` fica pendente;
- `APRO-CHOK` mostra o desafio, e ele fica na tela até o resultado.

O mesmo ensaio confirma que o `getAdditionalData` do Brick traz o
`paymentTypeId` (contrato, §6): sem ele, todo cartão termina em "Confira os
dados do cartão." e nada é cobrado.

Resultado: ainda não ensaiado (falta a chave de teste do dono).

### O ensaio com o Mercado Pago falso

Para percorrer a sacola de ponta a ponta no navegador sem credenciais do
Mercado Pago, o servidor de ensaio carrega `scripts/ensaio/mercadopago-falso.mjs`.
Ele troca o `fetch` só para `https://api.mercadopago.com/v1/orders`; qualquer
outro endereço passa para o de verdade. O site nunca importa esse arquivo.

```bash
NODE_OPTIONS=--import=./scripts/ensaio/mercadopago-falso.mjs \
MERCADOPAGO_ACCESS_TOKEN=APP_USR-ensaio MERCADOPAGO_WEBHOOK_SECRET=ensaio \
npm run dev
```

No PowerShell (a máquina de desenvolvimento é Windows):

```powershell
$env:NODE_OPTIONS = '--import=./scripts/ensaio/mercadopago-falso.mjs'
$env:MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-ensaio'
$env:MERCADOPAGO_WEBHOOK_SECRET = 'ensaio'
npm run dev
```

No PowerShell as variáveis ficam na janela até ela fechar. No fim do ensaio,
`Remove-Item Env:NODE_OPTIONS, Env:MERCADOPAGO_ACCESS_TOKEN, Env:MERCADOPAGO_WEBHOOK_SECRET`.

- As duas variáveis vão no ambiente do processo, nunca no `.env.local`
  (`MERCADOPAGO_AMBIENTE=teste` já está nele). Sem a chave pública, só o Pix
  aparece.
- O falso só responde com `MERCADOPAGO_AMBIENTE=teste` e fora de um build de
  produção (`NODE_ENV=production`): sem isso, a chamada vai ao Mercado Pago de
  verdade, e o terminal diz `[ensaio] Mercado Pago falso desligado`.
- O terminal diz `[ensaio] Mercado Pago falso ligado neste processo` em cada
  processo e uma linha por chamada que ele respondeu (`POST /v1/orders 201
  action_required/waiting_transfer`, depois `GET /v1/orders/<id> 200
  processed/accredited`). Sem essas linhas o falso não entrou: nada de ensaio.
- O Pix nasce com um QR de ensaio e o copia e cola `00020126-ensaio` e passa a
  pago 20 s depois de criado; cancelar e estornar respondem como o contrato
  (`docs/superpowers/specs/2026-11-21-amo-mercadopago-orders.md`, seções 1 a
  3); o cartão aprova na hora. O teste `tests/ensaio-mercadopago-falso.test.ts`
  confere o falso pelo cliente de verdade.
- A conta de ensaio nasce por `admin.auth.admin.createUser` com
  `email_confirm: true`, nunca pelo cadastro do site (a cota de e-mail do
  projeto é pequena). O Turnstile de teste deixa entrar.
- Loja fechada na hora do ensaio: abrir um horário temporário em
  `public.horarios` e, no fim, voltar a segunda a sábado, das 9h às 18h, sem
  linha de domingo, conferindo com `select * from public.horarios order by 1`.
  Para ver a loja fechada, `update public.loja set vendas_pausadas = true` por
  um instante, e de volta a `false`.
- No fim: a limpeza de "Limpar depois" (seção Testes) para a conta de ensaio,
  as cotações sem conta feitas no ensaio, a conta pela API do Auth e o
  servidor parado. No Windows, conferir que a porta 3000 ficou livre: o
  processo do Next pode sobrar depois de parar o `npm run dev`.

## Uber Direct: o que o ensaio mostrou

Ensaio de 2026-11-23 na conta de teste (`scripts/ensaio/uber-conta-de-teste.mjs`,
rodado com `UBER_DIRECT_AMBIENTE=teste node --env-file=.env.local ...`).

- A faixa de 1 hora foi aceita (coleta de s-30 a s, entrega de s a s+60): as
  constantes são 60/30; o fallback de 4 horas não foi preciso.
- `leave_at_door` com foto de entrega foi aceito.
- O `tracking_url` tem host `direct-order.uber.com`.
- A cotação não traz `live_mode`; só a corrida criada traz. O portão de teste
  fica na resposta de `POST /deliveries`: se `live_mode` não for exatamente
  `false`, cancelar na hora e parar.
- Raio máximo de entrega de 3,11 milhas (5 km) a partir da cozinha: além dele a
  cotação volta `address_undeliverable`. A Av. Paulista ficou fora; o destino
  fixo do ensaio é a Rua Visconde de Parnaíba, 1316, Mooca.
- Ids: cotação `dqt_`, corrida `del_`. Cancelar a corrida responde 200 com
  `status: canceled`.
- Atenção: um primeiro ensaio rodou com chaves de produção, mas só cotou (nenhuma
  corrida criada). Use sempre as chaves de teste no ensaio.

## Uber Direct: variáveis, Uber falsa e operação

### As variáveis (só do servidor, nunca `NEXT_PUBLIC_`)

| Variável | Para quê |
| --- | --- |
| `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET` | a conta e a credencial OAuth; com as três, a cotação é a da Uber |
| `UBER_DIRECT_WEBHOOK_SECRET` | a chave que confere a assinatura do aviso em `/api/webhooks/uber` |
| `UBER_DIRECT_AMBIENTE` | `teste` na conta de teste; sem ela o servidor se comporta como produção |
| `COZINHA_ENDERECO` | JSON com logradouro, número, complemento, bairro, cidade, uf, cep e telefone da cozinha |
| `TAREFAS_SEGREDO` | a senha de `/api/tarefas/reconciliar` e de `npm run reconciliar` |

O modelo é `.env.example`. A conta de teste e a de produção são credenciais
diferentes; o ambiente do Mercado Pago e o da Uber têm de combinar (os dois em
teste ou os dois em produção).

### A Uber falsa

`scripts/ensaio/uber-falsa.mjs` faz com a Uber o que o Mercado Pago falso faz com
o Mercado Pago: troca o `fetch` só para `auth.uber.com` e `api.uber.com` e
responde como a conta de teste. O site nunca o importa. Para rodar com as duas
falsas, no PowerShell:

```powershell
$env:NODE_OPTIONS = '--import=./scripts/ensaio/as-duas-falsas.mjs'
$env:MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-ensaio'
$env:MERCADOPAGO_WEBHOOK_SECRET = 'ensaio'
npm run dev
```

No fim, `Remove-Item Env:NODE_OPTIONS, Env:MERCADOPAGO_ACCESS_TOKEN, Env:MERCADOPAGO_WEBHOOK_SECRET`.

- **Um `--import` só.** `as-duas-falsas.mjs` importa o Mercado Pago falso e a
  Uber falsa. Com dois `--import` no `NODE_OPTIONS`, o processo do Next que roda
  o site ficou só com o último (a Uber falsa) e o Pix foi ao Mercado Pago de
  verdade (403). Para só a Uber falsa, `--import=./scripts/ensaio/uber-falsa.mjs`.
- **Antes de qualquer compra,** conferir no terminal a linha `[ensaio] Uber falsa
  ligada neste processo`. O `.env.local` tem as credenciais de teste de
  verdade: sem essa linha, o servidor falaria com a Uber de teste de verdade.
- Só vale com `UBER_DIRECT_AMBIENTE=teste` e fora de `NODE_ENV=production`;
  senão o terminal diz `[ensaio] Uber falsa desligada` e a chamada vai à Uber.
- O token é fixo e dura 30 dias. A cotação traz `dqt_...`, `currency: brl` e um
  `fee` em centavos que cresce com os dígitos do CEP, sem `live_mode` (como a
  real). A corrida traz `del_...`, `live_mode: false` e um `tracking_url` em
  `direct-order.uber.com`; a cada `GET` ela anda `pending`, `pickup`,
  `pickup_complete`, `dropoff` e `delivered`, de 20 em 20 s desde a criação
  (o id carrega a hora, como o do Mercado Pago). Cancelar devolve `canceled`;
  de novo, ou com a corrida já entregue, 409.
- Cada chamada respondida aparece no terminal (`[ensaio] Uber falsa: GET
  /deliveries/<id> 200 pickup`). O teste `tests/ensaio-uber-falsa.test.ts`
  confere o falso pelo cliente de verdade.
- O falso não manda aviso (webhook): quem leva o pedido adiante é
  `npm run reconciliar`, que lê a corrida pelo `GET`.
- Limpar depois: igual ao ensaio do Mercado Pago (seção Testes, "Limpar
  depois"), incluindo `privado.entregas` e `privado.cotacoes`.

### Operação

Corridas que a equipe precisa olhar (`precisa_da_equipe`), com o motivo:

```sql
select e.pedido_id, p.numero, e.estado, e.motivo, e.atualizado_em
from privado.entregas e join public.pedidos p on p.id = e.pedido_id
where e.estado = 'precisa_da_equipe'
order by e.atualizado_em;
```

Fechar uma data (feriado, folga): inserir em `dias_fechados`. A faixa daquele dia
deixa de aparecer na sacola; para reabrir, apagar a linha.

```sql
insert into public.dias_fechados (data, motivo) values ('2026-12-25', 'Natal');
```

### O portão na conta de teste da Uber (2026-11-24)

Ensaio com a Uber de verdade, em teste (`UBER_DIRECT_AMBIENTE=teste`, Robo Courier
em modo `auto`), o Mercado Pago falso e um túnel `trycloudflare` para o aviso,
com a conta de ensaio criada pelo admin do Auth. Destino: Rua Visconde de
Parnaíba, 1316, Mooca. Pedidos `AMO-A8XPCCR4` (agora), `AMO-CBM83U84`
(agendado, cancelado) e `AMO-UCY36BHG` (agora).

- **Cotação real nos dois modos: confere.** Agora: R$ 18,10, `origem uber`, id
  `dqt_`. Agendado (faixa das 16h às 17h): o mesmo valor, `modo agendado`.
- **Corrida criada com o pagamento: confere.** Os três pedidos pagos criaram
  a corrida (`del_`, `live_mode` falso, senão o código cancelaria), com o Robo
  Courier. O agendado levou a faixa na criação.
- **Avisos assinados: confere, depois de corrigir o painel.** Nos dois
  primeiros ensaios (cerca de 20 minutos cada, sem reconciliar) nenhum aviso
  chegou, porque o webhook tinha sido criado no ambiente de **produção** da
  Uber e as chaves do `.env.local` são de **teste**. Com o webhook criado no
  ambiente de teste, na mesma URL, os avisos passaram a chegar, mas primeiro
  com 401: **cada ambiente tem a própria chave de assinatura**, e o
  `UBER_DIRECT_WEBHOOK_SECRET` ainda era o da outra. Trocada a chave, a Uber
  reenviou os avisos retidos e eles deram 200. Pedido `AMO-FZZKBYYE` (agora, Pix),
  sem reconciliar: 7 avisos, todos 200; `a_caminho_em` às 18:14:10 UTC e
  `entregue_em` às 18:15:09 UTC, o pedido "entregue" 3 minutos e meio depois de
  pago, só por aviso. `privado.eventos_webhook` (origem `uber`, tipo
  `event.delivery_status`): todos concluídos, nenhum com erro, 1 tentativa. O pedido
  mover-se prova que o corpo traz no topo `kind`, `id`, `delivery_id` e `status`,
  os campos que a rota exige (o corpo não é guardado). **Lição:** o webhook tem
  de ser criado no mesmo ambiente das chaves (teste ou produção), e a chave de
  assinatura é de cada ambiente; ao passar para produção, criar o webhook lá e
  trocar `UBER_DIRECT_WEBHOOK_SECRET`.
- **Link de rastreio: confere.** `https://direct-order.uber.com/br/orders/<uuid>?tenancyOverride=...`
  responde 200 com HTML (a página é aplicativo de página única; o conteúdo
  não foi lido num navegador).
- **Cancelar o pedido pago pelo banco: confere.** `update public.pedidos set
  status = 'cancelado', motivo_cancelamento = 'loja'` leva a entrega a
  `a_cancelar`; a reconciliação seguinte a cancelou na Uber
  (`corridas.canceladas: 1`) e a entrega ficou `cancelada`.
- **`fee` cobrado igual ao cotado: confere.** Nos três pedidos o frete do
  pedido e `entregas.valor_uber_centavos` valem 1810.
- **Aceito pela Uber na criação:** o celular de cotação de marcador de lugar na
  cotação e o celular real da cliente na corrida, `undeliverable_action:
  leave_at_door` com foto de entrega, `external_id`, `manifest_total_value` e o
  preço dos itens em centavos. Nenhuma criação foi recusada.

Achado no ensaio, já corrigido (d0df8fa): a cotação **com janela** traz
`duration` e `pickup_duration` contando o tempo até a janela (1237 e 1205
minutos para uma janela de amanhã às 10h), e `privado.cotacoes` só aceita
`minutos` de 1 a 600 (`cotacoes_minutos_check`). Uma faixa a mais de cerca de
10 horas falhava em `registrar_cotacao` (23514) e a sacola mostrava "Não deu
certo agora". Agora a cotação `agendado` guarda `minutos` igual à duração da
faixa (`FAIXA.duracaoMin`, 60), e não o tempo até a janela; o "chega em X
minutos" vale depois que o pedido sai.

Para ensaiar o agendado com a loja fechada, sem tela de escolha da faixa:
`delete`/`insert` em `public.horarios` do dia de hoje com abertura mais tarde,
cotar (a primeira faixa livre vira a cotação `agendado`), abrir o horário para o
botão do pagamento ligar, pagar, e voltar a segunda a sábado, das 9h às 18h.

### O que é do dono

- **Política de privacidade** (ainda não escrita, backend §18): precisa citar a
  Uber como quem entrega e que recebe nome, celular e endereço da cliente
  (spec da entrega, §12).
- As credenciais do Uber Direct (de teste e, depois, de produção), a URL do
  aviso e a chave de assinatura dele, no painel `direct.uber.com`.

### O ensaio de ponta a ponta (Uber falsa e Mercado Pago falso)

Ensaio de 2026-11-24, 0h, no Edge headless por CDP, com `npm run dev` e as duas
falsas (as linhas `[ensaio] ... ligada` apareceram antes de qualquer compra),
numa conta criada por `admin.auth.admin.createUser` e entrando com senha.
O endereço foi a Rua Visconde de Parnaíba, 1316 (CEP 03045-000).

- **Agora, com Pix** (pedido `AMO-QE88YXFG`): cotação `dqt_ensaio_...` de R$ 10,40
  (R$ 8,00 mais 20 centavos por unidade da soma dos dígitos do CEP, 12); o Pix
  falso passou a pago 20 s depois; o pagamento aprovado criou a corrida
  (`POST /deliveries`, `pending`) e o pedido ficou "pago, na fila".
- **Agendado para amanhã, das 11h às 12h** (pedido `AMO-EKX2TSSV`): janela em
  `privado.cotacoes` de 14h a 15h UTC; mesma sequência, corrida criada.
- **Reconciliação:** `npm run reconciliar` só pergunta à Uber as corridas
  caladas há mais de 10 minutos (`corridas_a_conferir`). Antes disso ela
  responde `conferidas: 0`. Aos 10 minutos, com o relógio do falso já em
  `delivered`, cada corrida foi lida uma vez (`GET`, `delivered`) e o pedido
  foi direto a "entregue" em `/conta/pedidos/<numero>`, com "A caminho" e
  "Entregue" na mesma hora. Os estados do meio (`pickup`, `pickup_complete`,
  `dropoff`) não apareceram no site, porque nada avisa o servidor (o falso não
  manda webhook) e a reconciliação é a única leitura.
- Limpeza feita: pedidos, itens, pagamentos, entregas, cotações e a conta;
  horários de volta a segunda a sábado, das 9h às 18h, conferidos.

O que o ensaio mostrou:

- **Dois `--import` no `NODE_OPTIONS`** deixaram o processo do site só com a
  Uber falsa, e o Pix foi ao Mercado Pago de verdade (403, nada cobrado). Daí o
  `as-duas-falsas.mjs`.
- **A sacola ainda não deixa comprar com a loja fechada.** O servidor cota em
  modo `agendado` (a primeira faixa livre) e `fecharPedido` aceita, mas o botão
  do pagamento fica desligado ("Cozinha fechada agora") e não há como escolher
  a faixa na tela. O pedido agendado foi feito abrindo o horário de hoje depois
  de cotar (a cotação `agendado` já estava na sacola) e pondo a abertura de
  amanhã às 10h30, para a primeira faixa ser a das 11h. A tela de escolha da
  faixa e a compra agendada com a loja fechada ficam para a parte da interface.
- **Aviso (webhook):** não ensaiado aqui; é o que a Task 13 confere com a Uber
  de verdade.
