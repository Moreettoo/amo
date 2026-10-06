# AMO · Catálogo e gaveta · Design Spec

**Data:** 2026-10-06
**Status:** desenho aprovado em conversa, aguardando revisão desta spec
**Parte de:** a home v2 "Retrô doce" (`2026-10-05-amo-home-v2-retro-design.md`).
Tokens, tipografia, molduras, card, estratos, movimento, hovers, contraste e
foco valem como estão lá e não são repetidos aqui.
**Referência visual:** o canvas aprovado no Design do claude.ai,
<https://claude.ai/artifact/QJTRTLJYeX2FnUUfMTpft9> (privado; 7 pranchetas).
Quando esta spec e o canvas divergirem, vale esta spec (§12).

---

## 1. O pedido

- No topo da home, um ícone que abre uma barra lateral pela esquerda com o
  catálogo.
- Clicar numa categoria da barra leva à tela do catálogo já nessa categoria.

Decidido na conversa:

| pergunta | decisão |
|---|---|
| o que é "categoria" | a **Linha** do cadastro (Bolos no pote, Bolos inteiros, Salgados…) |
| a seção Cardápio da home | vira **vitrine**: poucos produtos, sem filtros, com caminho para o catálogo |
| o botão "Ver cardápio" da nav | passa a levar a `/catalogo` |
| celular | **uma gaveta só**: linhas em cima, links da home embaixo; o menu ≡ some |
| os dois botões de catálogo na nav | ficam os dois: "Catálogo" abre a gaveta, "Ver cardápio" abre a página |
| sabor clicado na gaveta (com uma linha só) | abre o catálogo rolado até o card daquele sabor |
| cor da gaveta | clara (`creme` com grão), borda ondulada `cobre` e `caramelo` |

**Sucesso:** de qualquer ponto da home, em dois cliques a pessoa está vendo
todas as receitas de uma linha; com uma linha só (hoje) nada parece vazio; e
quando entrar uma linha nova, gaveta, catálogo e vitrine se ajustam só pelo
cadastro.

---

## 2. Rotas

| rota | o que mostra |
|---|---|
| `/catalogo` | com 2 ou mais linhas: "Tudo", todas as receitas agrupadas por linha. Com uma linha só: a página dessa linha |
| `/catalogo/[linha]` | as receitas de uma linha |
| `/catalogo?vontade=<slug>` e `/catalogo/[linha]?vontade=<slug>` | o mesmo, com o filtro de vontade já ligado |

- `[linha]` é o `slug` da linha. Só existem as linhas com pelo menos um
  produto: `generateStaticParams` lista essas, e `dynamicParams = false` faz
  qualquer outro slug cair no 404.
- As duas rotas são estáticas (geradas no build). A vontade da URL é lida no
  cliente, depois da hidratação (§5.4), para o HTML do servidor continuar
  completo e sem `Suspense`.
- **Os slugs viram endereço, então mudam para ler bem:** `pote` passa a
  `bolos-no-pote`. Na fixture de catálogo misto, `inteiro` passa a
  `bolos-inteiros` e `salgado` a `salgados`. O `formato` dos produtos
  (`pote`, `inteiro`, `unidade`) não muda.

---

## 3. A nav (as duas páginas)

- Um botão novo no começo da pílula, antes do logo: **Catálogo**.
  - Ícone de três linhas onduladas (as camadas do bolo), traço de 2.2 px,
    em `currentColor`.
  - A partir de 821 px: ícone e a palavra "Catálogo", pílula com borda de
    2 px `expresso`, 44 px de altura.
  - Abaixo de 821 px: só o ícone, círculo de 44 px, com
    `aria-label="Abrir o catálogo"`.
  - `aria-haspopup="dialog"`, `aria-expanded` e `aria-controls` apontando
    para a gaveta.
  - Fica dentro de `so-js`: sem JavaScript não há gaveta, e o caminho para o
    catálogo é o "Ver cardápio".
- O botão ≡ e o `#menu-mobile` saem. Os links da home vão para dentro da
  gaveta no celular (§4.3).
- "Ver cardápio" passa a apontar para `/catalogo`.
- Os links da nav e do rodapé passam a ser absolutos (`/#hoje`, `/#rotulos`,
  `/#marca`; o logo, `/#topo`), para funcionarem também no catálogo. Na
  home, o `RolagemSuave` continua conduzindo esses links, porque o caminho
  é o mesmo (`/`) e só muda o hash.
- A nav recebe da página os dados da gaveta (§4.4) e o slug da linha atual,
  quando houver.

