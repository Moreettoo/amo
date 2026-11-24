# AMO · O pagamento de verdade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O pagamento da etapa 3 (Pix e cartão pela API de Orders) passa a ser provado contra o Mercado Pago de verdade, em teste. O que a API de verdade mostrar vira correção. O cartão passa a mandar o Device ID e os itens do pedido. E a produção fica numa lista pronta, com uma prova sem dinheiro.

**Architecture:** Nada muda na divisão da etapa 3. O banco decide, a camada de dados em `src/lib/dados/` é a única que fala com ele, e o Mercado Pago é chamado por `fetch` em `src/lib/mercadopago/cliente.ts`. O ensaio usa dois scripts fora do site, os dois com um portão que confere o tipo da conta pela própria API: um roteiro na API de teste e uma prova sem dinheiro na produção. O ensaio no navegador usa um gancho carregado só no servidor de ensaio, que faz o Pix de teste ser aprovado. O Device ID e os itens entram pelos caminhos que já existem: o Brick, `pagar` e `criarPedido*`.

**Tech Stack:** Next.js 16.3.2 (App Router, Server Actions), React 19, `@supabase/supabase-js`, Supabase (MCP `supabase-amo`, banco de desenvolvimento `yuhrtuizxuvqvvjtcemz`), Mercado Pago API de Orders e Card Payment Brick (`https://sdk.mercadopago.com/js/v2`), Vitest, Node 22, `cloudflared` 2026.10.7.

**Spec:** `docs/superpowers/specs/2026-11-23-amo-pagamento-de-verdade-design.md` (a spec inteira; "spec §n" abaixo é dela). Para as regras de segurança: `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (§5, §10, §11, §19). Para a API: `docs/superpowers/specs/2026-11-21-amo-mercadopago-orders.md` ("contrato §n"). Ler as três antes de começar.

## Global Constraints

- **Onde se trabalha.** Worktree `D:\amo-pagamento`, branch `feat/pagamento-de-verdade` (base `534cdcf`, da entrega). Nunca mexer na árvore `D:\amo`, que é da sessão amo-fa. Nada de `git stash` (a pilha é compartilhada entre os worktrees), `reset` ou `checkout` amplo.
- **As variáveis.** O `.env.local` do worktree é uma cópia do de `D:\amo` (os `.env*` não vão ao git). Variável nova entra nos dois arquivos, e a amo-fa é avisada.
- **Arquivos compartilhados com a entrega.** Antes de mexer em `src/app/sacola/acoes.ts`, `src/lib/mercadopago/sincronizar.ts`, `src/app/api/tarefas/reconciliar/route.ts` ou `src/lib/dados/pagamentos.ts`, avisar a amo-fa por mensagem entre as sessões (`SendMessage` para `amo-fa`). Conflito se resolve no rebase sobre a branch dela.
- **Funções do banco.** Nenhuma migration e nenhum `create or replace` nas funções compartilhadas (`criar_pedido`, `iniciar_pagamento`, `aplicar_pagamento`, `guardar_pedido`, `aplicar_entrega`) sem combinar com a amo-fa. Este plano não prevê migration.
- **Teste e produção.** O roteiro e o gancho do Pix só ligam com `MERCADOPAGO_AMBIENTE=teste`, e o roteiro só segue se `GET /users/me` disser `test_user` (spec §9). O único comando que carrega `.env.producao.local` é o da Task 8, e só com o OK do dono, dado na hora.
- **Nada sensível em saída.** Script, log e commit nunca mostram token, assinatura secreta, `client_secret`, senha ou e-mail de usuário de teste, QR, copia e cola, `ticket_url`, corpo de resposta, nem dado pessoal. Os scripts imprimem só: status HTTP, `status`, `status_detail`, prefixos de id, a presença de campos (sim/não) e códigos de erro.
- **Dinheiro.** Sempre em centavos inteiros. Valor que vai ao Mercado Pago sai do banco, nunca da página; em texto, `valorEmReais` (duas casas).
- **Nada novo barra o pagamento.** O Device ID e os itens são informação a mais. Se faltarem, vierem tortos ou não somarem o total, o pedido vai sem eles.
- **Antes de mexer em ação ou rota**, ler (`AGENTS.md`) `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` e `node_modules/next/dist/docs/01-app/02-guides/data-security.md`.
- **Módulos.** Todo módulo de `src/lib/dados/` e de `src/lib/mercadopago/` começa com `import 'server-only'`. No site, só `src/lib/dados/ambiente.ts` lê `process.env`. Os scripts de `scripts/` leem `process.env` direto, como os que já existem.
- **Textos.** Sem travessão nem meia-risca em `src/`, `tests/`, `scripts/` e README (`tests/travessao.test.ts`). Comentário de código sem acento.
- **Antes de cada commit:** `npx vitest run`, `npx tsc --noEmit` e `npm run lint`. A task que mexe em ação, em fronteira `'use client'` ou em variável roda também `npm run build`, que chama a varredura de segredos.
- **Commit.** Um por task (as correções, um por correção), no padrão do repositório (`feat:`/`fix:`/`test:`/`docs:`, em português e sem acento no assunto), terminando com uma linha em branco e `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Servidor de ensaio na porta 3001.** A 3000 é do dono e da outra sessão. No fim, conferir que a porta ficou livre: no Windows, o processo do Next pode sobrar.
- **Procedimento de correção** (Tasks 2 e 7). Para cada diferença observada:
  1. uma linha no contrato, na seção certa, com a data e o que foi visto;
  2. um teste Vitest que falha, com o `fetch` falso devolvendo a forma observada, sem dado pessoal;
  3. a correção;
  4. a suíte;
  5. o commit `fix: ...`;
  6. o caso de novo no roteiro ou no navegador.

  Correção que muda o que a cliente vê, ou algo que o dono aprovou, para e volta ao dono antes.

