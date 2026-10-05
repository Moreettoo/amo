# AMO Home v2 "Retrô doce" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a home da v1.1 pela home v2 "Retrô doce", dirigida pelo catálogo, com as animações e hovers aprovados, mantendo Lenis, parallax e a seção pinada.

**Architecture:** `page.tsx` é um Server Component assíncrono que carrega o catálogo (`carregarCatalogo`), passa por uma função pura (`montarVisao`) que decide o que aparece, e entrega dados serializáveis às seções. Um `FiltroProvider` no cliente liga Cardápio, Hoje o dia pede, Final e Rodapé. Animação de entrada é CSS gated por `html.js` + `prefers-reduced-motion: no-preference`; Motion fica só com o FLIP do cardápio e o parallax.

**Tech Stack:** Next.js 16.3.2 (App Router), React 19.2.8, Tailwind v4, Motion 13 (`motion/react`), Lenis 1.3, next/font (Caprasimo, DM Sans), next/image, Vitest 4 + Testing Library + jsdom + vitest-axe.

**Spec:** `docs/superpowers/specs/2026-10-05-amo-home-v2-retro-design.md` (e o protótipo aprovado em `docs/superpowers/specs/assets/2026-10-05-prototipo-retro-doce.html`).

## Global Constraints

- Todo texto visível em pt-BR. Nenhum travessão (U+2014) nem meia-risca (U+2013) em `src/`, `tests/`, `scripts/` e README (`tests/travessao.test.ts`).
- Nenhum "..." no texto renderizado e nenhum preço (`R$`).
- Todo "AMO" renderizado como texto dentro de `translate="no"`, sem exceção (helper `ComAmo` para texto vindo do cadastro).
- Next 16: imagem de LCP usa `preload` (não `priority`); só `src/components/sections/Hero.tsx` liga `preload` em JSX. Ler os guias de `node_modules/next/dist/docs/` antes de mexer em `next/font`, `next/image` e Server/Client Components.
- 12 tokens de cor com os hex exatos da spec §2.1, em `@theme static` no `globals.css`.
- Animação: nada em loop; duração + atraso de cada `animation:` até 2 s; `@keyframes` só com `transform`, `opacity`, `clip-path`, `stroke-dashoffset`; atraso sempre dentro do shorthand (nunca `animation-delay` em CSS).
- Estado inicial escondido só em `src/app/estilos/movimento.css`, dentro de um único `@media (prefers-reduced-motion: no-preference)`, com todo seletor começando por `html.js `.
- Hover só dentro de `@media (hover: hover)`; o mesmo efeito em `:focus-visible` para o que é focável; `cursor: pointer` só no clicável.
- Deslocamento de âncora: 96 px (`DESLOCAMENTO_NAV = -96`), e todo alvo de âncora com a classe `scroll-mt-24`.
- `cobre` puro nunca é cor de texto sobre fundo claro; a única regra CSS com `color: var(--color-cobre)` é `.hero__titulo em`.
- Comentários de código em pt-BR, no tom dos arquivos existentes.
- Commits terminam com:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011BKoda3GsLPExMyB2Rn428
  ```

## Review Focus

1. **Nome de produto longo** ("Ninho com frutas vermelhas", 26 letras) na etiqueta, na fita e na palavra grande do Hoje o dia pede: tem que caber sem estourar a coluna. Teste: classe `etiqueta--longa` acima de 11 letras (Task 6) e `corpoDaPalavra` encolhendo para palavras longas (Task 3).
2. **Progresso de rolagem inválido** (NaN, negativo, maior que 1, zero vontades): `indicePorProgresso` devolve um índice válido e nunca quebra. Teste na Task 3.
3. **Troca rápida de vontade** (rolar por várias vontades antes da saída terminar): a palavra termina mostrando a última, nunca uma intermediária. Teste com timers falsos na Task 10.
4. **Rolagem programada interrompida** (a pessoa gira a roda no meio do `scrollTo` e o Lenis nunca chama `onComplete`): a trava da seleção solta sozinha. Teste de `useTrava` na Task 4.
5. **Formato que o site não conhece** (um "caixa" vindo do Supabase) no card e no palco do hero: cai na moldura neutra, sem acessório e sem quebrar. Testes nas Tasks 6 e 8.

---

## Mapa de arquivos

```
src/app/
  layout.tsx            fontes, script html.js, RolagemSuave, skip link
  page.tsx              Server Component: catálogo → visão → seções
  globals.css           tokens (@theme static), base, @import dos estilos
  estilos/
    pecas.css           wrap, rótulo de seção, botão retrô, pílula, link sublinhado, foto em arco, selo, camadas, grão
    produto.css         moldura, etiqueta, fita, carimbo, selos sobre a foto, card
    hero.css · cardapio.css · hoje.css · rotulos.css · marca.css · rodape.css
    movimento.css       @keyframes + o único bloco no-preference com html.js
src/lib/
  catalogo.ts           tipos, validarCatalogo, carregarCatalogo
  visao.ts              montarVisao, filtrar, FILTRO_VAZIO
  vontade.ts            indicePorProgresso, posicaoDoIndice, listarNomes, corpoDaPalavra, contarOpcoes, textoVerNoCardapio
  contraste.ts          (fica)
  motion.ts             (fica: EASE_AMO)
src/data/
  linhas.ts · produtos.ts · selos.ts · vontades.ts
src/components/
  InlineScript.tsx      script antes da primeira pintura (MARCAR_JS)
  RolagemSuave.tsx      Lenis + useRolagem().rolarPara
  FiltroProvider.tsx    { linha, selo, vontade } + definir/limpar
  icons/selos.tsx       ícones por id + IconeSelo com genérico
  layout/Nav.tsx · layout/Footer.tsx
  sections/Hero.tsx · Cardapio.tsx · HojeODiaPede.tsx · Rotulos.tsx · AMarca.tsx · FaixaCobre.tsx · Final.tsx
  ui/BotaoRetro.tsx · Pilula.tsx · LinkSublinhado.tsx · Camadas.tsx · SeloCarimbo.tsx · ComAmo.tsx
  ui/MolduraProduto.tsx · CardProduto.tsx · PoteEnche.tsx · PalavraTroca.tsx · PapelRotulo.tsx · FotoParallax.tsx
  ui/useNaTela.ts · ui/useTrava.ts
public/produtos/<slug>.webp
tests/
  setup.ts · fixtures/catalogo-misto.ts · fixtures/sonda.tsx
  tokens · fundacao · inline-script.node · catalogo · icones · visao · providers · ui · movimento
  produto · layout · hero · cardapio · hoje · secoes · pagina · ssr · logo · travessao
```

Os blocos de código com `title="caminho"` são o conteúdo completo do arquivo naquele passo.

---

### Task 0: Ponto de partida no git

**Files:**
- Modify: `docs/superpowers/specs/2026-10-05-amo-home-v2-retro-design.md` (três ajustes da execução)

- [ ] **Step 1: Commitar a v1.1 pendente na `feat/home-v1`**

```bash
git add -A -- . ':!docs/superpowers/plans'
git commit -m "feat: revisao visual v1.1 (Lenis, Bree Serif, contraste, travessao)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011BKoda3GsLPExMyB2Rn428"
```

- [ ] **Step 2: Criar a branch da v2**

```bash
git checkout -b feat/home-v2
```

- [ ] **Step 3: Ajustar a spec**
  - §6.2: o estilo inline proibido é `opacity: 0`, `visibility: hidden`, qualquer `clip-path`, e `transform` diferente de `none` fora de `data-parallax`.
  - §5.4: a seção só fica pinada com altura de janela de 700 px ou mais.
  - §8.2: o CSS mora em `src/app/estilos/`, um arquivo por parte.
  - §3.2: a validação também recusa catálogo sem nenhum produto com vontade.

- [ ] **Step 4: Rodar a suíte de partida**

Run: `npm test`
Expected: PASS, 13 arquivos, 142 testes.

- [ ] **Step 5: Commit do plano e dos ajustes**

```bash
git add docs/superpowers/plans/2026-10-05-amo-home-v2-retro.md docs/superpowers/specs/2026-10-05-amo-home-v2-retro-design.md
git commit -m "docs: plano de implementacao da home v2"
```

---

### Task 1: Fundação (tokens, fontes, html.js, remoção da v1)

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/ui/FotoParallax.tsx`, `tests/setup.ts`, `tests/tokens.test.ts`
- Create: `src/components/InlineScript.tsx`, `tests/fundacao.test.ts`, `tests/inline-script.node.test.tsx`
- Delete: `src/components/layout/*`, `src/components/sections/*`, `src/components/ui/{Estrato,Etiqueta,Pill,Reveal,SaborCard}.tsx`, `tests/{data,fechamento,hero,layout,lista-pinada,pagina,ritual,sabores,selos-marca,ui}.test.ts(x)`

**Interfaces:**
- Produces: `InlineScript({ html })`, `MARCAR_JS` (string); classe `js` no `<html>`; tokens `--color-*`; `--foco`; classe `.superficie-escura`; classe `.so-js`; `FotoParallax` recebe `imagem: { src, alt, largura, altura }` e `carregamento?: 'lazy' | 'eager'`.

- [ ] **Step 1: Remover a v1**

```bash
git rm -q src/components/layout/AnnouncementBar.tsx src/components/layout/Nav.tsx src/components/layout/Footer.tsx
git rm -q src/components/sections/*.tsx
git rm -q src/components/ui/Estrato.tsx src/components/ui/Etiqueta.tsx src/components/ui/Pill.tsx src/components/ui/Reveal.tsx src/components/ui/SaborCard.tsx
git rm -q tests/data.test.ts tests/fechamento.test.tsx tests/hero.test.tsx tests/layout.test.tsx tests/lista-pinada.test.tsx tests/pagina.test.tsx tests/ritual.test.tsx tests/sabores.test.tsx tests/selos-marca.test.tsx tests/ui.test.tsx
```

`src/data/sabores.ts` e `src/data/ritual.ts` ficam até a Task 2 (sem consumidor, mas mantêm a varredura do travessão acima de 20 arquivos).

- [ ] **Step 2: Escrever os testes que vão falhar**

```ts title="tests/tokens.test.ts"
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { contraste, lerTokens } from '@/lib/contraste'

const css = readFileSync(resolve(import.meta.dirname, '../src/app/globals.css'), 'utf8')
const t = lerTokens(css)

describe('tokens de cor', () => {
  it('define os 12 tokens com os hex exatos da spec', () => {
    expect(t).toEqual({
      expresso: '#2B1B16',
      chocolate: '#4A2E25',
      cobre: '#C9784A',
      'cobre-texto': '#9A5530',
      caramelo: '#E2BF96',
      creme: '#FAF2E9',
      papel: '#FFFBF5',
      linho: '#F6EBDD',
      kraft: '#D9BE98',
      suave: '#5E4A40',
      'claro-suave': '#EADDD0',
      vinho: '#8E2F3C',
    })
  })

  it('não sobra token da v1', () => {
    expect(css).not.toMatch(/--color-(cream|sage|sand|ink|rosewood|blush)\b/)
  })
})

describe('contraste de texto, WCAG AA (spec §9.2)', () => {
  it.each([
    ['expresso', 'creme'],
    ['expresso', 'papel'],
    ['expresso', 'linho'],
    ['expresso', 'kraft'],
    ['expresso', 'caramelo'],
    ['expresso', 'cobre'],
    ['chocolate', 'caramelo'],
    ['chocolate', 'kraft'],
    ['chocolate', 'papel'],
    ['suave', 'creme'],
    ['suave', 'papel'],
    ['suave', 'linho'],
    ['suave', 'kraft'],
    ['cobre-texto', 'creme'],
    ['cobre-texto', 'papel'],
    ['cobre-texto', 'linho'],
    ['creme', 'expresso'],
    ['claro-suave', 'expresso'],
    ['caramelo', 'expresso'],
    ['cobre', 'expresso'],
    ['papel', 'vinho'],
    ['papel', 'chocolate'],
    ['vinho', 'papel'],
  ])('%s sobre %s passa 4.5:1', (texto, fundo) => {
    expect(contraste(t[texto], t[fundo])).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['cobre-texto', 'kraft'],
    ['cobre-texto', 'caramelo'],
    ['cobre', 'creme'],
    ['cobre', 'caramelo'],
  ])('%s sobre %s reprova, por isso é proibido como texto', (texto, fundo) => {
    expect(contraste(t[texto], t[fundo])).toBeLessThan(4.5)
  })
})

describe('anel de foco (spec §9.3)', () => {
  it('é uma variável que aponta para expresso, e cobre nas superfícies escuras', () => {
    expect(css).toMatch(/--foco:\s*var\(--color-expresso\)/)
    expect(css).toMatch(/\.superficie-escura\s*\{\s*--foco:\s*var\(--color-cobre\)/)
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2\.5px solid var\(--foco\)/)
  })

  it.each(['creme', 'papel', 'linho', 'kraft', 'caramelo', 'cobre'])(
    'expresso passa 3:1 sobre %s',
    (fundo) => {
      expect(contraste(t.expresso, t[fundo])).toBeGreaterThanOrEqual(3)
    },
  )

  it('cobre passa 3:1 sobre expresso', () => {
    expect(contraste(t.cobre, t.expresso)).toBeGreaterThanOrEqual(3)
  })

  it('cobre reprovaria sobre caramelo, por isso o foco não é cobre em toda parte', () => {
    expect(contraste(t.cobre, t.caramelo)).toBeLessThan(3)
  })
})
```

```ts title="tests/fundacao.test.ts"
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ler = (caminho: string) => readFileSync(resolve(import.meta.dirname, '..', caminho), 'utf8')

describe('layout', () => {
  const layout = ler('src/app/layout.tsx')

  it('marca o <html> com a classe js antes da primeira pintura', () => {
    expect(layout).toMatch(/<head>\s*<InlineScript html=\{MARCAR_JS\} \/>\s*<\/head>/)
    expect(layout).toMatch(/<html[^>]*suppressHydrationWarning/)
  })

  it('usa Caprasimo e DM Sans, e mais nenhuma família', () => {
    expect(layout).toMatch(/import \{ Caprasimo, DM_Sans \} from 'next\/font\/google'/)
    expect(layout).not.toMatch(/Bree|Parisienne|Poppins/)
  })

  it('pinta a barra do navegador de expresso', () => {
    expect(layout).toMatch(/themeColor: '#2B1B16'/)
  })

  it('não tem mais o <noscript> de resgate: nada nasce escondido sem JS', () => {
    expect(layout).not.toMatch(/<noscript>/)
  })
})

describe('globals.css', () => {
  const css = ler('src/app/globals.css')

  it('esconde o que só funciona com JS quando ele não carregou', () => {
    expect(css).toMatch(/html:not\(\.js\) \.so-js\s*\{\s*display:\s*none !important;/)
  })

  it('emite os tokens mesmo sem uso em utilitário', () => {
    expect(css).toMatch(/@theme static \{/)
  })
})
```

```tsx title="tests/inline-script.node.test.tsx"
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { InlineScript, MARCAR_JS } from '@/components/InlineScript'

describe('InlineScript no servidor', () => {
  it('sai como script executável com o código da classe js', () => {
    const html = renderToString(<InlineScript html={MARCAR_JS} />)
    expect(html).toContain('type="text/javascript"')
    expect(html).toContain("document.documentElement.classList.add('js')")
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/tokens.test.ts tests/fundacao.test.ts tests/inline-script.node.test.tsx`
Expected: FAIL (tokens antigos, layout com Bree, `InlineScript` inexistente; o teste node também quebra no `tests/setup.ts`, que usa `window`).

- [ ] **Step 4: Implementar**

```ts title="tests/setup.ts"
import '@testing-library/jest-dom/vitest'
import * as matchers from 'vitest-axe/matchers'
import { expect } from 'vitest'
import { MotionGlobalConfig } from 'motion/react'

expect.extend(matchers)

// Animacao do Motion termina no frame seguinte: o que sai do cardapio sai de
// verdade do DOM, sem o teste esperar a duracao da animacao.
MotionGlobalConfig.skipAnimations = true

// Arquivos com `@vitest-environment node` tambem passam por aqui, e la nao ha
// window.
if (typeof window !== 'undefined') {
  // jsdom nao implementa matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })

  // jsdom nao implementa IntersectionObserver
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  }
  Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IO })
}
```

```tsx title="src/components/InlineScript.tsx"
/**
 * Script que roda durante o parse do HTML, antes da primeira pintura.
 *
 * Padrao do guia do proprio Next 16
 * (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md):
 * `text/javascript` no servidor, `text/plain` no cliente, e
 * `suppressHydrationWarning` para a diferenca de `type` nao virar erro de
 * hidratacao. Em navegacao de cliente o script nao roda de novo, e nao
 * precisa: a classe ja esta no <html>.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * A classe `js` e o portao de todo estado inicial escondido
 * (src/app/estilos/movimento.css). Sem JavaScript ela nao existe e a pagina
 * nasce no estado final, que e o que impede o hero em branco da v1.1.
 */
export const MARCAR_JS = "document.documentElement.classList.add('js')"
```

```css title="src/app/globals.css"
@import "tailwindcss";

/* `static`: os tokens viram variavel CSS mesmo sem utilitario que os use,
   porque os arquivos de src/app/estilos leem var(--color-*) direto. */
@theme static {
  --color-expresso: #2B1B16;
  --color-chocolate: #4A2E25;
  --color-cobre: #C9784A;
  --color-cobre-texto: #9A5530;
  --color-caramelo: #E2BF96;
  --color-creme: #FAF2E9;
  --color-papel: #FFFBF5;
  --color-linho: #F6EBDD;
  --color-kraft: #D9BE98;
  --color-suave: #5E4A40;
  --color-claro-suave: #EADDD0;
  --color-vinho: #8E2F3C;

  --font-display: var(--fonte-caprasimo), Georgia, serif;
  --font-sans: var(--fonte-dm-sans), system-ui, -apple-system, sans-serif;

  --ease-amo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-mola: cubic-bezier(0.34, 1.4, 0.64, 1);
}

@layer base {
  :root {
    --gutter: clamp(20px, 5vw, 56px);
    /* Cor do anel de foco. Expresso nas superficies claras; as escuras
       (.superficie-escura) trocam por cobre. Cobre em toda parte reprovaria
       no caramelo (1.93:1). */
    --foco: var(--color-expresso);
  }

  html {
    /* Sem scroll-behavior: smooth. O Lenis (src/components/RolagemSuave.tsx)
       conduz a rolagem, inclusive de ancora, e as duas coisas brigariam pelo
       scrollTop no mesmo frame. */

    /* Regras minimas que o Lenis precisa, copiadas de lenis/dist/lenis.css. */
    &.lenis,
    &.lenis body {
      height: auto;
    }

    &.lenis.lenis-smooth iframe {
      pointer-events: none;
    }

    &.lenis.lenis-autoToggle {
      transition-property: overflow;
      transition-duration: 1ms;
      transition-behavior: allow-discrete;
    }
  }

  .lenis:not(.lenis-autoToggle).lenis-stopped {
    overflow: clip;
  }

  .lenis [data-lenis-prevent] {
    overscroll-behavior: contain;
  }

  body {
    background-color: var(--color-creme);
    color: var(--color-expresso);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -webkit-tap-highlight-color: color-mix(in srgb, var(--color-cobre) 24%, transparent);
  }

  /* Caprasimo tem um peso so: pedir outro faria o navegador engordar o
     desenho por sintese. */
  h1, h2, h3 {
    font-family: var(--font-display);
    font-weight: 400;
    text-wrap: balance;
  }

  p {
    text-wrap: pretty;
  }

  :focus-visible {
    outline: 2.5px solid var(--foco);
    outline-offset: 3px;
  }

  .superficie-escura { --foco: var(--color-cobre); }

  /* Filtros, abas e regiao viva so funcionam com JS. Sem ele, somem, em vez
     de virar botao que nao faz nada. */
  html:not(.js) .so-js { display: none !important; }

  button, a, summary, [role="tab"] {
    touch-action: manipulation;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

```tsx title="src/app/layout.tsx"
import type { Metadata, Viewport } from 'next'
import { Caprasimo, DM_Sans } from 'next/font/google'
import { InlineScript, MARCAR_JS } from '@/components/InlineScript'
import { RolagemSuave } from '@/components/RolagemSuave'
import './globals.css'

/**
 * Display. Caprasimo tem um peso so (400): e a letra gorda e redonda de
 * confeitaria de bairro que a direcao "retro doce" pede. `preload` porque
 * ela esta no H1, acima da dobra.
 */
const caprasimo = Caprasimo({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
  preload: true,
  variable: '--fonte-caprasimo',
})

/**
 * Texto. DM Sans e variavel em peso e em tamanho optico (`opsz`), entao o
 * corpo de 18 px e o rotulo de 13 px saem cada um com o desenho do seu
 * tamanho, sem baixar arquivo extra por peso.
 */
const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz'],
  display: 'swap',
  preload: true,
  variable: '--fonte-dm-sans',
})

export const metadata: Metadata = {
  title: 'AMO · Bolos no pote zero açúcar',
  description:
    'Sete sabores de bolo no pote, montados à mão, cozidos a vapor e adoçados com eritritol e stevia. Para quem ama comer bem.',
}

export const viewport: Viewport = {
  themeColor: '#2B1B16',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${caprasimo.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={MARCAR_JS} />
      </head>
      <body>
        <RolagemSuave />
        <a
          href="#conteudo"
          className="superficie-escura sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-expresso focus:px-5 focus:py-3 focus:text-sm focus:text-creme"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  )
}
```

```tsx title="src/app/page.tsx"
/**
 * A home v2 cresce secao por secao no plano
 * (docs/superpowers/plans/2026-10-05-amo-home-v2-retro.md). Por enquanto, so o
 * alvo do "Pular para o conteudo".
 */
export default function Home() {
  return <main id="conteudo" className="scroll-mt-24" />
}
```

```tsx title="src/components/ui/FotoParallax.tsx"
'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

/**
 * A foto que anda um pouco mais devagar que a pagina.
 *
 * A caixa recorta; a foto dentro dela e ampliada em 1.1 e translada de -4% a
 * +4% da propria altura conforme a caixa cruza a janela. Os 10% de sobra da
 * ampliacao cobrem os 4% de translado, entao nunca aparece borda vazia.
 *
 * `data-parallax` marca o unico lugar onde o HTML do servidor pode sair com
 * `transform` inline: aqui ele e o deslocamento de rolagem e nao esconde
 * nada (tests/ssr.test.tsx).
 */
type Props = {
  imagem: { src: string; alt: string; largura: number; altura: number }
  sizes: string
  /** verdadeiro apenas na foto do destaque no hero, o elemento de LCP */
  preload?: boolean
  /** sem preload: lazy por padrao; eager para as laterais do hero */
  carregamento?: 'lazy' | 'eager'
  /** classes da caixa que recorta */
  className?: string
  /** classes do miolo que se move; sem elas a foto dita a altura */
  proporcao?: string
}

