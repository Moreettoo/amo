# AMO · Entrega pelo Uber Direct · Parte A · O banco e o servidor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A entrega deixa de ser de exemplo: o servidor cota na Uber nos dois modos (agora e agendado, por faixa), o banco guarda o modo e a faixa no pedido, a corrida é criada sozinha quando o pagamento é confirmado, os avisos da Uber andam o pedido até "entregue", e a reconciliação cobre o que se perder. A tela de escolher o modo e a faixa é a Parte B.

**Architecture:** Mesma divisão da etapa 3. O banco decide (faixa válida, modo do pedido, a intenção da corrida gravada na mesma transação do pagamento, a máquina da corrida); a camada de dados em `src/lib/dados/` é a única que fala com ele; a Uber é chamada por `fetch`, sem SDK, em `src/lib/uber/` (endereço, token, cliente, corridas, assinatura), espelhando `src/lib/mercadopago/`. A corrida é pedida por `after()` a partir de `aplicarRespostaDoMp`, o único lugar por onde todo pagamento confirmado passa; a reconciliação é a rede de segurança.

**Tech Stack:** Next.js 16.3.2 (App Router, `after` de `next/server`), React 19, `@supabase/supabase-js`, Supabase (Postgres 17, Vault, MCP `supabase-amo`), Uber Direct DaaS API (`auth.uber.com`, `api.uber.com`), Vitest, Node 22.

**Spec:** `docs/superpowers/specs/2026-11-23-amo-entrega-uber-direct-design.md` (inteira; as seções citadas abaixo como "spec §n" são dela) e, para as regras gerais de segurança, `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (§5, §11, §14, §19). Ler as duas antes de começar.

## Decisões minhas que completam o desenho

1. **Uma tabela de faixas só, no TypeScript e no SQL, com as mesmas constantes:** duração `60` min, retirada começando `30` min antes da faixa, antecedência mínima hoje `90` min (retirada + 60), `7` dias à frente. A primeira faixa do dia começa na primeira hora cheia em ou depois de `abre + retirada`; as seguintes, de duração em duração, enquanto `início + duração ≤ fecha`. Com 9h–18h: 10h, 11h, …, 17h. Se a Task 1 mostrar que a conta só aceita janela de 240 min, as constantes viram `240` e `60` (antecedência `120`), e as faixas, 10h–14h e 14h–18h, sem mudar o algoritmo.
2. **A intenção da corrida nasce por gatilho, não dentro de `aplicar_pagamento`:** um gatilho `after update of status` em `pedidos` grava `privado.entregas` (`a_criar`) quando o pedido vira `pago`, na mesma transação. `aplicar_pagamento` não é reescrita.
3. **A corrida é criada por lote, não por id:** `privado.reservar_corridas(p_maximo)` pega as `a_criar` (e as `criando` paradas há mais de 2 min) com `for update skip locked`. O mesmo `criarCorridasPendentes()` serve ao `after()` do pagamento, ao aviso e à reconciliação; ninguém precisa saber o id do pedido.
4. **A remarcação é a única mudança permitida no retrato da entrega**, e só com a marca de sessão `amo.remarcando = 'sim'`, que `privado.remarcar_entrega` liga com `set_config(..., true)` (vale só na transação). O gatilho `guardar_pedido` recusa qualquer outra mudança de modo ou faixa, inclusive pelo painel.
5. **`faixa_valida` ganha `p_respeitar_pausa`:** verdadeiro na cotação e no `criar_pedido`; falso em `iniciar_pagamento` e na remarcação (pausar as vendas só impede pedido novo, spec §5.2).
6. **Sem as três credenciais da Uber, nada muda do jeito de hoje:** cotação de exemplo só com o Mercado Pago em teste, e `criarCorridasPendentes` não reserva nada. Uma cotação de exemplo que chegue a pedido pago vira `precisa_da_equipe` (`cotacao_de_exemplo`) quando a Uber estiver configurada.
7. **O endereço para a Uber**, montado sempre pela mesma função: `{"street_address":["<logradouro>, <numero>","<complemento> - <bairro>"],"city":…,"state":<uf>,"zip_code":"<5>-<3>","country":"BR"}`, com o segundo item só `<bairro>` quando não há complemento; chaves nessa ordem.
8. **`cotarEntrega` sem `modo`** (a página de produto e a sacola de hoje, até a Parte B): cota o agora se a loja está aberta, senão a primeira faixa livre; a resposta diz o modo e a faixa.
9. **Erros novos:** `agora_indisponivel` e `faixa_indisponivel` em `CodigoDoFechamento`, com os textos da spec §11.
10. **Limite da cotação: 30 por hora por IP** (spec §6).

## Fora deste plano

- A tela (Parte B, escrita depois dos esboços do Impeccable): a escolha do modo, do dia e da faixa na etapa de entrega; o texto do resumo, do pedido feito, da página de produto e da página do pedido. Até lá, a sacola e a página de produto continuam chamando `cotarEntrega` sem `modo` e funcionam (decisão 8), com o rótulo de hoje.
- Hospedagem, agendador de 5 min e URL definitiva do aviso: preparação para ir ao ar (spec §8.5).
- Painel da equipe e aviso ativo de `precisa_da_equipe`.

## Global Constraints

- Ler antes de tocar em rota ou ação (`AGENTS.md`): `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`, `01-app/02-guides/server-actions.md`, `data-security.md` e `01-app/03-api-reference/03-file-conventions/route.md`.
- Todo módulo de `src/lib/dados/` e de `src/lib/uber/` começa com `import 'server-only'`. Só `src/lib/dados/ambiente.ts` lê `process.env`. Nenhum `'use client'` importa `src/lib/uber/` nem `src/lib/dados/`.
- Ordem de toda ação (backend §11): sessão quando houver, campos, limite, banco ou Uber, tradução. Campo inválido não gasta limite.
- Nenhuma mensagem crua do banco ou da Uber sai do servidor; falha vai ao log só por `registrarFalha(onde, { code })`. Nada de nome, celular, endereço, token, `client_secret`, chave do aviso ou corpo da Uber em log.
- Nenhuma resposta da Uber é guardada inteira: só id, estado, valor e link de rastreio. Nada do entregador.
- Dinheiro em centavos inteiros; o frete da cliente só sai de `privado.cotacoes`.
- Toda chamada à Uber: `AbortSignal.timeout(6000)`, `cache: 'no-store'`, nunca lança (devolve `{ ok: false, status, codigo }`, status 0 sem resposta), só para `https://auth.uber.com/oauth/v2/token` e `https://api.uber.com/v1/customers/<customer_id>/...`.
- O servidor nunca acredita no corpo de um aviso: confere a assinatura no corpo cru, lê a corrida pelo `GET` e aplica o que a API disse.
- Migration aplicada não se edita; função mudada vai por `create or replace` (mesma assinatura) ou `drop` + `create` (assinatura nova), com o `grant` refeito. Depois de toda migration: regenerar `src/lib/dados/banco.ts` (mantendo `import 'server-only'` e o comentário do topo), atualizar e rodar `supabase/tests/90_permissoes.sql` e `91_injecao.sql`, e o conselheiro de segurança (`get_advisors`, `security`). Testes de banco: uma chamada só do `execute_sql` do MCP `supabase-amo` com `_apoio.sql` seguido do teste. Só o MCP `supabase-amo`; o banco `yuhrtuizxuvqvvjtcemz` é o de desenvolvimento (SQL destrutivo ali roda sem pedir).
- Hora sempre de São Paulo pelo nome do fuso (`America/Sao_Paulo` no SQL, `Intl` no TypeScript), nunca por deslocamento fixo.
- Textos sem travessão nem meia-risca em `src/`, `tests/`, `scripts/` e README (`tests/travessao.test.ts`); comentário de código sem acento.
- Commit por task, no padrão do repositório (`feat:`/`fix:`/`test:`/`docs:` em português, sem acento no assunto), terminando com uma linha em branco e `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branch nova `feat/entrega-uber` a partir de `feat/etapa-3`; nada de `stash`, `reset` ou `checkout` amplo.
- Suíte antes de cada commit: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`. Task com rota nova ou variável nova roda também `npm run build` (que chama a varredura de segredos).

