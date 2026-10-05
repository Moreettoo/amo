# AMO — Home v1 · Design Spec

**Data:** 2026-08-22
**Escopo:** página inicial, desktop e mobile. Ações comerciais inertes.
**Status:** aguardando revisão do cliente

---

## 1. Contexto

AMO — Sabores Saudáveis vende **bolos no pote zero açúcar**, artesanais, cozidos a
vapor, em pote de vidro reutilizável. Existem 7 sabores com fotografia própria
pronta e um sistema de marca já definido nos rótulos.

Este documento especifica **só a home**, visualmente completa, sem carrinho, sem
preço, sem checkout e sem páginas internas. O banco no Supabase e o fluxo de
compra vêm em rodadas seguintes; a estrutura de dados aqui é desenhada para
receber o Supabase sem reescrita.

**Job da página:** fazer a pessoa querer provar, e confiar que "zero açúcar" não
é sinônimo de abrir mão do doce.

**Público:** mulheres 25–45 no Brasil que querem sobremesa sem a cobrança
depois — dieta, low carb, diabetes, ou só cansadas de açúcar.

### Referência

`lunarossa.framer.website` é referência de **animação e design**, não molde de
seções. Dela vem o vocabulário: nav flutuante que gruda, reveal ao rolar, seção
pinada com preview trocando, escala de display generosa. **Não** vem: Koulen,
paleta pêssego, contadores, depoimentos, blog, marquee, texto circular girando.

As seções desta página saem do que a AMO tem de verdade.

---

## 2. Marca — fonte da verdade

Tudo abaixo foi lido dos rótulos e do logo. Nada inventado.

**Nome:** AMO · Sabores Saudáveis
**Categoria no rótulo:** BOLOS NO POTE
**Claim principal:** ZERO AÇÚCAR
**Assinatura:** "Para quem ama comer bem."
**Linha de rodapé do rótulo:** "Um abraço em forma de sobremesa ♥"
**Linha secundária:** "AMO por você. Por seu AMO."
**Processo:** "Produzido artesanalmente"

**Os 6 selos** (linha de ícones do rótulo):

1. Ingredientes selecionados
2. Cozido a vapor
3. Pote de vidro reutilizável
4. Fonte de fibras
5. Adoçado com eritritol e stevia
6. Produzido artesanalmente

**O ritual** ("Como aproveitar seu AMO", numerado no próprio rótulo):

1. Abra com amor
2. Pegue sua colher
3. A saboreie sem culpa
4. Cuide do pote de vidro

**Logo:** capital "A" serifada de alto contraste (didone) + "m" em script
copperplate + pote de vidro com coração. Cobre metálico. Abaixo, filete e
"SABORES SAUDÁVEIS" em sans caps com tracking largo, e a assinatura em script.

Esse trio — **serifada afiada + script + sans caps espaçada** — é o DNA
tipográfico da marca e dita a escolha de fontes na seção 5.

---

## 3. Catálogo — os 7 sabores

Cada produto tem nome poético, sabor e frase. Todos reais, tirados das etiquetas.

| slug | Nome | Sabor | Frase | Tampa |
|---|---|---|---|---|
| `aconchego-prestigio` | Aconchego | Prestígio | Um abraço em forma de sobremesa | vinho |
| `raizes-pacoca` | Raízes | Paçoca | O sabor que desperta boas lembranças | terracota |
| `leveza-maracuja` | Leveza | Mousse de Maracujá | Para dias mais leves | amarelo |
| `encontro-frutas-vermelhas` | Encontro | Frutinho com Frutas Vermelhas | Quando o doce encontra o azedinho perfeito | dourado |
| `carinho-beijinho` | Carinho | Beijinho | Para adoçar o coração | vinho |
| `intensamente-chocolate` | Intensamente | Chocolate | Para os apaixonados por chocolate | vinho |
| `energia-frutas-amarelas` | Energia | Frutas Amarelas | Manga, pêssego e maracujá | dourado |

`corTampa` não é decoração: é a cor real da tampa daquele pote na foto. Vira um
ponto de cor discreto no card, que casa card e fotografia.

---

## 4. Conceito — a assinatura

### Estratos

Um bolo no pote é uma **secção transversal**. Você compra pelo que vê pela
lateral do vidro: bolo, creme, cobertura, em camadas irregulares que assentaram
sozinhas. Isso é a coisa mais característica do produto e nenhum concorrente de
sobremesa pode usar.

A página é essa secção transversal, de cima para baixo.

**Duas consequências concretas:**

**(a) O título do hero é a secção transversal.** Não uma imagem de camadas —
o próprio texto. As três linhas do H1 assentam cada uma em sua faixa, com
tonalidade ligeiramente diferente, e a última sangra na fronteira para a seção
seguinte. O leitor entende a metáfora em dois segundos, sem legenda.

```
┌───────────────────────────────────────────────────────────┐
│ ZERO AÇÚCAR · COZIDO A VAPOR              ╭───────────╮   │  sage 100%
├──────────────────────────────────────     │           │   │
│  Um abraço em                             │  pote     │   │  sage 92%
├──────────────────────────────────────     │  (foto,   │   │
│  forma de                                 │  priority)│   │  sage 84%
├──────────────────────────────────────     │           │   │
│  sobremesa                                ╰───────────╯   │  cream/40
│                                                            │
│  ╭ Para quem ama comer bem. ╮  ← script, rosewood         │
│                                                            │
│  ( Ver os sabores )         ↘ zero açúcar, sem abrir       │
│                               mão do doce                  │
╰──╮╭─────╮╭──────╮╭───╮╭──────────╮╭────╮╭──────────╮╭─────╯  ← estrato
   ╰╯     ╰╯      ╰╯   ╰╯          ╰╯    ╰╯          ╰╯
```

**(b) As fronteiras entre estratos são curvas, nunca linhas retas.** Curvas
bezier irregulares, autoradas à mão, uma diferente por fronteira — do jeito
torto que uma camada assenta no vidro. **Cinco estratos, cinco curvas, nenhuma
repetida:**