---

## 4. A gaveta

### 4.1 Forma

- `<dialog>` nativo aberto com `showModal()`: o navegador cuida da camada
  de cima, do fundo inerte, do Esc e de prender o foco.
  `aria-labelledby` aponta para o título "Catálogo".
- Vem da esquerda. Largura de 400 px no desktop e `min(340px, 88vw)` no
  celular, altura total da janela. Fundo `creme` com `.grao`.
- A borda direita é ondulada: três camadas em SVG vertical (`cobre` atrás,
  `caramelo` no meio, `creme` na frente), os estratos da home de lado.
  Decorativo, `aria-hidden`.
- Fundo da página: `expresso` a 60% com desfoque de 2 px
  (`::backdrop`). Clicar nele fecha.
- O conteúdo da gaveta rola sozinho quando não cabe (`overflow-y: auto`,
  `data-lenis-prevent`).

### 4.2 Conteúdo com 2 ou mais linhas

1. Cabeçalho: h2 "Catálogo" em Caprasimo (40 px; 34 no celular) e o botão
   fechar, círculo de 44 px com ✕, `aria-label="Fechar o catálogo"`.
2. Frase **(P)**: "Escolha uma linha para ver as receitas dela."
3. Uma lista com um link por linha, na ordem do cadastro, para
   `/catalogo/<slug>`. Separadas por tracejado. Cada item:
   - a capa da linha (§4.4) na moldura do formato dela, em miniatura (arco
     62 × 78, círculo 68, quadrado 64 com raio 16), decorativa;
   - a regra em `cobre-texto` (13.5 px, 700), o nome em Caprasimo 25 px e
     "7 receitas" em `suave`;
   - uma seta num círculo de 40 px;
   - `aria-current="page"` quando é a linha aberta no catálogo;
   - hover e foco: fundo `papel` com sombra deslocada `caramelo` de 6 px; a
     seta enche de `expresso`.
4. Botão retrô escuro, largura total: "Ver o catálogo inteiro" e, em
   `caramelo`, "11 receitas", para `/catalogo`.
5. No pé, um cartão `caramelo` para `/#hoje`: "Não sabe o que escolher?" e
   "Hoje o dia pede →" em Caprasimo.

### 4.3 Conteúdo com uma linha só (hoje)

1. O mesmo cabeçalho.
2. Frase **(P)**: "Escolha a linha ou vá direto a um sabor."
3. Um cartão `papel` com sombra `caramelo` para `/catalogo/<slug>`: a regra,
   o nome da linha em Caprasimo 30 px, "Ver as 7 receitas →" e, à direita,
   as fotos dos 3 primeiros produtos em arcos sobrepostos (decorativas).
4. Rótulo "Os sabores" e a lista dos produtos da linha, por `ordem`: foto
   redonda de 38 px (decorativa), nome e chevron. Cada um é um link para
   `/catalogo/<slug>#<slug-do-produto>`.
5. O mesmo cartão do "Hoje o dia pede".

Sem o botão "Ver o catálogo inteiro": com uma linha, ele repetiria o cartão.

### 4.4 Os dados

`montarGaveta(catalogo)`, em `src/lib/visao.ts`, função pura:

- `linhas`: as linhas com produto, por `ordem`, cada uma com `slug`, `nome`,
  `regra`, `contagem` e `capa`. A capa é a imagem e o formato do destaque,
  se ele for da linha; senão, do primeiro produto da linha por `ordem`.
- `total`: o número de produtos.
- `sabores`: só quando há uma linha. Os produtos dela por `ordem`, com
  `slug`, `nome` e `imagem`. Com 2 ou mais linhas, lista vazia.

### 4.5 No celular

Abaixo de 821 px entra, depois da lista, um bloco "Na página inicial" com os
links Hoje o dia pede, O que é saudável e A marca (17 px, 600, alvos de
46 px). A partir de 821 px ele some, porque esses links estão na nav.

### 4.6 Comportamento

- Abre no clique do botão Catálogo. Fecha no ✕, no Esc, no clique fora e no
  clique de qualquer link de dentro. Ao fechar, o foco volta ao botão
  Catálogo, exceto quando um link navegou para outra página.
- O foco entra no botão fechar.
- Enquanto está aberta, o Lenis para (`useRolagem()` ganha `pausar()` e
  `retomar()`) e a página de trás não rola.
- Link para âncora da própria página (`/#hoje` na home): a gaveta fecha
  antes, e o `RolagemSuave` conduz a rolagem como hoje.

