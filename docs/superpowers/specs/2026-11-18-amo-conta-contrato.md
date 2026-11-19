# AMO, contrato entre Autenticação e Minha conta

Rascunho de 2026-11-18. Duas sessões trabalham ao mesmo tempo, no mesmo
working tree e na mesma branch: **amo-2b** faz a autenticação, **amo-ca** faz
Minha conta. Este arquivo é a fonte da verdade entre as duas; cada uma edita
só a própria seção, e o que for comum se combina por mensagem antes.

> **Atualização, mesma data.** As sessões reiniciaram com outros nomes:
> amo-2b virou **amo-72** e amo-ca virou **amo-c4**. O dono pediu que o banco
> inteiro fosse desenhado primeiro, por uma sessão só. O desenho está em
> `2026-11-18-amo-backend-design.md` e **vale sobre este arquivo** em tudo
> que for banco. O que mudou: `perfis` e os gatilhos em `auth.users` passaram
> para a amo-c4; não existe cliente Supabase no navegador
> (`src/lib/auth/navegador.ts` deixa de existir); só a amo-c4 escreve
> migration.

## Comum

- **Backend:** Supabase já existente, projeto `yuhrtuizxuvqvvjtcemz` (conta
  pessoal do dono, não a org SASI). MCP `supabase-amo`; o MCP
  `claude_ai_Supabase` aponta para outra org e não deve ser usado.
- **O banco estava vazio** quando foi lido (sem tabelas, migrations ou
  funções).
- **Env:** `.env.local` (não versionado) com `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `.env.example` versionado (amo-72;
  a amo-c4 avisa as variáveis dela).
- **Pacotes:** `@supabase/supabase-js` e `@supabase/ssr`, adicionados pela
  amo-72, com aviso antes.
- **Migrations:** só a amo-c4, em `supabase/migrations/`.
- **Git:** ninguém commita arquivo do outro; nada de `stash`, `reset` ou
  `checkout` que mexa no working tree inteiro. Arquivos comuns (`Nav.tsx`,
  `layout.tsx`, `globals.css`, `package.json`): avisar antes.
- **Next 16:** ler `node_modules/next/dist/docs/` antes de codar; sessão no
  `proxy.ts`.

## Autenticação (amo-2b)

- Rotas: `/entrar`, `/cadastro`, `/esqueci-a-senha`, `/redefinir-senha`.
- `proxy.ts` renova a sessão.
- `src/lib/auth/index.ts` (só servidor):
  - `type Usuario = { id: string; email: string; nome: string; celular: string }`
  - `obterUsuario(): Promise<Usuario | null>`, com `getUser()` (validado no
    servidor), nunca `getSession()`.
  - `exigirUsuario(volta: string): Promise<Usuario>`, que redireciona para
    `/entrar?volta=<rota>` sem sessão.
  - `sair()`, server action, volta para `/`.
- `src/lib/auth/servidor.ts` → `criarClienteServidor()`;
  `src/lib/auth/navegador.ts` → `criarClienteNavegador()`.
- `volta` só aceita caminho interno (começa com `/`, não com `//`); a
  validação mora na `/entrar`.
- Tabela `perfis` (`id` = `auth.users.id`, `nome`, `celular`, `criado_em`):
  criada por trigger no cadastro, a partir de `raw_user_meta_data`. RLS:
  select e update só do próprio `id`; sem insert nem delete pelo cliente.
- CSS próprio em `src/app/estilos/auth.css`.

## Minha conta (amo-ca)

- Rotas: `/conta`, `/conta/pedidos`, `/conta/pedidos/[numero]`,
  `/conta/perfil`, todas atrás de `exigirUsuario()`.
- Perfil: editar nome e celular em `perfis`; trocar e-mail e senha por server
  action com `criarClienteServidor()`.
- Todo o banco, a camada de dados e as ações e rotas de pedido, pagamento,
  entrega e comentário: ver `2026-11-18-amo-backend-design.md`.
- Nav: link "Entrar" sem sessão, "Minha conta" com sessão.
- CSS próprio em `src/app/estilos/conta.css`.

## Recado para a sessão de autenticação

Escrito pela amo-c4 em 2026-11-18, quando a amo-72 já não estava no ar. Não
foi entregue por mensagem; leia antes de continuar.

1. **A porta do banco** (§5, regra 6 do desenho). Toda chamada à API de
   dados precisa do cabeçalho `x-amo-porta` com o segredo `SUPABASE_PORTA`.
   Sem ele, qualquer `.from()` ou `.rpc()` volta 401.
   - `criarClienteServidor()` e `criarClienteAdmin()` mandam
     `global: { headers: { 'x-amo-porta': process.env.SUPABASE_PORTA } }`.
   - A porta só cobre a API de dados. As chamadas de Auth (`signUp`,
     `signInWithPassword`, `verifyOtp`, `auth.admin.*`) não passam por ela.
2. **Variáveis novas no `.env.example`**, todas vazias e só de servidor,
   menos a que diz `NEXT_PUBLIC`: `SUPABASE_PORTA`, `TAREFAS_SEGREDO`,
   `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_ACCESS_TOKEN`,
   `MERCADOPAGO_WEBHOOK_SECRET`.
3. **Domínios do Mercado Pago para a CSP com nonce**, só na página
   `/sacola`. A documentação dele não publica lista oficial; estes foram
   observados no script e precisam ser confirmados na etapa 3, com a CSP em
   modo report-only:
   - `script-src`: `sdk.mercadopago.com`, `http2.mlstatic.com`
   - `frame-src`: `secure-fields.mercadopago.com`, `www.mercadopago.com`
   - `connect-src`: `api.mercadopago.com`, `api-static.mercadopago.com`,
     `api.mercadolibre.com`
   - `img-src`: `http2.mlstatic.com`
4. **Já combinado por mensagem e mantido:** versão dos termos `2026-11-18`;
   `privado.consumir_limite(chave text, maximo int, janela_segundos int)
   returns boolean`, chamada com o cliente admin; `service_role` não lê
   tabela, só executa funções de `privado`.
5. **O banco está pronto** (etapa 1, 2026-11-18): todas as tabelas,
   funções, gatilhos e a porta, com testes. Leia `supabase/README.md`. O
   `SUPABASE_PORTA` já está no `.env.local`. Os pacotes podem ser
   instalados. Ainda faltam, e são do dono: a `SUPABASE_SECRET_KEY` no
   `.env.local`, e o schema `privado` em "Exposed schemas" no painel (sem
   isso o cliente admin não chama as funções de `privado`).
6. **O dono pediu defesa explícita contra ataques** (§19 do desenho). O que
   cai na sua parte:
   - entrar, cadastrar e redefinir respondem igual para e-mail que existe e
     que não existe;
   - nenhuma ação devolve o erro cru do Supabase; só um código curto;
   - trocar a senha encerra as outras sessões;
   - nenhum filtro montado com texto (`.or()`, `.filter()` com valor de
     fora); só métodos com a coluna escrita no código;
   - os seus testes de entrada usam a mesma lista hostil do teste 7 da §14.

## Em aberto

Ver a §18 de `2026-11-18-amo-backend-design.md`.
