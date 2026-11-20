---
version: 1
slug: "src-app-conta-page-tsx"
primary_target: "src/app/conta/page.tsx"
related_targets: ["src/app/conta/pedidos/page.tsx","src/app/conta/pedidos/[numero]/page.tsx","src/app/conta/perfil/page.tsx"]
---

# /conta e as telas de Minha conta: o sumário da conta

Modo: Operate. A cliente logada acompanha o pedido em andamento (o que mais vem fazer, resposta do dono em 2026-11-20), vê os pedidos antigos e muda os dados: perfil, endereços, e-mail e senha. Chega pelo link "Minha conta" da nav ou pelo redirecionamento depois de entrar. O desenho funcional está no plano `docs/superpowers/plans/2026-11-18-amo-etapa-2-leitura.md` (Tasks 9 a 13) e no backend §7.2, §9.1 e §11.

Decisão do cliente (2026-11-20): "O sumário da conta", entre três esboços em `.impeccable/mocks/decision/minha-conta-*.html`; as telas completas de cada um em `.impeccable/mocks/minha-conta-*-telas.html`.

Rotas: `/conta` (pedido atual), `/conta/pedidos`, `/conta/pedidos/[numero]`, `/conta/perfil` (seus dados e excluir conta), `/conta/perfil/enderecos`, `/conta/perfil/email-e-senha`. Uma página por item do sumário, como o esboço escolhido mostra.

## Direction contract

THESIS: a conta tem o índice do catálogo: um sumário preso à esquerda que diz onde a cliente está e leva a cada parte em um toque, e o pedido em andamento abre a conta com o fio das etapas. Recusa o painel de cliente genérico com cartões de atalho e ícones.

OWN-WORLD: a papelaria fina do site, sem novidade: creme com grão, título em duas vozes (Poppins 300 e a frase em Allura, `cobre-texto`), o sumário de 208 px com o fio de 1 px e o coração cobre de 13 px no item atual, fileiras de potes com miniatura de 64 por 80 e fio entre elas, linha de soma, campos de contorno fino com o rótulo em cima, botão escuro reto.

STORY: a cliente entra e vê na hora onde está o pedido (a etapa, a hora, quando chega) e o botão para acompanhar no Uber; desce para os potes e o total; os pedidos anteriores estão logo abaixo e no sumário. Para mudar um dado, toca no item do sumário e cai num formulário curto. Erro é uma frase perto do campo.

FIRST VIEWPORT: nav; coluna de 1128 px; à esquerda, 208 px: "Olá, Mariana" (22 px) e o e-mail (13 px, `suave`), o rótulo "Sua conta", os itens Pedido atual, Pedidos (contagem), Seus dados, Endereços (contagem), E-mail e senha, com o fio e o coração no atual, e "Sair" abaixo. À direita, a 64 px: o H1 "Pedido AMO-..." com o estado em script; à direita do título, pela base, "Entrega pelo Uber", "Chega em cerca de N minutos." e o botão escuro "Acompanhar no Uber"; o fio das etapas deitado com o coração na etapa atual e a hora embaixo de cada uma; os potes; o total sobre a linha de soma; "Pedidos anteriores" com os dois últimos e "Ver todos os pedidos". No celular, o sumário vira a fileira de etiquetas presa embaixo da nav, com o coração no fio da barra, e o fio das etapas fica em pé.

FORM: "O sumário da conta", 3º da lista ordenada de estruturas; seed:163f32316a08929f

Signature: o coração do logo marca onde a cliente está duas vezes, com o mesmo gesto: no fio do sumário, no item da página atual, e no fio das etapas do pedido, na etapa em que ele está. Na fileira do celular ele desliza até a etiqueta atual (0.5 s, curva da casa; sem deslizar com movimento reduzido). Sem JavaScript tudo funciona: cada item é uma página.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Em aberto

- As frases em script de cada título ("a caminho" e as outras por estado; "até aqui", "sempre em dia", "bem guardados", "de entrega") e os textos de apoio dos formulários: escritos nos esboços, o dono confere na tela pronta.
- Sem pedido em andamento, `/conta` abre com o convite ao catálogo e os pedidos anteriores.
