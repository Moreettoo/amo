# AMO · Etapa 3 · Parte A · O servidor do fechamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O servidor passa a fazer o fechamento de verdade: cotar a entrega e guardar a cotação, fechar o pedido pelo banco, cobrar pelo Mercado Pago (Pix e cartão), dizer a situação do pedido, receber o aviso do Mercado Pago e reconciliar o que se perdeu. Nenhuma tela muda nesta parte.

**Architecture:** O banco já tem tudo desde a etapa 1 (`criar_pedido`, `iniciar_pagamento`, `aplicar_pagamento`, os avisos e os limites); esta parte põe o servidor no meio. Ações de servidor finas em `src/app/sacola/acoes.ts`; a camada de dados em `src/lib/dados/` (única que fala com o banco); o Mercado Pago por `fetch`, sem SDK, em `src/lib/mercadopago/` (o cliente, a tradução dos estados, a assinatura do aviso e a sincronização de uma tentativa); duas rotas, `/api/webhooks/mercadopago` e `/api/tarefas/reconciliar`. A Parte B (`docs/superpowers/plans/2026-11-21-amo-etapa-3-tela.md`, escrita depois desta) liga a sacola a estas ações.

**Tech Stack:** Next.js 16.3.2 (App Router), React 19, `@supabase/supabase-js` e `@supabase/ssr`, Supabase (Postgres 17, MCP `supabase-amo`), API de Orders do Mercado Pago, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (§5, §7, §9, §10, §11, §12, §13, §14, §19) e `docs/superpowers/specs/2026-11-21-amo-mercadopago-orders.md` (o contrato do Mercado Pago, lido na documentação em 2026-11-21: os corpos, os estados, a tradução, a assinatura, as chaves de idempotência). Ler os dois antes de começar.

## Decisões minhas que completam ou mudam o desenho

Cada uma pode ser revertida pelo dono. Ele saiu pelo dia em 2026-11-21 e pediu que o trabalho seguisse sem perguntas.

1. **O ambiente do Mercado Pago é declarado**, não adivinhado: a credencial de teste também começa com `APP_USR-` (contrato §5). `MERCADOPAGO_AMBIENTE=teste` no desenvolvimento; sem a variável, ou com outro valor, o servidor se comporta como produção e recusa a cotação de exemplo (backend §13).
2. **A tentativa é a referência no Mercado Pago:** o `id` de `pagamentos` vai como chave de idempotência e como `external_reference`. O aviso e a reconciliação acham a tentativa por ele.
3. **`situacaoDoPedido` também pergunta ao Mercado Pago** quando a tentativa ainda está pendente, no máximo uma vez a cada 15 s por tentativa (`consumirLimite('mp:<tentativa>', 1, 15)`), e aplica a resposta pelo mesmo caminho do aviso. A espera do Pix não fica presa a um aviso atrasado, e o desenvolvimento local, que não recebe aviso, funciona.
4. **Limite de `situacaoDoPedido`: 240 por hora por cliente** (a §11 dizia 60, "limite inicial"): a espera do Pix pergunta a cada 5 s nos 2 primeiros minutos e a cada 15 s depois.
5. **A tentativa que termina do nosso lado e que o Mercado Pago ainda dá como pendente é cancelada lá**: ao trocar de tentativa (a §9.1 já pedia) e na reconciliação (para as que o `pg_cron` expirou). Duas funções novas de `privado` acham essas tentativas e o pedido do Mercado Pago de uma tentativa.
6. **A criação no Mercado Pago não é reenviada.** Se ela falha sem resposta, ou demora mais de 6 s, a tentativa fica pendente sem `ORD`, a ação responde "não deu certo agora", e a reconciliação a cancela depois de 10 min. Recusa definitiva (4xx que não seja 409, 423 ou 429) cancela a tentativa na hora.
7. **Os 4 últimos dígitos do cartão vêm do Brick** (`additionalData.lastFourDigits`), conferidos como 4 dígitos: o Mercado Pago não os devolve (contrato §1.2). A bandeira vem da resposta dele.
8. **As ações do fechamento recebem argumentos, não `FormData`**: a sacola só existe com JavaScript e as chama em sequência (fechar, depois pagar). Toda entrada chega como `unknown` e é conferida campo a campo.
9. **3DS só quando há risco** (`validation: "on_fraud_risk"`, `liability_shift: "required"`), como a §10.2 pedia; a URL do desafio volta na resposta da ação e não é guardada.
10. **Parcelas de 1 a 12** (o `check` de `pagamentos.parcelas`); o Brick é configurado com o mesmo máximo na Parte B.

## Fora deste plano

- A tela (a sacola, a porta da conta na etapa 3, a espera do Pix, o Brick, o pedido em Minha conta, o comentário): Parte B.
- Uber Direct e o aviso do Uber: a conta não existe. A cotação continua de exemplo, agora emitida pelo servidor e guardada com `origem = 'exemplo'`.
- O agendador que chama a reconciliação a cada 10 min (depende da hospedagem, backend §18) e as credenciais de produção: etapa 4.

## Global Constraints

- Ler o guia em `node_modules/next/dist/docs/` antes de tocar em rota, ação de servidor ou cabeçalho (`AGENTS.md`): `01-app/02-guides/server-actions.md`, `data-security.md` e `01-app/03-api-reference/03-file-conventions/route.md`.
- O navegador não fala com o Supabase nem com a API do Mercado Pago. Nenhum arquivo com `'use client'` importa `@supabase/*`, `src/lib/dados/`, `src/lib/mercadopago/` ou `src/lib/auth/` (fora `src/lib/auth/acoes.ts` e `src/lib/auth/volta.ts`). Os tipos e textos que a tela usa moram em `src/lib/fechamento/tipos.ts`, puro.
- Todo módulo de `src/lib/dados/` e de `src/lib/mercadopago/` começa com `import 'server-only'`. Só `src/lib/dados/ambiente.ts` lê `process.env`.
- Toda chamada à API de dados leva `x-amo-porta` (os clientes de `criarClienteServidor`, `criarClienteAdmin`, `criarClienteDoCatalogo` e `criarClienteDoVisitante` já levam). A identidade vem de `obterUsuario()`, nunca de um campo vindo da página.
- Ordem de toda ação (backend §11): (1) sessão, quando a ação é de quem está logada; (2) conferir cada campo; (3) limite; (4) banco ou Mercado Pago; (5) traduzir. Campo inválido não gasta limite.
- As ações devolvem só `ok`, `erro` (código curto de `CodigoDoFechamento`), `campos` e os campos que a tela usa. Nenhuma mensagem crua do banco, do Supabase ou do Mercado Pago sai do servidor; falhas vão ao log só por `registrarFalha(onde, erro)` (lugar, código, status e nome).
- Nada de dado pessoal, corpo de resposta do Mercado Pago, token do cartão, CPF, cabeçalho ou segredo em log (backend §5, regra 10). O CPF, quando vier, passa da ação direto ao Mercado Pago, sem banco e sem log. Nenhuma resposta do Mercado Pago é guardada inteira: só os campos que `aplicar_pagamento` recebe.
- Dinheiro em centavos inteiros. O valor enviado ao Mercado Pago é sempre `pedidos.total_centavos` lido do banco, nunca um valor vindo da página. Texto para o Mercado Pago com `(centavos / 100).toFixed(2)`; texto vindo dele convertido por expressão (`^\d+(\.\d{1,2})?$`), sem ponto flutuante.
- O servidor nunca acredita no corpo de um aviso: confere a assinatura, lê o pedido pelo `GET` e aplica o que a API disse (backend §5, regra 8).
- Toda chamada ao Mercado Pago tem `AbortSignal.timeout(6000)` e `cache: 'no-store'`, e nunca lança: devolve um resultado com o status (0 sem resposta).
- Nenhum filtro montado com texto: nada de `.or()` nem `.filter()` com valor de fora.
- Migration aplicada não se edita. Depois de toda migration: regenerar `src/lib/dados/banco.ts` (mantendo `import 'server-only'` e as linhas de comentário do topo), rodar `supabase/tests/90_permissoes.sql` e o conselheiro de segurança (`get_advisors`, tipo `security`). Testes de banco: uma chamada só do `execute_sql` do MCP `supabase-amo` com `supabase/tests/_apoio.sql` seguido do teste. Só o MCP `supabase-amo` (o `claude_ai_Supabase` é de outra organização). O banco `yuhrtuizxuvqvvjtcemz` é o de desenvolvimento.
- Textos sem travessão nem meia-risca em `src/`, `tests/`, `scripts/` e README (`tests/travessao.test.ts`); comentário de código sem acento.
- Commit no padrão do repositório (`feat:`/`fix:`/`test:`/`docs:` em português, sem acento no assunto), terminando com uma linha em branco e `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branch `feat/etapa-3`; nada de `stash`, `reset` ou `checkout` amplo.
- Suíte completa antes de cada commit: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`.

