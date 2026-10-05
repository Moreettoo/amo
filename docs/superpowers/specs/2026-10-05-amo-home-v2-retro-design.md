# AMO · Home v2 "Retrô doce" · Design Spec

**Data:** 2026-10-05
**Status:** aprovado em conversa, aguardando revisão desta spec
**Substitui:** a home da v1/v1.1 (`2026-08-22-amo-home-design.md`). Os fatos de
marca da §2 daquela spec continuam valendo e não são repetidos aqui.
**Referência visual:** o protótipo aprovado,
[`assets/2026-10-05-prototipo-retro-doce.html`](assets/2026-10-05-prototipo-retro-doce.html).
Ele é um HTML único com CSS e JS inline; os caminhos `/files/*.jpg` dele
correspondem às fotos de `public/`. Quando esta spec e o protótipo divergirem,
vale esta spec (as divergências são de propósito e estão na §13).

---

## 1. O pedido

Palavras do cliente, em ordem:

- a página inicial está simples demais e a paleta não agrada, **o verde sage**
  principalmente;
- mais moderna, mais fácil de ler, fontes melhores;
- autenticidade: **nada com cara de template**;
- flexível, porque vão entrar outros tipos de bolo e salgados, em formatos
  variados, e tudo continua **sempre saudável**;
- animações e hovers;
- manter o efeito de rolagem de hoje (Lenis, parallax das fotos, seção pinada
  dirigida pela rolagem);
- produto com o nome do produto ("Prestígio", "Ninho com frutas vermelhas"),
  nunca o nome poético ("Aconchego");
- a seção pinada passa a escolher **pela vontade**;
- um botão de cardápio só na nav.

**Sucesso:** a página nova, com os 7 potes de hoje, parece pronta e completa; e
quando entrar um salgado ou um bolo inteiro, basta cadastrar, sem mexer em
componente.

---

## 2. Direção visual: retrô doce

Confeitaria de bairro, rótulo de papel e pote de vidro. Tudo tirado da
embalagem: as camadas do bolo vistas pelo vidro viram os divisores, o formato da
embalagem vira a moldura da foto, o rótulo vira cartão.

### 2.1 Paleta (tokens)

Doze tokens, em `@theme` no `globals.css`, como `--color-<nome>`. Somem os
tokens da v1 (cream, sage, sand, ink, rosewood, rosewood-forte, blush) e o
`papel` muda de `#FFFDFA` para `#FFFBF5`. A família `--font-script` sai;
`--font-display` e `--font-sans` passam a apontar para Caprasimo e DM Sans.

| token | hex | papel |
|---|---|---|
| `expresso` | `#2B1B16` | superfície escura (hero, rótulos, final) e a cor do texto |
| `chocolate` | `#4A2E25` | fundo das molduras, sombra deslocada, texto no caramelo |
| `cobre` | `#C9784A` | destaque: faixa, selo, "comer bem.", sombras, sublinhados |
| `cobre-texto` | `#9A5530` | o cobre que pode ser texto em fundo claro |
| `caramelo` | `#E2BF96` | superfície do "Hoje o dia pede", pílula do hero |
| `creme` | `#FAF2E9` | superfície clara padrão, nav |
| `papel` | `#FFFBF5` | etiqueta, rótulo branco |
| `linho` | `#F6EBDD` | rótulo de linha, variação |
| `kraft` | `#D9BE98` | carimbo, rótulo de linha, variação |
| `suave` | `#5E4A40` | texto corrido |
| `claro-suave` | `#EADDD0` | texto corrido no escuro |
| `vinho` | `#8E2F3C` | fita do bolo inteiro, faixa do rótulo, coração |

O `#6E3E22` que aparece no protótipo não vira token: sai, trocado por
`chocolate` (§9.2).

### 2.2 Tipografia

- **Caprasimo** (peso único, 400): h1, h2, h3, a palavra do "Hoje o dia pede",
  etiqueta, fita, carimbo, selo, faixa cobre.
- **DM Sans** (variável, eixo `opsz` 9..40, pesos 400 a 700): todo o resto.
- Ambas por `next/font/google`. Saem Bree Serif, Parisienne e Poppins. Nenhuma
  fonte script no texto; o script mora só no logo.
- Texto corrido em 18 px / 1.65, lead do hero entre 17.5 e 20 px, frase do
  "Hoje o dia pede" 19 px. Rótulos de seção em 15 px peso 700, **frase
  normal, sem caixa alta espaçada**.
- `text-wrap: balance` nos títulos, `pretty` nos parágrafos.

### 2.3 Estratos

Divisor ondulado entre seções, de uma a três camadas, como as camadas do bolo
pelo vidro. SVG com `preserveAspectRatio="none"`, 64 px de altura, decorativo
(`aria-hidden`). Os caminhos estão no protótipo.

| entre | fundo | camadas, de trás pra frente |
|---|---|---|
| hero → cardápio | expresso | cobre, caramelo, creme |
| cardápio → hoje o dia pede | creme | caramelo |
| hoje o dia pede → rótulos | caramelo | expresso |
| rótulos → a marca | expresso | creme |

### 2.4 Moldura por formato

O formato do produto decide a moldura da foto e o acessório com o nome. O
acessório repete o h3 e é `aria-hidden`.

| formato | moldura | acessório |
|---|---|---|
| `pote` | arco: `999px 999px 22px 22px`, 280 px de altura | etiqueta oval em `papel`, girada −8°, nome em Caprasimo e ♥ vinho. Nome com mais de 11 caracteres usa o corpo menor |
| `inteiro` | círculo de 250 px | fita `vinho` com o nome, girada −3° |
| `unidade` | quadrado com raio 28 px | carimbo `kraft` com o nome, girado −6° |
| qualquer outro | quadrado com raio 16 px | nenhum |

