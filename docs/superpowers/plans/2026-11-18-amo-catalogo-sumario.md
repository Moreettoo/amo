# Catálogo "O sumário" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O catálogo vira uma página só (`/catalogo`), em capítulos por categoria com as linhas dentro, com um sumário que acompanha a rolagem, sem o bloco "O rótulo da linha".

**Architecture:** O cadastro ganha `Categoria` acima de `Linha`. `montarCatalogo(c)` passa a devolver capítulos; funções puras decidem o sumário e a seção atual, e um componente cliente novo (`Sumario`) só mede a rolagem e desenha. A rota por linha sai e os links viram âncoras.

**Tech Stack:** Next.js 16 (App Router, páginas estáticas), React 19, Tailwind 4 com CSS em `src/app/estilos/`, Motion, Lenis, Vitest + Testing Library + jsdom + vitest-axe.

**Spec:** `docs/superpowers/specs/2026-11-18-amo-catalogo-sumario-design.md` (ler inteira antes de começar; `DESIGN.md` e `PRODUCT.md` valem junto).

## Global Constraints

- Ler o guia em `node_modules/next/dist/docs/` antes de tocar em rota ou metadados (`AGENTS.md`).
- Sem travessão nem meia-risca em `src/`, `tests/`, `scripts/` e README (`tests/travessao.test.ts`).
- Todo "AMO" de texto dentro de `translate="no"` (`ComAmo`).
- Movimento: só `transform`, `opacity`, `clip-path`, `stroke-dashoffset`; nada em loop; nada acima de 2 s; toda regra começa por `html.js` e mora em `prefers-reduced-motion: no-preference` (`tests/movimento.test.ts`).
- Efeito de mouse só em `@media (hover: hover)` e repetido em `:focus-visible`; alvos de toque de 44 px no celular.
- Cobre como texto sobre claro é `cobre-texto`; cantos de 2 a 4 px; fio de 1 px só onde segura algo; sem sombra em controles.
- A página nunca mostra categoria, linha ou selo sem produto. Nada de preço, contato ou texto inventado.
- Sem dependência nova.
- Antes de qualquer edição de UI, ler `C:\Users\enzom\.claude\skills\impeccable\reference\craft-floor.md`.
- Commit só com autorização do Enzo; a mensagem segue o padrão do repositório (`feat:`/`fix:` em português) e termina com `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.

## Review Focus

1. **Chegada com filtro e âncora juntos** (`/catalogo?vontade=fruta#salgados`, capítulo escondido): a página carrega sem erro, o filtro fica ligado e o sumário não marca seção que não existe. Teste na Task 4.
2. **Filtro que esvazia tudo:** nenhum capítulo no DOM; `secaoAtual` recebe lista vazia e devolve `null`; o sumário não quebra e "Ver todas" restaura. Testes nas Tasks 2 e 4.
3. **Linha com o mesmo nome da categoria** (categoria Salgados, linha Salgados): o nome não aparece duas vezes, o h3 continua existindo para leitor de tela e nenhum nível de título é pulado. Testes nas Tasks 2 e 3.
4. **Âncoras que colidem** (categoria `salgados` e produto `salgados`, ou produto chamado `linha-x`): o cadastro é recusado no build, com a mensagem dizendo quais. Teste na Task 1.
5. **Janela que cruza 821 px ou muda de altura com a página aberta:** o coração volta a medir o lugar do item atual; a fileira do celular não deixa a página rolar de lado a 320 px. Teste de remedida na Task 4; a largura entra na conferência visual da Task 5.

---

### Task 1: O cadastro ganha a categoria

**Files:**
- Modify: `src/lib/catalogo.ts`
- Create: `src/data/categorias.ts`
- Modify: `src/data/linhas.ts`, `tests/fixtures/catalogo-misto.ts`
- Test: `tests/catalogo.test.ts`

