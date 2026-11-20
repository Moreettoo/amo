---
name: AMO Sabores Saudáveis
description: Papelaria fina para bolos no pote zero açúcar. Cartão creme, script em cobre, Poppins leve e fio de 1 px.
colors:
  expresso: "#2B1B16"
  chocolate: "#4A2E25"
  cobre: "#C9784A"
  cobre-texto: "#9A5530"
  caramelo: "#E2BF96"
  creme: "#FAF2E9"
  papel: "#FFFBF5"
  linho: "#F6EBDD"
  kraft: "#D9BE98"
  suave: "#5E4A40"
  claro-suave: "#EADDD0"
  vinho: "#8E2F3C"
typography:
  display:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(40px, 4.4vw, 58px)"
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  script:
    fontFamily: "Allura, 'Snell Roundhand', 'Apple Chancery', cursive"
    fontSize: "1.75em"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0em"
  headline:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(28px, 3.3vw, 44px)"
    fontWeight: 300
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  body-sm:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.24em"
  detalhe:
    fontFamily: "Poppins, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
rounded:
  reto: "2px"
  miniatura: "3px"
  foto: "4px"
spacing:
  gutter: "clamp(20px, 5vw, 56px)"
  controles: "8px"
  grade-coluna: "28px"
  grade-linha: "56px"
  secao: "clamp(72px, 8vw, 112px)"
components:
  botao-escuro:
    backgroundColor: "{colors.expresso}"
    textColor: "{colors.creme}"
    rounded: "{rounded.reto}"
    padding: "14px 32px"
    height: "50px"
  botao-escuro-hover:
    backgroundColor: "transparent"
    textColor: "{colors.expresso}"
  botao-claro:
    backgroundColor: "{colors.creme}"
    textColor: "{colors.expresso}"
    rounded: "{rounded.reto}"
    padding: "14px 32px"
    height: "50px"
  botao-claro-hover:
    backgroundColor: "transparent"
    textColor: "{colors.creme}"
  botao-compacto:
    backgroundColor: "{colors.expresso}"
    textColor: "{colors.creme}"
    rounded: "{rounded.reto}"
    padding: "10px 20px"
    height: "44px"
  pilula:
    backgroundColor: "transparent"
    textColor: "{colors.expresso}"
    rounded: "{rounded.reto}"
    padding: "8px 18px"
    height: "44px"
  pilula-ativa:
    backgroundColor: "{colors.expresso}"
    textColor: "{colors.creme}"
  pilula-selo:
    backgroundColor: "transparent"
    textColor: "{colors.cobre-texto}"
    rounded: "{rounded.reto}"
  pilula-selo-ativa:
    backgroundColor: "{colors.cobre}"
    textColor: "{colors.expresso}"
  cartao-rotulo:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.expresso}"
    rounded: "{rounded.reto}"
    padding: "40px 40px 0"
  foto-moldura:
    backgroundColor: "{colors.linho}"
    rounded: "{rounded.foto}"
  nav:
    backgroundColor: "{colors.creme}"
    textColor: "{colors.expresso}"
    height: "64px"
  gaveta:
    backgroundColor: "{colors.creme}"
    textColor: "{colors.expresso}"
    width: "400px"
    padding: "22px 28px 28px"
  sumario:
    backgroundColor: "transparent"
    textColor: "{colors.expresso}"
    width: "208px"
  sumario-fileira-presa:
    backgroundColor: "{colors.creme}"
    textColor: "{colors.expresso}"
  botao-texto:
    backgroundColor: "transparent"
    textColor: "{colors.suave}"
  sacola-conta:
    backgroundColor: "{colors.expresso}"
    textColor: "{colors.creme}"
    rounded: "{rounded.reto}"
    height: "20px"
  campo:
    backgroundColor: "transparent"
    textColor: "{colors.expresso}"
    rounded: "{rounded.reto}"
    padding: "0 14px"
    height: "44px"
  quantidade:
    backgroundColor: "transparent"
    textColor: "{colors.expresso}"
    rounded: "{rounded.reto}"
    height: "50px"
  pagamento-opcao:
    backgroundColor: "transparent"
    textColor: "{colors.expresso}"
    rounded: "{rounded.reto}"
    padding: "12px 16px"
    height: "64px"
  resumo:
    backgroundColor: "transparent"
    textColor: "{colors.expresso}"
    width: "340px"
  resumo-barra:
    backgroundColor: "{colors.creme}"
    textColor: "{colors.expresso}"
    padding: "10px clamp(20px, 5vw, 56px)"
---

# Design System: AMO Sabores Saudáveis

## Overview

**Creative North Star: "A Papelaria Fina"**

O site é a papelaria da marca: cartão creme com um grão quase invisível, caligrafia em cobre, caixa alta espaçada só em rótulos curtos e um fio de 1 px que prende as fotos. O trio vem do próprio logo (a letra em script, a caixa alta espaçada de "Sabores Saudáveis" e o traço fino do pote) e vira o sistema inteiro. O código se chama assim nos próprios comentários ("papelaria fina"), e é assim que a home, o catálogo, a página 404, as duas gavetas e a sacola foram construídos.

O gosto do cliente manda: moderno, fino e delicado; nunca grosso, marcante ou cartoonizado. Por isso os títulos são Poppins de peso 300, os cantos têm de 2 a 4 px, os botões são retângulos sem sombra e o movimento é o de uma caneta, sem mola e sem quique. A paleta marrom, cobre e creme e a rolagem animada são decisões do cliente e não se discutem aqui. O que o cliente recusou está registrado como recusa: a fonte gorda dos títulos, as ondas, as fotos em arco e os botões e cartões "retrô" da versão anterior, além dos fios soltos, que ele chamou de "um risco perdido".

A página alterna três chãos inteiros: creme (hero, vitrine, marca, rodapé, o catálogo do topo ao corpo e a sacola inteira), caramelo (só "Hoje o dia pede") e expresso (rótulos, fecho da home, fecho do catálogo e topo do 404). Quem separa uma seção da outra é o espaço e a troca de cor, nunca uma linha.