## Review Focus

1. **Uma credencial de produção chega ao roteiro** (o `.env.local` trocado, ou a variável apontando para a conta real). O roteiro tem de parar antes de criar qualquer coisa, com saída 2. O teste fica na Task 1: o portão recusa a conta real, a resposta sem `tags` e a de outro país.
2. **Itens que não somam o total:**
   - frete zero;
   - um pote com preço que o banco mudou depois do pedido;
   - itens vazios;
   - o pedido sem a linha dos itens.

   O pedido vai sem `items`, com o log `itens_nao_somam`, e nunca é barrado. O teste fica na Task 3.
3. **Device ID hostil:**
   - quebra de linha (o ataque de cabeçalho);
   - 10 mil caracteres;
   - espaço;
   - um objeto no lugar do texto;
   - a lista de `tests/fixtures/hostis.ts`.

   O valor é descartado, nunca vira cabeçalho e não barra o cartão. Um campo desconhecido continua dando `campos_invalidos`. O teste fica na Task 4.
4. **O gancho do Pix esquecido num lugar que não é ensaio:**
   - sem `MERCADOPAGO_AMBIENTE=teste`;
   - com `NODE_ENV=production`;
   - num pedido de cartão;
   - num `GET`;
   - noutro endereço.

   Em todos esses casos, a chamada passa intacta, com o mesmo corpo e os mesmos cabeçalhos. O teste fica na Task 5.
5. **O mesmo pagamento aplicado três vezes no mesmo instante** (a espera da tela, o aviso e a reconciliação), com o gatilho da T5 da entrega. O resultado tem de ser uma linha só em `privado.entregas` e o pedido pago. O teste fica na Task 6, passo 7: uma consulta no banco depois do Pix aprovado. O teste de banco dessa regra é da amo-fa (`14_corridas.sql`).

---

### Task 1: O roteiro na conta de teste do Mercado Pago (antes de qualquer código do site)

Responde o que muda as Tasks 2 a 4: se a API de verdade bate com o contrato, se aceita `items` (e de que forma) e se aceita o cabeçalho do Device ID.

**Files:**
- Create: `scripts/mercadopago-portao.mjs` (o portão, usado também pela Task 8)
- Create: `scripts/ensaio/mercadopago-conta-de-teste.mjs`
- Modify: `supabase/README.md` (seção nova "Mercado Pago: o que o ensaio mostrou"), `docs/superpowers/specs/2026-11-21-amo-mercadopago-orders.md` (os fatos novos, cada um na sua seção, com a data)
- Test: `tests/mercadopago-portao.test.ts`

**Interfaces:**
- Produces (`scripts/mercadopago-portao.mjs`):
  - `contaDeTeste(usuario: unknown): boolean`: verdadeiro só para objeto com `site_id === 'MLB'` e `tags` como lista contendo `'test_user'`.
  - `contaReal(usuario: unknown): boolean`: verdadeiro só para objeto com `site_id === 'MLB'` e `tags` como lista **sem** `'test_user'`. Sem `tags`, os dois são falsos: na dúvida, recusa.

- [ ] **Step 1: Preparar o worktree.** Copiar `D:\amo\.env.local` para `D:\amo-pagamento\.env.local`. Conferir que `git status` não o mostra (o `.env*` é ignorado).
- [ ] **Step 2: Escrever o teste que falha.** Em `tests/mercadopago-portao.test.ts` (`// @vitest-environment node`, importando de `../scripts/mercadopago-portao.mjs`):

