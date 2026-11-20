# AMO · Etapa 2 · Leitura (catálogo do banco e Minha conta) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O site passa a ler do Supabase o catálogo, o preço, a descrição e os comentários aprovados, e a cliente logada ganha Minha conta (perfil, endereços e pedidos).

**Architecture:** Uma camada de dados só de servidor, em `src/lib/dados/`, com um módulo por assunto, é o único lugar que fala com o banco e sempre manda o segredo da porta. O catálogo usa um cliente sem sessão, com cache de 5 minutos, e as páginas continuam estáticas. Minha conta usa o cliente com a sessão da cliente (feito pela sessão de autenticação), ações de servidor finas e as regras de entrada num módulo puro.

**Tech Stack:** Next.js 16.3.2 (App Router, modelo de cache anterior, sem `cacheComponents`), React 19, `@supabase/supabase-js`, Supabase (Postgres 17, MCP `supabase-amo`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (§5, §7, §8, §9.1, §11, §13, §14, §16, §17 e §19) e `docs/superpowers/specs/2026-11-18-amo-conta-contrato.md`. Ler as duas antes de começar; `supabase/README.md` diz como rodar os testes de banco.

## Como o plano se divide

- **Parte A, Tasks 1 a 6: o site lê do banco.** Não depende da sessão de autenticação. Pode começar já.
- **Parte B, Tasks 7 a 13: Minha conta.** Só começa quando os quatro itens de "Antes de começar" da Parte B estiverem de pé. A Task 7 confere isso.

Cada parte termina com o site funcionando e testado.

## Antes de começar

**Parte A**

1. O trabalho pendente no working tree (redesenho do catálogo, página de produto e sacola) está commitado. Este plano altera arquivos que hoje estão modificados ou sem rastreio (`src/lib/catalogo.ts`, `src/lib/produto.ts`, `src/lib/sacola.ts`, vários testes); sem uma base commitada, os commits deste plano levariam junto o trabalho de outra frente.
2. Linha de base conferida em 2026-11-18: `npx vitest run` dá 31 arquivos, 417 testes, todos passando.

**Parte B**

1. `src/lib/auth/` existe (sessão de autenticação): `exigirUsuario`, `obterUsuario`, `criarClienteServidor`, `criarClienteAdmin`, e as rotas `/entrar` e `/auth/callback`.
2. `SUPABASE_SECRET_KEY` no `.env.local` e o schema `privado` em "Exposed schemas" (do dono; spec §13).
3. No painel do Supabase, em Auth: "Require current password when changing password" ligado e "Secure email change" ligado (do dono).
4. O dono escolheu um dos esboços da Task 8.

## Decisões minhas que completam ou mudam o desenho

Cada uma pode ser revertida pelo dono na revisão do plano.

1. **Cache do catálogo: 5 minutos** (§17 deixou em aberto). Um preço trocado no painel aparece no site em até 5 minutos. Não há risco de cobrar errado: `criar_pedido` usa o preço do banco e recusa com `total_mudou`.
2. **`selos` ganha a coluna `ordem`** (migration nova). A página do catálogo mostra os selos como filtro, na ordem do cadastro, e o banco não garante ordem sem coluna.
3. **O produto só tem preço para o site quando está à venda.** `a_venda = false` vira produto sem preço: a página mostra a foto e o rótulo, sem preço e sem botão.
4. **A rota do produto continua com `dynamicParams = false`.** Um produto novo precisa de foto em `public/`, logo de um deploy; página sob demanda não ganharia nada.
5. **A nav tem um link só, "Minha conta", para `/conta`.** O contrato pedia "Entrar" sem sessão e "Minha conta" com sessão, mas ler a sessão na nav tornaria dinâmicas a home e o catálogo, que hoje são estáticas. Sem sessão, `/conta` manda para `/entrar?volta=/conta`.
6. **Trocar a senha usa o recurso nativo do Supabase** (`updateUser` com `current_password`), não um segundo login. Um segundo login esbarraria no CAPTCHA.
7. **Trocar o e-mail não pede a senha.** É um desvio da §11 ("redigitando a senha"). A proteção passa a ser o "Secure email change": a troca só vale depois de confirmada no e-mail antigo e no novo. Pedir a senha exigiria um segundo login com CAPTCHA dentro do perfil.
8. **O endereço vem do CEP pelo ViaCEP**, chamado pelo servidor (§17 deixou em aberto). Só o CEP sai do nosso servidor.
9. **Os cabeçalhos de segurança estáticos entram aqui** (`next.config.ts`), com a CSP sem nonce da §11. A CSP com nonce das páginas com dado pessoal continua da sessão de autenticação (`proxy.ts`).

## Fora deste plano

- Horário da loja na tela, cotação, `criar_pedido`, pagamento, `situacaoDoPedido` e o botão de pagar um pedido que aguarda: etapa 3.
- Escrever comentário (`enviarComentario`): entra com a etapa 3, quando existir pedido entregue. Aqui só a leitura dos aprovados.
- A tela e a ação de excluir conta: sessão de autenticação (§16). O perfil só leva até ela.
- Paginação de pedidos e de comentários: a lista de pedidos mostra os 50 mais recentes.

## Global Constraints

- Ler o guia em `node_modules/next/dist/docs/` antes de tocar em rota, cache, ação de servidor ou `next.config.ts` (`AGENTS.md`). Para este plano: `01-app/02-guides/caching-without-cache-components.md`, `incremental-static-regeneration.md`, `data-security.md`, `forms.md` e `content-security-policy.md`.
- O navegador não fala com o Supabase. Nenhum arquivo com `'use client'` importa de `src/lib/dados/` nem de `@supabase/supabase-js`.
- Todo módulo de `src/lib/dados/` começa com `import 'server-only'`. Só ele lê `process.env`.
- Toda chamada à API de dados leva o cabeçalho `x-amo-porta` com `process.env.SUPABASE_PORTA`.
- Nenhum segredo em log, em mensagem de erro ou em arquivo versionado. Erro do banco chega à tela só como código curto, nunca a mensagem crua.
- Todo `select` lista as colunas; nunca `*`. Em `comentarios`, nunca pedir `status` nem `user_id` com o cliente sem sessão (o banco recusa).
- Nenhum filtro montado com texto: nada de `.or()` nem `.filter()` com valor de fora; só métodos com a coluna escrita no código.
- Dinheiro em centavos inteiros.
- Só esta sessão escreve migration; migration aplicada não se edita. Depois de toda migration: rodar `supabase/tests/90_permissoes.sql` e o conselheiro de segurança (`get_advisors`).
- Git: não commitar arquivo da outra sessão; nada de `stash`, `reset` ou `checkout` amplo. Avisar no contrato antes de mexer em `Nav.tsx`, `layout.tsx`, `globals.css` e `package.json`.
- Sem travessão nem meia-risca em `src/`, `tests/`, `scripts/` e README (`tests/travessao.test.ts`). Comentário de código sem acento, como no resto do repositório.
- Link entre páginas é `<a>` comum, não `next/link` (`eslint.config.mjs`).
- Antes de qualquer edição de UI, ler `C:\Users\enzom\.claude\skills\impeccable\reference\craft-floor.md`. O cliente quer visual fino e delicado, e escolhe por esboço.
- Commit só com autorização do Enzo; mensagem no padrão do repositório (`feat:`/`fix:` em português), terminando com `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.

## Review Focus

1. **Banco fora do ar, ou a porta errada, no build ou na renovação do cache.** O build falha dizendo a tabela e o código, sem segredo; em produção a página antiga continua no ar. Teste na Task 3; conferência do build na Task 4.
2. **Linha do cadastro editada à mão no painel com dado torto** (`modo_de_aproveitar` sem `passos`, cor de rótulo desconhecida, produto com selo que não existe). O cadastro é recusado com a mensagem dizendo qual linha. Testes na Task 3.
3. **Produto sem preço ou fora de venda, inclusive já guardado na sacola do navegador.** A página mostra sem preço e sem botão; a sacola ignora o sabor. Testes na Task 4.
4. **Entrada hostil nas ações de Minha conta** (aspas, HTML, texto de 1 MB, byte nulo, operadores de filtro). Recusa na validação, antes do limite e do banco; nunca a mensagem crua de volta. Testes nas Tasks 9 e 11.
5. **Pedido de outra cliente, número inexistente ou número fora do formato em `/conta/pedidos/[numero]`.** O mesmo 404 nos três casos. E pedido já sem o retrato pessoal (anonimizado) aparece sem quebrar. Testes nas Tasks 10 e 12.

---

# Parte A · O site lê do banco

### Task 1: A base da camada de dados

**Files:**
- Modify: `package.json` (dependência e script), `vitest.config.mts`
- Create: `.env.example`, `src/lib/dados/ambiente.ts`, `src/lib/dados/erros.ts`, `src/lib/dados/publico.ts`, `src/lib/dados/banco.ts` (gerado)
- Create: `vitest.banco.config.mts`, `tests/apoio/vazio.ts`, `tests/banco/preparar.ts`
- Test: `tests/dados-base.test.ts`, `tests/banco/publico.test.ts`
- Modify: `docs/superpowers/specs/2026-11-18-amo-conta-contrato.md`, `supabase/README.md`

**Interfaces:**
- Produces:
  - `variavel(nome: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' | 'SUPABASE_PORTA'): string` em `ambiente.ts`
  - `falhaDoBanco(onde: string, erro: { code?: string } | null): Error` em `erros.ts`, com a mensagem `Falha no banco (<onde>): <código ou "sem código">`
  - `criarClientePublico(): SupabaseClient<Database>`, `CACHE_DO_CATALOGO_SEGUNDOS = 300` e `ETIQUETA_DO_CATALOGO = 'catalogo'` em `publico.ts`
  - `Database` e `Tables<'tabela'>` em `banco.ts`
  - `npm run test:banco`: os testes que falam com o banco de desenvolvimento, fora do `npm test`

- [ ] **Step 1: Avisar no contrato e instalar o pacote**

No contrato, na seção "Recado para a sessão de autenticação", acrescentar o item 7: esta sessão instalou `@supabase/supabase-js` e criou `.env.example`; `@supabase/ssr` continua com a autenticação.

Run: `npm install @supabase/supabase-js`

- [ ] **Step 2: Gerar os tipos do banco**

Chamar `generate_typescript_types` no MCP `supabase-amo` e gravar a saída em `src/lib/dados/banco.ts`, com duas linhas de comentário no topo: é arquivo gerado, e se regenera com essa mesma chamada depois de toda migration.

- [ ] **Step 3: Escrever os testes que falham** em `tests/dados-base.test.ts`

```ts
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { variavel } from '@/lib/dados/ambiente'
import { falhaDoBanco } from '@/lib/dados/erros'
import { criarClientePublico } from '@/lib/dados/publico'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('variavel', () => {
  it('devolve o valor quando existe', () => {
    vi.stubEnv('SUPABASE_PORTA', 'segredo-de-teste')
    expect(variavel('SUPABASE_PORTA')).toBe('segredo-de-teste')
  })
  it.each(['', '   '])('vazia (%j) lanca erro com o nome', (valor) => {
    vi.stubEnv('SUPABASE_PORTA', valor)
    expect(() => variavel('SUPABASE_PORTA')).toThrow('Falta a variável de ambiente SUPABASE_PORTA')
  })
})

describe('falhaDoBanco', () => {
  it('diz onde e o codigo, nunca a mensagem crua', () => {
    const erro = falhaDoBanco('produtos', { code: 'AMO401', message: 'texto cru', details: 'mais texto' } as never)
    expect(erro.message).toBe('Falha no banco (produtos): AMO401')
  })
  it('sem codigo, diz que nao veio', () => {
    expect(falhaDoBanco('produtos', null).message).toBe('Falha no banco (produtos): sem código')
  })
})

describe('criarClientePublico', () => {
  it('toda chamada leva a porta e o cache de 5 minutos, sem sessao', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemplo.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
    vi.stubEnv('SUPABASE_PORTA', 'segredo-de-teste')
    const busca = vi.fn(async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', busca)

    await criarClientePublico().from('loja').select('vendas_pausadas')

    const [url, opcoes] = busca.mock.calls[0] as unknown as [string, RequestInit & { next?: unknown }]
    expect(String(url)).toContain('https://exemplo.supabase.co/rest/v1/loja')
    expect(new Headers(opcoes.headers).get('x-amo-porta')).toBe('segredo-de-teste')
    expect(opcoes.next).toEqual({ revalidate: 300, tags: ['catalogo'] })
  })
})
```

E em `tests/banco/publico.test.ts`:

```ts
import { expect, it } from 'vitest'
import { criarClientePublico } from '@/lib/dados/publico'

it('le a loja pela porta, como visitante', async () => {
  const { data, error } = await criarClientePublico().from('loja').select('vendas_pausadas')
  expect(error).toBeNull()
  expect(data).toHaveLength(1)
})

it('como visitante, nao le perfil de ninguem', async () => {
  const { data, error } = await criarClientePublico().from('perfis').select('nome')
  expect(data).toBeNull()
  expect(error?.code).toBe('42501')
})
```

- [ ] **Step 4: Configurar os dois conjuntos de teste**

`tests/apoio/vazio.ts`: `export {}`. É o que `server-only` vira nos testes.

`vitest.config.mts`: acrescentar o alias `'server-only': resolve(import.meta.dirname, './tests/apoio/vazio.ts')` e `exclude: [...configDefaults.exclude, 'tests/banco/**']` (importar `configDefaults` de `vitest/config`).

`vitest.banco.config.mts`: os mesmos dois alias (`@` e `server-only`), `environment: 'node'`, `globals: true`, `include: ['tests/banco/**/*.test.ts']`, `setupFiles: ['./tests/banco/preparar.ts']`, `testTimeout: 20000`.

`tests/banco/preparar.ts`: `process.loadEnvFile('.env.local')`.

`package.json`, em `scripts`: `"test:banco": "vitest run --config vitest.banco.config.mts"`.

- [ ] **Step 5: Rodar e ver falhar**

Run: `npx vitest run tests/dados-base.test.ts`
Expected: FAIL, os três módulos não existem.

- [ ] **Step 6: Implementar os três módulos**

- `ambiente.ts`: `variavel` lê com acesso literal (`process.env.SUPABASE_PORTA`, e assim para as três), na hora da chamada, nunca no topo do módulo; valor ausente ou só com espaços lança `Error('Falta a variável de ambiente <NOME>')`.
- `erros.ts`: `falhaDoBanco` como no teste.
- `publico.ts`: `createClient<Database>` com `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }`, `global.headers` com a porta e `global.fetch` que chama o `fetch` global na hora da chamada, somando `next: { revalidate: CACHE_DO_CATALOGO_SEGUNDOS, tags: [ETIQUETA_DO_CATALOGO] }` às opções.

- [ ] **Step 7: Criar `.env.example`**

Se o arquivo já existir (a autenticação pode ter criado), só acrescentar as linhas que faltam.

```
# Publicas por desenho (vao ao navegador)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=

# So do servidor. Nunca com NEXT_PUBLIC_, nunca em log.
SUPABASE_PORTA=
SUPABASE_SECRET_KEY=
TAREFAS_SEGREDO=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
```

- [ ] **Step 8: Rodar tudo**

Run: `npx vitest run` → Expected: PASS, 32 arquivos (os 31 de antes mais `dados-base`).
Run: `npm run test:banco` → Expected: PASS, 2 testes.
Run: `npx tsc --noEmit` e `npm run lint` → Expected: sem erro.

- [ ] **Step 9: Documentar e commitar**

Em `supabase/README.md`, na seção "Testes", uma linha: `npm run test:banco` roda os testes do site contra o banco de desenvolvimento e precisa do `.env.local`.

```bash
git add package.json package-lock.json vitest.config.mts vitest.banco.config.mts .env.example src/lib/dados tests/apoio tests/banco tests/dados-base.test.ts supabase/README.md docs/superpowers/specs/2026-11-18-amo-conta-contrato.md
git commit -m "feat: a base da camada de dados, com a porta e o cache do catalogo"
```

### Task 2: Os selos ganham ordem

**Files:**
- Create: `supabase/migrations/<versão>_selos_ordem.sql`
- Modify: `src/lib/catalogo.ts`, `src/data/selos.ts`, `tests/fixtures/catalogo-misto.ts`, `src/lib/dados/banco.ts` (regenerado), `supabase/tests/02_catalogo.sql`, `supabase/README.md`
- Test: `tests/catalogo.test.ts`, `supabase/tests/02_catalogo.sql`

**Interfaces:**
- Produces: `Selo = { id: string; nome: string; ordem: number }`; a coluna `public.selos.ordem integer not null`.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/catalogo.test.ts`, dentro de "os dados de hoje":

```ts
it('os selos tem ordem, de 1 a 7, sem repetir', () => {
  expect(SELOS.map((s) => s.ordem)).toEqual([1, 2, 3, 4, 5, 6, 7])
})
```

Em `supabase/tests/02_catalogo.sql`, antes do relatório:

```sql
select pg_temp.verificar('os selos tem ordem, sem repetir',
  (select count(*) = 7 and count(distinct ordem) = 7 from public.selos));
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/catalogo.test.ts` → Expected: FAIL, `ordem` é `undefined`.
Rodar `_apoio.sql` + `02_catalogo.sql` pelo MCP → Expected: erro, a coluna não existe.

- [ ] **Step 3: Aplicar a migration** (`apply_migration`, nome `selos_ordem`)

```sql
-- AMO: os selos ganham ordem. A pagina do catalogo mostra os selos como
-- filtro, na ordem do cadastro; sem coluna, a ordem que o banco devolve nao
-- e garantida.
alter table public.selos add column ordem integer;

update public.selos set ordem = case id
  when 'zero-acucar' then 1 when 'adocante' then 2 when 'vapor' then 3
  when 'fibras' then 4 when 'vidro' then 5 when 'ingredientes' then 6
  when 'artesanal' then 7 end;

alter table public.selos alter column ordem set not null;
```

Conferir a versão com `list_migrations`, gravar o arquivo com o nome `<versão>_selos_ordem.sql` e regenerar `src/lib/dados/banco.ts`.

- [ ] **Step 4: Levar a ordem ao código**

`Selo` ganha `ordem: number` em `src/lib/catalogo.ts`; `src/data/selos.ts` ganha `ordem` de 1 a 7, na ordem em que já está; os dois selos a mais de `tests/fixtures/catalogo-misto.ts` ganham 8 e 9.

- [ ] **Step 5: Rodar tudo**

Run: `npx vitest run` → Expected: PASS.
Pelo MCP: `02_catalogo.sql` (20 verificações) e `90_permissoes.sql` (82), todas passando; `get_advisors` de segurança só com o que é de propósito.
Atualizar em `supabase/README.md` a tabela de migrations (linha `selos_ordem`) e a contagem do `02_catalogo.sql` (20).

- [ ] **Step 6: Commit**

```bash
git add supabase src/lib/catalogo.ts src/data/selos.ts src/lib/dados/banco.ts tests/catalogo.test.ts tests/fixtures/catalogo-misto.ts
git commit -m "feat: os selos ganham ordem no banco e no cadastro"
```

### Task 3: O carregador do catálogo

**Files:**
- Modify: `src/lib/catalogo.ts` (dois campos em `Produto`)
- Create: `src/lib/dados/catalogo.ts`
- Test: `tests/dados-catalogo.test.ts`, `tests/banco/catalogo.test.ts`

**Interfaces:**
- Consumes: `criarClientePublico`, `falhaDoBanco`, `Tables` (Task 1); `validarCatalogo` e os tipos de `src/lib/catalogo.ts`.
- Produces, em `src/lib/dados/catalogo.ts`:
  - `type TabelasDoCatalogo = { categorias: Tables<'categorias'>[]; linhas: Tables<'linhas'>[]; produtos: Tables<'produtos'>[]; selos: Tables<'selos'>[]; vontades: Tables<'vontades'>[] }`
  - `montarCatalogoDoBanco(t: TabelasDoCatalogo): Catalogo`, pura
  - `carregarCatalogo(): Promise<Catalogo>`
- Produces, em `Produto`: `descricao?: string` e `preco?: number` (centavos; só existe quando o produto está à venda).

O site ainda não usa este carregador; a troca é a Task 4.

- [ ] **Step 1: Escrever os testes que falham** em `tests/dados-catalogo.test.ts`

```ts
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Tables } from '@/lib/dados/banco'
import type { TabelasDoCatalogo } from '@/lib/dados/catalogo'

type Resposta = { data: unknown; error: { code: string; message?: string } | null }
const respostas: Record<string, Resposta> = {}
vi.mock('@/lib/dados/publico', () => ({
  criarClientePublico: () => ({
    from: (tabela: string) => ({ select: () => ({ order: async () => respostas[tabela] }) }),
  }),
}))
const { carregarCatalogo, montarCatalogoDoBanco } =
  await vi.importActual<typeof import('@/lib/dados/catalogo')>('@/lib/dados/catalogo')

const produto = (extra: Partial<Tables<'produtos'>> = {}): Tables<'produtos'> => ({
  slug: 'prestigio', nome: 'Prestígio', linha: 'bolos-no-pote', formato: 'pote', frase: null, descricao: null,
  imagem_src: '/produtos/prestigio.webp', imagem_alt: 'Pote', imagem_largura: 666, imagem_altura: 1000,
  selos: ['zero-acucar'], vontades: ['coco'], destaque: false, ordem: 1, preco_centavos: null, a_venda: false,
  ...extra,
})
const linha = (extra: Partial<Tables<'linhas'>> = {}): Tables<'linhas'> => ({
  slug: 'bolos-no-pote', categoria: 'doces', nome: 'Bolos no pote', tipo: 'Bolo no pote', regra: 'Zero açúcar',
  selos: ['zero-acucar'], frase: null, modo_de_aproveitar: null, cor_do_rotulo: 'papel', ordem: 1,
  ...extra,
})
const tabelas = (extra: Partial<TabelasDoCatalogo> = {}): TabelasDoCatalogo => ({
  categorias: [{ slug: 'doces', nome: 'Doces', ordem: 1 }],
  linhas: [linha()],
  produtos: [produto()],
  selos: [{ id: 'zero-acucar', nome: 'Zero açúcar', ordem: 1 }],
  vontades: [{ slug: 'coco', palavra: 'Coco', ordem: 1 }],
  ...extra,
})
const servir = (t: TabelasDoCatalogo) => {
  for (const [nome, linhas] of Object.entries(t)) respostas[nome] = { data: linhas, error: null }
}

describe('montarCatalogoDoBanco', () => {
  it('o que e nulo ou falso no banco fica de fora do produto', () => {
    expect(montarCatalogoDoBanco(tabelas()).produtos[0]).toEqual({
      slug: 'prestigio', nome: 'Prestígio', linha: 'bolos-no-pote', formato: 'pote',
      imagem: { src: '/produtos/prestigio.webp', alt: 'Pote', largura: 666, altura: 1000 },
      selos: ['zero-acucar'], vontades: ['coco'], ordem: 1,
    })
  })
  it('a venda e com preco: o preco entra', () => {
    const c = montarCatalogoDoBanco(tabelas({ produtos: [produto({ preco_centavos: 1890, a_venda: true })] }))
    expect(c.produtos[0].preco).toBe(1890)
  })
  it('com preco mas fora de venda: sem preco', () => {
    const c = montarCatalogoDoBanco(tabelas({ produtos: [produto({ preco_centavos: 1890, a_venda: false })] }))
    expect(c.produtos[0].preco).toBeUndefined()
  })
  it('frase, descricao e destaque entram quando existem', () => {
    const c = montarCatalogoDoBanco(tabelas({ produtos: [produto({ frase: 'Um abraço', descricao: 'Massa úmida.', destaque: true })] }))
    expect(c.produtos[0]).toMatchObject({ frase: 'Um abraço', descricao: 'Massa úmida.', destaque: true })
  })
  it('a linha traz a cor do rotulo e o modo de aproveitar', () => {
    const modo = { titulo: 'Como aproveitar', passos: ['Abra', 'Coma'] }
    const c = montarCatalogoDoBanco(tabelas({ linhas: [linha({ modo_de_aproveitar: modo, frase: 'Um abraço' })] }))
    expect(c.linhas[0]).toMatchObject({ corDoRotulo: 'papel', modoDeAproveitar: modo, frase: 'Um abraço' })
  })
  it.each([[{ titulo: 'x' }], [{ titulo: 1, passos: [] }], [{ titulo: 'x', passos: ['a', 2] }], [{ titulo: 'x', passos: [] }], [[]]])(
    'modo de aproveitar fora do formato (%j) e recusado, dizendo a linha',
    (modo) => {
      expect(() => montarCatalogoDoBanco(tabelas({ linhas: [linha({ modo_de_aproveitar: modo as never })] }))).toThrow(
        'linha bolos-no-pote: modo de aproveitar fora do formato',
      )
    },
  )
  it('cor de rotulo desconhecida e recusada, dizendo a linha', () => {
    expect(() => montarCatalogoDoBanco(tabelas({ linhas: [linha({ cor_do_rotulo: 'roxo' })] }))).toThrow(
      'linha bolos-no-pote: cor do rótulo desconhecida',
    )
  })
})

describe('carregarCatalogo', () => {
  it('le as cinco tabelas e entrega o cadastro validado', async () => {
    servir(tabelas())
    expect((await carregarCatalogo()).produtos.map((p) => p.slug)).toEqual(['prestigio'])
  })
  it('falha do banco: diz a tabela e o codigo, e nada mais', async () => {
    servir(tabelas())
    respostas.produtos = { data: null, error: { code: 'AMO401', message: 'texto cru com segredo' } }
    await expect(carregarCatalogo()).rejects.toThrow('Falha no banco (produtos): AMO401')
    await expect(carregarCatalogo()).rejects.not.toThrow(/segredo/)
  })
  it('cadastro torto no banco e recusado pela validacao', async () => {
    servir(tabelas({ produtos: [produto({ selos: ['nao-existe'] })] }))
    await expect(carregarCatalogo()).rejects.toThrow(/Cadastro inválido[\s\S]*selo inexistente nao-existe/)
  })
})
```

E em `tests/banco/catalogo.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import imageSize from 'image-size'
import { expect, it } from 'vitest'
import { validarCatalogo } from '@/lib/catalogo'
import { carregarCatalogo } from '@/lib/dados/catalogo'

const c = await carregarCatalogo()
const publico = (src: string) => resolve(import.meta.dirname, '../../public', src.slice(1))

it('o cadastro do banco passa na validacao', () => {
  expect(validarCatalogo(c)).toEqual([])
})
it('traz os 7 potes, todos com preco e descricao', () => {
  expect(c.produtos).toHaveLength(7)
  expect(c.produtos.find((p) => p.slug === 'prestigio')).toMatchObject({ preco: 1890, destaque: true })
  for (const p of c.produtos) {
    expect(p.preco, p.slug).toBeGreaterThan(0)
    expect(p.descricao, p.slug).toBeTruthy()
  }
})
it('os selos vem na ordem do cadastro', () => {
  expect(c.selos.map((s) => s.id)).toEqual(['zero-acucar', 'adocante', 'vapor', 'fibras', 'vidro', 'ingredientes', 'artesanal'])
})
it('toda foto do banco existe em public, com as medidas declaradas', () => {
  for (const p of c.produtos) {
    expect(existsSync(publico(p.imagem.src)), p.imagem.src).toBe(true)
    const medida = imageSize(readFileSync(publico(p.imagem.src)))
    expect([medida.width, medida.height], p.slug).toEqual([p.imagem.largura, p.imagem.altura])
  }
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/dados-catalogo.test.ts` → Expected: FAIL, o módulo não existe.

- [ ] **Step 3: Implementar `src/lib/dados/catalogo.ts` e os dois campos de `Produto`**

- Cada leitura tem a forma `.from(tabela).select(<colunas, uma a uma>).order('ordem')`, as cinco em paralelo. Erro vira `throw falhaDoBanco(tabela, error)`.
- `montarCatalogoDoBanco` copia campo a campo. Ficam de fora quando o banco traz nulo: `frase`, `descricao`, `modoDeAproveitar`. `destaque` só entra quando é verdadeiro. `preco` só entra quando `a_venda` e `preco_centavos` existe.
- `modo_de_aproveitar` só vale como `{ titulo: string não vazia, passos: lista não vazia de strings }`; fora disso, `throw new Error('Cadastro inválido:\nlinha <slug>: modo de aproveitar fora do formato')`. Cor fora de `papel`, `linho`, `kraft`: o mesmo, com `cor do rótulo desconhecida`.
- `carregarCatalogo` monta, passa por `validarCatalogo` e lança `Cadastro inválido:\n<problemas>` como a versão antiga fazia.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run` → Expected: PASS.
Run: `npm run test:banco` → Expected: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalogo.ts src/lib/dados/catalogo.ts tests/dados-catalogo.test.ts tests/banco/catalogo.test.ts
git commit -m "feat: o carregador do catalogo le do banco e valida o cadastro"
```

### Task 4: O site troca de fonte

**Files:**
- Modify: `src/app/page.tsx`, `src/app/not-found.tsx`, `src/app/catalogo/page.tsx`, `src/app/catalogo/[produto]/page.tsx`, `src/app/sacola/page.tsx`
- Modify: `src/lib/catalogo.ts`, `src/lib/sacola.ts`, `src/lib/produto.ts`, `src/components/layout/TelaProduto.tsx`, `src/data/exemplos.ts`
- Delete: `src/data/categorias.ts`, `linhas.ts`, `produtos.ts`, `selos.ts`, `vontades.ts`
- Create: `tests/fixtures/cadastro.ts`
- Modify: `tests/setup.ts`, `tests/fixtures/catalogo-misto.ts` e os testes que importam `@/data/*` ou `carregarCatalogo`
- Test: `tests/sacola.test.tsx`, `tests/pagina-produto.test.tsx`, `tests/banco/catalogo.test.ts`

**Interfaces:**
- Consumes: `carregarCatalogo` de `@/lib/dados/catalogo` (Task 3).
- Produces:
  - `tests/fixtures/cadastro.ts` exporta `CATEGORIAS`, `LINHAS`, `PRODUTOS`, `SELOS`, `VONTADES` e `CADASTRO: Catalogo`. É o cadastro de hoje, igual à carga do banco de desenvolvimento.
  - `src/lib/catalogo.ts` fica só com os tipos e `validarCatalogo`.
  - `PaginaProduto` perde `detalhes`, e `DetalhesDoProduto` deixa de existir: preço e descrição moram em `produto.preco` e `produto.descricao`.

- [ ] **Step 1: Montar a fixture e o carregador de teste**

`tests/fixtures/cadastro.ts`: o conteúdo dos cinco arquivos de `src/data/`, num arquivo só. Cada produto ganha `descricao` e `preco` com os valores de `DETALHES_DE_EXEMPLO` (os sete têm).

Em `tests/setup.ts`, no topo:

```ts
import { vi } from 'vitest'

// Teste de unidade nunca fala com o banco: o carregador devolve o cadastro
// da fixture, em copia, para cada teste estragar a sua.
vi.mock('@/lib/dados/catalogo', async (original) => {
  const { CADASTRO } = await import('./fixtures/cadastro')
  return {
    ...(await original<typeof import('@/lib/dados/catalogo')>()),
    carregarCatalogo: async () => structuredClone(CADASTRO),
  }
})
```

- [ ] **Step 2: Escrever os testes que falham**

Em `tests/sacola.test.tsx`, em "as regras da sacola":

```ts
it('produto sem preco nao entra na loja, e a sacola guardada ignora o sabor', async () => {
  const c = await carregarCatalogo()
  delete c.produtos.find((p) => p.slug === 'pacoca')!.preco
  const semPacoca = montarLoja(c)
  expect(semPacoca).toHaveLength(6)
  expect(linhasDaSacola({ pacoca: 2, prestigio: 1 }, semPacoca).map((l) => l.slug)).toEqual(['prestigio'])
})
```

Em `tests/pagina-produto.test.tsx` (importar `TelaProduto`, `montarPaginaProduto`, `linhasComProduto`, `montarGaveta`, `carregarCatalogo` e o tipo `Produto`):

```tsx
describe('produto fora de venda ou sem descricao', () => {
  const tela = async (estragar: (p: Produto) => void) => {
    const c = await carregarCatalogo()
    estragar(c.produtos.find((p) => p.slug === 'pacoca')!)
    return render(
      <TelaProduto pagina={montarPaginaProduto(c, 'pacoca')!} gaveta={montarGaveta(c)} linhas={linhasComProduto(c)} />,
    )
  }
  it('sem preco: mostra o produto, sem preco e sem o botao da sacola', async () => {
    const { container } = await tela((p) => delete p.preco)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paçoca')
    expect(container.querySelector('.produto__preco')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Adicionar à sacola' })).toBeNull()
    expect(screen.getByText('Descrição')).toBeInTheDocument()
  })
  it('sem descricao: a secao some, o preco e o botao ficam', async () => {
    const { container } = await tela((p) => delete p.descricao)
    expect(screen.queryByText('Descrição')).toBeNull()
    expect(container.querySelector('.produto__preco')).not.toBeNull()
  })
})
```

Em `tests/banco/catalogo.test.ts`:

```ts
it('o banco de desenvolvimento traz exatamente o cadastro da fixture', () => {
  expect(c).toEqual(CADASTRO)
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/sacola.test.tsx tests/pagina-produto.test.tsx`
Expected: FAIL: `montarLoja` ainda lê `DETALHES_DE_EXEMPLO` e a tela ainda lê `detalhes`.

- [ ] **Step 4: Trocar a fonte**

- As cinco páginas importam `carregarCatalogo` de `@/lib/dados/catalogo`.
- `src/lib/catalogo.ts`: saem `carregarCatalogo` e os imports de `@/data/*`; o comentário do topo passa a dizer que quem lê o cadastro é `src/lib/dados/catalogo.ts`.
- `montarLoja` usa `p.preco`: produto sem `preco` não entra.
- `montarPaginaProduto` deixa de montar `detalhes`; `TelaProduto` mostra preço e `ProdutoCompra` quando há `produto.preco`, e a seção "Descrição" quando há `produto.descricao`. `generateMetadata` usa `produto.descricao`.
- `src/data/exemplos.ts` fica só com `COMENTARIOS_DE_EXEMPLO` (sai na Task 5). Apagar os outros cinco arquivos de `src/data/`.
- Nos testes: `@/data/*` vira `./fixtures/cadastro`; `carregarCatalogo` passa a ser importado de `@/lib/dados/catalogo`; `tests/fixtures/catalogo-misto.ts` importa de `./cadastro`. Em `tests/catalogo.test.ts`, o bloco `carregarCatalogo` sai (a prova dele agora é `tests/banco/catalogo.test.ts`) e `real()` passa a ser `structuredClone(CADASTRO)`.

- [ ] **Step 5: Rodar tudo**

Run: `npx vitest run` → Expected: PASS.
Run: `npm run test:banco` → Expected: PASS, 7 testes.
Run: `npx tsc --noEmit` e `npm run lint` → Expected: sem erro.
Run: `grep -rn "@/data/" src tests` → Expected: só `src/lib/produto.ts` importando `exemplos`.

- [ ] **Step 6: Conferir o build e o cache**

Run: `npm run build`
Expected: `/`, `/catalogo`, `/sacola` e as 7 páginas de `/catalogo/[produto]` aparecem como pré-renderizadas, com renovação de 5 minutos. Nenhuma delas como dinâmica (`ƒ`). Se alguma aparecer como dinâmica, parar e ver por quê antes de seguir.

Run: `npm run start`, e em outro terminal `curl -sI http://localhost:3000/catalogo/prestigio`
Expected: `200` e `x-nextjs-cache: HIT`. Abrir `/`, `/catalogo`, `/catalogo/prestigio` e `/sacola` no navegador: iguais a antes, com os preços. Encerrar o servidor.

- [ ] **Step 7: Commit**

```bash
git add -A src/app src/lib src/data src/components/layout/TelaProduto.tsx tests
git commit -m "feat: o site le o catalogo, o preco e a descricao do banco"
```

### Task 5: Os comentários aprovados vêm do banco

**Files:**
- Create: `src/lib/dados/comentarios.ts`, `tests/fixtures/comentarios.ts`
- Modify: `src/lib/produto.ts`, `src/app/catalogo/[produto]/page.tsx`, `tests/setup.ts`, `tests/pagina-produto.test.tsx`
- Delete: `src/data/exemplos.ts` (e a pasta `src/data/`)
- Test: `tests/dados-comentarios.test.ts`, `tests/banco/comentarios.test.ts`

**Interfaces:**
- Consumes: `criarClientePublico`, `falhaDoBanco`; `Comentario` e `Nota` de `src/lib/produto.ts`.
- Produces:
  - `montarComentario(linha: Pick<Tables<'comentarios'>, 'id' | 'produto' | 'nome_exibido' | 'nota' | 'texto' | 'criado_em'>): Comentario | null`
  - `lerComentariosAprovados(produto: string): Promise<Comentario[]>`, do mais novo para o mais antigo
  - `montarPaginaProduto(c: Catalogo, slug: string, comentarios: readonly Comentario[]): PaginaProduto | null`

- [ ] **Step 1: Escrever os testes que falham** em `tests/dados-comentarios.test.ts`

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { montarComentario } from '@/lib/dados/comentarios'

const linha = { id: 'c1', produto: 'prestigio', nome_exibido: 'Carla M.', nota: 5, texto: 'Molhadinho até o fundo.', criado_em: '2026-11-15T15:00:00+00:00' }

describe('montarComentario', () => {
  it('troca os nomes das colunas e deixa a data no formato da pagina', () => {
    expect(montarComentario(linha)).toEqual({ id: 'c1', produto: 'prestigio', nome: 'Carla M.', nota: 5, data: '2026-11-15', texto: 'Molhadinho até o fundo.' })
  })
  it('a data e o dia em Sao Paulo, nao em UTC', () => {
    expect(montarComentario({ ...linha, criado_em: '2026-11-16T01:30:00+00:00' })?.data).toBe('2026-11-15')
  })
  it.each([0, 6, 4.5])('nota fora de 1 a 5 (%s) descarta o comentario', (nota) => {
    expect(montarComentario({ ...linha, nota })).toBeNull()
  })
})
```

E em `tests/banco/comentarios.test.ts`:

```ts
import { expect, it } from 'vitest'
import { lerComentariosAprovados } from '@/lib/dados/comentarios'

it('le os comentarios aprovados de um sabor sem erro', async () => {
  expect(Array.isArray(await lerComentariosAprovados('prestigio'))).toBe(true)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/dados-comentarios.test.ts` → Expected: FAIL, o módulo não existe.

- [ ] **Step 3: Implementar e ligar na página**

- `lerComentariosAprovados`: `.from('comentarios').select('id, produto, nome_exibido, nota, texto, criado_em').eq('produto', produto).order('criado_em', { ascending: false })`. Sem filtro de `status`: o visitante não pode nem citar essa coluna, e a regra do banco já entrega só os aprovados.
- A data sai com `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`.
- `montarPaginaProduto` recebe os comentários. Na página do produto: carregar o cadastro, dar `notFound()` se o slug não for de um produto do cadastro e só então ler os comentários desse slug. O slug que vai para a consulta sai sempre do cadastro, nunca direto da URL.
- `tests/fixtures/comentarios.ts` recebe os 14 comentários de `src/data/exemplos.ts`. Em `tests/setup.ts`, um segundo `vi.mock`, no mesmo molde do primeiro, faz `lerComentariosAprovados(produto)` devolver os da fixture daquele produto, do mais novo para o mais antigo. Apagar `src/data/`.
- Nos testes que chamam `montarPaginaProduto` direto (Task 4), passar `[]` como terceiro argumento.

- [ ] **Step 4: Rodar tudo**

Run: `npx vitest run` → Expected: PASS (os testes de "8 comentários" e "2 comentários" de `pagina-produto` continuam valendo, agora pela fixture).
Run: `npm run test:banco` → Expected: PASS, 8 testes.
Run: `npm run build` → Expected: as mesmas rotas pré-renderizadas da Task 4.
Run: `ls src/data` → Expected: a pasta não existe.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib src/app/catalogo src/data tests
git commit -m "feat: os comentarios aprovados vem do banco"
```

### Task 6: Cabeçalhos de segurança e varredura de segredos

**Files:**
- Modify: `next.config.ts`, `package.json` (script), `supabase/README.md`, `docs/superpowers/specs/2026-11-18-amo-conta-contrato.md`
- Create: `scripts/varrer-segredos.mjs`
- Test: `tests/cabecalhos.test.ts`

**Interfaces:**
- Produces: toda resposta com os cabeçalhos abaixo; `npm run varrer`, que sai com código 1 se algum segredo estiver no que vai ao navegador.

- [ ] **Step 1: Escrever o teste que falha** em `tests/cabecalhos.test.ts`

```ts
// @vitest-environment node
import { expect, it } from 'vitest'
import config from '../next.config'

const regras = await config.headers!()
const todos = Object.fromEntries(regras.find((r) => r.source === '/(.*)')!.headers.map((h) => [h.key, h.value]))

it('toda resposta leva os cabecalhos de seguranca', () => {
  expect(todos['Strict-Transport-Security']).toBe('max-age=63072000')
  expect(todos['X-Content-Type-Options']).toBe('nosniff')
  expect(todos['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  expect(todos['X-Frame-Options']).toBe('DENY')
  expect(todos['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()')
})

it('a CSP fecha o que a pagina nao usa e nao libera dominio de fora', () => {
  const csp = todos['Content-Security-Policy']
  for (const diretiva of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
    expect(csp).toContain(diretiva)
  }
  expect(csp).not.toContain('unsafe-eval')
  expect(csp).not.toMatch(/https?:|\*/)
})