**Interfaces:**
- Produces: `type Categoria = { slug: string; nome: string; ordem: number }`; `Linha.categoria: string`; `Catalogo.categorias: Categoria[]`; `validarCatalogo` com três recusas novas; `CATEGORIAS` em `src/data/categorias.ts`; a fixture com `categorias` `doces` (ordem 1) e `salgados` (ordem 2), as linhas `bolos-no-pote` e `bolos-inteiros` em `doces` e `salgados` em `salgados`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/catalogo.test.ts`

```ts
it('entrega a categoria de hoje: Doces, com a linha do pote dentro', async () => {
  const c = await carregarCatalogo()
  expect(c.categorias.map((x) => x.slug)).toEqual(['doces'])
  expect(c.linhas.every((l) => l.categoria === 'doces')).toBe(true)
})
it('recusa slug de categoria repetido', () => {
  expect(validarCatalogo({ ...CATALOGO_MISTO, categorias: [...CATALOGO_MISTO.categorias, CATALOGO_MISTO.categorias[0]] }))
    .toContainEqual(expect.stringContaining('slug de categoria'))
})
it('recusa linha com categoria inexistente', () => {
  const linhas = CATALOGO_MISTO.linhas.map((l, i) => (i === 0 ? { ...l, categoria: 'nao-existe' } : l))
  expect(validarCatalogo({ ...CATALOGO_MISTO, linhas })).toContainEqual('linha bolos-no-pote: categoria inexistente nao-existe')
})
it('recusa duas âncoras iguais na página do catálogo', () => {
  const produtos = CATALOGO_MISTO.produtos.map((p, i) => (i === 0 ? { ...p, slug: 'salgados' } : p))
  expect(validarCatalogo({ ...CATALOGO_MISTO, produtos })).toContainEqual(expect.stringContaining('âncora repetida: salgados'))
})
```

Ajustar o teste existente "1 linha, 7 produtos, 7 selos, 5 vontades" para contar também 1 categoria.

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/catalogo.test.ts`. Esperado: FAIL (`categorias` não existe).

- [ ] **Step 3: Implementar.** Tipos e `carregarCatalogo` em `src/lib/catalogo.ts`; `CATEGORIAS = [{ slug: 'doces', nome: 'Doces', ordem: 1 }]`; `categoria: 'doces'` na linha do pote. Em `validarCatalogo`: `semRepetir('slug de categoria', ...)`, a mensagem `linha <slug>: categoria inexistente <categoria>`, e `semRepetir('âncora', [...slugs de categoria, ...linhas como 'linha-' + slug, ...slugs de produto])` (o formato de mensagem do `semRepetir` que já existe, que precisa conter `âncora repetida: <valor>`; se o texto atual for outro, ajustar o teste ao formato real e manter o valor).

- [ ] **Step 4: Rodar e ver passar.** `npx vitest run tests/catalogo.test.ts tests/visao.test.ts`. Esperado: PASS ("a fixture é um cadastro válido" incluso).

- [ ] **Step 5: Commit** (`feat: o cadastro ganha a categoria acima da linha`).

---

### Task 2: A visão em capítulos (funções puras)

**Files:**
- Modify: `src/lib/visao.ts`
- Create: `src/lib/sumario.ts`
- Test: `tests/visao.test.ts`, `tests/sumario.test.ts` (novo)

**Interfaces:**
- Consumes: Task 1.
- Produces, em `src/lib/visao.ts`:
  - `categoriasComProduto(c: Catalogo): Categoria[]`
  - `idDaLinha(slug: string): string` devolve `linha-<slug>`; o id da categoria e o do produto são o próprio slug
  - `caminhoDaCategoria(slug)` devolve `/catalogo#<slug>`; `caminhoDaLinha(slug)` devolve `/catalogo#linha-<slug>`
  - `type LinhaDoCapitulo = { slug: string; id: string; nome: string; regra: string; mostraNome: boolean; produtos: Produto[] }`
  - `type Capitulo = { slug: string; nome: string; linhas: LinhaDoCapitulo[] }`
  - `type VistaCatalogo = { titulo: string; lead: string; contagem: number; capitulos: Capitulo[]; temSumario: boolean; vontades: OpcaoVontade[]; selos: OpcaoSelo[]; tipos: Record<string, string>; nomesDosSelos: Record<string, string> }`
  - `montarCatalogo(c: Catalogo): VistaCatalogo`
  - Saem: `descricaoDaLinha`, `TITULO_TUDO`, `LEAD_TUDO`, `ItemDeLinha`, `GrupoDoCatalogo`, `Capa` do catálogo (a `Capa` da gaveta fica).