```ts
it('conta de teste', () => {
  expect(contaDeTeste({ id: 1, site_id: 'MLB', tags: ['normal', 'test_user'] })).toBe(true)
  expect(contaReal({ id: 1, site_id: 'MLB', tags: ['normal', 'test_user'] })).toBe(false)
})
it('conta real', () => {
  expect(contaReal({ id: 1, site_id: 'MLB', tags: ['normal'] })).toBe(true)
  expect(contaDeTeste({ id: 1, site_id: 'MLB', tags: ['normal'] })).toBe(false)
})
it('na duvida, recusa', () => {
  for (const u of [null, 'x', [], {}, { site_id: 'MLB' }, { site_id: 'MLA', tags: ['test_user'] }, { site_id: 'MLB', tags: 'test_user' }]) {
    expect(contaDeTeste(u)).toBe(false)
    expect(contaReal(u)).toBe(false)
  }
})
```

- [ ] **Step 3: Rodar** `npx vitest run tests/mercadopago-portao.test.ts`. Expected: FAIL (o módulo não existe).
- [ ] **Step 4: Implementar** `scripts/mercadopago-portao.mjs`, com as duas funções puras. Rodar de novo. Expected: PASS.
- [ ] **Step 5: Escrever `scripts/ensaio/mercadopago-conta-de-teste.mjs`,** no molde de `scripts/ensaio/uber-conta-de-teste.mjs`: um cabeçalho de comentário dizendo como rodar e o que nunca imprime.
  - **Antes de criar qualquer coisa:**
    - sem `MERCADOPAGO_AMBIENTE=teste`, sai com 1;
    - sem `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` ou `MP_TESTE_COMPRADOR_EMAIL`, sai com 1;
    - `GET https://api.mercadopago.com/users/me` que não passe em `contaDeTeste`: sai com 2.
  - **Cada chamada:** `AbortSignal.timeout(15000)`; `X-Idempotency-Key` igual a `randomUUID()` em todo `POST /v1/orders`; `external_reference` igual a um UUID novo; `payer.email` igual a `MP_TESTE_COMPRADOR_EMAIL`.
  - **Os casos, na ordem da spec §5.3:**

    | Caso | Esperado |
    | --- | --- |
    | Pix sem `APRO` | criado, com QR; cancelar; cancelar de novo dá 409 |
    | Pix com `payer.first_name: "APRO"` | lido por `GET` a cada 5 s, até 60 s, até `processed`; estornar; estornar de novo dá 409 |
    | Cartão `APRO` | token por `POST /v1/card_tokens?public_key=<chave pública>` com Mastercard `5480 8328 0103 3311`, validade 11/2030, CVV 123, titular `APRO`, CPF `12345678909`; o pedido com `id: 'master'`, `type: 'credit_card'`, `installments: 1` e o `config` do contrato §1.2 |
    | Cartão `OTHE` | recusa |
    | Cartão `CONT` | pendente |
    | Cartão `APRO-CHOK` | desafio |
    | Itens, jeito A | só os potes (`[{ title: 'Pote de ensaio', unit_price: '20.00', quantity: 2 }]`, somando `'40.00'`), com `total_amount` de `'58.10'`: confere se a API exige que a soma bata |
    | Itens, jeito B | os potes mais `{ title: 'Entrega', unit_price: '18.10', quantity: 1 }`, com `total_amount` de `'58.10'` |
    | Itens, jeito C (só se A e B forem recusados) | `unit_price` como número |
    | Device ID | o Pix do jeito B mais o cabeçalho `X-meli-session-id: ensaio-0000000000` |
    | Chave repetida | a mesma chave e o mesmo corpo duas vezes; depois a mesma chave com outro corpo |

    Se `card_tokens` recusar fora do navegador, os casos de cartão viram "só no navegador" (Task 6) e o roteiro segue.
  - **A saída:** uma linha por caso, com o status HTTP, o `status` e o `status_detail` do pedido e do primeiro pagamento, e o código de erro. Depois, "ok" ou "diverge" para cada campo que `lerPedido` e `lerPagamento` leem (`src/lib/mercadopago/cliente.ts`, linhas 83 a 118, conferidos com as mesmas expressões). No cartão `APRO-CHOK`, também o host da URL do desafio.
  - **No fim, sempre** (num `finally`): cancelar o que ficou pendente e estornar o que ficou aprovado.
- [ ] **Step 6: Rodar o roteiro** a partir de `D:\amo-pagamento`, tirando o e-mail do comprador de teste da linha comentada do `.env.local` sem imprimi-lo:

```bash
MP_TESTE_COMPRADOR_EMAIL="$(sed -n 's/^# MP_TESTE_COMPRADOR_EMAIL=\([^ ]*\).*/\1/p' .env.local)" node --env-file=.env.local scripts/ensaio/mercadopago-conta-de-teste.mjs
```

