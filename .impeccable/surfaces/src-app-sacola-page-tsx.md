---
version: 1
slug: "src-app-sacola-page-tsx"
primary_target: "src/app/sacola/page.tsx"
related_targets: ["src/components/layout/TelaSacola.tsx","src/components/sections/Fechamento.tsx","src/components/layout/GavetaSacola.tsx"]
---

# /sacola: a sacola e o fechamento do pedido

Modo: Operate. A visitante revisa os potes, informa a entrega e os dados e fecha o pedido. Ao adicionar um pote na página de produto abre a gaveta da sacola pela direita (espelho da gaveta do catálogo), com o resumo e "Ver sacola"; a nav mostra a sacola com a contagem em todas as páginas.

Decisões do cliente (2026-11-18): checkout no site; gaveta e página. Até a etapa 3, o pagamento era simulado e a página dizia isso.

Etapa 3 (2026-11-21): o pagamento é de verdade, pelo Mercado Pago (Pix e cartão; credenciais de teste no desenvolvimento, que o dono ainda cadastra; sem a chave pública, só o Pix), e o pedido fecha no servidor, que recalcula preço e frete. A cotação do Uber continua de exemplo até o Uber Direct: a Regra do Exemplo Dito (`DESIGN.md`) vale só para a entrega, com "(valor de exemplo)" junto do valor dela. O que a etapa 3 pôs nos lugares reservados (detalhe em `DESIGN.md`, "A sacola: o fio das etapas"):

- a porta da conta dentro da etapa "Seus dados", para quem não entrou, que volta à etapa 3 logada com a entrega guardada; logada, os dados da conta e "Guardar este endereço em Minha conta";
- na etapa 4, as formas em rádio e, no cartão, o formulário do Mercado Pago dentro da etapa, pago pelo botão do resumo, com o desafio do banco numa janela dentro da etapa, que fica até o resultado;
- no pedido feito, o painel do Pix (QR, "Pix copia e cola", "Copiar código", "Vale até"; antes do QR, "Gerando o código Pix.") e a espera, que diz em texto e não gira nada; pago, "Pagamento aprovado." e "Acompanhar em Minha conta"; recarregada a página, a sacola volta ao pedido feito;
- a loja fechada ou pausada: a linha da loja no resumo diz quando abre (ou que as vendas voltam daqui a pouco) e o botão da etapa 4 vira "Cozinha fechada agora", desligado.

Revisão de acabamento (2026-11-21, `critique` com as capturas do ensaio a 390 e 1440 px, `.impeccable/critique/2026-11-22T01-09-27Z__src-app-sacola-page-tsx.md`): 32/40, sem P0. Corrigido o material: o título da etapa e o H1 com foco paravam embaixo da barra presa no celular (agora `scroll-margin-top` de 88 px), o valor quebrava entre "R$" e o número e o número do pedido quebrava no hífen (agora sem quebra, e fora do tradutor). Ficam para o dono decidir: "Voltar ao catálogo" escuro enquanto o Pix espera e a loja pausada que só barra na etapa 4.

## Direction contract

THESIS: o pedido é uma costura: quatro etapas (os potes, entrega, seus dados, pagamento) presas num fio vertical de 1 px, com o coração do logo pousado na etapa atual. Recusa o checkout genérico de várias páginas com barra de progresso numerada.

OWN-WORLD: a papelaria fina do site, sem novidade: creme com grão, Poppins 300 nos títulos e script Allura na frase do H1, fio de 1 px que segura, coração cobre que aponta, botões retos de 2 px que invertem para contorno, campos de contorno fino.

STORY: a visitante vê os potes que escolheu e o total; ajusta quantidades; dá CEP e número e vê o valor e o prazo do Uber; entra na conta ali mesmo, se ainda não entrou, e confere nome, celular e e-mail; escolhe Pix ou cartão e paga; no Pix, lê o QR ou copia o código e a página avisa sozinha quando o pagamento é aprovado. Cada etapa concluída vira uma linha de resumo com "Alterar".

FIRST VIEWPORT: nav; H1 "Sua sacola" com "quase pronta" em script embaixo; coluna larga à esquerda com o fio pela margem e a etapa 1 aberta (miniatura, nome, tipo, quantidade, preço por linha), etapas 2 a 4 fechadas com o que pedem; à direita, resumo preso (rótulo "Resumo", subtotal, entrega, total grande) e o botão principal da etapa atual. No celular o resumo vira barra presa embaixo com total e botão.

FORM: "O fio das etapas", 5º da lista ordenada de estruturas; seed:6e38fce5d13aca3e

Signature: o coração desliza pelo fio até a etapa atual (0.5 s, curva da casa; sem deslizar com movimento reduzido).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