export function FotoParallax({
  imagem,
  sizes,
  preload = false,
  carregamento = 'lazy',
  className,
  proporcao,
}: Props) {
  const refCaixa = useRef<HTMLDivElement>(null)
  const reduzir = useReducedMotion()

  // Os hooks rodam sempre, com ou sem reduced-motion: o que muda e o style
  // ser aplicado, porque a ordem de hooks nao pode depender de media query.
  const { scrollYProgress } = useScroll({
    target: refCaixa,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], ['-4%', '4%'])

  return (
    <div ref={refCaixa} className={`overflow-hidden ${className ?? ''}`}>
      <motion.div
        data-parallax
        style={reduzir ? undefined : { y, scale: 1.1 }}
        className={proporcao}
      >
        <Image
          src={imagem.src}
          alt={imagem.alt}
          width={imagem.largura}
          height={imagem.altura}
          {...(preload ? { preload: true } : { loading: carregamento })}
          sizes={sizes}
          className={proporcao ? 'h-full w-full object-cover' : 'h-auto w-full object-cover'}
        />
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS (tokens, fundacao, inline-script.node, logo, travessao).

- [ ] **Step 6: Commit**

```bash
git add -A src tests
git commit -m "feat: fundacao da v2: tokens retro doce, Caprasimo + DM Sans, portao html.js"
```

---

### Task 2: Cadastro (tipos, dados, validação, fotos)

**Files:**
- Create: `src/lib/catalogo.ts`, `src/data/linhas.ts`, `src/data/produtos.ts`, `src/data/vontades.ts`, `tests/catalogo.test.ts`, `tests/icones.test.tsx`
- Modify: `src/data/selos.ts`, `src/components/icons/selos.tsx`
- Move: `public/sabores/*.webp` → `public/produtos/<slug>.webp`
- Delete: `src/data/sabores.ts`, `src/data/ritual.ts`

**Interfaces:**
- Produces (em `@/lib/catalogo`): tipos `Selo`, `Vontade`, `CorDoRotulo`, `Linha`, `Formato`, `ImagemProduto`, `Produto`, `Catalogo`; `validarCatalogo(c: Catalogo): string[]`; `carregarCatalogo(): Promise<Catalogo>`.
- Produces: `LINHAS`, `PRODUTOS`, `SELOS`, `VONTADES` (readonly arrays); `IconeSelo({ id }: { id: string })`.

- [ ] **Step 1: Mover as fotos**

```bash
mkdir -p public/produtos
git mv public/sabores/aconchego-prestigio.webp public/produtos/prestigio.webp
git mv public/sabores/raizes-pacoca.webp public/produtos/pacoca.webp
git mv public/sabores/leveza-maracuja.webp public/produtos/mousse-de-maracuja.webp
git mv public/sabores/encontro-frutas-vermelhas.webp public/produtos/ninho-com-frutas-vermelhas.webp
git mv public/sabores/carinho-beijinho.webp public/produtos/beijinho.webp
git mv public/sabores/intensamente-chocolate.webp public/produtos/chocolate.webp
git mv public/sabores/energia-frutas-amarelas.webp public/produtos/frutas-amarelas.webp
git rm -q src/data/sabores.ts src/data/ritual.ts
```

- [ ] **Step 2: Escrever os testes que vão falhar**

```ts title="tests/catalogo.test.ts"
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import imageSize from 'image-size'
import { carregarCatalogo, validarCatalogo, type Catalogo } from '@/lib/catalogo'
import { LINHAS } from '@/data/linhas'
import { PRODUTOS } from '@/data/produtos'
import { SELOS } from '@/data/selos'
import { VONTADES } from '@/data/vontades'

/** Copia funda do cadastro real, para cada teste estragar a sua. */
function real(): Catalogo {
  return JSON.parse(
    JSON.stringify({ linhas: LINHAS, produtos: PRODUTOS, selos: SELOS, vontades: VONTADES }),
  )
}

const publico = (src: string) => resolve(import.meta.dirname, '../public', src.slice(1))

describe('carregarCatalogo', () => {
  it('entrega o cadastro de hoje: 1 linha, 7 produtos, 7 selos, 5 vontades', async () => {
    const c = await carregarCatalogo()
    expect(c.linhas.map((l) => l.slug)).toEqual(['pote'])
    expect(c.produtos).toHaveLength(7)
    expect(c.selos).toHaveLength(7)
    expect(c.vontades.map((v) => v.slug)).toEqual(['chocolate', 'fruta', 'coco', 'classico', 'salgado'])
  })
})

describe('validarCatalogo', () => {
  it('aceita o cadastro real', () => {
    expect(validarCatalogo(real())).toEqual([])
  })

  it.each<[string, (c: Catalogo) => void, RegExp]>([
    ['slug de produto repetido', (c) => { c.produtos[1].slug = c.produtos[0].slug }, /slug de produto repetido/],
    ['slug de linha repetido', (c) => { c.linhas.push({ ...c.linhas[0] }) }, /slug de linha repetido/],
    ['produto com linha inexistente', (c) => { c.produtos[0].linha = 'torta' }, /linha inexistente torta/],
    ['produto com selo inexistente', (c) => { c.produtos[0].selos.push('vegano') }, /selo inexistente vegano/],
    ['produto com vontade inexistente', (c) => { c.produtos[0].vontades.push('azedo') }, /vontade inexistente azedo/],
    ['linha com selo inexistente', (c) => { c.linhas[0].selos.push('organico') }, /linha pote: selo inexistente organico/],
    ['imagem sem caminho absoluto', (c) => { c.produtos[0].imagem.src = 'produtos/x.webp' }, /caminho absoluto/],
    ['imagem sem alt', (c) => { c.produtos[0].imagem.alt = '  ' }, /sem alt/],
    ['imagem sem dimensões', (c) => { c.produtos[0].imagem.largura = 0 }, /sem dimensões/],
    ['dois destaques', (c) => { c.produtos[1].destaque = true }, /mais de um produto em destaque/],
    ['catálogo vazio', (c) => { c.produtos = [] }, /catálogo sem produto/],
    ['nenhum produto com vontade', (c) => { for (const p of c.produtos) p.vontades = [] }, /nenhum produto com vontade/],
  ])('recusa %s', (_, estragar, problema) => {
    const c = real()
    estragar(c)
    expect(validarCatalogo(c).join('\n')).toMatch(problema)
  })
})

describe('os dados de hoje', () => {
  it('Encontro é Ninho com frutas vermelhas', () => {
    expect(PRODUTOS.find((p) => p.slug === 'ninho-com-frutas-vermelhas')?.nome).toBe(
      'Ninho com frutas vermelhas',
    )
  })

  it('nenhum nome poético em nome, alt ou caminho de foto', () => {
    const poeticos = /Aconchego|Raízes|Leveza|Encontro|Carinho|Intensamente|Energia|Frutinho/i
    for (const p of PRODUTOS) {
      expect(`${p.nome} ${p.imagem.alt} ${p.imagem.src}`).not.toMatch(poeticos)
    }
  })

  it('só o Prestígio é destaque', () => {
    expect(PRODUTOS.filter((p) => p.destaque).map((p) => p.slug)).toEqual(['prestigio'])
  })

  it('toda foto existe em public e tem as dimensões declaradas', () => {
    for (const p of PRODUTOS) {
      expect(existsSync(publico(p.imagem.src)), p.imagem.src).toBe(true)
      const medida = imageSize(readFileSync(publico(p.imagem.src)))
      expect(medida.width, p.slug).toBe(p.imagem.largura)
      expect(medida.height, p.slug).toBe(p.imagem.altura)
    }
  })

  it('o rótulo do pote traz os 6 selos e o modo de aproveitar', () => {
    const pote = LINHAS[0]
    expect(pote.selos).toEqual(['adocante', 'vapor', 'fibras', 'vidro', 'ingredientes', 'artesanal'])
    expect(pote.modoDeAproveitar?.passos).toEqual([
      'Abra com amor',
      'Pegue sua colher',
      'A saboreie sem culpa',
      'Cuide do pote de vidro',
    ])
  })
})
```

```tsx title="tests/icones.test.tsx"
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { IconeSelo } from '@/components/icons/selos'

describe('IconeSelo', () => {
  it('desenha o ícone do selo conhecido, escondido do leitor de tela', () => {
    const { container } = render(<IconeSelo id="vapor" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('selo sem ícone desenhado cai no genérico', () => {
    const { container } = render(<IconeSelo id="vegano" />)
    expect(container.querySelector('svg circle')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/catalogo.test.ts tests/icones.test.tsx`
Expected: FAIL ("Cannot find module '@/lib/catalogo'").

- [ ] **Step 4: Implementar**

```ts title="src/lib/catalogo.ts"
import { LINHAS } from '@/data/linhas'
import { PRODUTOS } from '@/data/produtos'
import { SELOS } from '@/data/selos'
import { VONTADES } from '@/data/vontades'

/**
 * O cadastro, no formato das tabelas que o Supabase vai receber.
 *
 * Nenhum componente importa src/data direto: tudo passa por
 * carregarCatalogo(). Quando o Supabase entrar, troca so ela.
 */

export type Selo = { id: string; nome: string }

export type Vontade = { slug: string; palavra: string; ordem: number }

export type CorDoRotulo = 'papel' | 'linho' | 'kraft'

export type Linha = {
  slug: string
  /** plural, para filtro e rotulo: "Bolos no pote" */
  nome: string
  /** singular, acima do nome no card: "Bolo no pote" */
  tipo: string
  /** a regra saudavel da linha: "Zero açúcar" */
  regra: string
  /** ids de Selo, na ordem do rotulo */
  selos: string[]
  /** faixa do rotulo, sem o coracao (ele e decoracao) */
  frase?: string
  modoDeAproveitar?: { titulo: string; passos: string[] }
  corDoRotulo: CorDoRotulo
  ordem: number
}

/** Formato decide a moldura da foto. Um formato novo cai na moldura neutra. */
export type Formato = 'pote' | 'inteiro' | 'unidade' | (string & {})

export type ImagemProduto = { src: string; alt: string; largura: number; altura: number }

export type Produto = {
  slug: string
  /** o nome do produto, nunca nome poetico */
  nome: string
  /** slug de Linha */
  linha: string
  formato: Formato
  frase?: string
  imagem: ImagemProduto
  /** ids de Selo */
  selos: string[]
  /** slugs de Vontade */
  vontades: string[]
  destaque?: boolean
  ordem: number
}

export type Catalogo = {
  linhas: Linha[]
  produtos: Produto[]
  selos: Selo[]
  vontades: Vontade[]
}

/** Lista de problemas do cadastro; vazia quando esta tudo certo. */
export function validarCatalogo(c: Catalogo): string[] {
  const problemas: string[] = []

  const semRepetir = (o_que: string, chaves: string[]) => {
    const vistas = new Set<string>()
    for (const k of chaves) {
      if (vistas.has(k)) problemas.push(`${o_que} repetido: ${k}`)
      vistas.add(k)
    }
  }
  semRepetir('slug de linha', c.linhas.map((l) => l.slug))
  semRepetir('slug de produto', c.produtos.map((p) => p.slug))
  semRepetir('id de selo', c.selos.map((s) => s.id))
  semRepetir('slug de vontade', c.vontades.map((v) => v.slug))

  const linhas = new Set(c.linhas.map((l) => l.slug))
  const selos = new Set(c.selos.map((s) => s.id))
  const vontades = new Set(c.vontades.map((v) => v.slug))

  for (const l of c.linhas) {
    for (const s of l.selos) {
      if (!selos.has(s)) problemas.push(`linha ${l.slug}: selo inexistente ${s}`)
    }
  }

  for (const p of c.produtos) {
    if (!linhas.has(p.linha)) problemas.push(`produto ${p.slug}: linha inexistente ${p.linha}`)
    for (const s of p.selos) {
      if (!selos.has(s)) problemas.push(`produto ${p.slug}: selo inexistente ${s}`)
    }
    for (const v of p.vontades) {
      if (!vontades.has(v)) problemas.push(`produto ${p.slug}: vontade inexistente ${v}`)
    }
    if (!p.imagem?.src?.startsWith('/')) {
      problemas.push(`produto ${p.slug}: imagem sem caminho absoluto`)
    }
    if (!p.imagem?.alt?.trim()) problemas.push(`produto ${p.slug}: imagem sem alt`)
    if (!(p.imagem?.largura > 0 && p.imagem?.altura > 0)) {
      problemas.push(`produto ${p.slug}: imagem sem dimensões`)
    }
  }

  if (c.produtos.filter((p) => p.destaque).length > 1) {
    problemas.push('mais de um produto em destaque')
  }
  if (c.produtos.length === 0) problemas.push('catálogo sem produto')
  else if (!c.produtos.some((p) => p.vontades.length > 0)) {
    problemas.push('nenhum produto com vontade')
  }

  return problemas
}

/**
 * Le o cadastro e valida. Cadastro ruim lanca erro, e o erro derruba o build
 * em vez de chegar a pagina. Assincrona desde ja para o Supabase entrar sem
 * mudar quem chama.
 */
export async function carregarCatalogo(): Promise<Catalogo> {
  const catalogo: Catalogo = {
    linhas: [...LINHAS],
    produtos: [...PRODUTOS],
    selos: [...SELOS],
    vontades: [...VONTADES],
  }
  const problemas = validarCatalogo(catalogo)
  if (problemas.length > 0) {
    throw new Error(`Cadastro inválido:\n${problemas.join('\n')}`)
  }
  return catalogo
}
```

```ts title="src/data/selos.ts"
import type { Selo } from '@/lib/catalogo'

/**
 * Os selos do rotulo, mais o "Zero açúcar" dos produtos. O id casa com a
 * chave em components/icons/selos.tsx; selo sem icone desenhado cai no
 * icone generico.
 */
export const SELOS: readonly Selo[] = [
  { id: 'zero-acucar', nome: 'Zero açúcar' },
  { id: 'adocante', nome: 'Adoçado com eritritol e stevia' },
  { id: 'vapor', nome: 'Cozido a vapor' },
  { id: 'fibras', nome: 'Fonte de fibras' },
  { id: 'vidro', nome: 'Pote de vidro reutilizável' },
  { id: 'ingredientes', nome: 'Ingredientes selecionados' },
  { id: 'artesanal', nome: 'Produzido artesanalmente' },
]
```

```ts title="src/data/linhas.ts"
import type { Linha } from '@/lib/catalogo'

/**
 * As linhas de produto. Hoje so a do pote; o ritual que era secao na v1
 * mora aqui, no modo de aproveitar do rotulo.
 */
export const LINHAS: readonly Linha[] = [
  {
    slug: 'pote',
    nome: 'Bolos no pote',
    tipo: 'Bolo no pote',
    regra: 'Zero açúcar',
    selos: ['adocante', 'vapor', 'fibras', 'vidro', 'ingredientes', 'artesanal'],
    frase: 'Um abraço em forma de sobremesa',
    modoDeAproveitar: {
      titulo: 'Como aproveitar seu AMO',
      passos: ['Abra com amor', 'Pegue sua colher', 'A saboreie sem culpa', 'Cuide do pote de vidro'],
    },
    corDoRotulo: 'papel',
    ordem: 1,
  },
]
```

```ts title="src/data/vontades.ts"
import type { Vontade } from '@/lib/catalogo'

/** A ordem aqui e a ordem do Hoje o dia pede. Vontade sem produto nao aparece. */
export const VONTADES: readonly Vontade[] = [
  { slug: 'chocolate', palavra: 'Chocolate', ordem: 1 },
  { slug: 'fruta', palavra: 'Fruta', ordem: 2 },
  { slug: 'coco', palavra: 'Coco', ordem: 3 },
  { slug: 'classico', palavra: 'Um clássico', ordem: 4 },
  { slug: 'salgado', palavra: 'Algo salgado', ordem: 5 },
]
```

```ts title="src/data/produtos.ts"
import type { Produto } from '@/lib/catalogo'

/**
 * Os 7 potes de hoje. Nome e o nome do produto; as frases sao as das
 * etiquetas. As dimensoes sao as do arquivo (tests/catalogo.test.ts mede).
 */
export const PRODUTOS: readonly Produto[] = [
  {
    slug: 'prestigio',
    nome: 'Prestígio',
    linha: 'pote',
    formato: 'pote',
    frase: 'Um abraço em forma de sobremesa',
    imagem: {
      src: '/produtos/prestigio.webp',
      alt: 'Pote de vidro com bolo de prestígio, coberto de coco ralado, ao lado de pedaços de chocolate e coco fresco',
      largura: 666,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['chocolate', 'coco', 'classico'],
    destaque: true,
    ordem: 1,
  },
  {
    slug: 'pacoca',
    nome: 'Paçoca',
    linha: 'pote',
    formato: 'pote',
    frase: 'O sabor que desperta boas lembranças',
    imagem: {
      src: '/produtos/pacoca.webp',
      alt: 'Pote de vidro com bolo de paçoca, com amendoins inteiros por cima, ao lado de cubos de paçoca',
      largura: 714,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['classico'],
    ordem: 2,
  },
  {
    slug: 'mousse-de-maracuja',
    nome: 'Mousse de maracujá',
    linha: 'pote',
    formato: 'pote',
    frase: 'Para dias mais leves',
    imagem: {
      src: '/produtos/mousse-de-maracuja.webp',
      alt: 'Pote de vidro com mousse de maracujá, com sementes de maracujá na cobertura, ao lado de maracujás cortados',
      largura: 800,
      altura: 951,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['fruta'],
    ordem: 3,
  },
  {
    slug: 'ninho-com-frutas-vermelhas',
    nome: 'Ninho com frutas vermelhas',
    linha: 'pote',
    formato: 'pote',
    frase: 'Quando o doce encontra o azedinho perfeito',
    imagem: {
      src: '/produtos/ninho-com-frutas-vermelhas.webp',
      alt: 'Pote de vidro com bolo de ninho com frutas vermelhas, com calda vermelha por cima, ao lado de framboesas e amoras',
      largura: 750,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['fruta'],
    ordem: 4,
  },
  {
    slug: 'beijinho',
    nome: 'Beijinho',
    linha: 'pote',
    formato: 'pote',
    frase: 'Para adoçar o coração',
    imagem: {
      src: '/produtos/beijinho.webp',
      alt: 'Pote de vidro com bolo de beijinho, com coco ralado na cobertura, ao lado de doces de beijinho em prato branco',
      largura: 666,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['coco', 'classico'],
    ordem: 5,
  },
  {
    slug: 'chocolate',
    nome: 'Chocolate',
    linha: 'pote',
    formato: 'pote',
    frase: 'Para os apaixonados por chocolate',
    imagem: {
      src: '/produtos/chocolate.webp',
      alt: 'Pote de vidro com bolo de chocolate, com raspas de chocolate por cima, ao lado de barras de chocolate meio amargo',
      largura: 750,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['chocolate'],
    ordem: 6,
  },
  {
    slug: 'frutas-amarelas',
    nome: 'Frutas amarelas',
    linha: 'pote',
    formato: 'pote',
    frase: 'Manga, pêssego e maracujá',
    imagem: {
      src: '/produtos/frutas-amarelas.webp',
      alt: 'Pote de vidro com bolo de frutas amarelas, com calda de maracujá na cobertura, ao lado de manga cortada em cubos',
      largura: 750,
      altura: 1000,
    },
    selos: ['zero-acucar', 'fibras'],
    vontades: ['fruta'],
    ordem: 7,
  },
]
```

Em `src/components/icons/selos.tsx`, trocar a primeira linha (`import type { Selo } from '@/data/selos'`) por nada (a linha sai) e substituir o bloco final `export const ICONES_SELO ...` por:

```tsx
/** circulo simples: o selo novo que ainda nao ganhou desenho */
const Generico = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="7.5" />
  </svg>
)

export const ICONES_SELO: Readonly<Record<string, () => React.JSX.Element>> = {
  ingredientes: Ingredientes,
  vapor: Vapor,
  vidro: Vidro,
  fibras: Fibras,
  adocante: Adocante,
  artesanal: Artesanal,
}

/** O icone do selo pelo id; selo sem desenho cai no generico. */
export function IconeSelo({ id }: { id: string }) {
  const Icone = ICONES_SELO[id] ?? Generico
  return <Icone />
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src tests public
git commit -m "feat: cadastro da v2: linhas, produtos, selos e vontades com validacao"
```

---

### Task 3: A visão (o que a página mostra) e as contas do Hoje o dia pede

**Files:**
- Create: `src/lib/visao.ts`, `src/lib/vontade.ts`, `tests/fixtures/catalogo-misto.ts`, `tests/visao.test.ts`

**Interfaces:**
- Consumes: `Catalogo`, `Produto`, `Linha`, `ImagemProduto` de `@/lib/catalogo`.
- Produces (em `@/lib/visao`): `type Filtro = { linha: string | null; selo: string | null; vontade: string | null }`, `FILTRO_VAZIO`, `type OpcaoLinha = { slug; nome; contagem }`, `type OpcaoSelo = { id; nome }`, `type GrupoVontade = { slug; palavra; produtos: Produto[] }`, `type Visao`, `montarVisao(c: Catalogo): Visao`, `filtrar(produtos, filtro): Produto[]`.
- Produces (em `@/lib/vontade`): `indicePorProgresso(p, n): number`, `posicaoDoIndice(i, n, topo, curso): number`, `listarNomes(nomes): string`, `corpoDaPalavra(letras): string`, `contarOpcoes(n): string`, `textoVerNoCardapio(n): string`.
- Produces (fixture): `CATALOGO_MISTO: Catalogo` com 3 linhas, 11 produtos.

- [ ] **Step 1: Escrever a fixture e os testes**

```ts title="tests/fixtures/catalogo-misto.ts"
import type { Catalogo, Produto } from '@/lib/catalogo'
import { LINHAS } from '@/data/linhas'
import { PRODUTOS } from '@/data/produtos'
import { SELOS } from '@/data/selos'
import { VONTADES } from '@/data/vontades'

/**
 * O cadastro de hoje mais os exemplos do prototipo (bolos inteiros e
 * salgados). Serve para provar que a pagina se adapta sem mudar componente.
 * A foto e emprestada: o que importa aqui e a forma dos dados.
 */
const FOTO = { src: '/produtos/prestigio.webp', alt: 'Foto de teste', largura: 666, altura: 1000 }

const exemplo = (p: Omit<Produto, 'imagem'>): Produto => ({ ...p, imagem: FOTO })

export const CATALOGO_MISTO: Catalogo = {
  linhas: [
    ...LINHAS,
    {
      slug: 'inteiro',
      nome: 'Bolos inteiros',
      tipo: 'Bolo inteiro',
      regra: 'Zero açúcar',
      selos: ['adocante'],
      frase: 'Frase da linha',
      corDoRotulo: 'linho',
      ordem: 2,
    },
    {
      slug: 'salgado',
      nome: 'Salgados',
      tipo: 'Salgado',
      regra: 'Massa integral',
      selos: ['integral', 'sem-conservante'],
      frase: 'Frase da linha',
      corDoRotulo: 'kraft',
      ordem: 3,
    },
  ],
  selos: [
    ...SELOS,
    { id: 'integral', nome: 'Integral' },
    { id: 'sem-conservante', nome: 'Sem conservante' },
  ],
  vontades: [...VONTADES],
  produtos: [
    ...PRODUTOS,
    exemplo({
      slug: 'torta-de-frango',
      nome: 'Torta de frango',
      linha: 'salgado',
      formato: 'unidade',
      selos: ['integral', 'sem-conservante'],
      vontades: ['salgado'],
      ordem: 8,
    }),
    exemplo({
      slug: 'cenoura-com-cacau',
      nome: 'Cenoura com cacau',
      linha: 'inteiro',
      formato: 'inteiro',
      selos: ['zero-acucar'],
      vontades: ['chocolate', 'classico'],
      ordem: 9,
    }),
    exemplo({
      slug: 'quiche-de-alho-poro',
      nome: 'Quiche de alho-poró',
      linha: 'salgado',
      formato: 'unidade',
      selos: ['integral'],
      vontades: ['salgado'],
      ordem: 10,
    }),
    exemplo({
      slug: 'chocolate-com-morango',
      nome: 'Chocolate com morango',
      linha: 'inteiro',
      formato: 'inteiro',
      selos: ['zero-acucar'],
      vontades: ['chocolate', 'fruta'],
      ordem: 11,
    }),
  ],
}
```

```ts title="tests/visao.test.ts"
import { describe, it, expect } from 'vitest'
import { carregarCatalogo, validarCatalogo, type Catalogo } from '@/lib/catalogo'
import { filtrar, montarVisao, FILTRO_VAZIO } from '@/lib/visao'
import {
  contarOpcoes,
  corpoDaPalavra,
  indicePorProgresso,
  listarNomes,
  posicaoDoIndice,
  textoVerNoCardapio,
} from '@/lib/vontade'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'

const slugs = (xs: readonly { slug: string }[]) => xs.map((x) => x.slug)
const copia = (c: Catalogo): Catalogo => JSON.parse(JSON.stringify(c))

describe('montarVisao com o cadastro de hoje', () => {
  it('o destaque é o Prestígio e o palco vai Paçoca, Prestígio, Mousse de maracujá', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.destaque.slug).toBe('prestigio')
    expect(slugs(v.palco)).toEqual(['pacoca', 'prestigio', 'mousse-de-maracuja'])
    expect(v.regraDoDestaque).toBe('Zero açúcar')
  })

  it('não mostra filtro que não filtraria nada', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.filtrosLinha).toEqual([])
    expect(v.filtrosSelo).toEqual([])
    expect(v.linhasNoFinal).toEqual([])
  })

  it('vontades com produto, na ordem do cadastro; Algo salgado some', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.vontades.map((g) => [g.slug, g.produtos.length])).toEqual([
      ['chocolate', 2],
      ['fruta', 3],
      ['coco', 2],
      ['classico', 3],
    ])
    expect(slugs(v.vontades[0].produtos)).toEqual(['prestigio', 'chocolate'])
  })

  it('um rótulo só, e a foto da marca é a do Beijinho', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(slugs(v.rotulos)).toEqual(['pote'])
    expect(v.fotoDaMarca.src).toBe('/produtos/beijinho.webp')
  })

  it('tipos e nomes dos selos por chave', async () => {
    const v = montarVisao(await carregarCatalogo())
    expect(v.tipos.pote).toBe('Bolo no pote')
    expect(v.nomesDosSelos.fibras).toBe('Fonte de fibras')
  })
})

describe('montarVisao com o catálogo misto', () => {
  it('a fixture é um cadastro válido', () => {
    expect(validarCatalogo(CATALOGO_MISTO)).toEqual([])
  })

  it('volta o filtro de linha, com a contagem de cada uma', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(v.filtrosLinha).toEqual([
      { slug: 'pote', nome: 'Bolos no pote', contagem: 7 },
      { slug: 'inteiro', nome: 'Bolos inteiros', contagem: 2 },
      { slug: 'salgado', nome: 'Salgados', contagem: 2 },
    ])
  })

  it('só os selos que alguns têm e outros não', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(v.filtrosSelo.map((s) => s.id)).toEqual(['zero-acucar', 'fibras', 'integral', 'sem-conservante'])
  })

  it('Algo salgado volta, e as linhas aparecem no rótulo e no final', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(v.vontades.at(-1)?.slug).toBe('salgado')
    expect(slugs(v.rotulos)).toEqual(['pote', 'inteiro', 'salgado'])
    expect(slugs(v.linhasNoFinal)).toEqual(['pote', 'inteiro', 'salgado'])
  })

  it('o palco prefere linha ou formato diferente do destaque', () => {
    const v = montarVisao(CATALOGO_MISTO)
    expect(slugs(v.palco)).toEqual(['torta-de-frango', 'prestigio', 'cenoura-com-cacau'])
  })
})

describe('montarVisao nas bordas', () => {
  it('sem destaque marcado, vale o primeiro por ordem', async () => {
    const c = copia(await carregarCatalogo())
    for (const p of c.produtos) delete p.destaque
    c.produtos.reverse()
    expect(montarVisao(c).destaque.slug).toBe('prestigio')
  })

  it('com um produto só, o palco é só ele', async () => {
    const c = copia(await carregarCatalogo())
    c.produtos = c.produtos.slice(0, 1)
    expect(slugs(montarVisao(c).palco)).toEqual(['prestigio'])
  })
})

describe('filtrar', () => {
  const v = montarVisao(CATALOGO_MISTO)

  it('sem filtro, todos', () => {
    expect(filtrar(v.produtos, FILTRO_VAZIO)).toHaveLength(11)
  })

  it('linha, selo e vontade se combinam com E', () => {
    expect(slugs(filtrar(v.produtos, { linha: 'inteiro', selo: null, vontade: 'fruta' }))).toEqual([
      'chocolate-com-morango',
    ])
    expect(slugs(filtrar(v.produtos, { linha: 'salgado', selo: 'integral', vontade: null }))).toEqual([
      'torta-de-frango',
      'quiche-de-alho-poro',
    ])
  })

  it('combinação sem produto devolve vazio', () => {
    expect(filtrar(v.produtos, { linha: 'salgado', selo: 'fibras', vontade: null })).toEqual([])
  })
})

describe('as contas do Hoje o dia pede', () => {
  it('indicePorProgresso divide o curso em n trechos iguais', () => {
    expect(indicePorProgresso(0, 4)).toBe(0)
    expect(indicePorProgresso(0.24, 4)).toBe(0)
    expect(indicePorProgresso(0.25, 4)).toBe(1)
    expect(indicePorProgresso(0.9999, 4)).toBe(3)
  })

  it('indicePorProgresso nunca sai do intervalo, nem com entrada inválida', () => {
    expect(indicePorProgresso(1, 4)).toBe(3)
    expect(indicePorProgresso(7, 4)).toBe(3)
    expect(indicePorProgresso(-0.5, 4)).toBe(0)
    expect(indicePorProgresso(Number.NaN, 4)).toBe(0)
    expect(indicePorProgresso(0.5, 0)).toBe(0)
  })

  it('posicaoDoIndice mira o meio do trecho de cada vontade', () => {
    expect(posicaoDoIndice(0, 4, 1000, 2000)).toBe(1250)
    expect(posicaoDoIndice(3, 4, 1000, 2000)).toBe(2750)
  })

  it('listarNomes junta com vírgula e "e"', () => {
    expect(listarNomes(['Prestígio'])).toBe('Prestígio')
    expect(listarNomes(['Prestígio', 'Chocolate'])).toBe('Prestígio e Chocolate')
    expect(listarNomes(['A', 'B', 'C'])).toBe('A, B e C')
    expect(listarNomes([])).toBe('')
  })

  it('corpoDaPalavra encolhe a palavra longa para caber na coluna', () => {
    expect(corpoDaPalavra(5)).toBe('min(112px, 27.74vw)')
    expect(corpoDaPalavra(12)).toBe('min(83px, 11.56vw)')
    expect(corpoDaPalavra(27)).toBe('min(37px, 5.14vw)')
  })

  it('textos de quantidade no singular e no plural', () => {
    expect(contarOpcoes(1)).toBe('1 opção')
    expect(contarOpcoes(3)).toBe('3 opções')
    expect(textoVerNoCardapio(1)).toBe('Ver no cardápio')
    expect(textoVerNoCardapio(3)).toBe('Ver as 3 no cardápio')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/visao.test.ts`
Expected: FAIL ("Cannot find module '@/lib/visao'").

- [ ] **Step 3: Implementar**

```ts title="src/lib/visao.ts"
import type { Catalogo, ImagemProduto, Linha, Produto } from '@/lib/catalogo'

/**
 * A visao: o que a pagina mostra, decidido uma vez, no servidor, a partir do
 * cadastro. Funcao pura e sem import de valor (so de tipo), para o cliente
 * poder usar `filtrar` e `FILTRO_VAZIO` sem puxar o cadastro junto.
 */

export type Filtro = { linha: string | null; selo: string | null; vontade: string | null }

export const FILTRO_VAZIO: Filtro = { linha: null, selo: null, vontade: null }

export type OpcaoLinha = { slug: string; nome: string; contagem: number }
export type OpcaoSelo = { id: string; nome: string }
export type GrupoVontade = { slug: string; palavra: string; produtos: Produto[] }

export type Visao = {
  /** todos, por ordem */
  produtos: Produto[]
  destaque: Produto
  /** da esquerda para a direita, o destaque no meio */
  palco: Produto[]
  /** a regra da linha do destaque, no selo do hero */
  regraDoDestaque: string
  /** slug da linha para o tipo no singular */
  tipos: Record<string, string>
  /** id do selo para o nome */
  nomesDosSelos: Record<string, string>
  /** vazio quando ha menos de 2 linhas com produto */
  filtrosLinha: OpcaoLinha[]
  /** so os selos que alguns produtos tem e outros nao */
  filtrosSelo: OpcaoSelo[]
  /** so as vontades com produto */
  vontades: GrupoVontade[]
  /** as linhas com produto, por ordem */
  rotulos: Linha[]
  /** as mesmas, so quando ha 2 ou mais */
  linhasNoFinal: Linha[]
  fotoDaMarca: ImagemProduto
}

const porOrdem = (a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem

export function montarVisao(c: Catalogo): Visao {
  const produtos = [...c.produtos].sort(porOrdem)
  const destaque = produtos.find((p) => p.destaque) ?? produtos[0]

  // As laterais mostram o alcance do cardapio: primeiro quem e de outra linha
  // ou outro formato, depois o resto, sempre por ordem.
  const outros = produtos.filter((p) => p.slug !== destaque.slug)
  const diferente = (p: Produto) => p.linha !== destaque.linha || p.formato !== destaque.formato
  const laterais = [...outros.filter(diferente), ...outros.filter((p) => !diferente(p))].slice(0, 2)
  const palco = laterais.length === 0 ? [destaque] : [laterais[0], destaque, ...laterais.slice(1)]

  const contar = (pred: (p: Produto) => boolean) => produtos.filter(pred).length

  const rotulos = [...c.linhas].sort(porOrdem).filter((l) => produtos.some((p) => p.linha === l.slug))
  const filtrosLinha =
    rotulos.length >= 2
      ? rotulos.map((l) => ({ slug: l.slug, nome: l.nome, contagem: contar((p) => p.linha === l.slug) }))
      : []

  const filtrosSelo = c.selos
    .filter((s) => {
      const n = contar((p) => p.selos.includes(s.id))
      return n > 0 && n < produtos.length
    })
    .map((s) => ({ id: s.id, nome: s.nome }))

  const vontades = [...c.vontades]
    .sort(porOrdem)
    .map((v) => ({
      slug: v.slug,
      palavra: v.palavra,
      produtos: produtos.filter((p) => p.vontades.includes(v.slug)),
    }))
    .filter((g) => g.produtos.length > 0)

  return {
    produtos,
    destaque,
    palco,
    regraDoDestaque: c.linhas.find((l) => l.slug === destaque.linha)?.regra ?? '',
    tipos: Object.fromEntries(c.linhas.map((l) => [l.slug, l.tipo])),
    nomesDosSelos: Object.fromEntries(c.selos.map((s) => [s.id, s.nome])),
    filtrosLinha,
    filtrosSelo,
    vontades,
    rotulos,
    linhasNoFinal: rotulos.length >= 2 ? rotulos : [],
    fotoDaMarca: (produtos.find((p) => p.slug === 'beijinho') ?? destaque).imagem,
  }
}

/** Linha, selo e vontade com E; `null` nao filtra aquela dimensao. */
export function filtrar(produtos: readonly Produto[], f: Filtro): Produto[] {
  return produtos.filter(
    (p) =>
      (f.linha === null || p.linha === f.linha) &&
      (f.selo === null || p.selos.includes(f.selo)) &&
      (f.vontade === null || p.vontades.includes(f.vontade)),
  )
}
```

```ts title="src/lib/vontade.ts"
/**
 * As contas do Hoje o dia pede. O trilho da secao pinada e dividido em n
 * trechos iguais, um por vontade.
 */

/** Qual vontade o progresso da rolagem (0 a 1) escolhe. */
export function indicePorProgresso(progresso: number, n: number): number {
  if (n <= 0 || !Number.isFinite(progresso)) return 0
  const p = Math.min(0.9999, Math.max(0, progresso))
  return Math.min(n - 1, Math.floor(p * n))
}

/** O scrollY que poe a vontade i no meio do trecho dela. */
export function posicaoDoIndice(i: number, n: number, topo: number, curso: number): number {
  return topo + (curso * (i + 0.5)) / n
}

/** "A", "A e B", "A, B e C". */
export function listarNomes(nomes: readonly string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? ''
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

/** O corpo cai conforme o numero de letras, para a palavra caber na coluna. */
export function corpoDaPalavra(letras: number): string {
  const px = Math.min(112, Math.round(1000 / letras))
  const vw = (86 / (letras * 0.62)).toFixed(2)
  return `min(${px}px, ${vw}vw)`
}

export function contarOpcoes(n: number): string {
  return n === 1 ? '1 opção' : `${n} opções`
}

export function textoVerNoCardapio(n: number): string {
  return n === 1 ? 'Ver no cardápio' : `Ver as ${n} no cardápio`
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/visao.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib tests
git commit -m "feat: visao do catalogo e as contas do Hoje o dia pede"
```

---

### Task 4: Rolagem, filtro e ganchos

**Files:**
- Modify: `src/components/RolagemSuave.tsx`, `src/app/layout.tsx`
- Create: `src/components/FiltroProvider.tsx`, `src/components/ui/useNaTela.ts`, `src/components/ui/useTrava.ts`, `tests/fixtures/sonda.tsx`, `tests/providers.test.tsx`

**Interfaces:**
- Consumes: `Filtro`, `FILTRO_VAZIO` de `@/lib/visao`.
- Produces: `RolagemSuave({ children })`, `useRolagem(): { rolarPara(y: number, opcoes?: { aoTerminar?: () => void }): void }`, `DESLOCAMENTO_NAV = -96`; `FiltroProvider({ children })`, `useFiltro(): Filtro & { definir(parcial: Partial<Filtro>): void; limpar(): void }`; `useNaTela<T extends Element>(): readonly [RefObject<T | null>, boolean]`; `useTrava(validadeMs?): { travar(i: number): void; soltar(): void; travada(): boolean }`; `Sonda` (teste) que mostra o filtro como `linha|selo|vontade` com `-` para nulo.

- [ ] **Step 1: Escrever a sonda e os testes**

```tsx title="tests/fixtures/sonda.tsx"
import { useFiltro } from '@/components/FiltroProvider'

/** Mostra o filtro como "linha|selo|vontade" e mexe nele de fora. */
export function Sonda() {
  const f = useFiltro()
  return (
    <div>
      <output data-testid="filtro">{`${f.linha ?? '-'}|${f.selo ?? '-'}|${f.vontade ?? '-'}`}</output>
      <button type="button" onClick={() => f.definir({ vontade: 'chocolate' })}>
        sonda: vontade chocolate
      </button>
      <button type="button" onClick={() => f.definir({ linha: 'pote', selo: 'fibras', vontade: 'fruta' })}>
        sonda: tudo ligado
      </button>
    </div>
  )
}
```

```tsx title="tests/providers.test.tsx"
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FiltroProvider, useFiltro } from '@/components/FiltroProvider'
import { RolagemSuave, useRolagem, DESLOCAMENTO_NAV } from '@/components/RolagemSuave'
import { useNaTela } from '@/components/ui/useNaTela'
import { useTrava } from '@/components/ui/useTrava'
import { Sonda } from './fixtures/sonda'

const matchMediaOriginal = window.matchMedia
afterEach(() => {
  window.matchMedia = matchMediaOriginal
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function reduzirMovimento() {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('reduce'),
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

describe('FiltroProvider', () => {
  it('definir junta o parcial ao que já havia; limpar zera tudo', async () => {
    const user = userEvent.setup()
    function Limpar() {
      const { limpar } = useFiltro()
      return <button type="button" onClick={limpar}>limpar</button>
    }
    render(
      <FiltroProvider>
        <Sonda />
        <Limpar />
      </FiltroProvider>,
    )
    const saida = screen.getByTestId('filtro')
    expect(saida).toHaveTextContent('-|-|-')
    await user.click(screen.getByRole('button', { name: 'sonda: vontade chocolate' }))
    expect(saida).toHaveTextContent('-|-|chocolate')
    await user.click(screen.getByRole('button', { name: 'sonda: tudo ligado' }))
    expect(saida).toHaveTextContent('pote|fibras|fruta')
    await user.click(screen.getByRole('button', { name: 'limpar' }))
    expect(saida).toHaveTextContent('-|-|-')
  })

  it('useFiltro fora do provider é erro de programação', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useFiltro())).toThrow(/FiltroProvider/)
  })
})

describe('RolagemSuave', () => {
  it('o deslocamento da âncora é o da nav nova: 12 + 64 + 20', () => {
    expect(DESLOCAMENTO_NAV).toBe(-96)
  })

  it('com movimento reduzido não há Lenis: rolarPara usa o scroll nativo e avisa o fim', () => {
    reduzirMovimento()
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const aoTerminar = vi.fn()
    const { result } = renderHook(() => useRolagem(), {
      wrapper: ({ children }) => <RolagemSuave>{children}</RolagemSuave>,
    })
    result.current.rolarPara(1234, { aoTerminar })
    expect(rolar).toHaveBeenCalledWith({ top: 1234 })
    expect(aoTerminar).toHaveBeenCalledOnce()
  })

  it('sem provider, rolarPara também funciona (scroll nativo)', () => {
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { result } = renderHook(() => useRolagem())
    result.current.rolarPara(10)
    expect(rolar).toHaveBeenCalledWith({ top: 10 })
  })
})

describe('useNaTela', () => {
  it('liga uma vez quando o elemento entra na tela e para de observar', () => {
    let avisar: (entradas: { isIntersecting: boolean }[]) => void = () => {}
    const desligar = vi.fn()
    class IOFalso {
      constructor(cb: typeof avisar) {
        avisar = cb
      }
      observe() {}
      disconnect = desligar
    }
    vi.stubGlobal('IntersectionObserver', IOFalso)

    function Caixa() {
      const [ref, visto] = useNaTela<HTMLDivElement>()
      return <div ref={ref} data-testid="caixa" className={visto ? 'play' : ''} />
    }
    render(<Caixa />)
    const caixa = screen.getByTestId('caixa')
    expect(caixa).not.toHaveClass('play')
    act(() => avisar([{ isIntersecting: false }]))
    expect(caixa).not.toHaveClass('play')
    act(() => avisar([{ isIntersecting: true }]))
    expect(caixa).toHaveClass('play')
    expect(desligar).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('useTrava', () => {
  it('trava, solta pelo aviso de fim, e solta sozinha quando o aviso nunca vem', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTrava(1600))
    expect(result.current.travada()).toBe(false)

    result.current.travar(2)
    expect(result.current.travada()).toBe(true)
    result.current.soltar()
    expect(result.current.travada()).toBe(false)

    result.current.travar(3)
    vi.advanceTimersByTime(1599)
    expect(result.current.travada()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(result.current.travada()).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/providers.test.tsx`
Expected: FAIL ("Cannot find module '@/components/FiltroProvider'").

- [ ] **Step 3: Implementar**

```tsx title="src/components/FiltroProvider.tsx"
'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { FILTRO_VAZIO, type Filtro } from '@/lib/visao'

/**
 * O filtro do cardapio, compartilhado. E o que deixa o "Ver as 3 no
 * cardapio" do Hoje o dia pede, as pilulas do Final e os links do Rodape
 * filtrarem o cardapio de outra secao sem mexer em DOM.
 */
type ContextoFiltro = Filtro & {
  definir: (parcial: Partial<Filtro>) => void
  limpar: () => void
}

const Contexto = createContext<ContextoFiltro | null>(null)

export function FiltroProvider({ children }: { children: ReactNode }) {
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_VAZIO)
  const definir = useCallback(
    (parcial: Partial<Filtro>) => setFiltro((atual) => ({ ...atual, ...parcial })),
    [],
  )
  const limpar = useCallback(() => setFiltro(FILTRO_VAZIO), [])
  const valor = useMemo(() => ({ ...filtro, definir, limpar }), [filtro, definir, limpar])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useFiltro(): ContextoFiltro {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useFiltro precisa de um FiltroProvider acima')
  return contexto
}
```

```ts title="src/components/ui/useNaTela.ts"
'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Liga uma vez, quando o elemento entra na tela, e para de observar.
 *
 * Quem usa poe a classe `play` com o booleano; o estado escondido de antes
 * do `play` mora em src/app/estilos/movimento.css, atras de `html.js`. No
 * servidor `visto` e falso e a classe nao existe, mas sem JS o portao
 * `html.js` tambem nao existe, entao nada fica escondido.
 */
export function useNaTela<T extends Element>() {
  const ref = useRef<T>(null)
  const [visto, setVisto] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visto) return
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisto(true)
          observador.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [visto])

  return [ref, visto] as const
}
```

```ts title="src/components/ui/useTrava.ts"
'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Trava com validade.
 *
 * Segura a selecao do Hoje o dia pede enquanto o Lenis rola ate a vontade
 * escolhida, para a palavra nao passar pelas vontades do meio. Solta pelo
 * aviso de fim da rolagem, e solta sozinha depois de `validadeMs`, porque o
 * Lenis nao chama o onComplete quando a pessoa interrompe a rolagem com a
 * roda: sem a validade, a secao ficaria surda a rolagem para sempre.
 */
export function useTrava(validadeMs = 1600) {
  const destino = useRef<number | null>(null)
  const relogio = useRef<number | undefined>(undefined)

  const soltar = useCallback(() => {
    window.clearTimeout(relogio.current)
    destino.current = null
  }, [])

  const travar = useCallback(
    (i: number) => {
      window.clearTimeout(relogio.current)
      destino.current = i
      relogio.current = window.setTimeout(() => {
        destino.current = null
      }, validadeMs)
    },
    [validadeMs],
  )

  const travada = useCallback(() => destino.current !== null, [])

  useEffect(() => () => window.clearTimeout(relogio.current), [])

  return { travar, soltar, travada }
}
```

```tsx title="src/components/RolagemSuave.tsx"
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import Lenis from 'lenis'

/**
 * A rolagem que desliza, igual a da referencia (o lunarossa.framer.website
 * roda esta mesma biblioteca).
 *
 * O Lenis nao sequestra o scroll com transform num wrapper: ele move o
 * scrollTop real do documento, um frame por vez. Isso mantem intactos
 * `position: sticky` (a nav e o Hoje o dia pede dependem disso),
 * `getBoundingClientRect` e o `useScroll` do Motion.
 *
 * Alem de ligar o Lenis, oferece `useRolagem().rolarPara`, para quem precisa
 * rolar ate um ponto exato (as abas do Hoje o dia pede).
 */

/** Nav: 12px de `top-3` + 64px de altura + 20 de folga. O mesmo numero do
 *  `scroll-mt-24` das secoes, que continua sendo o caminho sem JavaScript. */
export const DESLOCAMENTO_NAV = -96

type OpcoesRolagem = { aoTerminar?: () => void }
type Rolagem = { rolarPara: (y: number, opcoes?: OpcoesRolagem) => void }

/** Sem Lenis (movimento reduzido, ou antes de montar): salto nativo. */
function rolarNativo(y: number, opcoes?: OpcoesRolagem) {
  window.scrollTo({ top: y })
  opcoes?.aoTerminar?.()
}

const ContextoRolagem = createContext<Rolagem>({ rolarPara: rolarNativo })

export function useRolagem(): Rolagem {
  return useContext(ContextoRolagem)
}

/**
 * A ancora e conduzida aqui, e nao pela opcao `anchors` do Lenis, por dois
 * motivos concretos:
 *
 * 1. O `onClick` do Lenis nao chama preventDefault. A acao default do
 *    navegador roda depois dele e salta pro alvo na hora; no frame seguinte
 *    o Lenis reescreve a posicao interpolada dele e a pagina pula pro
 *    destino, volta pro inicio e so entao desliza.
 * 2. Foco. Prevenindo o default, o navegador deixa de mover o foco de
 *    teclado pro alvo, e o "Pular para o conteudo" viraria um link que rola a
 *    tela e nao leva ninguem a lugar nenhum. Como o default e nosso, o foco
 *    tambem tem que ser.
 */
function conduzirAncora(lenis: Lenis, evento: MouseEvent) {
  if (evento.defaultPrevented || evento.button !== 0) return
  if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return

  const alcancado = evento.target
  if (!(alcancado instanceof Element)) return
  const link = alcancado.closest('a[href]')
  if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return

  const url = new URL(link.href)
  const aqui = new URL(window.location.href)
  if (url.host !== aqui.host || url.pathname !== aqui.pathname) return
  if (!url.hash || url.hash === '#') return

  const alvo = document.querySelector(decodeURIComponent(url.hash))
  if (!(alvo instanceof HTMLElement)) return

  evento.preventDefault()
  window.history.pushState(null, '', url.hash)
  lenis.scrollTo(alvo, { offset: DESLOCAMENTO_NAV })

  // tabindex -1 temporario: deixa-lo no DOM poria os alvos numa ordem de
  // tabulacao que ninguem pediu. preventScroll e obrigatorio: sem ele o
  // navegador rola pro elemento focado e atropela a interpolacao do Lenis.
  const jaFocavel = alvo.matches('a[href], button, input, select, textarea, [tabindex]')
  if (!jaFocavel) {
    alvo.setAttribute('tabindex', '-1')
    alvo.addEventListener('blur', () => alvo.removeAttribute('tabindex'), { once: true })
  }
  alvo.focus({ preventScroll: true })
}

export function RolagemSuave({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    let aoClicar: ((evento: MouseEvent) => void) | null = null

    const desmontar = () => {
      if (aoClicar) document.removeEventListener('click', aoClicar)
      aoClicar = null
      lenisRef.current?.destroy()
      lenisRef.current = null
    }

    const sincronizar = () => {
      // Sob prefers-reduced-motion a instancia nao existe: a rolagem volta a
      // ser a nativa e a ancora volta a ser a do navegador (o `scroll-mt-24`
      // das secoes cuida do deslocamento). Destruir em vez de `stop()`, que
      // congelaria a pagina em vez de libera-la.
      if (consulta.matches) return desmontar()
      if (lenisRef.current) return

      const lenis = new Lenis({
        autoRaf: true,
        autoToggle: true,
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
      })
      lenisRef.current = lenis
      aoClicar = (evento) => conduzirAncora(lenis, evento)
      document.addEventListener('click', aoClicar)
    }

    sincronizar()
    consulta.addEventListener('change', sincronizar)
    return () => {
      consulta.removeEventListener('change', sincronizar)
      desmontar()
    }
  }, [])

  const rolarPara = useCallback((y: number, opcoes?: OpcoesRolagem) => {
    const lenis = lenisRef.current
    if (!lenis) return rolarNativo(y, opcoes)
    lenis.scrollTo(y, { onComplete: () => opcoes?.aoTerminar?.() })
  }, [])

  const valor = useMemo(() => ({ rolarPara }), [rolarPara])
  return <ContextoRolagem.Provider value={valor}>{children}</ContextoRolagem.Provider>
}
```

Em `src/app/layout.tsx`, o `<body>` passa a ser:

```tsx
      <body>
        <RolagemSuave>
          <a
            href="#conteudo"
            className="superficie-escura sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-expresso focus:px-5 focus:py-3 focus:text-sm focus:text-creme"
          >
            Pular para o conteúdo
          </a>
          {children}
        </RolagemSuave>
      </body>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: rolarPara no RolagemSuave, FiltroProvider, useNaTela e useTrava"
```

---

### Task 5: Peças (botão, pílula, link, camadas, selo) e o CSS de movimento

**Files:**
- Create: `src/components/ui/BotaoRetro.tsx`, `src/components/ui/Pilula.tsx`, `src/components/ui/LinkSublinhado.tsx`, `src/components/ui/Camadas.tsx`, `src/components/ui/SeloCarimbo.tsx`, `src/components/ui/ComAmo.tsx`, `src/app/estilos/pecas.css`, `src/app/estilos/movimento.css`, `tests/ui.test.tsx`, `tests/movimento.test.ts`
- Modify: `src/app/globals.css` (imports)

**Interfaces:**
- Consumes: `useNaTela` (Task 4).
- Produces: `BotaoRetro(props: ComponentProps<'a'> & { escuro?: boolean; compacto?: boolean })`; `Pilula(props: ComponentProps<'button'> & { variante?: 'padrao' | 'selo' | 'clara'; ativa?: boolean })`; `PilulaLink(props: ComponentProps<'a'> & mesmas extras)`; `LinkSublinhado(props: ComponentProps<'a'> & { traco?: 0 | 1 | 2 })`; `Camadas({ estrato }: { estrato: 'heroCardapio' | 'cardapioHoje' | 'hojeRotulos' | 'rotulosMarca' })`; `SeloCarimbo({ texto })`; `ComAmo({ texto })`.

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/ui.test.tsx"
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { Pilula, PilulaLink } from '@/components/ui/Pilula'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { Camadas } from '@/components/ui/Camadas'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import { ComAmo } from '@/components/ui/ComAmo'

describe('BotaoRetro', () => {
  it('é um link cujo nome não inclui o coração decorativo', () => {
    render(<BotaoRetro href="#cardapio">Ver o cardápio</BotaoRetro>)
    const link = screen.getByRole('link', { name: 'Ver o cardápio' })
    expect(link).toHaveAttribute('href', '#cardapio')
    expect(link).toHaveClass('btn-retro')
    expect(link.querySelector('[aria-hidden="true"]')).toHaveTextContent('♥')
  })

  it('escuro e compacto são classes, nada mais', () => {
    render(
      <BotaoRetro href="#cardapio" escuro compacto className="extra">
        Ver cardápio
      </BotaoRetro>,
    )
    expect(screen.getByRole('link')).toHaveClass('btn-retro', 'btn-retro--escuro', 'btn-retro--compacto', 'extra')
  })
})

describe('Pilula', () => {
  it('é botão de verdade e repassa o estado', () => {
    render(
      <Pilula aria-pressed={true} variante="selo">
        Integral
      </Pilula>,
    )
    const botao = screen.getByRole('button', { name: 'Integral' })
    expect(botao).toHaveAttribute('type', 'button')
    expect(botao).toHaveAttribute('aria-pressed', 'true')
    expect(botao).toHaveClass('pilula', 'pilula--selo')
  })

  it('PilulaLink é link, e ativa vira classe', () => {
    render(
      <PilulaLink href="#cardapio" variante="clara" ativa>
        Bolos no pote
      </PilulaLink>,
    )
    expect(screen.getByRole('link', { name: 'Bolos no pote' })).toHaveClass('pilula', 'pilula--clara', 'ativa')
  })
})

describe('LinkSublinhado', () => {
  it('o traço é decorativo e mede 1, para o dasharray "1 2" esconder sem sobrar ponto', () => {
    const { container } = render(<LinkSublinhado href="#hoje">Hoje o dia pede</LinkSublinhado>)
    expect(screen.getByRole('link', { name: 'Hoje o dia pede' })).toHaveAttribute('href', '#hoje')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('path')).toHaveAttribute('pathLength', '1')
  })
})

describe('Camadas', () => {
  it('o estrato do hero tem três camadas sobre expresso', () => {
    const { container } = render(<Camadas estrato="heroCardapio" />)
    const raiz = container.firstElementChild as HTMLElement
    expect(raiz).toHaveAttribute('aria-hidden', 'true')
    expect(raiz.querySelectorAll('svg')).toHaveLength(3)
    // var() lido do HTML do servidor: o CSSOM do jsdom nem sempre aceita var()
    const html = renderToString(<Camadas estrato="heroCardapio" />)
    expect(html).toContain('background-color:var(--color-expresso)')
    expect(html).toContain('fill:var(--color-cobre)')
  })

  it.each(['cardapioHoje', 'hojeRotulos', 'rotulosMarca'] as const)('%s tem uma camada', (estrato) => {
    const { container } = render(<Camadas estrato={estrato} />)
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })
})

describe('SeloCarimbo', () => {
  it('mostra o texto do selo', () => {
    render(<SeloCarimbo texto="Zero açúcar" />)
    expect(screen.getByText('Zero açúcar')).toBeInTheDocument()
  })
})

describe('ComAmo', () => {
  it('blinda o AMO contra tradução automática e mantém o resto do texto', () => {
    const { container } = render(
      <p>
        <ComAmo texto="Como aproveitar seu AMO, por seu AMO" />
      </p>,
    )
    expect(container.textContent).toBe('Como aproveitar seu AMO, por seu AMO')
    const blindados = container.querySelectorAll('span[translate="no"]')
    expect(blindados).toHaveLength(2)
    for (const b of blindados) expect(b).toHaveTextContent('AMO')
  })

  it('não confunde AMO com amora', () => {
    const { container } = render(<ComAmo texto="Amora e AMOR" />)
    expect(container.querySelectorAll('span[translate="no"]')).toHaveLength(0)
  })
})
```

```ts title="tests/movimento.test.ts"
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Guardas estaticos do CSS. O hero em branco da v1.1 nasceu de estado
 * inicial escondido que podia ficar preso; aqui a forma do CSS impede isso:
 * todo estado escondido mora num arquivo so, atras de `html.js` e de
 * prefers-reduced-motion: no-preference.
 */
const pasta = resolve(import.meta.dirname, '../src/app/estilos')
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const ler = (nome: string) => semComentarios(readFileSync(resolve(pasta, nome), 'utf8'))
const KEYFRAMES = /@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g

const movimento = ler('movimento.css')
const outros = readdirSync(pasta)
  .filter((n) => n.endsWith('.css') && n !== 'movimento.css')
  .map((n) => ({ nome: n, css: ler(n) }))
const globais = semComentarios(readFileSync(resolve(pasta, '../globals.css'), 'utf8'))
const todos = [{ nome: 'movimento.css', css: movimento }, { nome: 'globals.css', css: globais }, ...outros]

function blocoDoPortao(): string {
  const resto = movimento.replace(KEYFRAMES, '').trim()
  const m = resto.match(/^@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*)\}$/)
  expect(m, 'fora dos @keyframes, movimento.css só pode ter o bloco no-preference').toBeTruthy()
  return m![1]
}