Até 520 px de largura: moldura de 210 px, círculo de 150 px, acessórios
menores (valores no protótipo).

### 2.5 Grão

Textura de ruído em SVG inline (data URI, opacidade 7%) sobre o cardápio, a
marca e o rodapé. Valor exato no protótipo, classe `.grao`.

---

## 3. O cadastro

O catálogo sai de "7 sabores fixos" para quatro listas em `src/data/`, no
formato das tabelas que o Supabase vai receber. Nenhum componente importa
essas listas direto: tudo passa por `carregarCatalogo()`.

### 3.1 Tipos (`src/lib/catalogo.ts`)

```ts
type Selo = { id: string; nome: string }

type Vontade = { slug: string; palavra: string; ordem: number }

type Linha = {
  slug: string
  nome: string            // plural, para filtro e rótulo: "Bolos no pote"
  tipo: string            // singular, acima do nome no card: "Bolo no pote"
  regra: string           // a regra saudável da linha: "Zero açúcar"
  selos: string[]         // ids de Selo, na ordem do rótulo
  frase?: string          // faixa do rótulo, sem o ♥ (o ♥ é decoração)
  modoDeAproveitar?: { titulo: string; passos: string[] }
  corDoRotulo: 'papel' | 'linho' | 'kraft'
  ordem: number
}

type Produto = {
  slug: string
  nome: string            // o nome do produto, nunca nome poético
  linha: string           // slug de Linha
  formato: 'pote' | 'inteiro' | 'unidade' | (string & {})
  frase?: string
  imagem: { src: string; alt: string; largura: number; altura: number }
  selos: string[]         // ids de Selo
  vontades: string[]      // slugs de Vontade
  destaque?: boolean
  ordem: number
}

type Catalogo = { linhas: Linha[]; produtos: Produto[]; selos: Selo[]; vontades: Vontade[] }
```

`corTampa`, `sabor` e o nome poético saem do modelo.

### 3.2 Carregar e validar

- `carregarCatalogo(): Promise<Catalogo>` lê as listas de `src/data/`. É
  assíncrona desde já para o Supabase entrar trocando só ela.
- `validarCatalogo(c): string[]` devolve a lista de problemas, vazia quando
  está tudo certo. `carregarCatalogo()` chama a validação e lança erro se
  houver problema, então um cadastro ruim derruba o build em vez de chegar à
  página.
- A validação recusa:
  - slug repetido em qualquer lista;
  - produto com linha, selo ou vontade que não existem;
  - linha com selo que não existe;
  - produto sem `imagem.src` começando em `/`, sem `alt`, ou com
    largura ou altura menor ou igual a zero;
  - mais de um produto com `destaque`;
  - catálogo sem produto;
  - catálogo sem nenhum produto com vontade (o Hoje o dia pede ficaria vazio
    e os links para `#hoje` ficariam mortos).
- Sem foto não há produto: um item novo só entra no cadastro quando tiver foto.

### 3.3 Os dados de hoje

**Linha** (`src/data/linhas.ts`), uma só:

| campo | valor |
|---|---|
| slug | `pote` |
| nome / tipo | Bolos no pote / Bolo no pote |
| regra | Zero açúcar |
| selos | adocante, vapor, fibras, vidro, ingredientes, artesanal |
| frase | Um abraço em forma de sobremesa |
| modoDeAproveitar | "Como aproveitar seu AMO": Abra com amor · Pegue sua colher · A saboreie sem culpa · Cuide do pote de vidro |
| corDoRotulo | papel |

O ritual deixa de ser seção e passa a viver dentro do rótulo da linha. Saem
`src/data/ritual.ts` e `src/data/sabores.ts`.

**Selos** (`src/data/selos.ts`): os 6 de hoje com os mesmos ids
(`ingredientes`, `vapor`, `vidro`, `fibras`, `adocante`, `artesanal`) mais
`zero-acucar` ("Zero açúcar"). O `id` passa a ser `string`. Os ícones ficam em
`components/icons/selos.tsx`, indexados pelo id; selo sem ícone desenhado usa
um ícone genérico (círculo).

**Vontades** (`src/data/vontades.ts`), na ordem da seção: Chocolate (`chocolate`),
Fruta (`fruta`), Coco (`coco`), Um clássico (`classico`), Algo salgado (`salgado`).

**Produtos** (`src/data/produtos.ts`). As fotos mudam de
`public/sabores/<nome-poético>-<sabor>.webp` para
`public/produtos/<slug>.webp`. Todos: linha `pote`, formato `pote`, selos
`zero-acucar` e `fibras`.

| ordem | slug | nome | vontades | foto (l × a) |
|---|---|---|---|---|
| 1 | `prestigio` | Prestígio (**destaque**) | chocolate, coco, classico | 666 × 1000 |
| 2 | `pacoca` | Paçoca | classico | 714 × 1000 |
| 3 | `mousse-de-maracuja` | Mousse de maracujá | fruta | 800 × 951 |
| 4 | `ninho-com-frutas-vermelhas` | Ninho com frutas vermelhas | fruta | 750 × 1000 |
| 5 | `beijinho` | Beijinho | coco, classico | 666 × 1000 |
| 6 | `chocolate` | Chocolate | chocolate | 750 × 1000 |
| 7 | `frutas-amarelas` | Frutas amarelas | fruta | 750 × 1000 |

As frases continuam as das etiquetas (tabela da §3 da spec v1). "Encontro"
estava cadastrado como "Frutinho com Frutas Vermelhas"; o nome certo é
**Ninho com frutas vermelhas**.

