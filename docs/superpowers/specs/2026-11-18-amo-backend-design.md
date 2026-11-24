# AMO · Back-end no Supabase · Design Spec

**Data:** 2026-11-18
**Status do pagamento (2026-11-23):** ensaiado com o Mercado Pago de verdade,
na conta de teste (`supabase/README.md`, "Mercado Pago: o que o ensaio
mostrou"), pela spec `2026-11-23-amo-pagamento-de-verdade-design.md`; a
produção do pagamento está em "Mercado Pago: a produção", no mesmo README.
**Status:** aprovada pelo dono; etapa 1 (o banco) construída e testada em
2026-11-18; etapa 2 (o site lê do banco e Minha conta) construída e testada em
2026-11-20; etapa 3 (a sacola fecha o pedido no servidor e o pagamento é de
verdade, pelo Mercado Pago, com Pix e cartão) construída e testada em
2026-11-21. O Mercado Pago foi testado por `fetch` falso nos testes e, no
ensaio de ponta a ponta no navegador, por um Mercado Pago falso carregado só no
servidor de ensaio (`scripts/ensaio/mercadopago-falso.mjs`); nenhuma chamada
foi ao Mercado Pago de verdade. O cartão (o Card Payment Brick, a CSP dele e o
desafio do banco, 3DS) só foi testado com dublês que imitam o SDK e o servidor:
o ensaio do cartão com a chave de teste é o portão antes de ligar
`NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, com o resultado registrado em
`supabase/README.md` ("O que é do dono"): o Brick visível a 390 e 1440 px; o
console sem violação de CSP (connect, frame, font, img); `APRO` aprova; `OTHE`
recusa e deixa tentar de novo, com um token novo a cada `getFormData`; `CONT`
fica pendente; `APRO-CHOK` mostra o desafio, e ele fica na tela até o
resultado. Falta do dono, no painel do Mercado Pago: as
credenciais de teste (`MERCADOPAGO_ACCESS_TOKEN` e
`NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`), a URL do aviso, os eventos "Order
(Mercado Pago)" e "Chargebacks" e a assinatura secreta
(`MERCADOPAGO_WEBHOOK_SECRET`). A cotação da entrega continua de exemplo até
o Uber Direct (etapa 4). Como rodar e manter: `supabase/README.md`.
**Projeto Supabase:** `yuhrtuizxuvqvvjtcemz` (conta pessoal do dono; MCP `supabase-amo`).
É o banco de **desenvolvimento** (decisão do dono, 2026-11-18). A produção
nasce num projeto novo, na etapa 4 (§15).
**Anda junto com:** `2026-11-18-amo-conta-contrato.md` (a divisão entre as duas
sessões). Onde os dois divergirem sobre banco, vale esta spec.

---

## 1. O pedido

Do cliente, em 2026-11-18: estruturar todo o back-end no Supabase antes de
qualquer tela nova, com as tabelas e as rotas que o sistema vai usar. "Algo
robusto e extremamente seguro", porque passa a guardar transações de clientes,
endereço de moradia e pagamento com cartão. "A segurança precisa ser o
primeiro dos requisitos", "que não consiga ser vazado".

Decisões dele nesta conversa:

- O banco é o Supabase que já existe (`yuhrtuizxuvqvvjtcemz`).
- O pagamento é pelo **Mercado Pago** (Pix e cartão).
- **Comprar exige conta.** A conta nasce na etapa "Seus dados" do fechamento.
- **Entrega na hora, dentro do horário.** A loja abre das 9h às 18h, de segunda
  a sábado; domingo não abre (2026-11-19). Pedido só entra nesse horário, e a
  equipe pode pausar as vendas.

Nenhum sistema é impossível de vazar. O que esta spec garante é mais estreito
e dá para provar:

1. O dado mais perigoso (número de cartão, validade, CVV) **nunca existe** no
   nosso servidor nem no nosso banco. Não há o que vazar.
2. Todo outro dado pessoal fica atrás de **duas barreiras independentes**: a
   porta do banco, que só abre para o nosso servidor (§5, regra 6), e as
   regras de acesso por linha. Uma falha em uma delas sozinha não entrega
   nada.
3. Cada barreira tem **teste escrito e repetível**, rodado a cada mudança no
   banco, que falha se alguém a abrir sem querer.

## 2. Objetivos, não objetivos e o que seria um fracasso

**Objetivos**

1. Uma cliente só enxerga e só altera o que é dela, e isso vale mesmo se o
   código do site tiver um erro.
2. O navegador nunca decide preço, frete, total ou estado de pagamento.
3. O estado de um pagamento só muda por informação buscada no Mercado Pago
   pelo servidor.
4. Nenhum segredo chega ao navegador, ao repositório ou a um log.
5. O banco inteiro nasce de migrations versionadas em `supabase/migrations/`.
6. LGPD: aceite registrado, dado mínimo, prazo de guarda e exclusão de conta.

**Não objetivos desta rodada** (cada um é uma rodada futura, e o desenho não
fecha a porta para nenhum)

- Painel da equipe (cozinha, moderação, cadastro de produto). Até lá a equipe
  usa o painel do Supabase: aprovar comentário, trocar preço, andar o pedido.
  É o primeiro item da próxima rodada, porque é por ele que a cozinha fica
  sabendo de um pedido novo.
- Cartão salvo para a próxima compra. A cliente digita o cartão a cada compra,
  no campo do Mercado Pago.
- E-mails de pedido enviados pela AMO (o Mercado Pago manda o comprovante
  dele), nota fiscal, cupom, estoque, exportação automática dos dados
  (atendida à mão, a pedido).
- Pedir novo aceite a quem já tem conta quando os termos mudarem.
- Chamar a corrida do Uber automaticamente.

**Seria um fracasso, mesmo funcionando**

- Uma tabela nova nascer legível por visitante anônimo.
- A chave secreta do Supabase ou o token do Mercado Pago aparecer num arquivo
  com `NEXT_PUBLIC_`, num commit, num log ou numa mensagem de erro.
- Um pedido marcado como pago porque o navegador (ou um aviso forjado) disse.
- Uma cliente ver o pedido ou o endereço de outra trocando um id na URL.

## 3. O que existe hoje

- **Banco vazio.** `public` sem tabelas, zero migrations, zero Edge Functions,
  conselheiro de segurança sem apontamentos. Postgres 17.6. Extensões ligadas:
  só as padrão (pgcrypto, uuid-ossp, vault, pg_stat_statements). `pg_cron`
  está disponível, ainda desligado.
- **Achado que o desenho precisa fechar.** Neste projeto, os privilégios
  padrão dão a `anon`, `authenticated` e `service_role` acesso total a toda
  tabela e toda função criada em `public` (conferido em `pg_default_acl`). Uma
  tabela criada sem cuidado nasce exposta na internet.
- **Conferido por ensaio no banco** (transação desfeita, nada gravado): uma
  regra de RLS pode usar uma coluna que o papel não tem permissão de ler. Dá
  para esconder `user_id` por permissão de coluna e ainda filtrar por ele.
- **Site.** Next 16.3.2, React 19, sem biblioteca de auth nem de banco. A
  sacola mora no `localStorage` (`src/lib/sacola.ts`). O fechamento
  (`src/components/sections/Fechamento.tsx`) tem quatro etapas (potes,
  entrega, dados, pagamento) e termina em `enviarPedidoDeExemplo`. Preço,
  descrição e comentários vêm de `src/data/exemplos.ts`; a cotação de entrega
  é `cotarEntregaDeExemplo`. O cadastro (`src/data/`) passa por
  `carregarCatalogo()`, feita para ser trocada pelo Supabase.
- **Chaves.** O projeto usa as chaves novas: publicável (`sb_publishable_`) e
  secreta (`sb_secret_`). A secreta responde 401 se usada de um navegador e
  pode ser revogada sozinha.

## 4. Caminhos considerados

1. **O servidor do site é a única porta; o banco nasce fechado. (escolhido)**
   O navegador não fala com o Supabase. Toda leitura e escrita passa pelo
   servidor Next com a sessão da cliente, e a RLS vale como segunda barreira.
   A chave secreta só entra onde não há cliente (avisos do Mercado Pago e do
   Uber). Custa mais código de servidor.
2. **O navegador fala direto com o Supabase.** Menos código, mas cada tabela
   fica a uma regra errada de distância da internet e o token da sessão fica
   legível por script da página. Descartado.
3. **Edge Functions do Supabase para o pagamento.** Dois servidores e dois
   cofres de segredo para manter. Descartado.

Decisões menores, minhas, com o motivo:

- **Sem criptografia campo a campo de endereço e celular.** Ela protege contra
  vazamento do banco inteiro, mas não contra os caminhos mais prováveis
  (regra de acesso errada, conta invadida), cria o risco de perder a chave e
  os dados juntos e impede a equipe de ler um pedido no painel. Em troca, o
  desenho guarda menos e por menos tempo (§12). O disco do Supabase já é
  criptografado.
- **Sem cartão salvo.** O que não se guarda não vaza.
- **CPF não é guardado.** O Pix não pede. No cartão, se o formulário do
  Mercado Pago pedir, ele passa pelo servidor direto para o Mercado Pago,
  sem encostar no banco nem em log.
- **Texto com `check` no lugar de tipo `enum`**, porque um estado novo entra
  com uma migration simples.

## 5. As regras que não se quebram

1. **Fechado por padrão.** A primeira migration tira de `anon`,
   `authenticated` e `service_role` todo privilégio padrão em `public`. Daí em
   diante cada permissão é escrita à mão, tabela por tabela.
2. **Duas prateleiras.** `public` guarda só o que a dona da linha pode ver.
   `privado` guarda o resto, e `anon` e `authenticated` não têm nem `USAGE`
   no schema.
3. **RLS ligada em toda tabela**, de `public` e de `privado`.
4. **A cliente não escreve pedido nem pagamento.** Ela chama uma função, e a
   função calcula tudo a partir do banco.
5. **A chave secreta não lê tabela.** `service_role` não recebe privilégio em
   nenhuma tabela: só `EXECUTE` em funções nomeadas de `privado`.
6. **A porta do banco só abre para o nosso servidor.** A chave publicável é
   pública por natureza, e uma cliente poderia pegar o próprio token e chamar
   a API de dados do Supabase direto, pulando o site e os limites dele. Para
   fechar isso, toda chamada à API de dados passa antes por uma função
   (`pgrst.db_pre_request`, recurso documentado do Supabase) que exige um
   cabeçalho com um segredo que só o servidor conhece. O banco guarda só o
   hash desse segredo. Sem ele, nem visitante nem cliente logada passam da
   porta, e uma regra de RLS errada deixa de ser alcançável de fora. O
   navegador não fala com o Supabase e não guarda token: a sessão vive em
   cookie `httpOnly`. A porta cobre a API de dados; o cadastro e o login do
   Supabase Auth continuam públicos (protegidos por CAPTCHA e limite), e é
   por isso que o gatilho de cadastro não confia em nada do que recebe.
7. **Dinheiro em centavos inteiros**, e o total do pedido é sempre
   `subtotal + frete`, conferido por `check`.
8. **Pagamento só anda pelo Mercado Pago.** O servidor nunca acredita no corpo
   de um aviso: confere a assinatura, busca o pagamento na API e compara o
   valor com o do pedido.
9. **Cartão não passa por nós.** Fica só bandeira e últimos 4 dígitos.
10. **Nada de dado pessoal em log, auditoria ou mensagem de erro.**
11. **Nenhum SQL é montado com texto que veio de fora.** Vale para o
    servidor e para dentro do banco (§19, primeira linha).
12. **Toda entrada é conferida três vezes:** na ação do servidor, na função
    do banco e no `check` da tabela. Cada camada desconfia da anterior.

A §19 percorre os ataques um por um e diz qual destas regras responde a
cada.

## 6. Quem acessa o quê

| Quem | Como entra | O que alcança |
| --- | --- | --- |
| Visitante | servidor Next, chave publicável, papel `anon` | catálogo e comentários aprovados |
| Cliente logada | servidor Next, chave publicável + sessão dela, papel `authenticated` | o que é dela, pela RLS; 6 funções de `public` |
| Qualquer um, direto na API de dados, sem o segredo da porta | não entra | nada |
| Servidor sem cliente (avisos, limites) | chave secreta, papel `service_role` | só as funções de `privado` |
| Tarefas agendadas | `pg_cron`, dentro do banco | funções de `privado` |
| Equipe (por enquanto) | painel do Supabase, com MFA na conta | tudo; os gatilhos de validação valem para ela também |

A identidade da cliente vem sempre do token validado pelo Supabase
(`auth.uid()`), nunca de um parâmetro.

## 7. Tabelas

Convenções: identificadores em português sem acento; `id uuid` gerado por
`gen_random_uuid()`; datas em `timestamptz`; dinheiro em `integer` (centavos)
com `check (>= 0)`; todo texto com tamanho máximo por `check`.

### 7.1 `public`: catálogo (leitura pública)

Espelha os tipos de `src/lib/catalogo.ts`. `src/data/*` vira a carga inicial.

| Tabela | Colunas |
| --- | --- |
| `categorias` | `slug` pk, `nome`, `ordem` |
| `linhas` | `slug` pk, `categoria` → categorias, `nome`, `tipo`, `regra`, `selos text[]`, `frase`, `modo_de_aproveitar jsonb`, `cor_do_rotulo` (papel, linho, kraft), `ordem` |
| `selos` | `id` pk, `nome` |
| `vontades` | `slug` pk, `palavra`, `ordem` |
| `produtos` | `slug` pk, `nome`, `linha` → linhas, `formato`, `frase`, `descricao`, `imagem_src`, `imagem_alt`, `imagem_largura`, `imagem_altura`, `selos text[]`, `vontades text[]`, `destaque`, `ordem`, `preco_centavos` (nulo ou > 0), `a_venda boolean` (só pode ser verdadeiro com preço) |

`selos` e `vontades` dentro de linha e produto ficam como lista de texto, na
ordem do rótulo; `validarCatalogo()` continua conferindo as referências.

Também de leitura pública, para o site dizer se está aberto e quando abre:

| Tabela | Colunas |
| --- | --- |
| `horarios` | `dia_da_semana` pk (0 a 6), `abre`, `fecha` (hora de São Paulo); dia sem linha é dia fechado |
| `loja` | uma linha só: `vendas_pausadas boolean` |

A carga inicial põe 9h às 18h nos sete dias; a migration `domingo_fechado`
tira o domingo (o dono, em 2026-11-19: "de domingo a loja não abre"). Fechar
outro dia é apagar a linha dele, por migration.

### 7.2 `public`: da cliente

**`perfis`**

| Coluna | Regra |
| --- | --- |
| `id` | pk, → `auth.users` com `on delete cascade` |
| `nome` | 2 a 80 caracteres |
| `celular` | só dígitos, 10 ou 11 |
| `termos_aceitos_em` | obrigatória, gravada pelo banco |
| `versao_termos` | obrigatória |
| `marketing_aceito_em` | nula até a cliente aceitar; nunca pré-marcada |
| `criado_em`, `atualizado_em` | |

**`enderecos`** (no máximo 5 por cliente; um só `principal`)

`id`, `user_id` → `auth.users` (cascade), `apelido`, `cep` (8 dígitos),
`logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf` (2 letras),
`principal`, `criado_em`, `atualizado_em`.

**`pedidos`**

| Grupo | Colunas |
| --- | --- |
| Identidade | `id`, `numero` (único, `AMO-` + 8 caracteres aleatórios, sem sequência), `user_id` → `auth.users` com `on delete set null` |
| Estado | `status`, `criado_em`, `pago_em`, `em_preparo_em`, `a_caminho_em`, `entregue_em`, `cancelado_em`, `motivo_cancelamento` (cliente, pagamento, expirado, loja) |
| Valores | `subtotal_centavos`, `frete_centavos`, `total_centavos`, com `check (total = subtotal + frete)` |
| Retrato da cliente | `cliente_nome`, `cliente_celular`, `cliente_email` |
| Retrato da entrega | `entrega_cep`, `entrega_logradouro`, `entrega_numero`, `entrega_complemento`, `entrega_bairro`, `entrega_cidade`, `entrega_uf`, `entrega_minutos`, `rastreio_url` |
| Guarda | `anonimizado_em` |

O retrato existe porque o pedido precisa continuar verdadeiro depois que a
cliente troca de endereço ou apaga a conta.

**`itens_do_pedido`**

`id`, `pedido_id` → pedidos, `produto` → produtos (`on delete restrict`),
`nome`, `tipo`, `preco_centavos`, `quantos` (1 a 20), `total_centavos` com
`check (total = preco * quantos)`; único por (`pedido_id`, `produto`).
Imutável depois de criado.

**`pagamentos`** (uma linha por tentativa)

`id` (também é a chave de idempotência enviada ao Mercado Pago), `pedido_id`,
`forma` (pix, cartao), `status` (os 8 estados da §10.3), `valor_centavos`,
`parcelas`,
`cartao_bandeira`, `cartao_final` (4 dígitos), `pix_copia_e_cola`,
`pix_qr_base64`, `pix_expira_em`, `recusa` (código curto para a mensagem),
`criado_em`, `aprovado_em`, `atualizado_em`. Índices únicos parciais: no
máximo um `aprovado` e no máximo um `pendente` por pedido.

**`comentarios`**

`id`, `produto` → produtos, `user_id` → `auth.users` (cascade),
`nome_exibido` ("Carla M."), `nota` (1 a 5), `texto` (10 a 1000 caracteres,
sem `<` nem `>`), `status` (pendente, aprovado, recusado), `criado_em`,
`moderado_em`; único por (`produto`, `user_id`).

### 7.3 `privado`: só o servidor

| Tabela | Para quê | Colunas principais |
| --- | --- | --- |
| `porta` | o hash do segredo da porta (regra 6); mais de uma linha só durante uma troca de segredo | `hash`, `criado_em` |
| `cotacoes` | a cotação de entrega que o servidor emitiu; o frete do pedido só sai daqui | `id`, `user_id` (nulo se cotada antes do login; `on delete cascade`), endereço completo, `valor_centavos`, `minutos`, `origem` (uber, exemplo), `uber_cotacao_id`, `expira_em`, `pedido_id` (o último pedido criado com ela) |
| `pagamentos_mp` | o que o Mercado Pago sabe de cada tentativa | `pagamento_id` pk → pagamentos, `mp_pedido_id` único (o `ORD...` da API de Orders), `mp_pagamento_id` (o `PAY...` dentro dele), `status_mp`, `detalhe_mp`, `atualizado_em` |
| `entregas` | a corrida no Uber | `pedido_id` pk, `uber_entrega_id` único, `status_uber`, `atualizado_em` |
| `eventos_webhook` | cada aviso recebido, uma vez só | `origem`, `evento_id` (único por origem), `tipo`, `recurso_id`, `recebido_em`, `processado_em`, `erro` |
| `auditoria` | quem mexeu em quê; só cresce | `quando`, `ator`, `papel`, `acao`, `tabela`, `registro`, `colunas text[]` (nomes das colunas alteradas, nunca os valores) |
| `limites` | contagem para limite de uso | `chave`, `janela`, `contagem` |

Nenhuma resposta do Mercado Pago ou do Uber é guardada inteira: elas trazem
CPF, nome do titular e telefone. Só os campos listados.

## 8. Regras de acesso

Permissão de tabela (o que o papel pode tentar) e RLS (em quais linhas).
Onde está "nada", o papel não recebe privilégio nenhum.

| Tabela | `anon` | `authenticated` | `service_role` |
| --- | --- | --- | --- |
| catálogo (5 tabelas), `horarios`, `loja` | ler tudo | ler tudo | nada |
| `comentarios` | ler os aprovados, só as colunas `id, produto, nome_exibido, nota, texto, criado_em` | o mesmo, mais os próprios com `status` | nada |
| `perfis` | nada | ler o próprio; alterar só `nome` e `celular` do próprio | nada |
| `enderecos` | nada | ler, criar, alterar e apagar os próprios | nada |
| `pedidos` | nada | ler os próprios | nada |
| `itens_do_pedido` | nada | ler os de pedido próprio | nada |
| `pagamentos` | nada | ler os de pedido próprio | nada |
| tudo em `privado` | nada | nada | nada em tabela; só `EXECUTE` nas funções da §9.2 |

Detalhes:

- Toda regra de dono usa `(select auth.uid())`, para o banco calcular uma vez
  por consulta.
- `user_id` de `comentarios` não é legível por ninguém pela API.
- Em `enderecos`, o `with check` exige `user_id = auth.uid()`; a cliente não
  consegue criar endereço em nome de outra.
- Funções: o privilégio padrão de `EXECUTE` é retirado de `public` (o
  pseudo-papel), `anon` e `authenticated`. Cada função recebe a permissão
  exata de quem a chama.
- Realtime fica desligado para todas as tabelas. Storage sem buckets.

## 9. Funções

Todas com `set search_path = ''` e nomes qualificados. Erro de regra sai como
um código curto (`produto_indisponivel`, `total_mudou`), que o servidor
traduz; a mensagem crua do banco nunca vai para a página.

### 9.1 `public`: chamadas pela cliente (`SECURITY DEFINER`, `EXECUTE` só para `authenticated`)

| Função | O que confere e faz |
| --- | --- |
| `criar_pedido(itens, cotacao, total_visto, guardar_endereco)` | exige sessão com e-mail confirmado; a loja precisa estar aberta (dentro de `horarios`, na hora de São Paulo, e sem `vendas_pausadas`), senão recusa com `loja_fechada`; quem criou o pedido dentro do horário pode pagar depois dele; no máximo 10 pedidos criados por hora por cliente; de 1 a 30 itens, `quantos` de 1 a 20, sem repetir; cada produto precisa estar `a_venda` e com preço; a cotação precisa existir, não ter vencido e não ser de outra cliente (vencida: recusa, e a página pede outra); soma tudo **com os preços do banco**; se o total difere de `total_visto`, recusa com `total_mudou` em vez de cobrar outro valor; grava pedido, itens e o retrato. **Uma cliente tem no máximo um pedido aguardando pagamento.** Se ela reenviar a mesma cotação com os mesmos itens, recebe o mesmo pedido (clique duplo não gera dois). Em qualquer outro caso, os pedidos dela que ainda aguardam pagamento são cancelados e nasce um novo; é o que acontece quando ela volta no fechamento e troca os potes ou o endereço |
| `iniciar_pagamento(pedido, forma)` | o pedido é dela e está aguardando pagamento; no máximo 5 tentativas por pedido; cancela a tentativa pendente anterior (o servidor também pede o cancelamento ao Mercado Pago; se mesmo assim ela for paga, vale a §10.3); cria a tentativa com o valor do pedido e devolve o `id` |
| `cancelar_pedido(pedido)` | só o próprio e só enquanto aguarda pagamento |
| `enviar_comentario(produto, nota, texto)` | só quem tem pedido **entregue** com aquele produto; um por produto (reenviar substitui e volta para pendente); o nome exibido é montado do perfil |
| `definir_marketing(aceita)` | grava `now()` ou nulo; é o único jeito de mexer nesse campo |
| `pode_excluir_conta()` | diz se pode e o motivo quando não pode (há pedido em aberto) |

### 9.2 `privado`: chamadas pelo servidor com a chave secreta (`EXECUTE` só para `service_role`)

| Função | O que faz |
| --- | --- |
| `registrar_cotacao(...)` | guarda a cotação emitida e devolve o `id` |
| `aplicar_pagamento(pagamento, mp_pedido_id, mp_pagamento_id, status, detalhe, valor, bandeira, final, parcelas, pix...)` | numa transação só: trava pagamento e pedido e aplica a tabela da §10.3; repetir a mesma informação não muda nada; recusado deixa o pedido aguardando, para a cliente tentar de novo; devolve o estado em que a tentativa e o pedido ficaram |
| `pagamentos_a_reconciliar()` | lista as tentativas pendentes há mais de 10 minutos e as que estão `a_estornar` (só `id`, `mp_id` e estado) |
| `registrar_evento_webhook(origem, evento, tipo, recurso)` | devolve `novo`, `ja_tratado` ou `tratar_de_novo` (chegou antes, mas não foi concluído) |
| `concluir_evento_webhook(id, erro)` | marca o aviso como tratado, ou guarda o erro e o deixa em aberto |
| `aplicar_entrega(pedido, uber_id, status, rastreio)` | anda o pedido para `a_caminho` e `entregue` |
| `consumir_limite(chave, maximo, janela)` | conta e diz se ainda pode |

A função da porta (regra 6), `conferir_porta()`, é a única exceção de lugar:
fica em `public` e é executável pelos três papéis, porque o Supabase a roda
com o papel de quem chama. Ela só compara o hash do cabeçalho com
`privado.porta` e recusa a chamada com 401 quando não confere.

### 9.3 Gatilhos e tarefas agendadas (funções em `privado`)

Toda função de gatilho é `SECURITY DEFINER` com `search_path = ''`. Motivo:
quem cria e apaga usuário é o papel `supabase_auth_admin`, que não tem
privilégio nas nossas tabelas. Os dois gatilhos em `auth.users` rodam como
ele e falhariam sem isso; os demais seguem a mesma regra para não depender
de quem disparou a mudança.

- **Cadastro** (`after insert` em `auth.users`): cria o perfil. O que vem do
  navegador no cadastro não é confiável, então:
  - copia `nome` e `celular`, aparados e validados;
  - exige `aceite_termos = true` e recusa o cadastro sem ele;
  - exige que `versao_termos` seja igual à versão vigente, que fica numa
    constante do banco (uma função de `privado`, trocada por migration quando
    os termos mudam); versão inventada é recusada;
  - grava `termos_aceitos_em = now()` e, se `aceite_marketing = true`,
    `marketing_aceito_em = now()`; nunca uma data enviada;
  - ignora qualquer outro campo. Nenhum papel ou privilégio é derivado
    desses dados.
- **Exclusão de conta** (`before delete` em `auth.users`): recusa se houver
  pedido em aberto; apaga o retrato pessoal dos pedidos dela (nome, celular,
  e-mail, logradouro, número, complemento); as chaves estrangeiras fazem o
  resto (perfil, endereços e comentários somem; `pedidos.user_id` vira nulo).
  Tudo dentro do mesmo `delete`, sem estado intermediário.
- **Pedido** (`before update`): só aceita as passagens da §10.1, carimba a
  data de cada uma e impede mudar número, valores e dona. Vale para qualquer
  papel, inclusive pelo painel. Duas exceções, e só no sentido de apagar:
  `user_id` pode ir para nulo (é o que a chave estrangeira faz na exclusão
  da conta) e os campos do retrato podem ir para nulo (exclusão da conta e a
  guarda de 180 dias da §12). Nenhum deles pode receber outro valor.
- **Itens**: `update` e `delete` recusados.
- **Endereços**: limite de 5 e um só principal.
- **Auditoria** (`after insert/update/delete` em perfis, endereços, pedidos,
  pagamentos, comentários e produtos): grava quem, quando, o quê e quais
  colunas. `service_role` não tem `update` nem `delete` nela.
- **A cada 5 minutos** (`pg_cron`): pedido aguardando pagamento há mais de 60
  minutos vira cancelado por expiração, e a tentativa pendente vira expirada.
- **Todo dia**: a guarda da §12.

## 10. O pedido do começo ao fim

### 10.1 Estados

```
aguardando_pagamento -> pago -> em_preparo -> a_caminho -> entregue
        |                 |          |
        +----------> cancelado <-----+
```

`pago` é o Mercado Pago quem dá. `em_preparo` é a equipe. `a_caminho` e
`entregue` vêm do aviso do Uber (ou da equipe). Cancelar um pedido já pago
exige estorno, que a equipe faz no painel do Mercado Pago nesta rodada.

Nesta rodada quem chama a corrida é a equipe, quando o pedido fica pronto. A
cotação que a cliente pagou vale 15 minutos e a corrida sai depois disso; se
o Uber cobrar diferente, a diferença é da loja. A cliente paga o que viu.

### 10.2 Fechamento (a ordem das etapas do site não muda)

1. **Os potes.** A sacola continua no navegador. O servidor nunca confia nela.
2. **Entrega.** A página manda CEP, número e complemento. O servidor consulta
   o CEP, pede a cotação (Uber Direct, ou a de exemplo enquanto a conta não
   existe), guarda em `privado.cotacoes` e devolve o `id`, o valor, o tempo e
   o endereço por extenso. Vale 15 minutos. A cliente pode ainda não ter
   conta: o `id` da cotação é um código que só o navegador dela conhece.
3. **Seus dados.** Cadastro com código de 6 dígitos no e-mail, ou login (da
   outra sessão). Sai daqui com sessão.
4. **Pagamento.** O servidor chama `criar_pedido`, depois `iniciar_pagamento`,
   e só então fala com o Mercado Pago, usando o `id` da tentativa como chave
   de idempotência e o valor que o banco calculou.

A integração é pela **API de Orders** do Mercado Pago (`POST /v1/orders`),
que é a recomendada hoje; a de Payments ficou como legado. A chave de
idempotência é obrigatória.

**Pix.** O Mercado Pago só pede o e-mail de quem paga, sem CPF. Ele devolve
o código copia e cola e o QR. A validade pedida é de 30 minutos, o mínimo
que ele aceita. O servidor grava pela `aplicar_pagamento` (estado pendente)
e a página mostra. A página pergunta ao servidor de tempos em tempos se o
pedido foi pago.

**Cartão.** O formulário é o Card Payment Brick do Mercado Pago, dentro da
nossa página (é o caminho que ele recomenda, e deixa a loja no nível mais
leve do PCI, o SAQ A). Os dígitos vão do navegador direto para ele e voltam
como um código de uso único. O servidor recebe só esse código, cria o
pagamento e aplica a resposta. Se o formulário pedir CPF, ele passa pelo
servidor direto para o Mercado Pago, sem banco e sem log. A confirmação do
banco emissor (3DS) é pedida só quando o Mercado Pago vê risco: a página
mostra o desafio dele, a cliente tem até 40 minutos, e o resultado final
chega pelo aviso.

Conferido na documentação do Mercado Pago em 2026-11-18. Ficam para o plano
da etapa 3, porque a documentação não responde: o que fazer quando a chave
de idempotência é reenviada (ele devolve erro 409 em vez de repetir a
resposta), e a lista oficial de domínios para a CSP (há só a observada no
script dele).

### 10.3 Estados do pagamento

| Estado | Quer dizer | Pode virar |
| --- | --- | --- |
| `pendente` | criado, esperando o Mercado Pago | `aprovado`, `recusado`, `cancelado`, `expirado`, `a_estornar` |
| `aprovado` | dinheiro recebido; foi ele que pagou o pedido | `estornado`, `contestado` |
| `recusado` | o Mercado Pago recusou | fim |
| `cancelado` | a cliente trocou de forma ou cancelou | `aprovado` ou `a_estornar`, se o Mercado Pago avisar depois que foi pago |
| `expirado` | o prazo passou | `aprovado` ou `a_estornar`, idem |
| `a_estornar` | recebemos um dinheiro que não devíamos; devolução pendente | `estornado` |
| `estornado` | devolvido | fim |
| `contestado` | a cliente contestou a compra no banco dela | `aprovado` (ganhamos), `estornado` (perdemos) |

Quem manda é o Mercado Pago. Quando ele diz que uma tentativa foi paga, há só
dois destinos:

- **O pedido ainda aguarda pagamento e o valor confere:** a tentativa vira
  `aprovado` e o pedido vira `pago`, mesmo que do nosso lado ela já estivesse
  cancelada ou expirada. A cliente pagou o valor certo pelo pedido certo.
- **Qualquer outro caso** (pedido já pago por outra tentativa, pedido
  cancelado, valor diferente do nosso): a tentativa vira `a_estornar`. Esse
  estado fica gravado até a devolução ser confirmada; uma chamada que falha
  na hora não faz a dívida sumir.

### 10.4 Aviso do Mercado Pago (`POST /api/webhooks/mercadopago`)

1. Confere a assinatura. O Mercado Pago não assina o corpo: o cabeçalho
   `x-signature` traz `ts` e `v1`, e o texto assinado é
   `id:<data.id da URL, em minúsculas>;request-id:<x-request-id>;ts:<ts>;`.
   O servidor remonta esse texto, calcula o HMAC-SHA256 com o segredo do
   aviso e compara em tempo constante. Assinatura errada: 401, sem dizer o
   porquê. A resposta tem de sair em menos de 22 segundos; ele reenvia a
   cada 15 minutos.
2. `registrar_evento_webhook`. `ja_tratado`: responde 200 e para. `novo` ou
   `tratar_de_novo`: segue (os passos seguintes não têm efeito se repetidos).
3. Busca o pagamento na API do Mercado Pago com o nosso token. Do corpo do
   aviso só se aproveita o `id`.
4. `aplicar_pagamento` com o que a API respondeu.
5. Se a tentativa ficou `a_estornar`, pede o estorno ao Mercado Pago
   (`POST /v1/orders/{id}/refund`, com chave de idempotência) e aplica a
   resposta, que leva a tentativa a `estornado`. A documentação não garante
   um aviso de estorno, então o desenho não depende dele.
6. `concluir_evento_webhook` e responde 200. Se algo falhar depois do passo
   2, guarda o erro, deixa o aviso em aberto e responde 500, para o Mercado
   Pago tentar de novo.

**Reconciliação** (`POST /api/tarefas/reconciliar`, protegida por um segredo
próprio, chamada a cada 10 minutos por um agendador): pega
`pagamentos_a_reconciliar()`, consulta cada tentativa pendente no Mercado
Pago e aplica o resultado, e tenta de novo os estornos devidos. É o que
cobre aviso perdido e estorno que falhou. O agendador depende da hospedagem
(§18); se ela não tiver um, usa-se `pg_cron` com `pg_net`.

### 10.5 Aviso do Uber (`POST /api/webhooks/uber`)

Mesma disciplina: assinatura, uma vez só, `aplicar_entrega`. Fica pronto no
desenho e entra quando a conta Uber Direct existir.

## 11. Rotas do servidor

Todas no Next. Mutação é **Server Action**; aviso externo é **Route Handler**.
Toda ação, nesta ordem: confere a sessão (`exigirUsuario`, mesmo que a página
já tenha conferido), valida cada campo, consome o limite, chama o banco com a
sessão da cliente e devolve só os campos que a tela usa.

| Ação | Quem | Limite inicial |
| --- | --- | --- |
| `cotarEntrega(cep, numero, complemento)` | qualquer visitante | 10 por hora por IP |
| `fecharPedido(itens, cotacao, totalVisto, guardarEndereco)` | cliente | o da função |
| `pagarComPix(pedido)` | cliente | 5 tentativas por pedido |
| `pagarComCartao(pedido, codigoDoCartao, ...)` | cliente | 5 tentativas por pedido |
| `situacaoDoPedido(numero)` | cliente | 60 por hora |
| `cancelarPedido(pedido)` | cliente | |
| `salvarPerfil(nome, celular)` | cliente | 20 por hora |
| `salvarEndereco(...)`, `removerEndereco(id)`, `tornarPrincipal(id)` | cliente | 20 por hora |
| `definirMarketing(aceita)` | cliente | |
| `trocarEmail(novo)`, `trocarSenha(atual, nova)` | cliente, redigitando a senha | 5 por hora |
| `enviarComentario(produto, nota, texto)` | cliente | 5 por dia |

As ações da outra sessão usam a mesma `consumir_limite`, além do limite
nativo do Supabase Auth e do CAPTCHA: `entrar` 10 a cada 15 minutos por IP e
e-mail; `cadastrar` 5 por hora por IP; `reenviarCodigo` 5 por hora;
`esqueciASenha` 5 por hora por IP e e-mail; `redefinirSenha` 10 por hora;
`excluirConta` 3 por hora.

| Rota | O que é |
| --- | --- |
| `POST /api/webhooks/mercadopago` | §10.4 |
| `POST /api/tarefas/reconciliar` | §10.4, só com o segredo das tarefas |
| `POST /api/webhooks/uber` | §10.5 |
| `/conta`, `/conta/pedidos`, `/conta/pedidos/[numero]`, `/conta/perfil` | páginas de leitura, atrás de `exigirUsuario` |
| `/entrar`, `/cadastro`, `/esqueci-a-senha`, `/redefinir-senha`, `/auth/callback` | da outra sessão |

Camada de dados (`server-only`): um módulo por assunto (catálogo, pedidos,
perfil, endereços, comentários). Página e ação nunca montam consulta; chamam
a camada, que devolve objetos mínimos. `carregarCatalogo()` passa a ler do
banco, com cache.

Cabeçalhos de segurança em todas as respostas: HSTS, `nosniff`,
`Referrer-Policy`, `frame-ancestors 'none'`, `Permissions-Policy`. CSP com
nonce nas páginas que mostram ou recebem dado pessoal (`/sacola`, `/conta`,
`/entrar`, `/cadastro`, redefinição), liberando só os domínios do Mercado
Pago; as páginas institucionais continuam estáticas, com a CSP sem nonce.

## 12. LGPD e guarda

- **Aceite.** Sem aceite dos termos não existe conta (o gatilho recusa). O
  aceite de marketing é separado, opcional e revogável no perfil.
- **Mínimo.** Sem CPF, sem cartão, sem data de nascimento, sem resposta
  inteira de terceiros.
- **Exclusão.** A cliente apaga a conta no perfil, redigitando a senha. Somem
  perfil, endereços, comentários e cotações; os pedidos ficam sem dona e sem
  retrato pessoal, só com itens e valores.
- **Uma função só apaga o retrato** de um pedido, usada tanto na exclusão da
  conta quanto na guarda de 180 dias: zera nome, celular, e-mail, logradouro,
  número e complemento, e deixa bairro, cidade, UF e os 5 primeiros dígitos
  do CEP.
- **Prazos** (minha escolha; mudam com uma linha):

| O quê | Guarda |
| --- | --- |
| cotação, usada ou não (o pedido já copiou o endereço) | 24 horas |
| contagem de limites | 1 dia |
| avisos recebidos | 90 dias |
| retrato pessoal de pedido entregue ou cancelado | 180 dias; depois ficam bairro, cidade, UF e os 5 primeiros dígitos do CEP |
| auditoria | 12 meses |

## 13. Segredos e configuração

| Variável | Vai ao navegador? | Para quê |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim, é pública por desenho | sessão da cliente |
| `SUPABASE_SECRET_KEY` | nunca | avisos, limites, exclusão de conta |
| `SUPABASE_PORTA` | nunca | o segredo da porta (regra 6), enviado pelo servidor em toda chamada ao banco |
| `TAREFAS_SEGREDO` | nunca | autoriza a rota de reconciliação |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | sim | formulário do cartão |
| `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` | nunca | pagamentos e avisos |
| `UBER_DIRECT_*`, `COZINHA_ENDERECO` | nunca | cotação e corrida; o endereço da cozinha não vai para a página |

Regras: segredo só é lido em módulo `server-only`; nunca em log; nunca colado
em conversa; credencial de teste e de produção separadas; com credencial de
produção do Mercado Pago, cotação de exemplo é recusada.

**À mão, no painel do Supabase** (não dá para fazer por migration):

1. API: acrescentar `privado` aos schemas expostos (é o que deixa o servidor
   chamar as funções; os papéis de cliente continuam sem `USAGE`).
2. API: desligar as chaves antigas (`anon` e `service_role` em JWT) depois
   que as novas estiverem em uso.
3. Auth: confirmação de e-mail ligada; os modelos "Confirm signup" e "Reset
   password" com o código de 6 dígitos (`{{ .Token }}`), porque cadastro e
   redefinição são por código digitado, não por link; código valendo no
   máximo 1 hora; "Secure email change" ligado; senha mínima; proteção
   contra senha vazada; CAPTCHA em cadastro, login e redefinição; Site URL;
   lista de redirecionamentos só com `<site>/auth/callback`; validade do
   token de sessão no padrão (1 hora).
4. Auth: SMTP próprio. O envio embutido do Supabase não serve para clientes
   de verdade.
5. Conta do Supabase do dono com MFA (e a do Mercado Pago também).
6. Antes de ir ao ar: plano com backup diário e sem pausa por inatividade.

**À mão, no painel do Mercado Pago** (etapa 3): a URL do aviso é cadastrada
na aplicação, não mais enviada em cada pagamento; ligar os eventos "Order
(Mercado Pago)" e "Contestações"; copiar a "Assinatura secreta" para
`MERCADOPAGO_WEBHOOK_SECRET`.

## 14. Como provar

Testes de banco em SQL, guardados em `supabase/tests/`, rodados dentro de
uma transação que é desfeita no fim (não deixam dado). Nesta rodada quem
roda é o agente, pelo MCP `supabase-amo`, depois de cada migration; os
arquivos ficam no repositório para qualquer pessoa repetir. Rodar em
integração contínua fica para quando houver uma.

0. **A porta.** Uma chamada HTTP de verdade à API de dados com a chave
   publicável e sem o segredo é recusada, como visitante e com o token de
   uma cliente; com o segredo, passa.

1. **Matriz de isolamento.** Para cada tabela de `public`, três atores
   (visitante, cliente A, cliente B) e quatro operações. A nunca lê nem
   altera o que é de B; o visitante só lê catálogo e comentário aprovado.
2. **Inventário de permissões.** A lista de privilégios de `anon`,
   `authenticated` e `service_role` em tabelas, colunas e funções é
   exatamente a desta spec. Uma tabela ou função nova sem decisão quebra o
   teste.
3. **`criar_pedido`.** Total vem do banco; recusa fora do horário, em dia
   fechado e com as vendas pausadas; recusa produto fora de venda,
   quantidade inválida, cotação vencida ou de outra cliente, e total
   diferente do visto; reenviar igual devolve o mesmo pedido; reenviar
   diferente cancela o anterior e cria outro.
4. **Estados.** Passagem inválida é recusada para qualquer papel, no pedido
   e no pagamento.
5. **`aplicar_pagamento`.** Cada linha da tabela da §10.3: repetir não muda
   nada; tentativa cancelada que é paga aprova o pedido que ainda aguarda;
   segunda aprovação, pedido cancelado e valor diferente viram `a_estornar`.
6. **Conta.** O cadastro sem aceite ou com versão de termos errada falha; a
   exclusão com pedido em aberto falha. E uma exclusão de verdade: uma
   cliente com pedido entregue, comentário e endereço é apagada pelo mesmo
   caminho que o Supabase Auth usa (papel `supabase_auth_admin`); a exclusão
   passa, perfil, endereços e comentário somem, e o pedido fica sem dona e
   sem retrato.

7. **Injeção.** Cada função de `public` recebe, em cada parâmetro de texto,
   uma lista de entradas hostis (aspas, `; drop table`, `' or 1=1 --`,
   comentários de SQL, operadores de filtro da API, texto de 1 MB, bytes
   nulos, HTML e `javascript:`). O resultado tem de ser recusa por validação
   ou o texto guardado literalmente; nunca um efeito. O mesmo teste confere
   que nenhuma função do projeto contém `execute`.

Testes do servidor (Vitest): assinatura do aviso (certa, errada, repetida,
velha), validação de entrada de cada ação com a mesma lista hostil, e que
nenhuma ação devolve coluna fora do combinado.

Testes do que vai para o navegador, rodados depois do `build`:

- **Varredura de segredo.** Nenhum arquivo de `.next/static` contém
  `sb_secret_`, o prefixo do token do Mercado Pago, nem o valor de qualquer
  variável de servidor.
- **Cabeçalhos.** Cada rota responde com os cabeçalhos de segurança da §11,
  e as páginas com dado pessoal respondem com a CSP de nonce.

Depois de cada migration: conselheiro de segurança do Supabase sem
apontamentos, fora a função da porta e as 6 funções da §9.1, que são chamáveis de
propósito.

## 15. Ordem de construção

1. **Banco.** Migrations, carga do catálogo, testes da §14. Não depende de
   conta externa nem da outra sessão. As migrations entram direto neste
   projeto, que está vazio, e ficam em `supabase/migrations/`. A carga usa
   os preços e as descrições de `src/data/exemplos.ts`, com `a_venda`
   ligado, para o site continuar funcionando; são valores de exemplo, e
   trocá-los pelos reais é item da etapa 4.
2. **Leitura.** Catálogo vindo do banco; Minha conta (perfil, endereços,
   pedidos) sobre a auth da outra sessão.
3. **Fechamento de verdade.** Cotação no servidor, `criar_pedido`, Mercado
   Pago com credencial de teste, aviso.
4. **Antes de ir ao ar.** Criar o **banco de produção**: um projeto Supabase
   novo, separado deste (que é o de desenvolvimento), montado aplicando as
   mesmas migrations de `supabase/migrations/` em ordem, com o seu próprio
   segredo da porta, as suas chaves e a configuração manual da §13 feita de
   novo. Nenhum dado de teste passa para lá. Atenção: a migration de carga
   do catálogo traz os preços de exemplo; uma migration nova com os preços
   e as descrições reais tem de entrar antes de abrir as vendas. Depois:
   credenciais de produção do Mercado Pago, o agendador da reconciliação,
   Uber Direct e domínio.

A etapa 1 foi construída direto desta spec. Cada etapa seguinte ganha o seu
plano; o da etapa 2 é
`docs/superpowers/plans/2026-11-18-amo-etapa-2-leitura.md`.

## 16. Divisão entre as duas sessões

- **amo-c4 (esta):** todo o banco, inclusive `perfis` e os gatilhos em
  `auth.users`; a camada de dados; as ações e rotas da §11; Minha conta.
- **amo-72:** `src/lib/auth/*` (`obterUsuario`, `exigirUsuario`, `sair`,
  `criarClienteServidor`, `criarClienteAdmin`), `proxy.ts` (sessão em cookie
  `httpOnly` e o nonce da CSP), as páginas de entrar, cadastrar e redefinir,
  o cadastro dentro do fechamento, a rota de excluir conta, os pacotes
  `@supabase/ssr` e `@supabase/supabase-js`.
- Não existe cliente Supabase no navegador.

## 17. Deixado para quem constrói

- Os nomes e a divisão dos arquivos de servidor.
- Como a página do pedido pergunta se o Pix caiu (intervalo e parada).
- O tempo de cache do catálogo.
- De onde vem o endereço a partir do CEP (um serviço público de CEP, chamado
  pelo servidor).
- O texto de cada mensagem de erro, a partir dos códigos.
- Como o limite por IP lê o IP atrás do proxy da hospedagem.

## 18. Em aberto

- Onde o site vai ser hospedado e em que domínio (muda cabeçalhos, IP e a URL
  dos avisos).
- As contas: Mercado Pago (credenciais de teste para a etapa 3), Uber Direct,
  provedor de e-mail.
- O plano do Supabase.
- O texto dos termos de uso e da política de privacidade, e as páginas onde
  ficam (o cadastro aponta para elas). A versão vigente nasce como
  `2026-11-18`.

## 19. Ataques e defesas

Pedido do cliente, depois da primeira leitura: estruturar também contra
ataques, "como por exemplo SQL injection". As defesas já estavam espalhadas
pelas seções; aqui cada ataque aponta para a sua, e para o teste que a
prova. Nada desta seção é opcional.

### 19.1 Injeção de SQL

Um ataque de injeção só existe onde um texto de fora vira parte de um
comando. O desenho não deixa esse lugar existir, em quatro pontos:

1. **O servidor não escreve SQL.** Toda consulta sai pelo cliente do
   Supabase, que manda valores como parâmetros, separados do comando. Não há
   conexão direta ao Postgres nem biblioteca de SQL no projeto.
2. **Os filtros são fixos.** A camada de dados usa só os métodos com coluna
   escrita no código (`.eq('numero', valor)`). É proibido montar filtro com
   texto (`.or()`, `.filter()` com valor de fora, nome de coluna ou de
   ordenação vindo da página), porque a API de dados tem a sua própria
   gramática de filtro e ela também pode ser injetada.
3. **Dentro do banco, nenhum `execute`.** As funções usam só SQL estático,
   em que toda variável entra como parâmetro. Todas têm `search_path = ''` e
   nomes completos, o que fecha o ataque em que alguém cria um objeto com
   nome igual para a função chamar o errado. A lista de itens do pedido
   chega como JSON e é lida com tipos, campo a campo.
4. **O formato barra antes.** Slug só aceita letra minúscula, número e
   hífen; identificador só aceita UUID; CEP e celular só dígitos; todo texto
   livre tem tamanho máximo. O que não tem o formato não chega à consulta.

E se algum ponto falhar: quem executaria o comando é `anon` ou
`authenticated`, que não criam, alteram nem apagam tabela (conferido: só têm
`USAGE` em `public`), não leem `privado`, têm tempo máximo de 3 e 8 segundos
por comando e são barrados em `update` e `delete` sem `where` (conferido:
`safeupdate` está ligado neste projeto).

Prova: teste 7 da §14.

### 19.2 Os outros ataques

| Ataque | Como seria aqui | Defesa | Prova |
| --- | --- | --- | --- |
| Ver ou alterar dado de outra cliente (troca de id) | pedir `/conta/pedidos/` com o número de outra | a porta (regra 6), RLS por dona, números de pedido aleatórios, ids em UUID | §14, testes 0 e 1 |
| Script malicioso na página (XSS) | comentário ou nome com `<script>`; link `javascript:` | o React escapa todo texto; nenhum HTML vindo de cliente é inserido cru; comentário recusa `<` e `>`; CSP com nonce nas páginas com dado pessoal; cookie `httpOnly`, que o script não lê; `rastreio_url` só vira link se for `https` de domínio do Uber | §14, teste 7 e cabeçalhos |
| Ação forjada a partir de outro site (CSRF) | página de terceiro dispara "trocar e-mail" com o cookie da cliente | toda mutação é Server Action (só `POST`, com `Origin` conferido pelo Next); cookie `SameSite=Lax`; nenhuma mudança por `GET`; e-mail e senha pedem a senha de novo | teste de servidor |
| Site embutido para enganar o clique | a loja dentro de um `iframe` | `frame-ancestors 'none'` | cabeçalhos |
| Adivinhar senha, testar senhas vazadas | milhares de tentativas de login | CAPTCHA; limite por IP e e-mail no servidor e no Supabase Auth; recusa de senha já vazada; código de 6 dígitos com limite de tentativas | painel (§13) e teste de limite |
| Descobrir quem é cliente | "este e-mail já tem conta" | entrar, cadastrar e redefinir respondem igual para e-mail que existe e que não existe | teste de servidor |
| Roubo de sessão | copiar o token | cookie `httpOnly`, `Secure`, `SameSite`; token de 1 hora; renovação com detecção de reuso (padrão do Supabase); trocar a senha encerra as outras sessões | cabeçalhos; painel |
| Tomar a conta trocando o e-mail | invasor com a sessão aberta troca o e-mail | senha de novo e confirmação nos dois e-mails ("Secure email change") | painel (§13) |
| Mexer no preço, no frete ou no total | alterar o valor no navegador | regras 2 e 4: o banco calcula; `total_visto` só serve para recusar | §14, teste 3 |
| Aviso de pagamento forjado ou repetido | `POST` falso dizendo "pago" | assinatura; o corpo não é usado; o servidor busca o pagamento no Mercado Pago e compara o valor; repetir um aviso verdadeiro só refaz a consulta | §14, teste 5 e testes de servidor |
| Enviar campo a mais | mandar `status` ou `user_id` junto com o nome | cada ação lê uma lista fechada de campos; permissão por coluna; a cliente não tem `insert` nem `update` em pedido e pagamento | §14, testes 1 e 2 |
| Abuso e sobrecarga | robô pedindo cotação ou criando pedido sem parar | limite por ação (§11), limites dentro das funções, tamanho máximo de entrada, tempo máximo por comando, conta com e-mail confirmado para comprar | teste de limite |
| Fazer o servidor chamar um endereço escolhido (SSRF) | passar uma URL para o servidor buscar | o servidor só chama endereços fixos (Mercado Pago, Uber, serviço de CEP); nenhuma URL vem da página; o CEP entra só como 8 dígitos | teste de servidor |
| Redirecionar para site falso | `?volta=https://site-falso` | `volta` só aceita caminho interno; a lista de redirecionamento do Auth tem um endereço só | teste de servidor |
| Vazar segredo | chave no pacote do navegador, no git ou no log | segredo só em módulo `server-only`; `.env*` fora do git; nenhum log de corpo, cabeçalho ou resposta de terceiro | varredura de segredo |
| Mensagem de erro que conta demais | erro do banco na tela | a página só recebe códigos curtos; o erro cru fica no servidor | teste de servidor |
| Subir de privilégio dentro do banco | usar uma função com poder para ler o que não devia | funções com poder são poucas, com `search_path` vazio, sem `execute`, e cada uma confere a dona pela sessão; a lista de quem pode executar o quê é fixa | §14, teste 2 |
| Dependência comprometida | pacote malicioso numa atualização | poucas dependências (o Mercado Pago é chamado por `fetch`, sem SDK no servidor); `package-lock.json` versionado e instalação por `npm ci`; `npm audit` antes de cada entrega | rotina |
| Escuta no caminho | interceptar a conexão | HTTPS em tudo, HSTS; o Supabase só aceita TLS | cabeçalhos |
| Envio de arquivo malicioso | upload | não existe envio de arquivo no sistema | não se aplica |

### 19.3 O que este desenho não resolve sozinho

- **Ataque de volume** (derrubar o site com tráfego). Depende da proteção da
  hospedagem, que ainda não foi escolhida (§18). Os limites daqui seguram
  abuso, não uma enxurrada.
- **A conta do dono.** Quem entrar no painel do Supabase ou do Mercado Pago
  com a senha do dono passa por cima de tudo. Por isso o MFA nas duas contas
  é item obrigatório da §13.
- **O computador da cliente.** Se ele estiver comprometido, o invasor age
  como ela. O que limita o estrago é não haver cartão salvo e a senha ser
  pedida de novo para trocar e-mail, senha e excluir a conta.