it('o servidor nao se anuncia', () => {
  expect(config.poweredByHeader).toBe(false)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/cabecalhos.test.ts` → Expected: FAIL, `config.headers` não existe.

- [ ] **Step 3: Implementar em `next.config.ts`**

`poweredByHeader: false` e `headers()` com uma regra para `/(.*)`. A CSP é a receita "Without Nonces" do guia do Next, sem `upgrade-insecure-requests` (o HSTS já cobre, e ela atrapalha o `next start` local):

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Com `NODE_ENV === 'development'`, `script-src` ganha `'unsafe-eval'`. O HSTS vai sem `includeSubDomains` e sem `preload`: o domínio ainda não foi escolhido (§18), e isso se revê na etapa 4.

- [ ] **Step 4: Escrever `scripts/varrer-segredos.mjs`**

Roda depois do build. Regras:
- Sem `.next/static`: sai com 1 e a mensagem "Rode npm run build antes."
- Lê `.env.local`. Para cada variável cujo nome não começa com `NEXT_PUBLIC_` e cujo valor tem 8 caracteres ou mais: o valor não pode aparecer em nenhum arquivo de `.next/static`.
- Marcas que também não podem aparecer: `sb_secret_`, `x-amo-porta` e `APP_USR-`.
- Para cada achado, uma linha com o arquivo e o nome da regra (o nome da variável ou a marca), nunca o valor. Sai com 1 se houver achado; senão imprime quantos arquivos leu e sai com 0.

Em `package.json`: `"varrer": "node scripts/varrer-segredos.mjs"`.

- [ ] **Step 5: Rodar e provar que a varredura pega**

Run: `npx vitest run` → Expected: PASS.
Run: `npm run build && npm run varrer` → Expected: sai com 0.
Prova de que ela pega: criar `.next/static/ensaio.txt` contendo `x-amo-porta`, rodar `npm run varrer` (Expected: sai com 1, citando `ensaio.txt` e `x-amo-porta`) e apagar o arquivo.
Run: `npm run dev`, abrir `/`, `/catalogo`, `/catalogo/prestigio` e `/sacola` e conferir o console do navegador → Expected: nenhuma violação de CSP; a sacola e a gaveta funcionam.

- [ ] **Step 6: Avisar a outra sessão, documentar e commitar**

No contrato, item 8 do recado: os cabeçalhos estáticos e a CSP sem nonce já saem de `next.config.ts` para todas as rotas. Quando o `proxy.ts` passar a mandar a CSP com nonce em `/sacola`, `/conta`, `/entrar`, `/cadastro` e na redefinição, a regra de `next.config.ts` deixa de valer para essas rotas (trocar o `source` por um que as exclua), para a resposta não sair com duas políticas.

Em `supabase/README.md`: `npm run varrer` roda depois de todo build, antes de publicar.

```bash
git add next.config.ts package.json scripts/varrer-segredos.mjs tests/cabecalhos.test.ts supabase/README.md docs/superpowers/specs/2026-11-18-amo-conta-contrato.md
git commit -m "feat: cabecalhos de seguranca em toda resposta e varredura de segredos no build"
```

**Fim da Parte A.** O site lê tudo do banco, continua estático e tem as duas provas do que vai ao navegador.

---

# Parte B · Minha conta

### Task 7: Encontro com a autenticação

> **Situação em 2026-11-20 (plano `2026-11-20-amo-autenticacao.md`, construído e testado).** Os itens 1 e 2 de "Antes de começar" da Parte B estão de pé; o 3 é do dono no painel (`supabase/README.md`, "O painel do Auth"); o 4 continua com a Task 8. As interfaces da tabela do Step 2, como ficaram:
> - a cliente logada: `exigirUsuario(volta)` e `obterUsuario()`, de `@/lib/auth`, com `Usuario = { id; email; nome; celular }`. Sem sessão, leva a `/entrar?volta=<rota>`.
> - o cliente com a sessão: `await criarClienteServidor()`, de `@/lib/auth/servidor`, com a porta.
> - o cliente da chave secreta: `criarClienteAdmin()`, de `@/lib/auth/admin`, com a porta.
> - a troca de e-mail: `/auth/callback?token_hash=...&type=email_change` (`src/app/auth/callback/route.ts`).
> - a regra de senha: `conferirSenha` (senha nova) e `conferirSenhaAtual`, de `src/lib/conta/regras.ts`.
> - a exclusão de conta: `/conta/excluir` (`src/app/conta/excluir/page.tsx`), atrás de `exigirUsuario`; depois de excluir, `/conta/excluida`.
> - a origem do site nos e-mails: nenhuma ação usa `emailRedirectTo`; o modelo "Change email address" usa `{{ .SiteURL }}`, o Site URL do painel.
> - a CSP com nonce: o `proxy.ts` cobre `/conta/:path*`.
> - `sair` se importa de `@/lib/auth/acoes` (não de `@/lib/auth`).
> - os textos de erro da conta: `MENSAGENS_DA_CONTA`, em `src/lib/conta/mensagens.ts`; a casca das telas: `TelaConta` e `lerDadosDaTela`, em `src/components/conta/TelaConta.tsx`.

Sem código novo. É a conferência de que o que a Parte B consome existe com os nomes que ela usa.

**Files:**
- Modify: este plano (só nomes, se mudarem) e `docs/superpowers/specs/2026-11-18-amo-conta-contrato.md`

- [ ] **Step 1: Conferir os quatro itens de "Antes de começar" da Parte B.** Faltando algum, parar e dizer ao Enzo qual.

- [ ] **Step 2: Conferir cada interface contra o código de `src/lib/auth/`**

| O que a Parte B usa | Como o plano escreve |
| --- | --- |
| a cliente logada | `exigirUsuario(volta: string): Promise<Usuario>`, com `Usuario = { id; email; nome; celular }`, de `@/lib/auth` |
| o cliente com a sessão dela | `await criarClienteServidor()`, de `@/lib/auth/servidor`, já com a porta |
| o cliente da chave secreta | `criarClienteAdmin()`, com a porta |
| a confirmação da troca de e-mail | `/auth/callback` trata `type=email_change` |
| a regra de senha | a mesma função que o cadastro usa para conferir a senha nova |
| a exclusão de conta | o caminho da rota dela, para o link do perfil |
| a origem do site nos e-mails | a mesma variável que a autenticação usa em `emailRedirectTo` |
| a CSP com nonce | o `proxy.ts` cobre `/conta` |

- [ ] **Step 3: Onde o nome for outro, trocar neste plano** (busca e troca nas Tasks 10 a 13) **e registrar no contrato.** O que faltar na autenticação vira pedido por mensagem à outra sessão, e a task que depende dele espera.

- [ ] **Step 4: Avisar no contrato** que esta sessão vai mexer em `Nav.tsx` (o link "Minha conta") e por que a nav não lê a sessão (decisão 5).

### Task 8: Os esboços de Minha conta

O cliente decide o visual por esboço. Nada de tela é construído antes da escolha.

**Files:**
- Create: `.impeccable/mocks/decision/conta-*.html` (três), `.impeccable/surfaces/src-app-conta-page-tsx.md`

- [ ] **Step 1: Usar a skill `impeccable`** para três esboços de Minha conta, no sistema de design que o site já tem (`DESIGN.md`, `PRODUCT.md`), finos e delicados. Cada esboço mostra as quatro telas e a nav com o link:

| Tela | O que mostra |
| --- | --- |
| `/conta` | saudação com o primeiro nome; o pedido mais recente (número, estado, total) ou o convite ao catálogo; caminhos para Pedidos e Perfil; Sair |
| `/conta/pedidos` | lista do mais novo ao mais antigo: número, data, estado, quantos potes, total; estado vazio com link para o catálogo |
| `/conta/pedidos/[numero]` | estado e as datas de cada passagem; os potes (nome, tipo, quantos, preço, total); subtotal, frete e total; endereço da entrega; como foi pago (Pix, ou bandeira e final do cartão); o link de rastreio quando está a caminho; "Cancelar pedido" quando aguarda pagamento |
| `/conta/perfil` | nome e celular; e-mail com a troca; senha com a troca; o aceite de novidades; os endereços (até 5, um principal: adicionar, alterar, remover, tornar principal); excluir conta |

- [ ] **Step 2: Mostrar os três ao Enzo e esperar a escolha.** Registrar a escolha no arquivo de superfície.

### Task 9: As regras de entrada da conta

> **Já entregue pela autenticação (2026-11-20, decisão 5 daquele plano):** `src/lib/conta/regras.ts` com `Conferido`, `conferirEmail`, `conferirPerfil`, `conferirSenha`, `conferirSenhaAtual` e `conferirCodigo`; `erroDoNome` e `erroDoCelular` em `src/lib/pedido.ts`; `HOSTIS` em `tests/fixtures/hostis.ts`; os testes em `tests/conta-regras.test.ts`. Esta task só completa o arquivo: `CampoDoEndereco`, `EnderecoNovo`, `conferirEndereco`, `conferirNumeroDoPedido` e `UFS`, com os testes deles.

**Files:**
- Create: `src/lib/conta/regras.ts`, `tests/fixtures/hostis.ts`
- Modify: `src/lib/pedido.ts` (as duas regras que já existem viram funções exportadas)
- Test: `tests/conta-regras.test.ts`

**Interfaces:**
- Produces, em `src/lib/conta/regras.ts` (puro, serve ao formulário e à ação):
  - `type Conferido<T, C extends string> = { ok: true; valor: T } | { ok: false; erros: Partial<Record<C, string>> }`
  - `conferirPerfil(bruto: { nome: unknown; celular: unknown }): Conferido<{ nome: string; celular: string }, 'nome' | 'celular'>`
  - `type CampoDoEndereco = 'apelido' | 'cep' | 'logradouro' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'uf'`
  - `type EnderecoNovo = { apelido: string | null; cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string; principal: boolean }`
  - `conferirEndereco(bruto: Record<CampoDoEndereco | 'principal', unknown>): Conferido<EnderecoNovo, CampoDoEndereco>`
  - `conferirEmail(bruto: unknown): string | null` (aparado e em minúsculas, ou `null`)
  - `conferirNumeroDoPedido(bruto: unknown): string | null`
  - `UFS: readonly string[]` (as 27)
- Produces, em `src/lib/pedido.ts`: `erroDoNome(nome: string): string | null` e `erroDoCelular(celular: string): string | null`, usadas por `validarDados` (sem mudar o que ele devolve) e por `conferirPerfil`.
- Produces: `HOSTIS: readonly string[]` em `tests/fixtures/hostis.ts`, a lista do teste 7 da §14, também para a sessão de autenticação.

Os limites são os do banco, um por um:

| Campo | Regra |
| --- | --- |
| texto em geral | aparado, espaços seguidos viram um; sem caractere de controle, sem `<` nem `>` |
| `nome` | 2 a 80 caracteres |
| `celular` | só dígitos e a máscara `( ) + -` e espaço; sobram 11 dígitos, o terceiro é 9 |
| `apelido` | vazio vira `null`; senão 1 a 30 |
| `cep` | 8 dígitos (a máscara sai) |
| `logradouro` | 2 a 120 |
| `numero` | `^[0-9A-Za-z][0-9A-Za-z /-]{0,9}$` |
| `complemento` | até 60; vazio vale |
| `bairro` | 1 a 60 |
| `cidade` | 2 a 60 |
| `uf` | uma das 27 |
| e-mail | 3 a 320, sem espaço, com `@` e ponto no domínio |
| número do pedido | `^AMO-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$` |

- [ ] **Step 1: Escrever os testes que falham** em `tests/conta-regras.test.ts`

`tests/fixtures/hostis.ts`:

```ts
/** A lista do teste 7 da spec (14): o que uma entrada hostil costuma trazer. */
export const HOSTIS: readonly string[] = [
  `'`, `"`, `'; drop table perfis; --`, `' or 1=1 --`, `/* x */ select 1`, `-- x`,
  `eq.1`, `or=(id.eq.1)`, `nome.ilike.*`, `*`,
  `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `javascript:alert(1)`,
  `a\u0000b`, `a\r\nb`, `a\tb`, 'a'.repeat(1_000_000),
]
```

Os testes:

```ts
import { describe, expect, it } from 'vitest'
import { conferirEmail, conferirEndereco, conferirNumeroDoPedido, conferirPerfil } from '@/lib/conta/regras'
import { HOSTIS } from './fixtures/hostis'

const endereco = { apelido: 'Casa', cep: '04567-000', logradouro: 'Rua Siqueira Bueno', numero: '120', complemento: 'ap 52', bairro: 'Belenzinho', cidade: 'São Paulo', uf: 'SP', principal: 'on' }

describe('conferirPerfil', () => {
  it('apara, junta espacos e deixa o celular so com digitos', () => {
    expect(conferirPerfil({ nome: '  Maria   José ', celular: '(11) 98765-4321' })).toEqual({
      ok: true, valor: { nome: 'Maria José', celular: '11987654321' },
    })
  })
  it.each([['M'], ['a'.repeat(81)], [null], [12]])('nome %j e recusado', (nome) => {
    const r = conferirPerfil({ nome, celular: '11987654321' })
    expect(r.ok === false && Object.keys(r.erros)).toEqual(['nome'])
  })
  it.each([['1198765432'], ['11887654321'], ['11987654321x'], ['']])('celular %j e recusado', (celular) => {
    const r = conferirPerfil({ nome: 'Maria', celular })
    expect(r.ok === false && Object.keys(r.erros)).toEqual(['celular'])
  })
  it.each(HOSTIS.map((h) => [h.slice(0, 40), h]))('entrada hostil %j: recusa, ou o texto ao pe da letra', (_, hostil) => {
    const r = conferirPerfil({ nome: hostil, celular: '11987654321' })
    const proibido = /[\u0000-\u001f\u007f<>]/.test(hostil.trim()) || hostil.trim().length > 80 || hostil.trim().length < 2
    if (proibido) expect(r.ok).toBe(false)
    else expect(r).toEqual({ ok: true, valor: { nome: hostil.trim().replace(/ +/g, ' '), celular: '11987654321' } })
  })
})

describe('conferirEndereco', () => {
  it('aceita o endereco completo e tira a mascara do CEP', () => {
    expect(conferirEndereco(endereco)).toEqual({
      ok: true,
      valor: { apelido: 'Casa', cep: '04567000', logradouro: 'Rua Siqueira Bueno', numero: '120', complemento: 'ap 52', bairro: 'Belenzinho', cidade: 'São Paulo', uf: 'SP', principal: true },
    })
  })
  it('apelido vazio vira nulo, complemento vazio vale, principal ausente e falso', () => {
    const r = conferirEndereco({ ...endereco, apelido: ' ', complemento: '', principal: null })
    expect(r.ok && [r.valor.apelido, r.valor.complemento, r.valor.principal]).toEqual([null, '', false])
  })
  it.each([
    ['cep', '0456700'], ['logradouro', 'R'], ['numero', '-12'], ['numero', '12345678901'],
    ['complemento', 'a'.repeat(61)], ['bairro', ''], ['cidade', 'S'], ['uf', 'XX'], ['apelido', 'a'.repeat(31)],
  ])('%s = %j e recusado, e so esse campo', (campo, valor) => {
    const r = conferirEndereco({ ...endereco, [campo]: valor })
    expect(r.ok === false && Object.keys(r.erros)).toEqual([campo])
  })
  it.each(HOSTIS.map((h) => [h.slice(0, 40), h]))('logradouro hostil %j nunca passa com controle, < ou >', (_, hostil) => {
    const r = conferirEndereco({ ...endereco, logradouro: hostil })
    if (r.ok) expect(r.valor.logradouro).not.toMatch(/[\u0000-\u001f\u007f<>]/)
    if (r.ok) expect(r.valor.logradouro.length).toBeLessThanOrEqual(120)
  })
})

describe('conferirEmail e conferirNumeroDoPedido', () => {
  it('e-mail: apara e poe em minusculas', () => {
    expect(conferirEmail('  Maria@Exemplo.com ')).toBe('maria@exemplo.com')
  })
  it.each([['maria'], ['maria@exemplo'], ['ma ria@exemplo.com'], ['<a>@b.co'], [null]])('e-mail %j e recusado', (email) => {
    expect(conferirEmail(email)).toBeNull()
  })
  it('numero do pedido: so o formato do banco', () => {
    expect(conferirNumeroDoPedido('AMO-2B7KQ9XZ')).toBe('AMO-2B7KQ9XZ')
    for (const ruim of ['amo-2B7KQ9XZ', 'AMO-2B7KQ9X', 'AMO-2B7KQ9XI', "AMO-2B7KQ9XZ' or 1=1", null]) {
      expect(conferirNumeroDoPedido(ruim)).toBeNull()
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/conta-regras.test.ts` → Expected: FAIL, o módulo não existe.

- [ ] **Step 3: Implementar** `regras.ts` pela tabela acima e extrair `erroDoNome` e `erroDoCelular` em `src/lib/pedido.ts`. As mensagens de cada campo são curtas, na voz do site, no molde das que `validarDados` já tem.

- [ ] **Step 4: Rodar tudo**

Run: `npx vitest run` → Expected: PASS, inclusive `tests/sacola.test.tsx` (prova de que `validarDados` não mudou).

- [ ] **Step 5: Commit**

```bash
git add src/lib/conta src/lib/pedido.ts tests/conta-regras.test.ts tests/fixtures/hostis.ts
git commit -m "feat: as regras de entrada de Minha conta, com a lista hostil"
```

### Task 10: A camada de dados da conta

> **Já entregue pela autenticação (2026-11-20):** `src/lib/dados/limites.ts` com `consumirLimite(chave, maximo, janelaSegundos)` e o teste de banco `tests/banco/limites.test.ts`. Esta task não recria esse arquivo; o resto (`erros.ts`, `perfil.ts`, `enderecos.ts`, `pedidos.ts`, `cep.ts`) segue como está.

**Files:**
- Modify: `src/lib/dados/erros.ts`, `src/lib/dados/banco.ts` (regenerado, agora com `privado`)
- Create: `src/lib/dados/perfil.ts`, `enderecos.ts`, `pedidos.ts`, `limites.ts`, `cep.ts`
- Test: `tests/dados-conta.test.ts` (unidade), `tests/banco/conta.test.ts` (banco de verdade)

**Interfaces:**
- Consumes: `criarClienteServidor`, `criarClienteAdmin` (Task 7); `EnderecoNovo` (Task 9); `falhaDoBanco` (Task 1).
- Produces:

```ts
// erros.ts
export class ErroDeRegra extends Error { readonly codigo: string }
/** P0001 com mensagem no formato de codigo vira ErroDeRegra; o resto, falhaDoBanco. */
export function erroDoBanco(onde: string, erro: { code?: string; message?: string } | null): Error

// perfil.ts
export type Perfil = { nome: string; celular: string; aceitaMarketing: boolean }
export function lerPerfil(usuarioId: string): Promise<Perfil | null>
export function gravarPerfil(usuarioId: string, dados: { nome: string; celular: string }): Promise<void>
export function gravarMarketing(aceita: boolean): Promise<void>
export function podeExcluirConta(): Promise<{ pode: boolean; motivo: string | null }>

// enderecos.ts
export type Endereco = EnderecoNovo & { id: string }
export function lerEnderecos(usuarioId: string): Promise<Endereco[]>
export function criarEndereco(novo: EnderecoNovo): Promise<void>
export function alterarEndereco(usuarioId: string, id: string, novo: EnderecoNovo): Promise<boolean>
export function apagarEndereco(usuarioId: string, id: string): Promise<boolean>
export function tornarEnderecoPrincipal(usuarioId: string, id: string): Promise<boolean>

// pedidos.ts
export type EstadoDoPedido = 'aguardando_pagamento' | 'pago' | 'em_preparo' | 'a_caminho' | 'entregue' | 'cancelado'
export type PedidoNaLista = { numero: string; estado: EstadoDoPedido; criadoEm: string; totalCentavos: number; potes: number }
export type PedidoCompleto = {
  numero: string
  estado: EstadoDoPedido
  motivoDoCancelamento: 'cliente' | 'pagamento' | 'expirado' | 'loja' | null
  datas: { criado: string; pago: string | null; emPreparo: string | null; aCaminho: string | null; entregue: string | null; cancelado: string | null }
  subtotalCentavos: number
  freteCentavos: number
  totalCentavos: number
  itens: { produto: string; nome: string; tipo: string; precoCentavos: number; quantos: number; totalCentavos: number }[]
  entrega: { cep: string; logradouro: string | null; numero: string | null; complemento: string | null; bairro: string; cidade: string; uf: string; minutos: number; rastreioUrl: string | null }
  /** so a tentativa aprovada */
  pagamento: { forma: 'pix' | 'cartao'; parcelas: number | null; cartaoBandeira: string | null; cartaoFinal: string | null } | null
}
export function lerPedidos(usuarioId: string): Promise<PedidoNaLista[]>
export function lerPedido(usuarioId: string, numero: string): Promise<PedidoCompleto | null>
export function cancelarPedidoDaCliente(usuarioId: string, numero: string): Promise<void>

// limites.ts
/** false quando estourou e tambem quando a consulta falhou: na duvida, fecha. */
export function consumirLimite(chave: string, maximo: number, janelaSegundos: number): Promise<boolean>

// cep.ts
export type EnderecoDoCep = { logradouro: string; bairro: string; cidade: string; uf: string }
/** null quando o CEP nao existe, o servico falhou ou demorou mais de 3 segundos. */
export function buscarCep(cep: string): Promise<EnderecoDoCep | null>
```

Regras que valem para todas:
- Duas barreiras em toda leitura e escrita por linha: o filtro explícito pelo `usuarioId` que veio de `exigirUsuario`, e a RLS. Nenhuma das duas é dispensada por causa da outra.
- `lerEnderecos`: o principal primeiro, depois por `criado_em`. `lerPedidos`: os 50 mais recentes; `potes` é a soma de `quantos`.
- `lerPedido` não devolve `id`, `user_id`, e-mail, nome, celular, nem os campos de Pix. `rastreioUrl` só passa se for `https` de `uber.com` ou subdomínio; senão vira `null`.
- `cancelarPedidoDaCliente` acha o pedido pelo número (da própria cliente) e chama `cancelar_pedido`; número que não é dela vira `ErroDeRegra('pedido_invalido')`.
- `consumirLimite` chama `privado.consumir_limite(p_chave, p_maximo, p_janela_segundos)` com o cliente da chave secreta.
- `buscarCep` chama `https://viacep.com.br/ws/<8 dígitos>/json/` com `cache: 'no-store'` e `AbortSignal.timeout(3000)`. O CEP é conferido (`^[0-9]{8}$`) antes de montar o endereço da chamada. Cada campo da resposta é aparado, perde caractere de controle e `<>`, e é cortado no máximo do banco; UF fora das 27 vira `null`.

- [ ] **Step 1: Regenerar os tipos** (`generate_typescript_types`), agora que `privado` está exposto. Se a geração trouxer só `public`, `consumirLimite` declara o retorno à mão (`boolean`) na própria função; nada de editar o arquivo gerado.

- [ ] **Step 2: Escrever os testes de unidade que falham** em `tests/dados-conta.test.ts`

Sem banco: o que é puro e a chamada ao ViaCEP com `fetch` trocado.

```ts
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarCep } from '@/lib/dados/cep'
import { ErroDeRegra, erroDoBanco } from '@/lib/dados/erros'

afterEach(() => vi.unstubAllGlobals())
const responder = (corpo: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })))

describe('erroDoBanco', () => {
  it('P0001 com codigo curto vira ErroDeRegra', () => {
    const e = erroDoBanco('enderecos', { code: 'P0001', message: 'limite_de_enderecos' })
    expect(e).toBeInstanceOf(ErroDeRegra)
    expect((e as ErroDeRegra).codigo).toBe('limite_de_enderecos')
  })
  it.each([
    [{ code: 'P0001', message: 'Texto solto que nao e codigo' }],
    [{ code: '42501', message: 'permission denied for table perfis' }],
    [null],
  ])('o resto (%j) vira falha generica, sem a mensagem crua', (erro) => {
    const e = erroDoBanco('enderecos', erro)
    expect(e).not.toBeInstanceOf(ErroDeRegra)
    expect(e.message).toMatch(/^Falha no banco \(enderecos\): /)
    expect(e.message).not.toMatch(/permission|Texto solto/)
  })
})

describe('buscarCep', () => {
  it('devolve o endereco do CEP', async () => {
    responder({ logradouro: 'Rua Siqueira Bueno', bairro: 'Belenzinho', localidade: 'São Paulo', uf: 'SP' })
    expect(await buscarCep('04567000')).toEqual({ logradouro: 'Rua Siqueira Bueno', bairro: 'Belenzinho', cidade: 'São Paulo', uf: 'SP' })
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe('https://viacep.com.br/ws/04567000/json/')
  })
  it.each(['0456700', '04567-000', '04567000/../x', 'abcdefgh'])('CEP fora do formato (%j) nem sai do servidor', async (cep) => {
    responder({})
    expect(await buscarCep(cep)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('CEP que nao existe, erro do servico e resposta torta viram null', async () => {
    responder({ erro: 'true' })
    expect(await buscarCep('99999999')).toBeNull()
    responder({}, 500)
    expect(await buscarCep('04567000')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('tempo esgotado') }))
    expect(await buscarCep('04567000')).toBeNull()
  })
  it('limpa e corta o que o servico devolve', async () => {
    responder({ logradouro: `<b>Rua</b>\u0000 ${'a'.repeat(200)}`, bairro: 'Centro', localidade: 'São Paulo', uf: 'ZZ' })
    expect(await buscarCep('04567000')).toBeNull()
    responder({ logradouro: `<b>Rua</b>\u0000 ${'a'.repeat(200)}`, bairro: 'Centro', localidade: 'São Paulo', uf: 'SP' })
    const r = await buscarCep('04567000')
    expect(r?.logradouro).not.toMatch(/[<>\u0000]/)
    expect(r?.logradouro.length).toBeLessThanOrEqual(120)
  })
})
```

- [ ] **Step 3: Escrever o teste de banco que falha** em `tests/banco/conta.test.ts`

Monta duas clientes de ensaio de verdade e roda a camada de dados com a sessão de cada uma. A sessão nasce sem senha e sem CAPTCHA: `auth.admin.createUser` (com `email_confirm: true` e os metadados do cadastro: `nome`, `celular`, `aceite_termos: true`, `versao_termos: '2026-11-18'`), depois `auth.admin.generateLink({ type: 'magiclink' })` e `verifyOtp({ token_hash, type: 'magiclink' })` num cliente comum com a porta. O módulo de `criarClienteServidor` é trocado (`vi.mock`) para devolver o cliente da cliente da vez. No `afterAll`, `auth.admin.deleteUser` das duas.

O que o teste afirma:

| Caso | Esperado |
| --- | --- |
| `lerPerfil(A)` | `{ nome: 'Cliente Ensaio', celular: '11987654321', aceitaMarketing: false }` |
| `gravarPerfil(A, { nome: 'Maria Ensaio', celular: '11912345678' })` e ler de novo | os dois campos novos |
| `gravarMarketing(true)` e ler de novo | `aceitaMarketing: true` |
| `criarEndereco` cinco vezes | cinco em `lerEnderecos(A)` |
| a sexta | rejeita com `ErroDeRegra`, `codigo === 'limite_de_enderecos'` |
| `tornarEnderecoPrincipal(A, <o terceiro>)` | `true`; em `lerEnderecos(A)`, um só principal, e ele vem primeiro |
| `apagarEndereco(A, <o quinto>)` | `true`; de novo, `false` |
| com a sessão de B: `lerEnderecos(A)`, `lerPerfil(A)`, `apagarEndereco(A, <um de A>)` | `[]`, `null` e `false`; A continua com os quatro |
| `lerPedidos(A)` e `lerPedido(A, 'AMO-22222222')` | `[]` e `null` |
| `cancelarPedidoDaCliente(A, 'AMO-22222222')` | rejeita com `ErroDeRegra`, `codigo === 'pedido_invalido'` |
| `podeExcluirConta()` | `{ pode: true, motivo: null }` |
| `consumirLimite('ensaio:<aleatório>', 2, 60)` três vezes | `true`, `true`, `false` |
| painel: `updateUser({ password: <nova>, current_password: 'errada' })` com a sessão de A | erro com `code` preenchido (prova de que o painel exige a senha atual). O teste guarda esse código em `expect(error?.code).toMatchInlineSnapshot()`: a documentação do Supabase não lista o código deste caso, e é o valor gravado aqui que a Task 11 usa |

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run tests/dados-conta.test.ts` e `npm run test:banco` → Expected: FAIL, os módulos não existem.

- [ ] **Step 5: Implementar os cinco módulos** pelas interfaces e regras acima. Erro de escrita passa por `erroDoBanco`. As colunas de cada `select` são exatamente as que o tipo de retorno usa.

- [ ] **Step 6: Rodar tudo**

Run: `npx vitest run` → Expected: PASS.
Run: `npm run test:banco` → Expected: PASS.
Pelo MCP, depois do teste: `select count(*) from auth.users where email like 'ensaio-%@teste.invalid'` → Expected: 0 (o teste limpou o que criou).

- [ ] **Step 7: Commit**

```bash
git add src/lib/dados tests/dados-conta.test.ts tests/banco/conta.test.ts
git commit -m "feat: a camada de dados de Minha conta, provada com sessao de verdade"
```

### Task 11: As ações da conta

**Files:**
- Create: `src/app/conta/acoes.ts`, `src/lib/conta/mensagens.ts`
- Test: `tests/conta-acoes.test.ts`

**Interfaces:**
- Consumes: `exigirUsuario` (Task 7); as regras (Task 9); a camada de dados (Task 10).
- Produces, em `src/app/conta/acoes.ts` (`'use server'`):

```ts
export type Resposta =
  | { ok: true; aviso?: 'salvo' | 'confira_os_dois_emails' | 'senha_trocada' | 'pedido_cancelado' }
  | { ok: false; erro: CodigoDeErro; campos?: Record<string, string> }

export function salvarPerfil(anterior: Resposta | null, form: FormData): Promise<Resposta>
export function definirMarketing(anterior: Resposta | null, form: FormData): Promise<Resposta>
export function salvarEndereco(anterior: Resposta | null, form: FormData): Promise<Resposta>   // campo `id` vazio cria
export function removerEndereco(anterior: Resposta | null, form: FormData): Promise<Resposta>
export function tornarPrincipal(anterior: Resposta | null, form: FormData): Promise<Resposta>
export function consultarCep(cep: string): Promise<EnderecoDoCep | null>
export function trocarSenha(anterior: Resposta | null, form: FormData): Promise<Resposta>
export function trocarEmail(anterior: Resposta | null, form: FormData): Promise<Resposta>
export function cancelarPedido(anterior: Resposta | null, form: FormData): Promise<Resposta>
```

- Produces, em `src/lib/conta/mensagens.ts`: `type CodigoDeErro = 'campos_invalidos' | 'muitas_tentativas' | 'tente_de_novo' | 'limite_de_enderecos' | 'endereco_nao_encontrado' | 'pedido_invalido' | 'senha_atual_errada' | 'senha_fraca' | 'senha_igual'`; `MENSAGENS: Record<CodigoDeErro, string>` e `AVISOS`, com os textos na voz do site.

Toda ação segue a ordem da §11, e o teste confere a ordem:

1. `exigirUsuario('/conta/perfil')` (ou a rota do pedido, em `cancelarPedido`).
2. Conferir cada campo com as regras da Task 9. Inválido: `{ ok: false, erro: 'campos_invalidos', campos }`, sem tocar no limite nem no banco.
3. `consumirLimite`. Estourou: `{ ok: false, erro: 'muitas_tentativas' }`, sem tocar no banco.
4. Chamar a camada de dados.
5. `ErroDeRegra` vira o código dela, se estiver em `CodigoDeErro`; qualquer outro erro vira `tente_de_novo`. A resposta nunca leva `message`, `stack` nem campo que a tela não usa.

| Ação | Limite (chave, máximo, janela) | Observação |
| --- | --- | --- |
| `salvarPerfil` | `perfil:<id>`, 20, 3600 | |
| `salvarEndereco`, `removerEndereco`, `tornarPrincipal` | `enderecos:<id>`, 20, 3600 | `false` da camada de dados vira `endereco_nao_encontrado` |
| `consultarCep` | `cep:<id>`, 30, 3600 | estourou ou inválido: `null` |
| `trocarSenha`, `trocarEmail` | `credenciais:<id>`, 5, 3600 | |
| `definirMarketing`, `cancelarPedido` | sem limite (§11) | |

- `trocarSenha`: confere a senha nova com a regra do cadastro; `auth.updateUser({ password: nova, current_password: atual })` pelo cliente da sessão; depois `auth.signOut({ scope: 'others' })`. Pelo `code` do erro do Supabase (lista conferida na documentação dele em 2026-11-18): `weak_password` vira `senha_fraca`; `same_password` vira `senha_igual`; `over_request_rate_limit` vira `muitas_tentativas`; o código gravado no teste de banco da Task 10 vira `senha_atual_errada`; qualquer outro vira `tente_de_novo`. Só no sucesso vem o `signOut`.
- `trocarEmail`: `conferirEmail`; `auth.updateUser({ email }, { emailRedirectTo: <origem>/auth/callback })`. Sucesso e `email_exists` dão a mesma resposta, `{ ok: true, aviso: 'confira_os_dois_emails' }`: a tela não revela se um e-mail já tem cadastro. `email_address_invalid` vira `campos_invalidos` no campo `email`; `over_email_send_rate_limit` e `over_request_rate_limit` viram `muitas_tentativas`; qualquer outro, `tente_de_novo`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/conta-acoes.test.ts`

Com `vi.mock` em `@/lib/auth`, nos cinco módulos de `@/lib/dados/` da Task 10 e no módulo de `criarClienteServidor`. Antes de cada teste (`beforeEach`): limpar os registros de chamada, `exigirUsuario` devolve a cliente abaixo e `consumirLimite` devolve `true`. Os casos, por ação:

```ts
const usuario = { id: 'usuario-1', email: 'maria@exemplo.com', nome: 'Maria', celular: '11987654321' }
const form = (campos: Record<string, string>) => {
  const f = new FormData()
  for (const [nome, valor] of Object.entries(campos)) f.set(nome, valor)
  return f
}
const enderecoValido = { id: '', apelido: 'Casa', cep: '04567-000', logradouro: 'Rua Siqueira Bueno', numero: '120', complemento: 'ap 52', bairro: 'Belenzinho', cidade: 'São Paulo', uf: 'SP' }

it('salvarPerfil: entrada invalida para na validacao', async () => {
  const r = await salvarPerfil(null, form({ nome: 'M', celular: '11987654321' }))
  expect(r).toEqual({ ok: false, erro: 'campos_invalidos', campos: { nome: expect.any(String) } })
  expect(consumirLimite).not.toHaveBeenCalled()
  expect(gravarPerfil).not.toHaveBeenCalled()
})
it('salvarPerfil: limite estourado nao chega ao banco', async () => {
  vi.mocked(consumirLimite).mockResolvedValueOnce(false)
  expect(await salvarPerfil(null, form({ nome: 'Maria', celular: '11987654321' }))).toEqual({ ok: false, erro: 'muitas_tentativas' })
  expect(gravarPerfil).not.toHaveBeenCalled()
})
it('salvarPerfil: grava o que foi conferido, para a cliente da sessao', async () => {
  expect(await salvarPerfil(null, form({ nome: ' Maria  José ', celular: '(11) 98765-4321' }))).toEqual({ ok: true, aviso: 'salvo' })
  expect(consumirLimite).toHaveBeenCalledWith('perfil:usuario-1', 20, 3600)
  expect(gravarPerfil).toHaveBeenCalledWith('usuario-1', { nome: 'Maria José', celular: '11987654321' })
})
it('erro desconhecido do banco vira tente_de_novo, sem a mensagem crua', async () => {
  vi.mocked(gravarPerfil).mockRejectedValueOnce(new Error('permission denied for table perfis'))
  const r = await salvarPerfil(null, form({ nome: 'Maria', celular: '11987654321' }))
  expect(r).toEqual({ ok: false, erro: 'tente_de_novo' })
  expect(JSON.stringify(r)).not.toMatch(/permission|perfis/)
})
it('salvarEndereco: a regra do banco chega como codigo', async () => {
  vi.mocked(criarEndereco).mockRejectedValueOnce(new ErroDeRegra('limite_de_enderecos'))
  expect(await salvarEndereco(null, form(enderecoValido))).toEqual({ ok: false, erro: 'limite_de_enderecos' })
})
it.each(HOSTIS.map((h) => [h.slice(0, 40), h]))('entrada hostil %j em cada campo de texto: recusa ou texto ao pe da letra, nunca erro solto', async (_, hostil) => {
  for (const campo of ['apelido', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep']) {
    const r = await salvarEndereco(null, form({ ...enderecoValido, [campo]: hostil }))
    expect(r.ok || r.erro === 'campos_invalidos').toBe(true)
  }
})
```

E mais, no mesmo molde, um caso por linha:

| Ação | Caso | Esperado |
| --- | --- | --- |
| toda ação | `exigirUsuario` é a primeira chamada | a ordem das chamadas registradas começa por ela |
| `salvarEndereco` com `id` | `alterarEndereco` devolve `false` | `endereco_nao_encontrado` |
| `removerEndereco`, `tornarPrincipal` | `id` que não é UUID | `campos_invalidos`, sem banco |
| `consultarCep` | limite estourado | `null`, sem chamar `buscarCep` |
| `trocarSenha` | senha nova fora da regra | `campos_invalidos`, sem `updateUser` |
| `trocarSenha` | `updateUser` devolve o erro de senha atual errada | `senha_atual_errada`, sem `signOut` |
| `trocarSenha` | sucesso | `updateUser` com `{ password, current_password }`, depois `signOut({ scope: 'others' })`, `{ ok: true, aviso: 'senha_trocada' }` |
| `trocarEmail` | `updateUser` devolve erro de e-mail já cadastrado | a mesma resposta do sucesso |
| `cancelarPedido` | número fora do formato | `pedido_invalido`, sem banco |
| `cancelarPedido` | `ErroDeRegra('pedido_invalido')` | `pedido_invalido` |
| toda resposta | chaves | só `ok`, `aviso`, `erro` e `campos` |

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/conta-acoes.test.ts` → Expected: FAIL, o módulo não existe.

- [ ] **Step 3: Implementar** as nove ações e `mensagens.ts`. A parte que se repete (sessão, limite, tradução do erro) mora numa função só, dentro de `acoes.ts`.

- [ ] **Step 4: Rodar tudo**

Run: `npx vitest run` → Expected: PASS. `npx tsc --noEmit` e `npm run lint` sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/app/conta/acoes.ts src/lib/conta/mensagens.ts tests/conta-acoes.test.ts
git commit -m "feat: as acoes de Minha conta, com validacao, limite e erro so por codigo"
```

### Task 12: As telas e o link na nav

O desenho é o do esboço escolhido na Task 8. O que este plano fixa é o conteúdo, o comportamento e os testes.

**Files:**
- Create: `src/app/conta/layout.tsx`, `src/app/conta/page.tsx`, `src/app/conta/pedidos/page.tsx`, `src/app/conta/pedidos/[numero]/page.tsx`, `src/app/conta/perfil/page.tsx`
- Create: componentes em `src/components/conta/`, `src/app/estilos/conta.css`, `src/lib/conta/textos.ts`
- Modify: `src/components/layout/Nav.tsx`, `src/components/layout/Gaveta.tsx` (o link), `src/app/globals.css` (importar `conta.css`)
- Test: `tests/conta-paginas.test.tsx`, `tests/conta-textos.test.ts`, `tests/layout.test.tsx`

**Interfaces:**
- Consumes: `exigirUsuario`; a camada de dados (Task 10); as ações (Task 11); `formatarPreco` de `src/lib/produto.ts`.
- Produces, em `src/lib/conta/textos.ts` (puro):
  - `NOME_DO_ESTADO: Record<EstadoDoPedido, string>`: `Aguardando pagamento`, `Pago`, `Em preparo`, `A caminho`, `Entregue`, `Cancelado`
  - `MOTIVO_DO_CANCELAMENTO: Record<'cliente' | 'pagamento' | 'expirado' | 'loja', string>`
  - `formatarDataEHora(iso: string): string`, na hora de São Paulo: `15 de novembro de 2026, 14:30`
  - `descreverEntrega(e: PedidoCompleto['entrega']): string`: com o retrato, `Rua Siqueira Bueno, 120, ap 52 · Belenzinho, São Paulo, SP · CEP 04567-000`; sem logradouro (pedido anonimizado), `Belenzinho, São Paulo, SP · CEP 04567`
  - `descreverPagamento(p: PedidoCompleto['pagamento']): string | null`: `Pix`, `Cartão Visa final 4242 em 2x`, ou `null`

O que cada rota faz:

| Rota | Comportamento |
| --- | --- |
| todas | primeira linha: `exigirUsuario('<a própria rota>')`; `metadata.robots = { index: false }`; a nav e o rodapé do site; um `h1` |
| `/conta` | saudação com o primeiro nome do perfil; o pedido mais recente ou o convite ao catálogo; "Sair" é um formulário que chama a ação `sair` da autenticação |
| `/conta/pedidos` | a lista de `lerPedidos`; cada item leva a `/conta/pedidos/<numero>`; vazio: "Você ainda não fez nenhum pedido" e link para `/catalogo` |
| `/conta/pedidos/[numero]` | `conferirNumeroDoPedido` e `lerPedido`; qualquer um dos dois nulo dá `notFound()`; "Cancelar pedido" só em `aguardando_pagamento`, com confirmação; rastreio só em `a_caminho` e com `rel="noopener noreferrer"` |
| `/conta/perfil` | os formulários de perfil, novidades, senha, e-mail e endereços, cada um com `useActionState`; erro por campo ligado ao campo por `aria-describedby`; a resposta num elemento com `aria-live="polite"`; excluir conta: o link para a rota da autenticação quando `podeExcluirConta().pode`, senão o motivo |

- [ ] **Step 1: Escrever os testes que falham**

`tests/conta-textos.test.ts`: um caso por exemplo da lista de interfaces acima (as três formas de `descreverPagamento`, as duas de `descreverEntrega`, `formatarDataEHora('2026-11-15T17:30:00+00:00')` dando `15 de novembro de 2026, 14:30`).

`tests/conta-paginas.test.tsx`, com `vi.mock` em `@/lib/auth` e na camada de dados:

| Página | Caso | Esperado |
| --- | --- | --- |
| todas | renderiza | um `h1`, sem pular nível de título, `axe` sem violações, `exigirUsuario` chamada com a rota |
| `/conta` | sem pedidos | link para `/catalogo`; nenhum texto `R$` |
| `/conta` | com pedido | o número, `Em preparo` e o total formatado |
| `/conta/pedidos` | dois pedidos | dois links, na ordem recebida, para `/conta/pedidos/AMO-...` |
| pedido | número fora do formato | rejeita (404) sem chamar `lerPedido` |
| pedido | `lerPedido` devolve `null` | rejeita (404) |
| pedido | aguardando pagamento | botão "Cancelar pedido" presente |
| pedido | entregue | sem botão de cancelar, sem link de rastreio |
| pedido | a caminho, com rastreio | link com o `href` do rastreio e `rel="noopener noreferrer"` |
| pedido | anonimizado (logradouro, número e complemento nulos) | mostra bairro, cidade e UF; a página não quebra |
| perfil | renderiza | todo campo com rótulo; nome e celular vêm preenchidos; cinco endereços escondem "Adicionar endereço" |
| perfil | `podeExcluirConta` diz que não pode | mostra o motivo, sem o link de excluir |

Em `tests/layout.test.tsx`: a nav tem um link "Minha conta" com `href="/conta"`, e a gaveta do celular também.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/conta-paginas.test.tsx tests/conta-textos.test.ts tests/layout.test.tsx` → Expected: FAIL.

- [ ] **Step 3: Construir** `textos.ts`, as cinco rotas, os componentes e o CSS, seguindo o esboço escolhido e o `craft-floor.md`. Os formulários são componentes cliente pequenos; as páginas são componentes de servidor. Nenhum componente cliente importa de `src/lib/dados/`.

- [ ] **Step 4: Rodar tudo**

Run: `npx vitest run` → Expected: PASS, inclusive `tests/travessao.test.ts`, `tests/estilos.test.ts` e `tests/movimento.test.ts`.
Run: `npm run build && npm run varrer` → Expected: `/conta` e as rotas dela como dinâmicas; `/`, `/catalogo` e os produtos continuam pré-renderizados; a varredura sai com 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/conta src/components/conta src/app/estilos/conta.css src/app/globals.css src/lib/conta/textos.ts src/components/layout/Nav.tsx src/components/layout/Gaveta.tsx tests/conta-paginas.test.tsx tests/conta-textos.test.ts tests/layout.test.tsx
git commit -m "feat: Minha conta, com perfil, enderecos e pedidos"
```

### Task 13: As provas de ponta a ponta

Fecha os dois desvios que a etapa 1 deixou anotados em `supabase/README.md`.

**Files:**
- Modify: `scripts/testar-porta.mjs`, `supabase/README.md`, `docs/superpowers/specs/2026-11-18-amo-backend-design.md` (status), `docs/superpowers/specs/2026-11-18-amo-conta-contrato.md`
- Create: `scripts/testar-exclusao.mjs`

- [ ] **Step 1: A porta com o token de uma cliente, pela internet.** Em `scripts/testar-porta.mjs`, quando houver `SUPABASE_SECRET_KEY`: criar uma cliente de ensaio (como na Task 10), pegar o token dela e chamar `GET /rest/v1/perfis?select=nome` com `Authorization: Bearer <token>`.

Expected: sem `x-amo-porta`, 401 com o código `AMO401`; com a porta, 200 e uma linha só, a dela. Apagar a cliente no fim. O script nunca imprime o token.

- [ ] **Step 2: A exclusão de conta pelo caminho do Supabase Auth.** `scripts/testar-exclusao.mjs`: cria uma cliente de ensaio e imprime o `id`. Pelo MCP, com esse `id`: um pedido entregue (o mesmo que `pg_temp.pedido_de_exemplo` faz em `supabase/tests/_apoio.sql`), um comentário e um endereço. Rodar o script com `--apagar <id>`, que chama `auth.admin.deleteUser`.

Expected, conferido pelo MCP: o usuário, o perfil, o endereço e o comentário não existem mais; o pedido existe, com `user_id` nulo, `anonimizado_em` preenchido, nome, celular, e-mail, logradouro, número e complemento nulos, e o CEP com 5 dígitos. Depois, uma segunda cliente com um pedido `pago`: o `--apagar` falha, e o usuário continua existindo. Limpar o que sobrou no banco de desenvolvimento.

- [ ] **Step 3: O ensaio no navegador**, com `npm run dev` e uma conta criada pelo cadastro do site. Pelo MCP, pôr para essa conta um pedido em cada estado (aguardando pagamento, a caminho com rastreio, entregue, cancelado).

Conferir: `/conta` sem sessão leva a `/entrar?volta=/conta` e volta para a conta depois do login; a lista e cada pedido; cancelar o que aguarda pagamento; trocar nome e celular; adicionar endereço pelo CEP, alterar, tornar principal, remover, e o aviso no sexto; ligar e desligar as novidades; trocar a senha (errando a atual uma vez) e ver a outra sessão cair; pedir a troca de e-mail e confirmar pelos dois e-mails; o endereço de outro pedido trocado na URL dá 404. No celular (largura de 360 px), nenhuma tela rola de lado. Console sem violação de CSP.

- [ ] **Step 4: Conferir o banco.** `get_advisors` de segurança só com o que é de propósito; `90_permissoes.sql` com 82 passando; nenhum dado de ensaio sobrando (`auth.users`, `pedidos`, `enderecos`, `comentarios`).

- [ ] **Step 5: Documentar e commitar.** Em `supabase/README.md`, a seção dos dois desvios passa a dizer como cada um foi fechado e com que script. Na spec, o status ganha "etapa 2 construída e testada em <data>". No contrato, o que mudou para a outra sessão.

```bash
git add scripts/testar-porta.mjs scripts/testar-exclusao.mjs supabase/README.md docs/superpowers/specs
git commit -m "test: a porta com token de cliente e a exclusao de conta, de ponta a ponta"
```
