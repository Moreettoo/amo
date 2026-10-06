# AMO Catálogo e gaveta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao site a página do catálogo (`/catalogo` e `/catalogo/[linha]`) e a gaveta lateral que a abre da nav, com a abertura leve; a seção Cardápio da home vira vitrine.

**Architecture:** O cadastro continua entrando por `carregarCatalogo()`. Funções puras novas em `src/lib/visao.ts` decidem a gaveta (`montarGaveta`), a vitrine (`montarVitrine`) e a vista do catálogo (`montarCatalogo`). As duas rotas novas são Server Components estáticos que montam a `TelaCatalogo`; o filtro de vontade e de selo é estado local do `CatalogoPagina` (cliente), e a linha é a rota. A gaveta é um `<dialog>` modal dentro da `Nav`, com a entrada em `@keyframes` no `movimento.css` e a saída conduzida pelo JS. O `FiltroProvider` sai: a home só leva até o catálogo.

**Tech Stack:** Next.js 16.3.2 (App Router), React 19.2.8, Tailwind v4, Motion 13 (`motion/react`), Lenis 1.3, next/image, Vitest 4 + Testing Library + jsdom + vitest-axe.

**Spec:** `docs/superpowers/specs/2026-10-06-amo-catalogo-design.md` (e o canvas aprovado, <https://claude.ai/artifact/QJTRTLJYeX2FnUUfMTpft9>). A spec da v2 (`docs/superpowers/specs/2026-10-05-amo-home-v2-retro-design.md`) continua valendo para tokens, molduras, card, movimento, hovers, contraste e foco.

## Global Constraints

- Todo texto visível em pt-BR. Nenhum travessão (U+2014) nem meia-risca (U+2013) em `src/`, `tests/`, `scripts/` e README (`tests/travessao.test.ts`).
- Nenhum "..." no texto renderizado e nenhum preço (`R$`).
- Todo "AMO" renderizado como texto dentro de `translate="no"`, sem exceção (`ComAmo` para texto vindo do cadastro).
- Next 16: imagem de LCP usa `preload` (não `priority`). Só `src/components/sections/Hero.tsx` e `src/components/sections/TopoCatalogo.tsx` ligam `preload` em JSX. Nenhum comentário em `.ts`/`.tsx` termina linha com a palavra `preload` (o teste da página procura o atributo por regex).
- Links entre páginas são `<a href>` comuns (nunca `next/link`): trocam o documento inteiro.
- Endereços: `/catalogo` e `/catalogo/<slug da linha>`. Slugs das linhas: `bolos-no-pote` (real); `bolos-inteiros` e `salgados` (fixture).
- Animação: `@keyframes` só em `src/app/estilos/movimento.css`, só com `transform`, `opacity`, `clip-path`, `stroke-dashoffset`; regras de animação só no bloco único `@media (prefers-reduced-motion: no-preference)` desse arquivo, todo seletor começando por `html.js `; atraso sempre dentro do shorthand (nunca `animation-delay`); duração + atraso de cada `animation:` até 2 s; nada em loop.
- Hover só dentro de `@media (hover: hover)`; o mesmo efeito em `:focus-visible` para o que é focável; `cursor: pointer` só no clicável.
- `cobre` puro nunca é cor de texto sobre fundo claro; a única regra CSS com `color: var(--color-cobre)` é `.hero__titulo em`.
- Deslocamento de âncora: 96 px; todo alvo de âncora com a classe `scroll-mt-24`.
- `setState` síncrono dentro de `useEffect` reprova no lint (`react-hooks/set-state-in-effect`); para ler algo do navegador na montagem, `useSyncExternalStore`.
- Comentários de código em pt-BR **sem acento**, no tom dos arquivos existentes.
- Cada tarefa termina com `npm test`, `npx tsc --noEmit` e `npm run lint` limpos.
- Commits terminam com:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW
  ```

## Review Focus

1. **Fechar duas vezes** (✕ clicado de novo, Esc ou clique fora durante a saída animada) e **desmontar no meio da saída**: a gaveta fecha uma vez só, sem erro e sem timer disparando depois. Testes na Task 3.
2. **`?vontade=` estranho** (vazio, inexistente, repetido, ou uma vontade que não filtra nada na vista): ignora o que não vale, usa o primeiro valor, nunca quebra. Testes na Task 6.
3. **Filtro que zera tudo em "Tudo"**: os grupos somem, o estado vazio aparece, "Ver todas" devolve as 11 e o foco vai para o título "Receitas". Teste na Task 6.
4. **Linha cadastrada sem produto** (entrou antes da foto): não aparece na gaveta, no catálogo nem na vitrine, não gera rota, e `/catalogo/<slug-dela>` dá 404. Testes nas Tasks 2 e 8.
5. **Link da gaveta para a própria página** com o Lenis parado pela trava de rolagem: a rolagem acontece mesmo assim (pelo navegador) e a gaveta fecha sem roubar o foco do alvo. Testes na Task 3.

---

## Mapa de arquivos

```
src/app/
  page.tsx                      home: Nav com gaveta, Vitrine, sem FiltroProvider
  catalogo/page.tsx             "Tudo" (ou a linha unica)
  catalogo/[linha]/page.tsx     uma linha; generateStaticParams, dynamicParams, generateMetadata
  globals.css                   + @import gaveta.css e catalogo.css; trava de rolagem
  estilos/
    gaveta.css                  a gaveta, a borda ondulada, o botao Catalogo
    catalogo.css                topo, coluna de linhas, filtros, grupos, rotulo
    cardapio.css                vira a vitrine (grade e estado vazio ficam)
    movimento.css               + keyframes e regras da gaveta
src/lib/visao.ts                + linhasComProduto, caminhos, textos, montarVitrine, montarGaveta, montarCatalogo
src/components/
  RolagemSuave.tsx              ancora com o Lenis parado vai pelo navegador
  layout/Nav.tsx                botao Catalogo + Gaveta; sem menu ≡; links absolutos
  layout/Gaveta.tsx             o <dialog>
  layout/TelaCatalogo.tsx       a pagina do catalogo montada
  layout/Footer.tsx             servidor; linhas levam ao catalogo
  sections/Vitrine.tsx          substitui Cardapio.tsx
  sections/CatalogoPagina.tsx   cliente: coluna, filtros, grupos, rotulo
  sections/TopoCatalogo.tsx     servidor: trilha, h1, capa, selo
  sections/Hero.tsx · HojeODiaPede.tsx · Final.tsx   links para o catalogo
  ui/GradeProdutos.tsx          a grade com FLIP, tirada do Cardapio
  ui/IconeCamadas.tsx           o icone das tres ondas
src/data/linhas.ts · produtos.ts   slug bolos-no-pote
tests/
  setup.ts                      + <dialog> modal (o jsdom nao tem)
  fixtures/catalogo-misto.ts    slugs bolos-inteiros, salgados
  gaveta.test.tsx · catalogo-pagina.test.tsx · catalogo-rotas.test.tsx · vitrine.test.tsx (novos)
  visao · layout · hoje · secoes · hero · pagina · ssr · providers · produto · movimento · estilos · rolagem-ancora (mudam)
Saem: src/components/FiltroProvider.tsx, src/components/sections/Cardapio.tsx, tests/fixtures/sonda.tsx, tests/cardapio.test.tsx
```

Os blocos de código com `title="caminho"` são o conteúdo completo do arquivo naquele passo.

---

### Task 0: Ponto de partida

**Files:** nenhum de código.

- [ ] **Step 1: Conferir a branch e a suíte**

Run: `git branch --show-current`
Expected: `feat/catalogo`

Run: `npm test`
Expected: PASS, toda a suíte.

- [ ] **Step 2: Ler os guias do Next 16 que esta mudança toca**

Ler em `node_modules/next/dist/docs/01-app/03-api-reference/`:
- `03-file-conventions/dynamic-routes.md`;
- `03-file-conventions/02-route-segment-config/dynamicParams.md`;
- `04-functions/generate-static-params.md` e `04-functions/generate-metadata.md` (procure com `ls node_modules/next/dist/docs/01-app/03-api-reference/04-functions`);
- `03-file-conventions/not-found.md`.

Nada a commitar.

---

### Task 1: Slugs legíveis

**Files:**
- Modify: `src/data/linhas.ts`, `src/data/produtos.ts`, `tests/fixtures/catalogo-misto.ts`
- Test: `tests/catalogo.test.ts`, `tests/visao.test.ts`, `tests/cardapio.test.tsx`, `tests/providers.test.tsx`, `tests/layout.test.tsx`, `tests/secoes.test.tsx`, `tests/fixtures/sonda.tsx`

**Interfaces:**
- Produces: linha real com `slug: 'bolos-no-pote'`; fixture com `bolos-inteiros` e `salgados`. A vontade `salgado` **não** muda.

- [ ] **Step 1: Trocar os slugs nos testes**

Troque exatamente estas linhas (o resto do arquivo fica):

`tests/catalogo.test.ts`
- `expect(c.linhas.map((l) => l.slug)).toEqual(['pote'])` → `expect(c.linhas.map((l) => l.slug)).toEqual(['bolos-no-pote'])`
- `/linha pote: selo inexistente organico/` → `/linha bolos-no-pote: selo inexistente organico/`

`tests/visao.test.ts`
- `expect(slugs(v.rotulos)).toEqual(['pote'])` → `expect(slugs(v.rotulos)).toEqual(['bolos-no-pote'])`
- `expect(v.tipos.pote).toBe('Bolo no pote')` → `expect(v.tipos['bolos-no-pote']).toBe('Bolo no pote')`
- no teste "volta o filtro de linha": `{ slug: 'pote', …` → `{ slug: 'bolos-no-pote', …`, `{ slug: 'inteiro', …` → `{ slug: 'bolos-inteiros', …`, `{ slug: 'salgado', …` → `{ slug: 'salgados', …`
- `expect(slugs(v.rotulos)).toEqual(['pote', 'inteiro', 'salgado'])` e o mesmo de `linhasNoFinal` → `['bolos-no-pote', 'bolos-inteiros', 'salgados']`
- em `describe('filtrar')`: `linha: 'inteiro'` → `linha: 'bolos-inteiros'`; as duas `linha: 'salgado'` → `linha: 'salgados'`
- `expect(v.vontades.at(-1)?.slug).toBe('salgado')` **fica** (é a vontade).

`tests/cardapio.test.tsx`
- `expect(filtro()).toHaveTextContent('inteiro|-|chocolate')` → `expect(filtro()).toHaveTextContent('bolos-inteiros|-|chocolate')`

`tests/fixtures/sonda.tsx`
- `f.definir({ linha: 'pote', selo: 'fibras', vontade: 'fruta' })` → `f.definir({ linha: 'bolos-no-pote', selo: 'fibras', vontade: 'fruta' })`

`tests/providers.test.tsx`
- `expect(saida).toHaveTextContent('pote|fibras|fruta')` → `expect(saida).toHaveTextContent('bolos-no-pote|fibras|fruta')`

`tests/layout.test.tsx` (bloco do Footer)
- `linhas = [{ slug: 'pote', nome: 'Bolos no pote' }]` → `linhas = [{ slug: 'bolos-no-pote', nome: 'Bolos no pote' }]`
- `{ slug: 'pote', nome: 'Bolos no pote' },` → `{ slug: 'bolos-no-pote', nome: 'Bolos no pote' },`
- `{ slug: 'salgado', nome: 'Salgados' },` → `{ slug: 'salgados', nome: 'Salgados' },`
- `toHaveTextContent('salgado|-|-')` → `toHaveTextContent('salgados|-|-')`

`tests/secoes.test.tsx`
- `toHaveTextContent('salgado|-|-')` → `toHaveTextContent('salgados|-|-')`

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL em `catalogo`, `visao`, `cardapio`, `layout` e `secoes` (o cadastro ainda diz `pote`).

- [ ] **Step 3: Trocar os slugs no cadastro e na fixture**

```bash
sed -i "s/slug: 'pote'/slug: 'bolos-no-pote'/" src/data/linhas.ts
sed -i "s/linha: 'pote'/linha: 'bolos-no-pote'/" src/data/produtos.ts
sed -i "s/slug: 'inteiro'/slug: 'bolos-inteiros'/; s/slug: 'salgado',/slug: 'salgados',/; s/linha: 'inteiro'/linha: 'bolos-inteiros'/; s/linha: 'salgado'/linha: 'salgados'/" tests/fixtures/catalogo-misto.ts
grep -n "slug: '\|linha: '" src/data/linhas.ts src/data/produtos.ts tests/fixtures/catalogo-misto.ts
```

Expected no grep: nenhuma linha com `'pote'`, `'inteiro'` ou `'salgado'` como slug de linha ou campo `linha`. Os `vontades: ['salgado']` da fixture ficam.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS e nenhum erro.

- [ ] **Step 5: Commit**

```bash
git add src/data/linhas.ts src/data/produtos.ts tests
git commit -m "refactor: slugs de linha legiveis, prontos para virar endereco" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW"
```

---

### Task 2: A visão do catálogo (funções puras)

**Files:**
- Modify: `src/lib/visao.ts` (só acrescenta; `montarVisao` não muda nesta tarefa)
- Test: `tests/visao.test.ts`

**Interfaces:**
- Consumes: `Catalogo`, `Linha`, `Produto`, `Formato`, `ImagemProduto` de `@/lib/catalogo`; `porOrdem`, `OpcaoSelo`, `filtrar` (já em `visao.ts`).
- Produces (todos exportados de `@/lib/visao`):
  - `CAMINHO_CATALOGO: '/catalogo'`, `caminhoDaLinha(slug: string): string`
  - `contarReceitas(n: number): string` ("1 receita", "7 receitas"), `textoVerReceitas(n: number): string` ("Ver a receita", "Ver as 11 receitas"), `descricaoDaLinha(l: Linha): string`
  - `TITULO_TUDO = 'O catálogo inteiro'`, `LEAD_TUDO = 'Cada linha com a sua regra no rótulo.'`
  - `linhasComProduto(c: Catalogo): Linha[]`
  - `type Capa = { produto: string; imagem: ImagemProduto; formato: Formato }`
  - `type LinhaNaGaveta = { slug: string; nome: string; regra: string; contagem: number; capa: Capa }`
  - `type SaborNaGaveta = { slug: string; nome: string; imagem: ImagemProduto }`
  - `type DadosGaveta = { linhas: LinhaNaGaveta[]; total: number; sabores: SaborNaGaveta[] }`
  - `montarGaveta(c: Catalogo): DadosGaveta`
  - `montarVitrine(c: Catalogo): Produto[]`
  - `type ItemDeLinha = { href: string; nome: string; contagem: number; formato: Formato | null; atual: boolean }`
  - `type OpcaoVontade = { slug: string; palavra: string; contagem: number }`
  - `type GrupoDoCatalogo = { slug: string; nome: string; href: string; produtos: Produto[] }`
  - `type VistaCatalogo = { linha: Linha | null; titulo: string; lead: string | null; contagem: number; capas: Capa[]; itensLinha: ItemDeLinha[]; grupos: GrupoDoCatalogo[]; vontades: OpcaoVontade[]; selos: OpcaoSelo[]; tipos: Record<string, string>; nomesDosSelos: Record<string, string> }`
  - `montarCatalogo(c: Catalogo, slug: string | null): VistaCatalogo` (lança erro para slug sem página)

- [ ] **Step 1: Escrever os testes que vão falhar**

No topo de `tests/visao.test.ts`, troque o import de `@/lib/visao` por:

```ts
import {
  CAMINHO_CATALOGO,
  caminhoDaLinha,
  contarReceitas,
  descricaoDaLinha,
  filtrar,
  FILTRO_VAZIO,
  linhasComProduto,
  montarCatalogo,
  montarGaveta,
  montarVisao,
  montarVitrine,
  textoVerReceitas,
} from '@/lib/visao'
import type { Linha } from '@/lib/catalogo'
```

E acrescente ao fim do arquivo:

```ts
/** Uma linha cadastrada antes de ter produto (a foto ainda nao chegou). */
const SEM_PRODUTO: Linha = {
  slug: 'tortas',
  nome: 'Tortas',
  tipo: 'Torta',
  regra: 'Massa integral',
  selos: [],
  corDoRotulo: 'papel',
  ordem: 0,
}

describe('caminhos e textos', () => {
  it('o catálogo e a página de cada linha', () => {
    expect(CAMINHO_CATALOGO).toBe('/catalogo')
    expect(caminhoDaLinha('bolos-no-pote')).toBe('/catalogo/bolos-no-pote')
  })

  it('contagem e chamada no singular e no plural', () => {
    expect(contarReceitas(1)).toBe('1 receita')
    expect(contarReceitas(7)).toBe('7 receitas')
    expect(textoVerReceitas(1)).toBe('Ver a receita')
    expect(textoVerReceitas(11)).toBe('Ver as 11 receitas')
  })

  it('a descrição da linha, com e sem frase', async () => {
    const [pote] = (await carregarCatalogo()).linhas
    expect(descricaoDaLinha(pote)).toBe('Bolos no pote, zero açúcar. Um abraço em forma de sobremesa.')
    expect(descricaoDaLinha({ ...pote, frase: undefined })).toBe('Bolos no pote, zero açúcar.')
  })
})

describe('linhasComProduto', () => {
  it('só as linhas com produto, por ordem: a linha sem produto não ganha página', () => {
    const c = copia(CATALOGO_MISTO)
    c.linhas.push(SEM_PRODUTO)
    expect(slugs(linhasComProduto(c))).toEqual(['bolos-no-pote', 'bolos-inteiros', 'salgados'])
  })
})

describe('montarVitrine', () => {
  it('hoje: o destaque e os seguintes por ordem', async () => {
    expect(slugs(montarVitrine(await carregarCatalogo()))).toEqual([
      'prestigio',
      'pacoca',
      'mousse-de-maracuja',
      'ninho-com-frutas-vermelhas',
    ])
  })

  it('com várias linhas: o destaque, um de cada outra linha e o resto por ordem', () => {
    expect(slugs(montarVitrine(CATALOGO_MISTO))).toEqual([
      'prestigio',
      'cenoura-com-cacau',
      'torta-de-frango',
      'pacoca',
    ])
  })

  it('sem destaque, começa pelo primeiro por ordem', async () => {
    const c = copia(await carregarCatalogo())
    for (const p of c.produtos) delete p.destaque
    c.produtos.reverse()
    expect(montarVitrine(c)[0].slug).toBe('prestigio')
  })

  it('com menos de 4 produtos, mostra todos', async () => {
    const c = copia(await carregarCatalogo())
    c.produtos = c.produtos.slice(0, 2)
    expect(slugs(montarVitrine(c))).toEqual(['prestigio', 'pacoca'])
  })
})

describe('montarGaveta', () => {
  it('com três linhas: capa, regra e contagem de cada uma, e nenhum sabor', () => {
    const g = montarGaveta(CATALOGO_MISTO)
    expect(g.linhas.map((l) => [l.slug, l.regra, l.contagem, l.capa.produto, l.capa.formato])).toEqual([
      ['bolos-no-pote', 'Zero açúcar', 7, 'prestigio', 'pote'],
      ['bolos-inteiros', 'Zero açúcar', 2, 'cenoura-com-cacau', 'inteiro'],
      ['salgados', 'Massa integral', 2, 'torta-de-frango', 'unidade'],
    ])
    expect(g.total).toBe(11)
    expect(g.sabores).toEqual([])
  })

  it('com uma linha só: os sabores dela, por ordem', async () => {
    const g = montarGaveta(await carregarCatalogo())
    expect(slugs(g.linhas)).toEqual(['bolos-no-pote'])
    expect(slugs(g.sabores)).toEqual([
      'prestigio',
      'pacoca',
      'mousse-de-maracuja',
      'ninho-com-frutas-vermelhas',
      'beijinho',
      'chocolate',
      'frutas-amarelas',
    ])
    expect(g.sabores[0].imagem.src).toBe('/produtos/prestigio.webp')
  })

  it('a capa prefere o destaque, quando ele é da linha', () => {
    const c = copia(CATALOGO_MISTO)
    for (const p of c.produtos) p.destaque = p.slug === 'chocolate-com-morango'
    expect(montarGaveta(c).linhas.map((l) => l.capa.produto)).toEqual([
      'prestigio',
      'chocolate-com-morango',
      'torta-de-frango',
    ])
  })

  it('a linha sem produto não entra', () => {
    const c = copia(CATALOGO_MISTO)
    c.linhas.push(SEM_PRODUTO)
    expect(slugs(montarGaveta(c).linhas)).toEqual(['bolos-no-pote', 'bolos-inteiros', 'salgados'])
  })
})

describe('montarCatalogo', () => {
  it('uma linha: título, lead com ponto final, contagem, capa e um grupo', async () => {
    const v = montarCatalogo(await carregarCatalogo(), 'bolos-no-pote')
    expect(v.linha?.slug).toBe('bolos-no-pote')
    expect([v.titulo, v.lead, v.contagem]).toEqual(['Bolos no pote', 'Um abraço em forma de sobremesa.', 7])
    expect(v.capas.map((c) => c.produto)).toEqual(['prestigio'])
    expect(v.grupos.map((g) => [g.slug, g.href, g.produtos.length])).toEqual([
      ['bolos-no-pote', '/catalogo/bolos-no-pote', 7],
    ])
  })

  it('com uma linha só, o catálogo sem linha é a página dela, sem coluna de linhas', async () => {
    const v = montarCatalogo(await carregarCatalogo(), null)
    expect(v.linha?.slug).toBe('bolos-no-pote')
    expect(v.itensLinha).toEqual([])
  })

  it('só as vontades e os selos que filtram alguma coisa na vista', async () => {
    const v = montarCatalogo(await carregarCatalogo(), 'bolos-no-pote')
    expect(v.vontades.map((x) => [x.slug, x.palavra, x.contagem])).toEqual([
      ['chocolate', 'Chocolate', 2],
      ['fruta', 'Fruta', 3],
      ['coco', 'Coco', 2],
      ['classico', 'Um clássico', 3],
    ])
    expect(v.selos).toEqual([])
  })

  it('"Tudo" com três linhas: grupos, capas, a coluna com o item atual, vontades e selos', () => {
    const v = montarCatalogo(CATALOGO_MISTO, null)
    expect(v.linha).toBeNull()
    expect([v.titulo, v.lead, v.contagem]).toEqual(['O catálogo inteiro', 'Cada linha com a sua regra no rótulo.', 11])
    expect(v.capas.map((c) => c.formato)).toEqual(['pote', 'inteiro', 'unidade'])
    expect(v.grupos.map((g) => [g.slug, g.produtos.length])).toEqual([
      ['bolos-no-pote', 7],
      ['bolos-inteiros', 2],
      ['salgados', 2],
    ])
    expect(v.itensLinha).toEqual([
      { href: '/catalogo', nome: 'Tudo', contagem: 11, formato: null, atual: true },
      { href: '/catalogo/bolos-no-pote', nome: 'Bolos no pote', contagem: 7, formato: 'pote', atual: false },
      { href: '/catalogo/bolos-inteiros', nome: 'Bolos inteiros', contagem: 2, formato: 'inteiro', atual: false },
      { href: '/catalogo/salgados', nome: 'Salgados', contagem: 2, formato: 'unidade', atual: false },
    ])
    expect(v.vontades.map((x) => x.slug)).toEqual(['chocolate', 'fruta', 'coco', 'classico', 'salgado'])
    expect(v.selos.map((s) => s.id)).toEqual(['zero-acucar', 'fibras', 'integral', 'sem-conservante'])
  })

  it('nos salgados, a vontade que todos têm não vira filtro; o selo que só um tem, vira', () => {
    const v = montarCatalogo(CATALOGO_MISTO, 'salgados')
    expect(v.vontades).toEqual([])
    expect(v.selos.map((s) => s.id)).toEqual(['sem-conservante'])
    expect(v.itensLinha.filter((i) => i.atual).map((i) => i.href)).toEqual(['/catalogo/salgados'])
  })

  it('linha sem frase não tem lead', () => {
    const c = copia(CATALOGO_MISTO)
    delete c.linhas[1].frase
    expect(montarCatalogo(c, 'bolos-inteiros').lead).toBeNull()
  })

  it('slug sem página é erro de programação (a rota já filtrou)', () => {
    const c = copia(CATALOGO_MISTO)
    c.linhas.push(SEM_PRODUTO)
    expect(() => montarCatalogo(c, 'tortas')).toThrow(/tortas/)
    expect(() => montarCatalogo(c, 'nao-existe')).toThrow(/nao-existe/)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/visao.test.ts`
Expected: FAIL, `montarGaveta is not a function` (e os outros nomes novos).

- [ ] **Step 3: Implementar**

Em `src/lib/visao.ts`, troque a linha de import por:

```ts
import type { Catalogo, Formato, ImagemProduto, Linha, Produto } from '@/lib/catalogo'
```

E acrescente ao **fim** do arquivo (depois de `filtrar`):

```ts
/** O endereco do catalogo e o de cada linha. */
export const CAMINHO_CATALOGO = '/catalogo'
export const caminhoDaLinha = (slug: string) => `${CAMINHO_CATALOGO}/${slug}`

/** "1 receita", "7 receitas". */
export const contarReceitas = (n: number) => `${n} ${n === 1 ? 'receita' : 'receitas'}`

/** A chamada para o catalogo: "Ver a receita", "Ver as 11 receitas". */
export const textoVerReceitas = (n: number) => (n === 1 ? 'Ver a receita' : `Ver as ${n} receitas`)

/** A descricao da pagina da linha: nome, regra e, quando ha, a frase. */
export const descricaoDaLinha = (l: Linha) =>
  `${l.nome}, ${l.regra.toLowerCase()}.${l.frase ? ` ${l.frase}.` : ''}`

export const TITULO_TUDO = 'O catálogo inteiro'
export const LEAD_TUDO = 'Cada linha com a sua regra no rótulo.'

/** As linhas com pelo menos um produto, por ordem. So elas ganham pagina,
 *  lugar na gaveta e atalho: linha sem produto ainda nao tem foto. */
export function linhasComProduto(c: Catalogo): Linha[] {
  return [...c.linhas].sort(porOrdem).filter((l) => c.produtos.some((p) => p.linha === l.slug))
}

/** A foto que representa a linha: a do destaque, se ele for da linha; senao
 *  a do primeiro produto dela por ordem. */
export type Capa = { produto: string; imagem: ImagemProduto; formato: Formato }

function capaDaLinha(produtosPorOrdem: readonly Produto[], linha: string): Capa {
  const daLinha = produtosPorOrdem.filter((p) => p.linha === linha)
  const p = daLinha.find((x) => x.destaque) ?? daLinha[0]
  return { produto: p.slug, imagem: p.imagem, formato: p.formato }
}

export type LinhaNaGaveta = { slug: string; nome: string; regra: string; contagem: number; capa: Capa }
export type SaborNaGaveta = { slug: string; nome: string; imagem: ImagemProduto }
export type DadosGaveta = {
  linhas: LinhaNaGaveta[]
  /** todos os produtos */
  total: number
  /** so com uma linha: os produtos dela, por ordem; senao vazio */
  sabores: SaborNaGaveta[]
}

export function montarGaveta(c: Catalogo): DadosGaveta {
  const produtos = [...c.produtos].sort(porOrdem)
  const linhas = linhasComProduto(c)
  return {
    linhas: linhas.map((l) => ({
      slug: l.slug,
      nome: l.nome,
      regra: l.regra,
      contagem: produtos.filter((p) => p.linha === l.slug).length,
      capa: capaDaLinha(produtos, l.slug),
    })),
    total: produtos.length,
    sabores:
      linhas.length === 1
        ? produtos
            .filter((p) => p.linha === linhas[0].slug)
            .map((p) => ({ slug: p.slug, nome: p.nome, imagem: p.imagem }))
        : [],
  }
}

const TAMANHO_DA_VITRINE = 4

/** A vitrine da home: o destaque, o primeiro de cada outra linha (mostra o
 *  alcance do catalogo) e o resto por ordem, ate 4. */
export function montarVitrine(c: Catalogo): Produto[] {
  const produtos = [...c.produtos].sort(porOrdem)
  const destaque = produtos.find((p) => p.destaque) ?? produtos[0]
  const escolhidos = [destaque]
  for (const l of linhasComProduto(c)) {
    if (l.slug === destaque.linha) continue
    const primeiro = produtos.find((p) => p.linha === l.slug)
    if (primeiro) escolhidos.push(primeiro)
  }
  for (const p of produtos) if (!escolhidos.includes(p)) escolhidos.push(p)
  return escolhidos.slice(0, TAMANHO_DA_VITRINE)
}

export type ItemDeLinha = {
  /** '/catalogo' em "Tudo" */
  href: string
  nome: string
  contagem: number
  /** o contorno do icone: o formato da capa da linha; null em "Tudo" */
  formato: Formato | null
  atual: boolean
}
export type OpcaoVontade = { slug: string; palavra: string; contagem: number }
export type GrupoDoCatalogo = { slug: string; nome: string; href: string; produtos: Produto[] }

export type VistaCatalogo = {
  /** null em "Tudo" */
  linha: Linha | null
  titulo: string
  /** a frase da linha com ponto final; null quando a linha nao tem frase */
  lead: string | null
  contagem: number
  /** uma numa linha; ate 3 em "Tudo", uma por linha */
  capas: Capa[]
  /** a coluna de linhas; vazia com menos de 2 */
  itensLinha: ItemDeLinha[]
  /** um por linha da vista, com os produtos por ordem */
  grupos: GrupoDoCatalogo[]
  /** so as vontades que alguns produtos da vista tem e outros nao */
  vontades: OpcaoVontade[]
  /** so os selos que alguns produtos da vista tem e outros nao */
  selos: OpcaoSelo[]
  tipos: Record<string, string>
  nomesDosSelos: Record<string, string>
}

/**
 * A vista do catalogo. `slug` nulo e "Tudo", ou a linha unica quando so ha
 * uma. Slug sem pagina e erro de programacao: a rota ja filtrou.
 */
export function montarCatalogo(c: Catalogo, slug: string | null): VistaCatalogo {
  const produtos = [...c.produtos].sort(porOrdem)
  const linhas = linhasComProduto(c)
  const linha = slug === null ? (linhas.length === 1 ? linhas[0] : null) : linhas.find((l) => l.slug === slug)
  if (linha === undefined) throw new Error(`Linha sem página no catálogo: ${slug}`)

  const daVista = linha ? produtos.filter((p) => p.linha === linha.slug) : produtos
  const contar = (pred: (p: Produto) => boolean) => daVista.filter(pred).length
  // filtro que todos ou nenhum tem nao muda nada na tela
  const filtraAlgo = (n: number) => n > 0 && n < daVista.length

  return {
    linha,
    titulo: linha ? linha.nome : TITULO_TUDO,
    lead: linha ? (linha.frase ? `${linha.frase}.` : null) : LEAD_TUDO,
    contagem: daVista.length,
    capas: (linha ? [linha] : linhas.slice(0, 3)).map((l) => capaDaLinha(produtos, l.slug)),
    itensLinha:
      linhas.length < 2
        ? []
        : [
            { href: CAMINHO_CATALOGO, nome: 'Tudo', contagem: produtos.length, formato: null, atual: linha === null },
            ...linhas.map((l) => ({
              href: caminhoDaLinha(l.slug),
              nome: l.nome,
              contagem: produtos.filter((p) => p.linha === l.slug).length,
              formato: capaDaLinha(produtos, l.slug).formato,
              atual: linha?.slug === l.slug,
            })),
          ],
    grupos: (linha ? [linha] : linhas).map((l) => ({
      slug: l.slug,
      nome: l.nome,
      href: caminhoDaLinha(l.slug),
      produtos: daVista.filter((p) => p.linha === l.slug),
    })),
    vontades: [...c.vontades]
      .sort(porOrdem)
      .map((v) => ({ slug: v.slug, palavra: v.palavra, contagem: contar((p) => p.vontades.includes(v.slug)) }))
      .filter((v) => filtraAlgo(v.contagem)),
    selos: c.selos
      .filter((s) => filtraAlgo(contar((p) => p.selos.includes(s.id))))
      .map((s) => ({ id: s.id, nome: s.nome })),
    tipos: Object.fromEntries(c.linhas.map((l) => [l.slug, l.tipo])),
    nomesDosSelos: Object.fromEntries(c.selos.map((s) => [s.id, s.nome])),
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS e nenhum erro.

- [ ] **Step 5: Commit**

```bash
git add src/lib/visao.ts tests/visao.test.ts
git commit -m "feat: visao do catalogo, da gaveta e da vitrine" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW"
```

---

### Task 3: A gaveta (componente, CSS, abertura leve)

**Files:**
- Create: `src/components/layout/Gaveta.tsx`, `src/app/estilos/gaveta.css`, `tests/gaveta.test.tsx`
- Modify: `tests/setup.ts`, `src/app/globals.css`, `src/app/estilos/movimento.css`, `src/components/RolagemSuave.tsx`, `tests/movimento.test.ts`, `tests/estilos.test.ts`, `tests/rolagem-ancora.test.tsx`

**Interfaces:**
- Consumes: `DadosGaveta`, `CAMINHO_CATALOGO`, `caminhoDaLinha`, `contarReceitas`, `textoVerReceitas` (Task 2); `BotaoRetro`, `classeDoFormato` (existentes).
- Produces:
  - `Gaveta({ id, dados, linhaAtual, aberta, aoFechar }: { id: string; dados: DadosGaveta; linhaAtual: string | null; aberta: boolean; aoFechar: (devolverFoco: boolean) => void })`
  - `LINKS_DA_HOME: readonly { href: '/#hoje' | '/#rotulos' | '/#marca'; rotulo: string }[]`
  - `DURACAO_SAIDA = 250`
  - classes CSS: `.gaveta`, `.gaveta__item` (com `--i`), `.gaveta[data-fechando]`, `.botao-catalogo` (usada na Task 4)

- [ ] **Step 1: Ensinar o `<dialog>` modal ao jsdom**

O jsdom tem o elemento e o esconde fechado (`dialog:not([open]) { display: none }` na folha padrão), mas não tem `showModal`, `close` nem o Esc. Em `tests/setup.ts`, dentro do `if (typeof window !== 'undefined') {`, depois da classe `IO`, acrescente:

```ts
  // jsdom tem o <dialog> (e o esconde fechado), mas nao o modal: aqui o
  // minimo que o navegador faz, inclusive o Esc virar o evento cancel.
  const dialogo = HTMLDialogElement.prototype
  if (typeof dialogo.showModal !== 'function') {
    dialogo.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    dialogo.close = function (this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
    if (!Object.getOwnPropertyDescriptor(dialogo, 'open')) {
      Object.defineProperty(dialogo, 'open', {
        configurable: true,
        get(this: HTMLDialogElement) {
          return this.hasAttribute('open')
        },
        set(this: HTMLDialogElement, valor: boolean) {
          this.toggleAttribute('open', valor)
        },
      })
    }
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return
      const aberto = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1)
      if (aberto && aberto.dispatchEvent(new Event('cancel', { cancelable: true }))) aberto.close()
    })
  }
```

- [ ] **Step 2: Escrever os testes da gaveta, que vão falhar**

```tsx title="tests/gaveta.test.tsx"
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { axe } from 'vitest-axe'
import { DURACAO_SAIDA, Gaveta } from '@/components/layout/Gaveta'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarGaveta, type DadosGaveta } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const real = montarGaveta(await carregarCatalogo())
const misto = montarGaveta(CATALOGO_MISTO)
const matchMediaOriginal = window.matchMedia

afterEach(() => {
  window.matchMedia = matchMediaOriginal
  document.documentElement.classList.remove('js')
  window.history.replaceState(null, '', '/')
  vi.useRealTimers()
})

/** Movimento liberado e JS ligado: a saida anima. */
function liberarMovimento() {
  document.documentElement.classList.add('js')
  window.matchMedia = ((q: string) => ({
    matches: q.includes('no-preference'),
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

/** A gaveta com quem a abre, do jeito que a Nav faz. */
function Bancada(props: { dados: DadosGaveta; linhaAtual: string | null; aoFechar: (d: boolean) => void }) {
  const [aberta, setAberta] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={botao} type="button" onClick={() => setAberta(true)}>
        abrir
      </button>
      <Gaveta
        id="gaveta"
        dados={props.dados}
        linhaAtual={props.linhaAtual}
        aberta={aberta}
        aoFechar={(devolver) => {
          props.aoFechar(devolver)
          setAberta(false)
          if (devolver) botao.current?.focus()
        }}
      />
    </>
  )
}

const dialogo = () => document.getElementById('gaveta') as HTMLDialogElement
const botaoAbrir = () => screen.getByRole('button', { name: 'abrir' })
const botaoFechar = () => screen.getByRole('button', { name: 'Fechar o catálogo' })

async function abrir(dados: DadosGaveta = misto, linhaAtual: string | null = null) {
  const user = userEvent.setup()
  const aoFechar = vi.fn()
  const montagem = render(<Bancada dados={dados} linhaAtual={linhaAtual} aoFechar={aoFechar} />)
  await user.click(botaoAbrir())
  return { user, aoFechar, ...montagem }
}

describe('Gaveta: abrir e fechar', () => {
  it('nasce fechada e abre como diálogo modal, com o foco no fechar', async () => {
    render(<Bancada dados={misto} linhaAtual={null} aoFechar={() => {}} />)
    expect(dialogo().open).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.setup().click(botaoAbrir())
    expect(screen.getByRole('dialog', { name: 'Catálogo' })).toBe(dialogo())
    expect(document.activeElement).toBe(botaoFechar())
  })

  it('o ✕ fecha e devolve o foco a quem abriu', async () => {
    const { user, aoFechar } = await abrir()
    await user.click(botaoFechar())
    expect(dialogo().open).toBe(false)
    expect(aoFechar).toHaveBeenCalledExactlyOnceWith(true)
    expect(document.activeElement).toBe(botaoAbrir())
  })

  it('o Esc fecha e devolve o foco a quem abriu', async () => {
    const { user, aoFechar } = await abrir()
    await user.keyboard('{Escape}')
    expect(dialogo().open).toBe(false)
    expect(aoFechar).toHaveBeenCalledExactlyOnceWith(true)
    expect(document.activeElement).toBe(botaoAbrir())
  })

  it('o clique fora (no fundo) fecha; o clique dentro do painel, não', async () => {
    const { aoFechar } = await abrir()
    fireEvent.click(screen.getByRole('heading', { level: 2, name: 'Catálogo' }))
    expect(dialogo().open).toBe(true)
    fireEvent.click(dialogo())
    expect(dialogo().open).toBe(false)
    expect(aoFechar).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('link para a própria página fecha na hora e não rouba o foco do alvo', async () => {
    const { user, aoFechar } = await abrir()
    const casa = within(dialogo()).getByRole('list', { name: 'Na página inicial' })
    await user.click(within(casa).getByRole('link', { name: 'Hoje o dia pede' }))
    expect(dialogo().open).toBe(false)
    expect(aoFechar).toHaveBeenCalledExactlyOnceWith(false)
    expect(document.activeElement).not.toBe(botaoAbrir())
  })

  it('link para outra página não fecha: a navegação troca o documento', async () => {
    const { user, aoFechar } = await abrir()
    // o jsdom nao navega; segurar o padrao evita o aviso de "not implemented"
    const segurar = (e: Event) => e.preventDefault()
    document.addEventListener('click', segurar)
    await user.click(within(dialogo()).getByRole('link', { name: /Salgados/ }))
    document.removeEventListener('click', segurar)
    expect(dialogo().open).toBe(true)
    expect(aoFechar).not.toHaveBeenCalled()
  })
})

describe('Gaveta: a saída animada', () => {
  it('com movimento, data-fechando primeiro e o close() depois de DURACAO_SAIDA', async () => {
    liberarMovimento()
    const { aoFechar } = await abrir()
    vi.useFakeTimers()
    fireEvent.click(botaoFechar())
    expect(dialogo()).toHaveAttribute('data-fechando')
    expect(dialogo().open).toBe(true)
    act(() => vi.advanceTimersByTime(DURACAO_SAIDA - 1))
    expect(dialogo().open).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(dialogo().open).toBe(false)
    expect(dialogo()).not.toHaveAttribute('data-fechando')
    expect(aoFechar).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('sem movimento (o padrão dos testes), fecha na hora', async () => {
    const { user } = await abrir()
    await user.click(botaoFechar())
    expect(dialogo()).not.toHaveAttribute('data-fechando')
    expect(dialogo().open).toBe(false)
  })

  it('pedir para fechar de novo no meio da saída não fecha duas vezes', async () => {
    liberarMovimento()
    const { aoFechar } = await abrir()
    vi.useFakeTimers()
    fireEvent.click(botaoFechar())
    fireEvent.click(botaoFechar())
    fireEvent.keyDown(botaoFechar(), { key: 'Escape' })
    fireEvent.click(dialogo())
    act(() => vi.advanceTimersByTime(DURACAO_SAIDA * 2))
    expect(aoFechar).toHaveBeenCalledOnce()
    expect(dialogo().open).toBe(false)
  })

  it('desmontar no meio da saída não deixa o timer disparar depois', async () => {
    liberarMovimento()
    const { aoFechar, unmount } = await abrir()
    vi.useFakeTimers()
    fireEvent.click(botaoFechar())
    unmount()
    act(() => vi.advanceTimersByTime(DURACAO_SAIDA * 2))
    expect(aoFechar).not.toHaveBeenCalled()
  })
})

describe('Gaveta: o conteúdo', () => {
  it('com três linhas: uma por linha, com capa, regra e contagem, e o catálogo inteiro', async () => {
    await abrir(misto, 'bolos-inteiros')
    const d = dialogo()
    const linhas = d.querySelector('.gaveta__linhas') as HTMLElement
    const links = within(linhas).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/catalogo/bolos-no-pote',
      '/catalogo/bolos-inteiros',
      '/catalogo/salgados',
    ])
    expect(links[0]).toHaveTextContent('Zero açúcar')
    expect(links[0]).toHaveTextContent('7 receitas')
    expect(links[2]).toHaveTextContent('Massa integral')
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page', null])
    expect(links[1].querySelector('.gaveta__capa--inteiro img')).toHaveAttribute('alt', '')
    const tudo = within(d).getByRole('link', { name: /Ver o catálogo inteiro/ })
    expect(tudo).toHaveAttribute('href', '/catalogo')
    expect(tudo).toHaveTextContent('11 receitas')
    expect(within(d).getByText('Escolha uma linha para ver as receitas dela.')).toBeInTheDocument()
    expect(within(d).queryByRole('list', { name: 'Os sabores' })).toBeNull()
  })

  it('com uma linha só: o cartão da linha e os 7 sabores, cada um levando ao seu card', async () => {
    await abrir(real)
    const d = dialogo()
    expect(within(d).getByRole('link', { name: /Ver as 7 receitas/ })).toHaveAttribute('href', '/catalogo/bolos-no-pote')
    const sabores = within(d).getByRole('list', { name: 'Os sabores' })
    const links = within(sabores).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      real.sabores.map((s) => `/catalogo/bolos-no-pote#${s.slug}`),
    )
    expect(links.map((a) => a.textContent)).toEqual(real.sabores.map((s) => s.nome))
    expect(within(d).queryByRole('link', { name: /Ver o catálogo inteiro/ })).toBeNull()
    expect(within(d).getByText('Escolha a linha ou vá direto a um sabor.')).toBeInTheDocument()
  })

  it('os caminhos da home: o bloco do celular e o cartão do Hoje o dia pede', async () => {
    await abrir()
    const casa = within(dialogo()).getByRole('list', { name: 'Na página inicial' })
    expect(within(casa).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/#hoje',
      '/#rotulos',
      '/#marca',
    ])
    expect(within(dialogo()).getByRole('link', { name: /Não sabe o que escolher\?/ })).toHaveAttribute(
      'href',
      '/#hoje',
    )
  })

  it('cada item entra na sua vez: --i em ordem, o pé dividindo o último número', async () => {
    await abrir()
    const ordem = [...dialogo().querySelectorAll<HTMLElement>('.gaveta__item')].map((el) =>
      el.style.getPropertyValue('--i'),
    )
    expect(ordem).toEqual(['0', '1', '2', '3', '4', '4'])
  })

  it('a borda ondulada é decorativa, três camadas', () => {
    render(<Bancada dados={misto} linhaAtual={null} aoFechar={() => {}} />)
    const onda = dialogo().querySelector('.gaveta__onda')!
    expect(onda).toHaveAttribute('aria-hidden', 'true')
    expect(onda.querySelectorAll('path')).toHaveLength(3)
  })

  it('passa no axe aberta', async () => {
    // no conteiner, nao no body: as regras de pagina inteira do axe (region,
    // h1) nao fazem sentido para um componente solto
    const { container } = await abrir()
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/gaveta.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/layout/Gaveta"`.

- [ ] **Step 4: Escrever a gaveta**

```tsx title="src/components/layout/Gaveta.tsx"
'use client'

import Image from 'next/image'
import { useEffect, useRef, type CSSProperties, type MouseEvent, type SyntheticEvent } from 'react'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import {
  CAMINHO_CATALOGO,
  caminhoDaLinha,
  contarReceitas,
  textoVerReceitas,
  type DadosGaveta,
} from '@/lib/visao'

/** Os links da home: na nav (desktop) e no pe da gaveta (celular). */
export const LINKS_DA_HOME = [
  { href: '/#hoje', rotulo: 'Hoje o dia pede' },
  { href: '/#rotulos', rotulo: 'O que é saudável' },
  { href: '/#marca', rotulo: 'A marca' },
] as const

/** A duracao de gaveta-sai e fundo-sai em movimento.css. */
export const DURACAO_SAIDA = 250

/**
 * A borda ondulada: as camadas do bolo de lado, numa caixa de 28 x 900
 * esticada na altura da janela. Cada curva termina onde a proxima comeca e
 * com a mesma tangente, entao a onda nao quebra.
 */
function onda(base: number, amplitude: number, passo: number): string {
  let d = `M0,0 L${base},0`
  for (let y = 0; y < 900; y += passo) {
    d += ` C${base + amplitude},${y + passo / 3} ${base - amplitude},${y + (2 * passo) / 3} ${base},${y + passo}`
  }
  return `${d} L0,900 Z`
}

const ONDAS = [
  { cor: 'cobre', d: onda(21, 6, 180) },
  { cor: 'caramelo', d: onda(13, 5, 140) },
  { cor: 'creme', d: onda(5, 4, 160) },
] as const

/** Os itens entram um depois do outro; o atraso vem de --i (movimento.css). */
const ordem = (i: number) => ({ '--i': i }) as CSSProperties

function animaSaida(): boolean {
  return (
    document.documentElement.classList.contains('js') &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  )
}

function Seta() {
  return (
    <svg className="gaveta__icone" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

type Props = {
  id: string
  dados: DadosGaveta
  /** a linha aberta no catalogo, marcada com aria-current */
  linhaAtual: string | null
  aberta: boolean
  /** a gaveta fechou de vez; `devolverFoco` e falso quando um link da
   *  propria pagina levou o foco para o alvo */
  aoFechar: (devolverFoco: boolean) => void
}

/**
 * A gaveta do catalogo: um <dialog> modal vindo da esquerda. O navegador
 * cuida da camada de cima, do fundo inerte e de prender o foco; aqui fica a
 * abertura, a saida animada e o que cada clique faz. A entrada e CSS puro
 * (movimento.css, sob [open]); a saida espera o CSS tocar antes do close().
 */
export function Gaveta({ id, dados, linhaAtual, aberta, aoFechar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const devolver = useRef(true)

  useEffect(() => {
    const d = ref.current
    if (!aberta || !d) return
    window.clearTimeout(timer.current)
    d.removeAttribute('data-fechando')
    if (!d.open) d.showModal()
    fecharRef.current?.focus()
  }, [aberta])

  useEffect(() => {
    const t = timer
    return () => window.clearTimeout(t.current)
  }, [])

  /** Fecha de vez. Quem avisa e o evento close, que tambem cobre o navegador
   *  fechando sozinho (um segundo Esc seguido nao e cancelavel). */
  function concluir(devolverFoco: boolean) {
    const d = ref.current
    window.clearTimeout(timer.current)
    if (!d?.open) return
    devolver.current = devolverFoco
    d.removeAttribute('data-fechando')
    d.close()
  }

  /** Pedido de fechar (o botao, o Esc, o clique fora). Com movimento, a saida
   *  toca antes; pedido repetido no meio dela nao conta. */
  function fechar() {
    const d = ref.current
    if (!d?.open || d.hasAttribute('data-fechando')) return
    if (!animaSaida()) return concluir(true)
    d.setAttribute('data-fechando', '')
    timer.current = window.setTimeout(() => concluir(true), DURACAO_SAIDA)
  }

  function aoFecharNativo() {
    window.clearTimeout(timer.current)
    ref.current?.removeAttribute('data-fechando')
    const devolverFoco = devolver.current
    devolver.current = true
    aoFechar(devolverFoco)
  }

  function aoCancelar(e: SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault()
    fechar()
  }

  function aoClicar(e: MouseEvent<HTMLDialogElement>) {
    // Painel e borda cobrem a caixa do <dialog> inteira: clique com alvo no
    // proprio <dialog> so pode ter vindo do fundo.
    if (e.target === e.currentTarget) return fechar()
    const link = (e.target as Element).closest('a[href]')
    if (!(link instanceof HTMLAnchorElement)) return
    // Mesma pagina: fecha ja, sem animacao, para o RolagemSuave rolar ate o
    // alvo e levar o foco. Outra pagina: a navegacao troca o documento.
    if (new URL(link.href).pathname === window.location.pathname) concluir(false)
  }

  const [primeira] = dados.linhas
  const unica = dados.linhas.length === 1
  const pe = unica ? dados.sabores.length + 1 : dados.linhas.length + 1
  const atual = (slug: string) => (slug === linhaAtual ? ('page' as const) : undefined)

  return (
    <dialog
      id={id}
      ref={ref}
      aria-labelledby={`${id}-titulo`}
      className="gaveta"
      onCancel={aoCancelar}
      onClose={aoFecharNativo}
      onClick={aoClicar}
    >
      <svg className="gaveta__onda" viewBox="0 0 28 900" preserveAspectRatio="none" aria-hidden="true">
        {ONDAS.map((o) => (
          <path key={o.cor} d={o.d} style={{ fill: `var(--color-${o.cor})` }} />
        ))}
      </svg>

      <div className="gaveta__painel grao" data-lenis-prevent>
        <div className="gaveta__topo">
          <h2 id={`${id}-titulo`}>Catálogo</h2>
          <button
            ref={fecharRef}
            type="button"
            className="gaveta__fechar"
            aria-label="Fechar o catálogo"
            onClick={fechar}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {unica ? (
          <>
            <p className="gaveta__frase">Escolha a linha ou vá direto a um sabor.</p>
            <a
              href={caminhoDaLinha(primeira.slug)}
              aria-current={atual(primeira.slug)}
              className="gaveta__unica gaveta__item"
              style={ordem(0)}
            >
              <span className="gaveta__texto">
                <span className="gaveta__regra">{primeira.regra}</span>
                <span className="gaveta__nome">{primeira.nome}</span>
                <span className="gaveta__ver">
                  {textoVerReceitas(primeira.contagem)} <Seta />
                </span>
              </span>
              <span className="gaveta__arcos" aria-hidden="true">
                {dados.sabores.slice(0, 3).map((s) => (
                  <Image
                    key={s.slug}
                    src={s.imagem.src}
                    alt=""
                    width={s.imagem.largura}
                    height={s.imagem.altura}
                    loading="lazy"
                    sizes="56px"
                  />
                ))}
              </span>
            </a>
            <p id={`${id}-sabores`} className="gaveta__rotulo">
              Os sabores
            </p>
            <ul aria-labelledby={`${id}-sabores`} className="gaveta__sabores">
              {dados.sabores.map((s, i) => (
                <li key={s.slug} className="gaveta__item" style={ordem(i + 1)}>
                  <a href={`${caminhoDaLinha(primeira.slug)}#${s.slug}`}>
                    <Image
                      src={s.imagem.src}
                      alt=""
                      width={s.imagem.largura}
                      height={s.imagem.altura}
                      loading="lazy"
                      sizes="40px"
                    />
                    {s.nome}
                    <svg className="gaveta__icone" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="gaveta__frase">Escolha uma linha para ver as receitas dela.</p>
            <ul className="gaveta__linhas">
              {dados.linhas.map((l, i) => (
                <li key={l.slug} className="gaveta__item" style={ordem(i)}>
                  <a href={caminhoDaLinha(l.slug)} aria-current={atual(l.slug)} className="gaveta__linha">
                    <span className="gaveta__moldura">
                      <span className={`gaveta__capa gaveta__capa--${classeDoFormato(l.capa.formato)}`}>
                        <Image
                          src={l.capa.imagem.src}
                          alt=""
                          width={l.capa.imagem.largura}
                          height={l.capa.imagem.altura}
                          loading="lazy"
                          sizes="70px"
                        />
                      </span>
                    </span>
                    <span className="gaveta__texto">
                      <span className="gaveta__regra">{l.regra}</span>
                      <span className="gaveta__nome">{l.nome}</span>
                      <span className="gaveta__conta">{contarReceitas(l.contagem)}</span>
                    </span>
                    <span className="gaveta__seta" aria-hidden="true">
                      <Seta />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <BotaoRetro
              href={CAMINHO_CATALOGO}
              escuro
              className="gaveta__tudo gaveta__item"
              style={ordem(dados.linhas.length)}
            >
              Ver o catálogo inteiro <span className="gaveta__total">{contarReceitas(dados.total)}</span>
            </BotaoRetro>
          </>
        )}

        <div className="gaveta__casa gaveta__item" style={ordem(pe)}>
          <p id={`${id}-casa`}>Na página inicial</p>
          <ul aria-labelledby={`${id}-casa`}>
            {LINKS_DA_HOME.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.rotulo}</a>
              </li>
            ))}
          </ul>
        </div>

        <a href="/#hoje" className="gaveta__hoje gaveta__item" style={ordem(pe)}>
          <span>Não sabe o que escolher?</span>
          <b>
            Hoje o dia pede <Seta />
          </b>
        </a>
      </div>
    </dialog>
  )
}
```

- [ ] **Step 5: O CSS da gaveta e a trava de rolagem**

```css title="src/app/estilos/gaveta.css"
/* A gaveta do catalogo: <dialog> modal vindo da esquerda, creme com grao,
   com a borda ondulada das camadas do bolo. Os keyframes da abertura e da
   saida moram em movimento.css. Aqui tambem o botao que a abre, na nav. */
@layer components {
  .botao-catalogo {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: none;
    height: 44px; min-width: 44px; padding: 0 18px 0 13px;
    border: 2px solid var(--color-expresso); border-radius: 999px;
    background: transparent; color: var(--color-expresso);
    font: 600 15.5px/1 var(--font-sans); cursor: pointer;
    transition: background-color .25s ease, color .25s ease;
  }
  .botao-catalogo svg { width: 22px; height: 22px; }
  .botao-catalogo:focus-visible { background: var(--color-expresso); color: var(--color-creme); }
  @media (hover: hover) {
    .botao-catalogo:hover { background: var(--color-expresso); color: var(--color-creme); }
  }
  @media (max-width: 820px) {
    .botao-catalogo { width: 44px; padding: 0; }
  }

  /* o <dialog> sem a margem, a borda, o fundo e o limite de altura do navegador */
  .gaveta {
    --painel: min(400px, calc(100vw - 72px));
    --borda: 28px;
    position: fixed; inset: 0 auto 0 0;
    width: calc(var(--painel) + var(--borda)); height: 100%;
    max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
    overflow: visible; background: transparent; color: var(--color-expresso);
  }
  .gaveta::backdrop { background: rgb(43 27 22 / .6); backdrop-filter: blur(2px); }
  .gaveta__onda { position: absolute; top: 0; right: 0; width: var(--borda); height: 100%; }
  .gaveta__painel {
    position: absolute; inset: 0 var(--borda) 0 0;
    display: flex; flex-direction: column; overflow-y: auto; overscroll-behavior: contain;
    padding: 24px 22px 24px 26px; background-color: var(--color-creme);
  }

  .gaveta__topo { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .gaveta__topo h2 { margin: 0; font-size: 40px; line-height: 1; }
  .gaveta__fechar {
    display: grid; place-items: center; flex: none; width: 44px; height: 44px; padding: 0;
    border: 2px solid var(--color-expresso); border-radius: 50%;
    background: transparent; color: var(--color-expresso); cursor: pointer;
    transition: background-color .2s ease, color .2s ease;
  }
  .gaveta__fechar svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; }
  .gaveta__fechar:focus-visible { background: var(--color-expresso); color: var(--color-creme); }
  .gaveta__icone {
    width: 16px; height: 16px; flex: none;
    fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round;
  }
  .gaveta__frase { margin: 10px 0 16px; font-size: 16px; line-height: 1.5; color: var(--color-suave); }

  /* com duas ou mais linhas */
  .gaveta__linhas { margin: 0 -12px; padding: 0; list-style: none; }
  .gaveta__linhas li { padding: 6px 0; border-top: 1.5px dashed rgb(43 27 22 / .22); }
  .gaveta__linha {
    display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: 22px;
    color: var(--color-expresso); text-decoration: none;
    transition: background-color .25s ease, box-shadow .25s ease;
  }
  .gaveta__linha[aria-current="page"] { background: var(--color-linho); }
  .gaveta__moldura { display: grid; place-items: center; flex: none; width: 68px; height: 78px; }
  .gaveta__capa { display: block; overflow: hidden; background: var(--color-chocolate); }
  .gaveta__capa img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .gaveta__capa--pote { width: 62px; height: 78px; border-radius: 999px 999px 10px 10px; }
  .gaveta__capa--inteiro { width: 68px; height: 68px; border-radius: 50%; }
  .gaveta__capa--unidade { width: 64px; height: 64px; border-radius: 16px; }
  .gaveta__capa--neutra { width: 64px; height: 64px; border-radius: 12px; }
  .gaveta__texto { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
  .gaveta__regra { font-size: 13.5px; font-weight: 700; color: var(--color-cobre-texto); }
  .gaveta__nome { font: 400 25px/1.08 var(--font-display); }
  .gaveta__conta { font-size: 15px; color: var(--color-suave); }
  .gaveta__seta {
    display: grid; place-items: center; flex: none; width: 40px; height: 40px;
    border: 2px solid var(--color-expresso); border-radius: 50%;
    transition: background-color .25s ease, color .25s ease;
  }
  .gaveta__tudo { justify-content: center; width: 100%; margin: 18px 0 24px; }
  .gaveta__total { margin-left: 8px; font-weight: 500; color: var(--color-caramelo); }

  /* com uma linha so */
  .gaveta__unica {
    display: flex; align-items: center; gap: 16px; padding: 18px 18px 18px 20px; border-radius: 24px;
    background: var(--color-papel); box-shadow: 6px 6px 0 var(--color-caramelo);
    color: var(--color-expresso); text-decoration: none;
    transition: box-shadow .25s ease, transform .25s ease;
  }
  .gaveta__unica .gaveta__nome { font-size: 30px; }
  .gaveta__ver { display: flex; align-items: center; gap: 8px; margin-top: 2px; font-size: 15px; font-weight: 600; }
  .gaveta__arcos { display: flex; align-items: flex-end; flex: none; }
  .gaveta__arcos img {
    width: 46px; height: 64px; object-fit: cover; border-radius: 999px 999px 8px 8px;
    background: var(--color-chocolate); box-shadow: 0 0 0 3px var(--color-papel);
  }
  .gaveta__arcos img + img { margin-left: -12px; }
  .gaveta__arcos img:nth-child(2) { width: 54px; height: 78px; }
  .gaveta__rotulo { margin: 28px 0 6px; font-size: 14px; font-weight: 700; color: var(--color-cobre-texto); }
  .gaveta__sabores { margin: 0 -10px 24px; padding: 0; list-style: none; }
  .gaveta__sabores li { border-top: 1.5px dashed rgb(43 27 22 / .22); }
  .gaveta__sabores a {
    display: flex; align-items: center; gap: 14px; min-height: 52px; padding: 5px 10px; border-radius: 16px;
    color: var(--color-expresso); font-size: 16.5px; font-weight: 600; text-decoration: none;
    transition: background-color .25s ease;
  }
  .gaveta__sabores img { width: 38px; height: 38px; flex: none; border-radius: 50%; object-fit: cover; background: var(--color-chocolate); }
  .gaveta__sabores .gaveta__icone { margin-left: auto; }

  /* o pe: no desktop o cartao do Hoje o dia pede; no celular os links da home */
  .gaveta__hoje {
    display: block; margin-top: auto; padding: 18px 22px; border-radius: 24px;
    background: var(--color-caramelo); color: var(--color-expresso); text-decoration: none;
    transition: box-shadow .25s ease;
  }
  .gaveta__hoje span { display: block; font-size: 14px; font-weight: 700; color: var(--color-chocolate); }
  .gaveta__hoje b { display: flex; align-items: center; gap: 10px; margin-top: 4px; font: 400 27px/1.1 var(--font-display); }
  .gaveta__hoje .gaveta__icone { width: 22px; height: 22px; }
  .gaveta__casa { margin-top: 26px; padding-top: 16px; border-top: 1.5px dashed rgb(43 27 22 / .22); }
  .gaveta__casa p { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: var(--color-cobre-texto); }
  .gaveta__casa ul { margin: 0; padding: 0; list-style: none; }
  .gaveta__casa a {
    display: flex; align-items: center; min-height: 46px;
    color: var(--color-expresso); font-size: 17px; font-weight: 600; text-decoration: none;
  }

  .gaveta__linha:focus-visible, .gaveta__unica:focus-visible { background: var(--color-papel); box-shadow: 6px 6px 0 var(--color-caramelo); }
  .gaveta__linha:focus-visible .gaveta__seta { background: var(--color-expresso); color: var(--color-creme); }
  .gaveta__sabores a:focus-visible { background: var(--color-papel); }
  .gaveta__hoje:focus-visible { box-shadow: 6px 6px 0 var(--color-cobre); }
  @media (hover: hover) {
    .gaveta__linha:hover { background: var(--color-papel); box-shadow: 6px 6px 0 var(--color-caramelo); }
    .gaveta__linha:hover .gaveta__seta { background: var(--color-expresso); color: var(--color-creme); }
    .gaveta__unica:hover { box-shadow: 8px 8px 0 var(--color-caramelo); transform: translate(-2px, -2px); }
    .gaveta__sabores a:hover { background: var(--color-papel); }
    .gaveta__hoje:hover { box-shadow: 6px 6px 0 var(--color-cobre); }
    .gaveta__fechar:hover { background: var(--color-expresso); color: var(--color-creme); }
  }

  @media (min-width: 821px) {
    .gaveta__casa { display: none; }
  }
  @media (max-width: 820px) {
    .gaveta { --borda: 22px; }
    .gaveta__painel { padding: 20px 16px 22px 20px; }
    .gaveta__topo h2 { font-size: 34px; }
    .gaveta__linhas { margin-inline: -8px; }
    .gaveta__linha { gap: 12px; padding: 9px 8px; }
    .gaveta__moldura { width: 54px; height: 62px; }
    .gaveta__capa--pote { width: 50px; height: 62px; border-radius: 999px 999px 8px 8px; }
    .gaveta__capa--inteiro { width: 54px; height: 54px; }
    .gaveta__capa--unidade, .gaveta__capa--neutra { width: 52px; height: 52px; border-radius: 13px; }
    .gaveta__nome { font-size: 21px; }
    .gaveta__seta { width: 34px; height: 34px; }
    .gaveta__hoje { display: none; }
  }
}
```

Em `src/app/globals.css`, acrescente o import **antes** de `@import "./estilos/movimento.css";`:

```css
@import "./estilos/gaveta.css";
```

E, dentro do `@layer base`, logo depois da regra `.lenis [data-lenis-prevent] { … }`:

```css
  /* A gaveta aberta trava a pagina de tras. O Lenis (autoToggle) para
     sozinho quando o overflow some, e o gutter evita o pulo da barra. */
  html:has(.gaveta[open]) {
    overflow: hidden;
    scrollbar-gutter: stable;
  }
```

- [ ] **Step 6: A abertura leve em `movimento.css`**

Acrescente, junto dos outros `@keyframes` (antes do bloco `@media`):

```css
@keyframes gaveta-entra { from { transform: translateX(-100%); } to { transform: none; } }
@keyframes gaveta-sai { from { transform: none; } to { transform: translateX(-100%); } }
@keyframes fundo-entra { from { opacity: 0; } to { opacity: 1; } }
@keyframes fundo-sai { from { opacity: 1; } to { opacity: 0; } }
@keyframes onda-entra { from { transform: translateX(-16px); } to { transform: none; } }
@keyframes item-entra { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
```

E, no fim do bloco `@media (prefers-reduced-motion: no-preference) { … }` (antes da chave que o fecha):

```css
  /* 8. a gaveta abre leve. Fill backwards: o estado inicial so vale durante
     o atraso, e o hover dos itens manda depois. A saida e disparada pelo JS
     (data-fechando), que espera DURACAO_SAIDA para o close(). */
  html.js .gaveta[open] { animation: gaveta-entra .42s var(--ease-amo) backwards; }
  html.js .gaveta[open]::backdrop { animation: fundo-entra .3s ease backwards; }
  html.js .gaveta[open] .gaveta__onda path:nth-child(1) { animation: onda-entra .5s var(--ease-mola) .16s backwards; }
  html.js .gaveta[open] .gaveta__onda path:nth-child(2) { animation: onda-entra .5s var(--ease-mola) .22s backwards; }
  html.js .gaveta[open] .gaveta__onda path:nth-child(3) { animation: onda-entra .5s var(--ease-mola) .28s backwards; }
  html.js .gaveta[open] .gaveta__item { animation: item-entra .32s var(--ease-amo) calc(.12s + var(--i, 0) * 35ms) backwards; }
  html.js .gaveta[data-fechando] { animation: gaveta-sai .25s ease-in forwards; }
  html.js .gaveta[data-fechando]::backdrop { animation: fundo-sai .25s ease-in forwards; }
```

- [ ] **Step 7: A âncora com o Lenis parado**

Ao clicar num link `/#hoje` de dentro da gaveta, ela fecha e a trava some, mas o Lenis (`autoToggle`) só volta um instante depois, e enquanto isso o `scrollTo` dele é ignorado. Em `src/components/RolagemSuave.tsx`, dentro de `conduzirAncora`, troque:

```ts
  evento.preventDefault()
  window.history.pushState(null, '', url.hash)
  lenis.scrollTo(alvo)
```

por:

```ts
  evento.preventDefault()
  window.history.pushState(null, '', url.hash)
  // Parado (a gaveta acabou de soltar a pagina e o Lenis ainda nao voltou):
  // o scrollTo dele seria ignorado, entao a rolagem vai pelo navegador.
  if (lenis.isStopped) alvo.scrollIntoView({ behavior: 'smooth' })
  else lenis.scrollTo(alvo)
```

Em `tests/rolagem-ancora.test.tsx`, troque o `vi.hoisted` e o `vi.mock` por:

```tsx
const { chamadas, estado } = vi.hoisted(() => ({ chamadas: [] as unknown[][], estado: { parado: false } }))

vi.mock('lenis', () => ({
  default: class LenisFalso {
    get isStopped() {
      return estado.parado
    }
    scrollTo(...args: unknown[]) {
      chamadas.push(args)
    }
    destroy() {}
  },
}))
```

E acrescente, dentro do `describe`:

```tsx
  it('com o Lenis parado (a gaveta acabou de soltar a página), a âncora rola pelo navegador', async () => {
    chamadas.length = 0
    estado.parado = true
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    const user = userEvent.setup()
    render(
      <RolagemSuave>
        <a href="#alvo-parado">ir</a>
        <section id="alvo-parado" className="scroll-mt-24">
          alvo
        </section>
      </RolagemSuave>,
    )
    await user.click(screen.getByRole('link', { name: 'ir' }))
    expect(chamadas).toHaveLength(0)
    expect(rolar).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth' })
    expect(rolar.mock.contexts[0]).toHaveProperty('id', 'alvo-parado')
    estado.parado = false
  })
```

- [ ] **Step 8: Os guardas de CSS**

Em `tests/movimento.test.ts`, acrescente o import:

```ts
import { DURACAO_SAIDA } from '@/components/layout/Gaveta'
```

E ao fim do arquivo:

```ts
describe('a abertura leve da gaveta (spec §4.7)', () => {
  const segundos = (v: string) => (v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v))
  const regras = () =>
    [...blocoDoPortao().matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, seletor]) => seletor.includes('.gaveta'))
      .map(([, seletor, corpo]) => ({
        seletor: seletor.trim(),
        animacao: /animation:\s*([^;]+);/.exec(corpo)?.[1].trim() ?? '',
      }))

  it('entra sob [open] com fill backwards e sai sob [data-fechando] com forwards', () => {
    const r = regras()
    expect(r).toHaveLength(8)
    for (const { seletor, animacao } of r) {
      expect(animacao, seletor).toMatch(seletor.includes('[data-fechando]') ? /forwards$/ : /backwards$/)
    }
  })

  it('cada regra termina em até 0.6 s, somando duração e atraso base', () => {
    for (const { seletor, animacao } of regras()) {
      const [duracao, atraso = '0s'] = animacao.match(/\d*\.?\d+m?s\b/g)!
      expect(segundos(duracao) + segundos(atraso), seletor).toBeLessThanOrEqual(0.6)
    }
  })

  it('a lista entra 35 ms depois do item anterior, contado por --i', () => {
    const item = regras().find((r) => r.seletor.endsWith('.gaveta__item'))!
    expect(item.animacao).toContain('calc(.12s + var(--i, 0) * 35ms)')
  })

  it('a saída dura o que o JS espera antes do close()', () => {
    expect(DURACAO_SAIDA).toBe(250)
    const saidas = regras().filter((r) => r.seletor.includes('[data-fechando]'))
    expect(saidas).toHaveLength(2)
    for (const { animacao } of saidas) expect(animacao).toMatch(/^[\w-]+ \.25s /)
  })
})
```

Em `tests/estilos.test.ts`, acrescente dentro do `describe('estilos')`:

```ts
  it('a gaveta aberta trava a página de trás sem pular a barra de rolagem', () => {
    const trava = regra(ler('../globals.css'), 'html:has(.gaveta[open])')
    expect(ultimo(trava, 'overflow')).toBe('hidden')
    expect(ultimo(trava, 'scrollbar-gutter')).toBe('stable')
  })

  it('o <dialog> da gaveta perde a margem, a borda e o limite de altura do navegador', () => {
    const gaveta = regra(ler('gaveta.css'), '.gaveta')
    expect(ultimo(gaveta, 'margin')).toBe('0')
    expect(ultimo(gaveta, 'border')).toBe('0')
    expect(ultimo(gaveta, 'max-height')).toBe('none')
    expect(ultimo(gaveta, 'height')).toBe('100%')
  })
```

- [ ] **Step 9: Rodar e ver passar**

Run: `npx vitest run tests/gaveta.test.tsx tests/movimento.test.ts tests/estilos.test.ts tests/rolagem-ancora.test.tsx`
Expected: PASS.

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS e nenhum erro.

- [ ] **Step 10: Commit**

```bash
git add src/components/layout/Gaveta.tsx src/app/estilos/gaveta.css src/app/estilos/movimento.css src/app/globals.css src/components/RolagemSuave.tsx tests/setup.ts tests/gaveta.test.tsx tests/movimento.test.ts tests/estilos.test.ts tests/rolagem-ancora.test.tsx
git commit -m "feat: a gaveta do catalogo, com a abertura leve" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW"
```

---

### Task 4: A nav abre a gaveta

**Files:**
- Create: `src/components/ui/IconeCamadas.tsx`
- Modify: `src/components/layout/Nav.tsx`, `src/app/page.tsx`
- Test: `tests/layout.test.tsx` (bloco Nav), `tests/pagina.test.tsx`

**Interfaces:**
- Consumes: `Gaveta`, `LINKS_DA_HOME` (Task 3); `DadosGaveta`, `montarGaveta`, `CAMINHO_CATALOGO` (Task 2).
- Produces:
  - `Nav({ gaveta, linhaAtual }: { gaveta: DadosGaveta; linhaAtual?: string | null })`, gaveta com `id="gaveta"`.
  - `IconeCamadas({ className }: { className?: string })`, svg `aria-hidden`.

- [ ] **Step 1: Reescrever os testes da Nav, que vão falhar**

Em `tests/layout.test.tsx`, troque os imports do topo por:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { FiltroProvider } from '@/components/FiltroProvider'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarGaveta, type DadosGaveta } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'
import { Sonda } from './fixtures/sonda'

const gaveta = montarGaveta(await carregarCatalogo())
const montarNav = (dados: DadosGaveta = gaveta, linhaAtual: string | null = null) =>
  render(<Nav gaveta={dados} linhaAtual={linhaAtual} />)
```

E troque o `describe('Nav', …)` inteiro por:

```tsx
describe('Nav', () => {
  it('é um landmark de navegação', () => {
    montarNav()
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
  })

  it('leva às seções da home, de qualquer página', () => {
    montarNav()
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    for (const [nome, href] of [
      ['Hoje o dia pede', '/#hoje'],
      ['O que é saudável', '/#rotulos'],
      ['A marca', '/#marca'],
    ]) {
      expect(within(nav).getByRole('link', { name: nome })).toHaveAttribute('href', href)
    }
  })

  it('tem um botão de cardápio só, e ele leva ao catálogo', () => {
    montarNav()
    const cardapio = screen.getAllByRole('link', { name: /card[aá]pio/i })
    expect(cardapio).toHaveLength(1)
    expect(cardapio[0]).toHaveAttribute('href', '/catalogo')
    expect(cardapio[0]).toHaveClass('btn-retro', 'btn-retro--escuro')
  })

  it('todo link leva a uma seção da home ou ao catálogo, inclusive os da gaveta', async () => {
    const user = userEvent.setup()
    montarNav()
    await user.click(screen.getByRole('button', { name: 'Catálogo' }))
    for (const a of screen.getAllByRole('link')) {
      expect(a.getAttribute('href')).toMatch(/^\/(#[a-z-]+|catalogo(\/[a-z-]+)?(#[a-z-]+)?)$/)
    }
  })

  it('não tem carrinho, busca nem login, não existem ainda', () => {
    montarNav()
    const rotulos = [...screen.getAllByRole('link'), ...screen.getAllByRole('button')].map((e) =>
      (e.getAttribute('aria-label') ?? e.textContent ?? '').toLowerCase(),
    )
    for (const r of rotulos) expect(r).not.toMatch(/carrinho|sacola|buscar|entrar|login|conta/)
  })

  it('o logo tem o nome da marca e leva ao topo da home', () => {
    montarNav()
    const logo = screen.getByAltText(/amo/i)
    expect(logo.closest('a')).toHaveAttribute('href', '/#topo')
  })

  it('o botão Catálogo: só com JS, avisa que abre um diálogo e qual', () => {
    montarNav()
    const botao = screen.getByRole('button', { name: 'Catálogo' })
    expect(botao).toHaveClass('so-js', 'botao-catalogo')
    expect(botao).toHaveAttribute('aria-haspopup', 'dialog')
    expect(botao).toHaveAttribute('aria-controls', 'gaveta')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('abre a gaveta; o Esc fecha e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    montarNav()
    const botao = screen.getByRole('button', { name: 'Catálogo' })
    await user.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog', { name: 'Catálogo' })).toHaveAttribute('id', 'gaveta')
    await user.keyboard('{Escape}')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(botao)
  })

  it('a gaveta fica fora do invólucro sem clique (pointer-events-none) da nav', () => {
    montarNav()
    expect(document.getElementById('gaveta')!.closest('.pointer-events-none')).toBeNull()
  })

  it('o menu ≡ saiu: os links da home vivem na gaveta', () => {
    montarNav()
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    expect(document.getElementById('menu-mobile')).toBeNull()
  })

  it('na página de uma linha, a gaveta marca a linha atual', async () => {
    const user = userEvent.setup()
    montarNav(montarGaveta(CATALOGO_MISTO), 'salgados')
    await user.click(screen.getByRole('button', { name: 'Catálogo' }))
    const dialogo = screen.getByRole('dialog', { name: 'Catálogo' })
    expect(within(dialogo).getByRole('link', { name: /Salgados/ })).toHaveAttribute('aria-current', 'page')
  })

  it('opaca desde o primeiro pixel: ao rolar só a sombra muda, a altura nunca', () => {
    montarNav()
    const nav = screen.getByRole('navigation')
    expect(nav.style.height).toBe('64px')
    expect(nav.className).toContain('bg-creme')
    expect(nav.className).toContain('shadow-none')

    Object.defineProperty(window, 'scrollY', { value: 80, configurable: true })
    fireEvent.scroll(window)
    expect(nav.style.height).toBe('64px')
    expect(nav.className).toContain('bg-creme')
    expect(nav.className).not.toContain('shadow-none')
    expect(nav.className).toMatch(/shadow-\[/)
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })
})
```

Em `tests/pagina.test.tsx`, troque o teste "todo link interno aponta para um id que existe…" por:

```tsx
  it('todo link para uma seção da home aponta para um id que existe, e o alvo tem scroll-mt-24', () => {
    const { container } = montar()
    const ids = new Set(
      [...container.querySelectorAll('a[href^="#"], a[href^="/#"]')]
        .map((a) => a.getAttribute('href')!.replace(/^\/?#/, ''))
        .filter(Boolean),
    )
    expect(ids.size).toBeGreaterThan(3)
    for (const id of ids) {
      const alvo = container.querySelector(`#${id}`)
      expect(alvo, `âncora morta: #${id}`).toBeTruthy()
      expect(alvo!.className, `#${id} sem scroll-mt-24`).toMatch(/\bscroll-mt-24\b/)
    }
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/layout.test.tsx tests/pagina.test.tsx`
Expected: FAIL (a Nav ainda não tem o botão Catálogo nem recebe `gaveta`).

- [ ] **Step 3: O ícone e a nav nova**

```tsx title="src/components/ui/IconeCamadas.tsx"
/** Tres ondas, as camadas do bolo vistas pelo vidro: o icone do catalogo. */
export function IconeCamadas({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 7c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
      <path d="M3 12c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
      <path d="M3 17c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
    </svg>
  )
}
```

```tsx title="src/components/layout/Nav.tsx"
'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Gaveta, LINKS_DA_HOME } from '@/components/layout/Gaveta'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { IconeCamadas } from '@/components/ui/IconeCamadas'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { CAMINHO_CATALOGO, type DadosGaveta } from '@/lib/visao'

/** 12px do `top-3` + 64 de altura + 20 de folga = os 96 do DESLOCAMENTO_NAV
 *  (RolagemSuave) e do `scroll-mt-24` das secoes. */
export const ALTURA_NAV = 64

type Props = {
  gaveta: DadosGaveta
  /** a linha aberta no catalogo; null na home e em "Tudo" */
  linhaAtual?: string | null
}

/**
 * Nav em pilula creme, flutuando sobre o topo escuro da pagina. Opaca desde o
 * primeiro pixel; ao rolar muda uma coisa so, a sombra. O botao Catalogo abre
 * a gaveta; "Ver cardapio" leva a pagina do catalogo. No celular os links da
 * home moram na gaveta, e o menu de antes saiu.
 */
export function Nav({ gaveta, linhaAtual = null }: Props) {
  const [rolou, setRolou] = useState(false)
  const [aberta, setAberta] = useState(false)
  const botaoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 40)
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <>
      {/* pointer-events-none no involucro, auto nos filhos: com a margem
          negativa ele cobre o topo da pagina, e sem isso engoliria clique e
          hover de tudo que passa por baixo. */}
      <div
        style={{ marginBottom: -ALTURA_NAV }}
        className="pointer-events-none sticky top-3 z-40 px-[var(--gutter)]"
      >
        <div className="relative mx-auto max-w-[1180px]">
          <nav
            aria-label="Principal"
            style={{ height: ALTURA_NAV }}
            className={
              'pointer-events-auto flex items-center gap-2.5 rounded-full bg-creme pl-2.5 pr-2 ' +
              'transition-[box-shadow] duration-300 min-[821px]:gap-[26px] min-[821px]:pr-2.5 ' +
              (rolou ? 'shadow-[0_10px_30px_-12px_rgb(0_0_0_/_0.45)]' : 'shadow-none')
            }
          >
            <button
              ref={botaoRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={aberta}
              aria-controls="gaveta"
              onClick={() => setAberta(true)}
              className="so-js botao-catalogo"
            >
              <IconeCamadas />
              <span className="max-[820px]:sr-only">Catálogo</span>
            </button>

            {/* Dimensoes intrinsecas do arquivo (tests/logo.test.ts guarda os
                dois numeros): com elas a proporcao declarada fecha exata e o
                next/image nao avisa no console. */}
            <a href="/#topo" className="shrink-0 rounded-md">
              <Image
                src="/marca/logo-amo.png"
                alt="AMO Sabores Saudáveis"
                width={2245}
                height={714}
                loading="eager"
                fetchPriority="low"
                sizes="100px"
                className="h-[26px] w-auto min-[821px]:h-[30px]"
              />
            </a>

            <ul className="ml-auto hidden items-center gap-[30px] min-[821px]:flex">
              {LINKS_DA_HOME.map((item, i) => (
                <li key={item.href}>
                  <LinkSublinhado href={item.href} traco={i as 0 | 1 | 2}>
                    {item.rotulo}
                  </LinkSublinhado>
                </li>
              ))}
            </ul>

            <BotaoRetro href={CAMINHO_CATALOGO} escuro compacto className="ml-auto min-[821px]:ml-0">
              Ver cardápio
            </BotaoRetro>
          </nav>
        </div>
      </div>

      {/* Fora do involucro: o <dialog> herdaria o pointer-events: none dele. */}
      <Gaveta
        id="gaveta"
        dados={gaveta}
        linhaAtual={linhaAtual}
        aberta={aberta}
        aoFechar={(devolverFoco) => {
          setAberta(false)
          if (devolverFoco) botaoRef.current?.focus()
        }}
      />
    </>
  )
}
```

- [ ] **Step 4: A home passa a gaveta**

Em `src/app/page.tsx`:
- troque `import { montarVisao } from '@/lib/visao'` por `import { montarGaveta, montarVisao } from '@/lib/visao'`;
- troque `const visao = montarVisao(await carregarCatalogo())` por:

```tsx
  const catalogo = await carregarCatalogo()
  const visao = montarVisao(catalogo)
```

- troque `<Nav />` por `<Nav gaveta={montarGaveta(catalogo)} />`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS e nenhum erro.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/IconeCamadas.tsx src/components/layout/Nav.tsx src/app/page.tsx tests/layout.test.tsx tests/pagina.test.tsx
git commit -m "feat: a nav abre a gaveta do catalogo e o menu do celular sai" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW"
```

---

### Task 5: A grade com FLIP vira peça própria

Refatoração: a grade animada sai de `Cardapio.tsx` para ser usada pelo catálogo. O cardápio da home continua igual até a Task 7.

**Files:**
- Create: `src/components/ui/GradeProdutos.tsx`
- Modify: `src/components/sections/Cardapio.tsx`
- Test: `tests/produto.test.tsx`

**Interfaces:**
- Produces: `GradeProdutos({ produtos, tipos, nomesDosSelos, comAncora }: { produtos: readonly Produto[]; tipos: Readonly<Record<string, string>>; nomesDosSelos: Readonly<Record<string, string>>; comAncora?: boolean })`. Com `comAncora`, cada `<li>` ganha `id={produto.slug}` e `scroll-mt-24`.

- [ ] **Step 1: Escrever o teste que vai falhar**

Em `tests/produto.test.tsx`, acrescente o import:

```tsx
import { GradeProdutos } from '@/components/ui/GradeProdutos'
```

E ao fim do arquivo:

```tsx
describe('GradeProdutos', () => {
  const tipos = { 'bolos-no-pote': 'Bolo no pote' }

  it('lista os cards na ordem recebida', () => {
    render(<GradeProdutos produtos={PRODUTOS.slice(0, 3)} tipos={tipos} nomesDosSelos={nomes} />)
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-labelledby'))).toEqual([
      'produto-prestigio',
      'produto-pacoca',
      'produto-mousse-de-maracuja',
    ])
  })

  it('com âncora, cada card é alvo do link de sabor: id do slug e scroll-mt-24', () => {
    const { container } = render(
      <GradeProdutos produtos={[prestigio]} tipos={tipos} nomesDosSelos={nomes} comAncora />,
    )
    const item = container.querySelector('li')!
    expect(item).toHaveAttribute('id', 'prestigio')
    expect(item).toHaveClass('scroll-mt-24')
  })

  it('sem âncora, sem id', () => {
    const { container } = render(<GradeProdutos produtos={[prestigio]} tipos={tipos} nomesDosSelos={nomes} />)
    expect(container.querySelector('li')).not.toHaveAttribute('id')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/produto.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/ui/GradeProdutos"`.

- [ ] **Step 3: Extrair a grade**

```tsx title="src/components/ui/GradeProdutos.tsx"
'use client'

import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { CardProduto } from '@/components/ui/CardProduto'
import type { Produto } from '@/lib/catalogo'
import { EASE_AMO } from '@/lib/motion'

type Props = {
  produtos: readonly Produto[]
  tipos: Readonly<Record<string, string>>
  nomesDosSelos: Readonly<Record<string, string>>
  /** cada card vira alvo de ancora (o link de sabor da gaveta) */
  comAncora?: boolean
}

const MOLA = [0.34, 1.4, 0.64, 1] as const

/**
 * A grade de cards com o FLIP do Motion: quem fica desliza para o novo
 * lugar, quem entra cresce. Sob movimento reduzido o MotionConfig desliga o
 * deslocamento.
 */
export function GradeProdutos({ produtos, tipos, nomesDosSelos, comAncora = false }: Props) {
  return (
    <MotionConfig reducedMotion="user">
      <ul role="list" className="grade">
        <AnimatePresence mode="popLayout" initial={false}>
          {produtos.map((p) => (
            <motion.li
              key={p.slug}
              id={comAncora ? p.slug : undefined}
              className={comAncora ? 'scroll-mt-24' : undefined}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              transition={{
                layout: { duration: 0.56, ease: EASE_AMO },
                default: { duration: 0.42, delay: 0.09, ease: MOLA },
              }}
            >
              <CardProduto produto={p} tipo={tipos[p.linha] ?? ''} nomesDosSelos={nomesDosSelos} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </MotionConfig>
  )
}
```

Em `src/components/sections/Cardapio.tsx`:
- troque os imports `import { AnimatePresence, MotionConfig, motion } from 'motion/react'`, `import { CardProduto } from '@/components/ui/CardProduto'` e `import { EASE_AMO } from '@/lib/motion'` por `import { GradeProdutos } from '@/components/ui/GradeProdutos'`;
- apague a constante `MOLA`;
- troque o bloco inteiro `<MotionConfig reducedMotion="user"> … </MotionConfig>` por:

```tsx
        <GradeProdutos produtos={visiveis} tipos={tipos} nomesDosSelos={nomesDosSelos} />
```

- no comentário do componente, troque "Quem fica desliza para o novo lugar (FLIP do Motion); quem entra cresce. Sob movimento reduzido o MotionConfig desliga o deslocamento." por "A grade e a GradeProdutos, com o FLIP.".

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS (inclusive `tests/cardapio.test.tsx`, que não mudou) e nenhum erro.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/GradeProdutos.tsx src/components/sections/Cardapio.tsx tests/produto.test.tsx
git commit -m "refactor: a grade com FLIP vira GradeProdutos, com ancora opcional" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW"
```

---

### Task 6: O corpo do catálogo (coluna, filtros, grupos, rótulo)

**Files:**
- Create: `src/components/sections/CatalogoPagina.tsx`, `src/app/estilos/catalogo.css`, `tests/catalogo-pagina.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `VistaCatalogo`, `contarReceitas`, `filtrar` (Task 2); `GradeProdutos` (Task 5); `IconeCamadas` (Task 4); `Pilula`, `LinkSublinhado`, `PapelRotulo`, `classeDoFormato` (existentes).
- Produces:
  - `CatalogoPagina({ vista }: { vista: VistaCatalogo })`
  - `vontadeDaBusca(busca: string, validas: readonly { slug: string }[]): string | null`

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/catalogo-pagina.test.tsx"
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { CatalogoPagina, vontadeDaBusca } from '@/components/sections/CatalogoPagina'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarCatalogo } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const real = await carregarCatalogo()

afterEach(() => window.history.replaceState(null, '', '/'))

const cards = () => screen.queryAllByRole('article')
const vontades = () => screen.getByRole('group', { name: 'Na vontade de' })
const mostrando = () => screen.getByText(/^Mostrando \d+ de \d+ receitas?\.$/)

function montar(linha: string | null, catalogo = real, busca = '') {
  window.history.replaceState(null, '', `/catalogo${busca}`)
  return render(<CatalogoPagina vista={montarCatalogo(catalogo, linha)} />)
}

describe('vontadeDaBusca', () => {
  const validas = [{ slug: 'chocolate' }, { slug: 'fruta' }]

  it('aceita a vontade que existe na vista', () => {
    expect(vontadeDaBusca('?vontade=chocolate', validas)).toBe('chocolate')
  })

  it('ignora vazio, inexistente e maiúscula; com repetida, vale a primeira', () => {
    expect(vontadeDaBusca('', validas)).toBeNull()
    expect(vontadeDaBusca('?vontade=', validas)).toBeNull()
    expect(vontadeDaBusca('?vontade=salgado', validas)).toBeNull()
    expect(vontadeDaBusca('?vontade=Chocolate', validas)).toBeNull()
    expect(vontadeDaBusca('?vontade=fruta&vontade=chocolate', validas)).toBe('fruta')
  })
})

describe('Catálogo de uma linha (o cadastro de hoje)', () => {
  it('sem coluna de linhas, com os 7 cards, cada um alvo de âncora', () => {
    const { container } = montar('bolos-no-pote')
    expect(screen.queryByRole('navigation', { name: 'Linhas' })).toBeNull()
    expect(cards()).toHaveLength(7)
    const prestigio = container.querySelector('#prestigio')
    expect(prestigio).toHaveClass('scroll-mt-24')
    expect(within(prestigio as HTMLElement).getByRole('article')).toBeInTheDocument()
  })

  it('o título das receitas existe para leitor de tela, e o h3 dos cards não pula nível', () => {
    montar('bolos-no-pote')
    expect(screen.getByRole('heading', { level: 2, name: 'Receitas' })).toHaveClass('sr-only')
  })

  it('a vontade filtra, marca a pílula e anuncia; clicar de novo desliga', async () => {
    const user = userEvent.setup()
    montar('bolos-no-pote')
    expect(within(vontades()).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Chocolate 2',
      'Fruta 3',
      'Coco 2',
      'Um clássico 3',
    ])
    expect(mostrando()).toHaveTextContent('Mostrando 7 de 7 receitas.')
    expect(mostrando()).toHaveAttribute('aria-live', 'polite')
    const chocolate = screen.getByRole('button', { name: 'Chocolate 2' })
    await user.click(chocolate)
    expect(chocolate).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(mostrando()).toHaveTextContent('Mostrando 2 de 7 receitas.')
    await user.click(chocolate)
    expect(chocolate).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(cards()).toHaveLength(7))
  })

  it('uma vontade por vez', async () => {
    const user = userEvent.setup()
    montar('bolos-no-pote')
    await user.click(screen.getByRole('button', { name: 'Chocolate 2' }))
    await user.click(screen.getByRole('button', { name: 'Fruta 3' }))
    expect(screen.getByRole('button', { name: 'Chocolate 2' })).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(cards()).toHaveLength(3))
  })

  it('?vontade= liga o filtro na chegada, e a pessoa ainda pode trocar', async () => {
    const user = userEvent.setup()
    montar('bolos-no-pote', real, '?vontade=chocolate')
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Chocolate 2' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Fruta 3' }))
    await waitFor(() => expect(cards()).toHaveLength(3))
  })

  it('?vontade= que não vale na vista é ignorado', async () => {
    montar('bolos-no-pote', real, '?vontade=salgado')
    await waitFor(() => expect(cards()).toHaveLength(7))
    for (const b of within(vontades()).getAllByRole('button')) expect(b).toHaveAttribute('aria-pressed', 'false')
  })

  it('no fim, o rótulo da linha', () => {
    montar('bolos-no-pote')
    expect(screen.getByRole('heading', { level: 2, name: 'O rótulo da linha' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Bolos no pote' })).toHaveClass('papel-rotulo--largo')
  })

  it('sem selo que filtre, sem pílula de selo', () => {
    montar('bolos-no-pote')
    expect(screen.queryByRole('group', { name: 'Filtrar pelo selo' })).toBeNull()
  })

  it('passa no axe', async () => {
    const { container } = montar('bolos-no-pote')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Catálogo com três linhas (fixture)', () => {
  it('"Tudo": a coluna de linhas, com o item atual e um link por linha', () => {
    montar(null, CATALOGO_MISTO)
    const linhas = screen.getByRole('navigation', { name: 'Linhas' })
    const links = within(linhas).getAllByRole('link', { name: /\d/ })
    expect(links.map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')])).toEqual([
      ['Tudo11', '/catalogo', 'page'],
      ['Bolos no pote7', '/catalogo/bolos-no-pote', null],
      ['Bolos inteiros2', '/catalogo/bolos-inteiros', null],
      ['Salgados2', '/catalogo/salgados', null],
    ])
    expect(within(linhas).getByRole('link', { name: /Não sabe o que escolher/ })).toHaveAttribute('href', '/#hoje')
  })

  it('"Tudo": um grupo por linha, com h2 e o link para a página dela; sem rótulo no fim', () => {
    montar(null, CATALOGO_MISTO)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Receitas',
      'Bolos no pote',
      'Bolos inteiros',
      'Salgados',
    ])
    expect(screen.getByRole('link', { name: 'Ver só bolos inteiros' })).toHaveAttribute('href', '/catalogo/bolos-inteiros')
    expect(cards()).toHaveLength(11)
    expect(screen.queryByRole('heading', { name: 'O rótulo da linha' })).toBeNull()
  })

  it('"Tudo": vontades e selos de todas as linhas', () => {
    montar(null, CATALOGO_MISTO)
    expect(within(vontades()).getAllByRole('button')).toHaveLength(5)
    expect(
      within(screen.getByRole('group', { name: 'Filtrar pelo selo' })).getAllByRole('button').map((b) => b.textContent),
    ).toEqual(['Zero açúcar', 'Fonte de fibras', 'Integral', 'Sem conservante'])
  })

  it('o grupo que o filtro esvazia some', async () => {
    const user = userEvent.setup()
    montar(null, CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Algo salgado 2' }))
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Receitas', 'Salgados'])
  })

  it('filtro sem receita: o estado vazio, e "Ver todas" volta tudo e leva o foco ao título', async () => {
    const user = userEvent.setup()
    montar(null, CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Algo salgado 2' }))
    await user.click(screen.getByRole('button', { name: 'Fonte de fibras' }))
    await waitFor(() => expect(cards()).toHaveLength(0))
    expect(screen.getByText(/Nenhuma receita com esse filtro ainda/)).toBeInTheDocument()
    expect(mostrando()).toHaveTextContent('Mostrando 0 de 11 receitas.')
    await user.click(screen.getByRole('button', { name: 'Ver todas' }))
    await waitFor(() => expect(cards()).toHaveLength(11))
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Receitas' }))
  })

  it('nos salgados: sem pílula de vontade (todos têm a mesma), e o selo que só um tem filtra', async () => {
    const user = userEvent.setup()
    montar('salgados', CATALOGO_MISTO)
    expect(screen.queryByRole('group', { name: 'Na vontade de' })).toBeNull()
    expect(screen.queryByText('Na vontade de')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Sem conservante' }))
    await waitFor(() => expect(cards()).toHaveLength(1))
    expect(
      within(screen.getByRole('navigation', { name: 'Linhas' })).getByRole('link', { name: /Salgados/ }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('passa no axe', async () => {
    const { container } = montar(null, CATALOGO_MISTO)
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/catalogo-pagina.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/sections/CatalogoPagina"`.

- [ ] **Step 3: Escrever o componente**

```tsx title="src/components/sections/CatalogoPagina.tsx"
'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { GradeProdutos } from '@/components/ui/GradeProdutos'
import { IconeCamadas } from '@/components/ui/IconeCamadas'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import { PapelRotulo } from '@/components/ui/PapelRotulo'
import { Pilula } from '@/components/ui/Pilula'
import { contarReceitas, filtrar, type VistaCatalogo } from '@/lib/visao'

/** A vontade de chegada (`?vontade=chocolate`, vinda do Hoje o dia pede).
 *  So vale uma vontade que filtra alguma coisa na vista; o resto e ignorado. */
export function vontadeDaBusca(busca: string, validas: readonly { slug: string }[]): string | null {
  const v = new URLSearchParams(busca).get('vontade')
  return v !== null && validas.some((x) => x.slug === v) ? v : null
}

// A busca da URL como fonte externa: no servidor e na hidratacao ela e
// vazia, entao o HTML do servidor sai completo e sem filtro; logo depois o
// cliente le a de verdade. A pagina nao troca de URL sem navegar.
const semAssinatura = () => () => {}
const buscaDoCliente = () => window.location.search
const buscaDoServidor = () => ''

type Props = { vista: VistaCatalogo }

/**
 * O corpo do catalogo: a coluna de linhas (com 2 ou mais), os filtros de
 * vontade e de selo, os grupos de receitas e, numa linha, o rotulo dela. A
 * linha nao e filtro: e a rota.
 */
export function CatalogoPagina({ vista }: Props) {
  const busca = useSyncExternalStore(semAssinatura, buscaDoCliente, buscaDoServidor)
  // undefined: a pessoa ainda nao escolheu, e vale a vontade da URL
  const [escolhida, setEscolhida] = useState<string | null | undefined>(undefined)
  const [selo, setSelo] = useState<string | null>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)

  const vontade = escolhida === undefined ? vontadeDaBusca(busca, vista.vontades) : escolhida
  const grupos = vista.grupos.map((g) => ({ ...g, visiveis: filtrar(g.produtos, { linha: null, selo, vontade }) }))
  const mostrando = grupos.reduce((n, g) => n + g.visiveis.length, 0)
  const tudo = vista.linha === null

  // O botao clicado some da tela; o foco vai para o titulo das receitas em
  // vez de cair no <body>.
  function verTodas() {
    setEscolhida(null)
    setSelo(null)
    tituloRef.current?.focus()
  }

  return (
    <div className="catalogo grao">
      <div className="wrap catalogo__corpo">
        {/* div e nao aside: dentro do <main>, um complementary reprova no axe
            (landmark-complementary-is-top-level). O landmark e o nav. */}
        {vista.itensLinha.length > 0 ? (
          <div className="catalogo__lado">
            <nav aria-label="Linhas" className="catalogo__linhas">
              <p className="rotulo-secao catalogo__rotulo">Linhas</p>
              <ul>
                {vista.itensLinha.map((i) => (
                  <li key={i.href}>
                    <a href={i.href} aria-current={i.atual ? 'page' : undefined} className="catalogo__linha">
                      <span
                        className={`catalogo__forma catalogo__forma--${i.formato === null ? 'tudo' : classeDoFormato(i.formato)}`}
                        aria-hidden="true"
                      >
                        {i.formato === null ? <IconeCamadas /> : null}
                      </span>
                      <span className="catalogo__linha-nome">{i.nome}</span>
                      <span className="catalogo__linha-conta">{i.contagem}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <a href="/#hoje" className="catalogo__hoje">
                <span>Não sabe o que escolher?</span>
                <b>
                  Hoje o dia pede
                  <svg className="catalogo__seta" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </b>
              </a>
            </nav>
          </div>
        ) : null}

        <div className="catalogo__receitas">
          <h2 ref={tituloRef} tabIndex={-1} className="sr-only">
            Receitas
          </h2>

          <div className="catalogo__filtros so-js">
            {vista.vontades.length > 0 ? (
              <>
                <p id="filtro-vontade" className="catalogo__filtro-rotulo">
                  Na vontade de
                </p>
                <div role="group" aria-labelledby="filtro-vontade" className="catalogo__pilulas">
                  {vista.vontades.map((v) => (
                    <Pilula
                      key={v.slug}
                      aria-pressed={vontade === v.slug}
                      onClick={() => setEscolhida(vontade === v.slug ? null : v.slug)}
                    >
                      {v.palavra} <small>{v.contagem}</small>
                    </Pilula>
                  ))}
                </div>
              </>
            ) : null}
            {vista.selos.length > 0 ? (
              <div role="group" aria-label="Filtrar pelo selo" className="catalogo__pilulas">
                {vista.selos.map((s) => (
                  <Pilula
                    key={s.id}
                    variante="selo"
                    aria-pressed={selo === s.id}
                    onClick={() => setSelo(selo === s.id ? null : s.id)}
                  >
                    {s.nome}
                  </Pilula>
                ))}
              </div>
            ) : null}
            <p aria-live="polite" className="catalogo__mostrando">
              {`Mostrando ${mostrando} de ${contarReceitas(vista.contagem)}.`}
            </p>
          </div>

          {grupos.map((g) =>
            g.visiveis.length === 0 ? null : (
              <section
                key={g.slug}
                aria-labelledby={tudo ? `grupo-${g.slug}` : undefined}
                className="catalogo__grupo"
              >
                {tudo ? (
                  <div className="catalogo__grupo-topo">
                    <h2 id={`grupo-${g.slug}`}>{g.nome}</h2>
                    <LinkSublinhado href={g.href}>{`Ver só ${g.nome.toLowerCase()}`}</LinkSublinhado>
                  </div>
                ) : null}
                <GradeProdutos
                  produtos={g.visiveis}
                  tipos={vista.tipos}
                  nomesDosSelos={vista.nomesDosSelos}
                  comAncora
                />
              </section>
            ),
          )}

          {mostrando === 0 ? (
            <p className="cardapio__vazio">
              Nenhuma receita com esse filtro ainda.{' '}
              <button type="button" onClick={verTodas}>
                Ver todas
              </button>
            </p>
          ) : null}

          {vista.linha ? (
            <section aria-labelledby="titulo-rotulo-linha" className="catalogo__rotulo-linha">
              <h2 id="titulo-rotulo-linha" className="rotulo-secao">
                O rótulo da linha
              </h2>
              <PapelRotulo linha={vista.linha} nomesDosSelos={vista.nomesDosSelos} giro="-1deg" largo />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
```

Nota: o cartão do Hoje o dia pede da coluna fica **dentro** do `<nav aria-label="Linhas">` (é um atalho de navegação) e o teste o procura ali.

- [ ] **Step 4: O CSS do corpo**

```css title="src/app/estilos/catalogo.css"
/* A pagina do catalogo. Corpo: creme com grao, a coluna de linhas (fixa no
   desktop, fileira de pilulas no celular), os filtros, os grupos e o rotulo
   da linha. `overflow-x: clip` segura fita e etiqueta da ultima coluna. */
@layer components {
  .catalogo { overflow-x: clip; padding: 40px 0 110px; }
  .catalogo__corpo { display: grid; gap: 48px; align-items: start; }
  @media (min-width: 821px) {
    .catalogo__corpo:has(.catalogo__lado) { grid-template-columns: 260px minmax(0, 1fr); }
    .catalogo__lado { position: sticky; top: 96px; }
  }

  .catalogo__linhas ul { display: flex; flex-direction: column; gap: 4px; margin: 12px 0 0; padding: 0; list-style: none; }
  .catalogo__linha {
    display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 10px 14px; border-radius: 16px;
    color: var(--color-expresso); font-size: 16.5px; font-weight: 600; text-decoration: none;
    transition: background-color .25s ease, color .25s ease;
  }
  .catalogo__linha[aria-current="page"] { background: var(--color-expresso); color: var(--color-creme); }
  .catalogo__linha:not([aria-current="page"]):focus-visible { background: var(--color-linho); }
  .catalogo__forma { display: grid; place-items: center; flex: none; width: 22px; height: 24px; }
  .catalogo__forma::before { content: ""; box-sizing: border-box; border: 2.2px solid currentColor; }
  .catalogo__forma--pote::before { width: 15px; height: 21px; border-radius: 999px 999px 4px 4px; }
  .catalogo__forma--inteiro::before { width: 19px; height: 19px; border-radius: 50%; }
  .catalogo__forma--unidade::before { width: 18px; height: 18px; border-radius: 5px; }
  .catalogo__forma--neutra::before { width: 18px; height: 18px; border-radius: 3px; }
  .catalogo__forma--tudo::before { content: none; }
  .catalogo__forma svg { width: 20px; height: 20px; }
  .catalogo__linha-nome { flex: 1; }
  .catalogo__linha-conta { font-size: 13px; font-weight: 700; }

  .catalogo__hoje {
    display: block; margin-top: 28px; padding: 18px 20px; border-radius: 22px;
    background: var(--color-caramelo); color: var(--color-expresso); text-decoration: none;
    transition: box-shadow .25s ease;
  }
  .catalogo__hoje span { display: block; font-size: 13.5px; font-weight: 700; color: var(--color-chocolate); }
  .catalogo__hoje b { display: flex; align-items: center; gap: 8px; margin-top: 4px; font: 400 23px/1.1 var(--font-display); }
  .catalogo__seta { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .catalogo__hoje:focus-visible { box-shadow: 6px 6px 0 var(--color-cobre); }

  .catalogo__filtros {
    display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
    margin-bottom: 34px; padding-bottom: 22px; border-bottom: 1.5px dashed rgb(43 27 22 / .2);
  }
  .catalogo__filtro-rotulo { margin: 0 4px 0 0; font-size: 15px; font-weight: 700; color: var(--color-cobre-texto); }
  .catalogo__pilulas { display: flex; flex-wrap: wrap; gap: 8px; }
  .catalogo__mostrando { margin: 0 0 0 auto; font-size: 15px; color: var(--color-suave); }

  .catalogo__grupo + .catalogo__grupo { margin-top: 72px; }
  .catalogo__grupo-topo {
    display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 12px;
    margin-bottom: 26px;
  }
  .catalogo__grupo-topo h2 { margin: 0; font-size: 36px; line-height: 1.05; }
  .catalogo .grade { margin-top: 0; }

  .catalogo__rotulo-linha { display: grid; justify-items: center; gap: 18px; margin-top: 96px; }
  /* o h2 tem a letra do rotulo de secao, nao a do titulo */
  .catalogo__rotulo-linha .rotulo-secao { font-family: var(--font-sans); }
  .catalogo__rotulo-linha .papel-rotulo { width: 100%; max-width: 760px; }

  @media (hover: hover) {
    .catalogo__linha:not([aria-current="page"]):hover { background: var(--color-linho); }
    .catalogo__hoje:hover { box-shadow: 6px 6px 0 var(--color-cobre); }
  }

  @media (max-width: 820px) {
    .catalogo { padding-top: 22px; }
    .catalogo__corpo { gap: 18px; }
    .catalogo__lado { margin-inline: calc(-1 * var(--gutter)); }
    /* a coluna vira uma fileira de pilulas que rola de lado */
    .catalogo__rotulo { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .catalogo__linhas ul {
      flex-direction: row; gap: 8px; margin: 0; padding: 0 var(--gutter) 6px;
      overflow-x: auto; scrollbar-width: none;
    }
    .catalogo__linhas li { flex: none; }
    .catalogo__linha {
      min-height: 44px; padding: 9px 16px; border: 2px solid var(--color-expresso); border-radius: 999px;
      font-size: 15px; white-space: nowrap;
    }
    .catalogo__forma, .catalogo__hoje { display: none; }
    .catalogo__filtros { flex-direction: column; align-items: flex-start; }
    .catalogo__mostrando { margin: 4px 0 0; }
    .catalogo__grupo-topo h2 { font-size: 28px; }
  }
}
```

Em `src/app/globals.css`, acrescente antes de `@import "./estilos/movimento.css";`:

```css
@import "./estilos/catalogo.css";
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS e nenhum erro.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/CatalogoPagina.tsx src/app/estilos/catalogo.css src/app/globals.css tests/catalogo-pagina.test.tsx
git commit -m "feat: corpo do catalogo com linhas, filtros, grupos e o rotulo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW"
```

---

### Task 7: A home leva ao catálogo (vitrine e atalhos)

**Files:**
- Create: `src/components/sections/Vitrine.tsx`, `tests/vitrine.test.tsx`
- Modify: `src/lib/visao.ts` (`Visao` e `montarVisao`), `src/app/page.tsx`, `src/components/sections/Hero.tsx`, `src/components/sections/HojeODiaPede.tsx`, `src/components/sections/Final.tsx`, `src/components/layout/Footer.tsx`, `src/app/estilos/cardapio.css`
- Delete: `src/components/sections/Cardapio.tsx`, `src/components/FiltroProvider.tsx`, `tests/cardapio.test.tsx`, `tests/fixtures/sonda.tsx`
- Test: `tests/visao.test.ts`, `tests/hero.test.tsx`, `tests/hoje.test.tsx`, `tests/secoes.test.tsx`, `tests/layout.test.tsx`, `tests/providers.test.tsx`, `tests/pagina.test.tsx`, `tests/ssr.test.tsx`

**Interfaces:**
- Consumes: `montarVitrine`, `linhasComProduto`, `CAMINHO_CATALOGO`, `caminhoDaLinha`, `textoVerReceitas`, `OpcaoLinha` (Task 2).
- Produces:
  - `Visao` sem `produtos`, `filtrosLinha`, `filtrosSelo`; com `vitrine: Produto[]`, `linhasNaVitrine: OpcaoLinha[]` (vazio com uma linha), `total: number`.
  - `Vitrine({ produtos, linhas, total, tipos, nomesDosSelos })`.
  - `Footer({ linhas }: { linhas: readonly { slug: string; nome: string }[] })`, sem `'use client'`.
  - `Final({ linhas })`, sem `'use client'`.

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/vitrine.test.tsx"
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Vitrine } from '@/components/sections/Vitrine'
import { carregarCatalogo, type Catalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

function montar(catalogo: Catalogo) {
  const v = montarVisao(catalogo)
  return render(
    <Vitrine
      produtos={v.vitrine}
      linhas={v.linhasNaVitrine}
      total={v.total}
      tipos={v.tipos}
      nomesDosSelos={v.nomesDosSelos}
    />,
  )
}

const nomes = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('Vitrine com o cadastro de hoje', () => {
  it('o título de sempre e 4 cards: o destaque e os seguintes', async () => {
    montar(await carregarCatalogo())
    expect(screen.getByRole('heading', { level: 2, name: 'Escolha pelo sabor' })).toBeInTheDocument()
    expect(nomes()).toEqual(['Prestígio', 'Paçoca', 'Mousse de maracujá', 'Ninho com frutas vermelhas'])
  })

  it('dois caminhos para o catálogo, e nenhum atalho de linha', async () => {
    montar(await carregarCatalogo())
    expect(screen.getByRole('link', { name: 'Ver as 7 receitas' })).toHaveAttribute('href', '/catalogo')
    expect(screen.getByRole('link', { name: 'Ver o catálogo inteiro' })).toHaveAttribute('href', '/catalogo')
    expect(screen.queryByText('Direto para uma linha')).toBeNull()
  })

  it('sem filtro, sem região viva, sem estado vazio', async () => {
    const { container } = montar(await carregarCatalogo())
    expect(screen.queryByRole('group')).toBeNull()
    expect(container.querySelector('[aria-live]')).toBeNull()
    expect(screen.queryByText(/Nenhuma receita/)).toBeNull()
  })

  it('é a seção #cardapio, com o deslocamento da nav', async () => {
    const { container } = montar(await carregarCatalogo())
    expect(container.querySelector('section')).toHaveAttribute('id', 'cardapio')
    expect(container.querySelector('section')).toHaveClass('scroll-mt-24')
  })
})

describe('Vitrine com três linhas', () => {
  it('o destaque e um de cada outra linha', () => {
    montar(CATALOGO_MISTO)
    expect(nomes()).toEqual(['Prestígio', 'Cenoura com cacau', 'Torta de frango', 'Paçoca'])
  })

  it('um atalho por linha, com a contagem, para a página dela', () => {
    montar(CATALOGO_MISTO)
    const lista = screen.getByRole('list', { name: 'Direto para uma linha' })
    expect(
      within(lista).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]),
    ).toEqual([
      ['Bolos no pote 7', '/catalogo/bolos-no-pote'],
      ['Bolos inteiros 2', '/catalogo/bolos-inteiros'],
      ['Salgados 2', '/catalogo/salgados'],
    ])
    expect(screen.getByRole('link', { name: 'Ver as 11 receitas' })).toHaveAttribute('href', '/catalogo')
  })
})
```

Ajuste os testes que já existem:

`tests/visao.test.ts`
- troque o teste `'não mostra filtro que não filtraria nada'` por:

```ts
  it('a vitrine com 4, o total, e nenhum atalho de linha', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(slugs(v.vitrine)).toEqual(['prestigio', 'pacoca', 'mousse-de-maracuja', 'ninho-com-frutas-vermelhas'])
    expect(v.total).toBe(7)
    expect(v.linhasNaVitrine).toEqual([])
    expect(v.linhasNoFinal).toEqual([])
  })
```

- troque o teste `'volta o filtro de linha, com a contagem de cada uma'` por:

```ts
  it('os atalhos de linha da vitrine voltam, com a contagem de cada uma', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(v.linhasNaVitrine).toEqual([
      { slug: 'bolos-no-pote', nome: 'Bolos no pote', contagem: 7 },
      { slug: 'bolos-inteiros', nome: 'Bolos inteiros', contagem: 2 },
      { slug: 'salgados', nome: 'Salgados', contagem: 2 },
    ])
  })
```

- apague o teste `'só os selos que alguns têm e outros não'` (a regra mora em `montarCatalogo`, testada na Task 2);
- em `describe('filtrar')`, troque `const v = montarVisao(CATALOGO_MISTO)` por `const produtos = CATALOGO_MISTO.produtos` e cada `v.produtos` por `produtos`.

`tests/hero.test.tsx`
- `toHaveAttribute('href', '#cardapio')` → `toHaveAttribute('href', '/catalogo')`.

`tests/hoje.test.tsx`
- apague os imports de `FiltroProvider` e `Sonda`;
- troque o corpo de `montar` por `return render(<HojeODiaPede vontades={vontades} tipos={visao.tipos} />)`;
- `toHaveAttribute('href', '#cardapio')` → `toHaveAttribute('href', '/catalogo?vontade=chocolate')`;
- troque o teste `'"Ver as 3 no cardápio" aplica a vontade e limpa linha e selo'` por:

```tsx
  it('"Ver as 3 no cardápio" leva ao catálogo com a vontade escolhida', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('tab', { name: 'Fruta 3' }))
    expect(screen.getByRole('link', { name: 'Ver as 3 no cardápio' })).toHaveAttribute(
      'href',
      '/catalogo?vontade=fruta',
    )
  })
```

`tests/secoes.test.tsx`
- apague os imports de `FiltroProvider`, `Sonda` e, se ficar sem uso, `userEvent`;
- troque o `describe('Final', …)` inteiro por:

```tsx
describe('Final', () => {
  it('com uma linha só, só o título e o botão para o catálogo', () => {
    render(<Final linhas={real.linhasNoFinal} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Escolha o seu AMO.')
    expect(screen.getByRole('link', { name: 'Ver o cardápio' })).toHaveAttribute('href', '/catalogo')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('com várias linhas, uma pílula por linha para a página dela', () => {
    render(<Final linhas={misto.linhasNoFinal} />)
    expect(screen.getByRole('link', { name: 'Salgados' })).toHaveAttribute('href', '/catalogo/salgados')
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })
})
```

`tests/layout.test.tsx`
- apague os imports de `FiltroProvider` e `Sonda`;
- troque o `describe('Footer', …)` inteiro por:

```tsx
describe('Footer', () => {
  const montar = (linhas = [{ slug: 'bolos-no-pote', nome: 'Bolos no pote' }]) => render(<Footer linhas={linhas} />)

  it('é um landmark contentinfo', () => {
    montar()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('cada linha leva à sua página no catálogo', () => {
    montar([
      { slug: 'bolos-no-pote', nome: 'Bolos no pote' },
      { slug: 'salgados', nome: 'Salgados' },
    ])
    const lista = screen.getByRole('list', { name: 'Linhas' })
    expect(within(lista).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/catalogo/bolos-no-pote',
      '/catalogo/salgados',
    ])
  })

  it('a coluna A marca leva às seções da home, de qualquer página', () => {
    montar()
    const lista = screen.getByRole('list', { name: 'A marca' })
    expect(within(lista).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/#marca',
      '/#rotulos',
      '/#hoje',
    ])
  })

  it('usa placeholder de contato visivelmente falso e avisa que é provisório', () => {
    montar()
    expect(screen.getByText('(00) 00000-0000')).toBeInTheDocument()
    expect(screen.getByText(/contato provisório/i)).toBeInTheDocument()
  })

  it('o AMO do copyright está blindado contra tradutor', () => {
    montar()
    expect(screen.getByText('AMO')).toHaveAttribute('translate', 'no')
  })
})
```

`tests/providers.test.tsx`
- apague `import { FiltroProvider, useFiltro } from '@/components/FiltroProvider'`, `import { Sonda } from './fixtures/sonda'` e o `describe('FiltroProvider', …)` inteiro;
- apague `import userEvent from '@testing-library/user-event'` se ficar sem uso.

`tests/pagina.test.tsx`
- troque o teste `'os 7 produtos aparecem pelo nome do produto, sem nome poético'` por:

```tsx
  it('a vitrine mostra 4 produtos pelo nome do produto, sem nome poético', () => {
    const { container } = montar()
    const cardapio = container.querySelector('#cardapio') as HTMLElement
    expect(within(cardapio).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Prestígio',
      'Paçoca',
      'Mousse de maracujá',
      'Ninho com frutas vermelhas',
    ])
    expect(container.textContent).not.toMatch(/Aconchego|Raízes|Leveza|Encontro|Carinho|Intensamente|Energia/)
  })
```

- apague o import de `PRODUTOS` se ficar sem uso (o teste do preload ainda o usa: confira).

`tests/ssr.test.tsx`
- `it('a página inteira está no HTML: as 5 seções e os 7 cards'` → `it('a página inteira está no HTML: as 5 seções e os 4 cards da vitrine'`, e `toHaveLength(7)` desse teste → `toHaveLength(4)`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL em `vitrine` (componente não existe), `visao`, `hero`, `hoje`, `secoes`, `layout`, `pagina` e `ssr`.

- [ ] **Step 3: A visão da home**

Em `src/lib/visao.ts`, no tipo `Visao`, apague os campos `produtos`, `filtrosLinha` e `filtrosSelo` (com os comentários deles) e acrescente antes do fechamento do tipo:

```ts
  /** a vitrine da home (montarVitrine) */
  vitrine: Produto[]
  /** as linhas com a contagem, para os atalhos da vitrine; vazio com uma so */
  linhasNaVitrine: OpcaoLinha[]
  /** quantas receitas ha */
  total: number
```

Em `montarVisao`:
- troque o trecho que calcula `rotulos`, `filtrosLinha` e `filtrosSelo` por:

```ts
  const rotulos = linhasComProduto(c)
  const linhasNaVitrine =
    rotulos.length >= 2
      ? rotulos.map((l) => ({ slug: l.slug, nome: l.nome, contagem: contar((p) => p.linha === l.slug) }))
      : []
```

- no objeto devolvido, apague `produtos,`, `filtrosLinha,` e `filtrosSelo,`, e acrescente:

```ts
    vitrine: montarVitrine(c),
    linhasNaVitrine,
    total: produtos.length,
```

`linhasComProduto` e `montarVitrine` são declarados mais abaixo no arquivo como `function`/`export function`; `linhasComProduto` é `export function` (içada), então a chamada funciona. `montarVitrine` também é `export function`.

- [ ] **Step 4: A vitrine**

```tsx title="src/components/sections/Vitrine.tsx"
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { CardProduto } from '@/components/ui/CardProduto'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { PilulaLink } from '@/components/ui/Pilula'
import type { Produto } from '@/lib/catalogo'
import { CAMINHO_CATALOGO, caminhoDaLinha, textoVerReceitas, type OpcaoLinha } from '@/lib/visao'

type Props = {
  produtos: readonly Produto[]
  /** os atalhos de linha; vazio com uma linha so */
  linhas: readonly OpcaoLinha[]
  total: number
  tipos: Readonly<Record<string, string>>
  nomesDosSelos: Readonly<Record<string, string>>
}

/**
 * O cardapio da home virou vitrine: ate 4 receitas e o caminho para o
 * catalogo, onde mora o filtro. Sem filtro, sem FLIP, sem regiao viva.
 */
export function Vitrine({ produtos, linhas, total, tipos, nomesDosSelos }: Props) {
  return (
    <section id="cardapio" aria-labelledby="titulo-cardapio" className="cardapio grao scroll-mt-24">
      <div className="wrap">
        <div className="vitrine__topo">
          <div>
            <p className="rotulo-secao">O cardápio</p>
            <h2 id="titulo-cardapio" className="titulo-secao">
              Escolha pelo sabor
            </h2>
          </div>
          <LinkSublinhado href={CAMINHO_CATALOGO} traco={2}>
            {textoVerReceitas(total)}
          </LinkSublinhado>
        </div>

        <ul role="list" className="grade">
          {produtos.map((p) => (
            <li key={p.slug}>
              <CardProduto produto={p} tipo={tipos[p.linha] ?? ''} nomesDosSelos={nomesDosSelos} />
            </li>
          ))}
        </ul>

        <div className="vitrine__pe">
          {linhas.length > 0 ? (
            <>
              <p id="vitrine-linhas" className="vitrine__rotulo">
                Direto para uma linha
              </p>
              <ul aria-labelledby="vitrine-linhas" className="vitrine__linhas">
                {linhas.map((l) => (
                  <li key={l.slug}>
                    <PilulaLink href={caminhoDaLinha(l.slug)}>
                      {l.nome} <small>{l.contagem}</small>
                    </PilulaLink>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <BotaoRetro href={CAMINHO_CATALOGO} escuro className="vitrine__botao">
            Ver o catálogo inteiro
          </BotaoRetro>
        </div>
      </div>
    </section>
  )
}
```

```css title="src/app/estilos/cardapio.css"
/* A vitrine da home (o cardapio de antes), creme com grao. A grade e o
   estado vazio tambem servem ao catalogo. `overflow-x: clip` segura fita e
   etiqueta que saem da borda do card na ultima coluna, sem criar rolagem
   horizontal. */
@layer components {
  .cardapio { overflow-x: clip; padding: 80px 0 96px; }
  .vitrine__topo { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px 32px; }
  .vitrine__pe {
    display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
    margin-top: 64px; padding-top: 32px; border-top: 1.5px dashed rgb(43 27 22 / .2);
  }
  .vitrine__rotulo { margin: 0 6px 0 0; font-size: 15px; font-weight: 700; color: var(--color-cobre-texto); }
  .vitrine__linhas { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .vitrine__botao { margin-left: auto; }
  .grade {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 56px 26px;
    margin: 44px 0 0; padding: 0; list-style: none;
  }
  .cardapio__vazio { margin-top: 40px; font-size: 18px; color: var(--color-suave); }
  .cardapio__vazio button {
    padding: 0; border: 0; border-bottom: 2px solid var(--color-cobre); background: none;
    color: var(--color-cobre-texto); font: inherit; font-weight: 700; cursor: pointer;
  }
  @media (max-width: 520px) {
    .grade { grid-template-columns: 1fr 1fr; gap: 40px 14px; }
    .vitrine__botao { margin-left: 0; }
  }
}
```

- [ ] **Step 5: Os atalhos (hero, Hoje o dia pede, final, rodapé)**

`src/components/sections/Hero.tsx`
- acrescente `import { CAMINHO_CATALOGO } from '@/lib/visao'`;
- `<BotaoRetro href="#cardapio">Ver o cardápio</BotaoRetro>` → `<BotaoRetro href={CAMINHO_CATALOGO}>Ver o cardápio</BotaoRetro>`.

`src/components/sections/HojeODiaPede.tsx`
- apague `import { useFiltro } from '@/components/FiltroProvider'` e a linha `const { definir } = useFiltro()`;
- troque `import type { GrupoVontade } from '@/lib/visao'` por `import { CAMINHO_CATALOGO, type GrupoVontade } from '@/lib/visao'`;
- troque o `PilulaLink` do painel por:

```tsx
                  <PilulaLink href={`${CAMINHO_CATALOGO}?vontade=${grupo.slug}`}>
                    {textoVerNoCardapio(quantos)}
                  </PilulaLink>
```

```tsx title="src/components/sections/Final.tsx"
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { PilulaLink } from '@/components/ui/Pilula'
import { CAMINHO_CATALOGO, caminhoDaLinha } from '@/lib/visao'

type Props = {
  /** vazio quando ha uma linha so (montarVisao decide) */
  linhas: readonly { slug: string; nome: string }[]
}

/** O fecho, expresso: chamada final e, com varias linhas, um atalho para a
 *  pagina de cada uma no catalogo. */
export function Final({ linhas }: Props) {
  return (
    <section aria-labelledby="titulo-final" className="final superficie-escura">
      <div className="wrap">
        <h2 id="titulo-final">
          Escolha o seu <span translate="no">AMO</span>.
        </h2>
        <p>Cada receita tem a sua versão saudável.</p>
        {linhas.length > 0 ? (
          <div className="final__linhas">
            {linhas.map((l) => (
              <PilulaLink key={l.slug} href={caminhoDaLinha(l.slug)} variante="clara">
                {l.nome}
              </PilulaLink>
            ))}
          </div>
        ) : null}
        <BotaoRetro href={CAMINHO_CATALOGO} className="final__botao">
          Ver o cardápio
        </BotaoRetro>
      </div>
    </section>
  )
}
```

`src/components/layout/Footer.tsx`
- apague a primeira linha `'use client'` e o import de `useFiltro`;
- acrescente `import { caminhoDaLinha } from '@/lib/visao'`;
- no `ANCORAS`, troque `'#marca'`, `'#rotulos'` e `'#hoje'` por `'/#marca'`, `'/#rotulos'` e `'/#hoje'`;
- no tipo `Props`, apague `filtraLinha` e o comentário dele;
- troque a assinatura por `export function Footer({ linhas }: Props) {` e apague `const { definir } = useFiltro()`;
- troque o link de cada linha por:

```tsx
                  <a href={caminhoDaLinha(l.slug)} className="rodape-link">
                    <Coracao />
                    {l.nome}
                  </a>
```

- [ ] **Step 6: A home sem o filtro**

```tsx title="src/app/page.tsx"
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { AMarca } from '@/components/sections/AMarca'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { Final } from '@/components/sections/Final'
import { Hero } from '@/components/sections/Hero'
import { HojeODiaPede } from '@/components/sections/HojeODiaPede'
import { Rotulos } from '@/components/sections/Rotulos'
import { Vitrine } from '@/components/sections/Vitrine'
import { Camadas } from '@/components/ui/Camadas'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarGaveta, montarVisao } from '@/lib/visao'

/**
 * A home. Server Component: carrega o cadastro, decide uma vez o que
 * aparece (montarVisao) e entrega dados prontos para as secoes. O filtro
 * mora no catalogo; aqui a vitrine e os atalhos so levam ate ele.
 */
export default async function Home() {
  const catalogo = await carregarCatalogo()
  const visao = montarVisao(catalogo)
  return (
    <>
      <Nav gaveta={montarGaveta(catalogo)} />
      <main id="conteudo" className="scroll-mt-24">
        <Hero palco={visao.palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />
        <Camadas estrato="heroCardapio" />
        <Vitrine
          produtos={visao.vitrine}
          linhas={visao.linhasNaVitrine}
          total={visao.total}
          tipos={visao.tipos}
          nomesDosSelos={visao.nomesDosSelos}
        />
        <Camadas estrato="cardapioHoje" />
        <HojeODiaPede vontades={visao.vontades} tipos={visao.tipos} />
        <Camadas estrato="hojeRotulos" />
        <Rotulos linhas={visao.rotulos} nomesDosSelos={visao.nomesDosSelos} />
        <Camadas estrato="rotulosMarca" />
        <AMarca foto={visao.fotoDaMarca} />
        <FaixaCobre />
        <Final linhas={visao.linhasNoFinal} />
      </main>
      <Footer linhas={visao.rotulos} />
    </>
  )
}
```

- [ ] **Step 7: Tirar o que ficou sem uso**

```bash
git rm -q src/components/sections/Cardapio.tsx src/components/FiltroProvider.tsx tests/cardapio.test.tsx tests/fixtures/sonda.tsx
grep -rn "FiltroProvider\|useFiltro\|Sonda\|filtrosLinha\|filtrosSelo\|filtraLinha\|sections/Cardapio" src tests
```

Expected no grep: nenhuma ocorrência.

- [ ] **Step 8: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS e nenhum erro.

- [ ] **Step 9: Commit**

```bash
git add -A src tests
git commit -m "feat: o cardapio da home vira vitrine e os atalhos levam ao catalogo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW"
```

---

### Task 8: As rotas do catálogo (topo, tela, metadados)

**Files:**
- Create: `src/components/sections/TopoCatalogo.tsx`, `src/components/layout/TelaCatalogo.tsx`, `src/app/catalogo/page.tsx`, `src/app/catalogo/[linha]/page.tsx`, `tests/catalogo-rotas.test.tsx`
- Modify: `src/app/estilos/catalogo.css` (o topo), `tests/pagina.test.tsx` (o preload)

**Interfaces:**
- Consumes: `VistaCatalogo`, `DadosGaveta`, `montarCatalogo`, `montarGaveta`, `linhasComProduto`, `descricaoDaLinha`, `CAMINHO_CATALOGO`, `contarReceitas` (Task 2); `Nav` (Task 4); `CatalogoPagina` (Task 6); `Footer` (Task 7); `FaixaCobre`, `Camadas`, `SeloCarimbo`, `ComAmo`, `classeDoFormato` (existentes).
- Produces:
  - `TopoCatalogo({ vista }: { vista: VistaCatalogo })`
  - `TelaCatalogo({ vista, gaveta, linhas }: { vista: VistaCatalogo; gaveta: DadosGaveta; linhas: readonly Linha[] })`
  - rotas `/catalogo` e `/catalogo/[linha]` com `generateStaticParams`, `dynamicParams = false`, `generateMetadata`.

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/catalogo-rotas.test.tsx"
import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { axe } from 'vitest-axe'
import PaginaCatalogo, { metadata as metadataDoCatalogo } from '@/app/catalogo/page'
import PaginaLinha, { dynamicParams, generateMetadata, generateStaticParams } from '@/app/catalogo/[linha]/page'
import { TelaCatalogo } from '@/components/layout/TelaCatalogo'
import { linhasComProduto, montarCatalogo, montarGaveta } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const params = (linha: string) => ({ params: Promise.resolve({ linha }) })
const daLinha = await PaginaLinha(params('bolos-no-pote'))
const tudoMisto = (
  <TelaCatalogo
    vista={montarCatalogo(CATALOGO_MISTO, null)}
    gaveta={montarGaveta(CATALOGO_MISTO)}
    linhas={linhasComProduto(CATALOGO_MISTO)}
  />
)

describe('as rotas', () => {
  it('uma página por linha com produto, e nenhuma outra', async () => {
    expect(await generateStaticParams()).toEqual([{ linha: 'bolos-no-pote' }])
    expect(dynamicParams).toBe(false)
  })

  it('slug que não é linha dá 404', async () => {
    await expect(PaginaLinha(params('tortas'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it('título e descrição da página da linha', async () => {
    expect(await generateMetadata(params('bolos-no-pote'))).toEqual({
      title: 'Bolos no pote · Catálogo · AMO',
      description: 'Bolos no pote, zero açúcar. Um abraço em forma de sobremesa.',
    })
    expect(await generateMetadata(params('tortas'))).toEqual({})
    expect(metadataDoCatalogo.title).toBe('Catálogo · AMO')
  })

  it('com uma linha só, /catalogo é a página dela', async () => {
    render(await PaginaCatalogo())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bolos no pote')
  })
})

describe.each([
  ['a página de uma linha', daLinha],
  ['"Tudo" com três linhas', tudoMisto],
] as [string, ReactElement][])('%s', (_, pagina) => {
  const montar = () => render(pagina)

  it('tem exatamente um h1 e não pula nível de heading', () => {
    const { container } = montar()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const niveis = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]))
    for (let i = 1; i < niveis.length; i++) expect(niveis[i] - niveis[i - 1]).toBeLessThanOrEqual(1)
  })

  it('imagem sempre com alt, width e height', () => {
    const { container } = montar()
    for (const img of container.querySelectorAll('img')) {
      expect(img.hasAttribute('alt')).toBe(true)
      expect(img.hasAttribute('width')).toBe(true)
      expect(img.hasAttribute('height')).toBe(true)
    }
  })

  it('exatamente uma imagem sem lazy nem eager: a capa, pré-carregada', () => {
    const { container } = montar()
    const semLoading = [...container.querySelectorAll('img')].filter((img) => !img.hasAttribute('loading'))
    expect(semLoading).toHaveLength(1)
    expect(semLoading[0].closest('.topo-catalogo__capa')).toBeTruthy()
  })

  it('sem afordância morta, sem preço, sem reticências', () => {
    const { container } = montar()
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href')).toBeTruthy()
    for (const b of container.querySelectorAll('button')) expect(b.getAttribute('type')).toBe('button')
    expect(container.textContent).not.toMatch(/R\$\s?\d/)
    expect(container.textContent).not.toMatch(/\.\.\./)
  })

  it('ids únicos', () => {
    const { container } = montar()
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(ids.length - new Set(ids).size).toBe(0)
  })

  it('todo "AMO" de texto está dentro de translate="no"', () => {
    const { container } = montar()
    const caminhante = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let no: Node | null
    let vistos = 0
    while ((no = caminhante.nextNode())) {
      if (!/\bAMO\b/.test(no.textContent ?? '')) continue
      vistos++
      expect(no.parentElement?.getAttribute('translate'), no.parentElement?.outerHTML).toBe('no')
    }
    expect(vistos).toBeGreaterThan(0)
  })

  it('passa no axe', async () => {
    const { container } = montar()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('o topo', () => {
  it('numa linha: a trilha até ela, o nome, a frase, a contagem e o selo da regra', () => {
    render(daLinha)
    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(within(trilha).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
    expect(within(trilha).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalogo')
    expect(within(trilha).getByText('Bolos no pote')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bolos no pote')
    expect(screen.getByText('Um abraço em forma de sobremesa.')).toBeInTheDocument()
    expect(screen.getByText('7 receitas')).toHaveClass('topo-catalogo__conta')
    expect(document.querySelector('.topo-catalogo .selo-carimbo')).toHaveTextContent('Zero açúcar')
  })

  it('em "Tudo": a trilha para em Catálogo, três capas e nenhum selo', () => {
    render(tudoMisto)
    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(within(trilha).getByText('Catálogo')).toHaveAttribute('aria-current', 'page')
    expect(within(trilha).queryByRole('link', { name: 'Catálogo' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('O catálogo inteiro')
    expect(document.querySelectorAll('.topo-catalogo__capa')).toHaveLength(3)
    expect(document.querySelector('.topo-catalogo__capas')).toHaveAttribute('aria-hidden', 'true')
    expect(document.querySelector('.topo-catalogo .selo-carimbo')).toBeNull()
  })

  it('os links de sabor da gaveta acham o seu card nesta página', () => {
    const { container } = render(daLinha)
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="/catalogo/bolos-no-pote#"]')]
    expect(links).toHaveLength(7)
    for (const a of links) {
      const alvo = container.querySelector(`#${a.getAttribute('href')!.split('#')[1]}`)
      expect(alvo, a.href).toBeTruthy()
      expect(alvo!).toHaveClass('scroll-mt-24')
    }
  })
})

describe('o HTML do servidor da página da linha', () => {
  const html = renderToString(daLinha)
  const doc = new DOMParser().parseFromString(html, 'text/html')

  it('não esconde nada por estilo inline e não sai com a classe play', () => {
    for (const el of doc.querySelectorAll('[style]')) {
      const estilo = el.getAttribute('style') ?? ''
      expect(estilo, el.outerHTML.slice(0, 120)).not.toMatch(/(^|;)\s*opacity:\s*0(\.0+)?\s*(;|$)|visibility:\s*hidden|clip-path/)
      const transforma = /(^|;)\s*transform:\s*(?!none\s*(;|$))/.test(estilo)
      expect(transforma && !el.hasAttribute('data-parallax'), el.outerHTML.slice(0, 120)).toBe(false)
    }
    expect(doc.querySelectorAll('.play')).toHaveLength(0)
  })

  it('pré-carrega exatamente uma imagem: a capa', () => {
    const preloads = [...html.matchAll(/<link[^>]*rel="preload"[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => /as="image"/.test(tag))
    expect(preloads, preloads.join('\n')).toHaveLength(1)
    expect(preloads[0]).toContain('prestigio')
  })

  it('a página inteira está no HTML: os 7 cards e o rótulo da linha', () => {
    expect(doc.querySelectorAll('.catalogo article.card-produto')).toHaveLength(7)
    expect(doc.querySelector('.catalogo__rotulo-linha .papel-rotulo')).toBeTruthy()
  })
})
```

Em `tests/pagina.test.tsx`, no teste do preload, troque a expectativa sobre `comPreload` por:

```tsx
    expect(comPreload.map((a) => a.replace(/\\/g, '/')).sort()).toEqual([
      expect.stringMatching(/\/components\/sections\/Hero\.tsx$/),
      expect.stringMatching(/\/components\/sections\/TopoCatalogo\.tsx$/),
    ])
```

E o título dele: `'exatamente uma imagem tem preload: a do destaque no hero, no DOM e no código'` → `'exatamente uma imagem da home tem preload: a do destaque no hero; no código, só o hero e o topo do catálogo ligam'`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/catalogo-rotas.test.tsx tests/pagina.test.tsx`
Expected: FAIL, `Failed to resolve import "@/app/catalogo/page"`.

- [ ] **Step 3: O topo**

```tsx title="src/components/sections/TopoCatalogo.tsx"
import Image from 'next/image'
import { ComAmo } from '@/components/ui/ComAmo'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import { CAMINHO_CATALOGO, contarReceitas, type VistaCatalogo } from '@/lib/visao'

/**
 * O topo do catalogo, expresso: trilha, rotulo, o nome da linha (ou "O
 * catalogo inteiro"), a frase, a contagem e, a direita, a capa na moldura do
 * formato com o selo da regra. A primeira capa e a unica imagem da pagina
 * pre-carregada. No celular as capas somem; o sizes de 1px faz o navegador
 * baixar a menor versao delas.
 */
export function TopoCatalogo({ vista }: { vista: VistaCatalogo }) {
  const { linha, capas } = vista
  return (
    <div className="topo-catalogo superficie-escura">
      <div className="wrap topo-catalogo__grade">
        <div className="topo-catalogo__texto">
          <nav aria-label="Trilha">
            <ol className="trilha">
              <li>
                <a href="/">Início</a>
              </li>
              <li>{linha ? <a href={CAMINHO_CATALOGO}>Catálogo</a> : <span aria-current="page">Catálogo</span>}</li>
              {linha ? (
                <li>
                  <span aria-current="page">{linha.nome}</span>
                </li>
              ) : null}
            </ol>
          </nav>
          <p className="rotulo-secao">O catálogo</p>
          <h1 className="topo-catalogo__titulo">{vista.titulo}</h1>
          {vista.lead ? (
            <p className="topo-catalogo__lead">
              <ComAmo texto={vista.lead} />
            </p>
          ) : null}
          <p className="topo-catalogo__conta">{contarReceitas(vista.contagem)}</p>
        </div>

        <div
          className={`topo-catalogo__capas topo-catalogo__capas--${capas.length > 1 ? 'varias' : 'uma'}`}
          aria-hidden="true"
        >
          {capas.map((c, i) => (
            <div key={c.produto} className={`topo-catalogo__capa topo-catalogo__capa--${classeDoFormato(c.formato)}`}>
              {i === 0 ? (
                <Image
                  src={c.imagem.src}
                  alt=""
                  width={c.imagem.largura}
                  height={c.imagem.altura}
                  sizes="(max-width: 820px) 1px, 280px"
                  preload
                />
              ) : (
                <Image
                  src={c.imagem.src}
                  alt=""
                  width={c.imagem.largura}
                  height={c.imagem.altura}
                  loading="eager"
                  fetchPriority="low"
                  sizes="(max-width: 820px) 1px, 140px"
                />
              )}
            </div>
          ))}
        </div>

        {linha ? (
          <div className="topo-catalogo__selo">
            <SeloCarimbo texto={linha.regra} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
```

Acrescente ao fim de `src/app/estilos/catalogo.css`, **dentro** do `@layer components { … }` (antes da última chave):

```css
  /* o topo, expresso */
  .topo-catalogo { padding: 132px 0 44px; background: var(--color-expresso); color: var(--color-creme); }
  .topo-catalogo__grade { position: relative; display: grid; gap: 40px; align-items: end; }
  .trilha { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; font-size: 14.5px; color: var(--color-claro-suave); }
  /* a barra entre os itens e desenhada, nao texto: leitor de tela nao a le */
  .trilha li + li::before {
    content: ""; display: inline-block; width: 1.5px; height: 14px; margin-right: 8px;
    background: currentColor; transform: rotate(20deg); vertical-align: -2px;
  }
  .trilha a { color: inherit; text-underline-offset: 4px; }
  .trilha [aria-current="page"] { font-weight: 700; color: var(--color-creme); }
  .topo-catalogo .rotulo-secao { margin-top: 34px; }
  .topo-catalogo__titulo { margin: 10px 0 0; font-size: clamp(46px, 7vw, 92px); line-height: .98; }
  .topo-catalogo__lead { margin: 18px 0 0; max-width: 40ch; font-size: 19px; line-height: 1.6; color: var(--color-claro-suave); }
  .topo-catalogo__conta {
    display: inline-block; margin: 22px 0 0; padding: 8px 16px; border-radius: 999px;
    background: var(--color-caramelo); color: var(--color-expresso); font-size: 14px; font-weight: 700;
  }
  .topo-catalogo__capas { display: flex; align-items: flex-end; justify-content: center; gap: 16px; height: 330px; }
  .topo-catalogo__capa { overflow: hidden; background: var(--color-chocolate); }
  .topo-catalogo__capa img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .topo-catalogo__capa--pote { width: 220px; height: 330px; border-radius: 999px 999px 22px 22px; }
  .topo-catalogo__capa--inteiro { width: 280px; height: 280px; margin-bottom: 20px; border-radius: 50%; }
  .topo-catalogo__capa--unidade { width: 270px; height: 290px; border-radius: 28px; }
  .topo-catalogo__capa--neutra { width: 260px; height: 290px; border-radius: 16px; }
  /* em "Tudo", ate tres capas menores lado a lado */
  .topo-catalogo__capas--varias .topo-catalogo__capa--pote { width: 130px; height: 230px; }
  .topo-catalogo__capas--varias .topo-catalogo__capa--inteiro { width: 140px; height: 140px; margin-bottom: 30px; }
  .topo-catalogo__capas--varias .topo-catalogo__capa--unidade { width: 110px; height: 120px; border-radius: 22px; }
  .topo-catalogo__capas--varias .topo-catalogo__capa--neutra { width: 120px; height: 140px; }
  .topo-catalogo__selo { position: absolute; top: 0; right: 0; }
  @media (min-width: 821px) {
    .topo-catalogo__grade { grid-template-columns: minmax(0, 1fr) 380px; }
  }
  @media (max-width: 820px) {
    .topo-catalogo { padding: 112px 0 34px; }
    .topo-catalogo__capas { display: none; }
    /* o selo vai para o canto do titulo, e o titulo abre espaco para ele */
    .topo-catalogo__selo { top: 74px; }
    .topo-catalogo__grade:has(.topo-catalogo__selo) .topo-catalogo__titulo { padding-right: 96px; }
  }
```

- [ ] **Step 4: A tela e as rotas**

```tsx title="src/components/layout/TelaCatalogo.tsx"
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { CatalogoPagina } from '@/components/sections/CatalogoPagina'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { TopoCatalogo } from '@/components/sections/TopoCatalogo'
import { Camadas } from '@/components/ui/Camadas'
import type { Linha } from '@/lib/catalogo'
import type { DadosGaveta, VistaCatalogo } from '@/lib/visao'

type Props = {
  vista: VistaCatalogo
  gaveta: DadosGaveta
  /** as linhas com produto, para o rodape */
  linhas: readonly Linha[]
}

/** A pagina do catalogo montada: as duas rotas so carregam o cadastro e
 *  chamam esta tela. */
export function TelaCatalogo({ vista, gaveta, linhas }: Props) {
  return (
    <>
      <Nav gaveta={gaveta} linhaAtual={vista.linha?.slug ?? null} />
      <main id="conteudo" className="scroll-mt-24">
        <TopoCatalogo vista={vista} />
        <Camadas estrato="heroCardapio" />
        <CatalogoPagina vista={vista} />
        <FaixaCobre />
      </main>
      <Footer linhas={linhas} />
    </>
  )
}
```

```tsx title="src/app/catalogo/page.tsx"
import type { Metadata } from 'next'
import { TelaCatalogo } from '@/components/layout/TelaCatalogo'
import { carregarCatalogo } from '@/lib/catalogo'
import { linhasComProduto, montarCatalogo, montarGaveta } from '@/lib/visao'

export const metadata: Metadata = { title: 'Catálogo · AMO' }

/** "Tudo": todas as receitas, agrupadas por linha. Com uma linha so, a
 *  pagina dela (montarCatalogo decide). */
export default async function PaginaCatalogo() {
  const catalogo = await carregarCatalogo()
  return (
    <TelaCatalogo
      vista={montarCatalogo(catalogo, null)}
      gaveta={montarGaveta(catalogo)}
      linhas={linhasComProduto(catalogo)}
    />
  )
}
```

```tsx title="src/app/catalogo/[linha]/page.tsx"
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TelaCatalogo } from '@/components/layout/TelaCatalogo'
import { carregarCatalogo } from '@/lib/catalogo'
import { descricaoDaLinha, linhasComProduto, montarCatalogo, montarGaveta } from '@/lib/visao'

type Props = { params: Promise<{ linha: string }> }

/** So as linhas do cadastro existem; qualquer outro slug cai no 404. */
export const dynamicParams = false

/** Uma pagina estatica por linha com produto. */
export async function generateStaticParams() {
  return linhasComProduto(await carregarCatalogo()).map((l) => ({ linha: l.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { linha: slug } = await params
  const linha = linhasComProduto(await carregarCatalogo()).find((l) => l.slug === slug)
  if (!linha) return {}
  return { title: `${linha.nome} · Catálogo · AMO`, description: descricaoDaLinha(linha) }
}

export default async function PaginaLinha({ params }: Props) {
  const { linha } = await params
  const catalogo = await carregarCatalogo()
  if (!linhasComProduto(catalogo).some((l) => l.slug === linha)) notFound()
  return (
    <TelaCatalogo
      vista={montarCatalogo(catalogo, linha)}
      gaveta={montarGaveta(catalogo)}
      linhas={linhasComProduto(catalogo)}
    />
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS e nenhum erro.

Run: `npm run build`
Expected: build concluído; na tabela de rotas aparecem `/catalogo` e `/catalogo/[linha]` com `/catalogo/bolos-no-pote` gerada estática.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/TopoCatalogo.tsx src/components/layout/TelaCatalogo.tsx src/app/catalogo src/app/estilos/catalogo.css tests/catalogo-rotas.test.tsx tests/pagina.test.tsx
git commit -m "feat: as rotas do catalogo, com o topo, a capa e os metadados" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW"
```

---

### Task 9: Verificação final, visual e README

**Files:**
- Modify: `README.md`; o que a verificação apontar.

- [ ] **Step 1: Tudo verde**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: tudo passa; o build lista `/catalogo/bolos-no-pote` como estática.

- [ ] **Step 2: Subir a versão de produção**

Run (em segundo plano): `npx next start -p 3100`

- [ ] **Step 3: Capturas das páginas, com movimento reduzido**

`SCRATCH` é o diretório de rascunho da sessão.

```bash
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion --window-size=1440,9000 --screenshot="$SCRATCH/home-1440.png" http://localhost:3100/
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion --window-size=1440,3200 --screenshot="$SCRATCH/catalogo-1440.png" http://localhost:3100/catalogo/bolos-no-pote
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion --window-size=480,4200 --screenshot="$SCRATCH/catalogo-480.png" http://localhost:3100/catalogo/bolos-no-pote
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion --window-size=480,14000 --screenshot="$SCRATCH/home-480.png" http://localhost:3100/
```

- [ ] **Step 4: A gaveta aberta (precisa de clique)**

Salve em `$SCRATCH/capturar-gaveta.mjs` (fora do repositório; usa o WebSocket global do Node 22):

```js
// Uso: node capturar-gaveta.mjs <url> <largura> <altura> <saida.png>
// Abre o Edge headless pelo protocolo de depuracao, clica no botao
// Catalogo, espera a abertura e captura a janela.
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [url, largura, altura, saida] = process.argv.slice(2)
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const perfil = mkdtempSync(join(tmpdir(), 'edge-'))
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=9333',
  `--user-data-dir=${perfil}`, `--window-size=${largura},${altura}`, 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

let alvo
for (let i = 0; i < 50 && !alvo; i++) {
  await espera(200)
  try {
    alvo = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.type === 'page')
  } catch {}
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pendentes = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  pendentes.get(m.id)?.(m.result)
  pendentes.delete(m.id)
})
const cdp = (method, params = {}) =>
  new Promise((r) => {
    pendentes.set(++id, r)
    ws.send(JSON.stringify({ id, method, params }))
  })

await cdp('Page.enable')
await cdp('Page.navigate', { url })
await espera(2500)
await cdp('Runtime.evaluate', { expression: "document.querySelector('[aria-controls=gaveta]').click()" })
await espera(1200)
const { data } = await cdp('Page.captureScreenshot', { format: 'png' })
writeFileSync(saida, Buffer.from(data, 'base64'))
ws.close()
edge.kill()
```

Run:

```bash
node "$SCRATCH/capturar-gaveta.mjs" http://localhost:3100/ 1440 900 "$SCRATCH/gaveta-1440.png"
node "$SCRATCH/capturar-gaveta.mjs" http://localhost:3100/ 480 900 "$SCRATCH/gaveta-480.png"
```

- [ ] **Step 5: Conferir contra o canvas**

Abrir as capturas e comparar com as pranchetas do canvas (<https://claude.ai/artifact/QJTRTLJYeX2FnUUfMTpft9>), em especial "Hoje · gaveta com uma linha só", "Celular · gaveta aberta" e "Catálogo · desktop" com o tweak `estado: uma-linha`:
- nav com o botão Catálogo à esquerda do logo;
- gaveta creme com a borda ondulada cobre e caramelo, o cartão da linha, os 7 sabores e o cartão do Hoje o dia pede (desktop) ou o bloco "Na página inicial" (celular);
- topo expresso com trilha, h1, frase, contagem, capa em arco e selo;
- filtros de vontade, grade de 7, rótulo largo no fim;
- vitrine da home com 4 cards e o botão "Ver o catálogo inteiro";
- sem rolagem horizontal a 480.

Conferir também, num navegador de verdade com `npx next start -p 3100`, com movimento liberado:
- a abertura leve (painel desliza, borda assenta, itens sobem em sequência) e a saída;
- com a gaveta aberta a página de trás não rola;
- da home, "Hoje o dia pede" de dentro da gaveta fecha e rola até a seção;
- da home ao catálogo, a página abre no topo; do catálogo, `/#hoje` cai no Hoje o dia pede;
- um sabor da gaveta abre o catálogo já no card dele.

Anotar e corrigir o que divergir, com teste quando o defeito for de comportamento.

- [ ] **Step 6: README**

Em `README.md`, troque o primeiro parágrafo por:

```markdown
Home v2 da AMO, direção "Retrô doce", e o catálogo. Páginas institucionais
dirigidas por um cadastro (linhas, produtos, selos, vontades), sem carrinho,
sem preço e sem checkout; essas partes vêm em rodadas seguintes sobre
Supabase. A home tem uma vitrine e a gaveta do catálogo na nav; o catálogo
mora em `/catalogo` ("Tudo") e `/catalogo/<linha>`, uma página estática por
linha com produto. As especificações estão em
`docs/superpowers/specs/2026-10-05-amo-home-v2-retro-design.md` e
`docs/superpowers/specs/2026-10-06-amo-catalogo-design.md`; os planos, em
`docs/superpowers/plans/`.
```

- [ ] **Step 7: Rodar tudo de novo e commitar**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: tudo verde.

```bash
git add -A README.md src tests
git commit -m "docs: o catalogo no README e os ajustes da verificacao visual" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Soy4DSze8N6ARuQNYq32nW"
```