## Review Focus

1. **Clique duplo em "pagar", ou pagar de novo depois de voltar.** Uma tentativa pendente só por pedido (o banco garante), a anterior cancelada no Mercado Pago, nenhuma cobrança em dobro sem estorno. Testes nas Tasks 8 e 9.
2. **O Mercado Pago responde devagar, com erro ou fora do ar.** A ação diz "não deu certo agora", a tentativa não fica pendente para sempre (a reconciliação a cancela) e nada é aprovado sem a API dizer. Testes nas Tasks 5, 9 e 12.
3. **Aviso forjado, repetido, fora de ordem ou de um pedido que não é nosso.** 401 sem dizer por quê, nenhum efeito repetido, nada anda para trás. Testes nas Tasks 6 e 11.
4. **A loja fecha enquanto a cliente preenche** (17h59 para 18h00, ou as vendas pausadas no meio). O banco recusa com `loja_fechada`, e a ação traduz. Testes nas Tasks 2 e 4.
5. **Entrada hostil em cada ação** (a lista de `tests/fixtures/hostis.ts` em cada campo; itens com produto repetido, quantidade 0, 21 ou fracionada; total negativo; token, bandeira, parcelas e CPF fora do formato). Recusa antes do limite, do banco e do Mercado Pago, nunca a mensagem crua. Testes nas Tasks 3, 4 e 9.

---

### Task 1: As peças que a etapa 3 pede emprestadas

Os três adiados da etapa 2 que eram desta etapa, as variáveis novas e o ambiente do Mercado Pago.

**Files:**
- Modify: `src/lib/dados/publico.ts`, `src/lib/dados/catalogo.ts`, `src/lib/dados/comentarios.ts`, `src/lib/dados/ambiente.ts`
- Modify: `scripts/varrer-segredos.mjs`, `.env.example`
- Test: `tests/dados-base.test.ts`, `tests/dados-catalogo.test.ts`, `tests/banco/publico.test.ts` (só o nome), `tests/varrer-segredos.test.ts`

**Interfaces:**
- Produces:
  - `criarClienteDoCatalogo(): SupabaseClient<Database>`: o `criarClientePublico` de hoje, renomeado (cache de 5 min e etiqueta `catalogo`). Nenhum `criarClientePublico` sobra no repositório.
  - `criarClienteDoVisitante(): SupabaseClient<Database>`: o mesmo cliente sem sessão e com a porta, mas sem cache (`cache: 'no-store'` no `fetch`, sem `next`). Lê o horário e a pausa da loja (Task 2).
  - `variavel()` aceita também `'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY'`, `'MERCADOPAGO_ACCESS_TOKEN'`, `'MERCADOPAGO_WEBHOOK_SECRET'` e `'TAREFAS_SEGREDO'`.
  - `mercadoPagoEmTeste(): boolean` em `ambiente.ts`: verdadeiro só com `MERCADOPAGO_AMBIENTE` igual a `teste` (aparado); ausente ou outro valor, falso (produção).
  - O comentário do topo de `ambiente.ts` passa a dizer que todo módulo de servidor lê `process.env` só por aqui.

- [ ] **Step 1: Escrever os testes que falham**

- `criarClienteDoVisitante()`: a chamada ao `fetch` falso leva `cache: 'no-store'`, não leva `next`, e leva o cabeçalho `x-amo-porta`.
- `criarClienteDoCatalogo()`: continua com `next: { revalidate: 300, tags: ['catalogo'] }` (os testes que usam `criarClientePublico` passam a usar o nome novo).
- `variavel('MERCADOPAGO_ACCESS_TOKEN')` lança `Falta a variável de ambiente MERCADOPAGO_ACCESS_TOKEN` quando falta.
- `mercadoPagoEmTeste()`: `'teste'` e `' teste '` dão verdadeiro; ausente, `''`, `'producao'` e `'TESTE'` dão falso.
- Varredura: um `.next/static/a.js` com a chave pública `APP_USR-6b0d5c4a-1f2e-4d3c-9b8a-7f6e5d4c3b2a` sai com 0; um com `APP_USR-1234567890123456-112118-0123456789abcdef0123456789abcdef-123456789` sai com 1 e diz a regra `token do Mercado Pago`, sem o valor; o mesmo com o prefixo `TEST-`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/dados-base.test.ts tests/varrer-segredos.test.ts`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar**

- A troca de nome em todo o repositório e o cliente sem cache.
- Em `varrer-segredos.mjs`, a marca literal `APP_USR-` vira a regra `token do Mercado Pago`, com a expressão `/\b(?:APP_USR|TEST)-\d{6,20}-\d{6}-[0-9a-f]{32}-\d{3,15}\b/` (a chave pública vai ao navegador por desenho e não pode disparar). As outras marcas e a procura pelo valor de cada variável de servidor ficam. Atualizar o comentário do topo.
- No `.env.example`: `MERCADOPAGO_AMBIENTE=teste` junto das variáveis do Mercado Pago, com a linha "teste no desenvolvimento; sem a variável, o servidor se comporta como produção e recusa a cotação de exemplo"; e um bloco comentado do Uber Direct para a etapa 4: `UBER_DIRECT_CUSTOMER_ID=`, `UBER_DIRECT_CLIENT_ID=`, `UBER_DIRECT_CLIENT_SECRET=` e `COZINHA_ENDERECO=` (só servidor; nunca com `NEXT_PUBLIC_`), com "Enquanto a conta do Uber Direct não existe, a cotação é de exemplo."

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/lib/dados scripts/varrer-segredos.mjs .env.example tests
git commit -m "feat: o cliente do catalogo e o do visitante, o ambiente do Mercado Pago e a varredura pelo formato do token"
```

### Task 2: A loja aberta ou fechada

**Files:**
- Create: `src/lib/loja.ts` (puro, o navegador pode importar), `src/lib/dados/loja.ts` (só servidor)
- Test: `tests/loja.test.ts`, `tests/dados-loja.test.ts`