## Review Focus

1. **A loja fecha, ou a faixa passa, entre a cotação e o pagamento** (cotou às 17h40 o agora; pagou o Pix às 18h15; escolheu 14h–15h e pagou às 13h20). Pedido recusado antes de pagar, ou corrida remarcada para a primeira faixa livre depois, nunca uma corrida para a cozinha fechada. Testes nas Tasks 4 e 9.
2. **O mesmo pagamento aplicado várias vezes ao mesmo tempo** (aviso do Mercado Pago, a tela perguntando e a reconciliação no mesmo segundo). Uma linha em `entregas`, uma reserva por vez, uma corrida na Uber. Testes nas Tasks 5 e 9.
3. **Aviso da Uber forjado, repetido, fora de ordem, de outra corrida ou de uma corrida já trocada** (o `canceled` atrasado da primeira chegando depois da segunda). 401 sem dizer por quê; nada anda para trás; aviso de id desconhecido é ignorado com 200. Testes nas Tasks 6 e 10.
4. **Fuso e datas de borda** (faixa das 17h com a loja fechando 18h; meia-noite em São Paulo é 03:00Z; data fechada amanhã; domingo sem linha em `horarios`; 7 dias exatos). As mesmas respostas no SQL e no TypeScript. Testes na Task 3.
5. **Entrada hostil na cotação** (`modo` fora dos dois, `faixa` que não é ISO, faixa de 59 min, faixa às 10h30, faixa de 8 dias, a lista de `tests/fixtures/hostis.ts` em cada campo). Recusa antes do limite e da Uber. Testes na Task 8.

---

### Task 1: O ensaio na conta de teste da Uber (antes de qualquer código)

Responde o que muda o desenho (spec §5.2 e §16): se a conta aceita a faixa de 1 hora, se `leave_at_door` é aceito, qual é o domínio do `tracking_url`.

**Files:**
- Create: `scripts/ensaio/uber-conta-de-teste.mjs`
- Modify: `.env.example` (as variáveis da spec §12, com comentário de uma linha cada)

**Interfaces:**
- Produces: as constantes de faixa da decisão 1 (60/30 ou 240/60) e o domínio do rastreio, anotados no fim desta task e usados nas Tasks 3 e 5.

- [ ] **Step 1: O dono preenche o `.env.local`** com `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET` (credenciais de **teste** do painel `direct.uber.com`), `UBER_DIRECT_AMBIENTE=teste` e `COZINHA_ENDERECO` (JSON `{"logradouro","numero","complemento","bairro","cidade","uf","cep","telefone"}`, telefone só dígitos com DDD). Pedir no chat só que ele confirme que preencheu, nunca os valores.

- [ ] **Step 2: Escrever o script.** Lê o `.env.local` por `node --env-file=.env.local`; recusa rodar sem `UBER_DIRECT_AMBIENTE=teste`. Pede o token; cota o agora e uma faixa de 1 hora de amanhã às 11h de São Paulo (janelas da decisão 1) da cozinha até um endereço público fixo de teste (Av. Paulista, 1578, 01310-200, São Paulo, SP); cria uma corrida agendada com `leave_at_door`, `dropoff_verification.picture: true`, `test_specifications.robo_courier_specification.mode: "auto"`, nome `Teste AMO` e telefone `+5511999999999`; cancela a corrida. Imprime só: status HTTP de cada chamada, `code` da Uber quando houver erro, `live_mode`, `fee`, `currency`, o **host** do `tracking_url` e as chaves de topo da resposta. Se a faixa de 1 hora for recusada, repete com 240/60 e imprime qual passou.

- [ ] **Step 3: Rodar** `node --env-file=.env.local scripts/ensaio/uber-conta-de-teste.mjs`. Expected: cotação 200 nos dois modos, corrida 200 com `live_mode: false`, cancelamento 200.

- [ ] **Step 4: Anotar o resultado** aqui embaixo e em `supabase/README.md` (seção nova "Uber Direct: o que o ensaio mostrou", data e o que passou). Se a faixa de 1 hora ou `leave_at_door` forem recusados, **parar e avisar o dono** antes da Task 3 (spec §5.2: o fallback de 4 horas é dele, já decidido; o `leave_at_door` recusado não tem decisão).

  Resultado (2026-11-23, conta de teste, `live_mode: false`): faixa de 1 hora aceita (coleta de s-30 a s, entrega de s a s+60), então valem as constantes 60/30 e o fallback de 4 horas não é necessário; `leave_at_door` com `dropoff_verification.picture: true` aceito, sim; host do rastreio `direct-order.uber.com`. Também: a cotação não traz `live_mode` (só a corrida traz), então o portão de teste fica na resposta de `POST /deliveries`; e há um raio máximo de entrega de 3,11 milhas (5 km) a partir da cozinha, além dele a cotação volta `address_undeliverable`. Ids: cotação `dqt_`, corrida `del_`. O ensaio usou o destino fixo Rua Visconde de Parnaíba, 1316, Mooca, no lugar da Av. Paulista (a Paulista fica fora do raio).

- [ ] **Step 5: Commit** (`test: ensaio da conta de teste da Uber`), com `.env.example` e o README.

---

### Task 2: O ambiente da Uber e a cozinha

**Files:**
- Create: `src/lib/uber/endereco.ts` (só o tipo `EnderecoUber` por enquanto; as funções vêm na Task 7)
- Modify: `src/lib/dados/ambiente.ts`, `scripts/varrer-segredos.mjs`
- Test: `tests/uber-ambiente.test.ts`, `tests/varrer-segredos.test.ts`

**Interfaces:**
- Produces (em `ambiente.ts`):
  - `variavel()` aceita `'UBER_DIRECT_CUSTOMER_ID' | 'UBER_DIRECT_CLIENT_ID' | 'UBER_DIRECT_CLIENT_SECRET' | 'UBER_DIRECT_WEBHOOK_SECRET' | 'COZINHA_ENDERECO'`.
  - `uberConfigurada(): boolean`: as três credenciais presentes e não vazias.
  - `uberEmTeste(): boolean`: `UBER_DIRECT_AMBIENTE` aparado igual a `teste`.
  - `ambientesCombinam(): boolean`: `uberEmTeste() === mercadoPagoEmTeste()`.
  - `type Cozinha = { nome: 'AMO Sabores Saudáveis'; endereco: EnderecoUber; telefone: string }` e `cozinha(): Cozinha`: lê e confere `COZINHA_ENDERECO` (CEP 8 dígitos, UF de 2 letras, telefone 10 ou 11 dígitos, textos com os limites de `privado.cotacoes`); inválido lança `Error('COZINHA_ENDERECO invalido')`, sem o valor.
  - `type EnderecoUber = { logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string; cep: string }`, exportado de `src/lib/uber/endereco.ts` (com `import 'server-only'`).