**Key Characteristics:**
- Uma frase curta em script por título, dentro do `<em>`; todo o resto em Poppins leve ou regular.
- Fio de 1 px só onde ele segura alguma coisa.
- Cobre raro: script, fios, foco e o coração do logo.
- Cantos de 2 a 4 px, botões retos, sem sombra deslocada, sem rotação.
- A foto do produto convence antes do texto e nunca leva nada por cima.
- Movimento "a caneta": o script se escreve, a foto se revela por máscara reta, o resto aparece.
- A página inteira funciona sem JavaScript e com movimento reduzido.

**Em aberto com o cliente (não é regra ainda):**
- O nome do destino: hoje convivem "catálogo", "cardápio" e "receitas" nos botões e links. Falta escolher um só.
- A voz da seção final: hoje o título dela é Poppins leve sem frase em script, seguido da assinatura "AMO por você. Por seu AMO." numa voz só.
- A ligação entre as seções foi decidida em 2026-11-18: o cliente escolheu o Fio e a Costura entre as quatro ideias de `.impeccable/mocks/conexoes.html` (ver "O fio e a costura").
- A estrutura do catálogo foi decidida em 2026-11-18: o cliente escolheu "O sumário" entre as três estruturas de `.impeccable/mocks/decision/` (ver "O sumário").
- O pagamento e a cotação da entrega são de exemplo até o cliente escolher o meio (decisão de 2026-11-18: o pedido fecha no site, com gaveta e página). A sacola diz isso em texto (ver "A Regra do Exemplo Dito"); o lugar do código Pix no pedido feito é provisório e não é padrão.

## Colors

Marrom, cobre e creme, tirados do rótulo e do logo: uma família quente só, com um único acento.

### Primary
- **Cobre do Logo** (`cobre`): o acento. Aparece na frase em script sobre expresso, no fio deslocado atrás das fotos, na borda das gavetas, no traço desenhado dos links, no coração do logo e no anel de foco das superfícies escuras. Nunca é cor de texto corrido.
- **Cobre de Leitura** (`cobre-texto`): o cobre escurecido para texto sobre chão claro: a frase em script dos títulos, a regra da linha, os nomes de lista em caixa alta, o rótulo dos filtros, o tipo do produto, o hover de links.

### Secondary
- **Caramelo** (`caramelo`): o chão da seção "Hoje o dia pede", e só dela. Também é a cor da seleção de texto.

### Tertiary
- **Vinho da Tampa** (`vinho`): um único uso, o coração que surge ao lado do link do rodapé no hover e no foco. Não é cor de sistema; não espalhar.

### Neutral
- **Expresso** (`expresso`): o texto principal, os botões cheios, o chão dos blocos escuros, a barra do navegador, o quadradinho da contagem da sacola e o anel de foco nas superfícies claras.
- **Chocolate** (`chocolate`): texto e traços sobre caramelo e kraft, onde o cobre de leitura não tem contraste; fundo das capas enquanto a foto carrega em chão escuro.
- **Creme Cartão** (`creme`): o chão da página, com o grão. Texto e botão claro sobre expresso.
- **Papel** (`papel`): o cartão do rótulo e o cartão da linha única na gaveta.
- **Linho** (`linho`): fundo de espera das fotos em chão claro; variante do cartão de rótulo.
- **Kraft** (`kraft`): variante do cartão de rótulo para linhas futuras.
- **Texto Suave** (`suave`): texto secundário sobre claro (lead, frase do card, rodapé; no catálogo, a trilha, o lead do topo, as contagens e as linhas do sumário; na sacola, as etapas que ainda vêm, as dicas, os rótulos dos campos, os botões de texto e as notas).
- **Texto Suave Claro** (`claro-suave`): texto secundário sobre expresso (lead do topo do 404, assinatura, a contagem dentro da etiqueta atual do sumário no celular).

O fio fino é expresso diluído sobre claro (`rgb(43 27 22 / .18)`, token `--fio`) e creme diluído sobre escuro (`rgb(250 242 233 / .2)`). O contorno de um controle é mais firme (`rgb(43 27 22 / .38)`), porque precisa ser visto como controle; escolhido, ele vai a expresso.

### Named Rules
**A Regra do Cobre Raro.** Cobre é para script, fio e foco. Texto em cobre sobre chão claro usa `cobre-texto`; `cobre` puro como cor de texto só existe na frase em script das superfícies escuras. O teste `tests/movimento.test.ts` guarda isso. Motivo medido no código: cobre sobre creme dá 3,02:1; sobre expresso dá 4,93:1.

**A Regra do Chão que Decide.** A cor do script segue o chão, não o hábito: `cobre-texto` no creme, `cobre` no expresso, expresso no caramelo, chocolate no kraft. Cobre sobre caramelo mede 1,93:1 e cobre de leitura sobre kraft 3,17:1; por isso nenhum dos dois é usado ali.

**A Regra dos Três Chãos.** Creme, caramelo e expresso, sempre em bloco inteiro de fora a fora. Bloco escuro leva a classe de superfície escura, que troca o foco para cobre e o fio para creme diluído.

## Typography

**Display Font:** Poppins (com system-ui, -apple-system, sans-serif)
**Body Font:** Poppins (a mesma família)
**Script Font:** Allura (com "Snell Roundhand", "Apple Chancery", cursive)

**Character:** Poppins leve dá a voz adulta e moderna; Allura, escolhida pelo cliente entre quatro scripts gratuitas, é a caligrafia do convite. A página carrega só estas duas famílias (guardado por `tests/fundacao.test.ts`) e quatro pesos de Poppins: 300 nos títulos, 400 no corpo, 500 e 600 nos rótulos.