describe('movimento.css', () => {
  it('só tem @keyframes e um único bloco prefers-reduced-motion: no-preference', () => {
    blocoDoPortao()
  })

  it('toda regra do bloco começa por html.js', () => {
    const regras = [...blocoDoPortao().matchAll(/([^{}]+)\{[^{}]*\}/g)]
    expect(regras.length).toBeGreaterThan(10)
    for (const [, seletores] of regras) {
      for (const s of seletores.split(',')) expect(s.trim(), s).toMatch(/^html\.js /)
    }
  })

  it('os @keyframes só mexem em transform, opacity, clip-path e stroke-dashoffset', () => {
    const permitidas = new Set(['transform', 'opacity', 'clip-path', 'stroke-dashoffset'])
    const quadros = [...movimento.matchAll(KEYFRAMES)]
    expect(quadros.length).toBeGreaterThanOrEqual(10)
    for (const [, nome, corpo] of quadros) {
      for (const [, prop] of corpo.matchAll(/([a-z-]+)\s*:/g)) {
        expect(permitidas.has(prop), `${nome}: ${prop}`).toBe(true)
      }
    }
  })

  it('os outros arquivos não declaram @keyframes', () => {
    for (const { nome, css } of [...outros, { nome: 'globals.css', css: globais }]) {
      expect(css, nome).not.toMatch(/@keyframes/)
    }
  })
})