- [ ] **Step 1: Escrever os testes que falham.** `uberConfigurada` falso com qualquer credencial ausente ou só espaços; `uberEmTeste` só com `teste`; `ambientesCombinam` nas quatro combinações; `cozinha()` com o JSON válido devolve o objeto, e com JSON quebrado, CEP de 7 dígitos ou telefone com letras lança uma mensagem que não contém o valor. Varredura: os valores de `UBER_DIRECT_CLIENT_SECRET`, `UBER_DIRECT_WEBHOOK_SECRET` e `COZINHA_ENDERECO` entram na lista.
- [ ] **Step 2: Rodar** `npx vitest run tests/uber-ambiente.test.ts tests/varrer-segredos.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar a suíte e `npm run build`.** Expected: PASS.
- [ ] **Step 5: Commit** (`feat: ambiente da Uber e endereco da cozinha`).

---

### Task 3: As faixas e as datas fechadas

**Files:**
- Create: `supabase/migrations/<agora>_faixas_de_entrega.sql`, `supabase/tests/12_faixas.sql`
- Modify: `src/lib/loja.ts`, `src/lib/dados/loja.ts`, `src/app/sacola/page.tsx` (só a chamada de `situacaoDaLoja`), `supabase/tests/90_permissoes.sql`
- Test: `tests/loja.test.ts`, `tests/dados-loja.test.ts`

**Interfaces:**
- Produces (banco):
  - `public.dias_fechados (data date primary key, motivo text null check (char_length(motivo) <= 80 and motivo !~ '[[:cntrl:]<>]'), criado_em timestamptz not null default now())`, RLS ligada, `select` para `anon` e `authenticated` (política `using (true)`), gatilho `auditar`.
  - `privado.loja_aberta(p_quando)` (`create or replace`): também falso quando a data de São Paulo está em `dias_fechados`.
  - `privado.faixa_valida(p_inicio timestamptz, p_fim timestamptz, p_agora timestamptz default now(), p_respeitar_pausa boolean default true) returns boolean`: a regra da decisão 1 e da spec §5.2 (duração exata, início entre os da tabela do dia, `p_inicio >= p_agora + antecedência`, data até 7 dias à frente de hoje em São Paulo, fora de `dias_fechados`, e vendas não pausadas quando `p_respeitar_pausa`). `stable`, `security definer`, `search_path = ''`, `execute` só para `service_role`.
- Produces (TypeScript, `src/lib/loja.ts`, puro):
  - `export const FAIXA = { duracaoMin: 60, retiradaAntesMin: 30, antecedenciaMin: 90, diasAFrente: 7 } as const` (ou os números da Task 1).
  - `type Faixa = { inicio: string; fim: string }` (ISO em UTC, `toISOString()`).
  - `type Loja = { horarios: Horario[]; pausada: boolean; diasFechados: string[] }` (datas `AAAA-MM-DD`).
  - `situacaoDaLoja(loja: Loja, agora: Date)`: a mesma de hoje, agora com `diasFechados` (data fechada é dia fechado; "abre" pula datas fechadas).
  - `faixasLivres(loja: Loja, agora: Date, respeitarPausa = true): Faixa[]` em ordem; `faixaValida(loja: Loja, faixa: Faixa, agora: Date, respeitarPausa = true): boolean`.
  - `janelasDaFaixa(f: Faixa): { retiradaDe: string; retiradaAte: string; entregaDe: string; entregaAte: string }`: retirada `[inicio − retiradaAntesMin, inicio]`, entrega `[inicio, fim]`.
  - `fechamentoDeHoje(loja: Loja, agora: Date): Date | null`: o instante em que a loja fecha hoje, ou null se hoje não abre.
- Produces (`src/lib/dados/loja.ts`): `lerLoja()` devolve `Loja` (as datas fechadas de hoje em diante, `order by data`).

- [ ] **Step 1: Escrever os testes de TypeScript que falham.** Com horário 9h–18h de segunda a sábado e `agora = 2026-11-24T12:00:00Z` (terça, 9h de São Paulo):
  ```ts
  expect(faixasLivres(loja, agora)[0]).toEqual({ inicio: '2026-11-24T14:00:00.000Z', fim: '2026-11-24T15:00:00.000Z' }) // 11h: 10h fica a menos de 90 min
  expect(faixasLivres(loja, agora).filter((f) => f.inicio.startsWith('2026-11-25'))).toHaveLength(8) // 10h a 17h
  expect(faixasLivres(loja, agora).some((f) => f.inicio.startsWith('2026-11-29'))).toBe(false) // domingo
  expect(faixasLivres({ ...loja, diasFechados: ['2026-11-25'] }, agora).some((f) => f.inicio.startsWith('2026-11-25'))).toBe(false)
  expect(faixasLivres(loja, agora).at(-1)!.inicio.startsWith('2026-12-01')).toBe(true) // 7 dias, nada do dia 2
  expect(faixasLivres({ ...loja, pausada: true }, agora)).toEqual([])
  expect(faixasLivres({ ...loja, pausada: true }, agora, false).length).toBeGreaterThan(0)
  expect(faixaValida(loja, { inicio: '2026-11-25T13:30:00.000Z', fim: '2026-11-25T14:30:00.000Z' }, agora)).toBe(false) // 10h30
  expect(faixaValida(loja, { inicio: '2026-11-25T13:00:00.000Z', fim: '2026-11-25T13:59:00.000Z' }, agora)).toBe(false) // 59 min
  expect(janelasDaFaixa({ inicio: '2026-11-25T13:00:00.000Z', fim: '2026-11-25T14:00:00.000Z' }).retiradaDe).toBe('2026-11-25T12:30:00.000Z')
  ```
  E `situacaoDaLoja` com data fechada hoje diz que abre no próximo dia aberto; os testes de hoje de `tests/loja.test.ts` passam com `diasFechados: []`.
- [ ] **Step 2: Rodar** `npx vitest run tests/loja.test.ts tests/dados-loja.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar `src/lib/loja.ts` e `lerLoja`.** O instante de "dia D às HH:MM em São Paulo" sai de `Intl` (o deslocamento do fuso naquele dia), nunca de `-03:00` fixo.
- [ ] **Step 4: Escrever `supabase/tests/12_faixas.sql`** com os mesmos casos do Step 1 em `faixa_valida(..., p_agora => '2026-11-24T12:00:00Z')`, mais: `loja_aberta` falso numa data fechada; `dias_fechados` legível por `anon` e sem `insert` para `anon`/`authenticated`. Rodar antes da migration. Expected: FAIL.
- [ ] **Step 5: Escrever e aplicar a migration** (`apply_migration` do MCP `supabase-amo`, salva também em `supabase/migrations/`). Acrescentar a tabela e a função ao inventário de `90_permissoes.sql`.
- [ ] **Step 6: Rodar** `12_faixas.sql`, `90_permissoes.sql`, `06_fechamento.sql` (o horário não pode ter mudado o que passava), `get_advisors`, e a suíte. Expected: tudo verde.
- [ ] **Step 7: Commit** (`feat: faixas de entrega e datas fechadas`).