### Hierarchy
- **Display** (300, `clamp(40px, 4.4vw, 58px)` no desktop e `clamp(32px, 5.2vw, 46px)` no celular, 1.1, -0.03em): a primeira linha do H1 da home. O título do topo do catálogo e do 404 tem a mesma entrelinha e o mesmo tracking, mas um clamp só para todas as larguras, `clamp(32px, 4.4vw, 56px)`: 2 px abaixo do teto da home. O da sacola é um degrau abaixo, `clamp(32px, 4.4vw, 52px)`, com a mesma entrelinha e o mesmo tracking.
- **Script** (Allura 400, 1.05, sem tracking): a frase curta dentro do título. Nos títulos de seção mede 1.75em do título e, no topo do catálogo e do 404, 1.8em; no título da sacola, 1.5em; no H1 da home vai a `clamp(118px, 13.4vw, 196px)` e passa por cima da borda da foto; no cartão do rótulo fecha o cartão a 38 px.
- **Headline** (300, `clamp(28px, 3.3vw, 44px)`, 1.2, -0.02em): títulos de seção e o nome da categoria em cada capítulo do catálogo (este sem script).
- **Title** (400, 22 px, 1.2, -0.01em): nome do produto no card (18 px no celular) e nome da linha no capítulo do catálogo (17 px quando divide a fileira com o nome da categoria); 26 px no cartão do rótulo; 21 px na gaveta. Na sacola, o nome da etapa atual vai a 22 px e o das outras a 18 px.
- **Body** (400, 17 px, 1.65, até 52ch): texto das seções. O lead do hero é 300, `clamp(17px, 1.45vw, 19px)`, 1.7, até 42ch.
- **Body pequeno** (400, 15 px, 1.6): frase do card, links, itens de lista, botões (500).
- **Detalhe** (400, 14 px): o texto pequeno de apoio. A trilha, as contagens de receitas do catálogo e da gaveta (em números tabulares no catálogo), a linha "Mostrando 7 de 7 receitas.", o rótulo dos filtros ("Na vontade de", peso 500, em cobre de leitura, no catálogo e na vitrine), o botão compacto (500) e a frase do card abaixo de 520 px. Na sacola: a linha de resumo de cada etapa, a dica das que ainda vêm e o "Alterar". É anterior ao sumário e só agora entra na escala. Abaixo dele há linhas de 13 px que não formam um degrau: a pergunta acima do atalho "Hoje o dia pede" (no catálogo e na gaveta), o tipo do produto no card (500), o copyright do rodapé e, na sacola, o rótulo dos campos, o "Tirar", os avisos e as notas.
- **Label** (600, 12 a 13 px, 0.24em a 0.28em, caixa alta): a regra da linha ("Zero açúcar"), os nomes das listas do rodapé e da gaveta, o rótulo "Sumário" do catálogo e o rótulo "Resumo" da sacola. Os selos no card são a versão calma: 500, 12 px, 0.1em.

### Named Rules
**A Regra das Duas Vozes.** Um título começa em Poppins leve e termina em script: uma frase curta, dentro do `<em>`, em linha própria. Nunca um título inteiro em script, nunca script em texto corrido.

**A Regra da Voz Única por Linha.** Caixa alta espaçada e script não dividem a mesma linha. O cliente rejeitou essa mistura na assinatura, que hoje é uma voz só.

**A Regra da Minúscula no Script.** Palavras que mudam (a vontade do dia, a frase em script do título do catálogo) vão em minúscula no script: as maiúsculas da Allura confundem ("Fruta" lia "Truta").

**A Regra do Rótulo que Não Sobe.** A caixa alta espaçada nomeia uma lista (o rodapé, a gaveta, o sumário, o resumo da sacola) ou afirma a regra da linha logo abaixo do título; no capítulo do catálogo a regra fica ao lado do nome da linha. Não existe rótulo solto acima de um título.

## Layout

Coluna central de 1240 px com gutter fluido (`clamp(20px, 5vw, 56px)`), o que dá 1128 px de conteúdo; a nav usa a mesma medida. As seções respiram com `clamp(72px, 8vw, 112px)` em cima e embaixo, e é esse espaço, junto com a troca de chão, que separa uma da outra.

As composições são assimétricas, de duas colunas desiguais (texto de um lado, foto ou cartão do outro: 0.9/1.1, 1.05/0.95, 0.72/1.28), e viram uma coluna no celular. No hero o script cruza a borda esquerda da foto do destaque só no desktop; no celular a foto fica logo abaixo dele. A grade de produtos tem colunas de no mínimo 230 px com vão de 56 px por 28 px; na vitrine da home são sempre quatro numa fileira ou duas e duas, nunca três e um órfão. No catálogo com sumário, a partir de 821 px, o mínimo cai para 190 px: ao lado da coluna do sumário cabem quatro fotos por fileira na largura cheia. Sem sumário valem os 230 px.

Quebras observadas: 520 px (grade e cartão compactos), 820/821 px (uma coluna vira duas; nav de celular; o resumo da sacola vira barra embaixo), 900 px (grade do hero e quatro colunas da vitrine), 1024 px (título ao lado do cartão do rótulo). Alvos de toque de 44 px no celular, muitas vezes por uma área invisível em volta do texto para o desenho continuar fino. A nav tem 64 px, é opaca e fica presa no topo; as âncoras descontam 96 px (150 px no catálogo do celular com sumário, por causa da fileira presa).

O catálogo é uma página só, creme do topo ao corpo, que fecha num bloco expresso com a assinatura. De cima para baixo: o topo, os filtros de fora a fora (o rótulo "Na vontade de", as etiquetas de vontade, as de selo e, à direita, a linha que diz quantas receitas estão na tela) e o miolo. Com sumário o miolo tem duas colunas a partir de 821 px, a do sumário com 208 px e a das receitas com o resto, a 64 px uma da outra; sem sumário as receitas ocupam tudo. No celular cada grupo de filtros é uma fileira só, que rola de lado e sangra até a borda da tela: empilhados, eles empurravam as fotos para fora da primeira tela.

A sacola também é uma página só, creme, com a nav e o rodapé de sempre. O título começa a 64 px mais `clamp(28px, 4vw, 48px)` do topo e, abaixo dele, vêm duas colunas: as etapas com o resto da largura e o resumo com 340 px, a `clamp(48px, 7vw, 80px)` uma da outra. O resumo fica preso a 96 px do topo enquanto as etapas rolam. Com 820 px ou menos tudo vira uma coluna e o resumo vira uma barra presa embaixo da tela, de fora a fora (ver "A sacola").

"Hoje o dia pede" é a única seção pinada: o painel gruda na tela e a rolagem troca a vontade. O pino só existe com JavaScript, sem movimento reduzido e com janela alta o bastante (700 px no desktop, 800 px no celular); fora disso a seção é um bloco comum com abas.

## Elevation & Depth

O sistema é plano. A profundidade vem da troca de chão e do fio cobre deslocado atrás das fotos, que faz o papel que uma sombra faria. Não há sombra dura deslocada em lugar nenhum.