**Interfaces:**
- Consumes: `criarClienteDoVisitante()` (Task 1); `falhaDoBanco(onde, erro, status)`.
- Produces:
  - `type Horario = { dia: number; abre: string; fecha: string }`: `dia` de 0 (domingo) a 6; `abre` e `fecha` como o Postgres devolve `time` (`'09:00:00'`), na hora de São Paulo.
  - `type SituacaoDaLoja = { aberta: true; fecha: string } | { aberta: false; pausada: true } | { aberta: false; pausada: false; abre: { dia: number; hora: string; emDias: number } | null }`; `emDias` é quantos dias faltam (0 hoje, 1 amanhã, até 7 no mesmo dia da semana seguinte), e é dele que `textoDaLoja` tira "hoje", "amanhã" ou o nome do dia (emenda de 2026-11-21, na revisão da Task 2).
  - `situacaoDaLoja(horarios: readonly Horario[], pausada: boolean, agora: Date): SituacaoDaLoja`, com a regra de `privado.loja_aberta`: aberta se não está pausada e existe horário do dia da semana de São Paulo com `abre <= agora < fecha`. Fechada fora do horário: o próximo `abre` a partir de agora (hoje, se ainda não abriu; senão o primeiro dos 7 dias seguintes com horário), ou `null` sem horário nenhum. A hora de São Paulo sai de `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'`, sem biblioteca.
  - `textoDaLoja(s: SituacaoDaLoja): string` (sem `agora`: o `emDias` já diz o dia; emenda de 2026-11-21) e `resumoDosHorarios(horarios: readonly Horario[]): string`, com os textos dos testes.
  - `lerLoja(): Promise<{ horarios: Horario[]; pausada: boolean }>` em `src/lib/dados/loja.ts`: `horarios` (`dia_da_semana, abre, fecha`, por dia) e `loja.vendas_pausadas`; sem a linha da loja, `pausada: true` (fecha na dúvida, como o banco).

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/loja.test.ts`, com o horário de segunda a sábado, das `'09:00:00'` às `'18:00:00'` (o de hoje no banco):

| Agora | `situacaoDaLoja` | `textoDaLoja` |
| --- | --- | --- |
| sábado `2026-11-21T17:00:00Z` (14h em São Paulo) | `{ aberta: true, fecha: '18:00:00' }` | `Pedidos até as 18h.` |
| sábado `2026-11-21T21:00:00Z` (18h) | fechada, `abre: { dia: 1, hora: '09:00:00' }` | `A cozinha abre segunda às 9h.` |
| domingo `2026-11-22T13:00:00Z` (10h) | fechada, abre segunda | `A cozinha abre amanhã às 9h.` |
| segunda `2026-11-23T11:59:59Z` (8h59) | fechada, abre segunda | `A cozinha abre hoje às 9h.` |
| sexta `2026-11-20T21:00:00Z` (18h) | fechada, abre sábado | `A cozinha abre amanhã às 9h.` |
| quarta `2026-11-18T12:00:00Z` (9h) | aberta | `Pedidos até as 18h.` |
| qualquer hora, `pausada: true` | `{ aberta: false, pausada: true }` | `As vendas estão pausadas agora. Volte daqui a pouco.` |
| sem horário nenhum | fechada, `abre: null` | `A cozinha está fechada por enquanto.` |

E: fechar às `'18:30:00'` dá `Pedidos até as 18h30.`; `resumoDosHorarios` dá `De segunda a sábado, das 9h às 18h.` para o horário de hoje, `Todos os dias, das 9h às 18h.` para os 7 dias iguais e `De segunda a sexta, das 9h às 18h; sábado, das 9h às 13h.` quando o sábado fecha às 13h.

Em `tests/dados-loja.test.ts`, com o `fetch` falso: `lerLoja()` devolve os horários na forma da interface; sem linha em `loja`, `pausada: true`; erro HTTP 503 rejeita com `Falha no banco (loja): HTTP 503`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/loja.test.ts tests/dados-loja.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 3: Implementar** as funções da interface.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/lib/loja.ts src/lib/dados/loja.ts tests/loja.test.ts tests/dados-loja.test.ts
git commit -m "feat: a loja diz se esta aberta e quando abre, pelo horario do banco"
```

### Task 3: A cotação no servidor

**Files:**
- Create: `src/lib/fechamento/tipos.ts` (puro: os códigos, os textos e os tipos que a tela usa), `src/lib/dados/cotacao.ts` (só servidor), `src/app/sacola/acoes.ts` (`'use server'`)
- Test: `tests/fechamento-cotacao.test.ts`

**Interfaces:**
- Consumes: `buscarCep(cep)` (`src/lib/dados/cep.ts`), `consumirLimite(chave, maximo, janela)`, `obterUsuario()`, `lerIp(headers)`, `criarClienteAdmin()`, `mercadoPagoEmTeste()` (Task 1).
- Produces:
  - Em `tipos.ts`: `type CodigoDoFechamento` e `MENSAGENS_DO_FECHAMENTO: Record<CodigoDoFechamento, string>`:

    | Código | Texto |
    | --- | --- |
    | `campos_invalidos` | Confira os campos marcados. |
    | `muitas_tentativas` | Muitas tentativas. Espere um pouco e tente de novo. |
    | `tente_de_novo` | Não deu certo agora. Tente de novo em instantes. |
    | `cep_nao_encontrado` | Não achamos esse CEP. Confira os números. |
    | `fora_da_area` | O Uber ainda não chega neste CEP. Hoje a entrega é só na Grande São Paulo. |
    | `entrega_indisponivel` | A entrega ainda não está disponível. Tente de novo mais tarde. |
    | `sem_sessao` | Entre na sua conta para continuar. |
    | `email_nao_confirmado` | Confirme o seu e-mail com o código que enviamos para continuar. |
    | `loja_fechada` | A cozinha está fechada agora, e o pedido não foi feito. |
    | `produto_indisponivel` | Um dos sabores saiu do cardápio. Confira os potes. |
    | `cotacao_vencida` | O valor da entrega venceu. Calcule de novo. |
    | `muitos_pedidos` | Muitos pedidos em pouco tempo. Espere um pouco e tente de novo. |
    | `total_mudou` | Os preços mudaram desde que você abriu a sacola. Confira o novo total. |
    | `pedido_invalido` | Esse pedido não pode mais ser pago. Faça o pedido de novo. |
    | `tentativas_esgotadas` | Foram muitas tentativas de pagamento neste pedido. Faça o pedido de novo. |
    | `pagamento_indisponivel` | O pagamento não respondeu agora. Tente de novo em instantes. |
    | `pagamento_recusado` | O pagamento foi recusado. Confira os dados ou use outro cartão. |

  - Em `tipos.ts`: `type EnderecoDaCotacao = { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string }`, `type Cotacao = { id: string; valorCentavos: number; minutos: number; expiraEm: string; exemplo: boolean; endereco: EnderecoDaCotacao }` e `type RespostaDaCotacao = { ok: true; cotacao: Cotacao } | { ok: false; erro: CodigoDoFechamento; campos?: Partial<Record<'cep' | 'numero' | 'complemento', string>> }`.
  - Em `cotacao.ts`: `VALIDADE_DA_COTACAO_MS = 15 * 60 * 1000`; `cotarDeExemplo(cep: string): { valorCentavos: number; minutos: number } | null`, a conta que hoje mora em `cotarEntregaDeExemplo` (`src/lib/entrega.ts`): CEP começando por 0 entrega, com `distancia = Number(cep.slice(1, 4)) % 17`, valor `790 + distancia * 45` e minutos `30 + distancia * 2`; senão `null`. E `registrarCotacao(c: { usuarioId: string | null; valorCentavos: number; minutos: number } & EnderecoDaCotacao): Promise<string>`, pela `privado.registrar_cotacao` com a chave secreta (`.schema('privado')`), `p_origem: 'exemplo'` e `p_uber_cotacao_id: null`; erro vira `falhaDoBanco('registrar_cotacao', erro, status)`.
  - Em `acoes.ts`: `cotarEntrega(entrada: unknown): Promise<RespostaDaCotacao>`.