### 4.7 Movimento

Tudo dentro de `@media (prefers-reduced-motion: no-preference)`. A gaveta
fechada é `display: none` (é um `<dialog>` sem `open`), então o HTML do
servidor não carrega estado escondido; a regra da §6.2 da v2 segue valendo.

| o quê | como |
|---|---|
| abrir | o painel entra de `translateX(-100%)` (0.45 s, `--ease`); o fundo aparece (0.3 s); as camadas da borda chegam com mola, 0.08 s uma depois da outra. Por `@starting-style` e `transition-behavior: allow-discrete` |
| fechar | o painel sai para a esquerda (0.3 s) e o fundo some |
| itens | os links da lista sobem 8 px e aparecem, 40 ms entre eles, a partir de 0.12 s |

Total abaixo de 2 s; só `transform` e `opacity`. Com movimento reduzido,
abre e fecha sem animação.

---

## 5. A página do catálogo

### 5.1 Ordem

Nav · topo `expresso` · estrato (o `heroCardapio` da home) · corpo `creme`
com grão · faixa cobre · rodapé. O `<main id="conteudo">` envolve topo e
corpo. Um h1 por página.

### 5.2 Topo

- Trilha (`<nav aria-label="Trilha">` com `<ol>`): Início (`/`) / Catálogo
  (`/catalogo`) / nome da linha, este com `aria-current="page"`. Em "Tudo",
  a trilha para em Catálogo, que vira o item atual.
- Rótulo "O catálogo" em `caramelo`.
- h1 em Caprasimo, `clamp(46px, 7vw, 92px)`: o nome da linha; em "Tudo",
  **(P)** "O catálogo inteiro".
- Lead em `claro-suave`: a `frase` da linha com ponto final (sem frase, sem
  lead); em "Tudo", **(P)** "Cada linha com a sua regra no rótulo."
- Pílula `caramelo` com a contagem: "7 receitas" ("1 receita").
- À direita:
  - numa linha, a capa da linha (§4.4) na moldura do formato, maior, e o
    selo carimbo `cobre` com a regra, girado −10°;
  - em "Tudo", as capas de até 3 linhas, cada uma na sua moldura, menores e
    sem selo.
- A capa é a única imagem da página com `preload`.
- No celular o topo empilha: o selo vai para o canto direito do título e a
  capa sai.

### 5.3 Corpo

Duas colunas a partir de 821 px; uma abaixo disso.

**Coluna das linhas** (só com 2 ou mais linhas):

- `<nav aria-label="Linhas">` com o rótulo "Linhas" e um link por item:
  "Tudo" (ícone de camadas) e cada linha (o contorno do formato: arco,
  círculo ou quadrado), com a contagem à direita.
- O item atual tem fundo `expresso`, texto `creme` e `aria-current="page"`.
  Os outros, hover `linho`.
- Abaixo, o mesmo cartão do "Hoje o dia pede" da gaveta.
- `position: sticky` a 96 px do topo, enquanto couber na janela.
- No celular vira uma fileira de pílulas que rola para o lado, logo abaixo
  do estrato, com o item atual preenchido.

**Coluna das receitas:**

1. Barra de filtros, com um tracejado embaixo:
   - rótulo "Na vontade de" e um grupo (`role="group"`) de pílulas, uma por
     vontade com produto **na vista atual**, com a contagem. Liga e desliga,
     `aria-pressed`. Uma vontade por vez;
   - as pílulas tracejadas de selo da v2, com a mesma regra (só os selos
     que alguns produtos da vista têm e outros não). Hoje não aparecem;
   - à direita, a região viva: "Mostrando 3 de 7 receitas".
   - A barra inteira é `so-js`.
2. A grade da v2 (`auto-fill, minmax(230px, 1fr)`, 56 × 26 px; no celular,
   duas colunas, 40 × 14), com o `CardProduto` de hoje, o FLIP do Motion e
   o pote que enche.
   - Cada card ganha `id` igual ao slug do produto e `scroll-mt-24`, para o
     link da gaveta.
   - Numa linha: um h2 "Receitas" só para leitor de tela, para o h3 dos
     cards não pular nível.
   - Em "Tudo": um grupo por linha, com h2 (o nome, Caprasimo 36 px) e o
     link "Ver só bolos no pote" para `/catalogo/<slug>`. Grupo vazio pelo
     filtro some.
3. Estado vazio (filtro sem resultado): "Nenhuma receita com esse filtro
   ainda." e "Ver todas", que limpa vontade e selo. É o da v2.
