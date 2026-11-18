---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Home (src/app/page.tsx)

Escopo: a home, modo Persuade. O catálogo (`/catalogo` e `/catalogo/[linha]`), a página 404 e a gaveta "Catálogo" entraram na rodada seguinte, no mesmo mundo.

Público e tarefa: mulher de 25 a 45 anos, no celular, decide se quer provar e vai ao catálogo. Prova disponível: as 7 fotos, os 6 selos, a regra "Zero açúcar" e o ritual do rótulo. Nada de preço, depoimento ou contato real.

Restrições do cliente (2026-11-18): paleta marrom, cobre e creme; rolagem suave, parallax e seção pinada ficam; script com Poppins; sai a fonte gorda, as ondas, os arcos e os botões e cartões retrô. Gosto: moderno, fino e delicado, nunca grosso, marcante ou cartoonizado.

Do padrão da categoria entram duas coisas: texto, menu e botões em Poppins normal (caixa alta espaçada só em rótulos curtos) e os sabores com foto logo abaixo da primeira tela.

## Direction contract

THESIS: A home é a papelaria da marca: o trio do logo (script caligráfico, caixa alta espaçada, fio fino) vira o sistema inteiro. Recusa o hero dividido com título sans e fileira de cards iguais, e recusa o retrô gordo da v2.

OWN-WORLD: Cartão creme como chão; expresso em blocos inteiros (rótulos e final); caramelo no bloco da vontade; cobre só em script, fios e foco. Allura em uma frase curta por seção, Poppins leve no resto. Fotos em retângulo de canto 4 px com um fio cobre deslocado atrás. Botões retos, sem sombra. Um fio de 1 px só existe se prende alguma coisa (moldura de foto, borda de barra, estrutura de cartão); quem separa as seções é o espaço e a cor.

STORY: Ela entende que é doce conhecido em versão saudável, acredita porque o rótulo diz, e vai ao catálogo.

FIRST VIEWPORT: Nav em linha, com fio embaixo. À esquerda "Para quem ama" em Poppins leve e, logo abaixo, "comer bem." em script cobre gigante que passa por cima da borda esquerda da foto alta do destaque, posta à direita do centro. Lead e ações embaixo à esquerda: botão expresso reto "Ver o cardápio" e o link "Escolher pela vontade". À direita do destaque, duas fotos menores de outros sabores. A regra "Zero açúcar" fica embaixo do título, em caixa alta cobre com o coração do logo na frente. No celular a foto do destaque fica logo abaixo do script, com respiro; o cruzamento do script com a foto é do desktop.

FORM: Papelaria de convite (cartão, caligrafia, hot stamping). Posição 1 da lista. seed:595c8fe7d1984c40. Interação assinatura: a caneta. O script se escreve da esquerda para a direita e os fios se desenham; na seção pinada a palavra da vontade se reescreve a cada troca. Gramática de movimento: fio desenha, script escreve, foto sobe por trás de máscara reta.

DECISÕES DEPOIS DO CONTRATO (2026-11-18):
- Script: o cliente escolheu Allura entre quatro scripts gratuitas (`.impeccable/mocks/teste-script.html`).
- Fios: o cliente achou os fios soltos "um risco perdido"; saíram os divisores entre seções, os dois fios da regra e o fio acima do copyright.
- Primeira tela: as duas fotos laterais ficaram no lugar da lista de sabores porque o pedido era uma proposta "semelhante com o atual", e o palco atual tinha três fotos.
- Faixa cobre: saiu da home; a assinatura "AMO por você. Por seu AMO." mora na seção final, numa voz só (o cliente rejeitou a mistura de caixa alta com script nessa linha).
- Revisão de acabamento: os selos saíram de cima das fotos e foram para o texto do card; na seção da vontade a legenda e as miniaturas ficam embaixo da foto, sem sobrepor; na gaveta o nome vem antes da regra.
- Em aberto com o cliente: um nome só para o destino (hoje catálogo, cardápio e receitas), a voz da seção final e a ligação entre as seções (`.impeccable/mocks/conexoes.html`, quatro ideias; nenhuma escolhida ainda).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
