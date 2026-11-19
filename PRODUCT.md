# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mulheres de 25 a 45 anos, no Brasil, que querem sobremesa sem a cobrança depois:
quem faz dieta, low carb, tem diabetes ou só cansou de açúcar. Chegam pelo
celular, na maioria, para ver os sabores e decidir o que provar.

## Product Purpose

AMO Sabores Saudáveis vende bolos no pote zero açúcar, artesanais, cozidos a
vapor, em pote de vidro reutilizável. O site existe para fazer a pessoa querer
provar e confiar que "zero açúcar" não é abrir mão do doce. Sucesso: a visitante
entende o que é, acredita no rótulo e vai ao catálogo escolher um sabor.

## Positioning

O que é saudável está escrito no rótulo: cada linha tem a sua regra (hoje, "Zero
açúcar") e os selos dizem o que tem e o que não tem. Receita conhecida
(prestígio, paçoca, beijinho) em versão saudável, e não um produto "fit" novo.

## Operating Context

- Home com vitrine, a seção "Hoje o dia pede" (escolha pela vontade), os
  rótulos e a marca; catálogo em `/catalogo`, uma página só, em capítulos
  por categoria com as linhas dentro. Categoria, linha e produto são âncoras
  dela (`/catalogo#doces`, `/catalogo#linha-bolos-no-pote`,
  `/catalogo#prestigio`); não há página por linha. Cada produto tem a sua
  página, `/catalogo/<slug>` (cliente, 2026-11-18), e os cards da vitrine e
  do catálogo levam a ela.
- O catálogo é um cadastro (`src/data/`, pronto para o Supabase). A página se
  adapta a ele: linhas, formatos e selos novos entram sem mexer em componente.
- Hoje há uma categoria (Doces) com uma linha (Bolos no pote) e 7 sabores.
  As categorias previstas são doces, salgados e refeições (cliente,
  2026-11-18). Salgados e refeições entram quando houver produto com foto,
  sempre saudáveis; até lá não aparecem, e o sumário do catálogo só existe
  com 2 ou mais categorias ou linhas.

## Capabilities and Constraints

- Next.js 16, React 19, Tailwind 4, Motion e Lenis.
- Página de produto (cliente, 2026-11-18): preço, sacola com quantidade,
  entrega pelo CEP via Uber (cotação do Uber Direct no servidor; o endereço
  da cozinha nunca vai para a página) e comentários com nota de 1 a 5, que
  só aparecem depois de aprovados.
- Sacola e fechamento (cliente, 2026-11-18): gaveta da sacola pela direita
  e a página `/sacola` com as etapas potes, entrega, dados e pagamento (Pix
  ou cartão). O pagamento ainda é de exemplo (`enviarPedidoDeExemplo`):
  nada é cobrado e a página diz isso. Falta escolher o meio de pagamento e
  mandar o pedido ao servidor, que recalcula preço e frete.
- Preço, descrição e comentários vêm de `src/data/exemplos.ts`, DADOS DE
  EXEMPLO, e a cotação de entrega é simulada (`cotarEntregaDeExemplo`).
  Trocar pelos reais antes de publicar.
- Produto sempre com o nome do produto ("Prestígio"), nunca nome poético.
- Sem foto não há produto.
- Ainda não há contato real. O rodapé não mostra contato até haver um; não inventar.
- Sem travessão nem meia-risca em `src/`, `tests/`, `scripts/` e README.
- Nenhuma animação em loop; movimento reduzido e sem JavaScript continuam
  entregando a página completa.

## Brand Commitments

- Nome: AMO · Sabores Saudáveis. Todo "AMO" em texto fica em `translate="no"`.
- Assinatura: "Para quem ama comer bem." Linhas do rótulo: "Um abraço em forma
  de sobremesa ♥" e "AMO por você. Por seu AMO."
- Logo: "A" serifada de alto contraste, "m" em script e o pote com coração, em
  cobre (`public/marca/`).
- Paleta marrom, cobre e creme: fica (decisão do cliente, 2026-11-18).
- Rolagem animada fica: rolagem suave, parallax nas fotos e a seção pinada
  dirigida pela rolagem (decisão do cliente, 2026-11-18).
- Tom visual: moderno e adulto. O cliente considera infantil a fonte gorda dos
  títulos, as ondas e fotos em arco e os botões e cartões "retrô"
  (2026-11-18).
- Fontes que o cliente tem em mente: script no estilo de Cream Cake, Ananda e
  Madina, com Poppins (2026-11-18). Entre quatro scripts gratuitas, escolheu
  Allura (2026-11-18).

## Evidence on Hand

- 7 fotos de produto em `public/produtos/`, com dimensões e alt no cadastro.
- Os 6 selos do rótulo, a regra "Zero açúcar" e o ritual "Como aproveitar seu
  AMO", todos lidos do rótulo real.
- Não há: depoimentos, preços, gramatura, contato real, área de entrega, fotos
  de ambiente ou de pessoas. Nada disso pode ser inventado.

## Product Principles

1. O rótulo é a prova: toda afirmação de saúde aponta para o que está escrito
   nele.
2. Primeiro o desejo, depois a explicação: a foto do pote convence antes do
   texto.
3. O cadastro manda: a página nunca promete linha, selo ou formato que não
   existe no catálogo.
4. Doce de gente grande: carinho sem infantilizar.

## Accessibility & Inclusion

WCAG AA em contraste, teclado alcança tudo com foco visível, alvos de toque de
44 px no celular, movimento reduzido respeitado. Os testes do projeto cobrem
axe, contraste dos tokens e estrutura de títulos.