describe('todo o CSS', () => {
  it('nenhuma animação passa de 2 s somando duração e atraso', () => {
    const segundos = (v: string) => (v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v))
    for (const { nome, css } of todos) {
      for (const [, valor] of css.matchAll(/(?<![-\w])animation:\s*([^;]+);/g)) {
        const tempos = [...valor.matchAll(/(\d*\.?\d+)(ms|s)\b/g)].map((m) => segundos(m[0]))
        expect(tempos.length, `${nome}: ${valor}`).toBeGreaterThan(0)
        expect((tempos[0] ?? 0) + (tempos[1] ?? 0), `${nome}: ${valor}`).toBeLessThanOrEqual(2)
      }
      expect(css, `${nome}: atraso fora do shorthand`).not.toMatch(/animation-delay/)
    }
  })

  it('nada em loop', () => {
    for (const { nome, css } of todos) expect(css, nome).not.toMatch(/infinite/)
  })

  it('cobre puro só é cor de texto no "comer bem." do hero', () => {
    const seletores = outros.flatMap(({ css }) =>
      [...css.matchAll(/([^{}]+)\{[^{}]*?(?<![-\w])color:\s*var\(--color-cobre\)[^{}]*\}/g)].map((m) =>
        m[1].trim(),
      ),
    )
    expect(seletores.filter((s) => s !== '.hero__titulo em')).toEqual([])
  })

  it('efeito de mouse só dentro de @media (hover: hover)', () => {
    for (const { nome, css } of outros) {
      const foraDoHover = css.replace(/@media \(hover: hover\) \{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
      expect(foraDoHover, nome).not.toMatch(/:hover/)
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/ui.test.tsx tests/movimento.test.ts`
Expected: FAIL (módulos e `src/app/estilos` inexistentes).

- [ ] **Step 3: Implementar os componentes**

```tsx title="src/components/ui/ComAmo.tsx"
import { Fragment } from 'react'

/**
 * Texto do cadastro com todo "AMO" blindado contra tradutor automatico:
 * "AMO" e "eu amo" em portugues, e some da marca se o tradutor mexer nele.
 */
export function ComAmo({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/\b(AMO)\b/).map((parte, i) =>
        parte === 'AMO' ? (
          <span key={i} translate="no">
            AMO
          </span>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </>
  )
}
```

```tsx title="src/components/ui/BotaoRetro.tsx"
import type { ComponentProps } from 'react'

type Props = ComponentProps<'a'> & {
  /** expresso com texto creme, para fundo claro */
  escuro?: boolean
  /** a versao da nav */
  compacto?: boolean
}

/**
 * O botao retro: pilula com sombra solida de cobre. No hover (e no foco)
 * desce 2px, a sombra encolhe e um coracao entra; no clique afunda inteiro
 * na propria sombra. O coracao e decoracao e nao entra no nome do link.
 */
export function BotaoRetro({ escuro, compacto, className, children, ...resto }: Props) {
  const classes = [
    'btn-retro',
    escuro && 'btn-retro--escuro',
    compacto && 'btn-retro--compacto',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <a {...resto} className={classes}>
      {children}
      <span className="btn-retro__cor" aria-hidden="true">
        ♥
      </span>
    </a>
  )
}
```

```tsx title="src/components/ui/Pilula.tsx"
import type { ComponentProps } from 'react'

type Extras = {
  /** padrao: contorno expresso. selo: tracejado cobre. clara: para fundo escuro */
  variante?: 'padrao' | 'selo' | 'clara'
  /** cheia sem depender de aria-pressed (a pilula da vontade ativa) */
  ativa?: boolean
}

function classes(variante: Extras['variante'] = 'padrao', ativa = false, extra?: string) {
  return ['pilula', variante !== 'padrao' && `pilula--${variante}`, ativa && 'ativa', extra]
    .filter(Boolean)
    .join(' ')
}

/**
 * A pilula que enche de baixo pra cima. Cheia quando `aria-pressed`,
 * `aria-selected` ou `ativa`; o CSS le o proprio atributo de estado, entao
 * o visual nunca desencontra do que o leitor de tela anuncia.
 */
export function Pilula({ variante, ativa, className, type = 'button', ...resto }: ComponentProps<'button'> & Extras) {
  return <button type={type} {...resto} className={classes(variante, ativa, className)} />
}

export function PilulaLink({ variante, ativa, className, ...resto }: ComponentProps<'a'> & Extras) {
  return <a {...resto} className={classes(variante, ativa, className)} />
}
```

```tsx title="src/components/ui/LinkSublinhado.tsx"
import type { ComponentProps } from 'react'

/** Tres tracos a mao, para os links vizinhos nao sairem iguais. */
const TRACOS = [
  'M2,5 C20,8 40,2 60,6 C78,8 90,3 98,5',
  'M2,6 C25,2 45,8 65,4 C80,1 90,6 98,3',
  'M2,4 C22,7 42,2 62,5 C80,8 90,4 98,6',
] as const

type Props = ComponentProps<'a'> & { traco?: 0 | 1 | 2 }

/**
 * Link com o sublinhado desenhado a mao no hover e no foco.
 *
 * `pathLength=1` normaliza o comprimento do traco; com `stroke-dasharray:
 * 1 2` e `stroke-dashoffset: 1.1` o traco some inteiro, sem sobrar o ponto
 * que um dashoffset de exatamente 1 deixava na ponta arredondada.
 */
export function LinkSublinhado({ traco = 0, className, children, ...resto }: Props) {
  return (
    <a {...resto} className={`link-sub${className ? ` ${className}` : ''}`}>
      {children}
      <svg viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d={TRACOS[traco]} />
      </svg>
    </a>
  )
}
```

```tsx title="src/components/ui/Camadas.tsx"
'use client'

import { useNaTela } from '@/components/ui/useNaTela'

type Cor = 'expresso' | 'cobre' | 'caramelo' | 'creme'
type Estrato = { fundo: Cor; camadas: readonly { cor: Cor; d: string }[] }

/**
 * Os estratos entre secoes: as camadas do bolo vistas pelo vidro do pote.
 * O fundo e a cor da secao de cima; a ultima camada e a cor da de baixo.
 */
export const ESTRATOS = {
  heroCardapio: {
    fundo: 'expresso',
    camadas: [
      { cor: 'cobre', d: 'M0,22 C140,6 250,34 410,22 C590,8 700,38 870,22 C1010,10 1110,30 1200,16 L1200,64 L0,64 Z' },
      { cor: 'caramelo', d: 'M0,32 C160,16 280,44 440,32 C610,18 740,48 900,32 C1030,20 1120,40 1200,28 L1200,64 L0,64 Z' },
      { cor: 'creme', d: 'M0,42 C170,28 300,56 460,44 C630,30 760,58 920,42 C1040,32 1130,50 1200,40 L1200,64 L0,64 Z' },
    ],
  },
  cardapioHoje: {
    fundo: 'creme',
    camadas: [
      { cor: 'caramelo', d: 'M0,30 C180,48 300,14 480,30 C640,44 780,12 960,28 C1060,36 1140,22 1200,30 L1200,64 L0,64 Z' },
    ],
  },
  hojeRotulos: {
    fundo: 'caramelo',
    camadas: [
      { cor: 'expresso', d: 'M0,26 C150,40 270,10 450,26 C620,40 760,8 930,24 C1050,34 1130,18 1200,26 L1200,64 L0,64 Z' },
    ],
  },
  rotulosMarca: {
    fundo: 'expresso',
    camadas: [
      { cor: 'creme', d: 'M0,34 C170,18 290,46 460,32 C630,18 770,48 940,32 C1060,22 1140,40 1200,30 L1200,64 L0,64 Z' },
    ],
  },
} as const satisfies Record<string, Estrato>

/**
 * As camadas assentam com mola quando o divisor entra na tela. `fill` vai
 * por style porque var() em atributo de apresentacao do SVG nao e confiavel
 * entre navegadores.
 */
export function Camadas({ estrato }: { estrato: keyof typeof ESTRATOS }) {
  const { fundo, camadas } = ESTRATOS[estrato]
  const [ref, visto] = useNaTela<HTMLDivElement>()
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`camadas${visto ? ' play' : ''}`}
      style={{ backgroundColor: `var(--color-${fundo})` }}
    >
      {camadas.map((c) => (
        <svg key={c.d} viewBox="0 0 1200 64" preserveAspectRatio="none">
          <path d={c.d} style={{ fill: `var(--color-${c.cor})` }} />
        </svg>
      ))}
    </div>
  )
}
```

```tsx title="src/components/ui/SeloCarimbo.tsx"
/**
 * O selo redondo de cobre, girado, com anel tracejado. No hover recarimba e
 * o anel gira. Texto de verdade (nao aria-hidden): e a regra da linha.
 */
export function SeloCarimbo({ texto }: { texto: string }) {
  return (
    <p className="selo-carimbo">
      <span>{texto}</span>
    </p>
  )
}
```

- [ ] **Step 4: Implementar o CSS das peças e o de movimento**

```css title="src/app/estilos/pecas.css"
/* Pecas da home v2. Camada `components`: utilitario do Tailwind ainda pode
   ajustar layout por cima. Efeito de mouse so dentro de @media (hover:
   hover); o mesmo efeito vale em :focus-visible no que e focavel. */
@layer components {
  .wrap { max-width: 1240px; margin-inline: auto; padding-inline: var(--gutter); }

  .rotulo-secao { margin: 0; font-size: 15px; font-weight: 700; color: var(--color-cobre-texto); }
  .superficie-escura .rotulo-secao { color: var(--color-caramelo); }
  .titulo-secao { margin-top: 12px; font-size: clamp(40px, 5vw, 60px); line-height: 1.02; }
  .texto { margin: 16px 0 0; max-width: 46ch; font-size: 18px; line-height: 1.65; color: var(--color-suave); }

  .grao {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .17 0 0 0 0 .11 0 0 0 0 .08 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* botao retro */
  .btn-retro {
    display: inline-flex; align-items: center; gap: 0; min-height: 44px;
    padding: 15px 30px; border-radius: 999px;
    background: var(--color-creme); color: var(--color-expresso);
    font: 700 17px/1.2 var(--font-sans); text-decoration: none; white-space: nowrap;
    box-shadow: 0 5px 0 var(--color-cobre); cursor: pointer;
    transition: transform .14s ease, box-shadow .14s ease, gap .3s var(--ease-amo);
  }
  .btn-retro--escuro { background: var(--color-expresso); color: var(--color-creme); }
  .btn-retro--compacto { padding: 11px 20px; font-size: 15px; box-shadow: 0 4px 0 var(--color-cobre); }
  .btn-retro__cor {
    display: inline-block; width: 0; overflow: hidden; color: var(--color-vinho); transform: scale(0);
    transition: transform .35s cubic-bezier(.34, 1.6, .64, 1), width .3s var(--ease-amo);
  }
  .btn-retro--escuro .btn-retro__cor { color: var(--color-caramelo); }
  .btn-retro:focus-visible { transform: translateY(2px); box-shadow: 0 3px 0 var(--color-cobre); gap: 9px; }
  .btn-retro:focus-visible .btn-retro__cor { width: 16px; transform: scale(1); }
  @media (hover: hover) {
    .btn-retro:hover { transform: translateY(2px); box-shadow: 0 3px 0 var(--color-cobre); gap: 9px; }
    .btn-retro:hover .btn-retro__cor { width: 16px; transform: scale(1); }
  }
  .btn-retro:active { transform: translateY(5px); box-shadow: 0 0 0 var(--color-cobre); }
  @media (max-width: 820px) {
    .btn-retro--compacto { padding: 10px 14px; font-size: 14px; }
  }

  /* pilula que enche de baixo */
  .pilula {
    position: relative; isolation: isolate; overflow: hidden;
    display: inline-flex; align-items: center; gap: 6px; min-height: 44px;
    padding: 9px 17px; border: 2px solid var(--color-expresso); border-radius: 999px;
    background: transparent; color: var(--color-expresso);
    font: 600 15.5px/1.2 var(--font-sans); text-decoration: none; cursor: pointer;
    transition: color .3s ease;
  }
  .pilula::before {
    content: ""; position: absolute; inset: -2px; z-index: -1;
    background: var(--color-expresso); border-radius: 40% 40% 0 0 / 30% 30% 0 0;
    transform: translateY(102%);
    transition: transform .42s cubic-bezier(.65, 0, .35, 1), border-radius .42s ease;
  }
  .pilula em { font-style: normal; font-size: 13px; font-weight: 500; }
  .pilula small { font-size: 12px; font-weight: 700; }
  .pilula[aria-pressed="true"], .pilula[aria-selected="true"], .pilula.ativa, .pilula:focus-visible { color: var(--color-creme); }
  .pilula[aria-pressed="true"]::before, .pilula[aria-selected="true"]::before, .pilula.ativa::before, .pilula:focus-visible::before {
    transform: translateY(0); border-radius: 0;
  }
  @media (hover: hover) {
    .pilula:hover { color: var(--color-creme); }
    .pilula:hover::before { transform: translateY(0); border-radius: 0; }
  }
  .pilula--selo { border-style: dashed; border-color: var(--color-cobre); color: var(--color-cobre-texto); }
  .pilula--selo::before { background: var(--color-cobre); }
  .pilula--selo[aria-pressed="true"], .pilula--selo:focus-visible { color: var(--color-expresso); }
  @media (hover: hover) { .pilula--selo:hover { color: var(--color-expresso); } }
  .pilula--clara { border-color: var(--color-creme); color: var(--color-creme); }
  .pilula--clara::before { background: var(--color-creme); }
  .pilula--clara.ativa, .pilula--clara:focus-visible { color: var(--color-expresso); }
  @media (hover: hover) { .pilula--clara:hover { color: var(--color-expresso); } }

  /* link com sublinhado a mao */
  .link-sub { position: relative; display: inline-block; color: inherit; font-size: 15.5px; font-weight: 500; text-decoration: none; cursor: pointer; }
  .link-sub svg { position: absolute; left: -3px; bottom: -9px; width: calc(100% + 6px); height: 9px; overflow: visible; pointer-events: none; }
  .link-sub path {
    fill: none; stroke: var(--color-cobre); stroke-width: 3; stroke-linecap: round;
    stroke-dasharray: 1 2; stroke-dashoffset: 1.1;
    transition: stroke-dashoffset .38s cubic-bezier(.65, 0, .35, 1);
  }
  .link-sub:focus-visible path { stroke-dashoffset: 0; }
  @media (hover: hover) { .link-sub:hover path { stroke-dashoffset: 0; } }

  /* foto em arco: hover decorativo, cursor normal */
  .arco-foto {
    position: relative; overflow: hidden; background: var(--color-chocolate);
    box-shadow: 0 0 0 var(--color-cobre);
    transition: box-shadow .4s var(--ease-amo), transform .4s var(--ease-amo);
  }
  .arco-foto img { width: 100%; height: 100%; object-fit: cover; transition: transform .7s var(--ease-amo); }
  @media (hover: hover) {
    .arco-foto:hover { box-shadow: 10px 10px 0 var(--color-cobre); transform: translate(-5px, -5px); }
    .arco-foto:hover img { transform: scale(1.07); }
  }

  /* selo carimbo */
  .selo-carimbo {
    position: relative; display: grid; place-items: center;
    width: clamp(84px, 10.5vw, 128px); aspect-ratio: 1; margin: 0; padding: 14px;
    border-radius: 50%; background: var(--color-cobre); color: var(--color-expresso);
    font: 400 clamp(15px, 1.8vw, 22px)/1.02 var(--font-display); text-align: center; text-wrap: balance;
    transform: rotate(-10deg);
  }
  .selo-carimbo::before {
    content: ""; position: absolute; inset: 7px; border-radius: 50%;
    border: 1.5px dashed rgb(43 27 22 / .55); transition: transform .9s var(--ease-amo);
  }
  @media (hover: hover) {
    .selo-carimbo:hover { animation: recarimbar .45s cubic-bezier(.2, .8, .3, 1.2); }
    .selo-carimbo:hover::before { transform: rotate(120deg); }
  }

  /* estratos */
  .camadas { position: relative; height: 64px; overflow: hidden; }
  .camadas svg { position: absolute; left: -2%; bottom: 0; width: 104%; height: 100%; }
}
```

```css title="src/app/estilos/movimento.css"
/* Movimento da home v2. Duas partes, nesta ordem, e nada fora delas:
   1. os @keyframes, que so mexem em transform, opacity, clip-path e
      stroke-dashoffset;
   2. um unico bloco prefers-reduced-motion: no-preference, onde toda regra
      comeca por `html.js`.
   Sem JavaScript ou com movimento reduzido nenhuma regra daqui vale, e tudo
   nasce no estado final. Atraso sempre dentro do shorthand. Forma guardada
   por tests/movimento.test.ts. */

@keyframes aparecer { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes subir { from { transform: translateY(108%); } to { transform: none; } }
@keyframes brotar { from { transform: translateY(120%); } to { transform: none; } }
@keyframes carimbar {
  0% { opacity: 0; transform: scale(2.4) rotate(-30deg); }
  65% { opacity: 1; transform: scale(.88) rotate(2deg); }
  100% { opacity: 1; transform: none; }
}
@keyframes recarimbar {
  0% { transform: rotate(-10deg) scale(1); }
  40% { transform: rotate(-4deg) scale(1.12); }
  70% { transform: rotate(-12deg) scale(.94); }
  100% { transform: rotate(-10deg) scale(1); }
}
@keyframes assentar { from { transform: translateY(100%); } to { transform: none; } }
@keyframes encher {
  0% { clip-path: polygon(0 100%, 20% 100%, 40% 100%, 60% 100%, 80% 100%, 100% 100%, 100% 100%, 0 100%); }
  55% { clip-path: polygon(0 50%, 20% 43%, 40% 48%, 60% 40%, 80% 47%, 100% 42%, 100% 100%, 0 100%); }
  100% { clip-path: polygon(0 -6%, 20% -6%, 40% -6%, 60% -6%, 80% -6%, 100% -6%, 100% 100%, 0 100%); }
}
@keyframes sair { to { opacity: 0; transform: translateY(-.45em) rotate(-6deg); } }
@keyframes entrar { from { opacity: 0; transform: translateY(.6em) rotate(8deg); } to { opacity: 1; transform: none; } }
@keyframes desenhar { from { stroke-dashoffset: 1.1; } to { stroke-dashoffset: 0; } }
@keyframes pousar {
  0% { opacity: 0; transform: translateY(-110px) rotate(-8deg); }
  55% { opacity: 1; }
  100% { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: no-preference) {
  /* 1. entrada do hero: comeca sozinha ao carregar */
  html.js .hero__pilula { animation: aparecer .5s ease both; }
  html.js .hero__linha:nth-child(1) > span { animation: subir .8s var(--ease-amo) .1s both; }
  html.js .hero__linha:nth-child(2) > span { animation: subir .8s var(--ease-amo) .2s both; }
  html.js .hero__linha:nth-child(3) > span { animation: subir .8s var(--ease-amo) .3s both; }
  html.js .hero__lead { animation: aparecer .6s ease .45s both; }
  html.js .hero__acoes { animation: aparecer .6s ease .55s both; }
  html.js .palco__item:nth-child(1) { animation: brotar .95s var(--ease-mola) .6s both; }
  html.js .palco__item:nth-child(2) { animation: brotar .95s var(--ease-mola) .68s both; }
  html.js .palco__item:nth-child(3) { animation: brotar .95s var(--ease-mola) .76s both; }
  html.js .palco__selo { animation: carimbar .5s cubic-bezier(.2, .8, .3, 1.15) 1.25s both; }

  /* 2. as camadas assentam ao entrar na tela */
  html.js .camadas:not(.play) svg { transform: translateY(100%); }
  html.js .camadas.play svg:nth-child(1) { animation: assentar 1s var(--ease-mola) both; }
  html.js .camadas.play svg:nth-child(2) { animation: assentar 1s var(--ease-mola) .12s both; }
  html.js .camadas.play svg:nth-child(3) { animation: assentar 1s var(--ease-mola) .24s both; }

  /* 3. o pote enche */
  html.js .liq:not(.play) { clip-path: polygon(0 100%, 20% 100%, 40% 100%, 60% 100%, 80% 100%, 100% 100%, 100% 100%, 0 100%); }
  html.js .liq.play { animation: encher 1.3s cubic-bezier(.45, .05, .2, 1) both; }

  /* 4. a palavra troca (o atraso de cada letra vem inline do componente) */
  html.js .palavra__letra.sai { animation: sair .22s ease-in forwards; }
  html.js .palavra__letra.entra { animation: entrar .55s cubic-bezier(.34, 1.45, .64, 1) both; }
  html.js .palavra__traco.desenha path { animation: desenhar .6s ease .25s both; }
  html.js .hoje__pilha.troca .hoje__mini:nth-child(1) { animation: aparecer .45s var(--ease-mola) both; }
  html.js .hoje__pilha.troca .hoje__mini:nth-child(2) { animation: aparecer .45s var(--ease-mola) .08s both; }

  /* 6. os rotulos pousam na mesa */
  html.js .mesa:not(.play) .mesa__item { opacity: 0; }
  html.js .mesa.play .mesa__item:nth-child(3n+1) { animation: pousar .85s cubic-bezier(.34, 1.3, .64, 1) both; }
  html.js .mesa.play .mesa__item:nth-child(3n+2) { animation: pousar .85s cubic-bezier(.34, 1.3, .64, 1) .1s both; }
  html.js .mesa.play .mesa__item:nth-child(3n) { animation: pousar .85s cubic-bezier(.34, 1.3, .64, 1) .2s both; }
}
```

Em `src/app/globals.css`, logo abaixo de `@import "tailwindcss";`:

```css
@import "./estilos/pecas.css";
@import "./estilos/movimento.css";
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: pecas retro (botao, pilula, link, camadas, selo) e o CSS de movimento"
```

---

### Task 6: Produto (moldura por formato, card, pote que enche)

**Files:**
- Create: `src/components/ui/MolduraProduto.tsx`, `src/components/ui/PoteEnche.tsx`, `src/components/ui/CardProduto.tsx`, `src/app/estilos/produto.css`, `tests/produto.test.tsx`
- Modify: `src/app/globals.css` (import), `src/components/ui/FotoParallax.tsx` (tipo da imagem)

**Interfaces:**
- Consumes: `Produto`, `Formato`, `ImagemProduto` (Task 2); `useNaTela` (Task 4); `ComAmo` (Task 5).
- Produces: `classeDoFormato(formato: Formato): 'pote' | 'inteiro' | 'unidade' | 'neutra'`; `MolduraProduto({ formato, nome, children, sobreFoto? })`; `PoteEnche({ children })`; `CardProduto({ produto, tipo, nomesDosSelos })`.

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/produto.test.tsx"
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MolduraProduto, classeDoFormato } from '@/components/ui/MolduraProduto'
import { CardProduto } from '@/components/ui/CardProduto'
import { FotoParallax } from '@/components/ui/FotoParallax'
import { PRODUTOS } from '@/data/produtos'
import type { Produto } from '@/lib/catalogo'

const prestigio = PRODUTOS[0]
const nomes = { 'zero-acucar': 'Zero açúcar', fibras: 'Fonte de fibras' }

describe('classeDoFormato', () => {
  it.each([
    ['pote', 'pote'],
    ['inteiro', 'inteiro'],
    ['unidade', 'unidade'],
    ['caixa', 'neutra'],
    ['', 'neutra'],
  ])('%s vira %s', (formato, classe) => {
    expect(classeDoFormato(formato)).toBe(classe)
  })
})

describe('MolduraProduto', () => {
  const montar = (formato: string, nome = 'Prestígio') =>
    render(
      <MolduraProduto formato={formato} nome={nome}>
        <span>foto</span>
      </MolduraProduto>,
    ).container.firstElementChild as HTMLElement

  it('pote: arco com a etiqueta oval, decorativa', () => {
    const raiz = montar('pote')
    expect(raiz).toHaveClass('moldura', 'moldura--pote')
    const etiqueta = raiz.querySelector('.etiqueta')!
    expect(etiqueta).toHaveAttribute('aria-hidden', 'true')
    expect(etiqueta).toHaveTextContent('Prestígio')
  })

  it('nome com mais de 11 letras usa o corpo menor da etiqueta', () => {
    expect(montar('pote', 'Paçoca').querySelector('.etiqueta')).not.toHaveClass('etiqueta--longa')
    expect(montar('pote', 'Ninho com frutas vermelhas').querySelector('.etiqueta')).toHaveClass('etiqueta--longa')
  })

  it('inteiro: círculo com fita', () => {
    const raiz = montar('inteiro', 'Cenoura com cacau')
    expect(raiz).toHaveClass('moldura--inteiro')
    expect(raiz.querySelector('.fita')).toHaveAttribute('aria-hidden', 'true')
  })

  it('unidade: quadrado com carimbo', () => {
    const raiz = montar('unidade', 'Torta de frango')
    expect(raiz).toHaveClass('moldura--unidade')
    expect(raiz.querySelector('.carimbo')).toHaveAttribute('aria-hidden', 'true')
  })

  it('formato desconhecido: moldura neutra, sem acessório', () => {
    const raiz = montar('caixa')
    expect(raiz).toHaveClass('moldura--neutra')
    expect(raiz.querySelector('.etiqueta, .fita, .carimbo')).toBeNull()
    expect(raiz).toHaveTextContent('foto')
  })
})

describe('CardProduto', () => {
  it('mostra tipo, nome em h3, frase, foto com alt e dimensões, e os selos', () => {
    render(<CardProduto produto={prestigio} tipo="Bolo no pote" nomesDosSelos={nomes} />)
    const card = screen.getByRole('article', { name: 'Prestígio' })
    expect(screen.getByRole('heading', { level: 3, name: 'Prestígio' })).toBeInTheDocument()
    expect(card).toHaveTextContent('Bolo no pote')
    expect(card).toHaveTextContent('Um abraço em forma de sobremesa')
    const foto = screen.getByAltText(prestigio.imagem.alt)
    expect(foto).toHaveAttribute('width', '666')
    expect(foto).toHaveAttribute('height', '1000')
    expect(foto).toHaveAttribute('loading', 'lazy')
    const selos = screen.getByRole('list', { name: 'Selos' })
    expect(selos).toHaveTextContent('Zero açúcar')
    expect(selos).toHaveTextContent('Fonte de fibras')
  })

  it('sem frase, sem parágrafo de frase', () => {
    const semFrase: Produto = { ...prestigio, frase: undefined }
    const { container } = render(<CardProduto produto={semFrase} tipo="Bolo no pote" nomesDosSelos={nomes} />)
    expect(container.querySelector('.card-produto__frase')).toBeNull()
  })

  it('formato desconhecido não quebra o card', () => {
    const caixa: Produto = { ...prestigio, formato: 'caixa' }
    const { container } = render(<CardProduto produto={caixa} tipo="Bolo no pote" nomesDosSelos={nomes} />)
    expect(container.querySelector('.moldura--neutra')).toBeInTheDocument()
  })

  it('a foto entra num pote que enche (classe liq)', () => {
    const { container } = render(<CardProduto produto={prestigio} tipo="Bolo no pote" nomesDosSelos={nomes} />)
    expect(container.querySelector('.liq img')).toBeInTheDocument()
  })
})

describe('FotoParallax', () => {
  it('marca o miolo que se move com data-parallax', () => {
    const { container } = render(<FotoParallax imagem={prestigio.imagem} sizes="300px" />)
    expect(container.querySelector('[data-parallax] img')).toBeInTheDocument()
  })

  it('lazy por padrão, eager quando pedido, e sem loading quando é preload', () => {
    const { rerender } = render(<FotoParallax imagem={prestigio.imagem} sizes="300px" />)
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy')
    rerender(<FotoParallax imagem={prestigio.imagem} sizes="300px" carregamento="eager" />)
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager')
    rerender(<FotoParallax imagem={prestigio.imagem} sizes="300px" preload />)
    expect(screen.getByRole('img')).not.toHaveAttribute('loading')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/produto.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

```tsx title="src/components/ui/MolduraProduto.tsx"
import type { ReactNode } from 'react'
import type { Formato } from '@/lib/catalogo'

const CONHECIDOS = ['pote', 'inteiro', 'unidade'] as const
type Conhecido = (typeof CONHECIDOS)[number]

/** O formato que o site sabe desenhar; qualquer outro cai na moldura neutra. */
export function classeDoFormato(formato: Formato): Conhecido | 'neutra' {
  return (CONHECIDOS as readonly string[]).includes(formato) ? (formato as Conhecido) : 'neutra'
}

type Props = {
  formato: Formato
  nome: string
  children: ReactNode
  /** o que vai por cima da foto, dentro da janela (os selos do card) */
  sobreFoto?: ReactNode
}

/**
 * A moldura vem da embalagem: arco do pote com etiqueta oval, circulo do
 * bolo inteiro com fita, quadrado da unidade com carimbo kraft. O acessorio
 * repete o nome do h3 e por isso e aria-hidden. Ele fica fora da janela
 * (que recorta a foto) para poder sair da borda.
 */
export function MolduraProduto({ formato, nome, children, sobreFoto }: Props) {
  const classe = classeDoFormato(formato)
  return (
    <div className={`moldura moldura--${classe}`}>
      <div className="moldura__janela">
        {children}
        {sobreFoto}
      </div>
      <Acessorio classe={classe} nome={nome} />
    </div>
  )
}

function Acessorio({ classe, nome }: { classe: Conhecido | 'neutra'; nome: string }) {
  if (classe === 'pote') {
    return (
      <span className={`etiqueta${nome.length > 11 ? ' etiqueta--longa' : ''}`} aria-hidden="true">
        <b>{nome}</b>
        <i>♥</i>
      </span>
    )
  }
  if (classe === 'inteiro') {
    return (
      <span className="fita" aria-hidden="true">
        {nome}
      </span>
    )
  }
  if (classe === 'unidade') {
    return (
      <span className="carimbo" aria-hidden="true">
        {nome}
      </span>
    )
  }
  return null
}
```

```tsx title="src/components/ui/PoteEnche.tsx"
'use client'

import type { ReactNode } from 'react'
import { useNaTela } from '@/components/ui/useNaTela'

/**
 * A foto enche de baixo pra cima, como o pote recebendo a massa, quando
 * entra na tela. Quem quer encher de novo (o Hoje o dia pede, ao trocar de
 * vontade) remonta o componente com outra `key`.
 */
export function PoteEnche({ children }: { children: ReactNode }) {
  const [ref, visto] = useNaTela<HTMLDivElement>()
  return (
    <div ref={ref} className={`liq${visto ? ' play' : ''}`}>
      {children}
    </div>
  )
}
```

```tsx title="src/components/ui/CardProduto.tsx"
import Image from 'next/image'
import type { Produto } from '@/lib/catalogo'
import { ComAmo } from '@/components/ui/ComAmo'
import { MolduraProduto } from '@/components/ui/MolduraProduto'
import { PoteEnche } from '@/components/ui/PoteEnche'

type Props = {
  produto: Produto
  /** o tipo da linha no singular: "Bolo no pote" */
  tipo: string
  nomesDosSelos: Readonly<Record<string, string>>
}

/**
 * O card do cardapio. Hover decorativo (o card nao e clicavel: nao ha pagina
 * de produto), entao sem cursor de mao. Os selos sobem por cima da foto no
 * hover; no toque ficam sempre a mostra.
 */
export function CardProduto({ produto, tipo, nomesDosSelos }: Props) {
  const idTitulo = `produto-${produto.slug}`
  return (
    <article className="card-produto" aria-labelledby={idTitulo}>
      <MolduraProduto
        formato={produto.formato}
        nome={produto.nome}
        sobreFoto={
          produto.selos.length > 0 ? (
            <ul className="selos-foto" aria-label="Selos">
              {produto.selos.map((id) => (
                <li key={id}>{nomesDosSelos[id] ?? id}</li>
              ))}
            </ul>
          ) : null
        }
      >
        <PoteEnche>
          <Image
            src={produto.imagem.src}
            alt={produto.imagem.alt}
            width={produto.imagem.largura}
            height={produto.imagem.altura}
            loading="lazy"
            sizes="(max-width: 520px) 50vw, (max-width: 1240px) 33vw, 300px"
            className="moldura__foto"
          />
        </PoteEnche>
      </MolduraProduto>
      <p className="card-produto__tipo">{tipo}</p>
      <h3 id={idTitulo}>{produto.nome}</h3>
      {produto.frase ? (
        <p className="card-produto__frase">
          <ComAmo texto={produto.frase} />
        </p>
      ) : null}
    </article>
  )
}
```

```css title="src/app/estilos/produto.css"
/* Moldura por formato e o card do cardapio. */
@layer components {
  .moldura { position: relative; }
  .moldura__janela {
    position: relative; height: 280px; overflow: hidden; background: var(--color-chocolate);
    transition: box-shadow .35s var(--ease-amo);
  }
  .moldura--pote .moldura__janela { border-radius: 999px 999px 22px 22px; }
  .moldura--inteiro .moldura__janela { width: 250px; height: 250px; max-width: 100%; margin: 15px auto; border-radius: 50%; }
  .moldura--unidade .moldura__janela { border-radius: 28px; }
  .moldura--neutra .moldura__janela { border-radius: 16px; }
  .moldura__foto { width: 100%; height: 100%; object-fit: cover; transition: transform .6s var(--ease-amo); }
  .liq { width: 100%; height: 100%; }

  .selos-foto {
    position: absolute; z-index: 2; left: 10px; bottom: 10px;
    display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
    max-width: 62%; margin: 0; padding: 0; list-style: none;
  }
  .selos-foto li {
    padding: 4px 10px; border-radius: 999px; background: rgb(255 251 245 / .95);
    color: var(--color-chocolate); font-size: 12.5px; font-weight: 700;
    transition: opacity .25s ease, transform .35s cubic-bezier(.34, 1.5, .64, 1);
  }
  .selos-foto li:nth-child(2) { transition-delay: .06s; }
  .moldura--inteiro .selos-foto { left: 50%; bottom: 26px; align-items: center; max-width: 80%; transform: translateX(-50%); }

  /* etiqueta oval do pote */
  .etiqueta {
    position: absolute; z-index: 3; right: -8px; top: 152px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    width: 134px; height: 158px; padding: 14px; border-radius: 50%;
    background: var(--color-papel); color: var(--color-expresso); text-align: center;
    box-shadow: 0 12px 26px -12px rgb(43 27 22 / .55), inset 0 0 0 1px rgb(43 27 22 / .12);
    transform: rotate(-8deg);
  }
  .etiqueta::before {
    content: ""; position: absolute; top: 12px; left: 50%; width: 10px; height: 10px; margin-left: -5px;
    border-radius: 50%; background: var(--color-caramelo);
  }
  .etiqueta b { margin-top: 8px; font: 400 17px/1.08 var(--font-display); text-wrap: balance; }
  .etiqueta--longa b { font-size: 13.5px; }
  .etiqueta small { margin-top: 4px; font-size: 13px; font-weight: 700; color: var(--color-cobre-texto); }
  .etiqueta i { margin-top: 4px; font-style: normal; font-size: 12px; color: var(--color-vinho); }

  /* fita do bolo inteiro */
  .fita {
    position: absolute; z-index: 3; left: 50%; top: 226px; padding: 8px 22px;
    background: var(--color-vinho); color: var(--color-papel);
    font: 400 17px/1.2 var(--font-display); white-space: nowrap;
    clip-path: polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%);
    transform: translateX(-50%) rotate(-3deg);
  }

  /* carimbo kraft da unidade */
  .carimbo {
    position: absolute; z-index: 3; left: 14px; top: 200px; padding: 9px 14px; border-radius: 4px;
    background: var(--color-kraft); color: var(--color-expresso); font: 400 17px/1.2 var(--font-display);
    box-shadow: inset 0 0 0 2px rgb(43 27 22 / .25), inset 0 0 0 5px var(--color-kraft), inset 0 0 0 6.5px rgb(43 27 22 / .35);
    transform: rotate(-6deg);
  }

  /* card */
  .card-produto { position: relative; transition: transform .35s var(--ease-amo); }
  .card-produto__tipo { margin: 18px 0 0; font-size: 13.5px; font-weight: 700; color: var(--color-cobre-texto); }
  .card-produto h3 { margin-top: 4px; font-size: 24px; line-height: 1.1; }
  .card-produto__frase { margin: 8px 0 0; font-size: 16px; line-height: 1.5; color: var(--color-suave); }
  @media (hover: hover) {
    .selos-foto li { opacity: 0; transform: translateY(10px); }
    .card-produto:hover { transform: translateY(-6px); }
    .card-produto:hover .moldura__janela { box-shadow: 8px 8px 0 var(--color-caramelo); }
    .card-produto:hover .moldura__foto { transform: scale(1.06); }
    .card-produto:hover .selos-foto li { opacity: 1; transform: none; }
  }

  @media (max-width: 520px) {
    .moldura__janela { height: 210px; }
    .moldura--inteiro .moldura__janela { width: 150px; height: 150px; }
    .etiqueta { top: 118px; width: 100px; height: 120px; padding: 10px; }
    .etiqueta b, .etiqueta--longa b { font-size: 12.5px; }
    .fita { top: 160px; font-size: 14px; }
    .carimbo { top: 150px; font-size: 14px; }
  }
}
```

Em `src/components/ui/FotoParallax.tsx`, trocar o tipo inline da imagem pelo do cadastro: `import type { ImagemProduto } from '@/lib/catalogo'` e `imagem: ImagemProduto`.

Em `src/app/globals.css`, somar `@import "./estilos/produto.css";` depois do `pecas.css`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: moldura por formato, card de produto e o pote que enche"
```

---

### Task 7: Nav e Rodapé (e a página começa a montar)

**Files:**
- Create: `src/components/layout/Nav.tsx`, `src/components/layout/Footer.tsx`, `src/app/estilos/rodape.css`, `tests/layout.test.tsx`
- Modify: `src/app/page.tsx`, `src/app/globals.css` (import)

**Interfaces:**
- Consumes: `BotaoRetro`, `LinkSublinhado` (Task 5); `useFiltro`, `FiltroProvider` (Task 4); `carregarCatalogo` (Task 2); `montarVisao` (Task 3); `Sonda` (Task 4).
- Produces: `Nav()`, `ALTURA_NAV = 64`; `Footer({ linhas: readonly { slug: string; nome: string }[]; filtraLinha: boolean })`; `Home` passa a ser `async`.

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/layout.test.tsx"
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { FiltroProvider } from '@/components/FiltroProvider'
import { Sonda } from './fixtures/sonda'

describe('Nav', () => {
  it('é um landmark de navegação', () => {
    render(<Nav />)
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
  })

  it('leva a Hoje o dia pede, O que é saudável e A marca', () => {
    render(<Nav />)
    for (const [nome, href] of [
      ['Hoje o dia pede', '#hoje'],
      ['O que é saudável', '#rotulos'],
      ['A marca', '#marca'],
    ]) {
      expect(screen.getByRole('link', { name: nome })).toHaveAttribute('href', href)
    }
  })

  it('tem um botão de cardápio só', () => {
    render(<Nav />)
    const cardapio = screen.getAllByRole('link', { name: /card[aá]pio/i })
    expect(cardapio).toHaveLength(1)
    expect(cardapio[0]).toHaveAttribute('href', '#cardapio')
    expect(cardapio[0]).toHaveClass('btn-retro', 'btn-retro--escuro')
  })

  it('todo link é âncora interna válida, inclusive os do menu de celular', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    for (const a of screen.getAllByRole('link')) {
      expect(a.getAttribute('href')).toMatch(/^#[a-z-]+$/)
    }
  })

  it('não tem carrinho, busca nem login, não existem ainda', () => {
    render(<Nav />)
    const rotulos = [...screen.getAllByRole('link'), ...screen.getAllByRole('button')].map((e) =>
      (e.getAttribute('aria-label') ?? e.textContent ?? '').toLowerCase(),
    )
    for (const r of rotulos) expect(r).not.toMatch(/carrinho|sacola|buscar|entrar|login|conta/)
  })

  it('o logo tem o nome da marca e leva ao topo', () => {
    render(<Nav />)
    const logo = screen.getByAltText(/amo/i)
    expect(logo.closest('a')).toHaveAttribute('href', '#topo')
  })

  it('o botão de menu de celular tem aria-label, aria-expanded e aria-controls', () => {
    render(<Nav />)
    const botao = screen.getByRole('button', { name: /menu/i })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao).toHaveAttribute('aria-controls', 'menu-mobile')
  })

  it('opaca desde o primeiro pixel: ao rolar só a sombra muda, a altura nunca', () => {
    render(<Nav />)
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

  it('Esc fecha o menu de celular e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    const botao = screen.getByRole('button', { name: /abrir menu/i })
    const painel = document.getElementById('menu-mobile')!
    await user.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(painel).not.toHaveAttribute('hidden')
    await user.tab()
    expect(document.activeElement).toBe(within(painel).getAllByRole('link')[0])
    await user.keyboard('{Escape}')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(painel).toHaveAttribute('hidden')
    expect(document.activeElement).toBe(botao)
  })

  it('clicar num link do menu de celular fecha o menu e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    const botao = screen.getByRole('button', { name: /abrir menu/i })
    const painel = document.getElementById('menu-mobile')!
    await user.click(botao)
    await user.click(within(painel).getAllByRole('link')[0])
    expect(painel).toHaveAttribute('hidden')
    expect(document.activeElement).toBe(botao)
  })
})

describe('Footer', () => {
  const montar = (filtraLinha: boolean, linhas = [{ slug: 'pote', nome: 'Bolos no pote' }]) =>
    render(
      <FiltroProvider>
        <Footer linhas={linhas} filtraLinha={filtraLinha} />
        <Sonda />
      </FiltroProvider>,
    )

  it('é um landmark contentinfo', () => {
    montar(false)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('lista as linhas com link para o cardápio', () => {
    montar(false)
    const lista = screen.getByRole('list', { name: 'Linhas' })
    expect(within(lista).getByRole('link', { name: 'Bolos no pote' })).toHaveAttribute('href', '#cardapio')
  })

  it('com uma linha só, o link não mexe no filtro (não há filtro de linha na tela)', async () => {
    const user = userEvent.setup()
    montar(false)
    await user.click(screen.getByRole('link', { name: 'Bolos no pote' }))
    expect(screen.getByTestId('filtro')).toHaveTextContent('-|-|-')
  })

  it('com filtro de linha na tela, o link escolhe a linha e limpa selo e vontade', async () => {
    const user = userEvent.setup()
    montar(true, [
      { slug: 'pote', nome: 'Bolos no pote' },
      { slug: 'salgado', nome: 'Salgados' },
    ])
    await user.click(screen.getByRole('button', { name: 'sonda: tudo ligado' }))
    await user.click(screen.getByRole('link', { name: 'Salgados' }))
    expect(screen.getByTestId('filtro')).toHaveTextContent('salgado|-|-')
  })

  it('a coluna A marca leva às seções da página', () => {
    montar(false)
    const lista = screen.getByRole('list', { name: 'A marca' })
    expect(within(lista).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '#marca',
      '#rotulos',
      '#hoje',
    ])
  })

  it('usa placeholder de contato visivelmente falso e avisa que é provisório', () => {
    montar(false)
    expect(screen.getByText('(00) 00000-0000')).toBeInTheDocument()
    expect(screen.getByText(/contato provisório/i)).toBeInTheDocument()
  })

  it('o AMO do copyright está blindado contra tradutor', () => {
    montar(false)
    expect(screen.getByText('AMO')).toHaveAttribute('translate', 'no')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/layout.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

```tsx title="src/components/layout/Nav.tsx"
'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'

const ITENS = [
  { href: '#hoje', rotulo: 'Hoje o dia pede' },
  { href: '#rotulos', rotulo: 'O que é saudável' },
  { href: '#marca', rotulo: 'A marca' },
] as const

/** 12px do `top-3` + 64 de altura + 20 de folga = os 96 do DESLOCAMENTO_NAV
 *  (RolagemSuave) e do `scroll-mt-24` das secoes. */
export const ALTURA_NAV = 64

/**
 * Nav em pilula creme, flutuando sobre o hero. Opaca desde o primeiro
 * pixel; ao rolar muda uma coisa so, a sombra. Um botao de cardapio so: o
 * cliente apontou que "Cardapio" e "Ver cardapio" lado a lado faziam a
 * mesma coisa.
 */
export function Nav() {
  const [rolou, setRolou] = useState(false)
  const [aberto, setAberto] = useState(false)
  const botaoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 40)
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false)
        botaoRef.current?.focus()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto])

  const fechar = () => {
    setAberto(false)
    botaoRef.current?.focus()
  }

  return (
    // pointer-events-none no involucro, auto nos filhos: com a margem
    // negativa ele cobre o topo do hero, e sem isso engoliria clique e hover
    // de tudo que passa por baixo.
    <div
      style={{ marginBottom: -ALTURA_NAV }}
      className="pointer-events-none sticky top-3 z-40 px-[var(--gutter)]"
    >
      <div className="relative mx-auto max-w-[1180px]">
        <nav
          aria-label="Principal"
          style={{ height: ALTURA_NAV }}
          className={
            'pointer-events-auto flex items-center gap-2 rounded-full bg-creme pl-4 pr-2 ' +
            'transition-[box-shadow] duration-300 min-[821px]:gap-[30px] min-[821px]:pl-6 min-[821px]:pr-2.5 ' +
            (rolou ? 'shadow-[0_10px_30px_-12px_rgb(0_0_0_/_0.45)]' : 'shadow-none')
          }
        >
          {/* Dimensoes intrinsecas do arquivo (tests/logo.test.ts guarda os
              dois numeros): com elas a proporcao declarada fecha exata e o
              next/image nao avisa no console. */}
          <a href="#topo" className="shrink-0 rounded-md">
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
            {ITENS.map((item, i) => (
              <li key={item.href}>
                <LinkSublinhado href={item.href} traco={i as 0 | 1 | 2}>
                  {item.rotulo}
                </LinkSublinhado>
              </li>
            ))}
          </ul>

          <BotaoRetro href="#cardapio" escuro compacto className="ml-auto min-[821px]:ml-0">
            Ver cardápio
          </BotaoRetro>

          <button
            ref={botaoRef}
            type="button"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={aberto}
            aria-controls="menu-mobile"
            onClick={() => setAberto((v) => !v)}
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-expresso text-expresso min-[821px]:hidden"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {aberto ? '×' : '≡'}
            </span>
          </button>
        </nav>

        {/* Absoluto: se o painel entrasse no fluxo, a margem negativa do
            involucro teria que mudar junto a cada abertura. */}
        <div
          id="menu-mobile"
          hidden={!aberto}
          style={{ top: ALTURA_NAV + 8 }}
          className="pointer-events-auto absolute inset-x-0 rounded-[24px] bg-creme px-6 py-5 shadow-[0_10px_30px_-12px_rgb(0_0_0_/_0.45)] min-[821px]:hidden"
        >
          <ul className="flex flex-col gap-2">
            {ITENS.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={fechar} className="block py-2 text-[17px] font-semibold text-expresso">
                  {item.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
```

```tsx title="src/components/layout/Footer.tsx"
'use client'

import Image from 'next/image'
import { useFiltro } from '@/components/FiltroProvider'

const ANCORAS = [
  { href: '#marca', rotulo: 'A marca' },
  { href: '#rotulos', rotulo: 'O que é saudável aqui' },
  { href: '#hoje', rotulo: 'Hoje o dia pede' },
] as const

type Props = {
  linhas: readonly { slug: string; nome: string }[]
  /** so aplica o filtro de linha quando ele existe na tela */
  filtraLinha: boolean
}

/** O coracao que cresce na frente do link. Decorativo: fica fora do nome. */
function Coracao() {
  return (
    <span className="rodape-link__cor" aria-hidden="true">
      ♥
    </span>
  )
}

export function Footer({ linhas, filtraLinha }: Props) {
  const { definir } = useFiltro()
  return (
    <footer className="rodape grao">
      <div className="wrap">
        <div className="rodape__grade">
          <div className="rodape__logo">
            <Image
              src="/marca/logo-amo-lockup.png"
              alt="AMO Sabores Saudáveis · para quem ama comer bem"
              width={2372}
              height={1365}
              loading="lazy"
              sizes="230px"
              className="h-auto w-[200px] min-[821px]:w-[230px]"
            />
          </div>

          <div>
            <h2 id="rodape-linhas">Linhas</h2>
            <ul aria-labelledby="rodape-linhas">
              {linhas.map((l) => (
                <li key={l.slug}>
                  <a
                    href="#cardapio"
                    className="rodape-link"
                    onClick={filtraLinha ? () => definir({ linha: l.slug, selo: null, vontade: null }) : undefined}
                  >
                    <Coracao />
                    {l.nome}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 id="rodape-marca">A marca</h2>
            <ul aria-labelledby="rodape-marca">
              {ANCORAS.map((a) => (
                <li key={a.href}>
                  <a href={a.href} className="rodape-link">
                    <Coracao />
                    {a.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 id="rodape-contato">Contato</h2>
            <ul aria-labelledby="rodape-contato">
              <li className="rodape__texto">contato@amo.com.br</li>
              <li className="rodape__texto">@amo</li>
              <li className="rodape__texto">(00) 00000-0000</li>
            </ul>
            <p className="rodape__aviso">Contato provisório, a definir.</p>
          </div>
        </div>

        <p className="rodape__copy">
          © 2026 <span translate="no">AMO</span> Sabores Saudáveis
        </p>
      </div>
    </footer>
  )
}
```

```css title="src/app/estilos/rodape.css"
/* Rodape, creme com grao. */
@layer components {
  .rodape { padding: 60px 0 40px; border-top: 1.5px dashed rgb(43 27 22 / .2); }
  .rodape__grade { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .rodape__logo { grid-column: 1 / -1; }
  @media (min-width: 821px) {
    .rodape__grade { grid-template-columns: 1.3fr 1fr 1fr 1fr; }
    .rodape__logo { grid-column: auto; }
  }
  .rodape h2 { margin: 0 0 12px; font-size: 20px; }
  .rodape ul { margin: 0; padding: 0; list-style: none; }
  .rodape li { margin: 6px 0; }
  .rodape-link, .rodape__texto {
    display: inline-flex; align-items: center; min-height: 28px;
    color: var(--color-suave); font-size: 15.5px; text-decoration: none;
    transition: color .2s ease;
  }
  .rodape-link { cursor: pointer; }
  .rodape-link__cor {
    display: inline-block; width: 0; overflow: hidden; color: var(--color-vinho); font-size: 12px;
    opacity: 0; transform: scale(0);
    transition: width .3s var(--ease-amo), opacity .2s ease, transform .35s cubic-bezier(.34, 1.6, .64, 1);
  }
  .rodape-link:focus-visible { color: var(--color-expresso); }
  .rodape-link:focus-visible .rodape-link__cor { width: 16px; opacity: 1; transform: scale(1); }
  @media (hover: hover) {
    .rodape-link:hover { color: var(--color-expresso); }
    .rodape-link:hover .rodape-link__cor { width: 16px; opacity: 1; transform: scale(1); }
  }
  .rodape__aviso { margin: 12px 0 0; font-size: 13px; color: var(--color-suave); }
  .rodape__copy {
    margin: 44px 0 0; padding-top: 20px; border-top: 1.5px dashed rgb(43 27 22 / .2);
    font-size: 14px; color: var(--color-suave);
  }
}
```

```tsx title="src/app/page.tsx"
import { FiltroProvider } from '@/components/FiltroProvider'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'

/**
 * A home. Server Component: carrega o cadastro, decide uma vez o que
 * aparece (montarVisao) e entrega dados prontos para as secoes.
 */
export default async function Home() {
  const visao = montarVisao(await carregarCatalogo())
  return (
    <FiltroProvider>
      <Nav />
      <main id="conteudo" className="scroll-mt-24" />
      <Footer linhas={visao.rotulos} filtraLinha={visao.filtrosLinha.length > 0} />
    </FiltroProvider>
  )
}
```

Em `src/app/globals.css`, somar `@import "./estilos/rodape.css";` depois do `produto.css`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: nav em pilula e rodape da v2"
```

---

### Task 8: Hero

**Files:**
- Create: `src/components/sections/Hero.tsx`, `src/app/estilos/hero.css`, `tests/hero.test.tsx`
- Modify: `src/app/page.tsx`, `src/app/globals.css` (import)

**Interfaces:**
- Consumes: `BotaoRetro`, `LinkSublinhado`, `SeloCarimbo`, `Camadas` (Task 5); `FotoParallax`, `classeDoFormato` (Task 6); `Visao.palco`, `Visao.destaque`, `Visao.regraDoDestaque` (Task 3).
- Produces: `Hero({ palco: readonly Produto[]; destaque: Produto; regra: string })`.

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/hero.test.tsx"
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '@/components/sections/Hero'
import { carregarCatalogo, type Produto } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'

const visao = montarVisao(await carregarCatalogo())
const montar = (palco: readonly Produto[] = visao.palco) =>
  render(<Hero palco={palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />)

describe('Hero', () => {
  it('o h1 é a assinatura da marca', () => {
    montar()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Para quem ama comer bem.')
  })

  it('as fotos do palco seguem a visão, e só a do destaque tem preload', () => {
    montar()
    const fotos = screen.getAllByRole('img')
    expect(fotos.map((f) => f.getAttribute('alt'))).toEqual(visao.palco.map((p) => p.imagem.alt))
    const semLoading = fotos.filter((f) => !f.hasAttribute('loading'))
    expect(semLoading).toHaveLength(1)
    expect(semLoading[0]).toHaveAttribute('alt', visao.destaque.imagem.alt)
    for (const f of fotos.filter((f) => f.hasAttribute('loading'))) {
      expect(f).toHaveAttribute('loading', 'eager')
    }
  })

  it('o selo mostra a regra da linha do destaque', () => {
    montar()
    expect(screen.getByText('Zero açúcar')).toBeInTheDocument()
  })

  it('as ações levam ao cardápio e ao Hoje o dia pede', () => {
    montar()
    expect(screen.getByRole('link', { name: 'Ver o cardápio' })).toHaveAttribute('href', '#cardapio')
    expect(screen.getByRole('link', { name: 'Escolher pela vontade' })).toHaveAttribute('href', '#hoje')
  })

  it('é a superfície escura #topo, com o deslocamento da nav', () => {
    const { container } = montar()
    const secao = container.querySelector('section')!
    expect(secao).toHaveAttribute('id', 'topo')
    expect(secao).toHaveClass('superficie-escura', 'scroll-mt-24')
  })

  it('o destaque fica no meio do palco', () => {
    const { container } = montar()
    const itens = [...container.querySelectorAll('.palco__item')]
    expect(itens.map((i) => i.classList.contains('palco__item--meio'))).toEqual([false, true, false])
  })

  it('formato desconhecido no palco cai na moldura neutra', () => {
    const [primeiro, ...resto] = visao.palco
    const { container } = montar([{ ...primeiro, formato: 'caixa' }, ...resto])
    expect(container.querySelector('.palco__item--neutra')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/hero.test.tsx`
Expected: FAIL ("Cannot find module '@/components/sections/Hero'").

- [ ] **Step 3: Implementar**

```tsx title="src/components/sections/Hero.tsx"
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { FotoParallax } from '@/components/ui/FotoParallax'
import { LinkSublinhado } from '@/components/ui/LinkSublinhado'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import type { Produto } from '@/lib/catalogo'

type Props = {
  /** da esquerda para a direita, com o destaque no meio */
  palco: readonly Produto[]
  destaque: Produto
  /** a regra da linha do destaque, no selo */
  regra: string
}

/**
 * Hero, expresso. A copy e da marca, nao de um produto. O que vem do
 * cadastro e o palco e o selo. A foto do destaque e a unica da pagina com
 * pre-carregamento (tests/pagina.test.tsx guarda isso no DOM e no codigo).
 */
export function Hero({ palco, destaque, regra }: Props) {
  return (
    <section id="topo" aria-labelledby="titulo-hero" className="hero superficie-escura scroll-mt-24">
      <div className="wrap">
        <p className="hero__pilula">Sabores saudáveis</p>
        <h1 id="titulo-hero" className="hero__titulo">
          <span className="hero__linha">
            <span>Para quem</span>
          </span>{' '}
          <span className="hero__linha">
            <span>
              ama <em>comer</em>
            </span>
          </span>{' '}
          <span className="hero__linha">
            <span>
              <em>bem.</em>
            </span>
          </span>
        </h1>
        <p className="hero__lead">
          Receitas em versão saudável. Cada uma diz no rótulo o que tem e o que não tem.
        </p>
        <div className="hero__acoes">
          <BotaoRetro href="#cardapio">Ver o cardápio</BotaoRetro>
          <LinkSublinhado href="#hoje" traco={1}>
            Escolher pela vontade
          </LinkSublinhado>
        </div>

        <div className="palco">
          {palco.map((p) => {
            const meio = p.slug === destaque.slug
            return (
              <div
                key={p.slug}
                className={`palco__item palco__item--${meio ? 'meio' : 'lado'} palco__item--${classeDoFormato(p.formato)}`}
              >
                <div className="arco-foto">
                  {meio ? (
                    <FotoParallax
                      imagem={p.imagem}
                      sizes="(max-width: 820px) 40vw, 330px"
                      preload
                      className="h-full w-full"
                      proporcao="h-full w-full"
                    />
                  ) : (
                    <FotoParallax
                      imagem={p.imagem}
                      sizes="(max-width: 820px) 30vw, 270px"
                      carregamento="eager"
                      className="h-full w-full"
                      proporcao="h-full w-full"
                    />
                  )}
                </div>
              </div>
            )
          })}
          <div className="palco__selo">
            <SeloCarimbo texto={regra} />
          </div>
        </div>
      </div>
    </section>
  )
}
```

```css title="src/app/estilos/hero.css"
/* Hero, expresso. A coreografia de entrada mora em movimento.css. */
@layer components {
  .hero { overflow: hidden; padding-top: 150px; background: var(--color-expresso); color: var(--color-creme); text-align: center; }
  .hero__pilula {
    display: inline-block; margin: 0; padding: 7px 16px; border-radius: 999px;
    background: var(--color-caramelo); color: var(--color-expresso); font-size: 15px; font-weight: 600;
  }
  .hero__titulo { max-width: 11ch; margin: 22px auto 0; font-size: clamp(54px, 8.2vw, 104px); line-height: 1; letter-spacing: -.01em; }
  .hero__linha { display: block; overflow: hidden; padding-bottom: .08em; margin-bottom: -.08em; }
  .hero__linha > span { display: inline-block; }
  .hero__titulo em { font-style: normal; color: var(--color-cobre); }
  .hero__lead {
    max-width: 46ch; margin: 22px auto 0;
    font-size: clamp(17.5px, 1.6vw, 20px); line-height: 1.6; color: var(--color-claro-suave);
  }
  .hero__acoes { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 18px 28px; margin-top: 32px; }
  .hero__acoes .link-sub { font-size: 16px; font-weight: 600; }

  .palco { position: relative; display: flex; justify-content: center; align-items: flex-end; gap: clamp(10px, 2vw, 24px); margin-top: 56px; }
  .palco__item { flex: none; }
  .palco__item .arco-foto { width: clamp(120px, 22vw, 270px); height: clamp(150px, 26vw, 320px); border-radius: 999px 999px 0 0; }
  .palco__item--meio .arco-foto { width: clamp(150px, 27vw, 330px); height: clamp(185px, 33vw, 400px); }
  .palco__item--inteiro .arco-foto {
    width: clamp(110px, 21vw, 260px); height: clamp(110px, 21vw, 260px);
    margin-bottom: clamp(10px, 2.2vw, 28px); border-radius: 50%;
  }
  .palco__item--unidade .arco-foto { border-radius: 28px 28px 0 0; }
  .palco__item--neutra .arco-foto { border-radius: 16px 16px 0 0; }
  .palco__selo { position: absolute; z-index: 3; left: calc(50% + clamp(60px, 10vw, 125px)); top: clamp(-30px, -1.5vw, -12px); }

  @media (max-width: 820px) {
    .hero { padding-top: 120px; }
  }
}
```

```tsx title="src/app/page.tsx"
import { FiltroProvider } from '@/components/FiltroProvider'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { Hero } from '@/components/sections/Hero'
import { Camadas } from '@/components/ui/Camadas'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'

/**
 * A home. Server Component: carrega o cadastro, decide uma vez o que
 * aparece (montarVisao) e entrega dados prontos para as secoes.
 */
export default async function Home() {
  const visao = montarVisao(await carregarCatalogo())
  return (
    <FiltroProvider>
      <Nav />
      <main id="conteudo" className="scroll-mt-24">
        <Hero palco={visao.palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />
        <Camadas estrato="heroCardapio" />
      </main>
      <Footer linhas={visao.rotulos} filtraLinha={visao.filtrosLinha.length > 0} />
    </FiltroProvider>
  )
}
```

Em `src/app/globals.css`, somar `@import "./estilos/hero.css";` depois do `rodape.css`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: hero da v2 com palco vindo do cadastro"
```

---

### Task 9: Cardápio (filtros, FLIP, estado vazio)

**Files:**
- Create: `src/components/sections/Cardapio.tsx`, `src/app/estilos/cardapio.css`, `tests/cardapio.test.tsx`
- Modify: `src/app/page.tsx`, `src/app/globals.css` (import)

**Interfaces:**
- Consumes: `useFiltro` (Task 4); `Pilula` (Task 5); `CardProduto` (Task 6); `filtrar`, `OpcaoLinha`, `OpcaoSelo`, `GrupoVontade` (Task 3); `EASE_AMO` de `@/lib/motion`.
- Produces: `Cardapio({ produtos, tipos, nomesDosSelos, filtrosLinha, filtrosSelo, vontades })`.

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/cardapio.test.tsx"
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Cardapio } from '@/components/sections/Cardapio'
import { FiltroProvider } from '@/components/FiltroProvider'
import { carregarCatalogo, type Catalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'
import { Sonda } from './fixtures/sonda'

const real = await carregarCatalogo()

function montar(catalogo: Catalogo) {
  const v = montarVisao(catalogo)
  return render(
    <FiltroProvider>
      <Cardapio
        produtos={v.produtos}
        tipos={v.tipos}
        nomesDosSelos={v.nomesDosSelos}
        filtrosLinha={v.filtrosLinha}
        filtrosSelo={v.filtrosSelo}
        vontades={v.vontades}
      />
      <Sonda />
    </FiltroProvider>,
  )
}

const cards = () => screen.queryAllByRole('article')
const grupo = () => screen.getByRole('group', { name: 'Filtrar o cardápio' })
const filtro = () => screen.getByTestId('filtro')

describe('Cardápio com o cadastro de hoje', () => {
  it('mostra os 7 e esconde os filtros que não filtrariam nada', () => {
    montar(real)
    expect(screen.getByRole('heading', { level: 2, name: 'Escolha pelo sabor' })).toBeInTheDocument()
    expect(cards()).toHaveLength(7)
    expect(screen.queryByRole('group', { name: 'Filtrar o cardápio' })).toBeNull()
    expect(screen.queryByText(/Filtre pela linha/)).toBeNull()
  })

  it('cada card leva o nome do produto e o tipo da linha', () => {
    montar(real)
    expect(screen.getByRole('article', { name: 'Ninho com frutas vermelhas' })).toHaveTextContent('Bolo no pote')
  })

  it('a vontade vinda de fora filtra e vira pílula removível', async () => {
    const user = userEvent.setup()
    montar(real)
    await user.click(screen.getByRole('button', { name: 'sonda: vontade chocolate' }))
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(within(grupo()).getByText(/Vontade: chocolate/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tirar o filtro de vontade: chocolate' }))
    await waitFor(() => expect(cards()).toHaveLength(7))
    expect(filtro()).toHaveTextContent('-|-|-')
  })
})

describe('Cardápio com o catálogo misto', () => {
  it('Tudo e uma pílula por linha, com contagem e aria-pressed', () => {
    montar(CATALOGO_MISTO)
    expect(screen.getByText('Filtre pela linha ou pelo que importa pra você.')).toBeInTheDocument()
    const tudo = within(grupo()).getByRole('button', { name: 'Tudo 11' })
    expect(tudo).toHaveAttribute('aria-pressed', 'true')
    for (const nome of ['Bolos no pote 7', 'Bolos inteiros 2', 'Salgados 2']) {
      expect(within(grupo()).getByRole('button', { name: nome })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('escolher a linha filtra e marca a pílula', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Salgados 2' }))
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Salgados 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tudo 11' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('o selo liga e desliga, e a linha mantém selo e vontade', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    const integral = screen.getByRole('button', { name: 'Integral' })
    await user.click(integral)
    expect(integral).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(cards()).toHaveLength(2))
    await user.click(integral)
    expect(integral).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(cards()).toHaveLength(11))

    await user.click(screen.getByRole('button', { name: 'sonda: vontade chocolate' }))
    await user.click(screen.getByRole('button', { name: 'Bolos inteiros 2' }))
    expect(filtro()).toHaveTextContent('inteiro|-|chocolate')
    await waitFor(() => expect(cards()).toHaveLength(2))
  })

  it('combinação sem receita mostra o estado vazio, e "Ver todas" limpa os três', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    await user.click(screen.getByRole('button', { name: 'Salgados 2' }))
    await user.click(screen.getByRole('button', { name: 'Fonte de fibras' }))
    await waitFor(() => expect(cards()).toHaveLength(0))
    expect(screen.getByText(/Nenhuma receita com esse filtro ainda/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver todas' }))
    expect(filtro()).toHaveTextContent('-|-|-')
    await waitFor(() => expect(cards()).toHaveLength(11))
  })

  it('anuncia o resultado para leitor de tela', async () => {
    const user = userEvent.setup()
    montar(CATALOGO_MISTO)
    const anuncio = screen.getByText(/^Mostrando \d+ de \d+ receitas\.$/)
    expect(anuncio).toHaveAttribute('aria-live', 'polite')
    expect(anuncio).toHaveTextContent('Mostrando 11 de 11 receitas.')
    await user.click(screen.getByRole('button', { name: 'Salgados 2' }))
    expect(anuncio).toHaveTextContent('Mostrando 2 de 11 receitas.')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/cardapio.test.tsx`
Expected: FAIL ("Cannot find module '@/components/sections/Cardapio'").

- [ ] **Step 3: Implementar**

```tsx title="src/components/sections/Cardapio.tsx"
'use client'

import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useMemo } from 'react'
import { useFiltro } from '@/components/FiltroProvider'
import { CardProduto } from '@/components/ui/CardProduto'
import { Pilula } from '@/components/ui/Pilula'
import type { Produto } from '@/lib/catalogo'
import { EASE_AMO } from '@/lib/motion'
import { filtrar, type GrupoVontade, type OpcaoLinha, type OpcaoSelo } from '@/lib/visao'

type Props = {
  produtos: readonly Produto[]
  tipos: Readonly<Record<string, string>>
  nomesDosSelos: Readonly<Record<string, string>>
  filtrosLinha: readonly OpcaoLinha[]
  filtrosSelo: readonly OpcaoSelo[]
  vontades: readonly Pick<GrupoVontade, 'slug' | 'palavra'>[]
}

const MOLA = [0.34, 1.4, 0.64, 1] as const

/**
 * O cardapio. Filtro de linha e de selo so aparecem quando filtram alguma
 * coisa (montarVisao decide); a vontade chega de fora, pelo Hoje o dia
 * pede, e aparece como pilula removivel. Quem fica desliza para o novo
 * lugar (FLIP do Motion); quem entra cresce. Sob movimento reduzido o
 * MotionConfig desliga o deslocamento.
 */
export function Cardapio({ produtos, tipos, nomesDosSelos, filtrosLinha, filtrosSelo, vontades }: Props) {
  const { linha, selo, vontade, definir, limpar } = useFiltro()
  const visiveis = useMemo(
    () => filtrar(produtos, { linha, selo, vontade }),
    [produtos, linha, selo, vontade],
  )
  const temFiltro = filtrosLinha.length > 0 || filtrosSelo.length > 0
  const palavra = vontades.find((v) => v.slug === vontade)?.palavra.toLowerCase()

  return (
    <section id="cardapio" aria-labelledby="titulo-cardapio" className="cardapio grao scroll-mt-24">
      <div className="wrap">
        <div className={`cardapio__topo${temFiltro ? ' cardapio__topo--duplo' : ''}`}>
          <div>
            <p className="rotulo-secao">O cardápio</p>
            <h2 id="titulo-cardapio" className="titulo-secao">
              Escolha pelo sabor
            </h2>
          </div>
          {temFiltro ? <p className="texto">Filtre pela linha ou pelo que importa pra você.</p> : null}
        </div>

        {temFiltro || palavra !== undefined ? (
          <div role="group" aria-label="Filtrar o cardápio" className="filtros so-js">
            {filtrosLinha.length > 0 ? (
              <>
                <Pilula aria-pressed={linha === null} onClick={() => definir({ linha: null })}>
                  Tudo <em>{produtos.length}</em>
                </Pilula>
                {filtrosLinha.map((l) => (
                  <Pilula key={l.slug} aria-pressed={linha === l.slug} onClick={() => definir({ linha: l.slug })}>
                    {l.nome} <em>{l.contagem}</em>
                  </Pilula>
                ))}
              </>
            ) : null}
            {filtrosLinha.length > 0 && filtrosSelo.length > 0 ? (
              <span className="filtros__sep" aria-hidden="true" />
            ) : null}
            {filtrosSelo.map((s) => (
              <Pilula
                key={s.id}
                variante="selo"
                aria-pressed={selo === s.id}
                onClick={() => definir({ selo: selo === s.id ? null : s.id })}
              >
                {s.nome}
              </Pilula>
            ))}
            {palavra !== undefined ? (
              <Pilula
                ativa
                aria-label={`Tirar o filtro de vontade: ${palavra}`}
                onClick={() => definir({ vontade: null })}
              >
                Vontade: {palavra} <span aria-hidden="true">✕</span>
              </Pilula>
            ) : null}
          </div>
        ) : null}

        <p className="sr-only so-js" aria-live="polite">
          {`Mostrando ${visiveis.length} de ${produtos.length} receitas.`}
        </p>

        <MotionConfig reducedMotion="user">
          <ul role="list" className="grade">
            <AnimatePresence mode="popLayout" initial={false}>
              {visiveis.map((p) => (
                <motion.li
                  key={p.slug}
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

        {visiveis.length === 0 ? (
          <p className="cardapio__vazio">
            Nenhuma receita com esse filtro ainda.{' '}
            <button type="button" onClick={limpar}>
              Ver todas
            </button>
          </p>
        ) : null}
      </div>
    </section>
  )
}
```

```css title="src/app/estilos/cardapio.css"
/* Cardapio, creme com grao. `overflow-x: clip` segura fita e etiqueta que
   saem da borda do card na ultima coluna, sem criar rolagem horizontal. */
@layer components {
  .cardapio { overflow-x: clip; padding: 80px 0 96px; }
  .cardapio__topo { display: grid; gap: 20px; align-items: end; }
  .cardapio__topo .texto { margin: 0; }
  @media (min-width: 821px) {
    .cardapio__topo--duplo { grid-template-columns: 1fr 1fr; gap: 48px; }
  }
  .filtros {
    display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
    margin-top: 40px; padding-bottom: 22px; border-bottom: 1.5px dashed rgb(43 27 22 / .2);
  }
  .filtros__sep { width: 1.5px; height: 28px; margin: 0 6px; background: rgb(43 27 22 / .2); }
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
  }
}
```

```tsx title="src/app/page.tsx"
import { FiltroProvider } from '@/components/FiltroProvider'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { Cardapio } from '@/components/sections/Cardapio'
import { Hero } from '@/components/sections/Hero'
import { Camadas } from '@/components/ui/Camadas'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'

/**
 * A home. Server Component: carrega o cadastro, decide uma vez o que
 * aparece (montarVisao) e entrega dados prontos para as secoes.
 */
export default async function Home() {
  const visao = montarVisao(await carregarCatalogo())
  return (
    <FiltroProvider>
      <Nav />
      <main id="conteudo" className="scroll-mt-24">
        <Hero palco={visao.palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />
        <Camadas estrato="heroCardapio" />
        <Cardapio
          produtos={visao.produtos}
          tipos={visao.tipos}
          nomesDosSelos={visao.nomesDosSelos}
          filtrosLinha={visao.filtrosLinha}
          filtrosSelo={visao.filtrosSelo}
          vontades={visao.vontades}
        />
        <Camadas estrato="cardapioHoje" />
      </main>
      <Footer linhas={visao.rotulos} filtraLinha={visao.filtrosLinha.length > 0} />
    </FiltroProvider>
  )
}
```

Em `src/app/globals.css`, somar `@import "./estilos/cardapio.css";` depois do `hero.css`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: cardapio com filtros que se adaptam ao cadastro e FLIP"
```

---

### Task 10: Hoje o dia pede (pino, abas, palavra que troca)

**Files:**
- Create: `src/components/sections/HojeODiaPede.tsx`, `src/components/ui/PalavraTroca.tsx`, `src/app/estilos/hoje.css`, `tests/hoje.test.tsx`
- Modify: `src/app/page.tsx`, `src/app/globals.css` (import)

**Interfaces:**
- Consumes: `useRolagem` (Task 4); `useFiltro` (Task 4); `useTrava` (Task 4); `Pilula`, `PilulaLink` (Task 5); `PoteEnche` (Task 6); `GrupoVontade` (Task 3); `indicePorProgresso`, `posicaoDoIndice`, `listarNomes`, `corpoDaPalavra`, `contarOpcoes`, `textoVerNoCardapio` (Task 3).
- Produces: `HojeODiaPede({ vontades: readonly GrupoVontade[]; tipos })`, `CONSULTA_PINO`; `PalavraTroca({ palavra })`.

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/hoje.test.tsx"
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { HojeODiaPede, CONSULTA_PINO } from '@/components/sections/HojeODiaPede'
import { PalavraTroca } from '@/components/ui/PalavraTroca'
import { FiltroProvider } from '@/components/FiltroProvider'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarVisao, type GrupoVontade } from '@/lib/visao'
import { posicaoDoIndice } from '@/lib/vontade'
import { Sonda } from './fixtures/sonda'

const visao = montarVisao(await carregarCatalogo())
const matchMediaOriginal = window.matchMedia

afterEach(() => {
  window.matchMedia = matchMediaOriginal
  document.documentElement.classList.remove('js')
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function montar(vontades: readonly GrupoVontade[] = visao.vontades) {
  return render(
    <FiltroProvider>
      <HojeODiaPede vontades={vontades} tipos={visao.tipos} />
      <Sonda />
    </FiltroProvider>,
  )
}

const letras = (raiz: ParentNode) =>
  [...raiz.querySelectorAll('.palavra__letra')].map((s) => s.textContent).join('')

describe('Hoje o dia pede', () => {
  it('uma aba por vontade com produto, com a contagem; a primeira selecionada', () => {
    montar()
    const abas = screen.getAllByRole('tab')
    expect(abas.map((a) => a.textContent)).toEqual(['Chocolate 2', 'Fruta 3', 'Coco 2', 'Um clássico 3'])
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
    expect(abas.map((a) => a.tabIndex)).toEqual([0, -1, -1, -1])
    expect(screen.getByRole('tablist', { name: 'Vontades' })).toBeInTheDocument()
  })

  it('o painel mostra a vontade, as opções e o link para o cardápio', () => {
    const { container } = montar()
    const painel = screen.getByRole('tabpanel', { name: 'Chocolate 2' })
    expect(within(painel).getByText('Chocolate.')).toHaveClass('sr-only')
    expect(within(painel).getByText(/Prestígio e Chocolate\./).textContent).toBe('2 opções: Prestígio e Chocolate.')
    expect(within(painel).getByRole('link', { name: 'Ver as 2 no cardápio' })).toHaveAttribute('href', '#cardapio')
    expect(screen.getByAltText(visao.vontades[0].produtos[0].imagem.alt)).toBeInTheDocument()
    expect(container.querySelector('.hoje__lado .etiqueta')).toHaveAttribute('aria-hidden', 'true')
    const minis = container.querySelectorAll('.hoje__pilha img')
    expect(minis).toHaveLength(1)
    expect(minis[0]).toHaveAttribute('alt', '')
    expect(container.querySelector('.hoje__pilha')).toHaveAttribute('aria-hidden', 'true')
  })

  it('setas, Home e End trocam a aba e levam o foco junto', async () => {
    const user = userEvent.setup()
    montar()
    const abas = screen.getAllByRole('tab')
    abas[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(abas[1]).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(abas[1])
    expect(abas.map((a) => a.tabIndex)).toEqual([-1, 0, -1, -1])
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(abas[3])
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(abas[0])
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(abas[3])
    await user.keyboard('{Home}')
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('clicar numa aba troca o conteúdo do painel', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('tab', { name: 'Coco 2' }))
    const painel = screen.getByRole('tabpanel', { name: 'Coco 2' })
    expect(within(painel).getByText('Coco.')).toBeInTheDocument()
    expect(within(painel).getByText(/Beijinho\./).textContent).toBe('2 opções: Prestígio e Beijinho.')
  })

  it('"Ver as 3 no cardápio" aplica a vontade e limpa linha e selo', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(screen.getByRole('button', { name: 'sonda: tudo ligado' }))
    await user.click(screen.getByRole('tab', { name: 'Fruta 3' }))
    await user.click(screen.getByRole('link', { name: 'Ver as 3 no cardápio' }))
    expect(screen.getByTestId('filtro')).toHaveTextContent('-|-|fruta')
  })

  it('com um produto só: "1 opção" e "Ver no cardápio"', () => {
    const beijinho = visao.produtos.find((p) => p.slug === 'beijinho')!
    montar([{ slug: 'coco', palavra: 'Coco', produtos: [beijinho] }])
    const painel = screen.getByRole('tabpanel')
    expect(within(painel).getByText(/Beijinho\./).textContent).toBe('1 opção: Beijinho.')
    expect(within(painel).getByRole('link', { name: 'Ver no cardápio' })).toBeInTheDocument()
  })

  it('o progresso usa variável CSS, nunca transform inline', () => {
    const { container } = montar()
    const barra = container.querySelector('.hoje__barra i')!
    expect(barra.getAttribute('style')).toContain('--progresso')
    expect(barra.getAttribute('style')).not.toContain('transform')
    expect(container.querySelector('.hoje__progresso')).toHaveAttribute('aria-hidden', 'true')
  })

  it('com a seção pinada, escolher uma aba rola até o meio do trecho dela', async () => {
    const user = userEvent.setup()
    document.documentElement.classList.add('js')
    window.matchMedia = ((q: string) => ({
      matches: q === CONSULTA_PINO,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(3000)
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    montar()
    await user.click(screen.getByRole('tab', { name: 'Coco 2' }))
    expect(rolar).toHaveBeenCalledWith({ top: posicaoDoIndice(2, 4, 0, 3000 - window.innerHeight) })
    expect(screen.getByRole('tab', { name: 'Coco 2' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('PalavraTroca', () => {
  it('o leitor de tela lê a palavra inteira; as letras visuais ficam escondidas dele', () => {
    const { container } = render(<PalavraTroca palavra="Chocolate." />)
    expect(screen.getByText('Chocolate.')).toHaveClass('sr-only')
    expect(container.querySelector('.palavra__letra')!.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(letras(container)).toBe('Chocolate.')
  })

  it('o corpo da letra acompanha o tamanho da palavra', () => {
    // lido do HTML do servidor: o CSSOM do jsdom nem sempre aceita min()
    expect(renderToString(<PalavraTroca palavra="Um clássico." />)).toContain('font-size:min(83px, 11.56vw)')
  })

  it('troca rápida termina na última palavra, nunca numa do meio', () => {
    vi.useFakeTimers()
    document.documentElement.classList.add('js')
    const { container, rerender } = render(<PalavraTroca palavra="Chocolate." />)
    rerender(<PalavraTroca palavra="Fruta." />)
    expect(letras(container)).toBe('Chocolate.')
    expect(container.querySelector('.palavra__letra')).toHaveClass('sai')
    rerender(<PalavraTroca palavra="Coco." />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(letras(container)).toBe('Coco.')
    expect(container.querySelector('.palavra__letra')).toHaveClass('entra')
    expect(screen.getByText('Coco.')).toHaveClass('sr-only')
  })

  it('sem JS ou com movimento reduzido a troca é imediata', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(<PalavraTroca palavra="Chocolate." />)
    rerender(<PalavraTroca palavra="Fruta." />)
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(letras(container)).toBe('Fruta.')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/hoje.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

```tsx title="src/components/ui/PalavraTroca.tsx"
'use client'

import { useEffect, useState } from 'react'
import { corpoDaPalavra } from '@/lib/vontade'

const SAIDA_MS = 200
const SAIDA_POR_LETRA_MS = 12

function semAnimacao(): boolean {
  return (
    !document.documentElement.classList.contains('js') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * A palavra grande do Hoje o dia pede. Ao trocar, as letras velhas caem e
 * somem; depois as novas sobem uma a uma e o sublinhado se redesenha.
 *
 * `saindo` e derivado (a palavra pedida ainda nao e a exibida), e o unico
 * setState mora no timeout: se a vontade trocar de novo antes da saida
 * terminar, o efeito reinicia o relogio e a troca termina na ultima
 * palavra pedida. O leitor de tela le sempre a palavra pedida, inteira.
 */
export function PalavraTroca({ palavra }: { palavra: string }) {
  const [exibida, setExibida] = useState(palavra)
  const [entrando, setEntrando] = useState(false)
  const saindo = palavra !== exibida

  useEffect(() => {
    if (!saindo) return
    const espera = semAnimacao() ? 0 : SAIDA_MS + exibida.length * SAIDA_POR_LETRA_MS
    const relogio = window.setTimeout(() => {
      setExibida(palavra)
      setEntrando(true)
    }, espera)
    return () => window.clearTimeout(relogio)
  }, [saindo, palavra, exibida])

  const estado = saindo ? 'sai' : entrando ? 'entra' : ''
  const passo = saindo ? 0.012 : 0.028
  const letras = Array.from(exibida)

  return (
    <p className="palavra" style={{ fontSize: corpoDaPalavra(letras.length) }}>
      <span className="sr-only">{palavra}</span>
      <span key={`${exibida}:${estado}`} aria-hidden="true">
        {letras.map((letra, i) => (
          <span
            key={i}
            className={`palavra__letra${estado ? ` ${estado}` : ''}`}
            style={estado ? { animationDelay: `${(i * passo).toFixed(3)}s` } : undefined}
          >
            {letra === ' ' ? ' ' : letra}
          </span>
        ))}
      </span>
      <svg
        key={`traco:${exibida}`}
        className={`palavra__traco${entrando ? ' desenha' : ''}`}
        viewBox="0 0 300 16"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path pathLength={1} d="M3,10 C60,3 110,14 170,7 C215,2 260,12 297,5" />
      </svg>
    </p>
  )
}
```

```tsx title="src/components/sections/HojeODiaPede.tsx"
'use client'

import Image from 'next/image'
import { useMotionValueEvent, useScroll } from 'motion/react'
import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useFiltro } from '@/components/FiltroProvider'
import { useRolagem } from '@/components/RolagemSuave'
import { PalavraTroca } from '@/components/ui/PalavraTroca'
import { Pilula, PilulaLink } from '@/components/ui/Pilula'
import { PoteEnche } from '@/components/ui/PoteEnche'
import { useTrava } from '@/components/ui/useTrava'
import type { GrupoVontade } from '@/lib/visao'
import {
  contarOpcoes,
  indicePorProgresso,
  listarNomes,
  posicaoDoIndice,
  textoVerNoCardapio,
} from '@/lib/vontade'

/** A mesma condicao do CSS que prende a secao (src/app/estilos/hoje.css).
 *  Em janela baixa o conteudo nao cabe em 100svh, entao nao prende. */
export const CONSULTA_PINO = '(prefers-reduced-motion: no-preference) and (min-height: 700px)'

function estaPinado(): boolean {
  return document.documentElement.classList.contains('js') && window.matchMedia(CONSULTA_PINO).matches
}

type Props = {
  vontades: readonly GrupoVontade[]
  tipos: Readonly<Record<string, string>>
}

/**
 * Hoje o dia pede: a secao pinada de hoje, agora escolhendo pela vontade.
 *
 * Pinada (JS, sem movimento reduzido, janela alta): o trilho tem
 * 100svh + n * 55svh e o progresso da rolagem nele escolhe a vontade. As
 * pilulas sao abas; escolher uma rola ate o trecho dela e trava a selecao
 * durante a rolagem, para a palavra nao passar pelas do meio. Sem pino, as
 * abas so trocam o conteudo.
 */
export function HojeODiaPede({ vontades, tipos }: Props) {
  const n = vontades.length
  const [indice, setIndice] = useState(0)
  const [trocou, setTrocou] = useState(false)
  const indiceRef = useRef(0)
  const trilhoRef = useRef<HTMLDivElement>(null)
  const abasRef = useRef<(HTMLButtonElement | null)[]>([])
  const trava = useTrava()
  const { rolarPara } = useRolagem()
  const { definir } = useFiltro()

  function mudar(i: number) {
    if (i === indiceRef.current) return
    indiceRef.current = i
    setIndice(i)
    setTrocou(true)
  }

  const { scrollYProgress } = useScroll({ target: trilhoRef, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (trava.travada() || !estaPinado()) return
    mudar(indicePorProgresso(p, n))
  })

  function escolher(i: number) {
    const trilho = trilhoRef.current
    if (trilho && estaPinado()) {
      const curso = trilho.offsetHeight - window.innerHeight
      if (curso > 0) {
        const topo = trilho.getBoundingClientRect().top + window.scrollY
        trava.travar(i)
        mudar(i)
        rolarPara(posicaoDoIndice(i, n, topo, curso), { aoTerminar: trava.soltar })
        return
      }
    }
    mudar(i)
  }

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const alvos: Record<string, number> = { ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: n - 1 }
    const destino = alvos[e.key]
    if (destino === undefined) return
    e.preventDefault()
    const i = (destino + n) % n
    abasRef.current[i]?.focus()
    escolher(i)
  }

  const grupo = vontades[indice]
  const [principal, ...outros] = grupo.produtos
  const quantos = grupo.produtos.length

  return (
    <section id="hoje" aria-labelledby="titulo-hoje" className="hoje scroll-mt-24">
      <div ref={trilhoRef} className="hoje__trilho" style={{ '--n': n } as CSSProperties}>
        <div className="hoje__painel">
          <div className="wrap hoje__grade">
            <div>
              <p className="rotulo-secao">Não sabe o que escolher?</p>
              <h2 id="titulo-hoje">Hoje o dia pede</h2>

              <div role="tabpanel" id="hoje-painel" aria-labelledby={`hoje-aba-${grupo.slug}`}>
                <PalavraTroca palavra={`${grupo.palavra}.`} />
                <p className="hoje__frase">
                  <b>{contarOpcoes(quantos)}:</b> {listarNomes(grupo.produtos.map((p) => p.nome))}.
                </p>
                <div className="hoje__opcoes">
                  <PilulaLink
                    href="#cardapio"
                    onClick={() => definir({ vontade: grupo.slug, linha: null, selo: null })}
                  >
                    {textoVerNoCardapio(quantos)}
                  </PilulaLink>
                </div>
              </div>

              <div role="tablist" aria-label="Vontades" className="hoje__abas so-js" onKeyDown={aoTeclar}>
                {vontades.map((v, i) => (
                  <Pilula
                    key={v.slug}
                    ref={(el) => {
                      abasRef.current[i] = el
                    }}
                    role="tab"
                    id={`hoje-aba-${v.slug}`}
                    aria-selected={i === indice}
                    aria-controls="hoje-painel"
                    tabIndex={i === indice ? 0 : -1}
                    onClick={() => escolher(i)}
                  >
                    {v.palavra} <small>{v.produtos.length}</small>
                  </Pilula>
                ))}
              </div>

              <div className="hoje__progresso" aria-hidden="true">
                <span>
                  {indice + 1} / {n}
                </span>
                <span className="hoje__barra">
                  <i style={{ '--progresso': (indice + 1) / n } as CSSProperties} />
                </span>
                <span className="hoje__dica">role pra trocar</span>
              </div>
            </div>

            <div className="hoje__lado">
              <div key={grupo.slug} className={`hoje__pilha${trocou ? ' troca' : ''}`} aria-hidden="true">
                {outros.slice(0, 2).map((p) => (
                  <div key={p.slug} className="hoje__mini">
                    <Image
                      src={p.imagem.src}
                      alt=""
                      width={p.imagem.largura}
                      height={p.imagem.altura}
                      loading="lazy"
                      sizes="104px"
                    />
                  </div>
                ))}
              </div>
              <div className="hoje__moldura">
                <PoteEnche key={principal.slug}>
                  <Image
                    src={principal.imagem.src}
                    alt={principal.imagem.alt}
                    width={principal.imagem.largura}
                    height={principal.imagem.altura}
                    loading="lazy"
                    sizes="(max-width: 820px) 180px, 340px"
                  />
                </PoteEnche>
              </div>
              <div className="etiqueta" aria-hidden="true">
                <b>{principal.nome}</b>
                <small>{tipos[principal.linha]}</small>
                <i>♥</i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

```css title="src/app/estilos/hoje.css"
/* Hoje o dia pede, caramelo. Sem pino por padrao; o pino so vale com JS,
   sem movimento reduzido e com janela de 700px ou mais (CONSULTA_PINO em
   HojeODiaPede.tsx espelha esta condicao). */
@layer components {
  .hoje { overflow-x: clip; background: var(--color-caramelo); }
  .hoje__painel { padding: 96px 0 80px; }
  .hoje__grade { display: grid; gap: 18px; align-items: center; width: 100%; }
  @media (min-width: 821px) {
    .hoje__grade { grid-template-columns: 1.15fr .85fr; gap: 40px; }
  }
  .hoje .rotulo-secao { color: var(--color-chocolate); }
  .hoje h2 { margin-top: 14px; font-size: clamp(34px, 4vw, 48px); line-height: 1; color: var(--color-chocolate); }

  .palavra {
    position: relative; display: inline-block; margin: 4px 0 0;
    font-family: var(--font-display); line-height: 1.08; color: var(--color-expresso); white-space: nowrap;
  }
  .palavra__letra { display: inline-block; }
  .palavra__traco { position: absolute; left: 0; bottom: -12px; width: 100%; height: 20px; overflow: visible; }
  .palavra__traco path {
    fill: none; stroke: var(--color-cobre); stroke-width: 6; stroke-linecap: round;
    stroke-dasharray: 1 2; stroke-dashoffset: 0;
  }

  .hoje__frase { min-height: 1.6em; margin: 34px 0 0; font-size: 19px; color: var(--color-chocolate); }
  .hoje__frase b { font-weight: 700; }
  .hoje__opcoes { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px; margin-top: 18px; }
  .hoje__abas { display: flex; flex-wrap: wrap; gap: 10px; max-width: 600px; margin-top: 26px; }

  .hoje__progresso { display: none; align-items: center; gap: 12px; margin-top: 26px; font-size: 14px; font-weight: 700; color: var(--color-chocolate); }
  .hoje__dica { font-weight: 500; }
  .hoje__barra { width: 160px; height: 4px; overflow: hidden; border-radius: 4px; background: rgb(43 27 22 / .15); }
  .hoje__barra i {
    display: block; height: 100%; background: var(--color-expresso);
    transform: scaleX(var(--progresso, 0)); transform-origin: left; transition: transform .4s var(--ease-amo);
  }

  .hoje__lado { position: relative; justify-self: center; }
  .hoje__moldura {
    width: clamp(220px, 27vw, 340px); height: clamp(280px, 34vw, 430px); overflow: hidden;
    border-radius: 999px 999px 28px 28px; background: var(--color-chocolate); box-shadow: 10px 10px 0 var(--color-chocolate);
  }
  .hoje__moldura img { width: 100%; height: 100%; object-fit: cover; }
  .hoje__lado .etiqueta { top: auto; right: -64px; bottom: 40px; width: 168px; height: 204px; }
  .hoje__lado .etiqueta b { font-size: 24px; }
  .hoje__pilha { position: absolute; z-index: 4; left: -86px; bottom: -22px; display: flex; align-items: flex-end; }
  .hoje__mini {
    width: 104px; height: 132px; overflow: hidden; border-radius: 999px 999px 16px 16px;
    background: var(--color-chocolate); box-shadow: 0 0 0 5px var(--color-caramelo);
  }
  /* `translate`, e nao `transform`: a animacao de troca termina em
     transform: none e apagaria o degrau. */
  .hoje__mini + .hoje__mini { margin-left: -26px; translate: 0 14px; }
  .hoje__mini img { width: 100%; height: 100%; object-fit: cover; }

  @media (max-width: 820px) {
    .hoje__lado { order: -1; }
    .hoje__moldura { width: 180px; height: 220px; }
    .hoje__lado .etiqueta { right: -70px; bottom: 10px; width: 120px; height: 146px; }
    .hoje__lado .etiqueta b { font-size: 18px; }
    .hoje__pilha { left: -60px; bottom: -12px; }
    .hoje__mini { width: 70px; height: 90px; }
    .hoje__frase { margin-top: 24px; font-size: 17px; }
    .hoje__abas { gap: 8px; }
  }

  @media (prefers-reduced-motion: no-preference) and (min-height: 700px) {
    html.js .hoje__trilho { height: calc(100svh + var(--n) * 55svh); }
    html.js .hoje__painel {
      position: sticky; top: 0; display: flex; align-items: center;
      height: 100svh; min-height: 620px; padding: 70px 0 0; overflow: hidden;
    }
    html.js .hoje__progresso { display: flex; }
  }
}
```

Em `src/app/page.tsx`, depois do `<Camadas estrato="cardapioHoje" />`:

```tsx
        <HojeODiaPede vontades={visao.vontades} tipos={visao.tipos} />
        <Camadas estrato="hojeRotulos" />
```

e o import `import { HojeODiaPede } from '@/components/sections/HojeODiaPede'`.

Em `src/app/globals.css`, somar `@import "./estilos/hoje.css";` depois do `cardapio.css`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: Hoje o dia pede por vontade, pinado, com abas e palavra que troca"
```

---

### Task 11: Rótulos, A marca, faixa cobre e Final

**Files:**
- Create: `src/components/ui/PapelRotulo.tsx`, `src/components/sections/Rotulos.tsx`, `src/components/sections/AMarca.tsx`, `src/components/sections/FaixaCobre.tsx`, `src/components/sections/Final.tsx`, `src/app/estilos/rotulos.css`, `src/app/estilos/marca.css`, `tests/secoes.test.tsx`
- Modify: `src/app/page.tsx` (versão final), `src/app/globals.css` (imports)

**Interfaces:**
- Consumes: `IconeSelo` (Task 2); `ComAmo`, `BotaoRetro`, `PilulaLink` (Task 5); `FotoParallax` (Task 6); `useNaTela`, `useFiltro` (Task 4); `Visao.rotulos`, `Visao.linhasNoFinal`, `Visao.fotoDaMarca` (Task 3).
- Produces: `PapelRotulo({ linha, nomesDosSelos, giro, largo? })`, `Rotulos({ linhas, nomesDosSelos })`, `AMarca({ foto })`, `FaixaCobre()`, `Final({ linhas })`.

- [ ] **Step 1: Escrever os testes que vão falhar**

```tsx title="tests/secoes.test.tsx"
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Rotulos } from '@/components/sections/Rotulos'
import { AMarca } from '@/components/sections/AMarca'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { Final } from '@/components/sections/Final'
import { FiltroProvider } from '@/components/FiltroProvider'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'
import { CATALOGO_MISTO } from './fixtures/catalogo-misto'
import { Sonda } from './fixtures/sonda'

const real = montarVisao(await carregarCatalogo())
const misto = montarVisao(CATALOGO_MISTO)

describe('Rótulos', () => {
  it('com uma linha só: um rótulo largo e o título de linha única', () => {
    const { container } = render(<Rotulos linhas={real.rotulos} nomesDosSelos={real.nomesDosSelos} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('O que é saudável aqui está no rótulo.')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(container.querySelector('.mesa')).toHaveClass('mesa--unica')
    expect(container.querySelector('.papel-rotulo')).toHaveClass('papel-rotulo--papel', 'papel-rotulo--largo')
  })

  it('o rótulo do pote traz regra, os 6 selos com ícone, o modo de aproveitar e a faixa', () => {
    render(<Rotulos linhas={real.rotulos} nomesDosSelos={real.nomesDosSelos} />)
    const rotulo = screen.getByRole('article', { name: 'Bolos no pote' })
    expect(rotulo).toHaveTextContent('Zero açúcar')
    const selos = within(rotulo).getByRole('list', { name: 'Selos da linha Bolos no pote' })
    expect(within(selos).getAllByRole('listitem')).toHaveLength(6)
    expect(selos.querySelectorAll('svg')).toHaveLength(6)
    const passos = rotulo.querySelector('ol')!
    expect([...passos.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'Abra com amor',
      'Pegue sua colher',
      'A saboreie sem culpa',
      'Cuide do pote de vidro',
    ])
    expect(rotulo).toHaveTextContent('Como aproveitar seu AMO')
    expect(within(rotulo).getByText('AMO')).toHaveAttribute('translate', 'no')
    expect(rotulo).toHaveTextContent('Um abraço em forma de sobremesa')
  })

  it('com várias linhas: um rótulo por linha, na cor dela, e o título de várias', () => {
    const { container } = render(<Rotulos linhas={misto.rotulos} nomesDosSelos={misto.nomesDosSelos} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Cada linha tem a sua regra. Todas estão no rótulo.')
    const papeis = [...container.querySelectorAll('.papel-rotulo')]
    expect(papeis.map((p) => p.className.match(/papel-rotulo--(papel|linho|kraft)/)?.[1])).toEqual([
      'papel',
      'linho',
      'kraft',
    ])
    expect(papeis.map((p) => (p as HTMLElement).style.getPropertyValue('--giro'))).toEqual(['-2deg', '1.4deg', '-1deg'])
    expect(container.querySelector('.mesa')).not.toHaveClass('mesa--unica')
  })

  it('é a superfície escura #rotulos', () => {
    const { container } = render(<Rotulos linhas={real.rotulos} nomesDosSelos={real.nomesDosSelos} />)
    expect(container.querySelector('section')).toHaveAttribute('id', 'rotulos')
    expect(container.querySelector('section')).toHaveClass('superficie-escura', 'scroll-mt-24')
  })
})

describe('A marca', () => {
  it('foto do Beijinho, título e texto, sem repetir a assinatura da faixa', () => {
    const { container } = render(<AMarca foto={real.fotoDaMarca} />)
    expect(screen.getByAltText(/bolo de beijinho/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Comer bem não devia cobrar nada depois')
    expect(container.textContent).toContain('eritritol e stevia')
    expect(container.textContent).not.toMatch(/por você/)
    expect(screen.getByText('AMO')).toHaveAttribute('translate', 'no')
  })
})

describe('Faixa cobre', () => {
  it('traz a linha secundária da marca com os dois AMO blindados', () => {
    const { container } = render(<FaixaCobre />)
    expect(container.textContent).toBe('AMO por você. Por seu AMO. ♥')
    expect(container.querySelectorAll('span[translate="no"]')).toHaveLength(2)
  })
})

describe('Final', () => {
  const montar = (linhas = real.linhasNoFinal) =>
    render(
      <FiltroProvider>
        <Final linhas={linhas} />
        <Sonda />
      </FiltroProvider>,
    )

  it('com uma linha só, só o título e o botão', () => {
    montar()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Escolha o seu AMO.')
    expect(screen.getByRole('link', { name: 'Ver o cardápio' })).toHaveAttribute('href', '#cardapio')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('com várias linhas, uma pílula por linha que escolhe a linha e limpa o resto', async () => {
    const user = userEvent.setup()
    montar(misto.linhasNoFinal)
    await user.click(screen.getByRole('button', { name: 'sonda: tudo ligado' }))
    await user.click(screen.getByRole('link', { name: 'Salgados' }))
    expect(screen.getByTestId('filtro')).toHaveTextContent('salgado|-|-')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/secoes.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

```tsx title="src/components/ui/PapelRotulo.tsx"
import type { CSSProperties } from 'react'
import { IconeSelo } from '@/components/icons/selos'
import { ComAmo } from '@/components/ui/ComAmo'
import type { Linha } from '@/lib/catalogo'

type Props = {
  linha: Linha
  nomesDosSelos: Readonly<Record<string, string>>
  /** o giro de leve do papel na mesa */
  giro: string
  /** linha unica: o cartao fica largo e se divide em duas colunas */
  largo?: boolean
}

/** O rotulo de papel de uma linha: regra, selos, modo de aproveitar, faixa. */
export function PapelRotulo({ linha, nomesDosSelos, giro, largo = false }: Props) {
  const idTitulo = `rotulo-${linha.slug}`
  return (
    <article
      aria-labelledby={idTitulo}
      className={`papel-rotulo papel-rotulo--${linha.corDoRotulo}${largo ? ' papel-rotulo--largo' : ''}`}
      style={{ '--giro': giro } as CSSProperties}
    >
      <h3 id={idTitulo}>{linha.nome}</h3>
      <p className="papel-rotulo__regra">{linha.regra}</p>
      <div className="papel-rotulo__corpo">
        <ul className="papel-rotulo__selos" aria-label={`Selos da linha ${linha.nome}`}>
          {linha.selos.map((id) => (
            <li key={id}>
              <IconeSelo id={id} />
              {nomesDosSelos[id] ?? id}
            </li>
          ))}
        </ul>
        {linha.modoDeAproveitar ? (
          <div className="papel-rotulo__modo">
            <p className="papel-rotulo__modo-titulo">
              <ComAmo texto={linha.modoDeAproveitar.titulo} />
            </p>
            <ol>
              {linha.modoDeAproveitar.passos.map((passo) => (
                <li key={passo}>{passo}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
      {linha.frase ? (
        <p className="papel-rotulo__faixa">
          <ComAmo texto={linha.frase} /> <span aria-hidden="true">♥</span>
        </p>
      ) : null}
    </article>
  )
}
```

```tsx title="src/components/sections/Rotulos.tsx"
'use client'

import { PapelRotulo } from '@/components/ui/PapelRotulo'
import { useNaTela } from '@/components/ui/useNaTela'
import type { Linha } from '@/lib/catalogo'

const GIROS = ['-2deg', '1.4deg', '-1deg'] as const

type Props = {
  linhas: readonly Linha[]
  nomesDosSelos: Readonly<Record<string, string>>
}

/**
 * O que é saudável: um rotulo de papel por linha, pousando na mesa quando a
 * secao entra na tela. Com uma linha so, o titulo deixa de falar em "cada
 * linha" e o cartao fica largo.
 */
export function Rotulos({ linhas, nomesDosSelos }: Props) {
  const [ref, visto] = useNaTela<HTMLDivElement>()
  const unica = linhas.length === 1
  return (
    <section id="rotulos" aria-labelledby="titulo-rotulos" className="rotulos superficie-escura scroll-mt-24">
      <div className="wrap">
        <p className="rotulo-secao">Sabores saudáveis</p>
        <h2 id="titulo-rotulos" className="titulo-secao">
          {unica ? 'O que é saudável aqui está no rótulo.' : 'Cada linha tem a sua regra. Todas estão no rótulo.'}
        </h2>
        <div ref={ref} className={`mesa${unica ? ' mesa--unica' : ''}${visto ? ' play' : ''}`}>
          {linhas.map((linha, i) => (
            <div key={linha.slug} className="mesa__item">
              <PapelRotulo
                linha={linha}
                nomesDosSelos={nomesDosSelos}
                giro={GIROS[i % GIROS.length]}
                largo={unica}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

```tsx title="src/components/sections/AMarca.tsx"
import { FotoParallax } from '@/components/ui/FotoParallax'
import type { ImagemProduto } from '@/lib/catalogo'

/**
 * A marca. Texto escrito para esta pagina (spec §14, pendente de aval do
 * cliente). A assinatura "AMO por voce" nao se repete aqui: a faixa cobre
 * logo abaixo ja e ela.
 */
export function AMarca({ foto }: { foto: ImagemProduto }) {
  return (
    <section id="marca" aria-labelledby="titulo-marca" className="marca grao scroll-mt-24">
      <div className="wrap marca__grade">
        <div className="arco-foto marca__foto">
          <FotoParallax
            imagem={foto}
            sizes="(max-width: 820px) 90vw, 400px"
            className="h-full w-full"
            proporcao="h-full w-full"
          />
        </div>
        <div>
          <p className="rotulo-secao">A marca</p>
          <h2 id="titulo-marca" className="titulo-secao">
            Comer bem não devia cobrar nada depois
          </h2>
          <p className="texto">
            <span translate="no">AMO</span> nasceu de uma ideia simples: o que é gostoso não precisa pesar
            depois. Cada receita é feita na versão saudável, e o rótulo diz o que tem e o que não tem. Nos
            bolos no pote, por exemplo: montados à mão, cozidos a vapor e adoçados com eritritol
            e{' '}stevia. Açúcar, nenhum.
          </p>
        </div>
      </div>
    </section>
  )
}
```

```tsx title="src/components/sections/FaixaCobre.tsx"
/** A linha secundaria da marca, numa faixa cobre. */
export function FaixaCobre() {
  return (
    <div className="faixa-cobre">
      <p>
        <span translate="no">AMO</span> por você. Por seu <span translate="no">AMO</span>.{' '}
        <span aria-hidden="true">♥</span>
      </p>
    </div>
  )
}
```

```tsx title="src/components/sections/Final.tsx"
'use client'

import { useFiltro } from '@/components/FiltroProvider'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { PilulaLink } from '@/components/ui/Pilula'

type Props = {
  /** vazio quando ha uma linha so (montarVisao decide) */
  linhas: readonly { slug: string; nome: string }[]
}

/** O fecho, expresso: chamada final e, com varias linhas, um atalho por linha. */
export function Final({ linhas }: Props) {
  const { definir } = useFiltro()
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
              <PilulaLink
                key={l.slug}
                href="#cardapio"
                variante="clara"
                onClick={() => definir({ linha: l.slug, selo: null, vontade: null })}
              >
                {l.nome}
              </PilulaLink>
            ))}
          </div>
        ) : null}
        <BotaoRetro href="#cardapio" className="final__botao">
          Ver o cardápio
        </BotaoRetro>
      </div>
    </section>
  )
}
```

```css title="src/app/estilos/rotulos.css"
/* O que é saudável: rotulos de papel sobre expresso. */
@layer components {
  .rotulos { padding: 84px 0 110px; background: var(--color-expresso); color: var(--color-creme); }
  .rotulos .titulo-secao { max-width: 16ch; }
  .mesa { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 30px; align-items: start; margin-top: 52px; }
  .mesa--unica { grid-template-columns: minmax(0, 760px); }
  .mesa__item:nth-child(2) { margin-top: 18px; }

  .papel-rotulo {
    position: relative; overflow: hidden; padding: 26px 24px 0; border-radius: 12px;
    background: var(--color-papel); color: var(--color-expresso);
    box-shadow: 0 30px 60px -24px rgb(0 0 0 / .7);
    transform: rotate(var(--giro, 0deg));
    transition: transform .45s var(--ease-mola), box-shadow .45s ease;
  }
  .papel-rotulo::after {
    content: ""; position: absolute; inset: 8px; border: 1.5px solid rgb(43 27 22 / .18);
    border-radius: 7px; pointer-events: none;
  }
  @media (hover: hover) {
    .papel-rotulo:hover { transform: rotate(0) translateY(-12px) scale(1.03); box-shadow: 0 40px 60px -24px rgb(0 0 0 / .85); }
  }
  .papel-rotulo--linho { background: var(--color-linho); }
  .papel-rotulo--kraft { background: var(--color-kraft); }
  .papel-rotulo h3 { font-size: 26px; }
  .papel-rotulo__regra { margin: 4px 0 0; font-size: 15px; font-weight: 700; color: var(--color-cobre-texto); }
  /* cobre-texto sobre kraft mede 3.17:1; no kraft a regra vai em chocolate */
  .papel-rotulo--kraft .papel-rotulo__regra { color: var(--color-chocolate); }
  .papel-rotulo__selos { margin: 16px 0 0; padding: 14px 0 0; border-top: 1.5px dashed rgb(43 27 22 / .25); list-style: none; }
  .papel-rotulo__selos li { display: flex; align-items: center; gap: 10px; margin: 9px 0; font-size: 15.5px; font-weight: 600; }
  .papel-rotulo__selos svg { flex: none; width: 26px; height: 26px; }
  .papel-rotulo__modo {
    margin-top: 12px; padding-top: 12px; border-top: 1.5px dashed rgb(43 27 22 / .25);
    font-size: 15px; line-height: 1.55; color: var(--color-suave);
  }
  .papel-rotulo__modo-titulo { margin: 0 0 6px; font: 400 18px/1.2 var(--font-display); color: var(--color-expresso); }
  .papel-rotulo__modo ol { margin: 0; padding-left: 20px; }
  .papel-rotulo__modo li { margin: 3px 0; font-weight: 500; }
  .papel-rotulo__faixa {
    margin: 18px -24px 0; padding: 11px; background: var(--color-vinho); color: var(--color-papel);
    text-align: center; font-size: 14.5px; font-weight: 600;
  }
  .papel-rotulo--linho .papel-rotulo__faixa { background: var(--color-chocolate); }
  .papel-rotulo--kraft .papel-rotulo__faixa { background: var(--color-expresso); }
  @media (min-width: 821px) {
    .papel-rotulo--largo .papel-rotulo__corpo { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .papel-rotulo--largo .papel-rotulo__modo { margin-top: 16px; padding-top: 14px; }
  }
}
```

```css title="src/app/estilos/marca.css"
/* A marca, a faixa cobre e o final. */
@layer components {
  .marca { padding: 90px 0; }
  .marca__grade { display: grid; gap: 28px; align-items: center; }
  @media (min-width: 821px) {
    .marca__grade { grid-template-columns: .9fr 1.1fr; gap: 64px; }
  }
  .marca__foto { justify-self: center; width: min(400px, 100%); height: clamp(380px, 40vw, 500px); border-radius: 999px 999px 28px 28px; }

  .faixa-cobre { padding: 34px var(--gutter); background: var(--color-cobre); color: var(--color-expresso); text-align: center; }
  .faixa-cobre p { margin: 0; font: 400 clamp(28px, 4vw, 46px)/1.1 var(--font-display); text-wrap: balance; }

  .final { padding: 96px 0 90px; background: var(--color-expresso); color: var(--color-creme); text-align: center; }
  .final h2 { font-size: clamp(48px, 7vw, 84px); line-height: 1; }
  .final p { max-width: 44ch; margin: 18px auto 0; font-size: 19px; color: var(--color-claro-suave); }
  .final__linhas { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 34px; }
  .final__botao { margin-top: 40px; }
}
```

```tsx title="src/app/page.tsx"
import { FiltroProvider } from '@/components/FiltroProvider'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { AMarca } from '@/components/sections/AMarca'
import { Cardapio } from '@/components/sections/Cardapio'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { Final } from '@/components/sections/Final'
import { Hero } from '@/components/sections/Hero'
import { HojeODiaPede } from '@/components/sections/HojeODiaPede'
import { Rotulos } from '@/components/sections/Rotulos'
import { Camadas } from '@/components/ui/Camadas'
import { carregarCatalogo } from '@/lib/catalogo'
import { montarVisao } from '@/lib/visao'

/**
 * A home. Server Component: carrega o cadastro, decide uma vez o que
 * aparece (montarVisao) e entrega dados prontos para as secoes. O
 * FiltroProvider envolve o <main> e o rodape, que tambem filtra.
 */
export default async function Home() {
  const visao = montarVisao(await carregarCatalogo())
  return (
    <FiltroProvider>
      <Nav />
      <main id="conteudo" className="scroll-mt-24">
        <Hero palco={visao.palco} destaque={visao.destaque} regra={visao.regraDoDestaque} />
        <Camadas estrato="heroCardapio" />
        <Cardapio
          produtos={visao.produtos}
          tipos={visao.tipos}
          nomesDosSelos={visao.nomesDosSelos}
          filtrosLinha={visao.filtrosLinha}
          filtrosSelo={visao.filtrosSelo}
          vontades={visao.vontades}
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
      <Footer linhas={visao.rotulos} filtraLinha={visao.filtrosLinha.length > 0} />
    </FiltroProvider>
  )
}
```

Em `src/app/globals.css`, somar `@import "./estilos/rotulos.css";` e `@import "./estilos/marca.css";` depois do `hoje.css`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: rotulos por linha, a marca, faixa cobre e final"
```

---

### Task 12: A página inteira (invariantes, HTML do servidor, README)

**Files:**
- Create: `tests/pagina.test.tsx`, `tests/ssr.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `Home` (`src/app/page.tsx`, assíncrona), `PRODUTOS`.

- [ ] **Step 1: Escrever os testes**

```tsx title="tests/pagina.test.tsx"
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import Home from '@/app/page'
import { PRODUTOS } from '@/data/produtos'

/**
 * Portao da pagina inteira (spec §11): so o que precisa da home montada.
 * Limite conhecido: renderiza o fragmento, nao um <html> de verdade, entao
 * as regras de documento do axe (region, landmark-one-main) nao rodam aqui.
 * O contraste real vem dos hex dos tokens (tests/tokens.test.ts), porque o
 * jsdom nao pinta pixel.
 */
const pagina = await Home()
const montar = () => render(pagina)

function arquivosFonte(): string[] {
  const raiz = resolve(import.meta.dirname, '../src')
  return readdirSync(raiz, { recursive: true })
    .filter((f): f is string => typeof f === 'string' && /\.(ts|tsx)$/.test(f))
    .map((f) => resolve(raiz, f))
}

describe('a página completa', () => {
  it('tem exatamente um h1', () => {
    montar()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('não pula nível de heading', () => {
    const { container } = montar()
    const niveis = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]))
    for (let i = 1; i < niveis.length; i++) expect(niveis[i] - niveis[i - 1]).toBeLessThanOrEqual(1)
  })

  it('as seções na ordem da spec', () => {
    const { container } = montar()
    expect([...container.querySelectorAll('section[id]')].map((s) => s.id)).toEqual([
      'topo',
      'cardapio',
      'hoje',
      'rotulos',
      'marca',
    ])
  })

  it('os 7 produtos aparecem pelo nome do produto, sem nome poético', () => {
    const { container } = montar()
    const cardapio = container.querySelector('#cardapio') as HTMLElement
    for (const p of PRODUTOS) {
      expect(within(cardapio).getByRole('heading', { level: 3, name: p.nome })).toBeInTheDocument()
    }
    expect(container.textContent).not.toMatch(/Aconchego|Raízes|Leveza|Encontro|Carinho|Intensamente|Energia/)
  })

  it('não deixa imagem sem alt nem sem width e height', () => {
    const { container } = montar()
    for (const img of container.querySelectorAll('img')) {
      expect(img.hasAttribute('alt')).toBe(true)
      expect(img.hasAttribute('width')).toBe(true)
      expect(img.hasAttribute('height')).toBe(true)
    }
  })

  it('todo link interno aponta para um id que existe, e o alvo tem scroll-mt-24', () => {
    const { container } = montar()
    const ids = new Set(
      [...container.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')!.slice(1)).filter(Boolean),
    )
    for (const id of ids) {
      const alvo = container.querySelector(`#${id}`)
      expect(alvo, `âncora morta: #${id}`).toBeTruthy()
      expect(alvo!.className, `#${id} sem scroll-mt-24`).toMatch(/\bscroll-mt-24\b/)
    }
  })

  it('não tem afordância morta: link sempre com href, botão sempre com type', () => {
    const { container } = montar()
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href')).toBeTruthy()
    for (const b of container.querySelectorAll('button')) expect(b.getAttribute('type')).toBe('button')
  })

  it('não mostra preço nem reticências de três pontos', () => {
    const { container } = montar()
    expect(container.textContent).not.toMatch(/R\$\s?\d/)
    expect(container.textContent).not.toMatch(/\.\.\./)
  })

  it('passa no axe sem violação', async () => {
    const { container } = montar()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('o &nbsp; de "eritritol e stevia" na marca sobrevive como U+00A0', () => {
    const { container } = montar()
    expect((container.textContent ?? '').split('e stevia').length - 1).toBe(1)
  })

  it('exatamente uma imagem tem preload: a do destaque no hero, no DOM e no código', () => {
    const { container } = montar()
    const semLoading = [...container.querySelectorAll('img')].filter((img) => !img.hasAttribute('loading'))
    expect(semLoading).toHaveLength(1)
    expect(semLoading[0]).toHaveAttribute('alt', PRODUTOS.find((p) => p.destaque)!.imagem.alt)

    // `preload` em posicao de atributo JSX: sozinho no fim da linha ou
    // seguido de `=`. So o Hero liga; o FotoParallax so repassa.
    const comPreload = arquivosFonte().filter((arquivo) =>
      /(^|[\s{])preload(?=\s*$|=)/m.test(readFileSync(arquivo, 'utf8')),
    )
    expect(comPreload.map((a) => a.replace(/\\/g, '/'))).toEqual([
      expect.stringMatching(/\/components\/sections\/Hero\.tsx$/),
    ])
  })

  it('nenhuma animação em loop, nem no DOM nem num prop de biblioteca', () => {
    const { container } = montar()
    expect(container.innerHTML).not.toMatch(/infinite/i)
    for (const arquivo of arquivosFonte()) {
      expect(readFileSync(arquivo, 'utf8'), arquivo).not.toMatch(/repeat:\s*Infinity/)
    }
  })

  it('todo "AMO" renderizado como texto está dentro de translate="no", sem exceção', () => {
    const { container } = montar()
    const caminhante = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    const ocorrencias: Text[] = []
    let no: Node | null
    while ((no = caminhante.nextNode())) {
      if (/\bAMO\b/.test(no.textContent ?? '')) ocorrencias.push(no as Text)
    }
    // rotulo (1) + marca (1) + faixa (2) + final (1) + rodape (1)
    expect(ocorrencias).toHaveLength(6)
    for (const t of ocorrencias) {
      expect(t.parentElement?.getAttribute('translate'), t.parentElement?.outerHTML).toBe('no')
    }
  })

  it('o hero é o único lugar que pinta texto de cobre puro', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/app/estilos/hero.css'), 'utf8')
    expect(css).toMatch(/\.hero__titulo em \{[^}]*color: var\(--color-cobre\)/)
  })
})
```

```tsx title="tests/ssr.test.tsx"
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import Home from '@/app/page'

/**
 * Regressao do hero em branco da v1.1: o HTML do servidor saia com
 * opacity:0 inline (o estado `initial` do Motion), e sem JS, ou com JS
 * atrasado, a pagina ficava em branco. Aqui o HTML que o servidor manda nao
 * pode esconder nada sozinho.
 */
const html = renderToString(await Home())
const doc = new DOMParser().parseFromString(html, 'text/html')

describe('o HTML do servidor', () => {
  it('não esconde nada por estilo inline', () => {
    const ofensores: string[] = []
    for (const el of doc.querySelectorAll('[style]')) {
      const estilo = el.getAttribute('style') ?? ''
      const escondido =
        /(^|;)\s*opacity:\s*0(\.0+)?\s*(;|$)/.test(estilo) ||
        /visibility:\s*hidden/.test(estilo) ||
        /clip-path/.test(estilo)
      const transforma = /(^|;)\s*transform:\s*(?!none\s*(;|$))/.test(estilo)
      if (escondido || (transforma && !el.hasAttribute('data-parallax'))) {
        ofensores.push(el.outerHTML.slice(0, 160))
      }
    }
    expect(ofensores).toEqual([])
  })

  it('não sai com a classe play: quem liga é o JS, ao entrar na tela', () => {
    expect(doc.querySelectorAll('.play')).toHaveLength(0)
  })

  it('a página inteira está no HTML: as 5 seções e os 7 cards', () => {
    expect(doc.querySelectorAll('section[id]')).toHaveLength(5)
    expect(doc.querySelectorAll('#cardapio article')).toHaveLength(7)
  })
})
```

- [ ] **Step 2: Rodar**

Run: `npx vitest run tests/pagina.test.tsx tests/ssr.test.tsx`
Expected: PASS. Se algum falhar, a falha é um defeito real das Tasks 7 a 11: corrigir lá, nunca afrouxar o teste.

- [ ] **Step 3: Atualizar o README**

Trocar no `README.md`:
- o primeiro parágrafo por: "Home v2 da AMO, direção "Retrô doce". Página institucional dirigida por um cadastro (linhas, produtos, selos, vontades), sem carrinho, sem preço e sem checkout; essas partes vêm em rodadas seguintes sobre Supabase. A especificação está em `docs/superpowers/specs/2026-10-05-amo-home-v2-retro-design.md` e o plano em `docs/superpowers/plans/2026-10-05-amo-home-v2-retro.md`."
- o item do Motion por: "**Motion** (ex-Framer Motion), só o FLIP do cardápio e o parallax das fotos; as entradas são CSS, atrás da classe `html.js`"
- o item do next/font por: "**next/font**, Caprasimo (display) e DM Sans (texto, com o eixo `opsz`), self-hosted via Google Fonts"
- o item do next/image por: "**next/image**, as fotos dos produtos em `public/produtos`"
- somar depois da lista: "O cadastro mora em `src/data/` e passa por `carregarCatalogo()` (`src/lib/catalogo.ts`), que valida e derruba o build se algo estiver errado. Para trocar pelo Supabase, troca só essa função."

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests README.md
git commit -m "test: invariantes da pagina inteira e o HTML do servidor sem estado escondido"
```

---

### Task 13: Verificação final (lint, tipos, build, olho)

**Files:**
- Nenhum arquivo novo, salvo correções que a verificação apontar.

- [ ] **Step 1: Lint, tipos e build**

Run: `npm run lint`
Expected: sem erro.

Run: `npx tsc --noEmit`
Expected: sem erro.

Run: `npm run build`
Expected: build de produção concluído.

- [ ] **Step 2: Subir a versão de produção**

Run (em segundo plano): `npx next start -p 3100`

- [ ] **Step 3: Capturas no Edge headless**

Com movimento reduzido (estado final, sem pino), página inteira:

```bash
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion --window-size=1440,9000 --screenshot="$SCRATCH/v2-1440.png" http://localhost:3100/
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion --window-size=480,14000 --screenshot="$SCRATCH/v2-480.png" http://localhost:3100/
```

Com animação (o hero depois da entrada):

```bash
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=4000 --window-size=1440,900 --screenshot="$SCRATCH/v2-hero.png" http://localhost:3100/
```

Para 320 px (o Edge headless não desce de ~477 px), um HTML no scratchpad com `<iframe src="http://localhost:3100/" width="320" height="6000">` capturado a 360 px de largura.

- [ ] **Step 4: Conferir contra o protótipo**

Abrir as capturas e comparar com `docs/superpowers/specs/assets/2026-10-05-prototipo-retro-doce.html`:
- paleta, fontes, estratos, molduras;
- palco do hero com o selo;
- cardápio sem filtros, com 7 cards;
- Hoje o dia pede com 4 abas;
- um rótulo largo;
- marca, faixa, final, rodapé;
- sem rolagem horizontal a 320 e 480.

Anotar e corrigir o que divergir.

- [ ] **Step 5: Rodar tudo de novo e commitar as correções**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: tudo verde.

```bash
git add -A src tests
git commit -m "fix: ajustes da verificacao visual da v2"
```

(Só se houver correção.)

- [ ] **Step 6: Lighthouse (se disponível)**

Run: `npx --yes lighthouse http://localhost:3100/ --only-categories=performance,accessibility --form-factor=mobile --screenEmulation.mobile --chrome-flags="--headless=new" --output=json --output-path="$SCRATCH/lh.json"` com `CHROME_PATH` apontando para o Edge.
Expected: Performance de 95 ou mais e Acessibilidade 100. Se a ferramenta não rodar no ambiente, registrar isso no relatório final em vez de declarar o critério cumprido.
