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
---

# Design System: AMO Sabores Saudáveis

## Overview

**Creative North Star: "A Papelaria Fina"**

O site é a papelaria da marca: cartão creme com um grão quase invisível, caligrafia em cobre, caixa alta espaçada só em rótulos curtos e um fio de 1 px que prende as fotos. O trio vem do próprio logo (a letra em script, a caixa alta espaçada de "Sabores Saudáveis" e o traço fino do pote) e vira o sistema inteiro. O código se chama assim nos próprios comentários ("papelaria fina"), e é assim que a home, o catálogo, a página 404 e a gaveta foram construídos.

O gosto do cliente manda: moderno, fino e delicado; nunca grosso, marcante ou cartoonizado. Por isso os títulos são Poppins de peso 300, os cantos têm de 2 a 4 px, os botões são retângulos sem sombra e o movimento é o de uma caneta, sem mola e sem quique. A paleta marrom, cobre e creme e a rolagem animada são decisões do cliente e não se discutem aqui. O que o cliente recusou está registrado como recusa: a fonte gorda dos títulos, as ondas, as fotos em arco e os botões e cartões "retrô" da versão anterior, além dos fios soltos, que ele chamou de "um risco perdido".

A página alterna três chãos inteiros: creme (hero, vitrine, marca, rodapé, corpo do catálogo), caramelo (só "Hoje o dia pede") e expresso (rótulos, fecho, topo do catálogo e 404). Quem separa uma seção da outra é o espaço e a troca de cor, nunca uma linha.

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

## Colors

Marrom, cobre e creme, tirados do rótulo e do logo: uma família quente só, com um único acento.

### Primary
- **Cobre do Logo** (`cobre`): o acento. Aparece na frase em script sobre expresso, no fio deslocado atrás das fotos, na borda da gaveta, no traço desenhado dos links, no coração do logo e no anel de foco das superfícies escuras. Nunca é cor de texto corrido.
- **Cobre de Leitura** (`cobre-texto`): o cobre escurecido para texto sobre chão claro: a frase em script dos títulos, a regra da linha, os nomes de lista em caixa alta, o tipo do produto, o hover de links.

### Secondary
- **Caramelo** (`caramelo`): o chão da seção "Hoje o dia pede", e só dela. Também é a cor da seleção de texto.

### Tertiary
- **Vinho da Tampa** (`vinho`): um único uso, o coração que surge ao lado do link do rodapé no hover e no foco. Não é cor de sistema; não espalhar.

### Neutral
- **Expresso** (`expresso`): o texto principal, os botões cheios, o chão dos blocos escuros, a barra do navegador e o anel de foco nas superfícies claras.
- **Chocolate** (`chocolate`): texto e traços sobre caramelo e kraft, onde o cobre de leitura não tem contraste; fundo das capas enquanto a foto carrega em chão escuro.
- **Creme Cartão** (`creme`): o chão da página, com o grão. Texto e botão claro sobre expresso.
- **Papel** (`papel`): o cartão do rótulo e o cartão da linha única na gaveta.
- **Linho** (`linho`): fundo de espera das fotos em chão claro; variante do cartão de rótulo.
- **Kraft** (`kraft`): variante do cartão de rótulo para linhas futuras.
- **Texto Suave** (`suave`): texto secundário sobre claro (lead, frase do card, rodapé).
- **Texto Suave Claro** (`claro-suave`): texto secundário sobre expresso (lead do topo do catálogo, trilha, assinatura).

O fio fino é expresso diluído sobre claro (`rgb(43 27 22 / .18)`, token `--fio`) e creme diluído sobre escuro (`rgb(250 242 233 / .2)`). O contorno de um controle é mais firme (`rgb(43 27 22 / .38)`), porque precisa ser visto como controle.

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
- **Display** (300, `clamp(40px, 4.4vw, 58px)` no desktop e `clamp(32px, 5.2vw, 46px)` no celular, 1.1, -0.03em): a primeira linha do H1 da home e o título do topo do catálogo.
- **Script** (Allura 400, 1.05, sem tracking): a frase curta dentro do título. Nos títulos de seção mede 1.75em do título; no H1 da home vai a `clamp(118px, 13.4vw, 196px)` e passa por cima da borda da foto; no cartão do rótulo fecha o cartão a 38 px.
- **Headline** (300, `clamp(28px, 3.3vw, 44px)`, 1.2, -0.02em): títulos de seção.
- **Title** (400, 22 px, 1.2, -0.01em): nome do produto no card (18 px no celular); 26 px no cartão do rótulo; 21 px na gaveta.
- **Body** (400, 17 px, 1.65, até 52ch): texto das seções. O lead do hero é 300, `clamp(17px, 1.45vw, 19px)`, 1.7, até 42ch.
- **Body pequeno** (400, 15 px, 1.6): frase do card, links, itens de lista, botões (500).
- **Label** (600, 12 a 13 px, 0.24em a 0.28em, caixa alta): a regra da linha ("Zero açúcar"), os nomes das listas do rodapé, do catálogo e da gaveta. Os selos no card são a versão calma: 500, 12 px, 0.1em.

