# AMO, Sabores Saudáveis

Home v2 da AMO, direção "Retrô doce", e o catálogo. Páginas institucionais
dirigidas por um cadastro (linhas, produtos, selos, vontades), sem carrinho,
sem preço e sem checkout; essas partes vêm em rodadas seguintes sobre
Supabase. A home tem uma vitrine e a gaveta do catálogo na nav; o catálogo
mora em `/catalogo` ("Tudo") e `/catalogo/<linha>`, uma página estática por
linha com produto. As especificações estão em
`docs/superpowers/specs/2026-10-05-amo-home-v2-retro-design.md` e
`docs/superpowers/specs/2026-10-06-amo-catalogo-design.md`; os planos, em
`docs/superpowers/plans/`.

## Stack

- **Next.js (App Router)** com TypeScript em modo `strict`
- **Tailwind CSS v4**, tokens de cor e tipografia como variáveis CSS
- **Motion** (ex-Framer Motion), só o FLIP da grade do catálogo, o parallax
  das fotos e o progresso da rolagem do Hoje o dia pede (`useScroll` e
  `useMotionValueEvent`, que trocam a vontade); as entradas e a gaveta são
  CSS, atrás da classe `html.js`
- **Lenis**, a rolagem interpolada. É a mesma biblioteca que a referência de
  animação do projeto usa, e é conduzida por `src/components/RolagemSuave.tsx`,
  que também trata as âncoras (o Lenis move o scrollTop real, então `sticky` e
  `getBoundingClientRect` seguem funcionando)
- **next/font**, Caprasimo (display) e DM Sans (texto, com o eixo `opsz`),
  self-hosted via Google Fonts, sem requisição a terceiros
- **next/image**, as fotos dos produtos em `public/produtos`
- **Vitest + Testing Library + jsdom**, testes, incluindo `axe` para
  acessibilidade

O cadastro mora em `src/data/` e passa por `carregarCatalogo()`
(`src/lib/catalogo.ts`), que valida e derruba o build se algo estiver errado.
Para trocar pelo Supabase, troca só essa função.

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Como testar

```bash
npm test          # vitest run, suíte completa
npm run test:watch
npm run lint       # eslint
npx tsc --noEmit   # checagem de tipos
npm run build      # build de produção; falha se algo não compilar
```
