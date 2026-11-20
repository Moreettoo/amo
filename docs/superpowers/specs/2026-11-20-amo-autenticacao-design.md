# AMO · Autenticação · Design

**Data:** 2026-11-20
**Status:** aprovado pelo dono em 2026-11-20, junto com a escolha do esboço
"As duas portas" (`.impeccable/mocks/decision/conta-abas.html`; o contrato
visual está em `.impeccable/surfaces/src-app-entrar-page-tsx.md`).
**Anda junto com:** `2026-11-18-amo-backend-design.md` (o banco, as regras de
segurança e a §16, que dava esta parte a outra sessão) e
`2026-11-18-amo-conta-contrato.md` (os nomes que Minha conta já usa). Onde
este texto e os dois divergirem sobre autenticação, vale este.

## 1. O pedido

A sessão que ia fazer a autenticação não voltou. Em 2026-11-20 o dono pediu
que esta sessão assuma ("Assuma a auth, pode seguir"). O pedido original:
"cadastro, login e esqueci a minha senha". A segurança é o primeiro requisito
do projeto inteiro (backend §1).

Já decidido antes, e mantido:

- Cadastro e recuperação de senha por **código de 6 dígitos** no e-mail, não
  por link (backend §13, item 3).
- A sessão vive em **cookie `httpOnly`**; o navegador não fala com o Supabase
  e não guarda token (backend §5, regra 6).
- **Sem aceite dos termos não existe conta** (o gatilho do banco recusa).
- **Mesma resposta** para e-mail que existe e que não existe; **nenhum erro
  cru** do Supabase na tela; **trocar a senha encerra as outras sessões**
  (backend §19 e contrato, item 6).
- Os limites de tentativa da backend §11 e o CAPTCHA no cadastro, no login e
  na recuperação.

## 2. Objetivos, não objetivos, fracasso

**Objetivos**

1. Criar conta, confirmar pelo código, entrar, sair, recuperar a senha e
   excluir a conta, tudo pelo servidor do site.
2. Entregar a Minha conta (etapa 2, parte B) as funções que ela já usa:
   `obterUsuario`, `exigirUsuario`, `sair`, `criarClienteServidor`,
   `criarClienteAdmin`.
3. Cada tela da conta com a política de segurança de nonce (backend §11).

**Não objetivos desta rodada**

- Entrar com Google, Apple ou link mágico.
- Verificação em duas etapas da cliente.
- A conta dentro do fechamento ("Seus dados", na sacola): entra com a
  etapa 3, quando o fechamento vira de verdade. Os formulários daqui são
  feitos para serem reaproveitados lá.

**Seria um fracasso, mesmo funcionando**

- A tela dizer, por texto, tempo ou formato, se um e-mail tem conta.
- O token da sessão legível por script da página.
- Um link de "volta" depois do login levar para fora do site.
- Uma sessão roubada continuar valendo depois que a dona troca a senha.

## 3. Caminhos considerados

1. **Supabase Auth pelo servidor, sessão em cookie com `@supabase/ssr`.
   (escolhido)** É o que o backend já pressupõe: o gatilho de cadastro mora em
   `auth.users`, a RLS lê `auth.uid()` do token, e os códigos por e-mail, a
   proteção de senha vazada e o CAPTCHA já existem no Supabase.
2. **Auth.js (NextAuth) com o Supabase só como banco.** Teria de recriar o
   token que a RLS entende, o envio de códigos e a recuperação. Mais código
   de segurança nosso para manter. Descartado.
3. **Sessão própria, com senha guardada por nós.** Tudo do zero, inclusive o
   que mais vaza (senha). Descartado.

## 4. As telas e o que cada uma faz

Todas são páginas do servidor com formulários por Server Action. Nenhuma tela
mostra o erro do Supabase: cada ação devolve um código curto, e a tela o
traduz.

| Rota | Passos |
| --- | --- |
| `/cadastro` | 1. nome, celular, e-mail, senha, aceite dos termos (obrigatório), aceite de novidades (opcional, desmarcado), CAPTCHA. 2. o código de 6 dígitos, com "reenviar código". Depois do código, a cliente já sai logada, para onde ia (`volta`) ou para `/conta`. |
| `/entrar` | e-mail, senha, CAPTCHA; links para cadastro e recuperação. Se o e-mail ainda não foi confirmado, leva ao passo do código. |
| `/esqueci-a-senha` | 1. e-mail e CAPTCHA. 2. e-mail, código e senha nova. Depois, logada em `/conta`, com as outras sessões encerradas. |
| `/conta/excluir` | só logada. Se há pedido em aberto, diz que não dá e por quê. Senão: senha, CAPTCHA e a confirmação marcada. Depois, a conta some e a tela diz que acabou. |
| `/auth/callback` | sem tela. Confirma a troca de e-mail pelo link do e-mail (`token_hash`) e manda para `/conta/perfil`. |