### Shadow Vocabulary
- **Cartão sobre a mesa** (`box-shadow: 0 30px 60px -30px rgb(0 0 0 / .7)`): só o cartão do rótulo, sobre expresso. É difusa e fica quase toda embaixo do cartão.
- **Nav ao rolar** (`box-shadow: 0 12px 30px -22px rgb(43 27 22 / .5)`): aparece depois de 40 px de rolagem e é a única coisa que muda na barra. No catálogo do celular, quando a fileira do sumário gruda embaixo da nav, essa mesma sombra passa para baixo da fileira e a nav fica sem a dela.
- **Barra do resumo** (`box-shadow: 0 -12px 30px -22px rgb(43 27 22 / .5)`): a sombra da nav virada para cima, só na barra do resumo que fica presa embaixo da sacola no celular.
- **Fundo da gaveta** (`rgb(43 27 22 / .6)` com `blur(2px)`): o véu atrás das duas gavetas abertas.

### Named Rules
**A Regra do Fio no Lugar da Sombra.** Uma foto ganha presença pelo fio de 1 px deslocado atrás dela (12 px nas grandes, 7 px nas pequenas, 14 px na da vontade), não por sombra. Botões, pílulas e cards de produto não têm sombra em nenhum estado.

## Shapes

Retângulos de papel cortado. Controles e cartões têm canto de 2 px, miniaturas 3 px, fotos 4 px. Nada gira, nada ondula, nada vira arco. A única forma redonda do código é a janela do formato "bolo inteiro", que é um círculo porque o produto é redondo; hoje nenhuma linha cadastrada usa esse formato.

O fio tem sempre 1 px e sempre segura alguma coisa: a moldura deslocada da foto, a borda de baixo da nav, a borda das gavetas do lado que abre, o contorno de um controle, a moldura interna do cartão do rótulo (a 8 px da borda, em cobre a 60%), as divisões dentro desse cartão o trilho do sumário do catálogo e o fio das etapas da sacola, que seguram o coração, e a linha de soma acima de cada total da sacola. O sublinhado dos links é um traço desenhado à mão em cobre (1.4 px, ponta redonda) que só aparece no hover e no foco.

O coração do logo, em cobre, é a marca que aponta: fica na frente da regra da linha e do item em que a pessoa está. No sumário do catálogo e nas etapas da sacola ele pousa no fio e desliza até o item atual. As setas e os ícones dos selos são traço fino (1.4 a 1.5 px), sem preenchimento.

### Named Rules
**A Regra do Fio que Segura.** Uma linha de 1 px só existe se prende alguma coisa. Fio entre seções, em volta de uma frase ou acima do copyright é "um risco perdido": saiu, e não volta. Teste: tire o fio; se nada ficar solto, ele não devia estar ali.

**A Regra do Canto de Papel.** Cantos de 2 a 4 px. Pílula de verdade, canto grande e círculo decorativo não fazem parte do sistema.

## Components

Controles finos e contidos: contorno de 1 px, peso leve, e o mesmo efeito no mouse e no teclado. Efeito de mouse só existe dentro de `@media (hover: hover)`, e tudo que é focável repete o efeito em `:focus-visible` (guardado por teste). O anel de foco é de 2.5 px com 3 px de afastamento: expresso no claro, cobre no escuro.

### Buttons
- **Shape:** retângulo de canto reto (2 px), 50 px de altura mínima, sem sombra.
- **Primary (escuro):** expresso cheio com texto creme, Poppins 500 de 15 px com 0.02em, 14 px por 32 px. Usado sobre creme e caramelo.
- **Claro:** creme cheio com texto expresso, para os blocos expresso.
- **Compacto:** 44 px de altura, 10 px por 20 px, 14 px; é o da nav.
- **Hover / Focus:** inverte para contorno (fundo transparente, texto na cor do botão) em 0.28 s, sem mudar de largura. Pressionado encolhe a 0.98.
- **De texto:** para a ação pequena ao lado de um item ("Alterar", "Tirar", "Escolher mais"): 13 a 14 px em `suave`, sublinhado de 1 px na cor do fio, a 4 px do texto. No hover e no foco o texto vai a expresso e o sublinhado a cobre. Uma área invisível de 44 px de altura em volta garante o toque.
- **Saída discreta:** "Continuar escolhendo" e "Voltar ao catálogo", embaixo do botão principal: texto expresso de 14 a 15 px, centrado, em 44 px de altura, sem sublinhado, que vai a `cobre-texto` no hover e no foco.

### Chips
- **Style:** a "pílula" é uma etiqueta reta (2 px) de contorno fino, 44 px de altura, Poppins 400 de 15 px, com a contagem pequena ao lado em números tabulares.
- **State:** escolhida, no hover e no foco enche de expresso com texto creme. A do selo se distingue pela cor (contorno e texto em cobre de leitura; ativa enche de cobre com texto expresso), não por tracejado. Sobre expresso há a versão clara, que enche de creme.
- No celular do catálogo, o sumário e cada grupo de filtros viram uma fileira só dessas etiquetas, que rola de lado e sangra até a borda da tela.

### Cards / Containers
- **Card de produto:** não é uma caixa. É a foto (4/5, canto de 4 px, fundo linho) e o texto solto embaixo: nome, tipo em cobre de leitura (13 px, 500), selos em caixa alta calma e a frase. Sem borda, sem fundo, sem sombra. Quando clica, o link mora no nome e cobre o card inteiro; a foto amplia a 1.04 em 0.9 s e o nome vai a cobre de leitura. O nome é h3 na vitrine da home e h4 no catálogo, onde vem depois da categoria (h2) e da linha (h3); o desenho é o mesmo.
- **Foto com fio:** retângulo de 4 px com o fio cobre deslocado atrás. Não clica e não reage ao mouse. Sobre caramelo o fio é chocolate.
- **Cartão do rótulo (assinatura do sistema):** papel reto de 2 px sobre expresso, com a moldura interna de fio cobre, o nome da linha, a regra em caixa alta, os selos com ícone de traço, o modo de aproveitar numerado e a frase da linha em script fechando o cartão. As divisões internas são fios de 1 px (`rgb(43 27 22 / .2)`). Com uma linha só ele fica largo e se divide em duas colunas. É onde o rótulo real vira prova. Mora na home: o catálogo não mostra o cartão, só a regra de cada linha ao lado do nome dela.

