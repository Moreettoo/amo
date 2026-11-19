---
version: 1
slug: "src-app-catalogo-page-tsx"
primary_target: "src/app/catalogo/page.tsx"
related_targets: ["src/components/sections/CatalogoPagina.tsx","src/components/sections/TopoCatalogo.tsx"]
---

# Catálogo (src/app/catalogo/page.tsx)

Escopo: a página `/catalogo`, modo Persuade, dentro do mundo da home ("A Papelaria Fina"). Uma página só, em capítulos por categoria (doces, salgados e refeições) com as linhas dentro. O bloco "O rótulo da linha" saiu daqui e continua na home.

Público e tarefa: a mesma visitante da home, no celular na maioria, que veio escolher o que provar. Prova disponível: as fotos, a regra de cada linha e os selos de cada produto. Sem preço, sem página de produto, sem contato.

Restrições: o cadastro manda (categoria, linha ou selo sem produto não aparece); os cards não abrem nada; a gaveta "Catálogo" fica como está, só com os endereços em âncora.

Pedido do cliente (2026-11-18): interativo, dinâmico, fino, delicado e bem estruturado. Entre três estruturas esboçadas (`.impeccable/mocks/decision/cat-*.html`) ele escolheu "O sumário".

## Direction contract

THESIS: O catálogo é o sumário de um livro de receitas: tudo numa página, em capítulos, com um índice fino que acompanha a leitura e diz onde a pessoa está. Recusa a loja de abas e filtros com uma grade por página, e recusa o topo com foto de capa que empurra os produtos para baixo.

OWN-WORLD: Cartão creme do começo ao fecho expresso. Título em duas vozes (Poppins leve e uma frase em script cobre de leitura). Fotos retas de canto 4 px sem caixa em volta; etiquetas retas de contorno fino; caixa alta espaçada só na regra da linha e no nome do sumário. Um fio de 1 px só existe segurando alguma coisa: aqui, o coração cobre do sumário.

STORY: Ela entende que há mais de um tipo de comida, vê em que parte está, passa de uma categoria a outra em um toque e escolhe pela foto, com a regra da linha ao lado do nome dela.

FIRST VIEWPORT: Nav. Topo creme: trilha, "O catálogo" em Poppins leve e "inteiro" em script em linha própria, o lead à direita pela base do título. Uma linha de filtros "Na vontade de" com as etiquetas e, à direita, o que está na tela. Abaixo, duas colunas: à esquerda o sumário (rótulo em caixa alta, as categorias com a contagem, as linhas recuadas, o fio com o coração no item atual, o atalho "Hoje o dia pede"); à direita o primeiro capítulo, com o nome da categoria grande, a linha, a regra com o coração e a contagem, e a primeira fileira de quatro fotos já visível. No celular o sumário é uma fileira de etiquetas presa embaixo da nav.

FORM: Sumário de livro de receitas com marcador de página. Posição 4 da lista de estruturas. seed:f0b499d7dfe2a2b3. Interação assinatura: o coração desliza pelo fio até o capítulo em que a pessoa está, e tocar num item do sumário conduz a rolagem até ele. Gramática de movimento: a da casa (o script se escreve, o resto aparece), mais o deslize do coração.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