- [ ] **Step 1: Escrever os testes que falham**

Com `buscarCep`, `consumirLimite`, `obterUsuario`, `registrarCotacao`, `mercadoPagoEmTeste` e `headers` falsos:
- **Campos.** `entrada` que não é objeto, ou com campo que não é texto: `campos_invalidos`. CEP aceita `03183-002` e `03183002` e recusa o resto com `campos.cep = 'Confira o CEP: ele tem 8 números.'`. Número vazio: `campos.numero = 'Falta o número da casa ou do prédio.'`; fora de `^[0-9A-Za-z][0-9A-Za-z /-]{0,9}$` (a regra do banco): `campos.numero = 'Use só letras e números no número, até 10.'`. Complemento com mais de 60, ou com controle (`[\u0000-\u001f\u007f-\u009f]`), `<` ou `>`: `campos.complemento = 'Use até 60 letras, sem < nem >.'`. Cada item de `HOSTIS` em cada campo: `campos_invalidos`, sem chamar o limite.
- **Ordem.** O limite é `cotar:ip:<ip>` com 10 por 3600 s, só chamado com os campos certos; estourado: `muitas_tentativas`, sem chamar `buscarCep`.
- **CEP.** `buscarCep` devolve `null`, ou rua com menos de 2 letras: `cep_nao_encontrado`. CEP `13010-000` (Campinas): `fora_da_area`.
- **Produção.** Com `mercadoPagoEmTeste()` falso, a cotação de exemplo é recusada com `entrega_indisponivel` e nada é registrado (backend §13).
- **Registro.** Deslogada: `registrarCotacao` recebe `usuarioId: null`; logada: o `id` dela. A resposta é `{ ok: true, cotacao }` com exatamente as chaves de `Cotacao`, `exemplo: true` e `expiraEm` 15 min depois de agora (relógio falso). `registrarCotacao` ou `buscarCep` lançando: `tente_de_novo`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/fechamento-cotacao.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 3: Implementar** a interface. Os campos são aparados antes de conferir; o CEP vai a `buscarCep` só com os 8 dígitos. `cotarEntregaDeExemplo` continua em `src/lib/entrega.ts` até a Parte B tirar o seu último uso.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/lib/fechamento src/lib/dados/cotacao.ts src/app/sacola/acoes.ts tests/fechamento-cotacao.test.ts
git commit -m "feat: a entrega e cotada no servidor e guardada no banco, ainda com o valor de exemplo"
```

### Task 4: Fechar o pedido

**Files:**
- Create: `src/lib/dados/fechamento.ts`
- Modify: `src/app/sacola/acoes.ts`, `src/lib/fechamento/tipos.ts`
- Test: `tests/fechamento-pedido.test.ts`

**Interfaces:**
- Consumes: `criarClienteServidor()`, `erroDoBanco(onde, erro, status)`, `ErroDeRegra`, `obterUsuario()`, `CodigoDoFechamento` (Task 3).
- Produces:
  - Em `tipos.ts`: `type ItemDoPedido = { produto: string; quantos: number }` e `type RespostaDoPedido = { ok: true; pedido: { numero: string; totalCentavos: number } } | { ok: false; erro: CodigoDoFechamento }`.
  - Em `fechamento.ts`: `criarPedido(e: { itens: ItemDoPedido[]; cotacao: string; totalVisto: number; guardarEndereco: boolean }): Promise<{ numero: string; totalCentavos: number }>`, pela `public.criar_pedido` com a sessão da cliente (`p_itens`, `p_cotacao`, `p_total_visto`, `p_guardar_endereco`); a função devolve uma linha (`id, numero, total_centavos`) e o `id` não sai do módulo.
  - Em `acoes.ts`: `fecharPedido(entrada: unknown): Promise<RespostaDoPedido>`.

- [ ] **Step 1: Escrever os testes que falham**

- Deslogada (`obterUsuario` devolve `null`): `sem_sessao`, sem chamar o banco.
- **Campos**, todos com `campos_invalidos` e sem chamar o banco: `itens` que não é lista, vazia ou com 31 itens; produto repetido; produto fora de `^[a-z0-9]+(-[a-z0-9]+)*$` ou com mais de 80; cada item de `HOSTIS` como produto; `quantos` 0, 21, 1.5, `'3'` ou `NaN`; item com chave a mais; `cotacao` fora do formato UUID; `totalVisto` que não é inteiro, menor que 1 ou maior que 10000000; `guardarEndereco` que não é booleano.
- **Códigos do banco** (erro P0001 com a mensagem igual ao código): `email_nao_confirmado`, `loja_fechada`, `produto_indisponivel`, `muitos_pedidos`, `total_mudou` e `sem_sessao` passam com o mesmo nome; `cotacao_invalida` e `cotacao_vencida` viram `cotacao_vencida`; `itens_invalidos` vira `campos_invalidos`; qualquer outro erro, `tente_de_novo`.
- **Sucesso.** A chamada leva exatamente `p_itens` (a lista conferida), `p_cotacao`, `p_total_visto` e `p_guardar_endereco`; a resposta é `{ ok: true, pedido: { numero, totalCentavos } }`, sem o `id`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/fechamento-pedido.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar** a interface. Sem limite na ação: o banco já limita a 10 pedidos por hora por cliente (backend §11, "o da função").

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/lib/dados/fechamento.ts src/app/sacola/acoes.ts src/lib/fechamento/tipos.ts tests/fechamento-pedido.test.ts
git commit -m "feat: fechar o pedido pelo banco, com os itens conferidos e os erros traduzidos"
```

### Task 5: O cliente do Mercado Pago e a tradução dos estados

**Files:**
- Create: `src/lib/mercadopago/cliente.ts`, `src/lib/mercadopago/traducao.ts`
- Test: `tests/mercadopago-cliente.test.ts`, `tests/mercadopago-traducao.test.ts`

**Interfaces:**
- Consumes: `variavel('MERCADOPAGO_ACCESS_TOKEN')`, `registrarFalha(onde, erro)`; o contrato (`docs/superpowers/specs/2026-11-21-amo-mercadopago-orders.md`, §1 a §3).
- Produces:
  - `type PedidoMp = { id: string; status: string; detalhe: string; referencia: string | null; valorCentavos: number | null; pagamento: { id: string | null; status: string; detalhe: string; bandeira: string | null; parcelas: number | null; pix: { copiaECola: string; qrBase64: string; expiraEm: string | null } | null; desafioUrl: string | null } | null }`: só o que o servidor usa, cada campo conferido na leitura (abaixo); o que não confere vira `null`, e um pedido sem `id` ou sem `status` válidos não é um `PedidoMp`.
  - `type ResultadoMp = { ok: true; pedido: PedidoMp } | { ok: false; status: number; codigo: string | null }`: `status` 0 sem resposta (rede ou 6 s); `codigo` só se o corpo de erro trouxer um código em `^[a-z0-9_]{1,60}$` (em `errors[0].code` ou `code`), nunca a mensagem.
  - `valorEmReais(centavos: number): string` (`9280` dá `'92.80'`).
  - `criarPedidoPix(p: { tentativa: string; totalCentavos: number; email: string }): Promise<ResultadoMp>`
  - `criarPedidoCartao(p: { tentativa: string; totalCentavos: number; email: string; cartao: { token: string; bandeira: string; tipo: 'credit_card' | 'debit_card'; parcelas: number }; documento: { tipo: 'CPF'; numero: string } | null }): Promise<ResultadoMp>`; HTTP 402 com corpo de pedido devolve `ok: true` com esse pedido.
  - `lerPedidoMp(id: string): Promise<ResultadoMp>`, `cancelarPedidoMp(id: string, tentativa: string): Promise<ResultadoMp>`, `estornarPedidoMp(id: string, tentativa: string): Promise<ResultadoMp>`.
  - Em `traducao.ts`: `type EstadoDaTentativa = 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'expirado' | 'estornado' | 'contestado'` (os que `aplicar_pagamento` aceita) e `traduzir(p: PedidoMp): { status: EstadoDaTentativa; detalhe: string; recusa: string | null } | null`, pela tabela do contrato §2 (status e detalhe do pagamento; sem pagamento, os do pedido); fora da tabela, `null`.