### Inputs / Fields
Os campos e o contador nasceram na página do produto, e a sacola os reaproveita.
- **Campo:** contorno de controle de 1 px, canto de 2 px, fundo transparente, 44 px de altura, 14 px de recuo, Poppins 400 de 15 px em números tabulares. O rótulo fica visível em cima, 13 px em `suave`, a 6 px do campo. O foco é o anel da casa. Com erro, o contorno vai a `cobre-texto` e a mensagem aparece embaixo, 13 px em `cobre-texto`; o erro que vale para o grupo (o da entrega) vai em 14 px numa linha já reservada, para a página não pular. A largura segue o que se espera escrever: CEP 160 px, número 110 px, nome e celular dividem a fileira, e-mail e complemento ocupam a linha inteira.
- **Contador de potes:** menos, o número e mais dentro de um contorno de controle só, canto de 2 px. Botões de 44 por 50 px com os sinais em traço fino (15 px, 1.4 px); o número em 16 px, 500, tabular. No limite o sinal apaga (expresso a 30%); no hover e no foco vai a `cobre-texto`. A versão compacta, da gaveta da sacola e da lista de potes, desenha os botões com 36 px e o número com 15 px; uma área invisível em volta leva o alvo do toque a 44 px.
- **Opção de pagamento:** uma linha inteira por opção, contorno de controle, canto de 2 px, 64 px de altura mínima, 12 px por 16 px, o rádio nativo de 18 px em expresso e o nome em 16 px; a linha inteira é o alvo. No hover o contorno vai a expresso. A escolhida vai a expresso e ganha um segundo fio por dentro (`box-shadow: inset 0 0 0 1px` expresso), que lê como um contorno de 2 px: é traço, não profundidade.

### Navigation
- **Nav:** barra creme de fora a fora, 64 px, com um fio embaixo; opaca desde o primeiro pixel. Da esquerda para a direita: botão "Catálogo" com o ícone de três fios, logo, links da home em Poppins 400 de 15 px com o traço desenhado no hover, o botão compacto e, por último, o botão "Sacola". No celular os links saem da barra e moram na gaveta.
- **Botão Sacola:** o ícone da sacola de papel em traço fino (20 px, 1.4 px) e a palavra, Poppins 400 de 15 px, sem contorno; vai a `cobre-texto` no hover e no foco e abre a gaveta da sacola. Com potes na sacola aparece a contagem num quadradinho expresso de 20 px, canto de 2 px, número creme de 12 px, 500, tabular. No celular a palavra fica só para o leitor de tela, o botão vira um quadrado de 44 px e a contagem sobe para o canto do ícone, com 18 px. Sem JavaScript o botão não aparece.
- **Gavetas:** a mesma casca para as duas, um `<dialog>` modal com uma folha creme de 400 px (até 340 px ou 88vw no celular) e um fio cobre na borda que abre. A do catálogo entra pela esquerda; a da sacola, pela direita. Dentro, nenhum fio entre os itens: quem separa é o espaço e a miniatura de cada sabor. O fechar é um quadrado de 44 px com o contorno da pílula. Aberta, a gaveta trava a página de trás; a calha da barra de rolagem fica expresso com a do catálogo e creme com a da sacola, colada na folha.
- **Trilha e listas:** a seta entre os itens é desenhada, não é texto. O item atual leva peso 500 e o coração do logo antes do nome.
- **Link com traço:** texto de 15 a 16 px com um traço cobre que se desenha embaixo em 0.5 s. Onde o link leva a outro lugar, uma seta fina diz para onde e anda 3 a 4 px no hover.

### O topo do catálogo e o do 404
A mesma peça em dois chãos.
- **Catálogo (creme):** sem foto de capa. A trilha (14 px, em `suave`, com o item atual em expresso e peso 500), o título em duas vozes (Poppins leve e a frase em script, em minúscula e em `cobre-texto`) e o lead (300, `clamp(17px, 1.45vw, 19px)`, até 42ch, em `suave`). A partir de 821 px o lead vai para uma coluna de 380 px à direita, pela base do título; no celular fica embaixo dele. Os filtros e a primeira fileira de fotos vêm logo abaixo.
- **404 (expresso):** o título em duas vozes com o script em `cobre`, o "Erro 404" no lugar da regra da linha (abaixo do título), o lead em `claro-suave` e os dois caminhos de volta: um botão e um link com traço e seta.

### O sumário (o índice do catálogo)
Decisão do cliente em 2026-11-18. O catálogo é uma página só, em capítulos, e o sumário diz onde a pessoa está e leva de um capítulo a outro em um toque. Só existe quando há o que escolher: 2 ou mais categorias, ou 2 ou mais linhas. Com o cadastro de hoje (uma categoria, uma linha) ele não aparece. A seção atual é a última cujo começo passou de 35% da altura da janela.
- **No desktop (821 px ou mais):** coluna de 208 px à esquerda das receitas, presa a 96 px do topo; se não couber na janela, rola por dentro. Em cima, o rótulo "Sumário" em caixa alta espaçada (600, 12 px, 0.24em, `cobre-texto`). Abaixo, as categorias (17 px, expresso, 44 px de altura) com a contagem à direita em números tabulares (500, 12 px, `suave`) e as linhas de cada uma recuadas 14 px (15 px, `suave`, 36 px de altura). Na borda esquerda corre um fio de 1 px (`--fio`) e, pousado nele, o coração do logo em cobre, de 13 px, na altura do item atual. A categoria atual vai a peso 500 e a linha atual a expresso. Embaixo, o atalho "Hoje o dia pede": a pergunta em 13 px e o destino em 17 px com a seta fina. Rótulo, lista e atalho começam na mesma vertical.
- **No celular (820 px ou menos):** uma fileira das etiquetas retas que rola de lado, de fora a fora, presa a 64 px do topo, embaixo da nav. Uma etiqueta por categoria, com a contagem; com uma categoria só, as etiquetas são as linhas dela. A atual enche de expresso e vem para a vista. Solta, a fileira não tem fundo. Presa, vira barra: fundo creme, um fio embaixo e a sombra da nav, que passa para baixo dela enquanto a nav perde o próprio fio e a própria sombra, de modo que as duas leem como uma barra só. Só então aparece o coração, de 11 px, pousado no fio da barra embaixo da etiqueta atual. O rótulo, as linhas recuadas e o atalho não entram na fileira; o atalho fica no fim das receitas.
- **Estados:** no hover e no foco o link vai a `cobre-texto`. O item que o filtro zerou recua para `suave` e continua link: tocar nele limpa o filtro. Tocar num item conduz a rolagem até a seção dele.
- **Movimento:** o coração desliza até o item atual em 0.5 s, na curva da casa. Com movimento reduzido ele troca de lugar sem deslizar.
- **Sem JavaScript:** os links são âncoras comuns, não há item atual nem coração, e a fileira do celular já nasce barra.

