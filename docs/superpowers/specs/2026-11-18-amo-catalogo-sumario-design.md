# AMO · Catálogo "O sumário" · Design Spec

**Data:** 2026-11-18
**Status:** estrutura escolhida pelo cliente; aguardando aprovação desta spec
**Substitui:** a §5 (a página do catálogo) e a §2 (rotas) de
`2026-10-06-amo-catalogo-design.md`. A gaveta daquela spec continua valendo,
com os endereços novos da §5 daqui.
**Mundo visual:** o de `DESIGN.md` ("A Papelaria Fina"). Tokens, tipografia,
card, fio, foco, contraste e os três verbos de movimento valem como estão lá
e não são repetidos aqui.
**Esboço escolhido:** `.impeccable/mocks/decision/cat-sumario.html` (primeira
tela, 1440 × 900). Quando o esboço e esta spec divergirem, vale esta spec.

---

## 1. O pedido

Do cliente, em 2026-11-18:

- A seção "O rótulo da linha" não precisa se repetir no catálogo (ela já
  existe na home).
- O catálogo precisa ser reestruturado: interativo, dinâmico, fino, delicado
  e bem estruturado.
- Os produtos passam a ter categorias: **doces, salgados e refeições**. A
  lista completa dos produtos ainda vai chegar.

Por quê: o catálogo de hoje foi desenhado para uma linha só. Com três
categorias ele vira uma pilha de grades sem caminho, e o rótulo repetido
ocupa o lugar do que a pessoa veio ver.

## 2. Objetivos, não objetivos e o que seria um fracasso

**Objetivos**

1. Em qualquer ponto da página a pessoa sabe em que categoria está e chega a
   outra em um toque.
2. O catálogo inteiro cabe numa página só, organizado em capítulos.
3. O cadastro manda: categoria, linha e produto novos entram sem mexer em
   componente.
4. Com o cadastro de hoje (uma categoria, uma linha, 7 potes) nada parece
   vazio nem prometido.

**Não objetivos**

Página de produto, ficha que abre, busca, preço, carrinho, Supabase ligado,
ordenação, reorganizar a gaveta por categoria e categorias "em breve" sem
produto.

**Fracasso, mesmo funcionando**

- Qualquer coisa grossa, marcante ou cartoonizada; fio solto; animação em
  loop ou que quique.
- Um índice que some no celular ou que deixa de dizer onde a pessoa está.
- A página prometer categoria, linha ou selo que o cadastro não tem.

## 3. Caminhos considerados

Três estruturas foram esboçadas e mostradas ao cliente:

| caminho | o que é | o que custa |
|---|---|---|
| **O sumário** (escolhido) | tudo numa página, em capítulos, com um índice fino preso ao lado que acompanha a rolagem | a página fica comprida com muitos produtos; o índice precisa estar sempre à mão |
| A ficha | abas de categoria e uma ficha de papel que abre ao lado da grade ao tocar num produto | cada produto tem pouca informação própria hoje |
| A carta | lista escrita, como carta de restaurante, com uma foto grande que troca conforme o nome em foco | mostra uma foto por vez; a foto é o que convence |

O cliente escolheu **O sumário**. A recomendação era A ficha; a escolha dele
prevalece.

## 4. O cadastro: a categoria

- Entra `Categoria = { slug, nome, ordem }` e `Catalogo.categorias`.
- `Linha` ganha `categoria: string` (slug de Categoria). O produto continua
  apontando para a linha; a categoria dele é a da linha.
- Hoje: uma categoria, `doces` ("Doces"), com a linha `bolos-no-pote`.
  Salgados e refeições entram no cadastro quando a lista chegar.
- Só aparece na página a categoria que tem pelo menos um produto
  (`categoriasComProduto`), a mesma regra das linhas.
- `validarCatalogo` passa a recusar: slug de categoria repetido, linha com
  categoria inexistente e slug de categoria igual a slug de produto (os dois
  viram âncora na mesma página, §5).

## 5. Rota e endereços

Uma rota só: **`/catalogo`**. A rota `/catalogo/[linha]` sai.

| destino | endereço |
|---|---|
| o catálogo | `/catalogo` |
| uma categoria | `/catalogo#<slug-da-categoria>` (`/catalogo#doces`) |
| uma linha | `/catalogo#linha-<slug-da-linha>` (`/catalogo#linha-bolos-no-pote`) |
| um produto | `/catalogo#<slug-do-produto>` (como hoje) |
| chegada com vontade | `/catalogo?vontade=<slug>` (como hoje) |

- `caminhoDaLinha(slug)` passa a devolver a âncora da linha e entra
  `caminhoDaCategoria(slug)`. Gaveta, vitrine, seção final e rodapé já usam
  `caminhoDaLinha` e mudam de endereço sem mudar de desenho.