Os `alt` perdem o nome poético e mantêm a descrição da foto:

| slug | alt |
|---|---|
| prestigio | Pote de vidro com bolo de prestígio, coberto de coco ralado, ao lado de pedaços de chocolate e coco fresco |
| pacoca | Pote de vidro com bolo de paçoca, com amendoins inteiros por cima, ao lado de cubos de paçoca |
| mousse-de-maracuja | Pote de vidro com mousse de maracujá, com sementes de maracujá na cobertura, ao lado de maracujás cortados |
| ninho-com-frutas-vermelhas | Pote de vidro com bolo de ninho com frutas vermelhas, com calda vermelha por cima, ao lado de framboesas e amoras |
| beijinho | Pote de vidro com bolo de beijinho, com coco ralado na cobertura, ao lado de doces de beijinho em prato branco |
| chocolate | Pote de vidro com bolo de chocolate, com raspas de chocolate por cima, ao lado de barras de chocolate meio amargo |
| frutas-amarelas | Pote de vidro com bolo de frutas amarelas, com calda de maracujá na cobertura, ao lado de manga cortada em cubos |

Os produtos de exemplo do protótipo (Torta de frango, Quiche de alho-poró,
Cenoura com cacau, Chocolate com morango) não entram. Eles viram fixture de
teste (§11).

---

## 4. A visão: a página se adapta ao catálogo

`montarVisao(catalogo)` em `src/lib/visao.ts` é uma função pura que decide o
que aparece. Ela roda no servidor e entrega dados serializáveis aos
componentes. Regras:

| o quê | regra | hoje |
|---|---|---|
| destaque | o produto com `destaque`; sem nenhum, o primeiro por `ordem` | Prestígio |
| palco do hero | o destaque no meio e até 2 outros nas laterais (o primeiro à esquerda), escolhidos por `ordem` entre os que não são o destaque, preferindo linha ou formato diferente do destaque | da esquerda para a direita: Paçoca, Prestígio, Mousse de maracujá |
| filtros de linha | só aparecem com 2 ou mais linhas com produto | não aparecem |
| filtros de selo | só os selos que alguns produtos têm e outros não | não aparecem |
| vontades | só as que têm pelo menos 1 produto, na ordem do cadastro; produtos de cada uma por `ordem` | Chocolate 2, Fruta 3, Coco 2, Um clássico 3 (Algo salgado some) |
| rótulos | um por linha com produto, na ordem das linhas | 1 |
| linhas no final | só com 2 ou mais linhas | não aparecem |

Quando entrar uma segunda linha ou um selo que só parte dos produtos tem, os
filtros voltam sozinhos.

Funções puras ao lado, para o cliente usar:

- `filtrar(produtos, { linha, selo, vontade })`: combina as três com E;
  `null` em qualquer uma não filtra aquela dimensão.
- `src/lib/vontade.ts`:
  - `indicePorProgresso(p, n)`: `min(n − 1, floor(clamp(p, 0, 0.9999) · n))`;
  - `posicaoDoIndice(i, n, topo, curso)`: `topo + curso · (i + 0.5) / n`;
  - `listarNomes(nomes)`: "A", "A e B", "A, B e C";
  - `corpoDaPalavra(n)`: `min(min(112, round(1000 / n)) px, 86 / (n · 0.62) vw)`.

---

## 5. A página, seção por seção

Ordem: Nav · Hero · estrato · Cardápio · estrato · Hoje o dia pede · estrato ·
Rótulos · estrato · A marca · Faixa cobre · Final · Rodapé.

Ids de âncora: `#topo` (hero), `#cardapio`, `#hoje`, `#rotulos`, `#marca`. O
`<main id="conteudo">` continua sendo o alvo do "Pular para o conteúdo".

Textos marcados com **(P)** são redação minha e dependem do aval do cliente
(§14). Todo "AMO" renderizado como texto fica dentro de `translate="no"`.

### 5.1 Nav

- Pílula `creme`, flutuando a 12 px do topo, 64 px de altura, por cima do hero
  (o mesmo esquema de hoje: invólucro `sticky` com margem negativa e
  `pointer-events` só nos filhos). Opaca desde o primeiro pixel; ao passar de
  40 px de rolagem ganha sombra, nada mais muda.
- Logo curto (`logo-amo.png`) com link para `#topo`.
- Links: Hoje o dia pede (`#hoje`) · O que é saudável (`#rotulos`) · A marca
  (`#marca`), com o sublinhado desenhado à mão no hover.
- Um botão só: **Ver cardápio** (`#cardapio`), botão retrô escuro.
- Abaixo de 820 px os links vão para o menu de celular de hoje, com o mesmo
  comportamento: botão com `aria-expanded`, Esc fecha e devolve o foco,
  clicar num link fecha e devolve o foco.
- O deslocamento da âncora passa a ser 96 px (12 + 64 + 20 de folga): um
  número só, usado no `RolagemSuave` e no `scroll-mt-24` das seções.
- `themeColor` vira `#2B1B16`.

### 5.2 Hero, `expresso`, `#topo`

- Pílula `caramelo`: "Sabores saudáveis".
- h1 em três linhas: "Para quem" / "ama comer" / "bem.", com "comer bem." em
  `cobre`.
- Lead **(P)**: "Receitas em versão saudável. Cada uma diz no rótulo o que tem
  e o que não tem."
- Ações: botão retrô "Ver o cardápio" (`#cardapio`) e link sublinhado
  "Escolher pela vontade" **(P)** (`#hoje`).
- Palco: as 3 fotos da visão (§4), cada uma na moldura do seu formato, a do
  meio maior; parallax nas fotos. A foto do destaque é **a única imagem da
  página com `preload`**; as laterais usam `loading="eager"` sem preload.
