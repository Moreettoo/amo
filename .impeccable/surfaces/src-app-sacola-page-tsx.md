---
version: 1
slug: "src-app-sacola-page-tsx"
primary_target: "src/app/sacola/page.tsx"
related_targets: ["src/components/layout/TelaSacola.tsx","src/components/sections/Fechamento.tsx","src/components/layout/GavetaSacola.tsx"]
---

# /sacola: a sacola e o fechamento do pedido

Modo: Operate. A visitante revisa os potes, informa a entrega e os dados e fecha o pedido. Ao adicionar um pote na página de produto abre a gaveta da sacola pela direita (espelho da gaveta do catálogo), com o resumo e "Ver sacola"; a nav mostra a sacola com a contagem em todas as páginas.

Decisões do cliente (2026-11-18): checkout no site; gaveta e página. Pagamento simulado até escolher o meio (Pix ou cartão); nenhum valor é cobrado e a página diz isso.

## Direction contract

THESIS: o pedido é uma costura: quatro etapas (os potes, entrega, seus dados, pagamento) presas num fio vertical de 1 px, com o coração do logo pousado na etapa atual. Recusa o checkout genérico de várias páginas com barra de progresso numerada.

OWN-WORLD: a papelaria fina do site, sem novidade: creme com grão, Poppins 300 nos títulos e script Allura na frase do H1, fio de 1 px que segura, coração cobre que aponta, botões retos de 2 px que invertem para contorno, campos de contorno fino.

STORY: a visitante vê os potes que escolheu e o total; ajusta quantidades; dá CEP e número e vê o valor e o prazo do Uber; deixa nome, celular e e-mail; escolhe Pix ou cartão e faz o pedido. Cada etapa concluída vira uma linha de resumo com "Alterar".

FIRST VIEWPORT: nav; H1 "Sua sacola" com "quase pronta" em script embaixo; coluna larga à esquerda com o fio pela margem e a etapa 1 aberta (miniatura, nome, tipo, quantidade, preço por linha), etapas 2 a 4 fechadas com o que pedem; à direita, resumo preso (rótulo "Resumo", subtotal, entrega, total grande) e o botão principal da etapa atual. No celular o resumo vira barra presa embaixo com total e botão.

FORM: "O fio das etapas", 5º da lista ordenada de estruturas; seed:6e38fce5d13aca3e

Signature: o coração desliza pelo fio até a etapa atual (0.5 s, curva da casa; sem deslizar com movimento reduzido).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