### Os capítulos do catálogo
Um capítulo por categoria e, dentro dele, uma seção por linha. O nome da categoria vai no degrau Headline (Poppins 300), sem script. O topo de cada linha é uma fileira alinhada pela base do texto: o nome da linha no degrau Title, a regra da linha em caixa alta espaçada com o coração na frente e, à direita, a contagem ("7 receitas", 14 px, números tabulares, em `suave`). Com uma linha só na categoria, o nome da linha (a 17 px), a regra e a contagem sobem para a fileira do nome da categoria; a linha que repete o nome da categoria não mostra o nome. No celular o nome da categoria fica numa fileira só dele e a contagem desce para uma fileira própria, à esquerda. Entre dois capítulos há `clamp(84px, 9vw, 124px)` e entre duas linhas `clamp(60px, 6.5vw, 84px)`: quem separa é o espaço, nunca uma linha. A ordem dos títulos é h2 (categoria), h3 (linha), h4 (produto). O filtro que esvazia uma linha ou uma categoria tira a seção inteira da página.

### O fio e a costura (a ligação entre as seções)
Decisão do cliente em 2026-11-18, só na home. As duas existem para a página não ser uma pilha de blocos.

**O fio** é um traço cobre único de 1.5 px (`src/lib/fio.ts` traça, `src/components/layout/Fio.tsx` mede e desenha). Ele sai de baixo de "comer bem.", sublinha o script de cada seção, passa por trás de cada foto e do cartão do rótulo, como o barbante que prende a etiqueta ao pote, e termina num coração ao lado de "AMO por você. Por seu AMO.". Ele obedece à regra do Fio que Segura: nunca fica solto, sempre sublinha ou amarra alguma coisa. As seções marcam as âncoras com `data-fio` (`inicio`, `sub`, `atras`, `fim`).
- Em colunas, depois de sublinhar ele vai até a margem e desce por ela: não risca texto.
- No celular não há margem. Ele sai da tela por uma lateral, numa curva aberta, e volta mais abaixo: nunca desce reto pela beirada nem vira de uma vez.
- Em "Hoje o dia pede", que fica presa na tela, o trecho do fio mora dentro do painel e se desenha ao longo da seção inteira. Sobre o caramelo ele vai em `cobre-texto`.
- A ponta acompanha a rolagem, a 60% da altura da tela. Com movimento reduzido ele nasce inteiro; sem JavaScript não há fio, e a página segue completa.

**A costura** é uma peça atravessando a emenda entre duas seções, para ela não ser um corte reto: o cartão do rótulo fica pendurado sobre a seção da marca (em qualquer largura, quando há uma linha só) e a foto do fecho sobe para dentro da seção da marca (em colunas). As duas deslizam até 30 px por cima da emenda enquanto cruzam a tela, onde o navegador liga animação à rolagem. Entre a vitrine e "Hoje o dia pede" não há costura: o painel preso recorta o que passa dele.

### A sacola: o fio das etapas
Decisão do cliente em 2026-11-18: o pedido fecha no site, numa página só, e a gaveta da sacola é o atalho até ela. As etapas não são páginas nem uma barra de progresso numerada: são uma lista presa num fio.
- **O título segue o estado.** É o H1 em duas vozes: "Sua sacola" em Poppins leve e a frase em script, em `cobre-texto`, "quase pronta" com potes e "ainda vazia" sem eles. Feito o pedido, vira "Pedido N" com "recebido" em script e recebe o foco. Enquanto o navegador lê a sacola, o título vem sem frase e a área fica reservada, para a página não dizer "vazia" a quem tem potes.
- **O fio das etapas.** Quatro etapas ("1. Os potes", "2. Entrega", "3. Seus dados", "4. Pagamento") recuadas 40 px (30 px no celular), com um fio de 1 px (`--fio`) correndo pela margem esquerda, de ponta a ponta da lista. O coração do logo, em cobre, de 13 px, pousa no fio na altura do nome da etapa atual e desliza até a próxima em 0.5 s, na curva da casa; com movimento reduzido ele troca de lugar sem deslizar.
- **A etapa feita vira linha.** Concluída, a etapa fecha numa linha de resumo de 14 px em expresso e números tabulares ("4 potes"; o CEP, o número e o Uber com o valor; nome e celular), com o botão de texto "Alterar" à direita do nome. As que ainda vêm mostram o nome em `suave` (18 px) e uma dica de uma linha (14 px, `suave`). A atual tem o nome em expresso a 22 px e o formulário aberto embaixo.
- **Os potes.** Uma fileira por sabor: miniatura de 64 por 80 px (canto de 3 px, fundo linho), o nome (16 px, link para o produto) com o tipo e o preço por pote em 13 px `suave`, o contador compacto com "Tirar" ao lado e, à direita, o total da fileira (16 px, tabular). Entre uma fileira e outra corre um fio de 1 px. No celular o total sobe para o lado do nome e o contador desce para baixo dele.
- **O resumo.** Coluna de 340 px presa a 96 px do topo: o rótulo "Resumo" em caixa alta espaçada (600, 12 px, 0.24em, `cobre-texto`), as contas em 15 px (subtotal com a contagem de potes; entrega, que diz "informe o CEP" em `suave` até ser calculada) e o total sobre a linha de soma, com o número grande e leve (300, 34 px, -0.02em, tabular). Embaixo, um botão escuro só, de largura inteira, cujo texto diz o passo ("Continuar para a entrega", "Calcular e continuar", "Continuar para o pagamento", "Fazer o pedido · R$ 92,80"). Ele envia o formulário da etapa atual pelo atributo `form`; dentro das etapas não há outro botão de avançar. Enquanto calcula ou envia, o texto diz o que está fazendo e o botão fica a 75%. Depois vêm a saída discreta "Voltar ao catálogo" e uma nota de 13 px em `suave`.
- **No celular (820 px ou menos)** o resumo vira uma barra presa embaixo da tela, de fora a fora: fundo creme, um fio em cima, a sombra da barra do resumo e a margem da área segura do aparelho. Ficam só o total (a palavra em 12 px `suave` sobre o número em 22 px) e o mesmo botão, com 48 px de altura e até 62% da largura. A barra acompanha as etapas e fica para trás quando a página chega ao rodapé.
- **O pedido feito.** Uma coluna de até 620 px: o título "Pedido N recebido", o texto que diz que o pedido é de exemplo, a lista do que foi pedido com a entrega e o total sobre a linha de soma, e o botão escuro de volta ao catálogo.
- **Sem JavaScript** a sacola não existe: a página diz isso numa frase e leva ao catálogo.