Conferência dos campos lidos: `id` do pedido e do pagamento em `^[A-Za-z0-9_-]{1,64}$`; `status` em `^[a-z_]{1,40}$`; `status_detail` em `^[a-z0-9_]{1,100}$`; `external_reference` em UUID; `total_amount` em `^\d+(\.\d{1,2})?$` (vira centavos sem ponto flutuante); `qr_code` com 1 a 1000 caracteres, sem controle, `<` nem `>`; `qr_code_base64` em `^[A-Za-z0-9+/=]{1,40000}$`; `date_of_expiration` uma data válida (sai em ISO); `payment_method.id` em `^[a-z_]{2,20}$`; `installments` inteiro de 1 a 12; a URL do desafio (`payment_method.transaction_security.url`) só se for `https:` com host `mercadopago.com.br`, `mercadopago.com` ou subdomínio deles.

- [ ] **Step 1: Escrever os testes que falham**

Com `fetch` falso e `MERCADOPAGO_ACCESS_TOKEN=APP_USR-teste`:
- `criarPedidoPix({ tentativa: <uuid>, totalCentavos: 9280, email: 'maria@exemplo.com' })` faz `POST https://api.mercadopago.com/v1/orders` com `Authorization: Bearer APP_USR-teste`, `X-Idempotency-Key: <uuid>`, `Content-Type: application/json` e o corpo exato do contrato §1.1 (`total_amount` e `amount` `'92.80'`, `external_reference` igual à tentativa, `expiration_time` `'PT30M'`). A resposta de exemplo do contrato vira `PedidoMp` com `pix` preenchido e `valorCentavos` 9280; uma resposta `processing` sem QR dá `pix: null`.
- `criarPedidoCartao` manda o corpo do contrato §1.2, com `config.online.transaction_security` `{ validation: 'on_fraud_risk', liability_shift: 'required' }`, sem `identification` quando `documento` é `null`; uma resposta `processed`/`accredited` dá `bandeira` e `parcelas`; uma `action_required`/`pending_challenge` dá `desafioUrl`; URL de desafio `http:` ou de outro host dá `null`; HTTP 402 com corpo de pedido `failed` dá `ok: true`.
- `lerPedidoMp('ORD1')` faz `GET .../v1/orders/ORD1` sem `X-Idempotency-Key`; 404 com `{ "errors": [{ "code": "order_not_found" }] }` dá `{ ok: false, status: 404, codigo: 'order_not_found' }`.
- `cancelarPedidoMp('ORD1', <uuid>)` e `estornarPedidoMp('ORD1', <uuid>)` fazem `POST .../cancel` e `.../refund` sem corpo, com `X-Idempotency-Key` `<uuid>-cancelar` e `<uuid>-estornar`.
- `fetch` que rejeita, ou que passa de 6 s: `{ ok: false, status: 0, codigo: null }`, sem lançar.
- Resposta hostil (`qr_code` com `<script>`, `id` com espaço, base64 com 50000 caracteres, `installments` 40): o campo vira `null` (ou o pedido não é aceito, quando é o `id`).
- O token, o corpo e o QR nunca aparecem no `console.error` (espião).
- `traduzir`: uma verificação por linha da tabela do contrato §2, e `null` para `{ status: 'novo_estado', detalhe: 'x' }`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/mercadopago-cliente.test.ts tests/mercadopago-traducao.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 3: Implementar** a interface. Falha HTTP vai ao log por `registrarFalha('mercadopago:<operacao>', { status, code })`; nada mais.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/lib/mercadopago tests/mercadopago-cliente.test.ts tests/mercadopago-traducao.test.ts
git commit -m "feat: o cliente do Mercado Pago por fetch e a traducao dos estados para os do banco"
```

### Task 6: A assinatura do aviso

**Files:**
- Create: `src/lib/mercadopago/assinatura.ts`
- Test: `tests/mercadopago-assinatura.test.ts`

**Interfaces:**
- Produces: `conferirAssinatura(e: { assinatura: string | null; requestId: string | null; dataId: string | null; segredo: string; agora: number }): boolean` (`agora` em milissegundos).

Regra (contrato §4): o cabeçalho `x-signature` é uma lista `chave=valor` separada por vírgula, com `ts` e `v1` (64 hexadecimais). O texto assinado é `id:<dataId>;request-id:<requestId>;ts:<ts>;`, sem a parte que faltar (`dataId` ou `requestId` ausentes). A assinatura confere se o HMAC-SHA256 em hexadecimal, com o segredo, bate em tempo constante (`timingSafeEqual`, em buffers do mesmo tamanho) com `v1`, usando o `dataId` em minúsculas **ou** como veio. O `ts` com mais de 12 dígitos está em milissegundos; senão, em segundos. Recusa `ts` mais de 1 hora no passado ou mais de 5 min no futuro.

- [ ] **Step 1: Escrever os testes que falham**

Com o HMAC calculado no teste (`node:crypto`):
- assinatura certa, com o `dataId` `ORD01ABC` assinado em minúsculas: verdadeiro; assinado como veio: verdadeiro;
- segredo errado, `dataId` trocado, `requestId` trocado, `v1` com um caractere a mais: falso, sem lançar;
- cabeçalho sem `v1`, sem `ts`, vazio, `null` ou lixo: falso;
- `ts` de 2 horas atrás: falso; 10 min no futuro: falso; `ts` em segundos (10 dígitos) de agora: verdadeiro;
- `dataId` ausente: o texto sai sem a parte `id:` e confere.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/mercadopago-assinatura.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar** a função.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/lib/mercadopago/assinatura.ts tests/mercadopago-assinatura.test.ts
git commit -m "feat: a assinatura do aviso do Mercado Pago, conferida em tempo constante e com prazo"
```

### Task 7: O banco do pagamento pelo servidor

**Files:**
- Create: `supabase/migrations/<versão>_pagamento_pelo_servidor.sql` (o nome final vem do `list_migrations` depois de aplicar), `supabase/tests/11_pagamento_pelo_servidor.sql`
- Modify: `supabase/tests/90_permissoes.sql`, `src/lib/dados/banco.ts` (regenerado), `supabase/README.md`
- Modify: `src/lib/dados/fechamento.ts`; Create: `src/lib/dados/pagamentos.ts`
- Test: `tests/dados-pagamentos.test.ts`