---

### Task 4: O modo e a faixa na cotação, no pedido e no pagamento

**Files:**
- Create: `supabase/migrations/<agora>_modo_de_entrega.sql`, `supabase/tests/13_modo_de_entrega.sql`
- Modify: `src/lib/dados/cotacao.ts`, `src/lib/dados/fechamento.ts`, `src/lib/fechamento/tipos.ts`, `src/app/sacola/acoes.ts` (só os mapas `CODIGOS_DO_BANCO` e `CODIGOS_DE_INICIAR`), `supabase/tests/90_permissoes.sql`, `supabase/tests/91_injecao.sql`
- Test: `tests/dados-cotacao.test.ts`, `tests/fechamento-pedido.test.ts`, `tests/fechamento-pagamento.test.ts`

**Interfaces:**
- Consumes: `privado.faixa_valida` (Task 3).
- Produces (banco):
  - `privado.cotacoes` e `public.pedidos` ganham `modo` / `entrega_modo` (`text not null default 'agora' check in ('agora','agendado')`) e `janela_inicio`, `janela_fim` / `entrega_janela_inicio`, `entrega_janela_fim` (`timestamptz`), com `check ((modo = 'agora' and inicio is null and fim is null) or (modo = 'agendado' and inicio is not null and fim > inicio))`.
  - `privado.registrar_cotacao`: `drop` da de 12 parâmetros e `create` com mais `p_modo text default 'agora', p_janela_inicio timestamptz default null, p_janela_fim timestamptz default null`. No agendado, `faixa_valida(...)` ou `faixa_indisponivel`. Chamadas de 12 argumentos (testes de hoje) continuam valendo.
  - `public.criar_pedido` (`create or replace`, mesma assinatura): no lugar do `loja_aberta()` incondicional, agora exige `loja_aberta()` (`loja_fechada`); agendado exige vendas não pausadas (`loja_fechada`) e `faixa_valida(inicio, fim)` (`faixa_indisponivel`). Copia modo e faixa para o pedido. O resto do corpo, igual ao de `20261118214501_fechamento.sql`.
  - `public.iniciar_pagamento` (`create or replace`): no agendado, `faixa_valida(inicio, fim, now(), false)` ou `faixa_indisponivel`.
  - `privado.guardar_pedido` (`create or replace`): passagem nova `pago>a_caminho`; `entrega_modo`, `entrega_janela_inicio` e `entrega_janela_fim` imutáveis, a não ser com `current_setting('amo.remarcando', true) = 'sim'`, o pedido `pago` e o modo novo `agendado` com faixa.
- Produces (TypeScript):
  - `registrarCotacao(c: { usuarioId: string | null; valorCentavos: number; minutos: number; origem: 'uber' | 'exemplo'; uberCotacaoId: string | null; modo: 'agora' | 'agendado'; faixa: Faixa | null } & EnderecoDaCotacao): Promise<string>`.
  - `CodigoDoFechamento` ganha `'agora_indisponivel' | 'faixa_indisponivel'`, com os textos da spec §11: `'O Uber não chega antes de a cozinha fechar. Agende a entrega.'` e `'Essa faixa não está mais disponível. Escolha outra.'`.
  - `CODIGOS_DO_BANCO.faixa_indisponivel` e `CODIGOS_DE_INICIAR.faixa_indisponivel` → `'faixa_indisponivel'`.

- [ ] **Step 1: Escrever `13_modo_de_entrega.sql`.** Casos: cotação agendada com faixa válida registra e com faixa de 10h30 recusa; `criar_pedido` agendado com a loja fechada agora (`p_agora` não existe em `criar_pedido`: simular fechando o horário de hoje dentro da transação) passa, e copia modo e faixa; agora com a loja fechada recusa `loja_fechada`; agendado com vendas pausadas recusa `loja_fechada`; agendado cuja faixa passou entre a cotação e o pedido recusa `faixa_indisponivel` (cotação criada com faixa válida e depois o horário mudado na transação); `iniciar_pagamento` recusa a faixa que passou e aceita com vendas pausadas; `pago>a_caminho` passa; mudar `entrega_modo` sem a marca recusa `campo_imutavel`, com a marca e o pedido pago passa; a marca com o pedido aguardando recusa. Rodar. Expected: FAIL.
- [ ] **Step 2: Escrever e aplicar a migration.** Atualizar `90_permissoes.sql` (a assinatura nova de `registrar_cotacao`) e `91_injecao.sql` (os parâmetros de texto novos).
- [ ] **Step 3: Rodar** `13_modo_de_entrega.sql`, `06_fechamento.sql`, `07_pagamento.sql`, `11_pagamento_pelo_servidor.sql`, `90_permissoes.sql`, `91_injecao.sql`, `get_advisors`. Expected: tudo verde.
- [ ] **Step 4: Regenerar `banco.ts`. Escrever os testes de TypeScript que falham:** `registrarCotacao` manda `p_origem`, `p_uber_cotacao_id`, `p_modo`, `p_janela_inicio`, `p_janela_fim`; `fecharPedido` traduz `faixa_indisponivel`; `pagarComPix` traduz `faixa_indisponivel` de `iniciar_pagamento`. Rodar. Expected: FAIL.
- [ ] **Step 5: Implementar.** `cotarEntrega` passa a chamar `registrarCotacao` com `origem: 'exemplo', uberCotacaoId: null, modo: 'agora', faixa: null` até a Task 8.
- [ ] **Step 6: Rodar a suíte.** Expected: PASS.
- [ ] **Step 7: Commit** (`feat: modo e faixa da entrega no pedido`).

---

### Task 5: A corrida no banco

**Files:**
- Create: `supabase/migrations/<agora>_corridas.sql`, `supabase/tests/14_corridas.sql`, `src/lib/dados/entregas.ts`
- Modify: `src/lib/dados/pedidos.ts` (`rastreioSeguro`), `supabase/tests/90_permissoes.sql`, `supabase/tests/91_injecao.sql`
- Test: `tests/dados-entregas.test.ts`, `tests/dados-conta.test.ts` (o rastreio)

