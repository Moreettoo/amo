# AMO · Os adiados da etapa 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os pequenos defeitos que as revisões finais da etapa 2 deixaram anotados, menos os três que só fazem sentido com o fechamento de verdade (etapa 3).

**Architecture:** Nada novo. Cada tarefa mexe numa peça que já existe: a camada de dados (`src/lib/dados/`), as regras de entrada (`src/lib/conta/regras.ts`), os formulários e as ações de Minha conta, a página do pedido, um script de ensaio e o sidecar de design.

**Tech Stack:** Next.js 16.3.2 (App Router), React 19, `@supabase/supabase-js`, Supabase (MCP `supabase-amo`, banco de desenvolvimento `yuhrtuizxuvqvvjtcemz`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (§5, regras 10 a 12; §14; §19) e a lista "Adiado na revisão final (2026-11-21)" no fim de `docs/superpowers/plans/2026-11-18-amo-etapa-2-leitura.md`, que é a origem de cada tarefa.

## Fora deste plano

- Os três itens "Para a etapa 3" da lista (a marca `APP_USR-` da varredura, o nome de `criarClientePublico`, as variáveis do Uber no `.env.example`): entram no plano da etapa 3, que mexe nessas peças.
- O aviso de LCP do logo do rodapé nas telas curtas: fica como está. O motivo já está escrito em `src/components/layout/Footer.tsx` (o logo é `lazy` de propósito).

## Global Constraints

- Ler o guia em `node_modules/next/dist/docs/` antes de tocar em rota, metadados, página de não encontrado ou ação de servidor (`AGENTS.md`).
- O navegador não fala com o Supabase. Nenhum arquivo com `'use client'` importa de `src/lib/dados/` nem de `@supabase/supabase-js`.
- Todo módulo de `src/lib/dados/` começa com `import 'server-only'`.
- Nenhum segredo em log, em mensagem de erro ou em arquivo versionado. Erro do banco chega à tela só como código curto, nunca a mensagem crua.
- Nenhum filtro montado com texto: nada de `.or()` nem `.filter()` com valor de fora.
- Migration aplicada não se edita. Depois de mexer no banco: rodar `supabase/tests/90_permissoes.sql` e o conselheiro de segurança (`get_advisors`).
- Testes de banco em SQL rodam numa chamada só do MCP `supabase-amo` (`execute_sql`): o conteúdo de `supabase/tests/_apoio.sql` seguido do conteúdo do teste. O resultado é uma linha `RESUMO` e uma linha por verificação, as falhas primeiro.
- Sem travessão nem meia-risca em `src/`, `tests/`, `scripts/` e README (`tests/travessao.test.ts`). Comentário de código sem acento, como no resto do repositório.
- Link entre páginas é `<a>` comum, não `next/link`.
- Visual fino e delicado (`DESIGN.md`); nenhuma mudança visual além da pedida.
- Commit no padrão do repositório (`feat:`/`fix:`/`test:`/`docs:` em português, sem acento no assunto), terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Trabalho na branch `feat/etapa-3`; nada de `stash`, `reset` ou `checkout` amplo.
- Suíte completa: `npx vitest run` (linha de base em 2026-11-21: 51 arquivos, 1027 testes, todos passando), `npx tsc --noEmit` e `npm run lint`.

## Review Focus

1. **Banco fora do ar no build.** A mensagem do erro diz o lugar e, sem código, o status HTTP (0 quando nem houve resposta), nunca a mensagem crua. Teste na Task 1.
2. **Dois produtos com a mesma `ordem` no painel.** A ordem entre eles é a do slug, igual em toda renovação do cache. Teste na Task 1.
3. **Caractere C1 (NEL, U+0085) colado de outro programa num campo de Minha conta.** Recusado na validação, com a mensagem do campo, e não como "tente de novo" vindo do banco. Teste na Task 2.
4. **A cliente corrige a rua enquanto a busca do CEP ainda não voltou.** O que ela digitou fica. Teste na Task 3.
5. **Sem JavaScript, os botões de remover endereço e cancelar pedido.** Ou funcionam, ou não aparecem. Teste na Task 3.

---

### Task 1: A camada de dados diz o status HTTP e ordena o catálogo sem empate

**Files:**
- Modify: `src/lib/dados/erros.ts`, `src/lib/dados/catalogo.ts`, `src/lib/dados/pedidos.ts`, `src/lib/dados/enderecos.ts`, `src/lib/dados/perfil.ts`, `src/lib/dados/comentarios.ts` (onde houver `falhaDoBanco`/`erroDoBanco` depois de uma leitura)
- Modify: `src/lib/dados/banco.ts` (só o topo), `package.json`
- Modify: `supabase/tests/02_catalogo.sql`
- Test: `tests/dados-base.test.ts`, `tests/dados-catalogo.test.ts`

**Interfaces:**
- Produces:
  - `falhaDoBanco(onde: string, erro: { code?: string } | null, status?: number): Error`, com a mensagem `Falha no banco (<onde>): <código>`; sem código, `Falha no banco (<onde>): HTTP <status>` quando `status` foi passado (inclusive `HTTP 0`, que é "nem houve resposta"); sem código e sem status, `sem código` como hoje. O registro no log (`registrarFalha`) recebe o mesmo status.
  - `erroDoBanco(onde, erro, status?)`: o mesmo terceiro parâmetro, repassado a `falhaDoBanco`.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/dados-base.test.ts`:
- `falhaDoBanco('catalogo', { code: '' }, 503).message` é `Falha no banco (catalogo): HTTP 503`;
- `falhaDoBanco('catalogo', null, 0).message` é `Falha no banco (catalogo): HTTP 0`;
- `falhaDoBanco('catalogo', { code: 'PGRST301' }, 401).message` é `Falha no banco (catalogo): PGRST301` (o código manda);
- `falhaDoBanco('catalogo', null).message` continua `Falha no banco (catalogo): sem código`;
- o `console.error` de `registrarFalha` recebe `status: 503` no primeiro caso.

Em `tests/dados-catalogo.test.ts`:
- com o `fetch` falso respondendo 503 sem corpo de erro, `carregarCatalogo()` (ou a função de leitura que o arquivo já testa) rejeita com uma mensagem que contém `HTTP 503`;
- a URL pedida para `produtos`, `linhas`, `categorias` e `vontades` contém `order=ordem.asc,slug.asc` e a de `selos` contém `order=ordem.asc,id.asc` (conferir na URL que o `fetch` falso recebeu; o supabase-js junta as ordens com vírgula);
- uma linha com `modo_de_aproveitar` `{ "titulo": "Como aproveitar", "passos": ["Abra o pote.", "  "] }` é recusada com `linha <slug>: modo de aproveitar fora do formato`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/dados-base.test.ts tests/dados-catalogo.test.ts`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar**

- `erros.ts`: o terceiro parâmetro `status` em `falhaDoBanco` e `erroDoBanco`, com as mensagens da interface.
- Cada leitura da camada de dados que joga `falhaDoBanco`/`erroDoBanco` passa o `status` da resposta do supabase-js (`const { data, error, status } = await ...`).
- `catalogo.ts`: desempate pelo slug (`.order('ordem').order('slug')`; em `selos`, `.order('ordem').order('id')`), e cada passo do modo de aproveitar precisa ser texto com algo além de espaço.
- `banco.ts`: `import 'server-only'` logo depois das duas linhas de comentário do topo, e uma terceira linha de comentário dizendo que essa importação fica ao regenerar.
- `package.json`: `"engines": { "node": ">=22" }` (o `@supabase/supabase-js` 2.119 pede Node 22).

- [ ] **Step 4: O teste de banco do catálogo deixa de fixar quantos selos e vontades existem**

Em `supabase/tests/02_catalogo.sql`, as duas verificações que contam 7 selos e 5 vontades passam a comparar o que o visitante lê com o total da tabela (o dono pode cadastrar um selo novo pelo painel sem quebrar o teste), e "os selos têm ordem, sem repetir" vira `count(*) = count(distinct ordem)`. Rodar `02_catalogo.sql` e, em seguida, `90_permissoes.sql` pelo MCP (conferência que ficou pendente desde a migration `domingo_fechado`), e `get_advisors` do tipo `security`.
Expected: `RESUMO` sem falha nos dois; o conselheiro aponta só o que o `supabase/README.md` diz ser de propósito.

- [ ] **Step 5: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/lib/dados package.json supabase/tests/02_catalogo.sql tests/dados-base.test.ts tests/dados-catalogo.test.ts
git commit -m "fix: o erro do banco diz o status HTTP, o catalogo desempata pelo slug e passo vazio nao passa"
```

### Task 2: As regras de entrada recusam os caracteres de controle C1

**Files:**
- Modify: `src/lib/conta/regras.ts`, `src/lib/dados/cep.ts`, `src/lib/auth/volta.ts`
- Modify: `tests/fixtures/hostis.ts`
- Test: `tests/conta-regras.test.ts`, `tests/volta.test.ts`, `tests/dados-conta.test.ts` (ou o arquivo que já testa `buscarCep`)

**Interfaces:**
- Produces: a faixa de controle do site passa a ser a mesma do `[[:cntrl:]]` do banco, conferida em 2026-11-21 no banco de desenvolvimento (`en_US.UTF-8`): U+0000 a U+001F, U+007F e U+0080 a U+009F. U+00A0, U+00AD, U+200B, U+2028 e U+2029 não são controle para o banco e continuam aceitos.

- [ ] **Step 1: Escrever os testes que falham**

- `tests/fixtures/hostis.ts`: acrescentar `` `a\u0085b` `` (NEL) e `` `a\u009fb` ``.
- Nos testes que conferem "nunca passa com controle, < ou >" (`tests/conta-regras.test.ts`), a expressão de conferência vira `/[\u0000-\u001f\u007f-\u009f<>]/`.
- `conferirPerfil({ nome: 'Ana\u0085Maria', celular: '11987654321' })` não passa e tem erro em `nome`; `conferirEndereco` com `logradouro: 'Rua\u0085A'` não passa e tem erro em `logradouro`.
- `voltaSegura('/conta\u0085')` devolve `/conta`.
- `buscarCep` com o ViaCEP falso devolvendo `logradouro: 'Rua\u0085Cuiabá'` devolve `logradouro: 'RuaCuiabá'` (o controle sai, como já sai o C0).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/conta-regras.test.ts tests/volta.test.ts tests/conta-acoes.test.ts tests/auth-acoes.test.ts`
Expected: FAIL nos casos com C1.

- [ ] **Step 3: Implementar**

A faixa da interface em `CONTROLE_OU_TAG` (`regras.ts`), em `limpar` (`cep.ts`) e em `CONTROLE` (`volta.ts`).

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/lib/conta/regras.ts src/lib/dados/cep.ts src/lib/auth/volta.ts tests
git commit -m "fix: as regras de entrada recusam os caracteres de controle C1, como o banco"
```

### Task 3: Os formulários de Minha conta: sem JavaScript, CEP que volta tarde, o quinto endereço e as novidades

**Files:**
- Modify: `src/components/conta/FormsDaConta.tsx`, `src/app/conta/perfil/enderecos/page.tsx`
- Modify (se preciso): `src/app/estilos/conta.css`
- Test: `tests/conta-forms.test.tsx`, `tests/conta-paginas.test.tsx`

**Interfaces:**
- Consumes: as classes que já existem, `so-js` (some sem JavaScript, `globals.css`) e `painel__sem-js` (some com JavaScript, `conta.css`).
- Produces: `NovoEndereco({ primeiro, cheio }: { primeiro: boolean; cheio: boolean })`.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/conta-forms.test.tsx`:
- **Sem JavaScript, remover.** Em `ItemDeEndereco`, o botão "Remover" que abre a confirmação tem a classe `so-js`, e existe um botão de enviar com a classe `painel__sem-js` e o texto "Remover", dentro de um formulário com o `id` do endereço, que chama `removerEndereco` direto, sem confirmação.
- **Sem JavaScript, cancelar.** Em `CancelarPedido`, o botão "Cancelar pedido" que abre a confirmação tem a classe `so-js`, e existe um botão de enviar com a classe `painel__sem-js` e o texto "Cancelar pedido" no mesmo formulário (com o `numero`).
- **CEP que volta tarde.** Com `consultarCep` falso que só resolve quando o teste manda: digitar o CEP, sair do campo, digitar "Rua que eu sei" na Rua, resolver a busca com `{ logradouro: 'Rua Cuiabá', bairro: 'Mooca', cidade: 'São Paulo', uf: 'SP' }`: a Rua continua "Rua que eu sei"; bairro, cidade e estado vêm da busca. Sem digitar nada durante a busca, a Rua vira "Rua Cuiabá" (o comportamento de hoje).
- **O quinto endereço.** `NovoEndereco` aberto, guardar com `salvarEndereco` falso respondendo `{ ok: true, aviso: 'salvo' }`, e então renderizar de novo com `cheio`: a região viva (`aria-live="polite"`) continua no documento com "Endereço guardado.", e aparece a nota "Já são 5 endereços: para guardar outro, remova um." no lugar do botão "Adicionar endereço".
- **Novidades que não salvam.** `FormNovidades` com `aceita={false}` e `definirMarketing` falso respondendo `{ ok: false, erro: 'tente_de_novo' }`: marcar a caixa, esperar a resposta: a caixa volta desmarcada e a mensagem de erro aparece.

Em `tests/conta-paginas.test.tsx`, a frase ao lado de "Endereços":
- 0 endereços: `Até 5 endereços, um deles o principal: é o que a sacola sugere primeiro.` (como hoje);
- 1 endereço: `1 guardado, de até 5. O principal é o que a sacola sugere primeiro.`;
- 2 endereços: `2 guardados, de até 5. O principal é o que a sacola sugere primeiro.`;
- 5 endereços: a página renderiza `NovoEndereco` com `cheio` (a nota de 5 vem dele) e não um parágrafo solto.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/conta-forms.test.tsx tests/conta-paginas.test.tsx`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar**

- Os dois pares de botões (o de confirmar no lugar com `so-js`, o de enviar direto com `painel__sem-js`), sem mudar o que a cliente com JavaScript vê.
- `preencherPeloCep` guarda a rua e o bairro do começo da busca; na volta, só troca o campo que ainda está igual ao do começo. Cidade e estado vêm sempre da busca, como hoje.
- `NovoEndereco` ganha `cheio`: com ele, mostra a nota de 5 no lugar do botão e do formulário, e a região viva fica montada. A página sempre renderiza `<NovoEndereco primeiro={...} cheio={enderecos.length >= MAXIMO} />` no mesmo lugar da árvore, para o estado do componente sobreviver à atualização depois de guardar.
- `FormNovidades`: quando a ação falha, a caixa volta ao estado de antes da mudança.
- A frase de Endereços com a conta, nas três formas do Step 1.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/components/conta/FormsDaConta.tsx src/app/conta/perfil/enderecos/page.tsx src/app/estilos/conta.css tests
git commit -m "fix: Minha conta sem JavaScript, o CEP que volta tarde, o quinto endereco e as novidades que nao salvam"
```

### Task 4: As ações de Minha conta: trocar para o mesmo e-mail e a sessão da conferência de senha

**Files:**
- Modify: `src/app/conta/acoes.ts`, `src/lib/auth/senha.ts`, `src/lib/conta/mensagens.ts` (se a mensagem do campo morar lá)
- Test: `tests/conta-acoes.test.ts`, e um teste para `senhaConfere` (no arquivo que já testa `src/lib/auth/senha.ts`, ou `tests/auth-senha.test.ts` novo)

**Interfaces:**
- Consumes: `exigirUsuario` devolve `Usuario` com `email`.

- [ ] **Step 1: Escrever os testes que falham**

- `trocarEmail` com o próprio e-mail da cliente, em outra caixa e com espaços (`'  CARLA@Exemplo.com '` para a cliente `carla@exemplo.com`): responde `{ ok: false, erro: 'campos_invalidos', campos: { email: 'Esse já é o e-mail da sua conta.' } }`, não consome limite e não chama `updateUser`.
- `senhaConfere` com a senha certa: chama `signInWithPassword` e, em seguida, `signOut({ scope: 'local' })` no mesmo cliente à parte, e devolve `true`. Se o `signOut` falhar, ainda devolve `true` e registra a falha no log (`registrarFalha('senhaConfere', ...)`). Com a senha errada: não chama `signOut` e devolve o código, como hoje.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/conta-acoes.test.ts tests/auth-senha.test.ts`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar**

- Em `trocarEmail`, depois de `conferirEmail` e antes do limite, comparar com `usuario.email` sem diferença de caixa.
- Em `senhaConfere`, encerrar a sessão do login à parte logo que a senha confere (escopo `local`: só aquela sessão; as outras da cliente continuam). Atualizar o comentário do topo: a sessão do login à parte não fica viva.

- [ ] **Step 4: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/app/conta/acoes.ts src/lib/auth/senha.ts src/lib/conta tests
git commit -m "fix: trocar para o mesmo e-mail diz que ja e o da conta, e a conferencia da senha nao deixa sessao aberta"
```

### Task 5: A página de pedido não encontrado e o e-mail da lateral

**Files:**
- Modify: `src/app/conta/pedidos/[numero]/page.tsx`, `src/components/conta/PainelDaConta.tsx`, `src/app/estilos/conta.css`
- Modify (conforme a causa): `src/app/not-found.tsx`, `src/components/InlineScript.tsx`
- Test: `tests/conta-paginas.test.tsx`, `tests/nao-encontrada.test.tsx`

- [ ] **Step 1: Achar a causa do aviso**

Abrir `/conta/pedidos/AMO-ZZZZZZZZ` logada no servidor de desenvolvimento (conta de ensaio por `admin.createUser`, com `email_confirm: true`; nunca o cadastro do site, que gasta a cota de e-mail do projeto) e ler o console. Seguir superpowers:systematic-debugging até dizer qual componente renderiza a tag `<script>` no navegador e por quê.

- [ ] **Step 2: Escrever os testes que falham**

- O título da aba de um pedido que existe é `Pedido <numero> · AMO`; o de um número que não existe, que não é da cliente ou fora do formato é `Página não encontrada · AMO` (o mesmo da página 404 do site; conferir o texto em `src/app/not-found.tsx` e usar o dele). Pelo `generateMetadata` da página, com `lerPedido` compartilhado com a renderização por `cache` do React, para não ler o pedido duas vezes.
- O teste que corresponder à causa achada no Step 1 (por exemplo, a página não encontrada renderizada no navegador não contém `<script>` vindo de componente).
- Na lateral do painel, o e-mail fica numa linha só, com reticências quando não cabe e o e-mail inteiro no `title`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/conta-paginas.test.tsx tests/nao-encontrada.test.tsx`
Expected: FAIL nos casos novos.

- [ ] **Step 4: Implementar e conferir no navegador**

O título por `generateMetadata`; a correção da causa do aviso; o e-mail em uma linha (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`) com `title`. Conferir a 1440 px e a 390 px com uma conta de ensaio de e-mail longo com hífen (as capturas desta máquina: Edge headless por CDP, perfil temporário em D: e apagado no fim). Apagar a conta de ensaio no fim.