**Interfaces:**
- Produces, no banco (`security definer`, `set search_path = ''`, nomes qualificados, `EXECUTE` só para `service_role`, como as outras de `privado`):
  - `privado.pagamentos_a_cancelar_no_mp(p_pedido uuid default null) returns table (pagamento_id uuid, mp_pedido_id text)`: as tentativas `cancelado` ou `expirado` cujo `privado.pagamentos_mp.status_mp` ainda é `pendente` e que têm `mp_pedido_id`; só as do pedido quando `p_pedido` vem; até 200, das mais antigas.
  - `privado.mp_pedido_da_tentativa(p_pagamento uuid) returns text`: o `mp_pedido_id` da tentativa, ou nulo.
- Produces, em `src/lib/dados/fechamento.ts` (sessão da cliente; a RLS limita às dela):
  - `lerPedidoParaPagar(numero: string): Promise<{ id: string; totalCentavos: number; estado: string } | null>` (número fora do formato: `null` sem ir ao banco).
  - `iniciarPagamento(pedidoId: string, forma: 'pix' | 'cartao'): Promise<string>`: o `id` da tentativa, pela `public.iniciar_pagamento`; P0001 vira `ErroDeRegra`.
  - `lerUltimaTentativa(pedidoId: string): Promise<{ id: string; forma: 'pix' | 'cartao'; status: string; recusa: string | null; pixCopiaECola: string | null; pixQrBase64: string | null; pixExpiraEm: string | null; criadoEm: string } | null>`.
- Produces, em `src/lib/dados/pagamentos.ts` (chave secreta, só funções de `privado`):
  - `aplicarPagamento(a: { tentativa: string; mpPedidoId: string | null; mpPagamentoId: string | null; status: EstadoDaTentativa; detalhe: string; valorCentavos: number; bandeira?: string | null; final?: string | null; parcelas?: number | null; pixCopiaECola?: string | null; pixQrBase64?: string | null; pixExpiraEm?: string | null; recusa?: string | null }): Promise<{ tentativa: string; pedido: string }>` (os estados em que tentativa e pedido ficaram).
  - `tentativasACancelarNoMp(pedidoId?: string): Promise<{ tentativa: string; mpPedidoId: string }[]>`
  - `mpPedidoDaTentativa(tentativa: string): Promise<string | null>`
  - `pagamentosAReconciliar(): Promise<{ tentativa: string; mpPedidoId: string | null; status: string }[]>`
  - `registrarEventoWebhook(e: { eventoId: string; tipo: string | null; recursoId: string | null }): Promise<{ evento: number; situacao: 'novo' | 'ja_tratado' | 'tratar_de_novo' }>` (origem `mercadopago`) e `concluirEventoWebhook(evento: number, erro: string | null): Promise<void>`.
  - Todas: erro do banco vira `erroDoBanco('<funcao>', erro, status)`.

- [ ] **Step 1: A migration e o teste de banco**

Escrever a migration com as duas funções e os `grant execute ... to service_role`, e `supabase/tests/11_pagamento_pelo_servidor.sql` no estilo dos outros (usar os ajudantes de `_apoio.sql`; cliente, pedido e tentativas montados como em `07_pagamento.sql`), verificando:
- uma tentativa `cancelado` com `status_mp = 'pendente'` e `mp_pedido_id` aparece; com `status_mp = 'cancelado'`, ou sem `mp_pedido_id`, ou ainda `pendente`, não; o filtro por pedido funciona;
- `mp_pedido_da_tentativa` devolve o `mp_pedido_id` e nulo para tentativa sem linha em `pagamentos_mp`;
- `anon` e `authenticated` não executam nenhuma das duas; `service_role` executa.

Aplicar pelo MCP (`apply_migration`, nome `pagamento_pelo_servidor`), dar ao arquivo o nome que o `list_migrations` mostrar, rodar o teste novo, acrescentar as duas funções ao inventário `_esperado` de `90_permissoes.sql` e rodá-lo, rodar o conselheiro e regenerar `banco.ts`.
Expected: `RESUMO` sem falha nos dois testes; o conselheiro só com o que o `supabase/README.md` diz ser de propósito.

- [ ] **Step 2: Escrever os testes que falham da camada de dados**

Em `tests/dados-pagamentos.test.ts`, com os clientes falsos (`criarClienteServidor` e `criarClienteAdmin`): cada função chama a tabela ou a função certa com os parâmetros certos (`aplicarPagamento` manda `p_pagamento`, `p_mp_pedido_id`, ... `p_recusa`, com `null` no que não veio); devolve a forma da interface; erro P0001 vira `ErroDeRegra` com o código; outro erro vira `Falha no banco (<funcao>): <código ou HTTP status>`; `lerPedidoParaPagar('nao-e-numero')` devolve `null` sem chamar o banco.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/dados-pagamentos.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar** as funções da interface.

- [ ] **Step 5: Atualizar o `supabase/README.md`**: a migration nova na tabela, o teste 11 na tabela dos testes, as duas funções na lista do que o servidor chama com a chave secreta.

- [ ] **Step 6: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add supabase src/lib/dados tests/dados-pagamentos.test.ts
git commit -m "feat: o banco do pagamento pelo servidor, com as tentativas a cancelar no Mercado Pago"
```

### Task 8: Sincronizar uma tentativa com o Mercado Pago

O que o pagamento, a situação, o aviso e a reconciliação fazem igual: aplicar o que o Mercado Pago disse, estornar o que o banco mandou estornar, cancelar lá o que terminou aqui.

**Files:**
- Create: `src/lib/mercadopago/sincronizar.ts`
- Test: `tests/mercadopago-sincronizar.test.ts`

**Interfaces:**
- Consumes: Task 5 (`PedidoMp`, `traduzir`, `lerPedidoMp`, `cancelarPedidoMp`, `estornarPedidoMp`), Task 7 (`aplicarPagamento`), `registrarFalha`.
- Produces:
  - `type Aplicado = { tentativa: string; pedido: string }`
  - `aplicarRespostaDoMp(tentativa: string, pedido: PedidoMp, final?: string | null): Promise<Aplicado | null>`: `traduzir`; tradução `null` registra a falha e devolve `null` sem aplicar; senão `aplicarPagamento` com `mpPedidoId`, `mpPagamentoId`, `status`, `detalhe`, `valorCentavos` (o do Mercado Pago; sem ele, 0), bandeira, parcelas, os campos do Pix, a `recusa` e o `final`. Se a tentativa ficou `a_estornar`, chama `estornarNoMp`.
  - `estornarNoMp(tentativa: string, mpPedidoId: string): Promise<Aplicado | null>`: `estornarPedidoMp`; resposta `ok` aplicada (a tradução dá `estornado`); 409 `order_already_refunded` aplica `estornado` (detalhe `refunded`); qualquer outra falha deixa `a_estornar` (a reconciliação tenta de novo) e devolve `null`.
  - `sincronizarTentativa(tentativa: string, mpPedidoId: string): Promise<Aplicado | null>`: `lerPedidoMp` e `aplicarRespostaDoMp`; falha do `GET` devolve `null`.
  - `cancelarNoMp(tentativa: string, mpPedidoId: string): Promise<Aplicado | null>`: `cancelarPedidoMp`; `ok` aplicado; 409 `order_already_canceled` aplica `cancelado` (detalhe `canceled`); 409 `cannot_cancel_order` faz `sincronizarTentativa` (ela pode ter sido paga); outra falha devolve `null`.

- [ ] **Step 1: Escrever os testes que falham**

Com o cliente do Mercado Pago e `aplicarPagamento` falsos:
- pedido `processed`/`accredited` aplica `aprovado` com o valor e devolve o que o banco disse;
- o banco responde `a_estornar`: chama o estorno e aplica `estornado`; estorno com 409 `order_already_refunded` aplica `estornado`; estorno que falha (status 0) deixa sem aplicar e devolve `null`;
- tradução `null` não chama `aplicarPagamento` e registra a falha;
- `cancelarNoMp`: `ok` aplica `cancelado`; 409 `order_already_canceled` aplica `cancelado`; 409 `cannot_cancel_order` lê o pedido e aplica o que ele diz (por exemplo, `aprovado`);
- Pix pendente com QR: `aplicarPagamento` recebe `pixCopiaECola`, `pixQrBase64` e `pixExpiraEm`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/mercadopago-sincronizar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar** a interface.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/lib/mercadopago/sincronizar.ts tests/mercadopago-sincronizar.test.ts
git commit -m "feat: aplicar o que o Mercado Pago disse, estornar o devido e cancelar la o que terminou aqui"
```