**Interfaces:**
- Consumes: `faixa_valida` (Task 3), a marca `amo.remarcando` (Task 4), o host do rastreio (Task 1).
- Produces (banco):
  - `privado.entregas` ganha `estado text not null default 'a_criar' check in ('a_criar','criando','criada','a_cancelar','cancelada','precisa_da_equipe')`, `chave uuid not null default gen_random_uuid()`, `tentativas integer not null default 0`, `cancelamentos_uber integer not null default 0`, `valor_uber_centavos integer check (between 0 and 100000)`, `motivo text check (motivo ~ '^[a-z0-9_]{1,60}$')`, `reservado_em timestamptz`, `criado_em timestamptz not null default now()`.
  - Gatilho `privado.pedido_e_corrida()` `after update of status on public.pedidos`: virou `pago` → `insert ... on conflict do nothing`; virou `cancelado` → `criada`/`criando` vão a `a_cancelar`, `a_criar`/`precisa_da_equipe` sem `uber_entrega_id` vão a `cancelada`.
  - Gatilho `privado.data_fechada()` `after insert on public.dias_fechados`: corridas `a_criar`/`criando`/`criada` de pedido agendado naquela data (São Paulo) vão a `precisa_da_equipe`, motivo `data_fechada`.
  - `privado.reservar_corridas(p_maximo integer) returns table (pedido uuid, numero text, chave uuid, cliente_nome text, cliente_celular text, cep text, logradouro text, numero_casa text, complemento text, bairro text, cidade text, uf text, modo text, janela_inicio timestamptz, janela_fim timestamptz, subtotal_centavos integer, frete_centavos integer, origem text, uber_cotacao_id text, cotacao_expira_em timestamptz, itens jsonb)`: `for update skip locked`, `a_criar` ou `criando` com `reservado_em < now() - interval '2 minutes'`, passa a `criando`; `itens` é `[{nome, quantos, preco_centavos}]`; a cotação é a de `privado.cotacoes` com `pedido_id` do pedido.
  - `privado.marcar_corrida_criada(p_pedido uuid, p_uber_entrega_id text, p_valor_uber_centavos integer, p_rastreio_url text, p_status_uber text) returns text`: `criando` → `criada` (`a_cancelar` continua `a_cancelar`), e aplica o estado como `aplicar_entrega`.
  - `privado.marcar_corrida_falhou(p_pedido uuid, p_motivo text, p_definitiva boolean) returns text`: soma a tentativa; `a_cancelar` → `cancelada`; definitiva ou 5 tentativas → `precisa_da_equipe`; senão `a_criar`.
  - `privado.remarcar_entrega(p_pedido uuid, p_inicio timestamptz, p_fim timestamptz) returns void`: confere `faixa_valida(p_inicio, p_fim, now(), false)` (`faixa_indisponivel`), liga a marca e grava modo `agendado` e a faixa no pedido.
  - `privado.aplicar_entrega`: `drop` da de hoje e `create (p_uber_entrega_id text, p_status_uber text, p_rastreio_url text, p_valor_uber_centavos integer) returns table (pedido uuid, pedido_status text, estado text)`; acha o pedido pelo `uber_entrega_id` (nenhum: devolve zero linhas); `pickup_complete`/`dropoff` levam `pago`/`em_preparo` a `a_caminho`; `delivered` passa por `a_caminho` e chega a `entregue`; `canceled` com `a_cancelar`/`cancelada` → `cancelada`; `canceled` sem termos pedido: primeira vez `a_criar`, chave nova, `uber_entrega_id` nulo, `cancelamentos_uber = 1`; segunda vez `precisa_da_equipe` (`cancelada_pela_uber`); `returned` → `precisa_da_equipe` (`devolvida`). Atualiza `status_uber`, `valor_uber_centavos`, o rastreio e `atualizado_em`.
  - `privado.corridas_a_cancelar() returns table (pedido uuid, uber_entrega_id text)`; `privado.corrida_cancelada(p_pedido uuid) returns void`; `privado.corridas_a_conferir() returns table (uber_entrega_id text)` (`criada`, `status_uber` fora de `delivered`/`canceled`/`returned`, `atualizado_em < now() - interval '10 minutes'`).
  - O `check` de `pedidos.rastreio_url` e o de `aplicar_entrega` aceitam `uber.com` e o host da Task 1 (e subdomínios), só `https`.
  - Todas com `execute` só para `service_role`.
- Produces (`src/lib/dados/entregas.ts`), cada uma chamando a função de mesmo nome e lançando `falhaDoBanco`/`ErroDeRegra` como `pagamentos.ts`:
  - `reservarCorridas(maximo: number): Promise<CorridaReservada[]>` (o tipo espelha as colunas acima em camelCase, datas em ISO);
  - `marcarCorridaCriada(a: { pedido: string; uberEntregaId: string; valorUberCentavos: number | null; rastreioUrl: string | null; statusUber: string }): Promise<string>`;
  - `marcarCorridaFalhou(pedido: string, motivo: string, definitiva: boolean): Promise<string>`;
  - `remarcarEntrega(pedido: string, faixa: Faixa): Promise<void>`;
  - `aplicarEntrega(a: { uberEntregaId: string; statusUber: string; rastreioUrl: string | null; valorUberCentavos: number | null }): Promise<{ pedido: string; pedidoStatus: string; estado: string } | null>`;
  - `corridasACancelar(): Promise<{ pedido: string; uberEntregaId: string }[]>`, `corridaCancelada(pedido: string): Promise<void>`, `corridasAConferir(): Promise<string[]>`.
  - `rastreioSeguro` aceita o host da Task 1.

- [ ] **Step 1: Escrever `14_corridas.sql`.** Casos: pagar um pedido (via `aplicar_pagamento`) grava uma entrega `a_criar`, e aplicar o mesmo pagamento de novo não grava outra; duas `reservar_corridas` seguidas na mesma transação não devolvem o mesmo pedido; `criando` parada há 3 min volta a ser reservada e há 1 min não; `marcar_corrida_falhou` 5 vezes leva a `precisa_da_equipe`; `marcar_corrida_criada` com o pedido cancelado no meio deixa `a_cancelar`; cancelar pedido pago com corrida criada dá `a_cancelar`; `remarcar_entrega` de agora para agendado passa e o pedido mostra a faixa; `aplicar_entrega` `delivered` direto de `pago` termina `entregue` com `a_caminho_em` carimbado; `dropoff` depois de `delivered` não volta; `canceled` da Uber duas vezes: primeira `a_criar` com chave nova, segunda `precisa_da_equipe`; id desconhecido devolve zero linhas; fechar uma data marca as corridas dela; rastreio do host da Task 1 aceito e `http://` ou outro domínio recusado. Rodar. Expected: FAIL.
- [ ] **Step 2: Escrever e aplicar a migration**, com o inventário e a injeção atualizados.
- [ ] **Step 3: Rodar** `14_corridas.sql`, `05_pedidos.sql`, `07_pagamento.sql`, `09_conta_guarda.sql`, `90_permissoes.sql`, `91_injecao.sql`, `get_advisors`. Expected: tudo verde.
- [ ] **Step 4: Regenerar `banco.ts`. Escrever `tests/dados-entregas.test.ts`** (cada função manda os parâmetros certos, lê a resposta, recusa resposta torta com `falhaDoBanco`) e o caso novo de `rastreioSeguro`. Rodar. Expected: FAIL.
- [ ] **Step 5: Implementar `entregas.ts` e `rastreioSeguro`.**
- [ ] **Step 6: Rodar a suíte.** Expected: PASS.
- [ ] **Step 7: Commit** (`feat: a corrida no banco`).

---

### Task 6: O token da Uber, um para o site inteiro

**Files:**
- Create: `supabase/migrations/<agora>_token_uber.sql`, `supabase/tests/15_token_uber.sql`, `src/lib/uber/token.ts`
- Modify: `src/lib/dados/entregas.ts`, `supabase/tests/90_permissoes.sql`
- Test: `tests/uber-token.test.ts`

