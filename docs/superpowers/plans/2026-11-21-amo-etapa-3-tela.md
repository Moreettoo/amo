# AMO · Etapa 3 · Parte B · A tela do fechamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A sacola, a página de produto, o pedido em Minha conta e o comentário passam a usar o servidor da Parte A: a entrega cotada no servidor, a porta da conta na etapa "Seus dados", o pagamento por Pix (com a espera) e por cartão (Card Payment Brick), a loja que diz quando abre e o comentário de quem recebeu.

**Architecture:** A Parte A (`docs/superpowers/plans/2026-11-21-amo-etapa-3-servidor.md`) entregou as ações em `src/app/sacola/acoes.ts`, os tipos e textos puros em `src/lib/fechamento/tipos.ts` e a loja em `src/lib/loja.ts`. Esta parte troca os exemplos do navegador por essas ações. O `Fechamento` (hoje 468 linhas em `src/components/sections/Fechamento.tsx`) vira uma pasta `src/components/sacola/`, um arquivo por etapa, mais o painel do Pix, a espera do pagamento e o cartão. A página `/sacola` passa a ler, no servidor, a cliente, a loja, o endereço principal e as chaves públicas.

**Tech Stack:** Next.js 16.3.2 (App Router), React 19, `next/script`, Card Payment Brick do Mercado Pago (`https://sdk.mercadopago.com/js/v2`), Vitest + Testing Library + axe.