- [ ] **Step 5: Rodar a suíte e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tudo passa.

```bash
git add src/app/conta/pedidos src/components/conta/PainelDaConta.tsx src/app/estilos/conta.css src/app/not-found.tsx src/components/InlineScript.tsx tests
git commit -m "fix: o pedido nao encontrado tem o titulo da pagina 404, sem o aviso do script, e o e-mail da lateral numa linha"
```

### Task 6: O script da porta não deixa cliente de ensaio, e o sidecar ganha "As duas portas"

**Files:**
- Modify: `scripts/testar-porta.mjs`
- Modify: `.impeccable/design.json`

- [ ] **Step 1: O script apaga a cliente de ensaio em qualquer caminho**

Tudo o que vem depois de criar a cliente fica num `try`, e o `finally` a apaga (`admin.auth.admin.deleteUser`), também quando `generateLink` ou `verifyOtp` lançam. O script nunca imprime token nem segredo.

Run: `node scripts/testar-porta.mjs`
Expected: as mesmas linhas de sucesso de antes e, no fim, a cliente de ensaio apagada (conferir pelo MCP: `select count(*) from auth.users where email like '%ensaio%'` igual ao de antes de rodar).

- [ ] **Step 2: O sidecar**

Acrescentar a `.impeccable/design.json` a seção da superfície "As duas portas", no mesmo formato das outras seções do arquivo, derivada da seção "As duas portas (a conta)" de `DESIGN.md` (sem inventar nada que lá não esteja).

- [ ] **Step 3: Commitar**

```bash
git add scripts/testar-porta.mjs .impeccable/design.json
git commit -m "fix: o ensaio da porta sempre apaga a cliente de ensaio, e o sidecar de design ganha As duas portas"
```
