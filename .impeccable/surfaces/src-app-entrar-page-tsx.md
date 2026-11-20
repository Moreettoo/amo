---
version: 1
slug: "src-app-entrar-page-tsx"
primary_target: "src/app/entrar/page.tsx"
related_targets: ["src/app/cadastro/page.tsx","src/app/esqueci-a-senha/page.tsx","src/components/conta/PortaDaConta.tsx"]
---

# /entrar, /cadastro e /esqueci-a-senha: as duas portas da conta

Modo: Operate. A visitante entra na conta, cria uma (com o código de 6 dígitos que chega por e-mail) ou recupera a senha. Chega pelo link "Minha conta" da nav, pelo redirecionamento de uma página da conta, ou (etapa 3) pela sacola. Comprar exige conta (backend §1). O desenho funcional, os textos de erro e as regras de segurança estão em `docs/superpowers/specs/2026-11-20-amo-autenticacao-design.md`.

Decisão do cliente (2026-11-20): "As duas portas", entre três esboços em `.impeccable/mocks/decision/conta-*.html`.

## Direction contract

THESIS: uma porta de entrada só, com duas abas sobre um fio, Entrar e Criar conta, e o coração do logo pousado embaixo da aba atual. Recusa a página de login genérica com cartão flutuante e link "não tem conta? cadastre-se" perdido no pé.

OWN-WORLD: a papelaria fina do site, sem novidade: creme com grão, título em duas vozes (Poppins 300 e a frase em Allura, `cobre-texto`), fio de 1 px que segura as abas, coração cobre que aponta, campos de contorno fino com o rótulo em cima, caixa de seleção reta de 2 px, botão escuro reto de largura inteira que inverte para contorno.

STORY: a visitante vê que está no lugar certo, escolhe a porta (já tem conta ou não), preenche o mínimo e segue. No cadastro, o código chega por e-mail e ela o digita sem sair da página. Esqueceu a senha: a mesma coluna, os passos sobre o mesmo fio. Erro é uma frase curta perto do campo, nunca um alerta vermelho.

FIRST VIEWPORT: nav; H1 centrado "Que bom" com "ter você aqui" em script embaixo; coluna de 440 px centrada; as abas Entrar e Criar conta de meia largura cada, sobre um fio de 1 px, com o coração de 13 px pousado no fio embaixo da atual; o formulário logo abaixo (cadastro: nome e celular lado a lado, e-mail, senha com "mostrar", os dois aceites) e o botão escuro de largura inteira; uma nota de 13 px em `suave` embaixo. No celular a coluna ocupa a largura com o gutter da casa.

FORM: "As duas portas", 5º da lista ordenada de estruturas; seed:98463cc1fc25a196

Signature: trocar de aba desliza o coração pelo fio até a aba nova (0.5 s, curva da casa; troca sem deslizar com movimento reduzido) e troca o formulário no lugar, levando o e-mail já digitado. Sem JavaScript, as abas são links para `/entrar` e `/cadastro`. Os passos do código e da senha nova usam o mesmo fio com o coração.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