Expected: o portão passa, e sai uma linha por caso. Se o Pix nascer com um código de recusa sobre chave Pix, o roteiro anota; o dono cria uma chave Pix aleatória no painel do vendedor de teste (spec §14), e o roteiro roda de novo.
- [ ] **Step 7: Anotar** em `supabase/README.md`, na seção nova "Mercado Pago: o que o ensaio mostrou", com a data:
  - o resultado de cada caso;
  - o jeito dos itens que a API aceita, e o código da recusa dos outros jeitos;
  - o cabeçalho do Device ID aceito ou não;
  - o que acontece com a chave repetida.

  No contrato, cada fato novo vai para a sua seção (§1 para chamadas e campos, §2 para estados, §3 para idempotência e erros, §5 para testes).
- [ ] **Step 8: Commit** (`test: roteiro na conta de teste do Mercado Pago`).

---

### Task 2: O que o roteiro mostrou vira correção

Esta task existe porque a Task 1 pode mostrar diferenças entre a API e o código. Se todas as linhas da Task 1 forem "ok", registrar "nada a corrigir" no registro de execução e pular para a Task 3.

**Files (prováveis):**
- Modify: `src/lib/mercadopago/cliente.ts` (a leitura: `lerPedido`, `lerPagamento`, `urlDoDesafio`) e `src/lib/mercadopago/traducao.ts` (a tabela do contrato §2)
- Test: `tests/mercadopago-cliente.test.ts`, `tests/mercadopago-traducao.test.ts`

- [ ] **Step 1:** Para cada "diverge" da Task 1, aplicar o **Procedimento de correção** (Global Constraints), um commit por correção. Uma diferença que caia em arquivo da entrega (`sincronizar.ts`, `acoes.ts`, rota da reconciliação, `pagamentos.ts`) espera o aviso à amo-fa.
- [ ] **Step 2: Rodar o roteiro de novo.** Expected: nenhum "diverge".

---

### Task 3: Os itens do pedido no Mercado Pago

**Files:**
- Modify: `src/lib/dados/fechamento.ts` (função nova), `src/lib/mercadopago/cliente.ts`, `src/app/sacola/acoes.ts` (`pagar`; avisar a amo-fa antes)
- Test: `tests/dados-pagamentos.test.ts` (o `describe` novo de `lerItensParaPagar`), `tests/mercadopago-cliente.test.ts`, `tests/fechamento-pagamento.test.ts`, `tests/ensaio-mercadopago-falso.test.ts` (as chamadas passam a levar `itens: []`)

**Interfaces:**
- Consumes: o jeito dos itens que a Task 1 anotou. O padrão abaixo é o jeito B: `unit_price` como texto de duas casas, e a entrega como item. Se a Task 1 anotou outro jeito, só o corpo muda; os nomes ficam.
- Produces:
  - `lerItensParaPagar(pedidoId: string): Promise<{ itens: { nome: string; quantos: number; precoCentavos: number }[]; freteCentavos: number }>`, em `src/lib/dados/fechamento.ts`. Com a sessão da cliente (a RLS limita aos pedidos dela): `from('pedidos').select('frete_centavos, itens_do_pedido(nome, quantos, preco_centavos)').eq('id', pedidoId).maybeSingle()`. Erro do banco: `erroDoBanco('pedidos', ...)`. Sem linha, ou com forma torta: `falhaDoBanco('pedidos', null, status)`.
  - `type ItemMp = { titulo: string; quantidade: number; precoCentavos: number }`, em `cliente.ts`.
  - `itensParaOMp(itens: { nome: string; quantos: number; precoCentavos: number }[], freteCentavos: number): ItemMp[]`, em `cliente.ts`. Os potes na ordem recebida, mais `{ titulo: 'Entrega', quantidade: 1, precoCentavos: freteCentavos }` só quando `freteCentavos > 0`.
  - `criarPedidoPix(p: { tentativa: string; totalCentavos: number; email: string; itens: ItemMp[] })`, e `criarPedidoCartao` com o mesmo `itens: ItemMp[]`. O corpo ganha `items: [{ title, unit_price: valorEmReais(precoCentavos), quantity }]` só se a lista não está vazia e `soma(precoCentavos * quantidade) === totalCentavos`. Se a lista tem itens e a soma não bate, não vai `items`, e o log recebe `registrarFalha('mercadopago.itens', { code: 'itens_nao_somam' })`.
  - Em `pagar`, depois da releitura do pedido e antes de criar no Mercado Pago:
    - `itens = itensParaOMp(...)`, a partir de `lerItensParaPagar(pedido.id)`;
    - se a leitura falhar: `registrarFalha('pagar.itens', erro)`, e `itens = []`.

- [ ] **Step 1: Avisar a amo-fa** que `pagar` (em `src/app/sacola/acoes.ts`) vai ganhar a leitura dos itens.
- [ ] **Step 2: Escrever os testes que falham:**