**Interfaces:**
- Produces (banco): `privado.uber_token (id boolean primary key default true check (id), segredo_id uuid, expira_em timestamptz, renovando_ate timestamptz)`, RLS ligada, sem privilégio de tabela; `privado.ler_token_uber() returns table (token text, expira_em timestamptz)` (de `vault.decrypted_secrets`); `privado.guardar_token_uber(p_token text, p_expira_em timestamptz) returns void` (`vault.create_secret` na primeira vez, `vault.update_secret` depois; nome `amo_uber_token`); `privado.reservar_renovacao_token() returns boolean` (verdadeiro para um só chamador a cada 60 s).
- Produces (`entregas.ts`): `lerTokenUber(): Promise<{ token: string; expiraEm: string } | null>`, `guardarTokenUber(token: string, expiraEm: string): Promise<void>`, `reservarRenovacaoToken(): Promise<boolean>`.
- Produces (`src/lib/uber/token.ts`): `obterToken(renovar = false): Promise<string | null>`. Cópia em memória; renova quando faltam menos de 2 dias, quando `renovar`, ou sem token; só renova quem `reservarRenovacaoToken()` deixou, os outros esperam 1 s e releem do banco uma vez; `POST https://auth.uber.com/oauth/v2/token` com `client_credentials` e `scope=eats.deliveries` em `application/x-www-form-urlencoded`; `expires_in` conferido como inteiro positivo. Falha devolve null e vai ao log (`uber.token`, status), nunca o corpo.

- [ ] **Step 1: Escrever os testes que falham.** SQL: guardar e ler devolve o mesmo token; guardar de novo troca sem criar outro segredo; `reservar_renovacao_token` verdadeiro e logo depois falso; `anon` e `authenticated` sem `execute`. TypeScript (`fetch` e `entregas` falsos): token válido no banco não chama a Uber; duas chamadas seguidas usam a memória; faltando 1 dia renova e guarda; `renovar` força; sem a vez, relê do banco e não chama a Uber; resposta 500 ou `expires_in` torto devolve null; o log nunca contém o token nem o `client_secret`.
- [ ] **Step 2: Rodar.** Expected: FAIL.
- [ ] **Step 3: Escrever e aplicar a migration; implementar.**
- [ ] **Step 4: Rodar** os testes de banco desta task, `90_permissoes.sql`, `get_advisors` e a suíte. Expected: PASS.
- [ ] **Step 5: Commit** (`feat: token da Uber guardado no cofre`).

---

### Task 7: O cliente da Uber

**Files:**
- Create: `src/lib/uber/endereco.ts`, `src/lib/uber/cliente.ts`
- Test: `tests/uber-endereco.test.ts`, `tests/uber-cliente.test.ts`

**Interfaces:**
- Consumes: `obterToken` (Task 6), `variavel('UBER_DIRECT_CUSTOMER_ID')`, `uberEmTeste()` (Task 2).
- Produces (`endereco.ts`): `type EnderecoUber` (Task 2); `enderecoDaUber(e: EnderecoUber): string` (decisão 7); `telefoneDaUber(digitos: string): string` (`+55` + dígitos).
- Produces (`cliente.ts`):
  - `type ResultadoUber<T> = { ok: true; dados: T } | { ok: false; status: number; codigo: string | null }`.
  - `type CotacaoUber = { id: string; valorCentavos: number; minutos: number; retiradaEmMinutos: number | null; aoVivo: boolean }`.
  - `type CorridaUber = { id: string; status: string; valorCentavos: number | null; rastreioUrl: string | null; aoVivo: boolean }`.
  - `type Janelas = ReturnType<typeof janelasDaFaixa>` (Task 3).
  - `cotarNaUber(p: { retirada: EnderecoUber; telefoneRetirada: string; entrega: EnderecoUber; janelas: Janelas | null }): Promise<ResultadoUber<CotacaoUber>>`.
  - `criarCorridaNaUber(p: { cotacaoId: string; chave: string; numeroDoPedido: string; cozinha: Cozinha; cliente: { nome: string; celular: string; endereco: EnderecoUber }; itens: { nome: string; quantos: number; precoCentavos: number }[]; subtotalCentavos: number; janelas: Janelas | null }): Promise<ResultadoUber<CorridaUber>>`: o corpo da spec §8.2 passo 4, com `test_specifications` só quando `uberEmTeste()`.
  - `lerCorridaNaUber(id: string): Promise<ResultadoUber<CorridaUber>>`; `cancelarCorridaNaUber(id: string): Promise<ResultadoUber<CorridaUber>>`.
  - Conferência da resposta: id `^(dqt|del)_[A-Za-z0-9_-]{1,100}$` (ou o formato que a Task 1 mostrar); `fee` inteiro de 0 a 100000; `currency` `brl` na cotação (outra moeda: `{ ok: false, status: 200, codigo: 'moeda' }`); `status` `^[a-z_]{1,40}$`; `live_mode` booleano; `tracking_url` só `https`, até 500 caracteres. Resposta torta: `{ ok: false, status, codigo: 'resposta_torta' }`.
  - Erro: `codigo` é o `code` da Uber se casar `^[a-z0-9_]{1,60}$`, senão null. 401 renova o token uma vez (`obterToken(true)`) e repete; sem token, `{ ok: false, status: 0, codigo: 'sem_token' }`.

- [ ] **Step 1: Escrever os testes que falham.** Endereço: com e sem complemento, a string exata da decisão 7; a mesma entrada dá a mesma string byte a byte; aspas e acentos escapados pelo `JSON.stringify`. Cliente (`fetch` falso): a URL é `https://api.uber.com/v1/customers/<id>/delivery_quotes`; o corpo tem `pickup_address` e `dropoff_address` como string; as janelas só quando há; a corrida leva `deliverable_action_meet_at_door`, `leave_at_door`, `dropoff_verification.picture: true`, a chave como `idempotency_key`, `manifest_reference` igual ao número do pedido e `test_specifications` só em teste; 401 seguido de 200 chama `obterToken(true)` uma vez; 401 duas vezes devolve 401; timeout devolve status 0; `fee` 12.5, `currency` `usd` e `tracking_url` `http://` recusados; nenhum caminho lança.
- [ ] **Step 2: Rodar.** Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar a suíte.** Expected: PASS.
- [ ] **Step 5: Commit** (`feat: cliente da Uber Direct`).

---

### Task 8: A cotação de verdade

**Files:**
- Modify: `src/app/sacola/acoes.ts` (`cotarEntrega`), `src/lib/fechamento/tipos.ts` (`Cotacao`), `src/lib/dados/cotacao.ts` (`cotarDeExemplo` continua)
- Test: `tests/fechamento-cotacao.test.ts`

**Interfaces:**
- Consumes: `lerLoja`, `faixasLivres`, `faixaValida`, `fechamentoDeHoje`, `situacaoDaLoja`, `janelasDaFaixa`, `FAIXA` (Task 3); `registrarCotacao` (Task 4); `cotarNaUber`, `enderecoDaUber` (Task 7); `uberConfigurada`, `uberEmTeste`, `ambientesCombinam`, `cozinha`, `mercadoPagoEmTeste` (Task 2).
- Produces:
  - entrada `{ cep, numero, complemento?, modo?: 'agora' | 'agendado', faixa?: string }`; `faixa` é o início em ISO, obrigatória no agendado e proibida no agora; o fim é `inicio + FAIXA.duracaoMin`.
  - `Cotacao` ganha `modo: 'agora' | 'agendado'` e `faixa: Faixa | null`.