### Named Rules
**A Regra das Duas Vozes.** Um título começa em Poppins leve e termina em script: uma frase curta, dentro do `<em>`, em linha própria. Nunca um título inteiro em script, nunca script em texto corrido.

**A Regra da Voz Única por Linha.** Caixa alta espaçada e script não dividem a mesma linha. O cliente rejeitou essa mistura na assinatura, que hoje é uma voz só.

**A Regra da Minúscula no Script.** Palavras que mudam (a vontade do dia, o nome da linha no catálogo) vão em minúscula no script: as maiúsculas da Allura confundem ("Fruta" lia "Truta").

**A Regra do Rótulo que Não Sobe.** A caixa alta espaçada nomeia uma lista ou afirma a regra da linha logo abaixo do título. Não existe rótulo solto acima de um título.

## Layout

Coluna central de 1240 px com gutter fluido (`clamp(20px, 5vw, 56px)`), o que dá 1128 px de conteúdo; a nav usa a mesma medida. As seções respiram com `clamp(72px, 8vw, 112px)` em cima e embaixo, e é esse espaço, junto com a troca de chão, que separa uma da outra.

As composições são assimétricas, de duas colunas desiguais (texto de um lado, foto ou cartão do outro: 0.9/1.1, 1.05/0.95, 0.72/1.28), e viram uma coluna no celular. No hero o script cruza a borda esquerda da foto do destaque só no desktop; no celular a foto fica logo abaixo dele. A grade de produtos tem colunas de no mínimo 230 px com vão de 56 px por 28 px; na vitrine da home são sempre quatro numa fileira ou duas e duas, nunca três e um órfão.

Quebras observadas: 520 px (grade e cartão compactos), 820/821 px (uma coluna vira duas; nav de celular), 900 px (grade do hero e quatro colunas da vitrine), 1024 px (título ao lado do cartão do rótulo). Alvos de toque de 44 px no celular, muitas vezes por uma área invisível em volta do texto para o desenho continuar fino. A nav tem 64 px, é opaca e fica presa no topo; as âncoras descontam 96 px.

"Hoje o dia pede" é a única seção pinada: o painel gruda na tela e a rolagem troca a vontade. O pino só existe com JavaScript, sem movimento reduzido e com janela alta o bastante (700 px no desktop, 800 px no celular); fora disso a seção é um bloco comum com abas.

## Elevation & Depth

O sistema é plano. A profundidade vem da troca de chão e do fio cobre deslocado atrás das fotos, que faz o papel que uma sombra faria. Não há sombra dura deslocada em lugar nenhum.

### Shadow Vocabulary
- **Cartão sobre a mesa** (`box-shadow: 0 30px 60px -30px rgb(0 0 0 / .7)`): só o cartão do rótulo, sobre expresso. É difusa e fica quase toda embaixo do cartão.
- **Nav ao rolar** (`box-shadow: 0 12px 30px -22px rgb(43 27 22 / .5)`): aparece depois de 40 px de rolagem e é a única coisa que muda na barra.
- **Fundo da gaveta** (`rgb(43 27 22 / .6)` com `blur(2px)`): o véu atrás da gaveta aberta.

### Named Rules
**A Regra do Fio no Lugar da Sombra.** Uma foto ganha presença pelo fio de 1 px deslocado atrás dela (12 px nas grandes, 7 px nas pequenas, 14 px na da vontade), não por sombra. Botões, pílulas e cards de produto não têm sombra em nenhum estado.

## Shapes

Retângulos de papel cortado. Controles e cartões têm canto de 2 px, miniaturas 3 px, fotos 4 px. Nada gira, nada ondula, nada vira arco. A única forma redonda do código é a janela do formato "bolo inteiro", que é um círculo porque o produto é redondo; hoje nenhuma linha cadastrada usa esse formato.

O fio tem sempre 1 px e sempre segura alguma coisa: a moldura deslocada da foto, a borda de baixo da nav, a borda da gaveta do lado que abre, o contorno de um controle, a moldura interna do cartão do rótulo (a 8 px da borda, em cobre a 60%) e as divisões dentro desse cartão. O sublinhado dos links é um traço desenhado à mão em cobre (1.4 px, ponta redonda) que só aparece no hover e no foco.

O coração do logo, em cobre, é a marca que aponta: fica na frente da regra da linha e do item em que a pessoa está. As setas e os ícones dos selos são traço fino (1.4 a 1.5 px), sem preenchimento.

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

### Chips
- **Style:** a "pílula" é uma etiqueta reta (2 px) de contorno fino, 44 px de altura, Poppins 400 de 15 px, com a contagem pequena ao lado em números tabulares.
- **State:** escolhida, no hover e no foco enche de expresso com texto creme. A do selo se distingue pela cor (contorno e texto em cobre de leitura; ativa enche de cobre com texto expresso), não por tracejado. Sobre expresso há a versão clara, que enche de creme.
- No celular a coluna de linhas do catálogo vira uma fileira dessas etiquetas que rola de lado.

