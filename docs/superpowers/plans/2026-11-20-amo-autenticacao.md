# AMO · Autenticação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cliente cria conta com o código de 6 dígitos, entra, sai, recupera a senha e exclui a conta, tudo pelo servidor do site, com a sessão em cookie `httpOnly` e as telas "As duas portas".

**Architecture:** `src/lib/auth/` (só servidor) guarda os dois clientes do Supabase, a identidade da cliente e as ações; regras de entrada puras em `src/lib/conta/regras.ts`; `src/proxy.ts` renova a sessão e manda a política de segurança com nonce nas rotas com dado pessoal. As telas são componentes de servidor com formulários cliente pequenos, sobre `useActionState`.

**Tech Stack:** Next.js 16.3.2 (App Router, `proxy.ts`), React 19, `@supabase/ssr` 0.12.7 e `@supabase/supabase-js` 2.119, Cloudflare Turnstile, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-amo-autenticacao-design.md` (aprovado). Contrato visual: `.impeccable/surfaces/src-app-entrar-page-tsx.md` e o esboço `.impeccable/mocks/decision/conta-abas.html`. Valem junto: `2026-11-18-amo-backend-design.md` (§5, §11, §13, §19) e `2026-11-18-amo-conta-contrato.md`.

## Decisões do plano

O que o desenho deixou para quem constrói, e uma lacuna que ele não viu.

1. **`proxy.ts` mora em `src/proxy.ts`**, porque o app está em `src/app` (guia do Next: no mesmo nível de `app`).
2. **`sair` mora em `src/lib/auth/acoes.ts`** (`'use server'`) e é reexportada por `src/lib/auth/index.ts`. Um arquivo `'use server'` transforma em ação pública tudo o que exporta, então `obterUsuario` e `exigirUsuario` não podem morar nele. Componente cliente importa `sair` de `@/lib/auth/acoes`.
3. **Confirmar o código do cadastro também tem limite**: 10 por hora por e-mail. A §8 do desenho não listava; sem ele, um código de 6 dígitos fica a um laço de distância. Entra na §8.
4. **O Turnstile está também no passo do código** do cadastro, porque "reenviar código" passa pelo CAPTCHA do Supabase.
5. **Peças que a Minha conta (etapa 2, parte B) ia criar e esta parte já precisa** nascem aqui, com os nomes e os tipos do plano da parte B: `consumirLimite` (`src/lib/dados/limites.ts`), `conferirEmail`, `conferirPerfil` e o tipo `Conferido` (`src/lib/conta/regras.ts`), `erroDoNome` e `erroDoCelular` (`src/lib/pedido.ts`) e a lista `HOSTIS` (`tests/fixtures/hostis.ts`). As Tasks 9 e 10 da parte B passam a só completar esses arquivos.
6. **Destino padrão depois de entrar: `/conta`**, que a parte B constrói logo em seguida. Até ela existir, o redirecionamento leva a uma página 404; os testes conferem o destino, não a página.
7. **Senha nova depois do código de recuperação:** `auth.updateUser({ password })` na sessão que o código abriu. Se o teste de banco da Task 6 mostrar que "Require current password" bloqueia esse caminho, a troca passa para `criarClienteAdmin().auth.admin.updateUserById(id, { password })` depois do código conferido, com o mesmo encerramento das outras sessões; vira uma regra no registro da execução.

## Global Constraints

- Ler o guia em `node_modules/next/dist/docs/` antes de tocar em rota, `proxy.ts`, ação de servidor ou `next.config.ts` (`AGENTS.md`). Para este plano: `01-app/01-getting-started/16-proxy.md`, `03-api-reference/03-file-conventions/proxy.md`, `02-guides/content-security-policy.md`, `02-guides/forms.md`, `02-guides/data-security.md`.
- O navegador não fala com o Supabase. Nenhum arquivo com `'use client'` importa `@supabase/*`, `src/lib/dados/` ou `src/lib/auth/` (fora `src/lib/auth/acoes.ts` e `src/lib/auth/volta.ts`).
- Todo módulo de `src/lib/auth/` começa com `import 'server-only'`, menos `acoes.ts` (`'use server'`) e `volta.ts` (puro).
- Toda chamada à API de dados leva `x-amo-porta`. A identidade vem de `auth.getUser()`, nunca de `getSession()`, e nunca de um campo do formulário.
- Cookie da sessão: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure` em produção.
- Nenhuma tela mostra a mensagem crua do Supabase. Toda ação devolve só `ok`, `passo`, `email`, `aviso`, `erro` e `campos`.
- Mesma resposta para e-mail com e sem conta, no cadastro e na recuperação (desenho §4.1).
- Ordem de toda ação: (1) sessão, quando a ação é de quem está logada; (2) conferir cada campo; (3) limite; (4) Supabase; (5) traduzir. Campo inválido não gasta limite nem chama o Supabase.
- Textos da tela: os da §4.1 do desenho, sem travessão nem meia-risca (`tests/travessao.test.ts`), todo "AMO" em `translate="no"`.
- Visual: o contrato de `.impeccable/surfaces/src-app-entrar-page-tsx.md` e o `DESIGN.md`. Antes de qualquer edição de UI, ler `C:\Users\enzom\.claude\skills\impeccable\reference\craft-floor.md`. Movimento só em `transform`/`opacity`, dentro de `html.js` e de `prefers-reduced-motion: no-preference` (`tests/movimento.test.ts`); efeito de mouse em `@media (hover: hover)` repetido em `:focus-visible`; alvos de 44 px.
- Link entre páginas é `<a>` comum (`eslint.config.mjs`).
- Commit só com autorização do Enzo (dada para esta execução); mensagem `feat:`/`fix:` em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **`volta` hostil**, na URL e no campo escondido do formulário (`//mal.com`, `/\mal.com`, `%2F%2Fmal.com`, `javascript:`, `https://mal.com`, controle no meio): o destino vira `/conta`. Testes nas Tasks 1 e 4.
2. **E-mail com maiúscula e espaço** ("  Maria@Exemplo.com "): cadastro, login e recuperação tratam como o mesmo e-mail. Testes nas Tasks 1 e 4.
3. **Código colado com espaço ou traço** ("123 456", "123-456"): aceito. Testes nas Tasks 1 e 4.
4. **CAPTCHA que não carregou ou venceu** (token vazio, `captcha_failed`): a tela pede para tentar de novo e o widget reinicia, sem perder o que foi digitado. Testes nas Tasks 4 e 5.
5. **Já logada em `/entrar` ou `/cadastro`**: vai direto para o destino, sem formulário. Teste na Task 5.

---

### Task 1: As regras de entrada

**Files:**
- Create: `src/lib/conta/regras.ts`, `src/lib/auth/volta.ts`, `src/lib/auth/termos.ts`, `tests/fixtures/hostis.ts`
- Modify: `src/lib/pedido.ts` (as duas regras que já existem viram funções exportadas)
- Test: `tests/conta-regras.test.ts`, `tests/volta.test.ts`

**Interfaces:**
- Produces:
  - `type Conferido<T, C extends string> = { ok: true; valor: T } | { ok: false; erros: Partial<Record<C, string>> }`
  - `conferirEmail(bruto: unknown): string | null`: aparado e em minúsculas; 3 a 320 caracteres, sem espaço, com `@` e ponto no domínio; senão `null`.
  - `conferirPerfil(bruto: { nome: unknown; celular: unknown }): Conferido<{ nome: string; celular: string }, 'nome' | 'celular'>`: nome aparado, espaços seguidos viram um, 2 a 80, sem controle nem `<>`; celular só com dígitos e a máscara `( ) + -` e espaço, sobrando 11 dígitos com o terceiro igual a 9; o valor sai só com os dígitos.
  - `conferirSenha(bruto: unknown): string | null`: 8 a 72 caracteres, sem byte nulo; sem aparar (espaço faz parte da senha).
  - `conferirSenhaAtual(bruto: unknown): string | null`: 1 a 72, sem byte nulo (para conferir a senha de quem já tem conta, cuja regra pode ser antiga).
  - `conferirCodigo(bruto: unknown): string | null`: tira espaço e traço; sobram exatamente 6 dígitos.
  - `erroDoNome(nome: string): string | null` e `erroDoCelular(celular: string): string | null` em `src/lib/pedido.ts`, usadas por `validarDados` (que não muda o que devolve) e por `conferirPerfil`.
  - `voltaSegura(bruto: unknown): string` em `src/lib/auth/volta.ts` (puro, sem `server-only`): o caminho, se for interno; senão `'/conta'`.
  - `VERSAO_DOS_TERMOS = '2026-11-18'` em `src/lib/auth/termos.ts`.
  - `HOSTIS: readonly string[]` em `tests/fixtures/hostis.ts`, com o conteúdo do plano da etapa 2 (Task 9, Step 1).

- [ ] **Step 1: Escrever os testes que falham**

`tests/volta.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { voltaSegura } from '@/lib/auth/volta'

describe('voltaSegura', () => {
  it.each(['/conta', '/conta/pedidos/AMO-2B7KQ9XZ', '/sacola', '/catalogo/prestigio?x=1#y'])('aceita %s', (c) => {
    expect(voltaSegura(c)).toBe(c)
  })
  it.each([
    '//mal.com', '/\\mal.com', '/%2F%2Fmal.com', '%2F%2Fmal.com', 'javascript:alert(1)', 'https://mal.com',
    'conta', '', ' /conta', '/conta\u0000x', '/conta\nx', null, 42, '/' + 'a'.repeat(600),
  ])('recusa %j e volta para /conta', (c) => {
    expect(voltaSegura(c)).toBe('/conta')
  })
})
```

`tests/conta-regras.test.ts`, com os casos:

| Função | Entrada | Esperado |
| --- | --- | --- |
| `conferirEmail` | `'  Maria@Exemplo.com '` | `'maria@exemplo.com'` |
| `conferirEmail` | `'maria'`, `'maria@exemplo'`, `'ma ria@exemplo.com'`, `'<a>@b.co'`, `null`, `'a'.repeat(321)` | `null` |
| `conferirPerfil` | `{ nome: '  Maria   José ', celular: '(11) 98765-4321' }` | `{ ok: true, valor: { nome: 'Maria José', celular: '11987654321' } }` |
| `conferirPerfil` | nome `'M'`, `'a'.repeat(81)`, `null` | erro só em `nome` |
| `conferirPerfil` | celular `'1198765432'`, `'11887654321'`, `'11987654321x'` | erro só em `celular` |
| `conferirSenha` | `'12345678'`, `' com espaco '` (12) | o mesmo texto |
| `conferirSenha` | `'1234567'`, `'a'.repeat(73)`, `'abcd\u0000efgh'`, `null` | `null` |
| `conferirCodigo` | `'123456'`, `'123 456'`, `' 123-456 '` | `'123456'` |
| `conferirCodigo` | `'12345'`, `'1234567'`, `'12a456'`, `null` | `null` |
| todas as de texto | cada item de `HOSTIS` | `null`/erro, ou o texto ao pé da letra; nunca lança exceção |

E em `tests/sacola.test.tsx` nada muda: ele já prova que `validarDados` segue igual.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/volta.test.ts tests/conta-regras.test.ts` → Expected: FAIL, os módulos não existem.

- [ ] **Step 3: Implementar** os quatro arquivos e a extração em `src/lib/pedido.ts`. `voltaSegura`: tipo `string`, até 512 caracteres, sem caractere de controle, começa com `/` e o segundo caractere não é `/` nem `\`; antes de conferir, decodifica uma vez com `decodeURIComponent` dentro de `try` e confere as duas formas.

- [ ] **Step 4: Rodar tudo**

Run: `npx vitest run` → Expected: PASS. `npx tsc --noEmit` e `npm run lint` sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/lib/conta src/lib/auth/volta.ts src/lib/auth/termos.ts src/lib/pedido.ts tests/fixtures/hostis.ts tests/conta-regras.test.ts tests/volta.test.ts
git commit -m "feat: as regras de entrada da conta e o destino seguro depois do login"
```

### Task 2: Os clientes, a identidade e o limite

**Files:**
- Modify: `src/lib/dados/ambiente.ts` (duas variáveis novas)
- Create: `src/lib/auth/cookies.ts`, `src/lib/auth/servidor.ts`, `src/lib/auth/admin.ts`, `src/lib/auth/index.ts`, `src/lib/auth/ip.ts`, `src/lib/dados/limites.ts`
- Test: `tests/auth-clientes.test.ts`, `tests/banco/limites.test.ts`

**Interfaces:**
- Consumes: `variavel` (etapa 2, Task 1); `voltaSegura` (Task 1).
- Produces:
  - `variavel` passa a aceitar `'SUPABASE_SECRET_KEY'` e `'NEXT_PUBLIC_TURNSTILE_SITE_KEY'`.
  - `OPCOES_DO_COOKIE: CookieOptions` em `cookies.ts`: `{ httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' }`; `apagarCookiesDaSessao(): Promise<void>` apaga todo cookie cujo nome começa com `sb-`.
  - `criarClienteServidor(): Promise<SupabaseClient<Database>>`: `createServerClient` com a chave publicável, `cookies.getAll`/`setAll` sobre `cookies()` de `next/headers` (o `setAll` envolvido em `try`, porque componente de servidor não grava cookie e quem renova é o `proxy.ts`), `cookieOptions: OPCOES_DO_COOKIE` e `global.headers` com a porta.
  - `criarClienteAdmin(): SupabaseClient<Database>`: `createClient` com `SUPABASE_SECRET_KEY`, sem sessão (`persistSession`, `autoRefreshToken` e `detectSessionInUrl` desligados) e com a porta.
  - `type Usuario = { id: string; email: string; nome: string; celular: string }`.
  - `obterUsuario(): Promise<Usuario | null>`, envolvida em `cache` do React: `auth.getUser()`; sem usuário ou com erro, `null`; senão lê `perfis` (`nome, celular`) pelo `id`. Sem perfil, `null`.
  - `exigirUsuario(volta: string): Promise<Usuario>`: sem usuário, `redirect('/entrar?volta=' + encodeURIComponent(voltaSegura(volta)))`.
  - `lerIp(cabecalhos: Headers): string`: o primeiro item de `x-forwarded-for`, aparado; senão `x-real-ip`; senão `'desconhecido'`; no máximo 64 caracteres.
  - `consumirLimite(chave: string, maximo: number, janelaSegundos: number): Promise<boolean>`: `criarClienteAdmin().schema('privado').rpc('consumir_limite', { p_chave, p_maximo, p_janela_segundos })`; erro ou resposta que não é `true` dá `false` (na dúvida, fecha).

- [ ] **Step 1: Escrever os testes que falham** em `tests/auth-clientes.test.ts` (`// @vitest-environment node`), com `vi.mock('next/headers')` (um pote de cookies em memória) e `vi.mock('next/navigation')` (`redirect` lança `new Error('REDIRECIONOU ' + url)`), e `fetch` trocado:

| Caso | Esperado |
| --- | --- |
| `criarClienteServidor()` e uma leitura de `perfis` | a requisição leva `x-amo-porta` com o segredo e o `apikey` publicável |
| `criarClienteAdmin()` e uma chamada | leva `x-amo-porta` e a chave secreta; nenhum cookie é lido |
| o `setAll` do cliente servidor recebe um cookie `sb-x-auth-token` | o pote grava com `httpOnly: true`, `sameSite: 'lax'`, `path: '/'` |
| `apagarCookiesDaSessao()` com `sb-x-auth-token`, `sb-x-auth-token.0` e `outro` | sobra só `outro` |
| `obterUsuario()` com `getUser` dando erro | `null` |
| `exigirUsuario('//mal.com')` sem sessão | lança `REDIRECIONOU /entrar?volta=%2Fconta` |
| `exigirUsuario('/conta/pedidos')` sem sessão | lança `REDIRECIONOU /entrar?volta=%2Fconta%2Fpedidos` |
| `lerIp` com `x-forwarded-for: ' 1.2.3.4 , 10.0.0.1'` | `'1.2.3.4'` |
| `lerIp` sem cabeçalho | `'desconhecido'` |
| `consumirLimite` com a resposta `true` / `false` / erro 500 / rede caída | `true` / `false` / `false` / `false` |

E `tests/banco/limites.test.ts`:

```ts
import { expect, it } from 'vitest'
import { consumirLimite } from '@/lib/dados/limites'
import { criarClienteAdmin } from '@/lib/auth/admin'

it('o limite conta e fecha no terceiro', async () => {
  const chave = `ensaio:${crypto.randomUUID()}`
  expect([await consumirLimite(chave, 2, 60), await consumirLimite(chave, 2, 60), await consumirLimite(chave, 2, 60)])
    .toEqual([true, true, false])
})

it('a chave secreta nao le tabela nenhuma', async () => {
  const { data, error } = await criarClienteAdmin().from('perfis').select('id')
  expect(data).toBeNull()
  expect(error?.code).toBe('42501')
})
```

`tests/banco/preparar.ts` passa a trocar `next/headers` por um pote em memória (para `server-only` e as funções de servidor rodarem fora do Next).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/auth-clientes.test.ts` e `npm run test:banco` → Expected: FAIL, os módulos não existem.

- [ ] **Step 3: Implementar** os seis módulos pelas interfaces acima.

- [ ] **Step 4: Rodar tudo**

Run: `npx vitest run` e `npm run test:banco` → Expected: PASS. `npx tsc --noEmit` e `npm run lint` sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth src/lib/dados tests/auth-clientes.test.ts tests/banco
git commit -m "feat: a sessao em cookie httpOnly, a identidade da cliente e o limite de tentativas"
```

### Task 3: O `proxy.ts` e a política com nonce

**Files:**
- Create: `src/lib/seguranca/rotas.ts`, `src/lib/seguranca/politica.ts`, `src/proxy.ts`
- Modify: `next.config.ts`, `src/app/sacola/page.tsx` (`await connection()`)
- Test: `tests/politica.test.ts`, `tests/proxy.test.ts`, `tests/cabecalhos.test.ts`

**Interfaces:**
- Consumes: `OPCOES_DO_COOKIE` (Task 2); `MARCAR_JS` de `src/components/InlineScript.tsx`.
- Produces:
  - `ROTAS_COM_NONCE = ['/sacola', '/conta', '/entrar', '/cadastro', '/esqueci-a-senha', '/auth'] as const` e `FONTE_SEM_NONCE: string` (a fonte de `headers()` que pega toda rota menos essas e o que está abaixo delas) em `rotas.ts`, sem alias `@` (o `next.config.ts` importa este arquivo).
  - `HASH_DO_SCRIPT_DO_TOPO: string` (`'sha256-<base64>'` do `MARCAR_JS`) e `montarPolitica(nonce: string, desenvolvimento: boolean): string` em `politica.ts`, com as diretivas exatas da §6 do desenho, numa linha, separadas por `; `.
  - `proxy(request: NextRequest): Promise<NextResponse>` e `config.matcher` em `src/proxy.ts`.

O `proxy.ts`, por pedido:
1. Gera o nonce: `Buffer.from(crypto.randomUUID()).toString('base64')`.
2. Monta os cabeçalhos do pedido com `Content-Security-Policy` e `x-nonce`, como no guia do Next.
3. Cria o cliente do `@supabase/ssr` como na documentação do Supabase para o Next (`getAll` do pedido; `setAll` grava no pedido, refaz `NextResponse.next({ request: { headers } })` com os cabeçalhos do passo 2 já com o cookie novo, grava na resposta com `OPCOES_DO_COOKIE` e copia os cabeçalhos de cache que o `setAll` recebe) e chama `auth.getClaims()`. Nada roda entre criar o cliente e `getClaims()`.
4. Põe a `Content-Security-Policy` na resposta e a devolve.

`config.matcher`: `['/sacola', '/conta/:path*', '/entrar', '/cadastro', '/esqueci-a-senha', '/auth/:path*']`.

`next.config.ts`: duas regras. `source: '/(.*)'` com HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy`; `source: FONTE_SEM_NONCE` com a CSP estática de hoje.

- [ ] **Step 1: Escrever os testes que falham**

`tests/politica.test.ts`:

| Caso | Esperado |
| --- | --- |
| `montarPolitica('abc', false)` | contém `script-src 'self' 'nonce-abc' 'strict-dynamic' ` e o `HASH_DO_SCRIPT_DO_TOPO`; `frame-src https://challenges.cloudflare.com`; `connect-src 'self'`; `object-src 'none'`; `frame-ancestors 'none'`; não contém `unsafe-eval` |
| `montarPolitica('abc', true)` | contém `'unsafe-eval'` |
| o hash | igual ao sha256 do texto do `<script>` que `renderToString(<InlineScript html={MARCAR_JS} />)` produz |

`tests/proxy.test.ts` (`// @vitest-environment node`), com `@supabase/ssr` trocado por um cliente falso que registra o `cookies` recebido:

| Caso | Esperado |
| --- | --- |
| dois pedidos a `/entrar` | dois nonces diferentes; a resposta tem `Content-Security-Policy` com o nonce; o pedido repassado tem `x-nonce` e a mesma política |
| o cliente falso chama `setAll` com um cookie novo | a resposta tem `Set-Cookie` com `HttpOnly`; o pedido repassado traz o cookie novo; a CSP continua na resposta |
| `config.matcher` | cobre cada item de `ROTAS_COM_NONCE` |

Em `tests/cabecalhos.test.ts`: a regra `/(.*)` tem os cinco cabeçalhos e nenhuma CSP; a regra `FONTE_SEM_NONCE` tem a CSP estática; um teste novo confere, com `path-to-regexp` (dependência do Next) ou com a mesma expressão, que `FONTE_SEM_NONCE` casa `/`, `/catalogo`, `/catalogo/prestigio` e `/contato` e não casa `/sacola`, `/conta`, `/conta/perfil`, `/entrar`, `/cadastro`, `/esqueci-a-senha` e `/auth/callback`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/politica.test.ts tests/proxy.test.ts tests/cabecalhos.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar** os três módulos, as duas regras de `next.config.ts` e o `await connection()` na página da sacola.

- [ ] **Step 4: Rodar tudo e conferir o build**

Run: `npx vitest run` → Expected: PASS.
Run: `npm run build` → Expected: `/sacola` dinâmica (`ƒ`); `/`, `/catalogo` e os produtos continuam pré-renderizados com 5 minutos; a varredura de segredos no fim sai limpa.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seguranca src/proxy.ts next.config.ts src/app/sacola/page.tsx tests/politica.test.ts tests/proxy.test.ts tests/cabecalhos.test.ts
git commit -m "feat: o proxy renova a sessao e manda a politica com nonce nas paginas com dado pessoal"
```

### Task 4: As ações

**Files:**
- Create: `src/lib/auth/erros.ts`, `src/lib/auth/acoes.ts`, `src/app/auth/callback/route.ts`
- Modify: `src/lib/auth/index.ts` (reexporta `sair`)
- Test: `tests/auth-acoes.test.ts`, `tests/auth-callback.test.ts`

**Interfaces:**
- Consumes: Tasks 1 e 2.
- Produces, em `erros.ts`:
  - `type CodigoDaConta = 'campos_invalidos' | 'muitas_tentativas' | 'credenciais' | 'codigo_invalido' | 'senha_fraca' | 'senha_vazada' | 'senha_igual' | 'captcha' | 'pedido_em_aberto' | 'tente_de_novo'`
  - `MENSAGENS_DA_CONTA: Record<CodigoDaConta, string>`, com os textos da §4.1 do desenho; `senha_vazada`: "Escolha outra senha: esta já apareceu em vazamentos."; `senha_igual`: "A senha nova precisa ser diferente da atual."; `captcha`: "Não conseguimos confirmar que você não é um robô. Tente de novo."; `pedido_em_aberto`: "Você tem um pedido em andamento. A conta pode ser excluída depois que ele for entregue ou cancelado."
  - `traduzirErroDoAuth(erro: { code?: string; status?: number; reasons?: string[] } | null): CodigoDaConta`: `invalid_credentials` → `credenciais`; `otp_expired` → `codigo_invalido`; `weak_password` → `senha_vazada` se `reasons` tem `pwned`, senão `senha_fraca`; `same_password` → `senha_igual`; `over_request_rate_limit` e `over_email_send_rate_limit` → `muitas_tentativas`; `captcha_failed` → `captcha`; `email_address_invalid` e `validation_failed` → `campos_invalidos`; o resto → `tente_de_novo`.
- Produces, em `acoes.ts` (`'use server'`), todas com a forma `(anterior: RespostaDaConta | null, form: FormData) => Promise<RespostaDaConta>`, menos `sair`:

```ts
export type PassoDaConta = 'codigo' | 'senha-nova'
export type RespostaDaConta =
  | { ok: true; passo?: PassoDaConta; email?: string; aviso?: 'codigo_reenviado' | 'conta_excluida' }
  | { ok: false; erro: CodigoDaConta; campos?: Record<string, string>; passo?: PassoDaConta; email?: string }
```

| Ação | Campos do formulário | Limite (chave, máximo, janela) | Supabase | Sucesso |
| --- | --- | --- | --- | --- |
| `entrar` | `email`, `senha` (atual), `volta`, `cf-turnstile-response` | `entrar:ip:<ip>` 10/900 e `entrar:email:<email>` 10/900 | `signInWithPassword` com `captchaToken` | `redirect(voltaSegura(volta))`; com `email_not_confirmed`, `{ ok: true, passo: 'codigo', email }` |
| `cadastrar` | `nome`, `celular`, `email`, `senha`, `termos` (`'on'`), `novidades`, `cf-turnstile-response` | `cadastrar:ip:<ip>` 5/3600 | `signUp` com `options.data` = `{ nome, celular, aceite_termos: true, versao_termos: VERSAO_DOS_TERMOS, aceite_marketing }` e `captchaToken` | `{ ok: true, passo: 'codigo', email }`, também para `user_already_exists` e `email_exists` |
| `confirmarCadastro` | `email`, `codigo`, `volta` | `confirmar:email:<email>` 10/3600 | `verifyOtp({ email, token, type: 'email' })` | `redirect(voltaSegura(volta))` |
| `reenviarCodigo` | `email`, `cf-turnstile-response` | `codigo:email:<email>` 5/3600 | `resend({ type: 'signup', email, options: { captchaToken } })` | `{ ok: true, passo: 'codigo', email, aviso: 'codigo_reenviado' }`, qualquer que seja a resposta 4xx |
| `pedirCodigoDeSenha` | `email`, `cf-turnstile-response` | `esqueci:ip:<ip>` 5/3600 e `esqueci:email:<email>` 5/3600 | `resetPasswordForEmail(email, { captchaToken })` | `{ ok: true, passo: 'senha-nova', email }`, qualquer que seja a resposta 4xx fora `captcha_failed` e os de limite |
| `trocarSenhaComCodigo` | `email`, `codigo`, `senha` (nova) | `redefinir:ip:<ip>` 10/3600 e `redefinir:email:<email>` 10/3600 | `verifyOtp({ email, token, type: 'recovery' })`, `updateUser({ password })`, `signOut({ scope: 'others' })` | `redirect('/conta')` |
| `excluirConta` | `senha` (atual), `confirmo` (`'on'`), `cf-turnstile-response` | `excluir:<id>` 3/3600 | `rpc('pode_excluir_conta')`; senha conferida por `signInWithPassword` num `createClient` à parte, sem sessão persistida; `criarClienteAdmin().auth.admin.deleteUser(id)`; `apagarCookiesDaSessao()` | `{ ok: true, aviso: 'conta_excluida' }` |
| `sair()` | nenhum | nenhum | `signOut()` (esta sessão) | `redirect('/')` |

Regras que valem para todas:
- O formulário de cadastro devolve em `campos` uma mensagem por campo: e-mail "Confira o e-mail: falta algo como nome@exemplo.com.", senha "Use 8 caracteres ou mais.", nome e celular as de `erroDoNome`/`erroDoCelular`, código "O código tem 6 números.", termos "Para criar a conta, aceite os termos."
- Resposta 5xx do Supabase, rede caída ou exceção: `tente_de_novo`. Nunca `message`, `stack` nem o objeto de erro na resposta.
- `excluirConta` começa com `exigirUsuario('/conta/excluir')`; a identidade e o e-mail usados vêm dela, nunca do formulário. Sem poder excluir: `pedido_em_aberto`.
- O e-mail que volta na resposta é o que já passou por `conferirEmail`.

`src/app/auth/callback/route.ts` (`GET`): aceita só `type=email_change` e `token_hash` com `^[A-Za-z0-9_-]{10,200}$`; `verifyOtp({ token_hash, type: 'email_change' })` pelo cliente servidor; sucesso redireciona para `/conta/perfil?aviso=email-trocado`, qualquer outra coisa para `/entrar?aviso=link-invalido`.

- [ ] **Step 1: Escrever os testes que falham**

`tests/auth-acoes.test.ts`, com `vi.mock` em `@/lib/auth/servidor` (um cliente falso com `auth.*` e `rpc` registrando as chamadas), `@/lib/auth/admin`, `@/lib/dados/limites`, `next/headers` e `next/navigation`. Antes de cada teste: limites liberados, IP `1.2.3.4`. Um caso por linha:

| Ação | Caso | Esperado |
| --- | --- | --- |
| todas | campo inválido | `campos_invalidos`, sem `consumirLimite` e sem Supabase |
| todas | limite estourado | `muitas_tentativas`, sem Supabase |
| todas | cada item de `HOSTIS` em cada campo de texto | `ok` ou `campos_invalidos`; nunca exceção |
| todas | Supabase lança ou responde 500 | `tente_de_novo`; `JSON.stringify(resposta)` sem o texto do erro |
| `entrar` | `'  Maria@Exemplo.com '` | `signInWithPassword` recebe `maria@exemplo.com`; limites `entrar:ip:1.2.3.4` e `entrar:email:maria@exemplo.com` |
| `entrar` | sucesso com `volta=//mal.com` | lança `REDIRECIONOU /conta` |
| `entrar` | sucesso com `volta=/sacola` | lança `REDIRECIONOU /sacola` |
| `entrar` | `invalid_credentials` | `credenciais` |
| `entrar` | `email_not_confirmed` | `{ ok: true, passo: 'codigo', email }` |
| `entrar` | `captcha_failed`, e o token repassado | `captcha`; `options.captchaToken` é o do campo |
| `cadastrar` | sucesso e `user_already_exists` | a mesma resposta, `{ ok: true, passo: 'codigo', email }` |
| `cadastrar` | os metadados | `options.data` igual a `{ nome: 'Maria José', celular: '11987654321', aceite_termos: true, versao_termos: '2026-11-18', aceite_marketing: false }` |
| `cadastrar` | sem `termos` | `campos_invalidos` com erro em `termos` |
| `cadastrar` | `weak_password` com `reasons: ['pwned']` | `senha_vazada` |
| `confirmarCadastro` | `'123 456'` | `verifyOtp` recebe `token: '123456'`, `type: 'email'` |
| `confirmarCadastro` | `otp_expired` | `codigo_invalido`, com `passo: 'codigo'` e o e-mail de volta |
| `pedirCodigoDeSenha` | sucesso e erro 400 qualquer | a mesma resposta, `{ ok: true, passo: 'senha-nova', email }` |
| `trocarSenhaComCodigo` | sucesso | `verifyOtp` `recovery`, depois `updateUser`, depois `signOut({ scope: 'others' })`, nessa ordem; lança `REDIRECIONOU /conta` |
| `trocarSenhaComCodigo` | `same_password` | `senha_igual`, sem `signOut` |
| `excluirConta` | sem sessão | lança `REDIRECIONOU /entrar?volta=%2Fconta%2Fexcluir` |
| `excluirConta` | `pode_excluir_conta` diz que não | `pedido_em_aberto`, sem conferir senha e sem apagar |
| `excluirConta` | senha errada | `credenciais`, sem `deleteUser` |
| `excluirConta` | sucesso | `deleteUser` com o id da sessão; cookies `sb-` apagados; `{ ok: true, aviso: 'conta_excluida' }` |
| toda resposta | chaves | só `ok`, `passo`, `email`, `aviso`, `erro` e `campos` |

`tests/auth-callback.test.ts`: `type=email_change` com `token_hash` válido e `verifyOtp` ok redireciona para `/conta/perfil?aviso=email-trocado`; `type=recovery`, `type=signup`, `token_hash` fora do formato ou `verifyOtp` com erro redirecionam para `/entrar?aviso=link-invalido` sem chamar o Supabase (menos no último caso).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/auth-acoes.test.ts tests/auth-callback.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar** `erros.ts`, as oito ações e a rota. O que se repete (ler o IP, consumir os limites, traduzir o erro) mora numa função só dentro de `acoes.ts`. `redirect` fica fora de qualquer `try`.

- [ ] **Step 4: Rodar tudo**

Run: `npx vitest run` → Expected: PASS. `npx tsc --noEmit` e `npm run lint` sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth src/app/auth tests/auth-acoes.test.ts tests/auth-callback.test.ts
git commit -m "feat: as acoes de entrar, cadastrar, confirmar, recuperar a senha, sair e excluir a conta"
```

### Task 5: As telas "As duas portas"

**Files:**
- Create: `src/components/conta/Turnstile.tsx`, `src/components/conta/PortaDaConta.tsx`, `src/components/conta/FormEsqueci.tsx`, `src/components/conta/FormExcluir.tsx`, `src/components/conta/TelaConta.tsx`, `src/app/entrar/page.tsx`, `src/app/cadastro/page.tsx`, `src/app/esqueci-a-senha/page.tsx`, `src/app/conta/excluir/page.tsx`, `src/app/estilos/auth.css`
- Modify: `src/app/globals.css` (importa `auth.css`), `.env.example` (`NEXT_PUBLIC_TURNSTILE_SITE_KEY=`)
- Test: `tests/auth-telas.test.tsx`

**Interfaces:**
- Consumes: as ações (Task 4); `obterUsuario`, `exigirUsuario` (Task 2); `voltaSegura` (Task 1); `mascararCelular` de `src/lib/pedido.ts`; `MENSAGENS_DA_CONTA` (Task 4).
- Produces:
  - `TelaConta({ gaveta, linhas, children })`: a casca de `TelaSacola` (nav, `main#conteudo`, rodapé), servidor.
  - `Turnstile({ chave, nonce, reiniciar }: { chave: string; nonce: string; reiniciar: unknown })`, cliente: carrega `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` por `next/script` com o `nonce`; renderiza com `appearance: 'interaction-only'` dentro do formulário (o widget cria o campo `cf-turnstile-response`); chama `turnstile.reset` quando `reiniciar` muda.
  - `PortaDaConta({ aba, volta, chaveDoTurnstile, nonce }: { aba: 'entrar' | 'cadastro'; volta: string; chaveDoTurnstile: string; nonce: string })`, cliente.
  - `FormEsqueci({ chaveDoTurnstile, nonce })` e `FormExcluir({ podeExcluir, motivo, chaveDoTurnstile, nonce })`, cliente.

O que cada tela faz (contrato visual na superfície e §4 do desenho):

| Rota | Servidor | Tela |
| --- | --- | --- |
| `/entrar`, `/cadastro` | já logada: `redirect(voltaSegura(volta))`; senão lê o nonce (`x-nonce`), a chave do Turnstile e o catálogo (para a nav) | H1 "Que bom" com "ter você aqui" em script; as abas como `<a href>` para `/entrar` e `/cadastro` (com a `volta`), `aria-current="page"` na atual, sobre o fio com o coração; o formulário da aba |
| `/esqueci-a-senha` | nonce, chave, catálogo | H1 "Vamos criar" com "uma senha nova" em script; os dois passos ("1. Seu e-mail", "2. Código e senha nova") sobre o mesmo fio, coração no atual; link "Já tenho o código" no passo 1 e "Voltar para entrar" |
| `/conta/excluir` | `exigirUsuario('/conta/excluir')`; `pode_excluir_conta`; nonce, chave, catálogo | H1 "Excluir" com "sua conta" em script; sem poder: a mensagem de `pedido_em_aberto` e o link para `/conta/pedidos`; com poder: o que some e o que fica (desenho §10), senha atual, a confirmação marcada e o botão; depois do sucesso, "Sua conta foi excluída." e o link para a home |

Comportamento:
- Com JavaScript, trocar de aba não recarrega: o formulário troca no lugar, o coração desliza pelo fio (`transform`, 0.5 s, curva da casa; sem deslizar com movimento reduzido), o endereço vira o da aba nova (`history.replaceState`) e o e-mail digitado passa de um formulário ao outro. Sem JavaScript, as abas são links e cada rota já nasce na aba certa.
- O passo do código (depois de `cadastrar`, ou de `entrar` com e-mail não confirmado) troca o formulário da aba "Criar conta" por: "Enviamos um código de 6 dígitos para <e-mail>.", o campo do código (`inputmode="numeric"`, `autocomplete="one-time-code"`), "Confirmar", e o botão de texto "Reenviar código" com o Turnstile. O e-mail vai num campo escondido.
- Erro de campo embaixo do campo, ligado por `aria-describedby`, contorno em `cobre-texto`; erro geral numa linha reservada acima do botão, com `role="alert"`; aviso (`codigo_reenviado`) com `aria-live="polite"`.
- Enquanto envia, o botão diz o que faz ("Entrando", "Criando a conta", "Conferindo o código"), sem reticências, e fica desabilitado.
- O passo do código aparece sempre na aba "Criar conta", venha ele de `cadastrar` ou de `entrar` com e-mail não confirmado.
- "mostrar" na senha é um botão de texto com `aria-pressed` que troca o `type` do campo.
- O celular usa `mascararCelular` enquanto digita.
- O aceite dos termos sem link (desenho §11); novidades desmarcado.
- A `volta` vai num campo escondido de `entrar` e `confirmarCadastro`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/auth-telas.test.tsx`, com as ações e `obterUsuario` trocados por `vi.mock` e o `Turnstile` trocado por um campo escondido `cf-turnstile-response`:

| Tela | Caso | Esperado |
| --- | --- | --- |
| todas | renderiza | um `h1`, sem pular nível; `axe` sem violação; todo campo com rótulo; nenhum texto com reticências |
| `/entrar` | já logada, `volta=/sacola` | lança `REDIRECIONOU /sacola` |
| `/cadastro` | já logada, `volta=//mal.com` | lança `REDIRECIONOU /conta` |
| `/entrar` | as abas | dois links, `/entrar?volta=...` e `/cadastro?volta=...`; o de "Entrar" com `aria-current="page"` |
| `PortaDaConta` | digita o e-mail em Entrar e clica "Criar conta" | o formulário de cadastro aparece sem recarregar, com o mesmo e-mail; a aba "Criar conta" ganha `aria-current` |
| `PortaDaConta` | `cadastrar` responde `passo: 'codigo'` | aparece o campo do código com `autocomplete="one-time-code"` e o e-mail na frase |
| `PortaDaConta` | `entrar` responde `credenciais` | "E-mail ou senha não conferem." com `role="alert"`; o e-mail digitado continua no campo |
| `PortaDaConta` | `cadastrar` responde `campos_invalidos` com erro em `celular` | a mensagem embaixo do celular, ligada por `aria-describedby`; o campo com `aria-invalid="true"` |
| `PortaDaConta` | `entrar` responde `captcha` | a mensagem de `captcha`; o `Turnstile` recebe um `reiniciar` novo |
| `PortaDaConta` | enviando | o botão desabilitado |
| `PortaDaConta` | "mostrar" | o campo da senha vira `type="text"` e o botão `aria-pressed="true"` |
| `/esqueci-a-senha` | `pedirCodigoDeSenha` responde `passo: 'senha-nova'` | aparecem código e senha nova; o coração passa ao passo 2 |
| `/conta/excluir` | não pode excluir | a mensagem de `pedido_em_aberto`, sem campo de senha |
| `/conta/excluir` | sucesso | "Sua conta foi excluída." e o link para `/` |

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/auth-telas.test.tsx` → Expected: FAIL.

- [ ] **Step 3: Construir** os componentes, as páginas e o CSS, no esboço escolhido e no `craft-floor.md`. Em `.env.local`, acrescentar `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (a chave pública de teste da Cloudflare, que sempre passa), sem ler nem imprimir o resto do arquivo.

- [ ] **Step 4: Rodar tudo**

Run: `npx vitest run` → Expected: PASS, inclusive `travessao`, `estilos` e `movimento`.
Run: `npm run build` → Expected: `/entrar`, `/cadastro`, `/esqueci-a-senha`, `/conta/excluir` e `/sacola` dinâmicas; o resto como antes; varredura limpa.

- [ ] **Step 5: Commit**

```bash
git add src/components/conta src/app/entrar src/app/cadastro src/app/esqueci-a-senha src/app/conta/excluir src/app/estilos/auth.css src/app/globals.css .env.example tests/auth-telas.test.tsx
git commit -m "feat: as telas de entrar, criar conta, recuperar a senha e excluir a conta"
```

### Task 6: As provas de ponta a ponta e o fecho

**Files:**
- Create: `tests/banco/auth.test.ts`
- Modify: `supabase/README.md`, `docs/superpowers/specs/2026-11-20-amo-autenticacao-design.md` (§8 e status), `docs/superpowers/specs/2026-11-18-amo-conta-contrato.md`, `docs/superpowers/plans/2026-11-18-amo-etapa-2-leitura.md` (Tasks 7, 9 e 10), `DESIGN.md`

- [ ] **Step 1: Escrever o teste de banco** `tests/banco/auth.test.ts`, chamando as ações de verdade contra o banco de desenvolvimento. `next/headers` é um pote de cookies por "navegador" (trocável no teste); `next/navigation.redirect` lança `REDIRECIONOU <url>`. Contas de ensaio com e-mail `ensaio-<aleatório>@amo-ensaio.dev`; os códigos vêm de `criarClienteAdmin().auth.admin.generateLink(...)` (`properties.email_otp`), que não manda e-mail. No `afterAll`, `deleteUser` de cada conta criada.

| Caso | Esperado |
| --- | --- |
| `generateLink({ type: 'signup', email, password, options: { data } })` com os metadados do cadastro, e `confirmarCadastro` com o código | lança `REDIRECIONOU /conta`; o pote tem cookie `sb-…-auth-token` (um ou mais pedaços); `obterUsuario()` devolve o nome e o celular do cadastro |
| `generateLink` de cadastro com `versao_termos: '2000-01-01'` | erro (o gatilho do banco recusa) |
| `entrar` com a senha certa, num segundo pote | lança `REDIRECIONOU /conta`; `obterUsuario()` nesse pote devolve a cliente |
| `entrar` com a senha errada | `credenciais` |
| `pedirCodigoDeSenha` com o e-mail da conta e com um e-mail sem conta | a mesma resposta nos dois |
| `generateLink({ type: 'recovery' })` e `trocarSenhaComCodigo` com uma senha nova | lança `REDIRECIONOU /conta`; `obterUsuario()` no segundo pote (a sessão antiga) devolve `null`; `entrar` com a senha nova funciona |
| `excluirConta` com a senha errada | `credenciais`; a conta continua existindo |
| `excluirConta` com a senha certa | `{ ok: true, aviso: 'conta_excluida' }`; `getUserById` não acha mais a conta; nenhum cookie `sb-` no pote |

Se `trocarSenhaComCodigo` falhar por exigir a senha atual, aplicar a decisão 7 do plano e registrar a regra.

- [ ] **Step 2: Rodar**

Run: `npm run test:banco` → Expected: PASS. Pelo MCP, depois: `select count(*) from auth.users where email like 'ensaio-%@amo-ensaio.dev'` → 0.

- [ ] **Step 3: O ensaio no navegador**, com `npm run dev` e o Edge sem cabeça por CDP (memória do projeto, "Capturas de tela nesta máquina"; capturas em `.impeccable/review/`): `/entrar` e `/cadastro` a 1440 e a 360 px; trocar de aba com o e-mail digitado; `/esqueci-a-senha`; uma conta criada pelo cadastro do site e confirmada com o código do `generateLink`; o console sem violação de CSP (o widget de teste do Turnstile carrega). Se o console apontar violação vinda do Turnstile, liberar só `https://challenges.cloudflare.com` na diretiva apontada, com teste em `tests/politica.test.ts`, e registrar a regra.

- [ ] **Step 4: A revisão final do Impeccable.** O revisor `impeccable-finish-reviewer`, com o pedido, o contrato da superfície, o esboço `conta-abas.html` como referência, as capturas do Step 3 e o `craft-floor.md`. Corrigir o que ele apontar como material. Depois, uma seção "As duas portas" no `DESIGN.md`, no molde de "O sumário" e "A sacola: o fio das etapas", descrevendo o que foi construído.

- [ ] **Step 5: Documentar.**
  - Desenho: a linha do limite de confirmar o código na §8 (decisão 3) e o status "construída e testada em <data>".
  - `supabase/README.md`: a lista do painel do Supabase da §12 do desenho, com o texto exato dos três modelos de e-mail.
  - Contrato: a sessão de autenticação foi assumida por esta sessão; `/redefinir-senha` deixou de existir; `sair` se importa de `@/lib/auth/acoes` em componente cliente.
  - Plano da etapa 2: na Task 7, os pré-requisitos estão cumpridos; nas Tasks 9 e 10, o que esta parte já entregou (decisão 5).

- [ ] **Step 6: Commit**

```bash
git add tests/banco/auth.test.ts supabase/README.md docs DESIGN.md src
git commit -m "test: cadastro, login, recuperacao e exclusao de ponta a ponta contra o banco"
```