O passo 2 do cadastro e da recuperação fica na mesma página do passo 1. O
e-mail passa de um passo ao outro dentro do formulário, nunca na URL (URL vai
para log e histórico). Quem recarrega a página volta ao passo 1, que tem o
link "Já tenho o código".

`/redefinir-senha`, que o contrato listava, deixa de existir: o passo 2 de
`/esqueci-a-senha` faz o papel dela.

### 4.1 O que a tela responde

| Situação | Resposta |
| --- | --- |
| cadastro com e-mail que já tem conta | a mesma de sucesso: "Enviamos um código para <e-mail>". O Supabase não manda código nesse caso, e não diz que a conta existe. |
| login com e-mail ou senha errados | "E-mail ou senha não conferem." (uma frase só para os dois) |
| login de conta não confirmada | o passo do código, com "reenviar". O Supabase só diz isso quando a senha confere, então não revela conta a quem não sabe a senha. |
| recuperação com qualquer e-mail | "Se houver conta com esse e-mail, enviamos um código." |
| código errado ou vencido | "Código inválido ou vencido. Peça outro." |
| limite estourado | "Muitas tentativas. Espere um pouco e tente de novo." |
| senha fraca ou vazada | "Escolha outra senha: ..." com o motivo (curta, comum, já vazada). |
| falha que não é da cliente | "Não deu certo agora. Tente de novo em instantes." |

## 5. Sessão e as funções que Minha conta usa

Em `src/lib/auth/` (só servidor):

- `criarClienteServidor()`: o cliente do Supabase com a sessão da cliente,
  lida e gravada nos cookies pelo `@supabase/ssr`, com a porta do banco em
  toda chamada. Cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção.
- `criarClienteAdmin()`: chave secreta, sem sessão, com a porta. Só para
  `privado.consumir_limite` e para apagar o usuário na exclusão.
- `obterUsuario()`: `{ id, email, nome, celular }` ou `null`. A identidade
  vem de `auth.getUser()` (validado no Supabase, pega sessão revogada), nunca
  de `getSession()`; nome e celular vêm de `perfis`. Uma chamada por pedido
  de página.
- `exigirUsuario(volta)`: a cliente, ou redireciona para
  `/entrar?volta=<volta>`.
