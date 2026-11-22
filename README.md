# AMO, Sabores Saudáveis

Home v2 da AMO, direção "Retrô doce", e o catálogo. Páginas institucionais
dirigidas por um cadastro (linhas, produtos, selos, vontades), com a sacola,
Minha conta e o fechamento do pedido sobre o Supabase e o pagamento pelo
Mercado Pago (etapas 1 a 3, `docs/superpowers/specs/2026-11-18-amo-backend-design.md`). A home tem uma vitrine e a gaveta do catálogo na nav; o catálogo
mora em `/catalogo`, uma página estática só, em capítulos por categoria com
as linhas dentro (categoria, linha e produto são âncoras dela). As
especificações estão em
`docs/superpowers/specs/2026-10-05-amo-home-v2-retro-design.md`,
`docs/superpowers/specs/2026-10-06-amo-catalogo-design.md` e
`docs/superpowers/specs/2026-11-18-amo-catalogo-sumario-design.md` (esta
substitui a página do catálogo da anterior); os planos, em
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

O catálogo vem do Supabase por `carregarCatalogo()` (`src/lib/dados/catalogo.ts`).
O banco, as migrations, os testes dele e o que o servidor chama estão em
`supabase/README.md`.

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

## Variáveis de ambiente

Os valores ficam em `.env.local`, fora do git; o modelo é `.env.example`.
Depois do build, `npm run varrer` (o `postbuild`) confere que nenhum segredo
foi parar no que vai ao navegador.

| Variável | Onde | Para quê |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador, por desenho | o projeto do Supabase |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | navegador, por desenho | a verificação contra robôs; no desenvolvimento, a chave de teste `1x00000000000000000000AA` |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | navegador, por desenho | a chave pública do Mercado Pago, que abre o cartão; sem ela, só o Pix aparece |
| `SUPABASE_SECRET_KEY`, `SUPABASE_PORTA` | só o servidor | a chave secreta e o segredo da porta do banco |
| `TAREFAS_SEGREDO` | só o servidor | a senha da tarefa de reconciliação |
| `MERCADOPAGO_ACCESS_TOKEN` | só o servidor | o Access Token do Mercado Pago (no desenvolvimento, o de teste) |
| `MERCADOPAGO_WEBHOOK_SECRET` | só o servidor | a assinatura secreta do aviso do Mercado Pago |
| `MERCADOPAGO_AMBIENTE` | só o servidor | `teste` no desenvolvimento; sem ela, o servidor se comporta como produção e recusa a cotação de exemplo |

As credenciais do Mercado Pago (de teste, no desenvolvimento) são do dono: ele
as cria no painel do Mercado Pago, junto com a URL do aviso, os eventos e a
assinatura secreta (`supabase/README.md`, "O que é do dono"). A cotação da
entrega continua de exemplo até o Uber Direct.

## O ensaio da sacola

Sem as credenciais do Mercado Pago, a sacola é percorrida de ponta a ponta com
um Mercado Pago falso, carregado só no servidor de ensaio
(`scripts/ensaio/mercadopago-falso.mjs`; o site nunca o importa):

```bash
NODE_OPTIONS=--import=./scripts/ensaio/mercadopago-falso.mjs \
MERCADOPAGO_ACCESS_TOKEN=APP_USR-ensaio MERCADOPAGO_WEBHOOK_SECRET=ensaio \
npm run dev
```

O Pix nasce com um QR de ensaio e passa a pago 20 s depois. A conta de
ensaio, o horário temporário da loja e a limpeza do fim estão em
`supabase/README.md`, "O ensaio com o Mercado Pago falso".