- Selo carimbo `cobre`, girado −10°, por cima do palco: a `regra` da linha do
  destaque ("Zero açúcar").

### 5.3 Cardápio, `creme` com grão, `#cardapio`

- Rótulo "O cardápio", h2 "Escolha pelo sabor" **(P)**.
- Parágrafo **(P)** "Filtre pela linha ou pelo que importa pra você.", só
  quando há filtro visível. Sem filtro, o topo é só o título.
- Grupo de filtros (`role="group"`, `aria-label="Filtrar o cardápio"`), na
  ordem:
  1. "Tudo" e uma pílula por linha, cada uma com a contagem total da linha.
     Escolha única, com `aria-pressed`.
  2. Um separador.
  3. Uma pílula tracejada `cobre` por selo, que liga e desliga, com
     `aria-pressed`.
  4. A pílula "Vontade: chocolate ✕", só com vontade ativa, com
     `aria-label="Tirar o filtro de vontade: chocolate"`.
  O grupo some inteiro quando não há nada nele.
- Uma região `aria-live="polite"` só para leitor de tela: "Mostrando 3 de 7
  receitas."
- Grade `auto-fill, minmax(230px, 1fr)`, 56 × 26 px de vão; até 520 px, duas
  colunas com 40 × 14.
- Card (`<article>`):
  - a moldura do formato com a foto (`next/image`, lazy, `sizes` de acordo
    com a grade);
  - os selos do produto em pílulas `papel` sobre a foto, texto `chocolate`.
    Com mouse, aparecem no hover; no toque, ficam sempre visíveis;
  - o acessório do formato;
  - o tipo da linha em `cobre-texto`, o h3 com o nome e a frase opcional.
- Estado vazio: "Nenhuma receita com esse filtro ainda." **(P)** e um botão
  "Ver todas", que limpa os três filtros.
- Como os filtros mudam:
  - pílula de linha: troca a linha e mantém selo e vontade;
  - pílula de selo: liga e desliga o selo e mantém o resto;
  - ✕ da vontade: tira só a vontade;
  - link de linha do Final e do Rodapé: escolhe a linha e limpa selo e
    vontade;
  - "Ver no cardápio" do Hoje o dia pede: escolhe a vontade e limpa linha e
    selo.

### 5.4 Hoje o dia pede, `caramelo`, `#hoje`

Seção pinada: um trilho com altura de `100svh + n · 55svh` (n = vontades
visíveis; hoje, 4) e, dentro dele, um painel `sticky` de `100svh` (mínimo
620 px). O progresso da rolagem no trilho escolhe a vontade pelo
`indicePorProgresso`. O pino só vale com janela de 700 px de altura ou mais:
abaixo disso o conteúdo não cabe em `100svh` e seria cortado, então a seção
fica com altura normal e as abas só trocam o conteúdo.