**Spec:** `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (§10.2, §11, §19), `docs/superpowers/specs/2026-11-21-amo-mercadopago-orders.md` (§1.2 e §6: o Brick, o 3DS e a CSP), `docs/superpowers/specs/2026-11-20-amo-autenticacao-design.md` (§2: os formulários da porta reaproveitados na sacola; §6: a CSP), o contrato visual da sacola (`.impeccable/surfaces/src-app-sacola-page-tsx.md`) e as seções "A sacola: o fio das etapas" e "As duas portas" de `DESIGN.md`. As decisões da Parte A valem aqui.

## Decisões minhas que completam ou mudam o desenho

Cada uma pode ser revertida pelo dono, que saiu pelo dia em 2026-11-21 e pediu que o trabalho seguisse sem perguntas.

1. **Sem rodada de esboços.** A etapa 3 preenche lugares que os desenhos aprovados reservaram: a porta da conta na etapa "Seus dados" (autenticação §2), o código Pix no pedido feito (o lugar `feito__pix`, que hoje diz "O código Pix aparece aqui quando o pagamento estiver ligado.") e o cartão dentro da etapa 4. O acabamento passa pela revisão do Impeccable na Task 7.
2. **A sacola esvazia quando o pagamento é aprovado**, não quando o pedido nasce: um Pix abandonado não leva os potes.
3. **O progresso do fechamento** (a etapa, o endereço digitado e a cotação) fica no `sessionStorage` da aba (`amo:fechamento`), para sobreviver ao login no meio da etapa 3 e a um recarregar. Cotação que vence em menos de 1 minuto não volta.
4. **Logada e com endereço principal, a etapa 2 já vem preenchida com ele** (a página de Endereços promete: "é o que a sacola sugere primeiro").
5. **"Guardar este endereço em Minha conta"**: caixa na etapa 3, desmarcada, só logada.
6. **Deslogada, a etapa 3 é a porta** (`PortaDaConta`, com `volta=/sacola`): ela tem os próprios botões ("Entrar", "Criar conta", "Confirmar"), porque são formulários completos, e o botão do resumo fica desligado com o texto "Entre para continuar". É a única exceção à regra de um botão só.
7. **Loja fechada**: o resumo diz quando abre desde a primeira etapa (o texto de `textoDaLoja` e, embaixo, `resumoDosHorarios`), e o botão de pagar fica desligado com o texto "Cozinha fechada agora".
8. **Sem a chave pública do Mercado Pago, só o Pix aparece.** O cartão some, em vez de aparecer quebrado.
9. **O Brick fica sem o botão próprio** (`hidePaymentButton`), e o botão do resumo ("Pagar com cartão · R$ 92,80") chama `getFormData()`: a regra de um botão só continua.
10. **O desafio do 3DS aparece num `iframe` dentro da etapa 4**, com 40 min, e o resultado chega pela espera do pagamento (`situacaoDoPedido`).
11. **A frete da página de produto usa a mesma `cotarEntrega`.** A cotação fica guardada 24 h e não é reaproveitada na sacola.
12. **O pedido em Minha conta mostra o Pix pendente**, com o mesmo painel e a mesma espera da sacola. Pagar com cartão a partir de lá fica para depois.

## Global Constraints

- Ler o guia em `node_modules/next/dist/docs/` antes de tocar em página, `proxy.ts`, `next/script` ou ação (`AGENTS.md`): `01-app/02-guides/scripts.md`, `content-security-policy.md`, `forms.md`, `server-actions.md` e `preserving-ui-state.md`.
- O navegador não fala com o Supabase nem com a API do Mercado Pago (só o script do Brick, pelo navegador, com os domínios do contrato §6). Nenhum arquivo com `'use client'` importa `@supabase/*`, `src/lib/dados/`, `src/lib/mercadopago/` ou `src/lib/auth/` (fora `acoes.ts` e `volta.ts`); tipos e textos vêm de `src/lib/fechamento/tipos.ts` e `src/lib/loja.ts`.
- Nenhum valor que o navegador manda decide preço, frete ou total: a tela mostra o que o servidor devolve, e o `totalVisto` só serve para o banco recusar com `total_mudou`.
- Textos de erro só de `MENSAGENS_DO_FECHAMENTO` e `mensagemDaRecusa` (`tipos.ts`), e de `MENSAGENS_DA_CONTA` na porta. Nunca uma mensagem crua.
- **A Regra do Exemplo Dito** (`DESIGN.md`): enquanto a cotação for de exemplo (`cotacao.exemplo`), "(valor de exemplo)" junto do valor da entrega, no resumo da etapa 2, no resumo da página e no pedido feito. O pagamento deixa de ser de exemplo: "Pagamento de exemplo: por enquanto nenhum valor é cobrado." e o texto de exemplo do pedido feito saem.
- Visual: o contrato da sacola e o das duas portas, e o `DESIGN.md`. Antes de qualquer edição de UI, ler `C:\Users\enzom\.claude\skills\impeccable\reference\craft-floor.md`. Movimento só em `transform`/`opacity`, dentro de `html.js` e de `prefers-reduced-motion: no-preference` (`tests/movimento.test.ts`); alvos de 44 px; nenhuma animação em loop (a espera do Pix não gira nada: diz em texto).
- Acessibilidade: cada mudança de estado (cotado, erro, pedido feito, pagamento aprovado, código vencido) chega ao leitor de tela por região viva ou foco; o QR tem `alt`; o "Copiar código" diz que copiou em região viva; `axe` sem violação nos testes de página.
- Contas de ensaio por `admin.createUser` (`email_confirm: true`), nunca pelo cadastro do site (cota de e-mail do projeto de desenvolvimento).
- Textos sem travessão nem meia-risca em `src/`, `tests/`, `scripts/` e README; todo "AMO" em texto fica em `translate="no"`; comentário de código sem acento.
- Link entre páginas é `<a>` comum, não `next/link`.
- Commit no padrão do repositório (português, sem acento no assunto), terminando com uma linha em branco e `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branch `feat/etapa-3`; nada de `stash`, `reset` ou `checkout` amplo.
- Antes de cada commit: `npx vitest run`, `npx tsc --noEmit`, `npm run lint` e, nas tarefas que mexem em página, `proxy.ts` ou fronteira `'use client'`, `npm run build` (que roda a varredura de segredos).

## Review Focus

1. **Login no meio do fechamento.** Entrar ou criar a conta na etapa 3 volta à etapa 3 com o endereço e a cotação, logada, sem pedir o CEP de novo. Testes nas Tasks 1 e 2.
2. **Clique duplo em pagar, ou pagar de novo depois de um erro.** O botão fica ocupado; a segunda tentativa usa o mesmo pedido (o banco devolve o mesmo para a mesma cotação e os mesmos potes). Testes nas Tasks 3 e 4.
3. **O Pix que vence, a aba que fica escondida, a internet que cai durante a espera.** A espera para quando escondida e volta ao aparecer; um erro de rede não mostra "recusado"; o código vencido oferece um novo. Teste na Task 3.
4. **A cotação que vence entre a etapa 2 e o pagamento.** Volta à etapa 2 com "O valor da entrega venceu. Calcule de novo." Teste na Task 3.
5. **A loja que fecha durante o fechamento** (`loja_fechada` vindo do banco às 18h00). A tela diz quando abre e nada é cobrado. Teste na Task 3.

---

### Task 1: A sacola fala com o servidor (a página, a entrega e o progresso)

**Files:**
- Create: `src/components/sacola/Fechamento.tsx`, `src/components/sacola/EtapaEntrega.tsx`, `src/components/sacola/progresso.ts`; mover para a pasta, sem mudar o que fazem, `ListaDePotes`, `Fio` e `Titulo` (um arquivo `src/components/sacola/pecas.tsx`)
- Delete: `src/components/sections/Fechamento.tsx` (o conteúdo vai para a pasta nova)
- Modify: `src/app/sacola/page.tsx`, `src/components/layout/TelaSacola.tsx`, `src/lib/dados/ambiente.ts`, `src/lib/entrega.ts`, `src/components/sections/ProdutoCompra.tsx`
- Test: `tests/sacola.test.tsx`, `tests/pagina-produto.test.tsx`, `tests/sacola-progresso.test.ts`

**Interfaces:**
- Consumes: `cotarEntrega` (`src/app/sacola/acoes.ts`), `Cotacao`, `MENSAGENS_DO_FECHAMENTO` (`tipos.ts`), `lerLoja`, `situacaoDaLoja`, `textoDaLoja`, `resumoDosHorarios`, `obterUsuario`, `lerEnderecos`.
- Produces:
  - `chavePublicaDoMercadoPago(): string | null` em `ambiente.ts` (lê `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`; vazia ou ausente, `null`).
  - `type DadosDaSacola = { usuario: { nome: string; celular: string; email: string } | null; enderecoPrincipal: { cep: string; numero: string; complemento: string } | null; loja: { aberta: boolean; texto: string; horarios: string }; porta: { chaveDoTurnstile: string; nonce: string }; chavePublicaMp: string | null }`, montado na página e passado a `Fechamento({ loja: ItemDaLoja[], dados: DadosDaSacola })`.
  - Em `progresso.ts`: `type Progresso = { etapa: 1 | 2 | 3 | 4; endereco: { cep: string; numero: string; complemento: string }; cotacao: Cotacao | null }`, `lerProgresso(agora: number): Progresso | null` (descarta cotação que vence em menos de 60 s e qualquer coisa fora da forma) e `gravarProgresso(p: Progresso): void`, `apagarProgresso(): void`, todos com `try/catch` (o `sessionStorage` pode faltar).

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/sacola.test.tsx` (as ações de `src/app/sacola/acoes.ts` falsas por `vi.mock`):
- a etapa 2 chama `cotarEntrega` com `{ cep, numero, complemento }`; cotada, a linha de resumo diz a rua e o número, o bairro, "Uber" com o valor e "(valor de exemplo)" quando `exemplo`; o resumo da página mostra a entrega;
- erro com `campos`: a frase embaixo do campo certo, com `aria-invalid`; erro sem `campos`: a frase do código na linha de erro da etapa, em região viva;
- logada com endereço principal: CEP, número e complemento já vêm preenchidos;
- com a loja fechada (`dados.loja.aberta` falso), o resumo mostra `dados.loja.texto` e `dados.loja.horarios` desde a etapa 1; aberta, mostra `dados.loja.texto` ("Pedidos até as 18h.");
- recarregar com um progresso guardado (etapa 3, cotação válida) volta à etapa 3 com a entrega cotada; com a cotação vencida, volta à etapa 2 com o endereço preenchido.

Em `tests/sacola-progresso.test.ts`: `lerProgresso` devolve `null` sem nada guardado, com JSON quebrado, com etapa 7, com cotação vencendo em 30 s; devolve o progresso válido; `gravarProgresso` com `sessionStorage` que lança não lança.

Em `tests/pagina-produto.test.tsx`: o cálculo de frete da página de produto chama `cotarEntrega` e mostra valor e tempo da resposta, e os erros por `MENSAGENS_DO_FECHAMENTO`; os testes de `cotarEntregaDeExemplo` saem com ela.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/sacola.test.tsx tests/sacola-progresso.test.ts tests/pagina-produto.test.tsx`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar**

- A página monta `DadosDaSacola` no servidor: `obterUsuario()`; com ela, `lerEnderecos(usuario.id)` e o principal; `lerLoja()` com `situacaoDaLoja(..., new Date())`, `textoDaLoja` e `resumoDosHorarios`; o nonce do cabeçalho `x-nonce` e a chave do Turnstile (como `lerDadosDaTela` em `src/components/conta/TelaConta.tsx`); `chavePublicaDoMercadoPago()`.
- `Fechamento` sai de `sections` para `sacola`, dividido como na lista de arquivos; a etapa 2 (`EtapaEntrega`) usa `cotarEntrega` e guarda a cotação no estado e no progresso.
- `cotarEntregaDeExemplo` sai de `src/lib/entrega.ts` (ficam `limparCep`, `mascararCep`, `validarEndereco` e os tipos que ainda tiverem uso); `ProdutoCompra` passa a usar `cotarEntrega`.
- No `.env.local` do desenvolvimento (fora do git), `MERCADOPAGO_AMBIENTE=teste` (sem ela o servidor recusa a cotação de exemplo); o controlador acrescenta antes desta tarefa.

- [ ] **Step 4: Rodar a suíte, o build e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: tudo passa; no build, `/sacola` continua dinâmica e `/` e `/catalogo` estáticas.

```bash
git add src/components/sacola src/components/sections src/components/layout/TelaSacola.tsx src/app/sacola/page.tsx src/lib/dados/ambiente.ts src/lib/entrega.ts tests
git commit -m "feat: a sacola cota a entrega no servidor, guarda o progresso da aba e diz quando a loja abre"
```

### Task 2: A conta na etapa "Seus dados"

**Files:**
- Create: `src/components/sacola/EtapaDados.tsx`
- Modify: `src/components/sacola/Fechamento.tsx`; se preciso para caber na etapa, `src/components/conta/PortaDaConta.tsx` (sem mudar o que ela faz em `/entrar` e `/cadastro`)
- Modify: `src/lib/pedido.ts` (sai o que só servia à etapa 3 de exemplo: `validarDados`, `Dados`, `ErrosDosDados`, se não sobrar uso)
- Test: `tests/sacola.test.tsx`

**Interfaces:**
- Consumes: `PortaDaConta({ aba, volta, chaveDoTurnstile, nonce })`, `DadosDaSacola` (Task 1).
- Produces: `EtapaDados({ usuario, porta, guardar, aoMudarGuardar })`.

- [ ] **Step 1: Escrever os testes que falham**

- Logada: a etapa 3 mostra nome, celular e e-mail da conta, a caixa "Guardar este endereço em Minha conta" desmarcada e o link "Trocar em Minha conta" para `/conta/perfil`; o botão do resumo diz "Continuar para o pagamento"; a linha de resumo da etapa feita diz nome e celular.
- Deslogada: a etapa 3 mostra a porta (as abas "Entrar" e "Criar conta") com `volta=/sacola`; o botão do resumo fica desligado com "Entre para continuar".
- A caixa marcada vai como `guardarEndereco: true` quando o pedido for fechado (Task 3 usa).
- `axe` sem violação com a porta aberta dentro da etapa.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/sacola.test.tsx`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar.** A porta dentro da etapa usa os formulários de `PortaDaConta` como estão; o que for só da casca de `/entrar` (o título da página) não entra. Depois de entrar ou confirmar o código, a ação leva a `/sacola`, a página volta com a cliente, e o progresso da Task 1 devolve a etapa 3.

- [ ] **Step 4: Rodar a suíte, o build e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: tudo passa.

```bash
git add src/components/sacola src/components/conta/PortaDaConta.tsx src/lib/pedido.ts tests
git commit -m "feat: a etapa Seus dados e a conta: logada mostra os dados, deslogada abre a porta"
```

### Task 3: O Pix e a espera do pagamento

**Files:**
- Create: `src/components/sacola/EtapaPagamento.tsx`, `src/components/sacola/PedidoFeito.tsx`, `src/components/sacola/PainelDoPix.tsx`, `src/components/sacola/EsperaDoPagamento.tsx`, `src/components/sacola/espera.ts`
- Modify: `src/components/sacola/Fechamento.tsx`, `src/lib/pedido.ts` (sai `enviarPedidoDeExemplo`), `src/app/estilos/sacola.css`
- Test: `tests/sacola.test.tsx`, `tests/sacola-espera.test.ts`

**Interfaces:**
- Consumes: `fecharPedido`, `pagarComPix`, `situacaoDoPedido` (Parte A), `SituacaoDoPedido`, `MENSAGENS_DO_FECHAMENTO`, `esvaziarSacola` (`src/lib/sacola.ts`), `apagarProgresso` (Task 1).
- Produces:
  - Em `espera.ts` (puro): `proximaEspera(desde: number, agora: number): number | null`: 5000 ms nos 2 primeiros minutos, 15000 ms até 30 min, depois `null` (para).
  - `EsperaDoPagamento({ numero, inicial, aoMudar })`: pergunta `situacaoDoPedido({ numero })` no ritmo de `proximaEspera`, para quando o pedido sai de `aguardando_pagamento` ou a tentativa fica `expirado`, `cancelado` ou `recusado`, para com a aba escondida (`visibilitychange`) e pergunta uma vez ao voltar; erro de rede não muda o estado mostrado.
  - `PainelDoPix({ pix, aoGerarOutro })`: o QR (`data:image/png;base64,`, 220 px, `alt="QR Code do Pix"`), o copia e cola num campo só de leitura com o botão "Copiar código" (`navigator.clipboard.writeText`; confirma "Código copiado." em região viva; sem a API, seleciona o texto), "Vale até HH:MM" (hora de São Paulo) e a instrução "Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código.". Vencido: "O código venceu." e o botão "Gerar outro código".
  - `PedidoFeito({ situacao, linhas, entrega, aoGerarOutro })`: o título "Pedido N" com a frase em script "aguardando o Pix" e, aprovado, "recebido"; o painel do Pix enquanto espera; aprovado, "Pagamento aprovado." e o link "Acompanhar em Minha conta" para `/conta/pedidos/N`; a lista do pedido com a entrega ("(valor de exemplo)" quando for) e o total.

O caminho de "Pagar com Pix" (o botão do resumo na etapa 4, "Pagar com Pix · R$ 92,80"): `fecharPedido({ itens, cotacao: cotacao.id, totalVisto, guardarEndereco })`, e com o número, `pagarComPix({ numero })`; então o pedido feito com a espera. Cada erro leva ao lugar em que a cliente resolve: `cotacao_vencida` volta à etapa 2; `produto_indisponivel` à etapa 1; `sem_sessao` e `email_nao_confirmado` à etapa 3; `total_mudou` recarrega a página (os preços vêm do servidor); `loja_fechada` fica na etapa 4 e o resumo passa a dizer quando abre; o resto fica na etapa 4 com a frase do código. Aprovado: `esvaziarSacola()` e `apagarProgresso()`.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/sacola-espera.test.ts`: `proximaEspera` dá 5000 a 1 min, 15000 a 3 min, `null` a 31 min.

Em `tests/sacola.test.tsx` (ações falsas, relógio falso):
- o caminho inteiro: entrega, dados (logada), "Pagar com Pix" chama `fecharPedido` com os itens da sacola e o total visto e depois `pagarComPix` com o número; o pedido feito mostra o QR, o copia e cola e "aguardando o Pix"; a espera pergunta em 5 s; a resposta `pago` mostra "Pagamento aprovado.", esvazia a sacola e o título recebe o foco;
- clique duplo em "Pagar com Pix" chama `fecharPedido` uma vez;
- `cotacao_vencida` volta à etapa 2 com a frase; `loja_fechada` mostra a frase e desliga o botão; `pagamento_indisponivel` fica na etapa 4 com a frase e o botão volta;
- "Copiar código" chama a área de transferência e anuncia "Código copiado.";
- o código vencido mostra "Gerar outro código", que chama `pagarComPix` de novo;
- a aba escondida não pergunta; ao voltar, pergunta uma vez;
- nenhum texto de "pagamento de exemplo" sobra na página;
- `axe` sem violação no pedido feito.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/sacola.test.tsx tests/sacola-espera.test.ts`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar** a interface e o caminho. O visual segue "A sacola: o fio das etapas" e "O pedido feito" de `DESIGN.md`: a coluna de 620 px, o título em duas vozes, o QR sobre o papel com o fio de 1 px, sem caixa nem sombra; o botão "Copiar código" é o botão de contorno da casa.

- [ ] **Step 4: Rodar a suíte, o build e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: tudo passa.

```bash
git add src/components/sacola src/lib/pedido.ts src/app/estilos/sacola.css tests
git commit -m "feat: pagar com Pix, com o QR, o copia e cola e a espera que confirma o pagamento"
```

### Task 4: O cartão (Card Payment Brick)

**Files:**
- Create: `src/components/sacola/CartaoMercadoPago.tsx`
- Modify: `src/components/sacola/EtapaPagamento.tsx`, `src/lib/seguranca/politica.ts`, `src/proxy.ts`, `src/app/estilos/sacola.css`
- Test: `tests/sacola.test.tsx`, `tests/politica.test.tsx`, `tests/proxy.test.ts`

**Interfaces:**
- Consumes: `pagarComCartao` (Parte A), `mensagemDaRecusa`, `chavePublicaMp` e `nonce` (Task 1); o contrato §6.
- Produces:
  - `montarPolitica(nonce: string, desenvolvimento: boolean, comMercadoPago = false): string`: com `comMercadoPago`, acrescenta aos destinos de hoje `script-src https://sdk.mercadopago.com https://http2.mlstatic.com`, `connect-src https://api.mercadopago.com https://api-static.mercadopago.com https://api.mercadolibre.com https://http2.mlstatic.com`, `frame-src https://secure-fields.mercadopago.com https://www.mercadopago.com.br` (junto do Turnstile) e `img-src https://http2.mlstatic.com`. O `proxy.ts` liga a opção só em `/sacola`.
  - `CartaoMercadoPago({ chave, nonce, valorCentavos, aoPronto, controle })`: carrega o script com `next/script` (`strategy="afterInteractive"`, com o `nonce`), cria o Brick `cardPayment` com `initialization: { amount: valorCentavos / 100 }`, `customization: { visual: { hidePaymentButton: true, style: { customVariables } }, paymentMethods: { maxInstallments: 12 } }` (as variáveis de cor e fonte dos tokens de `DESIGN.md`: `expresso`, `cobre`, `papel`, a fonte da casa) e desmonta (`unmount`) ao sair; expõe ao pai um `getFormData()`.

O caminho de "Pagar com cartão" (o botão do resumo, "Pagar com cartão · R$ 92,80"): `getFormData()` do Brick (sem dados válidos, o Brick mostra os erros dele e nada sai); `fecharPedido`; `pagarComCartao({ numero, token, bandeira: payment_method_id, tipo: additionalData.paymentTypeId, parcelas: installments, final: additionalData.lastFourDigits, documento })` (o `documento` só se o Brick devolveu CPF). Aprovado: o pedido feito "recebido", sacola e progresso apagados. Recusado: fica na etapa 4 com `mensagemDaRecusa(recusa)` e o Brick pronto para outra tentativa. Desafio (`desafioUrl`): o `iframe` dentro da etapa 4 (título "Confirmação do banco"), e a espera do pagamento decide. Pendente sem desafio: o pedido feito com "aguardando a confirmação do cartão" e a espera.

- [ ] **Step 1: Escrever os testes que falham**

- `tests/politica.test.tsx`: com `comMercadoPago`, cada domínio do contrato §6 no lugar certo; sem, a política de hoje, igual.
- `tests/proxy.test.ts`: `/sacola` sai com os domínios do Mercado Pago; `/conta` e `/entrar` sem eles.
- `tests/sacola.test.tsx`, com um Brick falso no `window.MercadoPago`: sem `chavePublicaMp`, a opção "Cartão de crédito" não aparece; com ela, escolher cartão monta o Brick com o valor em reais e `hidePaymentButton`; o botão do resumo chama `getFormData` e depois `fecharPedido` e `pagarComCartao` com os campos certos; recusado mostra a frase de `mensagemDaRecusa('insufficient_amount')`; com `desafioUrl`, o `iframe` aparece com a URL; trocar para Pix desmonta o Brick.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/sacola.test.tsx tests/politica.test.tsx tests/proxy.test.ts`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar** a interface e o caminho.

- [ ] **Step 4: Rodar a suíte, o build e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: tudo passa; a varredura não acha a chave pública como segredo (ela é `NEXT_PUBLIC_` por desenho).

```bash
git add src/components/sacola src/lib/seguranca/politica.ts src/proxy.ts src/app/estilos/sacola.css tests
git commit -m "feat: pagar com cartao pelo Card Payment Brick, com o botao do resumo, a recusa dita e o 3DS"
```

### Task 5: O Pix pendente em Minha conta

**Files:**
- Modify: `src/app/conta/pedidos/[numero]/page.tsx`, `src/lib/dados/pedidos.ts`
- Test: `tests/conta-paginas.test.tsx`, `tests/dados-conta.test.ts`

**Interfaces:**
- Consumes: `PainelDoPix`, `EsperaDoPagamento` (Task 3).
- Produces: `PedidoCompleto` ganha `pixPendente: { copiaECola: string; qrBase64: string; expiraEm: string | null } | null`, preenchido só quando o pedido aguarda pagamento e a última tentativa é Pix pendente com o QR.

- [ ] **Step 1: Escrever os testes que falham**

- `lerPedido` traz `pixPendente` só no caso da interface (pedido pago, tentativa de cartão, Pix sem QR ou Pix já expirado dão `null`).
- A página do pedido que aguarda o Pix mostra o painel do Pix e a espera, acima de "Cancelar pedido"; a espera que vê `pago` atualiza a página (`router.refresh`); sem `pixPendente`, a página fica como hoje.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/conta-paginas.test.tsx tests/dados-conta.test.ts`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar** a interface.

- [ ] **Step 4: Rodar a suíte, o build e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: tudo passa.

```bash
git add src/app/conta/pedidos src/lib/dados/pedidos.ts tests
git commit -m "feat: o pedido que aguarda o Pix mostra o codigo e espera o pagamento em Minha conta"
```

### Task 6: O comentário de verdade

**Files:**
- Create: `src/app/catalogo/acoes.ts` (`'use server'`)
- Modify: `src/lib/dados/comentarios.ts`, `src/components/sections/ProdutoComentarios.tsx`
- Test: `tests/comentario-acao.test.ts`, `tests/pagina-produto.test.tsx`

**Interfaces:**
- Consumes: `public.enviar_comentario(p_produto text, p_nota integer, p_texto text) returns uuid` (com sessão; códigos `sem_sessao`, `nota_invalida`, `texto_invalido`, `comentario_nao_permitido`), `consumirLimite`, `obterUsuario`.
- Produces:
  - `gravarComentario(produto: string, nota: number, texto: string): Promise<void>` em `comentarios.ts` (sessão da cliente; P0001 vira `ErroDeRegra`).
  - `enviarComentario(entrada: unknown): Promise<{ ok: true } | { ok: false; erro: 'sem_sessao' | 'campos_invalidos' | 'comentario_nao_permitido' | 'muitas_tentativas' | 'tente_de_novo'; campos?: Partial<Record<'nota' | 'texto', string>> }>`, com `entrada = { produto, nota, texto }`. Ordem: sessão; campos (produto em slug; nota inteira de 1 a 5, `campos.nota = 'Escolha uma nota de 1 a 5.'`; texto aparado de 10 a 1000, sem `<`, `>` e sem controle além da quebra de linha, `campos.texto = 'Conte um pouco mais: de 10 a 1000 letras, sem < nem >.'`); limite `comentario:<id da cliente>` com 5 por 86400 s; banco (`nota_invalida` e `texto_invalido` viram `campos_invalidos`; `comentario_nao_permitido` passa).

O formulário da página de produto: sai o campo "Seu nome" (o nome que aparece vem do perfil: "Carla M."), entra a nota "Seu nome aparece como no seu perfil, com a inicial do sobrenome."; o `maxLength` do texto vai a 1000. As respostas: `sem_sessao`, "Entre na sua conta para comentar." com o link "Entrar" para `/entrar?volta=/catalogo/<slug>`; `comentario_nao_permitido`, "Só quem já recebeu este sabor pode comentar."; `muitas_tentativas` e `tente_de_novo`, os textos de sempre; sucesso, o agradecimento de hoje. A página continua estática: quem decide é a ação.

- [ ] **Step 1: Escrever os testes que falham**

- A ação: a ordem (deslogada não chama nada; campo errado não gasta limite), cada item de `HOSTIS` no texto (recusa ou texto ao pé da letra, nunca exceção), nota 0, 6, 2.5 e `'5'`, os códigos do banco traduzidos, a chamada com `p_produto`, `p_nota`, `p_texto`.
- O formulário: sem o campo de nome; envia nota e texto; cada resposta mostra a frase dela; `sem_sessao` traz o link com a `volta` do produto.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/comentario-acao.test.ts tests/pagina-produto.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar** a interface.

- [ ] **Step 4: Rodar a suíte, o build e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: tudo passa; a página de produto continua estática no build.

```bash
git add src/app/catalogo/acoes.ts src/lib/dados/comentarios.ts src/components/sections/ProdutoComentarios.tsx tests
git commit -m "feat: o comentario de verdade, so de quem recebeu o sabor, moderado antes de aparecer"
```

### Task 7: O ensaio de ponta a ponta e o fecho

**Files:**
- Create: `scripts/ensaio/mercadopago-falso.mjs`
- Modify: `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (o status), `supabase/README.md`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/surfaces/src-app-sacola-page-tsx.md`, `README.md`

- [ ] **Step 1: O Mercado Pago falso do ensaio**

`scripts/ensaio/mercadopago-falso.mjs`, carregado só no servidor de ensaio (`NODE_OPTIONS=--import=./scripts/ensaio/mercadopago-falso.mjs npm run dev`), troca o `fetch` global apenas para `https://api.mercadopago.com/v1/orders`: a criação Pix devolve `action_required`/`waiting_transfer` com um QR de ensaio e o copia e cola `00020126-ensaio`; o `GET` do mesmo pedido passa a `processed`/`accredited` 20 s depois de criado; cancelar e estornar respondem como o contrato §1. Qualquer outro endereço passa para o `fetch` de verdade. O arquivo diz no topo, em comentário, que é só de ensaio e nunca é importado pelo site. Nenhum código do site muda por ele.

- [ ] **Step 2: O ensaio no navegador**

Com o servidor de ensaio, `MERCADOPAGO_AMBIENTE=teste` e valores de ensaio em `MERCADOPAGO_ACCESS_TOKEN` (no ambiente do processo, não no `.env.local`), e uma conta de ensaio criada por `admin.createUser`. Se a loja estiver fechada na hora do ensaio, abrir um horário temporário no banco de desenvolvimento (inserir o dia de hoje em `horarios`) e **restaurar o horário de segunda a sábado, das 9h às 18h, no fim**, conferindo com `select * from public.horarios`. Percorrer, a 390 px e a 1440 px (Edge headless por CDP, perfil temporário em D: e apagado no fim): sacola deslogada até a etapa 3; entrar pela porta; voltar à etapa 3 logada com a cotação; pagar com Pix; ver o QR, copiar, esperar; ver "Pagamento aprovado."; o pedido em Minha conta como pago; a loja fechada (vendas pausadas por um instante e despausadas no fim). Console sem violação de CSP nem erro. Apagar a conta de ensaio, os pedidos e itens dela (como o `supabase/README.md` ensina), e o perfil do navegador. Capturas em `.impeccable/review/`.

- [ ] **Step 3: A revisão de acabamento**

Rodar a revisão do Impeccable (`critique` sobre `src/app/sacola/page.tsx`, com as capturas) contra o contrato da sacola e corrigir o que ela apontar como material, com os testes de novo.

- [ ] **Step 4: A documentação**

- Backend spec: o status diz que a etapa 3 foi construída e testada em 2026-11-21, com o Mercado Pago testado por `fetch` falso e no ensaio, e o que falta do dono (credenciais de teste, URL do aviso, eventos, assinatura secreta).
- `supabase/README.md`: como rodar o ensaio com o Mercado Pago falso.
- `PRODUCT.md`: o pagamento deixa de ser de exemplo (Mercado Pago, Pix e cartão, com credencial de teste no desenvolvimento); a cotação continua de exemplo até o Uber Direct; a loja diz quando abre.
- `DESIGN.md` e o contrato da sacola: a porta na etapa 3, o painel do Pix, a espera, o cartão, a loja fechada; a Regra do Exemplo Dito passa a valer só para a entrega.
- `README.md`: as variáveis novas e o ensaio.

- [ ] **Step 5: Rodar tudo e commitar**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: tudo passa.

```bash
git add scripts/ensaio docs supabase/README.md PRODUCT.md DESIGN.md .impeccable/surfaces README.md src tests
git commit -m "docs: a etapa 3 construida e ensaiada, com o Mercado Pago falso do ensaio e o que falta do dono"
```