```ts
// tests/dados-pagamentos.test.ts
it('lerItensParaPagar le o frete e os potes do pedido, em centavos', async () => {
  // o cliente falso devolve { frete_centavos: 1810, itens_do_pedido: [{ nome: 'Granola', quantos: 2, preco_centavos: 2000 }] }
  expect(await lerItensParaPagar('p1')).toEqual({ itens: [{ nome: 'Granola', quantos: 2, precoCentavos: 2000 }], freteCentavos: 1810 })
})
it('lerItensParaPagar sem linha ou com forma torta lanca falhaDoBanco', async () => { /* null, itens_do_pedido nao lista, preco nao inteiro */ })

// tests/mercadopago-cliente.test.ts
it('itensParaOMp poe a entrega como item, so com frete', () => {
  expect(itensParaOMp([{ nome: 'Granola', quantos: 2, precoCentavos: 2000 }], 1810)).toEqual([
    { titulo: 'Granola', quantidade: 2, precoCentavos: 2000 },
    { titulo: 'Entrega', quantidade: 1, precoCentavos: 1810 },
  ])
  expect(itensParaOMp([{ nome: 'Granola', quantos: 1, precoCentavos: 2000 }], 0)).toEqual([{ titulo: 'Granola', quantidade: 1, precoCentavos: 2000 }])
})
it('o Pix e o cartao levam items quando somam o total', async () => {
  // criarPedidoPix({ ..., totalCentavos: 5810, itens: itensParaOMp([{ nome: 'Granola', quantos: 2, precoCentavos: 2000 }], 1810) })
  // corpo.items === [{ title: 'Granola', unit_price: '20.00', quantity: 2 }, { title: 'Entrega', unit_price: '18.10', quantity: 1 }]
})
it('itens que nao somam o total: sem items, com o log itens_nao_somam, e o pedido sai', async () => {})
it('itens vazios: sem items e sem log', async () => {})

// tests/fechamento-pagamento.test.ts (lerItensParaPagar entra no mock de @/lib/dados/fechamento)
it('pagar le os itens do pedido e manda ao Mercado Pago com a entrega', async () => {
  // m.lerItensParaPagar.mockResolvedValue({ itens: [{ nome: 'Granola', quantos: 2, precoCentavos: 2000 }], freteCentavos: 1810 })
  // criarPedidoPix chamado com itens [{ titulo: 'Granola', ... }, { titulo: 'Entrega', ... }]
})
it('a leitura dos itens que falha nao barra: o pedido sai com itens vazios', async () => {})
```

- [ ] **Step 3: Rodar** os quatro arquivos. Expected: FAIL.
- [ ] **Step 4: Implementar** `lerItensParaPagar`, `ItemMp`, `itensParaOMp`, o `items` nas duas criações e a leitura em `pagar`. Acertar as chamadas de `tests/ensaio-mercadopago-falso.test.ts` (`itens: []`).
- [ ] **Step 5: Rodar a suíte, `tsc`, `lint` e `npm run build`.** Expected: PASS.
- [ ] **Step 6: Commit** (`feat: os itens do pedido vao ao Mercado Pago, com a entrega`).

---

### Task 4: O Device ID do cartão

**Files:**
- Modify: `src/components/sacola/CartaoMercadoPago.tsx`, `src/app/sacola/acoes.ts` (`conferirCartao` e `pagar`; avisar a amo-fa antes), `src/lib/mercadopago/cliente.ts`
- Test: `tests/sacola-cartao.test.ts` (novo), `tests/fechamento-pagamento.test.ts`, `tests/mercadopago-cliente.test.ts`

**Interfaces:**
- Consumes: o cabeçalho aceito pela API (Task 1). Se a Task 1 mostrou recusa por causa dele, parar e levar ao dono (spec §8).
- Produces:
  - `declare global { interface Window { MP_DEVICE_SESSION_ID?: unknown } }`, junto do `MercadoPago` que já está declarado.
  - `DadosDoBrick` ganha `dispositivo: string | null`. O `lerCartao` o preenche com `window.MP_DEVICE_SESSION_ID`, quando for texto não vazio; senão, null.
  - `CartaoDoBrick` ganha `dispositivo?: string`. `cartaoDoBrick` copia o valor só quando é texto não vazio, e nunca põe a chave com valor vazio.
  - Em `acoes.ts`:
    - `const DISPOSITIVO = /^[A-Za-z0-9._:-]{8,200}$/`;
    - `conferirCartao` aceita `dispositivo` como opcional (`soAs(e, [...], ['documento', 'dispositivo'])`);
    - `DadosDoCartao` ganha `dispositivo: string | null`: o valor, quando casa com a expressão; null, quando falta ou não casa. Fora do formato, ele é descartado, não recusado;
    - `pagar` passa `dispositivo` a `criarPedidoCartao`.
  - Em `cliente.ts`:
    - `chamar(..., corpo: unknown, extras: Record<string, string> = {})` acrescenta os cabeçalhos extras;
    - `criarPedidoCartao(p: { ...; dispositivo: string | null })` manda `X-meli-session-id: <dispositivo>` só quando não é null. O Pix nunca o manda.