### Cards / Containers
- **Card de produto:** não é uma caixa. É a foto (4/5, canto de 4 px, fundo linho) e o texto solto embaixo: nome, tipo em cobre de leitura (13 px, 500), selos em caixa alta calma e a frase. Sem borda, sem fundo, sem sombra. Quando clica, o link mora no nome e cobre o card inteiro; a foto amplia a 1.04 em 0.9 s e o nome vai a cobre de leitura.
- **Foto com fio:** retângulo de 4 px com o fio cobre deslocado atrás. Não clica e não reage ao mouse. Sobre caramelo o fio é chocolate.
- **Cartão do rótulo (assinatura do sistema):** papel reto de 2 px sobre expresso, com a moldura interna de fio cobre, o nome da linha, a regra em caixa alta, os selos com ícone de traço, o modo de aproveitar numerado e a frase da linha em script fechando o cartão. As divisões internas são fios de 1 px (`rgb(43 27 22 / .2)`). Com uma linha só ele fica largo e se divide em duas colunas. É onde o rótulo real vira prova.

### Navigation
- **Nav:** barra creme de fora a fora, 64 px, com um fio embaixo; opaca desde o primeiro pixel. Da esquerda para a direita: botão "Catálogo" com o ícone de três fios, logo, links da home em Poppins 400 de 15 px com o traço desenhado no hover, e o botão compacto. No celular os links saem da barra e moram na gaveta.
- **Gaveta:** um `<dialog>` modal que entra pela esquerda, folha creme de 400 px (até 340 px ou 88vw no celular) com um fio cobre na borda que abre. Dentro, nenhum fio entre os itens: quem separa é o espaço e a miniatura de cada sabor. O fechar é um quadrado de 44 px com o contorno da pílula.
- **Trilha e listas:** a seta entre os itens é desenhada, não é texto. O item atual leva peso 500 e o coração do logo antes do nome.
- **Link com traço:** texto de 15 a 16 px com um traço cobre que se desenha embaixo em 0.5 s. Onde o link leva a outro lugar, uma seta fina diz para onde e anda 3 a 4 px no hover.

### O fio e a costura (a ligação entre as seções)
Decisão do cliente em 2026-11-18, só na home. As duas existem para a página não ser uma pilha de blocos.

**O fio** é um traço cobre único de 1.5 px (`src/lib/fio.ts` traça, `src/components/layout/Fio.tsx` mede e desenha). Ele sai de baixo de "comer bem.", sublinha o script de cada seção, passa por trás de cada foto e do cartão do rótulo, como o barbante que prende a etiqueta ao pote, e termina num coração ao lado de "AMO por você. Por seu AMO.". Ele obedece à regra do Fio que Segura: nunca fica solto, sempre sublinha ou amarra alguma coisa. As seções marcam as âncoras com `data-fio` (`inicio`, `sub`, `atras`, `fim`).
- Em colunas, depois de sublinhar ele vai até a margem e desce por ela: não risca texto.
- No celular não há margem. Ele sai da tela por uma lateral, numa curva aberta, e volta mais abaixo: nunca desce reto pela beirada nem vira de uma vez.
- Em "Hoje o dia pede", que fica presa na tela, o trecho do fio mora dentro do painel e se desenha ao longo da seção inteira. Sobre o caramelo ele vai em `cobre-texto`.
- A ponta acompanha a rolagem, a 60% da altura da tela. Com movimento reduzido ele nasce inteiro; sem JavaScript não há fio, e a página segue completa.

**A costura** é uma peça atravessando a emenda entre duas seções, para ela não ser um corte reto: o cartão do rótulo fica pendurado sobre a seção da marca (em qualquer largura, quando há uma linha só) e a foto do fecho sobe para dentro da seção da marca (em colunas). As duas deslizam até 30 px por cima da emenda enquanto cruzam a tela, onde o navegador liga animação à rolagem. Entre a vitrine e "Hoje o dia pede" não há costura: o painel preso recorta o que passa dele.

### A palavra da vontade (assinatura do sistema)
Em "Hoje o dia pede" a frase em script é uma palavra só, em minúscula e em expresso sobre caramelo, com um traço chocolate embaixo. A cada troca as letras saem e a palavra se reescreve da esquerda para a direita. A altura é fixa para a página não pular. A legenda e as miniaturas ficam embaixo da foto, sem sobrepor.

### Movimento: a caneta
Três verbos e nada fora deles. **Escrever:** o script surge por `clip-path` da esquerda para a direita (1 a 1.25 s); nos títulos de seção, ligado à rolagem onde o navegador suporta. **Revelar:** a foto sobe por trás de uma máscara reta (0.9 a 1.1 s). **Aparecer:** o resto chega com opacidade e 10 px de subida (0.6 s). A curva da casa é `cubic-bezier(0.16, 1, 0.3, 1)`. Além disso há rolagem suave e um parallax leve nas fotos (ampliadas a 1.1, deslocando de -4% a +4%).

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
- **Do** usar o coração do logo, em cobre, para apontar a regra da linha e o item atual.

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