| # | fronteira |
|---|---|
| 1 | hero `sage` → selos `cream` |
| 2 | sabores `cream` → ritual `sage` |
| 3 | ritual `sage` → lista `cream` |
| 4 | lista `cream` → bento |
| 5 | CTA final `sage` → footer `ink` |

Três fronteiras ficam **retas de propósito**, e a razão é a mesma nas três: não
são camadas de sobremesa.

- **anúncio → hero** — a barra de anúncio é uma tarja de interface, não um estrato
- **bento → faixa** e **faixa → CTA** — a faixa rosewood reproduz a tarja de
  rodapé impressa no rótulo. Tarja tem borda reta; curvar ali quebraria a
  citação da embalagem

Curva onde é camada, reta onde é tarja. A regra é legível, então o sistema se
sustenta.

### A ousadia mora aqui e só aqui

O resto da página é disciplinado: grid limpo, muito respiro, movimento contido.
Um elemento memorável, tudo em volta quieto.

**Cortado de propósito** — texto circular girando, marquee rolando, potes
flutuando em loop, cascata de stagger, nav que encolhe. São os tells de template
Framer e não servem à marca.

### Linguagem de forma, tirada da embalagem

| forma | de onde vem | onde usa |
|---|---|---|
| **elipse** | a etiqueta oval pendurada no barbante | eyebrows, selos, badges |
| **tile arredondado** | a grade de ícones do rótulo | seção de selos |
| **pill** | — | apenas CTAs |

Elipse para rótulo, pill para ação. Nunca trocar: a forma diz se aquilo é
informação ou botão.

---

## 5. Sistema de design

### 5.1 Cor

Hex fixados pelo cliente em `_referencias/site/paleta.txt`. A ponderação dele
diz "Cream e Sage são dominantes; Rosewood/Blush só accent pontual, nunca cor
majoritária" — e é seguida à risca.

| token | hex | papel |
|---|---|---|
| `--sage` | `#C3CDB4` | **o chão da página.** Hero, ritual, CTA final |
| `--cream` | `#FAF2E9` | estrato claro entre os sage |
| `--sand` | `#DCC9A8` | cards, numerais fantasma, estrato médio |
| `--ink` | `#2E241F` | texto, barra de anúncio, footer, estrato profundo |
| `--rosewood` | `#B9707A` | faixa da assinatura, CTA, anel de foco |
| `--blush` | `#D9ACA6` | borda de hover do card, anotação do hero. Nada além |

**Decisão deliberada: sage carrega a página, não cream.** O guia de design marca
"fundo cream + serifada de alto contraste + accent terracota" como um dos três
looks genéricos de IA. A paleta do cliente manda o cream — o brief ganha — mas o
`paleta.txt` também diz que sage é dominante em "seções, hero". Então sage é o
chão e cream é o intervalo, não o contrário. É essa inversão que tira a página
do default.

**As 11 faixas de fundo, de cima para baixo** (a nav não entra na conta: ela
flutua sobre o hero):

```
ink      ▓▓▓▓▓  barra de anúncio
sage     ░░░░░  hero
cream    ▒▒▒▒▒  selos
cream    ▒▒▒▒▒  a marca
cream    ▒▒▒▒▒  os sabores        (cards em sand/white)
sage     ░░░░░  o ritual
cream    ▒▒▒▒▒  todos os sabores  (lista pinada)
misto    ▓░▒░▓  bento             (ink · sand · sage)
rosewood █████  faixa da assinatura   ← único bloco rosewood
sage     ░░░░░  CTA final
ink      ▓▓▓▓▓  footer
```

Rosewood aparece em exatamente três lugares: a faixa, os CTAs, o anel de foco.
Blush em dois, ambos minúsculos: a borda de hover do card e a anotação
manuscrita do hero.

**Contraste** — verificar no build, alvo AA (4.5:1 texto normal, 3:1 texto
grande e não-texto):

- ink `#2E241F` sobre sage `#C3CDB4` — folgado
- ink sobre cream / sand — folgado
- cream sobre ink — folgado
- cream sobre rosewood `#B9707A` — **medir.** Se ficar abaixo de 4.5:1, escurecer
  o rosewood **só para uso de texto** (`--rosewood-texto`), mantendo `#B9707A`
  como cor de superfície. Não mexer no token do cliente.
- anel de foco rosewood sobre cream/sage — precisa 3:1. Mesma saída se falhar.

### 5.2 Tipografia

Derivada do logo, não do que é comum.

| papel | fonte | por quê |
|---|---|---|
| display | **Bodoni Moda** | Didone de verdade, variável. Reproduz literalmente o "A" afiado de alto contraste do logo. Menos batido que Playfair e Fraunces, que são o default deste tipo de página |
| script | **Parisienne** | O "m" copperplate e a assinatura "Para quem ama comer bem". Só em nomes de sabor e linhas de marca |
| sans | **Jost** | Geométrica tipo Futura. É o "BOLOS NO POTE" em caps com tracking largo do rótulo. Corpo, UI, eyebrows. A redondeza geométrica casa com as formas circulares do pote |

A tensão serifada-afiada + script-fluida **é** a marca — o logo já resolve isso.
Bodoni traz a estrutura, Parisienne o afeto, Jost sai da frente.

Todas as três cobrem Latin Extended: á ã â ç é ê í ó õ ô ú.

**Carregamento:** `next/font/google`, `display: 'swap'`, subset `latin` +
`latin-ext`. Bodoni Moda e Jost como variáveis. `preload` só na Bodoni Moda —
ela está acima da dobra no H1.

**Escala** (fluida, mesma em desktop e mobile por `clamp`):

| papel | tamanho | fonte / peso | tracking | caixa |
|---|---|---|---|---|
| H1 hero | `clamp(2.75rem, 7.5vw, 6.5rem)` | Bodoni 400 | `-0.02em` | sentença |
| H2 seção | `clamp(1.875rem, 4vw, 3.5rem)` | Bodoni 400 | `-0.015em` | sentença |
| H3 card | `1.375rem` | Bodoni 500 | `-0.01em` | sentença |
| nome de sabor | `clamp(1.5rem, 2.5vw, 2.25rem)` | Parisienne 400 | `0` | sentença |
| lista pinada | `clamp(2rem, 5vw, 4.5rem)` | Bodoni 400 | `-0.02em` | sentença |
| eyebrow | `0.75rem` | Jost 500 | `0.18em` | CAPS |
| sabor no card | `0.8125rem` | Jost 500 | `0.14em` | CAPS |
| corpo | `1rem` / 1.7 | Jost 400 | `0` | sentença |
| corpo grande | `1.125rem` / 1.65 | Jost 400 | `0` | sentença |
| miúdo | `0.875rem` / 1.6 | Jost 400 | `0` | sentença |
| numeral fantasma | `clamp(4rem, 10vw, 9rem)` | Bodoni 400 | `-0.03em` | — |