- Produces, em `src/lib/sumario.ts` (sem import de valor do cadastro):
  - `type ItemDoSumario = { id: string; nome: string; contagem: number; linhas: { id: string; nome: string; contagem: number }[] }`
  - `montarSumario(capitulos: readonly Capitulo[], visivel: (p: Produto) => boolean): ItemDoSumario[]`
  - `secaoAtual(topos: readonly { id: string; topo: number }[], linha: number): string | null`
  - `FRACAO_DA_LINHA = 0.35`

Regras que os testes fixam: `titulo` é `'O catálogo inteiro'`; `lead` é `'Cada linha com a sua regra no rótulo.'` com uma categoria e `'Doces e salgados. Cada linha com a sua regra no rótulo.'` com a fixture (primeiro nome como está, os outros em minúscula, juntados por `listarNomes` de `src/lib/vontade.ts`); `mostraNome` é falso quando o nome da linha é igual ao da categoria; `temSumario` é verdadeiro com 2 ou mais categorias com produto ou com 2 ou mais linhas com produto; `montarSumario` não lista a linha com `mostraNome` falso e conta só os produtos em que `visivel` é verdadeiro; `secaoAtual` devolve o último id com `topo <= linha`, o primeiro quando nenhum passou e `null` com lista vazia.

- [ ] **Step 1: Escrever os testes que falham.** Em `tests/visao.test.ts`, trocar o `describe('montarCatalogo')` e o de caminhos:

```ts
it('hoje: um capítulo (Doces) com a linha do pote, sem sumário', async () => {
  const v = montarCatalogo(await carregarCatalogo())
  expect(v.titulo).toBe('O catálogo inteiro')
  expect(v.lead).toBe('Cada linha com a sua regra no rótulo.')
  expect(v.contagem).toBe(7)
  expect(v.capitulos.map((c) => c.slug)).toEqual(['doces'])
  expect(v.capitulos[0].linhas[0]).toMatchObject({ slug: 'bolos-no-pote', id: 'linha-bolos-no-pote', regra: 'Zero açúcar', mostraNome: true })
  expect(v.capitulos[0].linhas[0].produtos).toHaveLength(7)
  expect(v.temSumario).toBe(false)
})
it('fixture: dois capítulos, três linhas, e a linha com o nome da categoria não repete o nome', () => {
  const v = montarCatalogo(CATALOGO_MISTO)
  expect(v.lead).toBe('Doces e salgados. Cada linha com a sua regra no rótulo.')
  expect(v.capitulos.map((c) => [c.slug, c.linhas.map((l) => l.slug)])).toEqual([
    ['doces', ['bolos-no-pote', 'bolos-inteiros']],
    ['salgados', ['salgados']],
  ])
  expect(v.capitulos[1].linhas[0].mostraNome).toBe(false)
  expect(v.temSumario).toBe(true)
})
it('os endereços: tudo é âncora de /catalogo', () => {
  expect(caminhoDaCategoria('doces')).toBe('/catalogo#doces')
  expect(caminhoDaLinha('bolos-no-pote')).toBe('/catalogo#linha-bolos-no-pote')
})
```

Manter os testes de vontades e selos da vista (agora sobre o catálogo inteiro) e remover os de linha única, capas, `descricaoDaLinha` e slug sem página. Em `tests/sumario.test.ts`:

```ts
const v = montarCatalogo(CATALOGO_MISTO)
it('sem filtro: categorias com contagem e as linhas dentro, menos a que repete o nome', () => {
  expect(montarSumario(v.capitulos, () => true)).toEqual([
    { id: 'doces', nome: 'Doces', contagem: 9, linhas: [
      { id: 'linha-bolos-no-pote', nome: 'Bolos no pote', contagem: 7 },
      { id: 'linha-bolos-inteiros', nome: 'Bolos inteiros', contagem: 2 },
    ] },
    { id: 'salgados', nome: 'Salgados', contagem: 2, linhas: [] },
  ])
})
it('com filtro: a contagem é a do que está na tela, e o item zerado continua na lista', () => {
  const s = montarSumario(v.capitulos, (p) => p.vontades.includes('fruta'))
  expect(s.map((i) => [i.id, i.contagem])).toEqual([['doces', 4], ['salgados', 0]])
})
it('secaoAtual: o último que passou da linha; antes disso o primeiro; vazio dá null', () => {
  const topos = [{ id: 'a', topo: 400 }, { id: 'b', topo: 900 }, { id: 'c', topo: 1500 }]
  expect(secaoAtual(topos, 315)).toBe('a')
  expect(secaoAtual(topos, 950)).toBe('b')
  expect(secaoAtual(topos, 5000)).toBe('c')
  expect(secaoAtual([], 315)).toBeNull()
})
```

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/visao.test.ts tests/sumario.test.ts`.
- [ ] **Step 3: Implementar** as assinaturas acima. `visao.ts` continua sem import de valor do cadastro (`listarNomes` é função pura de `vontade.ts`).
- [ ] **Step 4: Rodar e ver passar** os dois arquivos. O `tsc` e os testes de página ficam vermelhos até a Task 3 (quem consome a vista antiga); é esperado.
- [ ] **Step 5: Commit** junto com a Task 3 (um commit só, para o repositório nunca ficar sem compilar).

---

### Task 3: A página em capítulos, numa rota só

**Files:**
- Delete: `src/app/catalogo/[linha]/page.tsx`
- Modify: `src/app/catalogo/page.tsx`, `src/components/layout/TelaCatalogo.tsx`, `src/components/sections/TopoCatalogo.tsx`, `src/components/sections/CatalogoPagina.tsx`, `src/components/ui/CardProduto.tsx`, `src/components/ui/GradeProdutos.tsx`, `src/components/layout/Nav.tsx`, `src/components/layout/Gaveta.tsx`, `src/app/estilos/catalogo.css`, `src/app/estilos/movimento.css`
- Test: `tests/catalogo-rotas.test.tsx`, `tests/catalogo-pagina.test.tsx`, `tests/produto.test.tsx`, `tests/gaveta.test.tsx`, `tests/gaveta-sabor.test.tsx`, `tests/estilos.test.ts`, e qualquer teste que ainda cite `/catalogo/` com barra depois (procurar com `rg "/catalogo/" tests`)

**Interfaces:**
- Consumes: `montarCatalogo(c)`, `VistaCatalogo`, `Capitulo`, `idDaLinha`, `caminhoDaLinha`, `caminhoDaCategoria` (Task 2).
- Produces: `CardProduto` com a prop `nivel?: 3 | 4` (padrão 3); `GradeProdutos` com `nivel` repassada e `precarregar?: string` (slug do card cuja foto leva `preload` no lugar de `loading="lazy"`); `Nav` e `Gaveta` sem `linhaAtual`; em `CatalogoPagina`, cada categoria é `<section id={c.slug}>` e cada linha `<section id={linha.id}>`, as duas com `scroll-mt-24`; a classe `topo-catalogo--claro`; um ponto de montagem para o sumário (Task 4): quando `vista.temSumario`, o corpo é uma grade de duas colunas com a coluna do sumário antes da das receitas.

- [ ] **Step 0: Registrar o contrato de direção** da superfície, como o Impeccable pede antes de código: escrever o corpo (THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, FORM com `seed:f0b499d7dfe2a2b3`, FINISH) num arquivo no scratchpad e rodar `impeccable surface-brief write src/app/catalogo/page.tsx <arquivo> src/components/sections/CatalogoPagina.tsx`. Ler `craft-floor.md`.

- [ ] **Step 1: Reescrever os testes de rota e de página** para o desenho novo. As asserções que precisam existir:

```ts
// tests/catalogo-rotas.test.tsx (cadastro real)
it('a rota por linha não existe mais', () => {
  expect(existsSync('src/app/catalogo/[linha]')).toBe(false)
})
it('o topo: trilha até Catálogo, h1 em duas vozes, sem capa e sem superfície escura', () => {
  expect(screen.getByRole('navigation', { name: 'Trilha' })).toHaveTextContent(/^InícioCatálogo$/)
  const h1 = screen.getByRole('heading', { level: 1 })
  expect(h1).toHaveTextContent('O catálogo inteiro')
  expect(h1.querySelector('em')).toHaveTextContent('inteiro')
  expect(h1.closest('.superficie-escura')).toBeNull()
  expect(container.querySelector('.topo-catalogo__capas')).toBeNull()
})
it('exatamente uma imagem pré-carregada: a primeira foto da primeira grade', () => { /* a do Prestígio */ })
it('títulos em ordem: h1, h2 Doces, h3 Bolos no pote, h4 nos 7 cards', () => { /* níveis 1,2,3,4...; nenhum pulo */ })
it('o rótulo da linha saiu do catálogo', () => {
  expect(screen.queryByRole('heading', { name: /O rótulo da linha/ })).toBeNull()
})