**A Regra do Exemplo Dito.** Enquanto o pagamento e a cotação do Uber forem simulados, a página diz isso em texto, no ponto em que o valor aparece: "(valor de exemplo)" na linha de resumo da entrega e no pedido feito, "Pagamento de exemplo: por enquanto nenhum valor é cobrado." embaixo das opções de pagamento, e o texto do pedido feito. É texto no tom do texto em volta; não ganha selo nem faixa.

### A gaveta da sacola
O espelho da gaveta do catálogo, vindo da direita. Abre pelo botão "Sacola" da nav e sozinha quando um pote entra na sacola. Em cima, o título "Sacola" (30 px) e a frase "N potes esperando por você." (15 px, `suave`). Uma fileira por sabor, sem fio entre elas: miniatura de 56 por 70 px (canto de 3 px), o nome em 16 px com o total da fileira à direita (500, tabular) e, embaixo, o contador compacto e "Tirar". No pé, empurrado para o fim da folha: o subtotal sobre a linha de soma (a palavra em 15 px, 500; o número em 26 px, 300, -0.02em), a nota "A entrega pelo Uber é calculada no próximo passo." (13 px, `suave`), o botão escuro de largura inteira "Ver sacola e fechar o pedido" e a saída discreta "Continuar escolhendo", que fecha a gaveta. Vazia, ela diz isso numa frase e oferece o botão "Ver o catálogo". Os itens entram a cada 35 ms, como na do catálogo.

### As duas portas (a conta)
Decisão do cliente em 2026-11-20, entre três esboços (`.impeccable/mocks/decision/conta-*.html`; contrato em `.impeccable/surfaces/src-app-entrar-page-tsx.md`). Entrar e criar conta são uma porta só, com duas abas sobre um fio, e não a página de login genérica com cartão flutuante e o "não tem conta?" perdido no pé. Valem para `/entrar`, `/cadastro`, `/esqueci-a-senha`, `/conta/excluir` e `/conta/excluida`.
- **A casca.** A nav e o rodapé do site e, entre eles, uma coluna de 440 px centrada (no celular, a largura com o gutter da casa). Em cima, o H1 centrado em duas vozes: a palavra em Poppins 300 (32 a 44 px, -0.03em) e, embaixo, a frase em script a 1,5 vez, em `cobre-texto`: "Que bom" e "ter você aqui" nas duas portas, "Vamos criar" e "uma senha nova" na recuperação, "Excluir" e "sua conta" na exclusão.
- **As abas.** "Entrar" e "Criar conta", meia largura cada, 48 px de altura, 16 px em `suave`; a atual vai a expresso, peso 500, com `aria-current`. Embaixo corre o fio de 1 px (`--fio`) e, pousado nele, o coração do logo em cobre, de 13 px, no meio da aba atual. São links para `/entrar` e `/cadastro` (com a `volta`); com JavaScript a troca não recarrega: o formulário troca no lugar, o endereço vira o da aba nova e o e-mail já digitado passa de um formulário ao outro.
- **O formulário.** Campos de contorno fino com o rótulo em cima (13 px, `suave`), 16 px entre um e outro. No cadastro, nome e celular lado a lado (1,3 para 1; empilham a 520 px ou menos), o celular com a máscara enquanto digita; e-mail; senha com a dica "8 caracteres ou mais." em 13 px `suave`; os dois aceites em caixas de 18 px com o texto em 14 px, o de novidades desmarcado. A senha tem "mostrar" dentro do campo: botão de texto de 13 px em `suave`, sublinhado no fio, com `aria-pressed`, que troca o tipo do campo.
- **O fim do formulário.** Um bloco só, colado ao último campo: a verificação contra robôs (Turnstile, invisível até pedir desafio), a linha do erro geral já reservada (14 px, `cobre-texto`, `role="alert"` quando há erro), a 6 px do botão escuro reto de largura inteira. Do último campo ao botão são 43 px, com ou sem erro, e a página não pula quando o erro aparece. Enquanto envia, o botão diz o que faz ("Entrando", "Criando a conta", "Conferindo o código"), sem reticências, e fica a 75%. Embaixo, uma nota centrada de 13 px em `suave` ("Esqueci a senha"; "Enviamos um código de 6 dígitos para confirmar o seu e-mail.").
- **O erro de campo** é uma frase curta embaixo do campo, em `cobre-texto`, ligada a ele por `aria-describedby`, com o contorno do campo em `cobre-texto`. Nunca um alerta vermelho nem uma caixa.
- **O passo do código.** Depois de criar a conta (ou de entrar com o e-mail ainda não confirmado), a aba "Criar conta" troca o formulário por: "Enviamos um código de 6 dígitos para" com o e-mail em negrito, o campo "Código" (teclado numérico, preenchido pelo código que chega no aparelho), o botão "Confirmar" e, embaixo, os botões de texto "Reenviar código" e "Usar outro e-mail" (14 px, `suave`, sublinhados no fio, alvo de 44 px). O reenvio confirma em `aria-live` com "Enviamos outro código.".
- **Recuperar a senha.** Os dois passos ("1. Seu e-mail", "2. Código e senha nova") sobre o fio das etapas da sacola: recuo de 40 px, fio de 1 px, coração de 13 px no passo atual, o nome do atual em expresso a 22 px e o do outro em `suave` a 18 px com uma dica de 14 px. O e-mail passa de um passo ao outro dentro da página, nunca na URL. No passo 1, o botão de texto "Já tenho o código"; embaixo de tudo, "Voltar para entrar".
- **Excluir a conta.** O que some e o que fica numa frase de 15 px em expresso, a senha de novo, a caixa "Entendo que a conta não volta depois de excluída." e o botão "Excluir minha conta". Com pedido em andamento, só a frase que explica e o link "Ver os pedidos". Depois de excluir, `/conta/excluida`: o mesmo título, "Sua conta foi excluída." e o botão "Voltar para a página inicial".
- **Estados:** hover e foco levam abas e botões de texto a expresso e o sublinhado a cobre; links da nota vão a `cobre-texto`.
- **Movimento:** trocar de aba desliza o coração pelo fio até a aba nova em 0.5 s, na curva da casa. Com movimento reduzido, ou sem JavaScript, ele troca de lugar sem deslizar.
- **Sem JavaScript:** as abas são links e cada rota já nasce na aba certa; os formulários enviam e voltam com a resposta.