### Task 9: Pagar com Pix e com cartão

**Files:**
- Modify: `src/app/sacola/acoes.ts`, `src/lib/fechamento/tipos.ts`
- Test: `tests/fechamento-pagamento.test.ts`

**Interfaces:**
- Consumes: Tasks 3, 4, 5, 7 e 8; `consumirLimite`; `obterUsuario`; `conferirNumeroDoPedido` (`src/lib/conta/regras.ts`).
- Produces, em `tipos.ts`:
  - `type EstadoDoPedido = 'aguardando_pagamento' | 'pago' | 'em_preparo' | 'a_caminho' | 'entregue' | 'cancelado'`, que hoje mora em `src/lib/dados/pedidos.ts` (só servidor): ele passa a morar em `tipos.ts` (puro), e `pedidos.ts` o importa e reexporta, sem duplicar.
  - `type PagamentoNaTela = { forma: 'pix' | 'cartao'; estado: string; recusa: string | null; pix: { copiaECola: string; qrBase64: string; expiraEm: string | null } | null; desafioUrl: string | null }`
  - `type SituacaoDoPedido = { numero: string; estado: EstadoDoPedido; pagamento: PagamentoNaTela | null }`
  - `type RespostaDoPagamento = { ok: true; situacao: SituacaoDoPedido } | { ok: false; erro: CodigoDoFechamento }`
  - `mensagemDaRecusa(recusa: string | null): string`: `insufficient_amount` e `card_insufficient_amount`: `O cartão não tem limite para este valor.`; `bad_filled_card_data`: `Confira os dados do cartão.`; `rejected_by_issuer` e `required_call_for_authorize`: `O banco do cartão recusou. Fale com ele ou use outro cartão.`; `high_risk`: `O pagamento foi recusado por segurança. Tente outro cartão.`; `cc_rejected_3ds_challenge` e `3ds_challenge_expired`: `A confirmação do banco não foi concluída. Tente de novo.`; `max_attempts_exceeded`: `Foram muitas tentativas com este cartão. Use outro.`; `card_disabled`: `Este cartão está desativado. Use outro.`; `invalid_installments`: `Escolha outro número de parcelas.`; qualquer outro: o texto de `pagamento_recusado`.
- Produces, em `acoes.ts`:
  - `pagarComPix(entrada: unknown): Promise<RespostaDoPagamento>`, com `entrada = { numero }`.
  - `pagarComCartao(entrada: unknown): Promise<RespostaDoPagamento>`, com `entrada = { numero, token, bandeira, tipo, parcelas, final, documento? }`.

O caminho das duas, nesta ordem: sessão (`sem_sessao`); campos (`campos_invalidos`); limite `pagar:<id da cliente>` com 20 por 3600 s (`muitas_tentativas`); `lerPedidoParaPagar` (sem pedido, ou fora de `aguardando_pagamento`: `pedido_invalido`); `iniciarPagamento` (P0001 `pedido_invalido`: `pedido_invalido`; `muitas_tentativas`: `tentativas_esgotadas`; `sem_sessao`: `sem_sessao`; outro: `tente_de_novo`); `tentativasACancelarNoMp(pedido)` e `cancelarNoMp` em cada uma (sem esperar o sucesso para seguir; falha vai ao log); a criação no Mercado Pago com o `totalCentavos` do banco e o e-mail da conta; e então:
- resposta `ok`: `aplicarRespostaDoMp` (no cartão, com o `final`); a resposta é a situação montada com o estado em que o banco deixou a tentativa e o pedido, o Pix da resposta e, no cartão, a `desafioUrl`;
- sem resposta, 5xx, 409, 423 ou 429: a tentativa fica pendente; `pagamento_indisponivel`;
- outro 4xx (recusa definitiva da criação): `aplicarPagamento` com `cancelado`, detalhe `criacao_recusada` e o valor do pedido; `pagamento_indisponivel`.

Campos do cartão: `token` em `^[A-Za-z0-9-]{20,100}$`; `bandeira` em `^[a-z_]{2,20}$`; `tipo` `credit_card` ou `debit_card`; `parcelas` inteiro de 1 a 12; `final` em `^\d{4}$`; `documento`, quando vem, `{ tipo: 'CPF', numero }` com 11 dígitos depois de tirar o que não é dígito (nunca vai ao log nem ao banco).

- [ ] **Step 1: Escrever os testes que falham**

Com tudo o que está abaixo das ações falso:
- a ordem do caminho: deslogada não chama nada; campo errado não gasta limite; limite estourado não lê o pedido; pedido de outro número ou já pago dá `pedido_invalido` sem iniciar tentativa;
- cada campo do cartão com cada item de `HOSTIS` e os casos de borda (`parcelas` 0, 13, 1.5; `final` `'12a4'`; CPF com 10 dígitos): `campos_invalidos`;
- os códigos de `iniciarPagamento` traduzidos como acima;
- o valor e o e-mail enviados ao Mercado Pago são os do banco e da sessão, nunca algo da entrada: uma entrada com chave a mais (`total`, `email`) é recusada com `campos_invalidos`, como na Task 4, e o teste do caminho feliz confere o valor e o e-mail que foram enviados;
- a tentativa anterior pendente no Mercado Pago é cancelada (`cancelarNoMp` chamado com ela);
- Pix: resposta com QR devolve `situacao.pagamento.pix`; resposta sem QR devolve `pix: null`;
- cartão aprovado: `situacao.estado` `pago`; recusado: `situacao.pagamento.estado` `recusado` com a `recusa`; desafio: `desafioUrl` preenchida;
- Mercado Pago sem resposta: `pagamento_indisponivel` e nenhum `aplicarPagamento`; 400: `aplicarPagamento` com `cancelado`/`criacao_recusada` e `pagamento_indisponivel`;
- o CPF e o token não aparecem em nenhum `console.error`;
- `mensagemDaRecusa` para cada código da lista e para um desconhecido.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/fechamento-pagamento.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar** a interface.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/app/sacola/acoes.ts src/lib/fechamento/tipos.ts tests/fechamento-pagamento.test.ts
git commit -m "feat: pagar com Pix e com cartao pelo Mercado Pago, com o valor do banco e a tentativa como chave"
```

### Task 10: A situação do pedido

**Files:**
- Modify: `src/app/sacola/acoes.ts`
- Test: `tests/fechamento-situacao.test.ts`

**Interfaces:**
- Consumes: Tasks 7, 8 e 9 (`SituacaoDoPedido`, `lerPedidoParaPagar`, `lerUltimaTentativa`, `mpPedidoDaTentativa`, `sincronizarTentativa`), `consumirLimite`.
- Produces: `situacaoDoPedido(entrada: unknown): Promise<{ ok: true; situacao: SituacaoDoPedido } | { ok: false; erro: CodigoDoFechamento }>`, com `entrada = { numero }`.

Caminho: sessão; número (`conferirNumeroDoPedido`); limite `situacao:<id da cliente>` com 240 por 3600 s; o pedido dela (sem ele: `pedido_invalido`); a última tentativa. Se a tentativa está `pendente`, tem pedido no Mercado Pago (`mpPedidoDaTentativa`) e `consumirLimite('mp:<tentativa>', 1, 15)` deixa, `sincronizarTentativa` e lê de novo o pedido e a tentativa. A resposta leva o estado do pedido e, da tentativa, só `forma`, `estado`, `recusa` e o Pix (sem `desafioUrl`, que não é guardada: `null`).

- [ ] **Step 1: Escrever os testes que falham**

- deslogada, número inválido, limite estourado, pedido de outra: os códigos e nada chamado depois;
- tentativa pendente com `ORD` e a janela de 15 s livre: sincroniza uma vez e devolve o estado novo (por exemplo, pedido `pago`);
- janela ocupada: não sincroniza e devolve o que o banco tem;
- tentativa pendente sem `ORD`: não sincroniza;
- pedido sem tentativa: `pagamento: null`;
- a resposta tem só as chaves de `SituacaoDoPedido` (sem `id`, sem `mp_pedido_id`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/fechamento-situacao.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar** a ação.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/app/sacola/acoes.ts tests/fechamento-situacao.test.ts
git commit -m "feat: a situacao do pedido, que pergunta ao Mercado Pago enquanto o pagamento espera"
```