- Regras (spec §6, decisões 6, 8 e 10), na ordem: campos (modo um de dois, faixa casando `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$`); limite `cotar:ip:<ip>`, **30** por 3600 s; CEP; modo (com `lerLoja()`): agora exige `situacaoDaLoja` aberta, senão `agora_indisponivel`; agendado exige `faixaValida`, senão `faixa_indisponivel`; sem modo, agora se aberta, senão `faixasLivres()[0]`, nenhuma faixa `faixa_indisponivel`. Depois: sem `uberConfigurada()`, o exemplo de hoje (só com o Mercado Pago em teste); com ela, `ambientesCombinam()` (senão `entrega_indisponivel` e log `ambientes_trocados`), `cotarNaUber`, `aoVivo === !uberEmTeste()` (senão `entrega_indisponivel` e log), e no agora `agora + retiradaEmMinutos <= fechamentoDeHoje` (senão `agora_indisponivel`). Erros da Uber: `codigo` começando com `address_undeliverable` vira `fora_da_area`; 429 e `moeda` viram `entrega_indisponivel`; o resto, `tente_de_novo`.

- [ ] **Step 1: Escrever os testes que falham** (com os mocks de hoje mais `@/lib/dados/loja`, `@/lib/uber/cliente` e as funções novas do ambiente; relógio em `2026-11-24T12:00:00Z`, loja 9h–18h). Casos: sem modo e aberta cota agora; sem modo e fechada (relógio às 22h de São Paulo) cota a primeira faixa e devolve `modo: 'agendado'`; agendado com faixa válida manda as janelas de `janelasDaFaixa` à Uber e grava `origem: 'uber'` com o id dela; faixa de 10h30, de 8 dias e texto hostil recusados com `campos_invalidos` ou `faixa_indisponivel` **sem** gastar limite quando o formato é inválido; agora com a loja fechada `agora_indisponivel`; agora com `retiradaEmMinutos` passando das 18h `agora_indisponivel`; Uber em teste com Mercado Pago em produção `entrega_indisponivel` sem chamar a Uber; `aoVivo` trocado recusado; `address_undeliverable_limited_couriers` vira `fora_da_area`; 31ª cotação na hora `muitas_tentativas`; os casos de exemplo de hoje passam sem as credenciais.
- [ ] **Step 2: Rodar** `npx vitest run tests/fechamento-cotacao.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar a suíte** (inclui `tests/sacola.test.tsx` e `tests/pagina-produto.test.tsx`, que chamam sem modo). Expected: PASS.
- [ ] **Step 5: Commit** (`feat: cotacao da entrega na Uber`).

---

### Task 9: Criar a corrida quando o pagamento é confirmado

**Files:**
- Create: `src/lib/uber/corridas.ts`
- Modify: `src/lib/mercadopago/sincronizar.ts` (`aplicarRespostaDoMp`)
- Test: `tests/uber-corridas.test.ts`, `tests/mercadopago-sincronizar.test.ts`

**Interfaces:**
- Consumes: `entregas.ts` (Task 5), `cotarNaUber`, `criarCorridaNaUber`, `enderecoDaUber` (Task 7), `lerLoja`, `situacaoDaLoja`, `faixasLivres`, `janelasDaFaixa` (Task 3), o ambiente (Task 2).
- Produces:
  - `criarCorridasPendentes(maximo = 3): Promise<{ criadas: number; falhas: number }>`: sem `uberConfigurada()` devolve zeros sem reservar; para cada reservada, a spec §8.2 com a decisão 6: `origem` diferente de `uber` → falha definitiva `cotacao_de_exemplo`; `ambientesCombinam()` falso → definitiva `ambientes_trocados`; **o horário serve** (agora: `situacaoDaLoja(loja sem pausa).aberta`; agendado: `janela_inicio − retiradaAntesMin ≥ agora + 20 min` e a data fora de `diasFechados`), senão `faixasLivres(loja, agora, false)[0]` e `remarcarEntrega` (nenhuma: definitiva `sem_faixa`); cota de novo se remarcou, se não há `uber_cotacao_id` ou se faltam menos de 60 s para a cotação vencer; cria; `aoVivo` errado → definitiva `ao_vivo_trocado`; diferença `valorCentavos − frete_centavos > 300` → `registrarFalha('uber.frete_maior', { code: 'frete_maior' })`, e a corrida sai assim mesmo. Falha da Uber: definitiva se 4xx que não seja 408 nem 429; senão, não definitiva. Exceção numa corrida: `marcarCorridaFalhou(pedido, 'excecao', false)` e segue com as outras. Nunca lança.
  - `pedirCorridas(): void`: `after(() => criarCorridasPendentes())`; fora de uma requisição (`after` lança), registra `uber.after` e não faz nada.
  - `aplicarRespostaDoMp`: depois de aplicar, se `aplicado.pedido === 'pago'`, chama `pedirCorridas()`.

- [ ] **Step 1: Escrever os testes que falham** (`entregas`, `cliente`, `loja` e `next/server` falsos; relógio fixo). Casos: cotação válida cria com ela, sem cotar de novo, e marca criada com o `fee` e o rastreio; cotação a 30 s de vencer cota de novo e cria com o id novo; cotação nova R$ 5,00 mais cara cria **e** registra `frete_maior`; "Agora" pago às 18h15 remarca para a primeira faixa do dia seguinte, cota com as janelas dela e cria; agendado das 14h com o relógio às 13h45 remarca; sem faixa nos 7 dias `sem_faixa` definitiva; cotação de exemplo `cotacao_de_exemplo`; 500 da Uber falha não definitiva; 400 definitiva; 429 não definitiva; a segunda reservada é tentada mesmo com exceção na primeira; sem credenciais não reserva. `aplicarRespostaDoMp` com o pedido indo a `pago` chama `after` uma vez; `aguardando_pagamento` não chama.
- [ ] **Step 2: Rodar.** Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar a suíte** (inclui `tests/aviso-mercadopago.test.ts` e `tests/fechamento-pagamento.test.ts`, que passam a precisar do mock de `next/server` se chegarem a `pago`). Expected: PASS.
- [ ] **Step 5: Commit** (`feat: a corrida sai quando o pagamento e confirmado`).

---

### Task 10: O aviso da Uber

**Files:**
- Create: `src/lib/uber/assinatura.ts`, `src/app/api/webhooks/uber/route.ts`
- Modify: `src/lib/dados/pagamentos.ts` (`registrarEventoWebhook` ganha `origem`), `src/lib/uber/corridas.ts` (`conferirCorrida`)
- Test: `tests/uber-assinatura.test.ts`, `tests/aviso-uber.test.ts`

**Interfaces:**
- Produces:
  - `conferirAssinaturaUber(corpo: string, assinatura: string | null, segredo: string): boolean`: HMAC-SHA256 em hex minúsculo do corpo cru (UTF-8), comparação por `timingSafeEqual` de mesmo tamanho; assinatura ausente, vazia ou de outro tamanho é falso.
  - `registrarEventoWebhook(e: { origem?: 'mercadopago' | 'uber'; eventoId: string; tipo: string | null; recursoId: string | null })`, padrão `'mercadopago'`.
  - `conferirCorrida(uberEntregaId: string): Promise<boolean>`: `lerCorridaNaUber` e `aplicarEntrega`; se a entrega voltou a `a_criar` (cancelada pela Uber), `pedirCorridas()`. Falso quando a Uber não respondeu.
  - `POST /api/webhooks/uber`: spec §8.3. Corpo lido com `request.text()` uma vez; segredo `UBER_DIRECT_WEBHOOK_SECRET` (ausente: 500 e log `sem_segredo`); assinatura em `x-uber-signature`, senão `x-postmates-signature`; errada: 401 sem corpo. JSON inválido: 400. `kind` diferente de `event.delivery_status`: 200 sem registrar. `id` do evento e `delivery_id` casando `^[A-Za-z0-9_.:-]{1,100}$`, senão 200. `ja_tratado`: 200. `conferirCorrida`; falso: concluir com `uber_<status>` e 500; verdadeiro: concluir e 200. Exceção: log com código curto, concluir, 500.

- [ ] **Step 1: Escrever os testes que falham.** Assinatura: o hex calculado à mão para um corpo fixo; o mesmo corpo com `&` no lugar de `&` dá outra assinatura (o corpo nunca é reserializado); maiúsculas, tamanho errado e null falsos. Rota: 401 com assinatura errada e nenhuma chamada ao banco; `x-postmates-signature` aceita; `event.courier_update` 200 sem `registrarEventoWebhook`; repetido 200 sem chamar a Uber; o estado aplicado é o do `GET` e não o do corpo (corpo diz `delivered`, `GET` diz `pickup`: aplica `pickup`); id desconhecido 200; Uber fora do ar 500 com o evento concluído com erro; nenhum log contém o corpo.
- [ ] **Step 2: Rodar.** Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar a suíte e `npm run build`.** Expected: PASS.
- [ ] **Step 5: Commit** (`feat: aviso da Uber`).

---

### Task 11: A reconciliação cuida das corridas

**Files:**
- Modify: `src/app/api/tarefas/reconciliar/route.ts`, `src/lib/uber/corridas.ts` (`cancelarCorridasPedidas`), `package.json`
- Create: `scripts/reconciliar.mjs`
- Test: `tests/tarefa-reconciliar.test.ts`

**Interfaces:**
- Produces:
  - `cancelarCorridasPedidas(): Promise<{ canceladas: number; falhas: number }>`: para cada `corridasACancelar()`, `cancelarCorridaNaUber`; 200, ou 404/409 (já cancelada ou não existe mais), → `corridaCancelada`.
  - A rota, depois do Mercado Pago e dentro do mesmo prazo de 50 s: `criarCorridasPendentes(5)`, `cancelarCorridasPedidas()`, e `conferirCorrida` para cada `corridasAConferir()`. A resposta ganha `corridas: { criadas, canceladas, conferidas, falhas }`.
  - `npm run reconciliar` (`node --env-file=.env.local scripts/reconciliar.mjs`): `POST http://localhost:3000/api/tarefas/reconciliar` com `Authorization: Bearer <TAREFAS_SEGREDO>`; imprime só a resposta JSON.