- [ ] **Step 1: Avisar a amo-fa** que `conferirCartao` e `pagar` (em `acoes.ts`) vão ganhar o campo `dispositivo`.
- [ ] **Step 2: Escrever os testes que falham:**

```ts
// tests/sacola-cartao.test.ts
it('cartaoDoBrick leva o dispositivo quando ha', () => {
  const lido = { formData: { token: 't'.repeat(32), payment_method_id: 'master', installments: 1 }, additionalData: { paymentTypeId: 'credit_card', lastFourDigits: '3311' }, dispositivo: 'armor.abc123def456' }
  expect(cartaoDoBrick(lido)?.dispositivo).toBe('armor.abc123def456')
  expect(cartaoDoBrick({ ...lido, dispositivo: null })).not.toHaveProperty('dispositivo')
})

// tests/fechamento-pagamento.test.ts
it('o dispositivo no formato vai a criarPedidoCartao', async () => {
  await pagarComCartao({ ...cartao, dispositivo: 'armor.abc123def456' })
  expect(m.criarPedidoCartao).toHaveBeenCalledWith(expect.objectContaining({ dispositivo: 'armor.abc123def456' }))
})
it('dispositivo hostil e descartado e o cartao paga mesmo assim', async () => {
  for (const d of ['a\r\nX-Outro: 1', 'x'.repeat(10_000), 'com espaco', { a: 1 }, ...HOSTIS]) {
    m.criarPedidoCartao.mockClear()
    const r = await pagarComCartao({ ...cartao, dispositivo: d })
    expect(r.ok).toBe(true)
    expect(m.criarPedidoCartao).toHaveBeenCalledWith(expect.objectContaining({ dispositivo: null }))
  }
})
it('campo desconhecido continua campos_invalidos', async () => {
  expect(await pagarComCartao({ ...cartao, outro: 'x' })).toEqual({ ok: false, erro: 'campos_invalidos' })
})

// tests/mercadopago-cliente.test.ts
it('o cartao com dispositivo manda X-meli-session-id; sem ele, nao; o Pix nunca', async () => {})
it('o log nunca leva o dispositivo', async () => {})
```

(Filtrar de `HOSTIS` as entradas que casam com `DISPOSITIVO`, se houver alguma.)
- [ ] **Step 3: Rodar.** Expected: FAIL.
- [ ] **Step 4: Implementar.**
- [ ] **Step 5: Rodar a suíte, `tsc`, `lint` e `npm run build`.** Expected: PASS.
- [ ] **Step 6: Commit** (`feat: o cartao manda o Device ID do Mercado Pago`).

---

### Task 5: O Pix que é aprovado no ensaio

**Files:**
- Create: `scripts/ensaio/mercadopago-pix-aprova.mjs`
- Modify: `supabase/README.md` (como rodar, junto de "O ensaio com o Mercado Pago falso")
- Test: `tests/ensaio-mercadopago-pix-aprova.test.ts`

**Interfaces:**
- Produces: carregado por `NODE_OPTIONS=--import=./scripts/ensaio/mercadopago-pix-aprova.mjs`. O arquivo troca o `fetch` global por um que, **na hora de cada chamada**, faz o seguinte:
  - se `process.env.MERCADOPAGO_AMBIENTE === 'teste'`, `process.env.NODE_ENV !== 'production'`, o endereço é exatamente `https://api.mercadopago.com/v1/orders`, o método é `POST`, o corpo é texto JSON e `transactions.payments[0].payment_method.id === 'pix'`, ele põe `payer.first_name = 'APRO'`, mantendo o resto do corpo e os cabeçalhos, e chama o `fetch` de verdade;
  - em qualquer outro caso, inclusive com o primeiro argumento sendo um `Request` ou com o corpo ilegível, chama o `fetch` de verdade com os argumentos intactos.

  Ele imprime `[ensaio] Pix que aprova ligado neste processo` uma vez, e `[ensaio] Pix com APRO` a cada troca, sem corpo. O arquivo diz no cabeçalho que não se carrega junto com `mercadopago-falso.mjs`.

- [ ] **Step 1: Escrever os testes que falham,** no molde de `tests/ensaio-mercadopago-falso.test.ts` (o `fetch` de verdade içado como `vi.fn`):
  - o Pix com `teste` chega ao `fetch` de verdade com `payer.first_name: 'APRO'` e o mesmo `X-Idempotency-Key`;
  - o cartão, o `GET /v1/orders/ORD1`, `https://api.mercadopago.com/users/me` e `https://exemplo.com` passam com o mesmo `init` (`toBe`);
  - sem `teste`, ou com `NODE_ENV=production`, o Pix passa intacto;
  - corpo que não é JSON passa intacto.