`text-wrap: balance` em todo H1/H2/H3. `text-wrap: pretty` em parágrafos.

**Caixa sentença, não Title Case.** As guidelines pedem Title Case em títulos e
botões; é convenção do inglês. Português usa caixa sentença. Desvio deliberado e
registrado.

### 5.3 Layout e espaço

- Container: `max-width: 1280px`, padding lateral `clamp(1.25rem, 5vw, 4rem)`
- Ritmo vertical de seção: `clamp(4.5rem, 9vw, 8rem)`
- Gap de grid: `clamp(1rem, 2vw, 2rem)`
- Raios: card `24px` · imagem `20px` · nav `20px` · pill `999px` · elipse `50%`
- Sombras: uma só, `0 8px 32px -8px rgb(46 36 31 / 0.12)`, exclusiva de hover de card
- Breakpoints: `sm 640` · `md 768` · `lg 1024` · `xl 1280`
- Grid dos sabores: 1 col → 2 (sm) → 3 (md) → 4 (lg)

Flex e grid resolvem o layout. Nada de medição por JS, exceto a lista pinada,
que é intrinsecamente scroll-driven.

---

## 6. Movimento

**Um momento orquestrado, três comportamentos quietos.** Nada mais.

### 6.1 A entrada do hero

Uma sequência coreografada no load, ~1.1 s no total:

1. `0.0s` — as faixas de estrato do hero crescem de altura 0 (`scaleY`, origem no topo), escalonadas 90 ms
2. `0.35s` — as três linhas do H1 entram, `opacity` 0→1 + `y` 20→0, escalonadas 110 ms
3. `0.75s` — o pote sobe, `opacity` 0→1 + `y` 32→0
4. `0.95s` — script, CTA e anotação aparecem juntos

Easing `cubic-bezier(0.16, 1, 0.3, 1)`. Só `transform` e `opacity`.

### 6.2 Reveal ao rolar

`whileInView`, `once: true`, margem `-10%`. `opacity` 0→1 + `y` 16→0, 500 ms.
Sem stagger em cascata — os filhos entram juntos. Contenção é o ponto.

### 6.3 Nav

`useScroll`. Passando de 40 px: fundo `transparent` → `sage/95` com
`backdrop-filter: blur(12px)` e borda inferior `ink/8`. 240 ms.
**Não encolhe, não muda de tamanho** — só o fundo. Zero deslocamento de layout.

### 6.4 Lista pinada de sabores

Container `sticky`. O progresso do scroll dirige o índice ativo entre os 7.
Nome ativo em `ink` com opacidade 1; inativos em `ink/25`. A foto de preview faz
crossfade em 300 ms.

Interação por scroll precisa de alternativa acessível: os nomes são `<button>`
reais, focáveis e clicáveis, que ativam o mesmo estado. Setas ↑↓ navegam quando
o foco está na lista.

### 6.5 Hover de card

Imagem `scale(1.03)`, card `translateY(-3px)`, sombra entra. 200 ms.
Só sob `@media (hover: hover)`.

### 6.6 Regras não negociáveis

- `prefers-reduced-motion: reduce` → toda animação desaparece. Sem fade, sem
  transform, sem transição. Estado final imediato. A lista pinada continua
  funcionando pelos botões.
- Só `transform` e `opacity` animam. Nunca `width`, `height`, `top`, `left`.
- Nunca `transition: all`. Propriedades listadas uma a uma.
- `transform-origin` explícito em tudo que escala.
- `transform-box: fill-box; transform-origin: center` em `<g>` de SVG animado.
- Nenhuma animação em autoplay passa de 5 s. Não existe loop infinito nesta
  página — é por isso que a faixa da assinatura é estática.

---

## 7. As seções

### 7.1 Barra de anúncio — `ink`

Faixa fina. Jost caps, tracking largo, cream sobre ink, centralizado:

> ZERO AÇÚCAR · COZIDO A VAPOR · POTE DE VIDRO REUTILIZÁVEL

Fato do rótulo, não promoção inventada. Sem botão de fechar (não há o que
fechar), sem contagem regressiva.

### 7.2 Nav flutuante — `sage`

Destacada das bordas, raio 20 px, `position: sticky`.

- Esquerda: lockup AMO (recorte "A m 🫙" do logo, sem o descritor)
- Centro: Sabores · A marca · O ritual
- Direita: nada. **Sem carrinho, sem busca, sem login** — não existem ainda, e
  ícone que não faz nada é pior que ícone ausente.

Links são `<a href="#sabores">` etc. — âncoras que rolam de verdade. Isso é
navegação real, não afordância morta, e satisfaz "links usam `<a>`". Alvos com
`scroll-margin-top` igual à altura da nav.

Mobile: menu em `<details>`/`<summary>` ou botão com `aria-expanded`, painel em
sage, foco preso enquanto aberto, `Esc` fecha.

### 7.3 Hero — `sage`

O momento da tese. Wireframe na seção 4.

- Eyebrow em elipse outline: `ZERO AÇÚCAR · COZIDO A VAPOR`
- H1, três linhas, cada uma em sua faixa: **"Um abraço em / forma de / sobremesa"**
- Script rosewood: *Para quem ama comer bem.*
- Corpo: "Sete sabores de bolo no pote, montados à mão e adoçados com eritritol
  e stevia. Em pote de vidro que fica com você."
- Pill rosewood: **Ver os sabores** → âncora para `#sabores`
- Anotação manuscrita com setinha curva: *zero açúcar, sem abrir mão do doce*
- Direita: um pote em painel arredondado. `priority`, `sizes` explícito.