// tests/catalogo-pagina.test.tsx
it('hoje: um capítulo, sem sumário, 7 cards alvo de âncora', () => {
  expect(document.getElementById('doces')).not.toBeNull()
  expect(document.getElementById('linha-bolos-no-pote')).toHaveTextContent('Zero açúcar')
  expect(document.getElementById('linha-bolos-no-pote')).toHaveTextContent('7 receitas')
  expect(screen.queryByRole('navigation', { name: 'Sumário' })).toBeNull()
})
it('fixture: dois capítulos e três linhas; na linha Salgados o h3 existe só para leitor de tela', () => {
  expect(within(document.getElementById('salgados')!).getAllByRole('heading', { name: 'Salgados' })).toHaveLength(2)
  expect(within(document.getElementById('linha-salgados')!).getByRole('heading', { level: 3 })).toHaveClass('sr-only')
})
it('fixture: a linha e o capítulo que o filtro esvazia somem', async () => { /* vontade Fruta: #salgados e #linha-salgados fora do DOM */ })
```

Os testes de filtro, de `?vontade=`, de estado vazio, de "Ver todas", das invariantes (alt e dimensões, sem preço, sem reticências, ids únicos, AMO, axe) e o do HTML do servidor continuam, apontados para `/catalogo`. Em `tests/produto.test.tsx`: `nivel={4}` rende h4 e o padrão continua h3. Em `tests/gaveta*.test.tsx`: os links de linha são `/catalogo#linha-<slug>`, os de sabor `/catalogo#<slug>`, e não há `aria-current` de linha. Em `tests/estilos.test.ts`: sai o teste das capas; o topo claro não usa `--color-cobre` como texto.

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/catalogo-rotas.test.tsx tests/catalogo-pagina.test.tsx tests/produto.test.tsx tests/gaveta.test.tsx`.

- [ ] **Step 3: Implementar.**
  - `page.tsx`: `montarCatalogo(catalogo)`; `metadata` com o título `'Catálogo · AMO'` e a descrição igual ao `lead` da vista (via `generateMetadata`, conferindo a forma no guia do Next).
  - `TopoCatalogo`: `topo-catalogo topo-catalogo--claro`, trilha de dois itens, h1 por `duasVozes`, o lead à direita pela base do título (embaixo no celular). Saem capas, selo da regra e contagem. A página 404 (`not-found.tsx`) e as regras de que ela depende não mudam.
  - `CatalogoPagina`: filtros primeiro, em largura inteira; depois o corpo com os capítulos da §6.5 da spec (h2 da categoria; topo da linha com h3, regra com o coração e `contarReceitas(visíveis)`; na mesma linha do h2 a partir de 821 px quando a categoria tem uma linha só). Sai a coluna de linhas e o bloco do rótulo. O link "Hoje o dia pede" fica no fim do corpo no celular e na coluna do sumário no desktop (quando não há sumário, no fim do corpo nas duas larguras). O `flushSync` do sabor escondido continua como está.
  - `catalogo.css`: `topo-catalogo--claro` (fundo creme, script em `cobre-texto`, lead e trilha em `suave`, item atual da trilha em expresso); os capítulos; a grade com mínimo de 190 px quando há sumário e 230 px sem; saem as regras das capas, de `.catalogo__lado`/`.catalogo__linha*`, `.catalogo__grupo-topo` e `.catalogo__rotulo-linha`. `movimento.css`: saem as três regras de `.topo-catalogo__capa`; o h2 do capítulo "aparece" ao entrar na tela, pelo mecanismo que as seções da home já usam (`useNaTela`).
  - `Nav`/`Gaveta`/`TelaCatalogo`: sem `linhaAtual`; sabor da gaveta em `${CAMINHO_CATALOGO}#${s.slug}`.

- [ ] **Step 4: Rodar tudo.** `npm test`, `npx tsc --noEmit`, `npm run lint`. Esperado: tudo verde.

- [ ] **Step 5: Conferir no navegador** (Edge headless, como em `.impeccable/review/`): `/catalogo` a 1440 e a 390 px. Corrigir o que a imagem mostrar antes de seguir.

- [ ] **Step 6: Commit** das Tasks 2 e 3 (`feat: o catalogo vira uma pagina so, em capitulos por categoria`).

---

### Task 4: O sumário