- [ ] **Step 2: Rodar.** Expected: FAIL.
- [ ] **Step 3: Implementar. Rodar.** Expected: PASS.
- [ ] **Step 4: Documentar** em `supabase/README.md` o comando no bash e no PowerShell (porta 3001), e que no fim se faz `Remove-Item Env:NODE_OPTIONS`.
- [ ] **Step 5: Rodar a suíte. Commit** (`test: o Pix de teste aprovado no ensaio`).

---

### Task 6: O ensaio no navegador (com o dono)

Não é código. É o portão do cartão de `supabase/README.md`, mais o Pix, o aviso e o estorno, com o Mercado Pago de verdade em teste (spec §6).

- [ ] **Step 1: Preparar.**
  1. Rebase sobre o último commit da `feat/entrega-uber` cuja migration já está no banco de desenvolvimento (perguntar à amo-fa qual é). Rodar a suíte.
  2. Gerar `TAREFAS_SEGREDO` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, sem imprimir o valor em outro lugar). Acrescentar no `.env.local` dos dois worktrees e avisar a amo-fa.
  3. Criar a conta de ensaio por `admin.auth.admin.createUser` com `email_confirm: true` e **o e-mail do comprador de teste**, com os metadados do cadastro (nome, celular, aceite e versão dos termos), como manda "O ensaio com o Mercado Pago falso" em `supabase/README.md`.
  4. Fora do horário da loja, abrir um horário temporário (procedimento do README).
  5. Se a T9 da entrega já estiver na base, cada pedido pago também cria uma corrida de teste (Robo Courier), e uma cotação de exemplo vira `precisa_da_equipe` na entrega. Nada disso muda o pagamento, e o ensaio segue.
- [ ] **Step 2: Subir o servidor com o gancho do Pix** (Task 5): `npx next dev -p 3001`, com `NODE_OPTIONS=--import=./scripts/ensaio/mercadopago-pix-aprova.mjs`. Expected: no terminal, `[ensaio] Pix que aprova ligado neste processo`.
- [ ] **Step 3: Abrir o túnel e pedir o aviso ao dono.**
  1. Abrir `D:\ferramentas\cloudflared\cloudflared.exe tunnel --url http://localhost:3001` e anotar a URL.
  2. Pedir ao dono que entre no painel do Mercado Pago com o vendedor de teste e, no aplicativo dele, na parte de Webhooks:
     - cadastre `<túnel>/api/webhooks/mercadopago` nos campos de teste e de produção;
     - marque os eventos "Order (Mercado Pago)" e "Chargebacks";
     - confira que a assinatura secreta é a do `.env.local`;
     - aperte "Simular".

  Expected: o servidor responde 200 ao simulado, e não há nenhum 401 no log.
- [ ] **Step 4: Conferir o cartão** (spec §6, itens 1 a 3), dirigindo o navegador. Pode ser por `claude-in-chrome`, ou pelo Edge sem janela via CDP, como descreve a memória do projeto. Se os campos do Brick (que são frames do Mercado Pago) não aceitarem digitação automática, o dono digita os cartões de teste, e eu confiro o log e o banco.
  - **A tela:** o Brick a 390 e a 1440 px; o console sem violação de CSP.
  - **Os cartões:** `APRO` aprova; `OTHE` recusa e aceita nova tentativa com um token novo; `CONT` fica pendente; `APRO-CHOK` mostra o desafio, que fica na tela até o resultado.
  - **Os dados lidos:** o `paymentTypeId` veio. `typeof window.MP_DEVICE_SESSION_ID` é `'string'` e o valor casa com `DISPOSITIVO`, mas o valor não é impresso. Se não existir, ou não casar, valem a spec §8 e o Procedimento de correção.
  - **O pedido no Mercado Pago:** o pedido de cartão criado lá tem `items` (lido pelo roteiro ou pelo painel).
- [ ] **Step 5: Conferir o Pix e a troca de forma** (spec §6, itens 4, 5 e 7):
  - o Pix aprovado leva o pedido a pago, esvazia a sacola, e Minha conta mostra o pedido pago;
  - os avisos de verdade (não só o simulado) chegam pelo túnel e respondem 200, sem nenhum 401 no log;
  - para testar a troca, reiniciar o servidor **sem** o gancho, criar um Pix, trocar para o cartão e conferir que o Pix anterior foi cancelado no Mercado Pago (pelo roteiro, com `GET`, ou pelo painel).
- [ ] **Step 6: Conferir o estorno automático** (spec §6, item 6):
  1. com o gancho ligado, criar um Pix;
  2. parar o servidor logo em seguida;
  3. cancelar o pedido no banco de desenvolvimento (`update public.pedidos set status = 'cancelado', motivo_cancelamento = 'loja' where numero = '<numero>'`);
  4. subir o servidor de novo e chamar a reconciliação com `curl -X POST -H "Authorization: Bearer $TAREFAS_SEGREDO" http://localhost:3001/api/tarefas/reconciliar`. Repetir depois de 10 min, se a tentativa ainda constar como pendente.

  Expected: a tentativa termina `estornado`, e o pedido continua cancelado.