- Na gaveta, o link de cada sabor vira `/catalogo#<slug>` e o
  `aria-current` de linha sai (não existe mais página de linha). A `Nav`
  deixa de receber `linhaAtual`.
- Sem redirecionamento dos endereços antigos: o site ainda não foi
  publicado com eles.
- Metadados: título "Catálogo · AMO"; descrição montada do cadastro (os
  nomes das categorias e a frase do lead).

## 6. A página

### 6.1 Ordem

Nav · topo creme · filtros · corpo (sumário e capítulos) · fecho expresso com
a assinatura · rodapé. Tudo em creme até o fecho. O bloco "O rótulo da
linha" sai do catálogo; o `PapelRotulo` continua na home.

### 6.2 Topo (creme)

- Trilha: Início / Catálogo, este com `aria-current="page"`.
- h1 em duas vozes, pela regra `duasVozes` que já existe: "O catálogo" em
  Poppins leve e "inteiro" em script, em linha própria.
- À direita, alinhado pela base do título, o lead em `suave`. Com 2 ou mais
  categorias ele lista os nomes ("Doces, salgados e refeições. Cada linha
  com a sua regra no rótulo."); com uma, só a segunda frase.
- Sem capa: o topo não tem mais foto. A primeira foto da primeira grade
  passa a ser a única imagem pré-carregada da página.
- No celular o lead vai para baixo do título.

### 6.3 Filtros

Como hoje, logo abaixo do topo e valendo para a página inteira: "Na vontade
de" com as etiquetas de vontade, as de selo quando existirem, a região viva
"Mostrando 3 de 7 receitas." e o estado vazio com "Ver todas". A barra é
`so-js`. A vontade da URL continua ligando o filtro na chegada.

### 6.4 O sumário (o índice)

Aparece quando há o que escolher: 2 ou mais categorias, ou uma categoria com
2 ou mais linhas. Com o cadastro de hoje ele não aparece e a grade ocupa a
largura inteira.

**A partir de 821 px**, uma coluna de 208 px à esquerda do corpo:

- `<nav aria-label="Sumário">` com o rótulo "Sumário" em caixa alta
  espaçada e uma lista: uma categoria por item, na ordem do cadastro, com a
  contagem à direita em números tabulares; embaixo de cada categoria, as
  linhas dela, recuadas e em `suave`. A linha com o mesmo nome da categoria
  não se repete.
- Um fio de 1 px desce pela borda esquerda da lista. É ele que segura o
  **coração cobre**, que marca o item em que a pessoa está.
- O atual é um par: a categoria e, quando ela tem linhas na lista, a linha.
  Vale o último capítulo (e a última linha dele) cujo começo já passou de
  35% da altura da janela; antes disso, no topo da página, vale o primeiro.
  A categoria atual leva peso 500; `aria-current="location"` e o coração
  ficam no item mais fundo do par (a linha, se houver; senão a categoria).
  Na fileira do celular só a categoria conta.
- Cada item é um link para a âncora dele (§5). O `RolagemSuave` conduz a
  rolagem como já faz com qualquer âncora da página.
- Com filtro ligado, a contagem de cada item é a do que está na tela. O item
  sem resultado fica em `suave` e continua link: tocar nele limpa o filtro
  e leva ao capítulo (§6.5).
- Embaixo da lista, o link "Não sabe o que escolher? Hoje o dia pede", como
  hoje.
- `position: sticky` a 96 px do topo, enquanto couber na janela.

**Abaixo de 821 px**, o sumário vira uma fileira de etiquetas presa logo
abaixo da nav (a 64 px), em creme, que rola de lado:

- uma etiqueta por categoria (ou por linha, quando há uma categoria só),
  44 px de altura, a atual preenchida de expresso;
- a fileira rola sozinha para manter a etiqueta atual à vista;
- as linhas de dentro de cada categoria não entram na fileira;
- o link do "Hoje o dia pede" vai para o fim do corpo, antes do fecho.

### 6.5 Os capítulos

- Um `<section id="<slug-da-categoria>">` por categoria com produto, na
  ordem do cadastro, separados por espaço (nunca por fio). O h2 é o nome da
  categoria no tamanho de título de seção (Poppins 300).
- Dentro, um `<section id="linha-<slug>">` por linha com produto. O topo da
  linha tem o nome (h3), a regra em caixa alta com o coração na frente e, à
  direita, a contagem ("7 receitas"). Quando a categoria tem uma linha só,
  esse topo fica na mesma linha do h2 a partir de 821 px, como no esboço.
  Linha com o mesmo nome da categoria: o h3 fica só para leitor de tela.
- A grade é o `GradeProdutos` de hoje, com o FLIP do filtro. Com o sumário
  ao lado ela tem 4 colunas a partir de 1128 px de conteúdo (mínimo de
  190 px por coluna); sem o sumário, a medida de hoje (mínimo de 230 px). No
  celular, duas colunas.
- O nome do produto passa a ser h4 no catálogo (h1 página, h2 categoria, h3
  linha, h4 produto). O `CardProduto` ganha o nível do título como prop; a
  vitrine da home continua em h3.
- Capítulo ou linha sem resultado pelo filtro some inteiro.
- Link da própria página para algo que o filtro escondeu (um produto, uma
  linha ou uma categoria; vindo do sumário, da gaveta ou do rodapé): o
  filtro sai antes da rolagem e o alvo volta ao lugar. É a regra que o
  `CatalogoPagina` já aplica ao sabor escondido chamado pela gaveta
  (`tests/gaveta-sabor.test.tsx`), estendida às âncoras de linha e de
  categoria. Assim nenhum link fica morto.
- Os cards continuam sem clique: não há página de produto.

### 6.6 Fecho

O bloco expresso com "AMO por você. Por seu AMO." (`FaixaCobre`), como hoje,
agora sem o rótulo antes dele.

## 7. Movimento

Só os três verbos da casa, dentro dos limites que `tests/movimento.test.ts`
guarda (só `transform`, `opacity`, `clip-path` e `stroke-dashoffset`; nada
em loop; nada acima de 2 s; tudo atrás de `html.js` e de
`prefers-reduced-motion: no-preference`).

| o quê | como |
|---|---|
| o coração do sumário | desliza pelo fio até o item atual: `transform`, 0.5 s, curva da casa |
| o título do topo | o script se escreve, como hoje |
| o h2 de cada capítulo | aparece (opacidade e 10 px de subida) ao entrar na tela |
| as fotos da grade | a entrada de hoje |
| o filtro | o FLIP de hoje; capítulos sem resultado saem sem animação |
| toque num item do sumário | a rolagem suave de hoje; o foco vai para o título do capítulo |
| a fileira do celular | rola de lado até a etiqueta atual (`scrollTo` com `behavior: smooth`; instantâneo com movimento reduzido) |

Com movimento reduzido o coração troca de lugar sem deslizar. Sem JavaScript
não há coração nem item atual, e os links do sumário são âncoras comuns.

## 8. Acessibilidade

- Um h1; nenhum nível pulado em nenhuma combinação de cadastro (uma
  categoria com uma linha, uma com várias, várias categorias).
- O sumário é um `<nav>` com nome; o item atual tem `aria-current` (a
  linha leva `location` e a categoria dela `true`, para o celular, onde as
  linhas não aparecem); o item sem resultado continua link (§6.4).
- Alvos de 44 px no celular; foco visível em tudo; o efeito de mouse se
  repete em `:focus-visible` e mora em `@media (hover: hover)`.
- Só pares de cor já medidos em `DESIGN.md`. O topo deixa de ser superfície
  escura.
- Filtros com `aria-pressed` e região viva, como hoje.

## 9. Arquitetura

**`src/lib/catalogo.ts`:** tipo `Categoria`, `Linha.categoria`,
`Catalogo.categorias`, as validações da §4. **`src/data/categorias.ts`**
(novo) e `src/data/linhas.ts` (a linha ganha `categoria: 'doces'`).

**`src/lib/visao.ts`:**

- `categoriasComProduto(c)`.
- `caminhoDaCategoria`, `caminhoDaLinha` (âncoras da §5).
- `montarCatalogo(c)` sem o parâmetro de linha. A `VistaCatalogo` passa a
  ter: `titulo`, `lead`, `contagem`, `capitulos` (categoria com as linhas
  dela, cada linha com `slug`, `nome`, `regra` e os produtos por ordem),
  `sumario` (os itens da §6.4; vazio quando não aparece), `vontades`,
  `selos`, `tipos` e `nomesDosSelos`. Saem `linha`, `capas`, `itensLinha` e
  `grupos`.
- Saem `descricaoDaLinha`, `TITULO_TUDO` e `LEAD_TUDO` como estão; o título
  e o lead viram parte de `montarCatalogo`.

**Componentes:**

- `CatalogoPagina.tsx` (cliente): filtros, capítulos, estado vazio; perde a
  coluna de linhas e o bloco do rótulo.
- `Sumario.tsx` (novo, cliente): a coluna e a fileira do celular, o item
  atual pela rolagem e o coração. Um componente, duas formas por CSS.
- `TopoCatalogo.tsx`: o topo creme da §6.2, sem capas.
- `TelaCatalogo.tsx`, `Nav.tsx`, `Gaveta.tsx`: os ajustes da §5.
- `CardProduto.tsx`: o nível do título.
- `src/app/catalogo/[linha]/` sai.
- `catalogo.css` e `movimento.css`: saem as regras das capas, da coluna de
  linhas e do rótulo da linha; entram as do topo creme, do sumário e dos
  capítulos.
- **A página 404 não muda.** Ela continua com o topo expresso e usa hoje as
  classes `topo-catalogo`; as regras de que ela depende ficam (com ela), e
  o topo creme do catálogo ganha as suas. Os testes que citam essas classes
  seguem valendo para a 404.

Antes de escrever código, ler em `node_modules/next/dist/docs/` o que tocar
em rota e metadados (`AGENTS.md`).

## 10. Testes

Vitest, Testing Library, jsdom e vitest-axe, como hoje. A fixture mista
ganha categorias: `doces` (bolos no pote e bolos inteiros) e `salgados` (a
linha de salgados).

- **Cadastro:** as validações novas; cada linha do cadastro real tem
  categoria.
- **Visão:** `montarCatalogo` com o cadastro real (um capítulo, sumário
  vazio) e com a fixture (dois capítulos, três linhas, sumário com
  contagens); vontades e selos da vista; os endereços da §5;
  `categoriasComProduto`.
- **Página:** as invariantes de hoje em `/catalogo` (um h1, nenhum nível
  pulado, alt e dimensões, âncoras válidas, exatamente uma imagem
  pré-carregada, sem preço, sem travessão, AMO em `translate="no"`, ids
  únicos, axe); o sumário só aparece com a fixture; o item atual muda com a
  rolagem (observador simulado); filtro que esvazia um capítulo o esconde, e
  o item dele no sumário continua link e limpa o filtro; "O rótulo da linha" não existe mais na página; os
  testes de filtro e de `?vontade=` de hoje seguem passando.
- **Rotas:** `/catalogo/[linha]` não existe; gaveta, vitrine, final e
  rodapé apontam para as âncoras novas.
- **Movimento e estilo:** as regras novas dentro dos limites de
  `tests/movimento.test.ts` e `tests/estilos.test.ts`.

**Conferência visual** (Edge headless): `/catalogo` real e com a fixture, a
1440 e a 390 px, parado no topo e no meio da rolagem; comparar a primeira
tela com o esboço.

## 11. Decisões minhas, para o cliente conferir

1. **Categoria acima da linha.** Doces contém "Bolos no pote", e a regra
   ("Zero açúcar") continua sendo da linha.
2. **Categoria sem produto não aparece.** Até a lista chegar, o catálogo
   real mostra um capítulo (Doces) e nenhum índice. O índice é conferido com
   o cadastro de teste. Alternativa, se o cliente preferir: mostrar Salgados
   e Refeições como "em breve".
3. **Uma página só.** As páginas por linha saem e viram âncoras.
4. **Topo creme, sem foto**, como no esboço escolhido. O `DESIGN.md` hoje
   diz que o topo do catálogo é expresso; ele é atualizado no fim.
5. **Os cards não abrem nada.** Se a lista trouxer descrição, ingredientes
   ou peso por produto, isso é um passo seguinte.
6. **A gaveta fica como está**, só com os endereços novos.
7. **Link para algo escondido pelo filtro limpa o filtro**, em vez de ficar
   desligado.
8. **A página 404 continua com o topo escuro.**

## 12. O que fica para quem constrói

Medidas finas do sumário e do topo, o jeito de observar a rolagem
(`IntersectionObserver` ou medida por quadro), os nomes das classes, a
quebra exata em que o topo da linha desce para baixo do h2, e o texto da
descrição da página.

## 13. Critério de pronto

1. `/catalogo` renderiza com o cadastro real, sem o rótulo da linha, com um
   capítulo e sem sumário; `/catalogo/bolos-no-pote` dá 404.
2. Com a fixture: dois capítulos, três linhas, o sumário ao lado, o coração
   acompanhando a rolagem e a fileira no celular, sem mudar componente.
3. De 320 a 2560 px, sem rolagem horizontal da página.
4. Movimento reduzido e sem JavaScript: tudo utilizável, nenhum link morto.
5. Teclado alcança tudo; axe sem violação; `npm test`, `npm run lint`,
   `npx tsc --noEmit` e `npm run build` limpos.
6. Conferência visual a 1440 e a 390 px contra o esboço.
7. `PRODUCT.md` (contexto de operação) e `DESIGN.md` atualizados com o que
   foi construído.