- [ ] **Step 1: Escrever os testes que falham.** As três listas chamadas na ordem; prazo estourado no meio para sem lançar; 409 no cancelamento conta como cancelada; falha da Uber conta em `falhas` e não derruba o Mercado Pago; os testes de hoje da rota continuam.
- [ ] **Step 2: Rodar.** Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar a suíte.** Expected: PASS.
- [ ] **Step 5: Commit** (`feat: reconciliacao das corridas`).

---

### Task 12: A Uber falsa do ensaio e o ensaio de ponta a ponta

**Files:**
- Create: `scripts/ensaio/uber-falsa.mjs`
- Test: `tests/ensaio-uber-falsa.test.ts`
- Modify: `supabase/README.md`, `README.md`, `PRODUCT.md`, `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (o Status aponta para a spec da entrega)

**Interfaces:**
- Produces: `scripts/ensaio/uber-falsa.mjs`, carregado como o do Mercado Pago (`NODE_OPTIONS=--import=./scripts/ensaio/uber-falsa.mjs`), só com `UBER_DIRECT_AMBIENTE=teste` e fora de `NODE_ENV=production` (senão não troca nada e avisa). Troca o `fetch` só para `auth.uber.com` e `api.uber.com`: token fixo de 30 dias; cotação com `fee` crescendo com os dígitos do CEP, `live_mode: false`, `currency: brl`; corrida que, a cada `GET`, anda `pending` → `pickup` → `pickup_complete` → `dropoff` → `delivered` de 20 em 20 s desde a criação (o id carrega a hora, como o do Mercado Pago), com `tracking_url` no host da Task 1; cancelar devolve `canceled`, e de novo, 409. Qualquer outro endereço passa para o `fetch` de verdade.

- [ ] **Step 1: Escrever os testes que falham** (no molde de `tests/ensaio-mercadopago-falso.test.ts`): não troca nada sem `teste` ou em produção; a progressão pelo relógio; o cancelamento duas vezes.
- [ ] **Step 2: Rodar. Expected: FAIL. Implementar. Rodar.** Expected: PASS.
- [ ] **Step 3: Ensaio no navegador**, com as duas falsas e o `npm run dev`: comprar com Pix no agora; agendar para amanhã às 11h fora do horário (relógio da máquina não muda: fechar o horário de hoje no banco de desenvolvimento e reabrir no fim); a cada passo, `npm run reconciliar` e conferir em `/conta/pedidos/<numero>` o estado chegando a "entregue". Anotar o resultado em `supabase/README.md`.
- [ ] **Step 4: Documentar** em `supabase/README.md`: as variáveis novas; como rodar com a Uber falsa; a consulta salva de `precisa_da_equipe` (`select e.pedido_id, p.numero, e.estado, e.motivo, e.atualizado_em from privado.entregas e join public.pedidos p on p.id = e.pedido_id where e.estado = 'precisa_da_equipe' order by e.atualizado_em`); como fechar uma data (inserir em `dias_fechados`); o portão da Task 13; e, em "O que é do dono", que a política de privacidade (ainda não escrita, backend §18) precisa citar a Uber como quem entrega e recebe nome, celular e endereço (spec §12). `README.md` e `PRODUCT.md`: a cotação deixa de ser de exemplo quando há credenciais.
- [ ] **Step 5: Rodar a suíte e `npm run build`.** Expected: PASS.
- [ ] **Step 6: Commit** (`feat: Uber falsa do ensaio e documentacao da entrega`).

---

### Task 13: O portão na conta de teste da Uber (com o dono)

Não é código. Fecha a Parte A com a Uber de verdade, em teste.

- [ ] **Step 1: Túnel.** Com o `npm run dev` rodando (sem a Uber falsa; Mercado Pago falso pode continuar), abrir um túnel temporário (`cloudflared tunnel --url http://localhost:3000`, instalado pelo dono) e pedir ao dono para cadastrar `<url do túnel>/api/webhooks/uber` no painel `direct.uber.com` (Developer > Webhooks, evento de estado da entrega) e colar a chave de assinatura em `UBER_DIRECT_WEBHOOK_SECRET` no `.env.local`.
- [ ] **Step 2: Conferir, nesta ordem, e anotar em `supabase/README.md`:** cotação real nos dois modos pela sacola; um pedido agora pago cria a corrida com o Robo Courier; os avisos chegam assinados (nenhum 401 no log) e levam o pedido a "a caminho" e "entregue"; o link de rastreio abre; um pedido agendado cria a corrida com a faixa; cancelar esse pedido pago pelo painel do Supabase cancela a corrida na próxima reconciliação; o `fee` cobrado igual ao cotado (ou a diferença registrada).
- [ ] **Step 3: Desligar o túnel e apagar a URL do aviso no painel da Uber** (ela muda a cada túnel).
- [ ] **Step 4: Commit** (`docs: portao da Uber na conta de teste`).
