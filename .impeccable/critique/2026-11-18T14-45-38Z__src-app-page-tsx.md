---
target: a home nova
total_score: 15
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 5
target_identity: "file:D:\\amo\\src\\app\\page.tsx"
target_fingerprint: "sha256:cd26d2346bbeadcb39fa5b5981aca495ec5c64c5965b9948e09c7d5f7ed96396"
target_path: "D:\\amo\\src\\app\\page.tsx"
timestamp: 2026-11-18T14-45-38Z
slug: src-app-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

# Crítica da home (src/app/page.tsx), 2026-11-18

Nota: 15/24 (62%), faixa "aceitável". Heurísticas 5, 7, 9 e 10 marcadas n/a (página de apresentação, sem formulário nem estado de erro).

| # | Heurística | Nota | Problema principal |
|---|---|---|---|
| 1 | Estado do sistema | 3 | A navegação não marca a seção atual |
| 2 | Linguagem do mundo real | 2 | "Receitas" soa como receita para cozinhar; cardápio, catálogo e receitas nomeiam o mesmo destino |
| 3 | Controle e liberdade | 3 | A seção pinada prende cerca de 1.800 px de rolagem sem atalho para pular |
| 4 | Consistência | 2 | A mesma etiqueta serve de aba e de link; fotos reagem ao mouse mas não clicam |
| 5 | Prevenção de erros | n/a | Não há formulário nem ação destrutiva |
| 6 | Reconhecer em vez de lembrar | 3 | "Zero açúcar" nos cards só aparece no hover |
| 7 | Flexibilidade | n/a | Página de apresentação |
| 8 | Estética e minimalismo | 2 | Repetitiva: o mesmo título cinco vezes, a mesma moldura seis vezes |
| 9 | Recuperação de erros | n/a | Não há estado de erro |
| 10 | Ajuda | n/a | Página de apresentação |

## Veredito de especificidade

Primeira tela autoral, corpo de modelo. São da AMO: o "comer bem." em script cruzando a foto e o rótulo refeito como cartão de papelaria. Vitrine de quatro cards, foto com parágrafo, chamada final centralizada e rodapé de quatro colunas serviriam a qualquer loja.

Detector: 0 achados no código; 1 na página renderizada (cream-palette, exceção combinada com o cliente). Sobreposição visual no navegador não rodou (sem aba controlável).

## O que funciona

- O título do hero, único momento memorável.
- O cartão do rótulo, a prova mais forte.
- A disciplina do sistema: fios de 1 px, cantos pequenos, sem sombra em botão, página completa com movimento reduzido, sem rolagem lateral em 1440 e 390.

## Problemas por prioridade

1. [P1] A primeira tela não diz o que é vendido. "Receitas em versão saudável" lê como receita para fazer em casa; "Bolo no pote" não aparece; "Zero açúcar" tem 12 px no canto e, no celular, fica mais de uma tela abaixo. Correção: o lead nomeia o produto e a regra sobe para junto do título (Hero.tsx, hero.css). Comando: /impeccable clarify.
2. [P1] O "comer bem." fica ilegível sobre a foto: contraste mediano 2,2:1 no trecho sobre a foto, 86% dos pixels abaixo de 3:1 (5,1:1 sobre o creme). Correção: manter o cruzamento com a área clara da foto atrás das letras, ou reduzir a invasão (hero.css). Comando: /impeccable polish.
3. [P1] "Hoje o dia pede" não justifica a rolagem: Prestígio é a foto de três das quatro vontades (grupo.produtos[0] em HojeODiaPede.tsx), o layout pula a cada troca, e no celular a foto tem 180 px. Correção: foto diferente por vontade (visao.ts), altura fixa para a palavra, foto maior no celular (hoje.css). Comando: /impeccable layout.
4. [P1] As maiúsculas do script não se leem ("Fruta." parece "Truta"; "Um" parece "Ulm"); Pinyon é caligrafia de convite e o cliente citou scripts de assinatura. Correção: palavra da vontade em minúscula, teste lado a lado com script de assinatura (layout.tsx). Comando: /impeccable typeset.
5. [P1] O final desaba: a assinatura lê como divisória, "Escolha o seu AMO." é genérico e o rodapé mostra "(00) 00000-0000". Correção: fundir a assinatura no bloco final com título em duas vozes e foto; tirar a coluna de contato até haver dado real (page.tsx, Final.tsx, Footer.tsx). Comando: /impeccable layout.

## Personas

- Primeira visita: não sabe dizer o que a AMO vende em cinco segundos; clica num pote e nada acontece; "Catálogo" e "Ver cardápio" na mesma barra fazem coisas diferentes.
- Celular com uma mão: botão principal abaixo da dobra real; a seção pinada custa cerca de 2.000 px de rolagem para uma foto pequena.
- Marina, 38, low carb, vinda do Instagram: "o que adoça isso?" só é respondido na quarta seção; procura como pedir e encontra contato falso.

## Observações menores

- O botão cresce 22 px no hover e empurra os vizinhos.
- 25 tamanhos de fonte em uso no desktop.
- No celular, links do rodapé com 28 px de altura e logo com 26 px (alvo de toque é 44 px).
- Fotos do hero e da marca têm 666 px de largura: ampliadas até 1,7 vez em celular de tela densa. Precisa dos originais em resolução maior.
- Em 1024 px a vitrine fica com três cards e um órfão.
- "3. A saboreie sem culpa" lê como erro de digitação; conferir com o rótulo físico.
- Aviso de hidratação do Next com movimento reduzido (FotoParallax), anterior a esta rodada.
- Corações são o caractere U+2665; três nomes para o mesmo destino (catálogo, cardápio, receitas); cards e fotos sem link; selos escondidos até o hover.

## Perguntas

- Se o rótulo é a prova, por que o rótulo de verdade nunca aparece grande?
- "Hoje o dia pede" deveria vir depois da prova?
- Caligrafia de convite é o que o cliente entende por "moderno"?