### Task 11: O aviso do Mercado Pago

**Files:**
- Create: `src/app/api/webhooks/mercadopago/route.ts`
- Test: `tests/aviso-mercadopago.test.ts`

**Interfaces:**
- Consumes: Task 6 (`conferirAssinatura`), Task 5 (`lerPedidoMp`), Task 7 (`registrarEventoWebhook`, `concluirEventoWebhook`), Task 8 (`aplicarRespostaDoMp`), `variavel('MERCADOPAGO_WEBHOOK_SECRET')`.
- Produces: `POST(request: Request): Promise<Response>`.

Caminho (backend §10.4 e contrato §4):
1. `data.id` e `type` da URL; `x-signature` e `x-request-id` dos cabeçalhos. Assinatura que não confere: 401 com corpo vazio, sem dizer por quê.
2. `type` diferente de `order` e de `topic_chargebacks_wh`: 200, sem registrar. `data.id` fora de `^[A-Za-z0-9_-]{1,64}$`: 200, sem registrar.
3. `registrarEventoWebhook({ eventoId: <x-request-id>, tipo, recursoId: data.id })` (o `x-request-id` conferido em `^[A-Za-z0-9_.:-]{1,200}$`; fora disso, `<data.id>:<ts>`). `ja_tratado`: 200 e para.
4. `lerPedidoMp(data.id)`; falha: `concluirEventoWebhook(evento, 'mp_<status>')` e 500.
5. Pedido sem `referencia` (não é nosso): `concluirEventoWebhook(evento, null)` e 200.
6. `aplicarRespostaDoMp(referencia, pedido)`; `concluirEventoWebhook(evento, null)`; 200.
7. Qualquer exceção depois do passo 3: `concluirEventoWebhook(evento, <código curto>)` e 500. O corpo do aviso nunca é lido para decidir nada.

- [ ] **Step 1: Escrever os testes que falham**

Chamando `POST` com `new Request(...)` e as dependências falsas:
- assinatura errada ou ausente: 401, corpo vazio, nada registrado;
- `type=payment`: 200, nada registrado; `data.id` com espaço: 200, nada registrado;
- `ja_tratado`: 200, sem ler o Mercado Pago;
- `novo` e `tratar_de_novo`: lê o pedido, aplica pela `referencia` da resposta (nunca pelo corpo do aviso: o teste manda um corpo que diz outra coisa) e conclui sem erro; 200;
- `lerPedidoMp` falhando: conclui com `mp_500` e responde 500;
- `aplicarRespostaDoMp` lançando: conclui com erro e responde 500;
- pedido sem referência: conclui sem erro, 200, sem aplicar.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/aviso-mercadopago.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar** a rota.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/app/api/webhooks/mercadopago tests/aviso-mercadopago.test.ts
git commit -m "feat: o aviso do Mercado Pago, assinado, uma vez so e lido na API antes de aplicar"
```

### Task 12: A reconciliação

**Files:**
- Create: `src/app/api/tarefas/reconciliar/route.ts`
- Test: `tests/tarefa-reconciliar.test.ts`
- Modify: `supabase/README.md` (como chamar a tarefa)

**Interfaces:**
- Consumes: Task 7 (`pagamentosAReconciliar`, `tentativasACancelarNoMp`, `aplicarPagamento`), Task 8 (`sincronizarTentativa`, `estornarNoMp`, `cancelarNoMp`), `variavel('TAREFAS_SEGREDO')`.
- Produces: `POST(request: Request): Promise<Response>`.

Caminho (backend §10.4): o cabeçalho `Authorization: Bearer <TAREFAS_SEGREDO>` conferido em tempo constante (comparar os SHA-256 dos dois textos com `timingSafeEqual`); sem ele ou errado: 401 com corpo vazio. Depois, numa passada só, com um prazo total de 50 s (parar de começar itens novos depois dele):
1. `pagamentosAReconciliar()`: `pendente` com `ORD`, `sincronizarTentativa`; `pendente` sem `ORD` (a criação nunca respondeu), `aplicarPagamento` com `cancelado`, detalhe `sem_pedido_no_mp` e valor 0; `a_estornar`, `estornarNoMp` (sem `ORD`, registra a falha: precisa da equipe).
2. `tentativasACancelarNoMp()`: `cancelarNoMp` em cada uma.
3. Responde 200 com `{ "conferidas": n, "canceladas": m, "falhas": k }` (só contagens).

- [ ] **Step 1: Escrever os testes que falham**

- sem `Authorization`, com outro segredo, com o segredo de outro tamanho: 401, nada chamado;
- uma lista com cada caso do passo 1 e duas tentativas a cancelar: cada função chamada com a tentativa certa e a contagem certa na resposta;
- uma sincronização que lança não para as outras e conta como falha;
- o prazo de 50 s (relógio falso): os itens depois do prazo não são começados.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/tarefa-reconciliar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar** a rota.

- [ ] **Step 4: Documentar** no `supabase/README.md`, numa seção "Mercado Pago": a reconciliação (`curl -X POST -H "Authorization: Bearer $TAREFAS_SEGREDO" <site>/api/tarefas/reconciliar`, a cada 10 min pelo agendador da hospedagem, etapa 4) e o que é do dono no painel do Mercado Pago (backend §13): a URL do aviso (`<site>/api/webhooks/mercadopago`), os eventos "Order (Mercado Pago)" e "Chargebacks", a assinatura secreta em `MERCADOPAGO_WEBHOOK_SECRET`, as credenciais de teste em `MERCADOPAGO_ACCESS_TOKEN` e `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, e `MERCADOPAGO_AMBIENTE=teste`.

- [ ] **Step 5: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/app/api/tarefas tests/tarefa-reconciliar.test.ts supabase/README.md
git commit -m "feat: a reconciliacao, que confere as tentativas paradas, estorna o devido e cancela la o que expirou aqui"
```