4. Numa linha: o rótulo dela, o mesmo cartão da seção Rótulos da home, com
   o rótulo de seção "O rótulo da linha" no lugar de "Sabores saudáveis".

### 5.4 Filtros e URL

- A vontade e o selo são estado local da página. A linha não é: é a rota.
- Ao montar, a página lê `?vontade=` de `window.location.search`. Vontade
  que existe na vista liga o filtro; qualquer outro valor é ignorado.
- Trocar o filtro não reescreve a URL.

### 5.5 Metadados

- `/catalogo`: título "Catálogo · AMO".
- `/catalogo/[linha]`: `generateMetadata` com "Bolos no pote · Catálogo ·
  AMO" e a descrição "Bolos no pote, zero açúcar. Um abraço em forma de
  sobremesa." (nome, regra em minúsculas, frase).

---

## 6. A home

### 6.1 O cardápio vira vitrine (`#cardapio`)

- Mesmo topo: rótulo "O cardápio" e h2 "Escolha pelo sabor". O parágrafo
  dos filtros sai.
- À direita do título, o link sublinhado "Ver as 11 receitas →" para
  `/catalogo`.
- Uma fileira de até 4 cards, `montarVitrine(catalogo)`:
  1. o destaque;
  2. o primeiro produto (por `ordem`) de cada outra linha, na ordem das
     linhas;
  3. completa por `ordem` com os que faltam.
  - Hoje: Prestígio, Paçoca, Mousse de maracujá, Ninho com frutas vermelhas.
  - Com a fixture mista: Prestígio, Cenoura com cacau, Torta de frango,
    Paçoca.
- Embaixo, depois de um tracejado:
  - com 2 ou mais linhas, o rótulo "Direto para uma linha" e uma pílula por
    linha com a contagem, para `/catalogo/<slug>`;
  - sempre, o botão retrô escuro "Ver o catálogo inteiro" para `/catalogo`.
- No celular: duas colunas, 4 cards.
- Saem dali: filtros, região viva, estado vazio e FLIP.

### 6.2 Os outros caminhos para o catálogo

| de onde | antes | agora |
|---|---|---|
| nav, "Ver cardápio" | `#cardapio` | `/catalogo` |
| hero, "Ver o cardápio" | `#cardapio` | `/catalogo` |
| Hoje o dia pede, "Ver as 2 no cardápio" | `#cardapio` + filtro de vontade | `/catalogo?vontade=<slug>` |
| final, pílulas de linha | `#cardapio` + filtro de linha | `/catalogo/<slug>` |
| final, "Ver o cardápio" | `#cardapio` | `/catalogo` |
| rodapé, coluna Linhas | `#cardapio` + filtro, só com filtros visíveis | `/catalogo/<slug>`, sempre |

### 6.3 O que sai

- O `FiltroProvider` e o `useFiltro`: ninguém filtra mais na home, e o
  catálogo guarda o filtro localmente.
- De `montarVisao`: `filtrosLinha` e `filtrosSelo` (vão para a visão do
  catálogo, §7). Entra `vitrine`.
- A prop `filtraLinha` do rodapé.

---

## 7. Arquitetura

### 7.1 Funções puras (`src/lib/visao.ts`)

- `montarVitrine(c): Produto[]`, a regra da §6.1.
- `montarGaveta(c)`, a §4.4.
- `montarCatalogo(c, linha: string | null)`:
  - `linha` nula com 2 ou mais linhas é "Tudo"; nula com uma linha só vira
    essa linha; slug inexistente lança erro (a rota já filtrou);
  - devolve título, lead, contagem, regra, capas, itens da coluna de linhas
    (com a contagem e qual é o atual), grupos de produtos, vontades e selos
    da vista e o rótulo da linha.
- `filtrar` e `FILTRO_VAZIO` continuam e passam a filtrar só vontade e selo
  dentro da vista.
- `linhasComProduto(c)`, usada pelo `generateStaticParams` e pelas funções
  acima.

### 7.2 Arquivos

**Novos:**

```
src/app/catalogo/page.tsx              "Tudo" (ou a linha única)
src/app/catalogo/[linha]/page.tsx      uma linha; generateStaticParams, dynamicParams = false, generateMetadata
src/app/estilos/gaveta.css             a gaveta, a borda ondulada e a animação
src/app/estilos/catalogo.css           topo, coluna de linhas, barra de filtros
src/components/layout/Gaveta.tsx       cliente: o <dialog>
src/components/sections/CatalogoPagina.tsx   cliente: filtros, grade, região viva
src/components/sections/TopoCatalogo.tsx     servidor: trilha, h1, capa, selo
src/components/ui/IconeCamadas.tsx     o ícone das três ondas
```