### A palavra da vontade (assinatura do sistema)
Em "Hoje o dia pede" a frase em script é uma palavra só, em minúscula e em expresso sobre caramelo, com um traço chocolate embaixo. A cada troca as letras saem e a palavra se reescreve da esquerda para a direita. A altura é fixa para a página não pular. A legenda e as miniaturas ficam embaixo da foto, sem sobrepor.

### Movimento: a caneta
Três verbos e nada fora deles. **Escrever:** o script surge por `clip-path` da esquerda para a direita (1 a 1.25 s); nos títulos de seção, ligado à rolagem onde o navegador suporta. **Revelar:** a foto sobe por trás de uma máscara reta (0.9 a 1.1 s). **Aparecer:** o resto chega com opacidade e 10 px de subida (0.6 s). A curva da casa é `cubic-bezier(0.16, 1, 0.3, 1)`. Além disso há rolagem suave e um parallax leve nas fotos (ampliadas a 1.1, deslocando de -4% a +4%).

No catálogo: o script do título se escreve (1.1 s) e o lead aparece (0.6 s, depois de 0.55 s). O nome de cada capítulo aparece enquanto entra na tela e termina assim que está inteiro nela, de modo que parado nunca fica meio apagado; isso só onde o navegador liga animação à rolagem, e nos outros ele já nasce no lugar. O deslize do coração do sumário é uma transição de `transform`, não um keyframe, e some com movimento reduzido.

Nas gavetas: as duas usam o mesmo par de keyframes, e o lado de onde entram é uma variável (`--de`: -100% a do catálogo, 100% a da sacola). Entram em 0.42 s na curva da casa, saem em 0.25 s e os itens chegam a cada 35 ms. Na sacola, o coração das etapas desliza como o do sumário: transição de `transform` de 0.5 s, que some com movimento reduzido.

Limites, todos guardados por `tests/movimento.test.ts`: os keyframes só animam `transform`, `opacity`, `clip-path` e `stroke-dashoffset`; nada em loop; nenhuma animação passa de 2 s somando duração e atraso; nenhuma curva passa do ponto e volta; toda regra de movimento começa por `html.js` e mora dentro de `prefers-reduced-motion: no-preference`. Sem JavaScript ou com movimento reduzido tudo nasce no estado final.

## Do's and Don'ts

### Do:
- **Do** escrever títulos em duas vozes: Poppins 300 e, no fim, uma frase curta em Allura dentro do `<em>`, em linha própria.
- **Do** usar `cobre-texto` para qualquer texto em cobre sobre chão claro, e conferir o chão antes de colorir o script (expresso no caramelo, chocolate no kraft).
- **Do** separar seções com espaço (`clamp(72px, 8vw, 112px)`) e troca de chão entre creme, caramelo e expresso.
- **Do** prender as fotos com o fio de 1 px deslocado atrás (12 px nas grandes, 7 px nas pequenas) e canto de 4 px.
- **Do** manter cantos de 2 a 4 px e botões retos que invertem para contorno no hover e no foco.
- **Do** dar ao teclado o mesmo efeito do mouse, e pôr todo efeito de mouse dentro de `@media (hover: hover)`.
- **Do** manter alvos de 44 px no celular, com área invisível quando o desenho precisa continuar fino.
- **Do** animar só com escrever, revelar e aparecer, atrás de `html.js` e de `prefers-reduced-motion: no-preference`.
- **Do** deixar a foto do produto limpa: selos, nome e legenda moram no texto, embaixo dela.
- **Do** usar o coração do logo, em cobre, para apontar a regra da linha, o item atual e a etapa atual da sacola.
- **Do** mostrar o sumário só quando há o que escolher: 2 ou mais categorias, ou 2 ou mais linhas.
- **Do** dizer em texto, no ponto em que o valor aparece, o que ainda é de exemplo (a entrega e o pagamento da sacola).

### Don't:
- **Don't** traçar fio solto: divisor entre seções, fios em volta de uma frase, fio acima do copyright. O cliente chamou isso de "um risco perdido".
- **Don't** usar fonte gorda nos títulos, ondas, fotos em arco, nem botões e cartões "retrô": o cliente considera infantil.
- **Don't** fazer nada grosso, marcante ou cartoonizado. O pedido é moderno, fino e delicado.
- **Don't** misturar caixa alta espaçada e script na mesma linha, nem escrever um título inteiro em script.
- **Don't** pôr rótulo em caixa alta solto acima de um título.
- **Don't** usar `cobre` puro como texto sobre chão claro, nem cobre de qualquer tom sobre caramelo.
- **Don't** usar sombra dura deslocada, rotação, mola, quique ou animação em loop; nada passa de 2 s.
- **Don't** cobrir a foto com selo, etiqueta, cartão ou legenda.
- **Don't** trocar a paleta marrom, cobre e creme, nem tirar a rolagem animada: são decisões do cliente.
- **Don't** escrever travessão nem meia-risca nos textos.
- **Don't** tratar como decidido o que está em aberto: o nome único do destino e a voz da seção final.