**Files:**
- Create: `src/components/sections/Sumario.tsx`, `src/components/ui/useSecaoAtual.ts`
- Modify: `src/components/sections/CatalogoPagina.tsx`, `src/app/estilos/catalogo.css`, `src/app/estilos/movimento.css`
- Test: `tests/sumario-pagina.test.tsx` (novo), `tests/gaveta-sabor.test.tsx`, `tests/movimento.test.ts` e `tests/estilos.test.ts` (se as regras novas pedirem entrada nas listas deles)

**Interfaces:**
- Consumes: `montarSumario`, `secaoAtual`, `FRACAO_DA_LINHA`, `ItemDoSumario` (Task 2); as seções com id (Task 3).
- Produces:
  - `useSecaoAtual(ids: readonly string[]): string | null`: mede `getBoundingClientRect().top` de cada id presente no DOM a cada rolagem e a cada redimensionamento (um quadro por vez) e devolve `secaoAtual(topos, innerHeight * FRACAO_DA_LINHA)`.
  - `<Sumario itens={ItemDoSumario[]} />`: `<nav aria-label="Sumário">`, a lista de categorias com as linhas dentro, o coração (`aria-hidden`, `so-js`) e, embaixo, o link do "Hoje o dia pede". A mesma marcação serve às duas larguras; a fileira do celular é CSS.

Comportamento que os testes fixam: o par atual é a categoria e a linha; `aria-current="location"` fica no link mais fundo do par; a categoria atual recebe a classe `sumario__item--atual`; item com `contagem` 0 leva a classe `sumario__item--vazio` e continua link; clicar num link da própria página cujo alvo o filtro escondeu (produto, linha ou categoria) limpa vontade e selo antes da rolagem.

- [ ] **Step 1: Escrever os testes que falham** em `tests/sumario-pagina.test.tsx` (fixture; `getBoundingClientRect` simulado por id; `fireEvent.scroll(window)`):

```ts
it('só aparece quando há o que escolher', () => { /* real: sem nav "Sumário"; fixture: com */ })
it('lista categorias com contagem e as linhas dentro; Salgados sem linha repetida', () => {
  const nav = screen.getByRole('navigation', { name: 'Sumário' })
  expect(within(nav).getAllByRole('link').slice(0, 4).map((a) => a.getAttribute('href')))
    .toEqual(['#doces', '#linha-bolos-no-pote', '#linha-bolos-inteiros', '#salgados'])
})
it('no topo da página o atual é o primeiro; ao rolar, o par acompanha', () => {
  // topos: doces 400, linha-bolos-no-pote 420, linha-bolos-inteiros 1600, salgados 2400; janela de 900
  expect(atual()).toBe('#linha-bolos-no-pote')
  rolarAte(1500) // linha-bolos-inteiros passa de 315
  expect(atual()).toBe('#linha-bolos-inteiros')
  rolarAte(2300)
  expect(atual()).toBe('#salgados')
  expect(screen.getByRole('link', { name: /Salgados/ }).closest('li')).toHaveClass('sumario__item--atual')
})
it('redimensionar a janela mede de novo', () => { /* muda innerHeight e os topos, dispara resize, o atual muda */ })
it('com filtro, a contagem muda e o item zerado continua link', async () => {
  await user.click(screen.getByRole('button', { name: /Fruta/ }))
  const salgados = within(nav).getByRole('link', { name: /Salgados/ })
  expect(salgados).toHaveTextContent('0')
  expect(salgados.closest('li')).toHaveClass('sumario__item--vazio')
})
it('tocar no item zerado limpa o filtro e o capítulo volta', async () => {
  await user.click(screen.getByRole('button', { name: /Fruta/ }))
  await user.click(within(nav).getByRole('link', { name: /Salgados/ }))
  expect(document.getElementById('salgados')).not.toBeNull()
  expect(screen.getByRole('button', { name: /Fruta/ })).toHaveAttribute('aria-pressed', 'false')
})
it('filtro que esvazia tudo: o sumário segue de pé e nada fica como atual', async () => { /* vontade + selo sem interseção */ })
it('chegar com ?vontade=fruta#salgados não quebra: filtro ligado, capítulo fora, sem atual inexistente', () => {})
it('passa no axe', async () => {})
```