**Mudam:** `Nav.tsx` (botão, gaveta, sem menu ≡, links absolutos),
`Footer.tsx`, `Hero.tsx`, `Final.tsx`, `HojeODiaPede.tsx`, `Cardapio.tsx`
(vira a vitrine; o arquivo pode virar `Vitrine.tsx`), `RolagemSuave.tsx`
(`pausar`/`retomar`), `src/app/page.tsx`, `globals.css` (os dois `@import`
novos), `src/data/linhas.ts` e `src/data/produtos.ts` (slug), a fixture
mista.

**Saem:** `FiltroProvider.tsx`.

### 7.3 Servidor e cliente

- As duas páginas do catálogo são Server Components assíncronos:
  `carregarCatalogo()`, `montarCatalogo()`, `montarGaveta()`, e passam
  dados serializáveis.
- Nav e rodapé continuam renderizados por página (sem layout de grupo).
- Cliente: `Gaveta`, `CatalogoPagina` e a `Nav`, que já era.

### 7.4 Next 16

Antes de escrever código, ler em `node_modules/next/dist/docs/`:

- `01-app/03-api-reference/03-file-conventions/dynamic-routes.md`;
- `generate-static-params` e `02-route-segment-config/dynamicParams.md`;
- `generate-metadata`;
- `not-found.md`;
- `next/link` (navegação com hash e rolagem ao trocar de página).

---

## 8. Acessibilidade

- Gaveta: `<dialog>` modal com título, foco no botão fechar ao abrir e de
  volta no botão Catálogo ao fechar. Esc fecha. A lista é `<ul>` de links.
- Um h1 por página e nenhum nível pulado, inclusive numa linha só (o h2
  escondido da §5.3) e em "Tudo".
- `aria-current="page"` na trilha, na coluna de linhas e na gaveta.
- Pílulas de vontade e de selo com `aria-pressed`; resultado anunciado por
  região viva.
- Alvos de 44 px ou mais em todo botão e link de toque.
- Contraste: só pares já calculados na §9.2 da v2 (expresso, suave e
  cobre-texto sobre creme e papel; chocolate e expresso sobre caramelo;
  creme e claro-suave sobre expresso; papel sobre vinho, chocolate e
  expresso). Nenhum par novo.
- Foco: `--foco` como na v2; o topo do catálogo é superfície escura.
- Todo "AMO" em texto dentro de `translate="no"`.

---

## 9. Sem JavaScript

- O botão Catálogo não aparece (`so-js`); "Ver cardápio" leva à página.
- No celular, os links da home ficam sem caminho pela nav, como já
  acontecia com o menu ≡ (também `so-js`). O rodapé continua com eles.
- O catálogo renderiza completo no servidor: topo, coluna de linhas (links
  de verdade), todas as receitas da vista e o rótulo. Os filtros somem
  (`so-js`).

---

## 10. Testes

Vitest + Testing Library + jsdom + vitest-axe, como hoje.

**Visão (puros):**

- `montarVitrine`:
  - com o catálogo real dá Prestígio, Paçoca, Mousse de maracujá e Ninho com
    frutas vermelhas;
  - com a fixture mista dá Prestígio, Cenoura com cacau, Torta de frango e
    Paçoca;
  - sem destaque, começa pelo primeiro por `ordem`;
  - com menos de 4 produtos, mostra todos.
- `montarGaveta`:
  - capa de cada linha;
  - contagens;
  - `sabores` só com uma linha.
- `montarCatalogo`:
  - "Tudo" com a fixture;
  - linha única quando a linha é nula e só há uma;
  - vontades e selos da vista;
  - erro para slug inexistente.
- `linhasComProduto` e o `generateStaticParams`: só as linhas com produto.

**Gaveta:**

- abre e fecha pelo botão, pelo ✕, pelo Esc e pelo clique fora;
- o foco entra no fechar e volta ao botão;
- `aria-expanded` acompanha;
- com 3 linhas: os links certos, `aria-current` na linha atual e "Ver o
  catálogo inteiro";
- com uma linha: o cartão e os 7 sabores, com os links
  `/catalogo/bolos-no-pote#<slug>`;
- o bloco "Na página inicial";
- axe sem violação aberta.