Só um H1 na página, e é este.

### 7.4 Selos — `cream`

Eyebrow: `O QUE VAI NO POTE`
H2: **"Feito pra comer sem culpa"**

Os 6 selos em grade de tiles arredondados — a mesma grade de ícones do rótulo.
Ícone SVG de traço desenhado por mim (não biblioteca genérica), nome em Jost
caps.

Grade: 2 col (mobile) → 3 (md) → 6 (lg). Ícones `aria-hidden`, o nome carrega
o significado.

### 7.5 A marca — `cream`

Eyebrow: `A MARCA`
H2: **"Para quem ama comer bem"**

> AMO nasceu de uma ideia simples: sobremesa não devia cobrar nada de você
> depois. Cada pote é montado à mão, cozido a vapor e adoçado com eritritol e
> stevia. Açúcar, nenhum.
>
> O pote é de vidro porque ele não acaba junto com a sobremesa. Lava, guarda,
> usa de novo.

Script: *AMO por você. Por seu AMO.*
Uma foto de pote ao lado.

⚠️ **Este é o único texto da página que é minha redação, não do rótulo.** Os
fatos são todos do rótulo; o enquadramento narrativo ("nasceu de uma ideia
simples") é meu e precisa do seu aval.

### 7.6 Os sabores — `cream` · `id="sabores"`

Eyebrow: `OS SABORES`
H2: **"Cada pote tem um nome"**
Sub: "Escolha pelo sabor, ou pelo que você está sentindo."

Os 7 cards + 1 painel sage com a assinatura *"Um abraço em forma de
sobremesa ♥"*. O painel é o último no DOM e **estica pra fechar a linha em cada
breakpoint** — sem isso, 7 + 1 deixa buraco em grade de 3:

| breakpoint | colunas | painel |
|---|---|---|
| base | 1 | 1 col |
| `sm` | 2 | 1 col (7+1 = 4 linhas cheias) |
| `md` | 3 | **2 col** (3+3+2 fecha) |
| `lg` | 4 | 1 col (4+4 fecha) |

Nunca sobra célula vazia em nenhuma largura.

**Card:**

```
╭─────────────────────────╮
│                         │
│      [foto do pote]     │  20px, object-cover
│                         │
├─────────────────────────┤
│  ● Aconchego            │  ● = cor da tampa, 6px
│    PRESTÍGIO            │  Jost caps tracking .14em
│                         │
│  Um abraço em forma     │  frase real, ink/70
│  de sobremesa           │
╰─────────────────────────╯
```

Fundo `white`, hover ganha borda `blush`. **Sem CTA e sem preço** — nada
acontece ainda, e botão morto é pior que botão nenhum. Card é `<article>`, não
link.

Slot documentado para v2: preço abaixo da frase, pill "Adicionar" no pé.

Fotos: `loading="lazy"`, `width`/`height` explícitos, alt descritivo em
português ("Pote de bolo Aconchego sabor prestígio, com cobertura de coco").

### 7.7 O ritual — `sage`

Eyebrow: `O RITUAL`
H2: **"Como aproveitar seu AMO"** — texto literal do rótulo

Os 4 passos, com numeral fantasma gigante em `sand` atrás de cada um:

`01` Abra com amor · `02` Pegue sua colher · `03` A saboreie sem culpa ·
`04` Cuide do pote de vidro

**A numeração se justifica:** é sequência de verdade, numerada no próprio
rótulo. Não é ornamento — a ordem carrega informação (você não guarda o pote
antes de abrir). Marcado como `<ol>`.

### 7.8 Todos os sabores — `cream`

H2 no lugar e no estilo de eyebrow: `TODOS OS SABORES`

A interação pinada. Esquerda: preview grudado, 4:5, crossfade.
Direita: os 7 nomes em Bodoni gigante, ativo em ink, resto em ink/25.

Padrão de abas completo, não meia-boca: container `role="tablist"` com
`aria-orientation="vertical"`; cada nome é `<button role="tab">` com
`aria-selected` e `aria-controls`; o preview é `role="tabpanel"` com
`aria-labelledby` apontando pra aba ativa. Só a aba ativa fica no índice de
tabulação (`tabIndex={0}`, as outras `-1`), e ↑↓ move entre elas — é o que o
padrão ARIA de tablist exige.

`aria-current` seria errado aqui: ele marca posição em navegação, não seleção em
abas.

O scroll dirige o mesmo estado que o clique. Interação por gesto sempre tem
alternativa por clique e por teclado.

### 7.9 Bento — `ink` · `sand` · `sage`

Três células, alturas desiguais.

- **A** (`ink`, larga): "AMO" em outline fantasma no fundo + *"Um abraço em
  forma de sobremesa"* em Bodoni cream + foto de pote
- **B** (`sand`): os 4 tiles de ícone do rótulo + *"AMO por você. Por seu AMO."* em Parisienne
- **C** (`sage`): foto de pote + "Pote de vidro reutilizável. Lava, guarda, usa de novo."

O card `blush` fica fora — três blocos coloridos seguidos já é o limite.

### 7.10 Faixa da assinatura — `rosewood`

Faixa cheia, cream sobre rosewood, Bodoni caps, centralizada, **estática**:

> UM ABRAÇO EM FORMA DE SOBREMESA ✦

Reproduz a tarja de rodapé do rótulo. Único bloco rosewood grande da página.

Não rola. Marquee é autoplay acima de 5 s (exige controle de pausa pelas
guidelines) e é tell de template. Estática é mais confiante.

### 7.11 CTA final — `sage`

H2: **"Para quem ama comer bem"**
Corpo: "Sete sabores. Zero açúcar."
Pill rosewood: **Ver os sabores** → `#sabores`
Um pote ao lado.

### 7.12 Footer — `ink`

- Lockup completo do logo (com "SABORES SAUDÁVEIS" e assinatura)
- Filete `cream/15`
- Três colunas:
  - **Sabores** — os 7 nomes, texto sem link (não há páginas)
  - **A marca** — âncoras: A marca · O ritual · Os selos
  - **Contato** — genérico por ora, conforme combinado:
    - `contato@amo.com.br`
    - `@amo`
    - `(00) 00000-0000`
- Filete
- `© 2026 AMO Sabores Saudáveis`

Placeholders são visivelmente placeholders. `(00) 00000-0000` não pode ser
confundido com telefone real de ninguém.

---

## 8. Stack

**Next.js (App Router) · TypeScript · Tailwind · Motion**

Escolhido sobre Vite (sem SSR — Google não indexa bem, e busca local vende bolo
de pote) e sobre Astro (a página é pesada em animação; quase toda seção viraria
ilha e o ganho evapora).

- **Next.js App Router** — SSR/SSG para SEO, e Server Components prontos pra
  buscar do Supabase depois sem refatorar a árvore
- **TypeScript** — `strict: true`
- **Tailwind** — tokens da paleta como variáveis CSS num único lugar
- **Motion** (ex-`framer-motion`) — o vocabulário da referência mapeia 1:1; a
  referência literalmente compila pra isso
- **next/font/google** — Bodoni Moda, Parisienne, Jost self-hosted, sem
  requisição a terceiros
- **next/image** — as 7 fotos aparecem em três seções; otimização é de graça
- **Vitest + Testing Library + jsdom** — testes

Versões: as correntes no momento da instalação. Node 22.18 e npm 10.9.3
confirmados na máquina.

### Estrutura

```
amo/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx           fontes, metadata, lang="pt-BR", skip link
│  │  ├─ page.tsx             compõe as 12 seções
│  │  └─ globals.css          tokens, reset, @theme
│  ├─ components/
│  │  ├─ layout/              AnnouncementBar · Nav · Footer
│  │  ├─ sections/            Hero · Selos · AMarca · Sabores · Ritual
│  │  │                       ListaPinada · Bento · FaixaAssinatura · CtaFinal
│  │  ├─ ui/                  Estrato · Etiqueta · Pill · Reveal · SaborCard
│  │  └─ icons/               os 6 ícones de selo, SVG autoral
│  ├─ data/                   sabores.ts · selos.ts · ritual.ts
│  └─ lib/                    motion.ts (variantes) · cn.ts
├─ public/
│  ├─ marca/                  logo-amo.png · logo-amo-lockup.png
│  └─ sabores/                7 .webp renomeados por slug
├─ scripts/
│  └─ recortar-logo.py        remove o xadrez do JPEG
├─ tests/
└─ docs/superpowers/specs/
```

Um componente por arquivo. Seção não sabe do resto da página; recebe dados e
renderiza.

---

## 9. Modelo de dados

```ts
export type CorTampa = 'vinho' | 'terracota' | 'amarelo' | 'dourado'

export type Sabor = {
  slug: string       // aconchego-prestigio
  nome: string       // Aconchego
  sabor: string      // Prestígio
  frase: string      // Um abraço em forma de sobremesa
  imagem: string     // /sabores/aconchego-prestigio.webp
  alt: string        // descrição pt-BR da foto
  corTampa: CorTampa
  largura: number    // dimensões reais, pro next/image
  altura: number
}
```

Mapeia 1:1 na tabela do Supabase depois. Só ganha campo, não muda de forma:

```sql
create table sabores (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  nome           text not null,
  sabor          text not null,
  frase          text not null,
  imagem_url     text not null,
  alt            text not null,
  cor_tampa      text not null,
  preco_centavos integer,               -- v2
  ativo          boolean default true,  -- v2
  ordem          integer,               -- v2
  created_at     timestamptz default now()
);
```

`preco_centavos` como inteiro, nunca float — dinheiro em ponto flutuante é bug
esperando acontecer.

Idem `selos.ts` (6) e `ritual.ts` (4, com `ordem: 1..4`).

---

## 10. Assets

### 10.1 As 7 fotos

Renomear de hash para slug e mover para `public/sabores/`. Já são `.webp`,
140–190 KB, 660–800 px de largura — servem bem. Medir as dimensões reais de cada
uma e gravar em `sabores.ts`; `next/image` exige `width`/`height` explícitos.

### 10.2 O logo

**Problema:** `Gemini_Generated_Image_29yuu129yuu129yu.jpeg` (2546×1664) tem o
**xadrez de transparência achatado nos pixels**. JPEG não guarda canal alpha, o
quadriculado virou imagem de verdade. Colado direto, aparece um retângulo
quadriculado em cima do sage.

**Solução em duas etapas:**

1. `scripts/recortar-logo.py` (Pillow 12.2, confirmado na máquina) tira o
   xadrez: pixel com saturação baixa **e** luminância alta → alpha 0, com rampa
   suave na borda pro anti-aliasing não serrilhar. Os vazios internos do "A" e
   do pote também abrem, o que é o comportamento correto.
2. Dois recortes: **lockup curto** (`A m 🫙`) pra nav, **lockup completo** (com
   descritor e assinatura) pro footer. O logo inteiro tem detalhe demais pra
   40 px de altura.

⚠️ Isso é paliativo. Artefato de compressão JPEG deixa halo na borda, e sobre
sage ou ink vai dar pra notar de perto. **O certo é o logo em SVG, ou PNG com
alpha de verdade, exportado do original.** Está na lista de pendências.

---

## 11. Barra de qualidade

Conferida contra as Web Interface Guidelines (Vercel). Não é aspiração, é
critério de aceite.

### Acessibilidade

- Um `<h1>` só. Hierarquia `h1`→`h2`→`h3` sem pular nível
- Skip link pro `<main>`, primeiro elemento focável
- `<section>` com `aria-labelledby` apontando pro próprio H2
- Toda imagem com `alt` em português; decorativa com `alt=""`
- Ícone decorativo com `aria-hidden="true"`
- `<button>` pra ação, `<a>` pra navegação. Nunca `<div onClick>`
- Botão só-ícone (menu mobile) com `aria-label`
- `scroll-margin-top` em todo alvo de âncora, igual à altura da nav
- `lang="pt-BR"` no `<html>`

### Foco

- `focus-visible:ring-2` rosewood com offset em tudo interativo
- `outline: none` só junto de substituto visível
- `:focus-visible`, não `:focus`
- Nav sticky não pode cobrir o elemento focado — daí o `scroll-margin-top`

### Animação

- `prefers-reduced-motion: reduce` desliga tudo
- Só `transform` e `opacity`
- Nunca `transition: all`
- `transform-origin` explícito
- Nada em autoplay acima de 5 s. Nenhum loop infinito
- Animações interrompíveis

### Tipografia

- `…` de verdade, nunca `...`
- Aspas curvas `"` `"`, nunca `"`
- `&nbsp;` onde a quebra estragaria a leitura: "Pote de&nbsp;vidro",
  "eritritol e&nbsp;stevia", e a marca "AMO" nunca sozinha no fim de linha
- `text-wrap: balance` nos títulos, `pretty` nos parágrafos
- `translate="no"` em "AMO" e nos nomes de sabor — são nomes próprios, tradutor
  automático não deve mexer

### Imagens e performance

- `width`/`height` explícitos em todas
- Pote do hero: `priority`
- Todo o resto: `loading="lazy"`
- `sizes` correto por breakpoint em cada `next/image`
- Fontes self-hosted por `next/font`, `display: swap`, sem `preconnect` a
  terceiros
- Sem lista acima de 50 itens; virtualização não se aplica
- Sem leitura de layout durante render

### Toque e layout

- `touch-action: manipulation` nos interativos
- `-webkit-tap-highlight-color` definido de propósito
- Sem `user-scalable=no`. Sem `maximum-scale=1`
- Nada de scrollbar horizontal indesejada em nenhum breakpoint
- `env(safe-area-inset-*)` nas faixas full-bleed
- `<meta name="theme-color">` = sage, igual ao topo da página

### Texto

- Voz ativa
- Botão diz o que faz: "Ver os sabores", não "Saiba mais"
- Segunda pessoa
- **Desvio deliberado:** caixa sentença em vez de Title Case. Convenção do
  português

### Testes

`Vitest` + `Testing Library`. Só o que tem valor:

| arquivo | verifica |
|---|---|
| `sabores.test.ts` | 7 entradas · slug único · todo campo preenchido · arquivo de imagem existe em disco |
| `selos.test.ts` | 6 entradas · nome não vazio |
| `ritual.test.ts` | 4 passos · ordem 1,2,3,4 sem furo |
| `page.test.tsx` | exatamente um `h1` · os 7 nomes renderizam · os 6 selos renderizam · skip link presente · nenhuma imagem sem `alt` |
| `a11y.test.tsx` | `axe` sem violação na página montada |

Sem snapshot — quebra a cada ajuste de espaçamento e não pega nada.

---

## 12. Fora de escopo

Nada disto entra na v1, e não fica meio-feito:

carrinho · checkout · preço · Supabase · autenticação · páginas de sabor ·
blog · receitas · depoimentos · contadores animados · busca · filtro ·
newsletter · WhatsApp · frete · cupom · i18n · dark mode · analytics

---

## 13. Pendências do cliente

Nenhuma trava o design. Todas travam o "pronto pra publicar".

| # | o que | por que importa | contorno até chegar |
|---|---|---|---|
| 1 | **Logo em SVG ou PNG com alpha real** | o JPEG tem xadrez achatado; o recorte por script deixa halo | script de recorte |
| 2 | **Preços e gramatura** | card precisa disso pra virar loja | card sem preço |
| 3 | **Contato real** — telefone, e-mail, Instagram | footer genérico não converte | placeholder óbvio, autorizado por você |
| 4 | **Aval no texto de "A marca"** (§7.5) | é a única redação minha na página | fica como está até você ler |
| 5 | Área de entrega / retirada | define se cabe seção de logística | fora de escopo na v1 |
| 6 | Sabor tem variação de tamanho? | muda a forma do card e da tabela | assume tamanho único |

---

## 14. Critério de pronto

A v1 está pronta quando, tudo ao mesmo tempo:

1. As 12 seções renderizam com conteúdo real, zero lorem, zero dado inventado
2. Funciona de 320 px a 2560 px sem scroll horizontal e sem quebra
3. `prefers-reduced-motion` deixa a página inteiramente estática e utilizável
4. Navegação só por teclado alcança tudo, com foco sempre visível
5. `axe` sem violação
6. Contraste AA verificado nos pares da §5.1, rosewood corrigido se preciso
7. Todo teste da §11 passando
8. Lighthouse ≥ 95 em Performance e 100 em Acessibilidade, mobile
9. Nenhuma afordância morta: todo elemento clicável faz algo real

---

## 15. Revisão visual v1.1

Data: 2026-08-23. Pedido do cliente: revisar a home por completo, corrigir os
jogos de cor que atrapalham a leitura, melhorar a escolha de fontes, trazer o
que faltou da referência (com destaque para a rolagem que desliza) e remover
todo travessão da app.

As seções 1 a 14 continuam valendo. O que está abaixo substitui os pontos que
cita, e cada troca traz o número que a motivou.

### 15.1 Rolagem (novo, §6)

`lunarossa.framer.website` foi inspecionado ao vivo: o `<html>` dele carrega
`class="lenis lenis-autoToggle"`. A rolagem interpolada da referência é a
biblioteca **Lenis**, então a nossa é a mesma biblioteca com os mesmos
defaults, conduzida por `src/components/RolagemSuave.tsx`.

O Lenis move o `scrollTop` real, não sequestra com transform, então `sticky`
(Nav e ListaPinada) e `getBoundingClientRect` (índice ativo da ListaPinada)
seguem intactos. Sob `prefers-reduced-motion` a instância é destruída e a
rolagem volta a ser a nativa.

Âncora é conduzida à mão, não pela opção `anchors` do Lenis, porque o
`onClick` dele não chama preventDefault: a ação default do navegador saltaria
para o alvo antes do primeiro frame interpolado, e prevenir o default sem
tratar foco quebraria o "Pular para o conteúdo". Consequência: âncora interna
usa `<a>` puro, nunca `next/link`, porque o Link roda o próprio scroll via
`scrollIntoView` e brigaria pelo mesmo `scrollTop`.

### 15.2 Tipografia (substitui §5.2)

| papel | antes | agora | por quê |
|---|---|---|---|
| display | Bodoni Moda | **Bree Serif** | O cliente rejeitou o contraste grosso-fino: Bodoni é um didone, tem haste grossa e filete fino no mesmo caractere. Bree Serif é um slab de traço praticamente uniforme, então a letra tem uma espessura só. Continua serifada, o que mantém a relação com o "A" do logo, e é quente em vez de editorial. Peso único (400): onde havia `font-medium`/`font-semibold` em cima do display, o peso saiu, porque pedir peso inexistente faz o navegador engordar por síntese |
| sans | Jost | **Poppins** 400/500/600 | É a sans da referência, e a altura-x dela é bem maior no mesmo corpo. O texto difícil de ler era justamente o rótulo pequeno em caixa alta |
| script | Parisienne, 5 usos | Parisienne, **2 usos** (hero e A marca, sempre acima de 28 px) | A referência não tem script nenhum. Aplicar isso quer dizer usar menos, não trocar de família. Sai do nome do sabor no card, que era o identificador principal em traço fio de cabelo, e sai da anotação de 18 px, onde media 3.40:1 |

Koulen, o display da referência, foi descartado por motivo técnico e não
estético: ele não tem os glifos `Ç`, `ã`, `Á`, `Í`. Medindo a largura de
avanço, `Ç` e `ã` batem exatamente com a do serif de fallback, ou seja, glifo
ausente. Numa marca cujo claim é ZERO AÇÚCAR isso é inviável.

Rótulo, em todo lugar: 12.5 px / 600 / `0.1em` / ink cheio. Antes era
11 px / 500 / `0.18em` / ink 70%, os quatro parâmetros na direção errada.

### 15.3 Contraste (substitui os alvos da §5.1)

Todos os pares foram medidos. Onze reprovavam:

| onde | antes | agora | correção |
|---|---|---|---|
| numeral do ritual | **1.01:1** | 9.16:1 | Sai de sand/70 atrás do texto (onde também colidia com o título) para ink sólido acima dele, com filete separando cada passo, como a seção de processo da referência |
| seta do hero | **1.22:1** | 3.04:1 | blush passa a rosewood-forte |
| anel do bento | **1.43:1** | removido | Nenhum alfa de cream chega a 3:1 sobre ink. Quem separa a célula é o respiro e a foto |
| borda do botão de menu | **1.43:1** | 9.34:1 no glifo | Contorno ink/20 passa a preenchimento sand |
| borda da Etiqueta | **1.57:1** | 9.16:1 no filete | Nenhum alfa de ink chega a 3:1 sobre cream ou sage, então o contorno translúcido morreu. Passou por elipse preenchida e terminou em filete de `bg-ink` cheio, ver §15.7 |
| nomes inativos da lista | **1.64:1** | 3.44:1 | ink/25 passa a ink/55. São rótulos de sete `<button>` reais; acima de 32 px o piso correto é 3:1 |
| tile de selo | tile invisível | 9.34:1 | sand/40 passa a sand cheio |
| caps do sabor no card | **3.55:1** | 6.64:1 | ink/55 passa a ink/75 |
| anotação do hero | **3.40:1** | 6.50:1 | Script 18 px passa a Poppins 15 px em ink/85 |
| faixa da assinatura | **3.35:1** | 4.52:1 | Superfície passa de rosewood puro a rosewood-forte. Passar raspando no piso mais permissivo é o pior lugar possível para a única faixa colorida da página. O display uniforme ajudou de graça aqui: o que a razão de contraste não media era a haste fina do didone em caixa alta, que sumia sobre o rosa antes de o número reprovar |
| aviso de contato | **3.96:1** | 6.50:1 | cream/45 passa a cream/65 |

Consequências para a disciplina de cor da §5.1:

- **rosewood puro deixa de pintar qualquer coisa.** O token continua definido
  porque é da paleta do cliente, e `tests/tokens.test.ts` guarda o hex; o que
  o guarda de `tests/pagina.test.tsx` proíbe agora é usá-lo como tinta.
- **blush cai de 2 lugares para 1**, a borda de hover do card. O outro uso era
  a seta do hero, a 1.22:1.
- **`--color-papel` (`#FFFDFA`)** entra como superfície dos cards no lugar do
  branco puro, que não estava na paleta e lia frio encostado no cream.

### 15.4 Estrutura

- **Faixas do hero em sangria total** (substitui §4a). Limitadas à largura do
  texto, elas liam como marca-texto e desalinhavam quando a primeira linha
  quebrava. Agora atravessam a janela e a foto cruza as três, que é o que as
  camadas fazem no vidro. A faixa é exatamente a caixa de linha (`inset-y-0`),
  e duas coisas dependem disso: caixas de linha se ladrilham por definição, e
  qualquer inset negativo volta a sobrepor as vizinhas (com `inset-y-[-0.06em]`
  elas se sobrepunham em 0.12em, 11 px medidos, e sendo cream translúcido cada
  emenda pintava cream duas vezes e virava uma tarja mais escura); e, medida a
  tinta real da Bree Serif com `actualBoundingBox`, a folga acima e a abaixo
  ficam iguais com deslocamento zero. O número é propriedade da família: se o
  display trocar, re-medir.
- **Nav opaca** (substitui §6.3 e §7.2). Era `bg-transparent` virando
  `bg-sage/95` com blur; sage translúcido por cima das fotos borrava foto e
  barra num cinza sem forma, e o contraste do rótulo mudava conforme o que
  passava por baixo. Agora é cream com filete sand, e o que muda ao rolar é a
  sombra, só. Cream e não ink porque a arte do logo é cobre sobre
  transparência e desaparece sobre escuro, que era o bug do rodapé.
- **A nav flutua sobre o hero de verdade**, via margem negativa. Antes ela
  ocupava 88 px de fluxo entre a barra ink e o hero, e aparecia uma tarja
  cream que ninguém desenhou.
- **Lista pinada em três colunas com filetes e rótulo lateral fixo**, e a
  troca de foto virou cortina (`clip-path`) em duas camadas, com a foto
  anterior parada por baixo. Com uma camada só, a parte ainda não revelada
  mostraria o fundo e a troca leria como buraco. Tudo isso vem da referência.
- **Parallax de 6% ao rolar** nas fotos do hero, de A marca e do CTA final.
- **Logo do rodapé sobre painel cream.** Sem inventar uma versão clara da
  marca que o cliente não entregou, a saída honesta é dar ao logo o fundo para
  o qual ele foi desenhado. De quebra o painel arredondado cita a etiqueta de
  papel pendurada no pote.
- **Fim do `justify-between` na célula sand do bento**, que deixava um vazio de
  uns 200 px no meio, e do fantasma AMO cortado pelo canto.
- **Frases dos cards alinhadas no pé da linha**, via `mt-auto`, para o sabor de
  duas linhas de Encontro parar de desalinhar a linha inteira.

### 15.5 Travessão

Nenhum, em nenhum lugar: nem em texto visível, nem em `alt`, nem em `title`,
nem em comentário. `tests/travessao.test.ts` varre `src/`, `tests/` e o README
e reprova o travessão (U+2014) e a meia-risca (U+2013). Este documento e os
demais em `docs/` são registro histórico e ficaram fora da varredura.

### 15.6 Next 16

- `priority` do `next/image` está deprecado em favor de `preload`. A foto do
  hero passou a usar `preload`, e o guarda de "exatamente uma imagem" seguiu.
- Os dois PNGs de logo passaram a declarar as dimensões intrínsecas. Com
  149x44 a proporção declarada (3.3864) divergia da real (3.3806) e, na altura
  de 44 px, a largura calculada caía em 148.75 contra o atributo 149: o
  next/image lia uma das dimensões como não modificada por CSS e avisava no
  console.

### 15.7 Segunda rodada de revisão do cliente

**Display: Bodoni Moda para Bree Serif.** O cliente rejeitou o contraste
grosso-fino ("fonte que é fina e grossa ao mesmo tempo"), que é a definição de
um didone. Bree Serif tem traço praticamente uniforme, peso único, e continua
serifada. Consequências no código, todas registradas nos arquivos: o eixo
`opsz` e o `font-optical-sizing: auto` saíram (Bree não tem eixo variável),
`font-medium` e `font-semibold` saíram de cima do display, o tracking negativo
foi de `-0.02em`/`-0.015em` para `-0.01em`/`-0.008em` (slab tem espaçamento mais
justo e o negativo fechava as serifas uma na outra), e o corpo do H1 caiu de
`5.75rem` para `5rem` porque a Bree é mais larga e "Um abraço em" passava da
coluna.

Koulen, o display da referência, continua fora, mas o motivo foi reconfirmado
com evidência melhor. A primeira medição que justificou o descarte estava
errada: ela media largura de avanço no canvas sem aplicar a família, então tudo
caía no serif de fallback e batia trivialmente. Refeito visualmente em corpo de
90 px, o resultado é inequívoco: em "ZERO AÇÚCAR" o `Ç` e o `Ú` saem de um
serif fino no meio das letras pesadas do Koulen, e o mesmo em ABRAÇO, MARACUJÁ
e RAÍZES. A sonda por largura só funciona com um fallback bem distinto
(`"Familia", monospace` contra `monospace`), e mesmo assim ela não distingue
"glifo ausente" de "família não carregada".

**Etiqueta: elipse para filete.** `border-radius: 50%` numa caixa larga e baixa
não dá uma elipse de etiqueta, dá uma lente, e o cliente rejeitou a forma. A
regra da §4 ("elipse é rótulo, pill é ação") continua valendo, só mudou de
eixo: **quem não é clicável não tem caixa nenhuma, quem é clicável tem.** A
distinção ficou mais forte do que com duas formas arredondadas competindo,
porque não depende mais de comparar raios de canto. A pill foi descartada de
propósito para o rótulo: usar a forma do CTA num rótulo faria o rótulo parecer
um botão que não clica. O filete também não é ornamento solto, é a mesma régua
que separa os passos do ritual e as colunas da lista pinada.

### 15.8 O recorte do logo da nav estava cortando a arte

Bug real no gerador do asset, não no CSS. `scripts/recortar-logo.py` isolava a
faixa "A m [pote]" com um corte fixo em `int(A * 0.46)` da altura da origem, e
a faixa termina em 49%: linhas 133 a 813 de 1664. O corte entrava 48 linhas
dentro do desenho e decepava a base do "A", a cauda do "m" e o fundo do pote.

O erro não se denunciava porque o `MARGEM` de respiro é clampado no limite do
próprio corte (`min(A, y1 + MARGEM)`): com a arte encostada na borda de baixo,
o clamp devolvia zero de margem ali, então nem sobrava moldura transparente
para acusar. Medido no PNG que estava em produção: 693 px opacos na última
linha, em quatro linhas seguidas.

A fração chutada virou `fim_da_faixa_superior()`, que mede o primeiro vale de
linhas vazias depois da primeira faixa e corta no meio dele. O asset da nav foi
de 2194x649 para 2245x714, com 16 px de margem transparente exatos nos quatro
lados; o lockup do rodapé saiu com o mesmo tamanho de antes, o que confirma que
a correção mexeu só no recorte curto.

**O teste que faltava.** `tests/logo.test.ts` afirmava em comentário "sem
clipping em nenhuma das 8 bordas", mas nenhuma asserção olhava um pixel: as que
existiam liam bytes do IHDR, proporção e tamanho em disco, e um recorte que
decepa a base do desenho não move nenhum dos três de forma detectável. Foi
exatamente assim que isto chegou em produção com a suíte verde. O arquivo passou
a decodificar o alpha do PNG (inflate do IDAT e desfiltro sequencial, porque os
filtros Up/Average/Paeth referenciam a linha anterior e não há como ler só as
bordas) e exige zero pixel opaco nas quatro bordas, mais moldura transparente
entre 8 e 24 px por lado. Verificado contra o asset antigo antes de fechar: ele
reprova com `arte saindo pela base: expected 693 to be +0`.

Dimensões conhecidas-boas em `tests/logo.test.ts` foram **re-medidas**, não
alargadas, como o próprio arquivo exige.

### 15.9 Travessão, cobertura da varredura

`scripts/` estava fora dos alvos de `tests/travessao.test.ts` e tinha seis
travessões. Diretório e extensão `.py` entraram na varredura. Alvos atuais:
`src/`, `tests/`, `scripts/` e o README.