Em `tests/gaveta-sabor.test.tsx`: um caso novo com a fixture, em que o link de linha da gaveta (`/catalogo#linha-salgados`) limpa o filtro que escondia a linha.

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run tests/sumario-pagina.test.tsx tests/gaveta-sabor.test.tsx`.

- [ ] **Step 3: Implementar.**
  - `useSecaoAtual` com `useSyncExternalStore` ou efeito com `requestAnimationFrame`, à escolha; sem JavaScript ou antes de montar, `null`.
  - `Sumario`: os links usam `#id` (mesma página; o `RolagemSuave` já conduz). O coração é um elemento só, posicionado em `translateY` na altura do link atual (medida num efeito, refeita quando o atual ou o tamanho da lista muda).
  - `CatalogoPagina`: `montarSumario(vista.capitulos, visivel)` com o filtro em vigor; o ouvinte de captura que hoje limpa o filtro para o sabor escondido passa a valer para qualquer id escondido (slugs de produto, ids de linha e de categoria sem resultado).
  - CSS, a partir de 821 px: coluna de 208 px, `position: sticky; top: 96px`, o fio de 1 px na borda esquerda da lista, o coração sobre o fio, a categoria atual com peso 500, as linhas recuadas em `suave`, a contagem em números tabulares. Abaixo de 821 px: fileira presa a 64 px do topo, fundo creme, de fora a fora, rolando de lado sem barra; uma etiqueta de 44 px por categoria (por linha, quando há uma categoria só), a atual em expresso cheio; as linhas de dentro e o coração não aparecem; a fileira rola até a etiqueta atual (`scrollTo`, `smooth` só sem movimento reduzido).
  - `movimento.css`: o coração desliza em 0.5 s com `var(--ease-amo)`, atrás de `html.js` e de `prefers-reduced-motion: no-preference`.

- [ ] **Step 4: Rodar tudo.** `npm test`, `npx tsc --noEmit`, `npm run lint`. Esperado: verde.

- [ ] **Step 5: Commit** (`feat: o sumario acompanha a rolagem do catalogo`).

---

### Task 5: Conferência, acabamento e documentos

**Files:**
- Temporário, fora do commit: para ver a fixture no navegador, trocar o retorno de `carregarCatalogo` pela `CATALOGO_MISTO`, capturar e desfazer (`git diff` limpo em `src/lib/catalogo.ts` antes de seguir)
- Modify: `PRODUCT.md` (contexto de operação), `DESIGN.md` e `.impeccable/design.json` (pelo documentador), `README.md` se citar a rota por linha
- Test: a suíte inteira

- [ ] **Step 1: Build.** `npm run build`. Esperado: `/catalogo` estática e nenhuma rota `/catalogo/[linha]`.
- [ ] **Step 2: Capturas** em `.impeccable/review/`, com o cadastro real e com a fixture, a 1440, 390 e 320 px: topo da página, meio da rolagem (o coração no capítulo certo), filtro ligado, filtro que esvazia um capítulo, e a fileira do celular presa. Entradas de movimento assentadas antes de capturar. Comparar a primeira tela a 1440 px com `.impeccable/mocks/decision/cat-sumario.html`. Conferir à mão: nenhuma rolagem horizontal de 320 a 2560 px; teclado alcança sumário, filtros e links; com `prefers-reduced-motion` e sem JavaScript a página segue inteira.
- [ ] **Step 3: Corrigir** em um lote o que as capturas mostrarem e capturar de novo (no máximo duas rodadas).
- [ ] **Step 4: Detector.** `impeccable detect --json` nos arquivos alterados de `src/`; corrigir o que for mecânico.
- [ ] **Step 5: Revisão de acabamento.** Chamar o `impeccable-finish-reviewer` com o pedido original, a spec, o contrato de direção, as capturas, o esboço escolhido como referência de crítica e o caminho do `craft-floor.md`; aplicar o veredito.
- [ ] **Step 6: Documentos.** Atualizar em `PRODUCT.md` o contexto de operação (o catálogo é `/catalogo`, em categorias; categorias cadastradas hoje). Chamar o `impeccable-documenter` para o `DESIGN.md`: o topo do catálogo passa a creme, entra o componente Sumário, e a regra dos três chãos é corrigida.
- [ ] **Step 7: Suíte inteira.** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Esperado: verde.
- [ ] **Step 8: Commit** (`docs: o catalogo em capitulos no PRODUCT e no DESIGN`).