- `sair()`: Server Action; encerra esta sessão e volta para `/`.
- `voltaSegura(texto)`: aceita só caminho interno (começa com `/`, não com
  `//` nem `/\`, sem caractere de controle); senão `/conta`.

`proxy.ts` (raiz do projeto), só nas rotas da conta e da sacola:

1. Renova a sessão quando o token venceu (`@supabase/ssr`, como manda a
   documentação dele para o Next).
2. Gera o nonce e manda a política de segurança dessas páginas (§6).

O `proxy.ts` não decide acesso: quem decide é `exigirUsuario` em cada página
e em cada ação (o guia do Next pede isso).

## 6. Política de segurança das páginas com dado pessoal

Rotas: `/sacola`, `/conta` e o que estiver abaixo, `/entrar`, `/cadastro`,
`/esqueci-a-senha` e `/auth/*`. Elas passam a ser renderizadas a cada visita
(nonce exige). O catálogo que `/sacola` lê continua com o cache de 5 minutos.

```
default-src 'self';
script-src 'self' 'nonce-<novo a cada visita>' 'strict-dynamic' 'sha256-<o script do topo>';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
connect-src 'self';
frame-src https://challenges.cloudflare.com;
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

- O script do topo (`MARCAR_JS`, que marca a página como "tem JavaScript") é
  liberado pelo hash, porque o layout é o mesmo das páginas estáticas e não
  pode ler o nonce sem deixar o site inteiro dinâmico.
- `style-src` mantém `'unsafe-inline'`: o site usa `style` nos elementos, e
  nonce não vale para eles.
- Em desenvolvimento, `script-src` ganha `'unsafe-eval'` (o React pede).
- A regra estática de `next.config.ts` deixa de valer para essas rotas, para
  a resposta não sair com duas políticas. Os outros cabeçalhos (HSTS etc.)
  continuam em todas.
- Os domínios do Mercado Pago entram aqui na etapa 3.

## 7. CAPTCHA

**Cloudflare Turnstile** (escolha minha; o Supabase aceita ele e o hCaptcha).
Gratuito, sem coleta para anúncio, e na maior parte das vezes não pede nada à
cliente. Aparece só quando precisa (`appearance: interaction-only`), o que
combina com o visual fino do site.

- No cadastro, no login, no "reenviar código", na recuperação e na exclusão.
- O token do widget vai na ação e segue para o Supabase (`captchaToken`), que
  o confere com o segredo cadastrado no painel. O site não guarda segredo do
  Turnstile.
- Chave do site: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Em desenvolvimento, a chave
  de teste da Cloudflare que sempre passa.

## 8. Limites de tentativa

Por `privado.consumir_limite`, com a chave secreta, antes de chamar o
Supabase. Na dúvida (a consulta falhou), fecha.

| Ação | Limite |
| --- | --- |
| entrar | 10 a cada 15 min por IP, e 10 a cada 15 min por e-mail |
| cadastrar | 5 por hora por IP |
| confirmar o código do cadastro | 10 por hora por e-mail |
| reenviar código | 5 por hora por e-mail |
| pedir código de recuperação | 5 por hora por IP, e 5 por hora por e-mail |
| redefinir com o código | 10 por hora por IP, e 10 por hora por e-mail |
| excluir conta | 3 por hora por cliente |

O IP é o primeiro de `x-forwarded-for`. Em desenvolvimento isso é falsificável;
na hospedagem (backend §18), confere-se que ela sobrescreve o cabeçalho. O
limite por e-mail não depende do IP.

O limite de envio de e-mail do próprio Supabase não aparece como "Muitas
tentativas" no cadastro, na recuperação nem no reenvio: ele só dispara quando
um e-mail sairia (na recuperação, só para conta que existe; no cadastro, só
para conta nova), e mostrá-lo diria se a conta existe (§4.1). A tela responde
como se tivesse enviado. O limite por IP do Supabase vale para todos e aparece.

## 9. Senha

Mínimo 8 caracteres, máximo 72 (o limite do bcrypt, que o Supabase usa). A
regra de força e a de senha vazada são as do Supabase, configuradas no painel;
o site só repete o mínimo e o máximo para avisar antes de enviar.

## 10. Excluir conta

Pede a senha de novo. O servidor confere a senha num cliente à parte, sem
mexer na sessão atual, e então apaga o usuário com a chave secreta. O banco
faz o resto (backend §9.3): recusa se houver pedido em aberto, apaga o retrato
pessoal dos pedidos, perfil, endereços e comentários. Depois, a sessão desta
tela é encerrada e a ação leva a `/conta/excluida`, que diz "Sua conta foi
excluída." e leva à home. O aviso mora numa página própria porque apagar o
cookie numa ação faz o Next renderizar de novo a página atual, e
`/conta/excluir` sem sessão manda entrar.

## 11. Termos de uso e política de privacidade

Os textos não existem (backend §18). Até existirem, o aceite do cadastro diz
"Li e aceito os termos de uso e a política de privacidade" sem link, para o
site não ter link morto nem texto jurídico inventado. Ir ao ar sem os textos
continua bloqueado.

## 12. O que fica no painel do Supabase (do dono)

Já feito, segundo o dono: chave secreta, schema `privado` exposto, "Secure
email change" e "Require current password". Falta:

1. **Modelos de e-mail.** "Confirm signup" e "Reset password" mostrando o
   código: `{{ .Token }}`. "Change email address" com o link
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change`.
2. **Código vale no máximo 1 hora**; confirmação de e-mail ligada.
3. **CAPTCHA**: Turnstile ligado, com o segredo da Cloudflare (precisa de
   conta na Cloudflare; o site recebe só a chave pública).
4. **Senha**: mínimo 8; proteção contra senha vazada (plano Pro).
5. **URLs**: Site URL e a lista de redirecionamento só com `<site>/auth/callback`.
6. **SMTP próprio** antes de ir ao ar. O envio embutido só entrega a quem é
   membro da organização no Supabase, e com um limite baixo de envios por
   hora (o ensaio de 2026-11-20 esbarrou nele).
7. **Código de 6 dígitos**: "Email OTP Length" em 6. O projeto de
   desenvolvimento nasceu com 8 (achado em 2026-11-20); a tela e a regra do
   código contam 6.

## 13. Como provar

- **Unidade (Vitest):** cada ação na ordem certa (valida, limita, chama o
  Supabase, traduz) com a lista hostil da backend §14; mesma resposta para
  e-mail com e sem conta; `voltaSegura` com as tentativas de sair do site; a
  política do `proxy.ts` (nonce novo a cada visita, hash do script do topo
  igual ao do `MARCAR_JS`, cookie `httpOnly`).
- **Contra o banco de desenvolvimento** (`npm run test:banco`), com contas de
  ensaio criadas e apagadas pela chave secreta: código de cadastro, login,
  sessão no cookie, `obterUsuario` lendo o perfil pela porta, recuperação com
  as outras sessões encerradas, exclusão com e sem pedido em aberto.
- **No navegador**, com o servidor de desenvolvimento: cada tela, a política
  sem violação no console, o Turnstile de teste, celular a 360 px.

## 14. Deixado para quem constrói

- Os nomes dos arquivos dentro de `src/app/(conta)` e dos componentes.
- O texto de cada mensagem, a partir da §4.1.
- Como o widget do Turnstile é reiniciado depois de um envio que falhou (o
  token só vale uma vez).
