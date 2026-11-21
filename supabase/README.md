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
| `09_conta_guarda.sql` | 6 | 25 |
| `10_porta.sql` | 0 | 13 |
| `11_pagamento_pelo_servidor.sql` | 4 | 16 |
| `90_permissoes.sql` | 2 | 86 |
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

  Limpar depois: os itens de pedido são imutáveis (gatilho
  `itens_imutaveis`); numa transação, `disable trigger`, apagar os itens,
  `enable trigger`, apagar pagamentos e pedidos, e só então a conta.
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
`pagamentos_a_cancelar_no_mp`, `mp_pedido_da_tentativa`,
`registrar_evento_webhook`, `concluir_evento_webhook`, `aplicar_entrega` e
`consumir_limite`. A chave secreta não lê nenhuma tabela.

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

## Tarefas agendadas (`pg_cron`)

| Tarefa | Quando | O que faz |
| --- | --- | --- |
| `amo-expirar-pedidos` | a cada 5 minutos | pedido aguardando pagamento há mais de 60 minutos é cancelado |
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

### O que é do dono, no painel do Mercado Pago

1. **URL do aviso:** `<site>/api/webhooks/mercadopago`.
2. **Eventos:** "Order (Mercado Pago)" e "Chargebacks".
3. **Assinatura secreta** do aviso, em `MERCADOPAGO_WEBHOOK_SECRET`.
4. **Credenciais de teste:** o Access Token em `MERCADOPAGO_ACCESS_TOKEN` e a
   chave pública em `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`.
5. `MERCADOPAGO_AMBIENTE=teste` enquanto as credenciais forem de teste.