- [ ] **Step 7: Conferir o banco** (Review Focus 5): `select count(*) from privado.entregas where pedido_id = (select id from public.pedidos where numero = '<numero do Pix aprovado>')`. Expected: `1`.
- [ ] **Step 8: Conferir a CSP de produção:** `npm run build` e `npx next start -p 3001`, sem o gancho. Refazer `APRO` e `APRO-CHOK`. Expected: o console sem violação.
- [ ] **Step 9: Limpar e anotar.**
  - **Limpar:** fazer o "Limpar depois" do README; voltar o horário da loja; pedir ao dono para apagar a URL do túnel no painel; fechar o túnel; parar o servidor e conferir que a porta 3001 ficou livre.
  - **Anotar** em `supabase/README.md`:
    - em "O portão do cartão", trocar "Resultado: ainda não ensaiado" pelo resultado, com a data;
    - em "Mercado Pago: o que o ensaio mostrou", os itens 4 a 7 da spec §6.
- [ ] **Step 10: Commit** (`docs: o ensaio do pagamento com o Mercado Pago de teste`).

---

### Task 7: O que o navegador mostrou vira correção

Esta task tem a mesma regra da Task 2. Se o navegador não mostrou nenhuma diferença, registrar "nada a corrigir" e pular.

**Files (prováveis):**
- `src/lib/seguranca/politica.ts` (a CSP), com `tests/politica.test.tsx`;
- `src/components/sacola/CartaoMercadoPago.tsx`;
- `src/lib/mercadopago/cliente.ts`;
- a expressão `DISPOSITIVO`, em `acoes.ts`.

- [ ] **Step 1:** Para cada diferença, aplicar o **Procedimento de correção**, um commit por correção. Uma mudança no que a cliente vê para e volta ao dono.
- [ ] **Step 2:** Refazer, no navegador, o item que falhou. Expected: passa, e o README é atualizado.

---

### Task 8: A prova sem dinheiro na produção e a lista da produção

**Files:**
- Create: `scripts/producao/mercadopago-prova-sem-dinheiro.mjs`
- Modify: `supabase/README.md` (seção nova "Mercado Pago: a produção"), `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (o Status aponta para a spec do pagamento de verdade)

**Interfaces:**
- Consumes: `contaReal` (Task 1).
- Produces: `node --env-file=.env.producao.local scripts/producao/mercadopago-prova-sem-dinheiro.mjs --confirmo-producao`, com `MP_PROVA_EMAIL=<e-mail da loja>` na linha de comando. O script faz o seguinte:
  - **Recusa** (sai com 1) sem `--confirmo-producao`, sem `MP_PROVA_EMAIL`, sem `MERCADOPAGO_ACCESS_TOKEN`, ou com `MERCADOPAGO_AMBIENTE=teste`.
  - **Recusa** (sai com 2) se `GET /users/me` não passar em `contaReal`.
  - **Cria** um Pix com `total_amount` de `'1.00'`, `external_reference` igual a `prova-sem-dinheiro-<8 hexadecimais>`, `X-Idempotency-Key` aleatória e validade `PT30M`.
  - **Cancela na hora**, com a chave `<chave>-cancelar`, e confere por `GET` que o pedido ficou `canceled`.
  - **Imprime só:** os status HTTP, o `status` e o `status_detail` de cada passo, se o QR veio (sim/não) e o código de erro. Nunca o QR, o `ticket_url` ou o e-mail.
  - **Se o cancelamento falhar,** imprime em destaque o id do pedido, para o dono cancelar no painel.

- [ ] **Step 1: Escrever o script** (o portão já tem teste, na Task 1). Rodar `node scripts/producao/mercadopago-prova-sem-dinheiro.mjs` **sem** `--confirmo-producao` e sem env. Expected: sai com 1, sem nenhuma chamada.
- [ ] **Step 2: Pedir ao dono o OK, na hora, e o e-mail da loja.** Rodar só depois do sim. Expected: criado (`action_required`/`waiting_transfer`, com QR: sim), depois `canceled`. Se a criação recusar por chave Pix, o item 1 da lista (spec §10) fica marcado como pendente do dono.
- [ ] **Step 3: Escrever "Mercado Pago: a produção"** em `supabase/README.md`, com a lista da spec §10 (itens 1 a 7), o resultado da prova sem dinheiro (com a data) e, para cada item, quem faz.
- [ ] **Step 4: Atualizar o Status** de `2026-11-18-amo-backend-design.md`: o pagamento foi ensaiado com o Mercado Pago de verdade (data e seção do README), e a produção do pagamento está na lista.
- [ ] **Step 5: Rodar a suíte. Commit** (`docs: prova sem dinheiro e a lista da producao do pagamento`).
