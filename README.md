# AMO — Sabores Saudáveis

Home v1 da AMO, marca de bolos no pote zero açúcar. Página institucional —
visual completo, sem carrinho, sem preço e sem checkout; essas partes vêm em
rodadas seguintes sobre Supabase. O documento de especificação completo está
em `docs/superpowers/specs/2026-08-22-amo-home-design.md`.

## Stack

- **Next.js (App Router)** com TypeScript em modo `strict`
- **Tailwind CSS v4** — tokens de cor e tipografia como variáveis CSS
- **Motion** (ex-Framer Motion) — coreografia do hero, reveal ao rolar, nav
  sticky
- **next/font** — Bodoni Moda (display), Parisienne (script) e Jost (sans),
  self-hosted via Google Fonts, sem requisição a terceiros
- **next/image** — otimização das fotos dos 7 sabores
- **Vitest + Testing Library + jsdom** — testes, incluindo `axe` para
  acessibilidade

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Como testar

```bash
npm test          # vitest run — suíte completa
npm run test:watch
npm run lint       # eslint
npx tsc --noEmit   # checagem de tipos
npm run build      # build de produção; falha se algo não compilar
```