- Coluna do texto:
  - rótulo "Não sabe o que escolher?" **(P)** e h2 "Hoje o dia pede";
  - a palavra grande da vontade com ponto final ("Chocolate."), em
    Caprasimo, no corpo do `corpoDaPalavra`, com o sublinhado `cobre`
    desenhado à mão;
  - a frase: "**2 opções:** Prestígio e Chocolate." (com 1 produto, "1
    opção");
  - a pílula-link "Ver as 2 no cardápio" (com 1 produto, "Ver no cardápio"),
    para `#cardapio`, aplicando o filtro de vontade;
  - as abas das vontades, cada uma com a contagem;
  - o progresso: "1 / 4", barra e "role pra trocar". **Só aparece com a
    seção pinada.**
- Coluna da foto:
  - a foto do primeiro produto da vontade na moldura de arco, com sombra
    deslocada `chocolate`;
  - a etiqueta com o nome e o tipo da linha;
  - uma pilha decorativa com as fotos dos 2 seguintes (`aria-hidden`,
    `alt=""`).
  - No celular, a foto vem antes do texto, menor.
- Abas (`role="tablist"`, `aria-label="Vontades"`):
  - cada pílula é um `tab` com `aria-selected` e `aria-controls`;
  - tabindex roving; setas, Home e End mudam a seleção, que segue o foco;
  - o conteúdo é o `tabpanel`;
  - com a seção pinada, escolher uma aba rola até o trecho dela
    (`posicaoDoIndice`) pelo Lenis. Durante essa rolagem a seleção fica
    travada no destino, para a palavra não passar pelas vontades do meio;
  - sem pino, escolher uma aba só troca o conteúdo.
- A palavra é escrita letra por letra só no visual (`aria-hidden`). Ao lado,
  em texto só para leitor de tela, vai a palavra inteira.

### 5.5 Rótulos, `expresso`, `#rotulos`

- Rótulo "Sabores saudáveis". O h2 depende da quantidade de linhas:
  - 2 ou mais: "Cada linha tem a sua regra. Todas estão no rótulo." **(P)**;
  - uma só: "O que é saudável aqui está no rótulo." **(P)**.
- Um cartão de papel por linha, na cor `corDoRotulo` e levemente girado
  (−2°, 1.4°, −1°, repetindo):
  - h3 com o nome da linha e a regra;
  - a lista de selos com ícone, separada por tracejado;
  - o "Como aproveitar seu AMO" numerado, quando houver;
  - a faixa com a frase e ♥. A faixa é `vinho` no papel, `chocolate` no
    linho e `expresso` no kraft.
- Com 2 ou mais linhas: grade `auto-fit, minmax(260px, 1fr)`.
- Com uma linha só, o cartão fica largo (até 760 px) e, a partir de 820 px,
  se divide em duas colunas: selos de um lado, modo de aproveitar do outro.

### 5.6 A marca, `creme` com grão, `#marca`

- Foto em arco com parallax e sombra deslocada `cobre` no hover. A foto é a
  do produto `beijinho`, ou a do destaque se ele sair do catálogo.
- Rótulo "A marca", h2 "Comer bem não devia cobrar nada depois" **(P)**.
- Parágrafo **(P)**: "AMO nasceu de uma ideia simples: o que é gostoso não
  precisa pesar depois. Cada receita é feita na versão saudável, e o rótulo
  diz o que tem e o que não tem. Nos bolos no pote, por exemplo: montados à
  mão, cozidos a vapor e adoçados com eritritol e stevia. Açúcar, nenhum."

### 5.7 Faixa cobre

`cobre`, texto `expresso` em Caprasimo, 28 a 46 px: "AMO por você. Por seu
AMO. ♥"

### 5.8 Final, `expresso`

- h2 "Escolha o seu AMO." **(P)**, subtítulo **(P)** "Cada receita tem a sua
  versão saudável."
- Pílulas claras de linha (só com 2 ou mais linhas) e o botão retrô "Ver o
  cardápio".

### 5.9 Rodapé, `creme` com grão

- Quatro colunas (duas no celular):
  - o logo completo (`logo-amo-lockup.png`);
  - **Linhas**: uma por linha, com link para `#cardapio`. O link só aplica o
    filtro de linha quando os filtros de linha estão visíveis;
  - **A marca**: A marca · O que é saudável aqui · Hoje o dia pede;
  - **Contato**: os placeholders de hoje, como texto e não como link, e o
    aviso de contato provisório.
- Embaixo: "© 2026 AMO Sabores Saudáveis".

---

## 6. Movimento

### 6.1 As animações

| # | o quê | gatilho | como |
|---|---|---|---|
| 1 | entrada do hero | carregar a página | pílula aparece (0.5 s); as linhas do h1 sobem de dentro de uma máscara (0.8 s, atrasos 0.1 / 0.2 / 0.3 s); lead e ações aparecem (0.45 e 0.55 s); os arcos brotam de baixo com mola (0.95 s, atrasos 0.6 / 0.68 / 0.76 s); o selo carimba (0.5 s, atraso 1.25 s) |
| 2 | camadas assentam | o estrato entra na tela | cada camada sobe de 100% com mola (1 s, atrasos de 0.12 s) |
| 3 | o pote enche | o card entra na tela; a vontade troca | `clip-path` em polígono ondulado subindo de baixo (1.3 s) |
| 4 | a palavra troca | a vontade troca | as letras velhas caem e somem (0.22 s, 12 ms entre letras); as novas sobem com mola (0.55 s, 28 ms entre letras); o sublinhado se redesenha (`stroke-dashoffset`, 0.6 s, atraso 0.25 s); a pilha reaparece (0.45 s) |
| 5 | o cardápio se reorganiza | um filtro muda | FLIP: quem fica desliza para a nova posição (0.56 s); quem entra cresce de 0.85 (0.42 s) |
| 6 | os rótulos pousam | a mesa entra na tela | cada cartão cai de −110 px girado e assenta com mola (0.85 s, atrasos de 0.1 s) |
| 7 | aperto | `:active` no botão retrô | o botão afunda na própria sombra |

Mais o que já existe: parallax nas fotos em arco (y de −4% a 4%, escala 1.1) e
a sombra da nav ao rolar. A etiqueta balançando, que esteve no protótipo de
animações, foi recusada: a etiqueta é estática.

Curvas: `--ease: cubic-bezier(.16,1,.3,1)` e `--mola:
cubic-bezier(.34,1.4,.64,1)`.

### 6.2 Regras

- Nada em loop. Nenhuma animação passa de 2 s somando atraso e duração.
- Só animam `transform`, `opacity`, `clip-path` e `stroke-dashoffset`.
- **Estado escondido só dentro de `html.js` e de
  `@media (prefers-reduced-motion: no-preference)`.** Um script inline no
  `<head>` põe a classe `js` no `<html>` antes da primeira pintura, no padrão
  do guia do Next 16 `preventing-flash-before-hydration.md` (o componente
  `InlineScript` e `suppressHydrationWarning` no `<html>`). Sem JavaScript ou
  com movimento reduzido, tudo nasce no estado final. Isso remove a causa do
  hero em branco da v1.1: o `whileInView` do Motion deixava `opacity: 0`
  inline no HTML do servidor.
- Nenhum elemento sai do servidor com estado inicial escondido inline:
  nenhum `opacity: 0`, `visibility: hidden` ou `clip-path` no atributo
  `style`, e nenhum `transform` diferente de `none` fora dos invólucros de
  parallax (marcados com `data-parallax`, cujo `transform` é o deslocamento
  de rolagem e não esconde nada). O `opacity: 1; transform: none` que o
  Motion grava nos cards do cardápio é o estado final e é aceito.
- As animações 1, 2, 3, 4, 6 e 7 são CSS (keyframes e estados iniciais em
  `src/app/estilos/movimento.css`; o aperto, junto dos hovers, nos arquivos
  de cada parte em `src/app/estilos/`).
  A entrada do hero começa sozinha ao carregar, sem classe disparada por JS.
  As que dependem de entrar na tela usam o hook `useNaTela`, um
  IntersectionObserver (margem inferior de −12%) que só adiciona a classe
  `play` e desliga depois da primeira vez.
- A 5 e o parallax usam Motion (`layout` com `AnimatePresence
  mode="popLayout" initial={false}`; `useScroll`), dentro de
  `MotionConfig reducedMotion="user"`.
- Movimento reduzido: tudo estático e no estado final; o Lenis desligado (como
  hoje); o "Hoje o dia pede" deixa de ser pinado e vira abas comuns; sem
  parallax; a troca de palavra e de foto é instantânea.
- Sem JavaScript: sem pino; aparece a primeira vontade e o link para o
  cardápio; abas, filtros e região viva escondidos (classe `so-js`), para não
  haver botão que não faz nada.

### 6.3 Rolagem

- O `RolagemSuave` fica, com a mesma configuração do Lenis e a mesma condução
  de âncora e foco.
- Ele passa a ser um provider: `useRolagem()` devolve
  `rolarPara(alvo, { aoTerminar })`, que usa o Lenis quando ele existe e o
  scroll nativo quando não (movimento reduzido).
- O Motion lê o scroll real da janela, que o Lenis continua movendo, então o
  `useScroll` do pino e do parallax segue funcionando.

---

## 7. Hovers

Regras:

- Efeito de mouse só dentro de `@media (hover: hover)`.
- Todo efeito de elemento focável vale também em `:focus-visible`.
- `cursor: pointer` só no que é clicável. Card, cartão de rótulo, foto em arco
  e selo têm hover decorativo e cursor normal.

| peça | efeito |
|---|---|
| link da nav e link sublinhado | o sublinhado à mão se desenha (`stroke-dashoffset` de 1.1 a 0, 0.38 s; `pathLength=1`, `stroke-dasharray="1 2"`, para não sobrar um ponto) |
| botão retrô | desce 2 px, a sombra `cobre` encolhe de 5 para 3 px e um ♥ entra com mola; no `:active`, afunda inteiro |
| pílula | enche de baixo para cima com borda arredondada que se endireita (0.42 s) |
| card | sobe 6 px; a moldura ganha sombra deslocada `caramelo`; a foto aproxima 6%; os selos sobem por cima da foto |
| cartão de rótulo | desgira, sobe 12 px e cresce 3% |
| foto em arco | desloca −5 px e revela a sombra `cobre` de 10 px; a foto aproxima 7% |
| selo carimbo | recarimba (0.45 s) e o anel tracejado gira 120° |
| link do rodapé | escurece e um ♥ vinho cresce na frente |

---

## 8. Arquitetura

### 8.1 Servidor e cliente

- `src/app/page.tsx` é um Server Component assíncrono: `await
  carregarCatalogo()`, `montarVisao()`, e passa dados serializáveis às seções.
- `FiltroProvider` (cliente) envolve o `<main>` e o rodapé (o rodapé fica fora
  do `<main>` e também usa o filtro) e guarda `{ linha, selo, vontade }`. `useFiltro()` devolve o estado, `definir(parcial)` e `limpar()`.
  Usam: Cardápio, Hoje o dia pede, Final e Rodapé.
- `RolagemSuave` (cliente) envolve a página no `layout.tsx` e oferece o
  `useRolagem()`.
- São cliente: Nav, Cardápio, Hoje o dia pede, Final (as pílulas), Rodapé
  (os links de linha), FotoParallax, PalavraTroca e quem usa `useNaTela`. O
  resto fica no servidor.

### 8.2 Arquivos

**Novos ou reescritos:**

```
src/data/        linhas.ts · produtos.ts · selos.ts · vontades.ts
src/lib/         catalogo.ts · visao.ts · vontade.ts   (contraste.ts e motion.ts ficam)
src/app/         layout.tsx · page.tsx · globals.css
  estilos/       pecas · produto · hero · cardapio · hoje · rotulos · marca · rodape · movimento (.css)
src/components/  RolagemSuave.tsx · FiltroProvider.tsx · InlineScript.tsx
  layout/        Nav.tsx · Footer.tsx
  sections/      Hero · Cardapio · HojeODiaPede · Rotulos · AMarca · FaixaCobre · Final
  ui/            BotaoRetro · Pilula · LinkSublinhado · Camadas · MolduraProduto ·
                 CardProduto · PapelRotulo · SeloCarimbo · PoteEnche · PalavraTroca ·
                 FotoParallax (fica) · useNaTela
  icons/         selos.tsx (indexado por id, com ícone genérico)
public/produtos/ <slug>.webp   (as 7 fotos, renomeadas)
```

- `globals.css`: tokens, base e o `@import` dos arquivos de `estilos/`.
- `estilos/*.css`, um por parte: as classes com pseudo-elementos e hover,
  porque `::before` com `hover`, `focus-visible` e `@media` juntos ficam
  ilegíveis em utilitários.
- `estilos/movimento.css`: keyframes e estados iniciais escondidos, e mais
  nada.
- Layout e espaçamento seguem em Tailwind.

**Saem:** AnnouncementBar, Selos, Ritual, Sabores, ListaPinada, Bento,
CtaFinal, FaixaAssinatura, Etiqueta, SaborCard, Pill, Estrato, Reveal,
`data/sabores.ts`, `data/ritual.ts`, `public/sabores/`, o `<noscript>` do
layout (o gate por `html.js` o torna desnecessário) e os tokens antigos.

### 8.3 Next 16

Antes de escrever código, ler os guias de `node_modules/next/dist/docs/` que
tocam o trabalho (o AGENTS.md exige):

- `next/font`;
- `next/image` (`preload` no lugar de `priority`);
- Server e Client Components;
- `preventing-flash-before-hydration.md`.

---

## 9. Acessibilidade

### 9.1 Estrutura

- Um h1 só, sem pular nível.
- Cada seção tem `aria-labelledby` apontando para o seu h2.
- Toda âncora aponta para um id existente e tem `scroll-margin-top`, para a
  nav não cobrir o alvo.
- "Pular para o conteúdo" continua.
- Toda imagem tem alt (decorativas com `alt=""`) e dimensões.
- Toque: alvos de pelo menos 44 px nas pílulas e botões no celular.

### 9.2 Contraste (calculado)

Texto, WCAG AA (4.5:1; 3:1 para texto grande):

| texto | fundo | razão | uso |
|---|---|---|---|
| expresso | creme | 14.90 | texto principal |
| expresso | papel | 16.03 | etiqueta, rótulo branco |
| expresso | linho | 14.04 | rótulo linho |
| expresso | kraft | 9.26 | carimbo, rótulo kraft |
| expresso | caramelo | 9.54 | pílula do hero, palavra, abas |
| expresso | cobre | 4.93 | faixa cobre, selo, pílula de selo ativa |
| chocolate | caramelo | 7.10 | rótulo, h2 e frase do Hoje o dia pede |
| chocolate | kraft | 6.89 | regra do rótulo kraft |
| chocolate | papel | 11.92 | selos sobre a foto |
| suave | creme | 7.49 | texto corrido |
| suave | papel | 8.05 | texto do rótulo |
| suave | linho | 7.06 | texto do rótulo linho |
| suave | kraft | 4.65 | modo de aproveitar no kraft |
| cobre-texto | creme | 5.10 | rótulos de seção, tipo no card, pílula de selo |
| cobre-texto | papel | 5.48 | tipo na etiqueta, regra no rótulo branco |
| cobre-texto | linho | 4.80 | regra no rótulo linho |
| creme | expresso | 14.90 | texto no escuro |
| claro-suave | expresso | 12.39 | lead do hero, texto do final |
| caramelo | expresso | 9.54 | rótulo de seção no escuro |
| cobre | expresso | 4.93 | "comer bem." no h1 |
| papel | vinho | 7.77 | fita, faixa do rótulo branco |
| papel | chocolate | 11.92 | faixa do rótulo linho |
| vinho | papel | 7.77 | ♥ da etiqueta |

Proibidos como texto:

- `cobre-texto` sobre `kraft` (3.17): no kraft, a regra vai em `chocolate`;
- `cobre-texto` sobre `caramelo` (3.26);
- `cobre` sobre `creme` (3.02);
- `cobre` sobre `caramelo` (1.93).

O `#6E3E22` do protótipo sai: `chocolate` no kraft e nas pílulas sobre a foto.

### 9.3 Foco

- Anel de 2.5 px com 3 px de afastamento, na cor `--foco`.
- `--foco` é `expresso` nas superfícies claras (creme, papel, linho, kraft,
  caramelo, cobre) e `cobre` nas escuras (expresso). Não é um dos 12 tokens:
  é uma variável semântica que aponta para um deles, redefinida pelas seções
  escuras.
- O `cobre` do protótipo em tudo reprovaria no caramelo (1.93).

### 9.4 Interação

- Pílulas de filtro com `aria-pressed`.
- Abas do Hoje o dia pede com o padrão completo de tablist (§5.4).
- Resultado do filtro anunciado por região viva.
- Menu de celular igual ao de hoje.
- Nenhum botão sem ação e nenhum link vazio.

---

## 10. O que não muda

- Os fatos de marca da spec v1 (§2): claim, assinatura, selos, ritual, frases.
- Lenis com a configuração de hoje e a condução de âncora e foco do
  `RolagemSuave`.
- O FotoParallax.
- O pino dirigido pela rolagem (agora com vontades).
- Sem preço, sem "...", sem travessão nem meia-risca em `src/`, `tests/`,
  `scripts/` e README.
- Nenhuma animação em loop.
- O contato provisório visivelmente falso.

---

## 11. Testes

Vitest + Testing Library + jsdom + vitest-axe, como hoje. IntersectionObserver
e matchMedia simulados no `tests/setup.ts`.

**Continuam, adaptados à v2:**

- um h1, sem pular nível;
- imagem com alt e dimensões;
- âncora válida, com `scroll-margin`;
- sem afordância morta;
- sem preço;
- sem "...";
- axe sem violação;
- `&nbsp;` como U+00A0;
- exatamente uma imagem com `preload`, a do destaque;
- nenhuma animação em loop (DOM e CSS);
- todo "AMO" dentro de `translate="no"`, agora sem exceção;
- travessão;
- logo;
- nav: landmark, links, menu de celular, Esc, foco, opaca com sombra ao rolar;
- rodapé: landmark, placeholders, aviso.

A regra do rosewood vira: `cobre` nunca é cor de texto sobre fundo claro.

**Novos:**

- **Tokens:** os 12 hex exatos; todos os pares da §9.2 passando; os proibidos
  reprovando; o `--foco` com 3:1 ou mais contra cada superfície.
- **Cadastro:**
  - `validarCatalogo` aceita o catálogo real;
  - recusa cada caso da §3.2;
  - Encontro aparece como "Ninho com frutas vermelhas";
  - nenhum nome poético nos nomes nem nos alt.
- **Visão:**
  - com o catálogo real, valem os valores da coluna "hoje" da §4;
  - com uma fixture de catálogo misto (os exemplos do protótipo, com foto
    falsa), voltam os filtros de linha, os de selo, "Algo salgado", três
    rótulos e as linhas no final;
  - o palco prefere linha ou formato diferente;
  - sem destaque, vale o primeiro por ordem.
- **Cardápio:**
  - contagens;
  - linha, selo e vontade combinados;
  - as regras de troca da §5.3;
  - o ✕ da vontade;
  - estado vazio e "Ver todas";
  - `aria-pressed`;
  - o texto da região viva;
  - o grupo some quando vazio.
- **Hoje o dia pede:**
  - `indicePorProgresso` e `posicaoDoIndice` nas bordas (0, 0.9999, 1,
    negativo);
  - `listarNomes`;
  - setas, Home e End;
  - `aria-selected` e roving tabindex;
  - "Ver as N no cardápio" aplica a vontade e limpa o resto;
  - texto com 1 e com N produtos.
- **Molduras:** cada formato com a sua moldura e o seu acessório; formato
  desconhecido cai na neutra; acessório `aria-hidden`.
- **Regressão do hero em branco:**
  - o HTML do servidor segue a regra de estilo inline da §6.2;
  - análise estática do CSS: toda regra de estado inicial escondido está sob
    `html.js` e dentro de `prefers-reduced-motion: no-preference`;
  - nenhuma animação passa de 2 s.

**Saem:** os testes dos componentes removidos (AnnouncementBar, Selos, Ritual,
Sabores, ListaPinada, Bento, Etiqueta, SaborCard, Pill) e as contagens fixas
"7 sabores, 6 selos, 4 passos". O ritual continua coberto dentro do rótulo da
linha.

**Conferência visual:** Edge headless com `--force-prefers-reduced-motion`,
para capturar o estado final. Larguras:

- 1440 px;
- 477 px, a mínima do Edge headless;
- uma captura alta com o pino desligado.

Comparar com o protótipo aprovado.

---

## 12. Fora de escopo

Carrinho, checkout, preço, página de produto, Supabase ligado (o
`carregarCatalogo` fica pronto para ele, mas lê os arquivos), busca, conta,
newsletter, WhatsApp, frete, i18n, dark mode, analytics.

---

## 13. O que mudou do protótipo para esta spec, e por quê

1. **Lead do hero e subtítulo do final.** O protótipo dizia "Doces e salgados"
   e "Doce ou salgado", mas hoje não existe salgado. As frases ficaram
   verdadeiras para o catálogo de hoje e voltam a falar de salgado quando a
   linha entrar.
2. **Parágrafo do cardápio.** Saiu "A moldura de cada foto vem da embalagem de
   verdade: pote, caixa de bolo, saquinho kraft", que afirma embalagens que
   ainda não existem. O parágrafo restante só aparece quando há filtro.
3. **A marca sem a assinatura repetida.** O protótipo fechava A marca com "AMO
   por você. Por seu AMO." e logo em seguida vinha a faixa cobre com a mesma
   frase. Ficou só a faixa.
4. **O rótulo da linha mostra os 6 selos**, não 4, porque os 6 estão no rótulo
   real. Com uma linha só, o cartão é largo e cabe tudo.
5. **O selo do hero perdeu o "do destaque"**, que era nota do protótipo.
6. **Abas em vez de `aria-pressed`** no Hoje o dia pede, com teclado completo
   e seleção travada durante a rolagem programada.
7. **"role pra trocar" só com a seção pinada.** Sem pino, a frase seria falsa.
8. **`#6E3E22` trocado por `chocolate`**, e o foco passou a variar por
   superfície (§9.3).
9. **O id `#humor` virou `#hoje`.**

---

## 14. Pendências do cliente

Nenhuma trava a implementação; a página fica pronta com o que está aqui e o
cliente confirma ou troca.

**Textos que eu escrevi (P):**

| onde | texto |
|---|---|
| hero, lead | Receitas em versão saudável. Cada uma diz no rótulo o que tem e o que não tem. |
| hero, link | Escolher pela vontade |
| cardápio, h2 | Escolha pelo sabor |
| cardápio, parágrafo | Filtre pela linha ou pelo que importa pra você. |
| cardápio, vazio | Nenhuma receita com esse filtro ainda. |
| hoje o dia pede, rótulo | Não sabe o que escolher? |
| rótulos, h2 (várias linhas) | Cada linha tem a sua regra. Todas estão no rótulo. |
| rótulos, h2 (uma linha) | O que é saudável aqui está no rótulo. |
| a marca, h2 | Comer bem não devia cobrar nada depois |
| a marca, parágrafo | AMO nasceu de uma ideia simples… (§5.6) |
| final, h2 e subtítulo | Escolha o seu AMO. / Cada receita tem a sua versão saudável. |

**O mapa de vontades** da §3.3: qual sabor responde a qual vontade.

**Herdadas da v1:** logo em SVG, preços e gramatura, contato real, área de
entrega, variação de tamanho.

**Para as linhas novas:** foto, nome, linha, formato, selos e vontades de cada
produto; regra, selos, frase e cor do rótulo de cada linha.

---

## 15. Critério de pronto

1. A página renderiza com o catálogo real, sem lorem e sem dado inventado.
2. A fixture de catálogo misto renderiza filtros, vontades e rótulos sem
   mudança de componente.
3. De 320 a 2560 px, sem rolagem horizontal e sem quebra.
4. Movimento reduzido: página estática, completa e utilizável, sem pino.
5. Sem JavaScript: tudo visível, sem botão morto.
6. Teclado alcança tudo, com foco visível em todas as superfícies.
7. axe sem violação; todos os pares da §9.2 verificados em teste.
8. Todos os testes da §11 passando.
9. Lighthouse mobile com Performance de 95 ou mais e Acessibilidade 100.
10. Conferência visual contra o protótipo em desktop e celular.

## 16. Ponto de partida no git

Autorizado pelo cliente, como primeiro passo da implementação:

1. Commitar a v1.1, que está pendente na `feat/home-v1`, como ponto de volta.
2. Criar a `feat/home-v2` a partir dele e fazer o redesign nela.