**Catálogo:**

- as invariantes da home valendo nas duas rotas: um h1, nenhum nível pulado,
  imagem com alt e dimensões, âncora válida, exatamente uma imagem com
  `preload`, sem preço, sem "...", sem travessão, AMO em `translate="no"`,
  ids únicos, axe;
- trilha e `aria-current`;
- coluna de linhas só com 2 ou mais;
- os testes de filtro que hoje estão em `tests/cardapio.test.tsx` (pílulas,
  combinação, região viva, estado vazio, "Ver todas", `aria-pressed`), agora
  sobre a vista do catálogo;
- `?vontade=chocolate` liga o filtro; valor desconhecido é ignorado;
- o HTML do servidor segue a regra de estilo inline da §6.2 da v2.

**Home:**

- vitrine com 4 cards e sem filtros;
- os links da tabela da §6.2;
- nav sem o menu ≡ e com o botão Catálogo;
- rodapé com `/catalogo/<slug>`.

**Saem:** os testes do `FiltroProvider` e os de filtro do cardápio da home,
que mudam de lugar.

**Conferência visual:** Edge headless, como na v2:

- home com a gaveta aberta, catálogo de uma linha e catálogo "Tudo" (com a
  fixture), a 1440 e a 477 px;
- comparar com o canvas;
- conferir na mão que, com o Lenis ligado, ir da home ao catálogo começa no
  topo e que voltar por `/#hoje` cai no Hoje o dia pede.

---

## 11. Fora de escopo

Página de produto, busca, preço, carrinho, Supabase ligado, ordenação, o
filtro na URL além do `?vontade=` de entrada e a gaveta abrir em outras
páginas além da home e do catálogo (não há outras).

---

## 12. O que mudou do canvas para esta spec, e por quê

1. **Slugs legíveis.** O canvas não mostra endereço; aqui `pote` vira
   `bolos-no-pote`, porque o slug vira URL.
2. **Frase da gaveta com uma linha.** O canvas dizia "Hoje a AMO tem uma
   linha"; para o cliente final isso soa como aviso interno. Ficou "Escolha a
   linha ou vá direto a um sabor."
3. **Lead do "Tudo".** O canvas dizia "Três linhas…"; o número por extenso
   teria que acompanhar o cadastro. Ficou sem número.
4. **Selos no filtro.** O canvas mostra só a vontade; os selos da v2 vêm
   junto com a mesma regra e hoje não aparecem.
5. **Link da trilha "Catálogo"** no canvas trocava de estado; aqui é um link
   para `/catalogo`.

---

## 13. Pendências do cliente

Nenhuma trava a implementação.

**Textos meus (P):**

| onde | texto |
|---|---|
| gaveta, 2 ou mais linhas | Escolha uma linha para ver as receitas dela. |
| gaveta, uma linha | Escolha a linha ou vá direto a um sabor. |
| gaveta, botão | Ver o catálogo inteiro |
| gaveta, celular | Na página inicial |
| catálogo "Tudo", h1 e lead | O catálogo inteiro / Cada linha com a sua regra no rótulo. |
| catálogo, filtros | Na vontade de |
| catálogo, fim | O rótulo da linha |
| vitrine | Ver as 11 receitas · Direto para uma linha · Ver o catálogo inteiro |

**Nome:** a gaveta e a página se chamam "Catálogo", e o botão da nav continua
"Ver cardápio". Vale confirmar com o cliente se os dois nomes convivem ou se
um deles muda.

**Para as linhas novas:** foto de cada produto e a frase de cada linha (hoje
`[foto]` e `[frase da linha]` no canvas).

---

## 14. Critério de pronto

1. `/catalogo` e `/catalogo/bolos-no-pote` renderizam com o catálogo real;
   `/catalogo/qualquer-coisa` dá 404.
2. A fixture mista renderiza "Tudo", três linhas, a coluna de linhas e a
   gaveta de três linhas, sem mudar componente.
3. Da home, o botão Catálogo abre a gaveta e um clique numa linha (ou num
   sabor) chega ao lugar certo.
4. De 320 a 2560 px, sem rolagem horizontal.
5. Movimento reduzido e sem JavaScript: tudo utilizável, nenhum botão morto.
6. Teclado alcança tudo; foco visível em todas as superfícies; Esc fecha a
   gaveta.
7. axe sem violação; os testes da §10 passando; `npm run lint`,
   `npx tsc --noEmit` e `npm run build` limpos.
8. Conferência visual contra o canvas em desktop e celular.
