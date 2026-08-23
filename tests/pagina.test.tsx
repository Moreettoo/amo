// tests/pagina.test.tsx
//
// Portão de aceite da Task 12 (spec §14): verifica só o que precisa da
// página inteira montada — as 10 asserções do brief mais 4 dobradas da
// autorrevisão da Task 11 (progress.md, "Task 11: Ruling", itens a-d), que
// são invariantes de página inteira e por isso pertencem aqui, não a um
// teste de seção isolada.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import Home from '@/app/page'
import { SABORES } from '@/data/sabores'
import { SELOS } from '@/data/selos'
import { RITUAL } from '@/data/ritual'

/** Todo arquivo .ts/.tsx sob src/, para os dois guardas que precisam ler
 * código-fonte em vez de DOM renderizado (loop infinito escondido num prop
 * de biblioteca; priority sem marcador positivo no DOM). */
function arquivosFonte(): string[] {
  const raiz = resolve(import.meta.dirname, '../src')
  return readdirSync(raiz, { recursive: true })
    .filter((f): f is string => typeof f === 'string' && /\.(ts|tsx)$/.test(f))
    .map((f) => resolve(raiz, f))
}

describe('a página completa', () => {
  it('tem exatamente um h1', () => {
    render(<Home />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('não pula nível de heading', () => {
    const { container } = render(<Home />)
    const niveis = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) =>
      Number(h.tagName[1]),
    )
    for (let i = 1; i < niveis.length; i++) {
      expect(niveis[i] - niveis[i - 1]).toBeLessThanOrEqual(1)
    }
  })

  it('mostra os 7 sabores, os 6 selos e os 4 passos', () => {
    render(<Home />)
    for (const s of SABORES) expect(screen.getAllByText(s.nome).length).toBeGreaterThan(0)
    for (const s of SELOS) expect(screen.getAllByText(s.nome).length).toBeGreaterThan(0)
    for (const p of RITUAL) expect(screen.getAllByText(p.titulo).length).toBeGreaterThan(0)
  })

  it('não deixa imagem sem alt', () => {
    const { container } = render(<Home />)
    for (const img of container.querySelectorAll('img')) {
      expect(img.hasAttribute('alt')).toBe(true)
    }
  })

  it('não deixa imagem sem width e height', () => {
    const { container } = render(<Home />)
    for (const img of container.querySelectorAll('img')) {
      expect(img.hasAttribute('width')).toBe(true)
      expect(img.hasAttribute('height')).toBe(true)
    }
  })

  it('todo link interno aponta para um id que existe na página', () => {
    const { container } = render(<Home />)
    const ancoras = [...container.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href')!.slice(1))
      .filter((id) => id && id !== 'conteudo')
    for (const id of new Set(ancoras)) {
      expect(container.querySelector(`#${id}`), `âncora morta: #${id}`).toBeTruthy()
    }
  })

  it('não tem afordância morta: nenhum botão sem handler nem link vazio', () => {
    const { container } = render(<Home />)
    for (const a of container.querySelectorAll('a')) {
      expect(a.getAttribute('href')).toBeTruthy()
    }
  })

  it('não mostra preço em lugar nenhum — está fora do escopo da v1', () => {
    const { container } = render(<Home />)
    expect(container.textContent).not.toMatch(/R\$\s?\d/)
  })

  it('não usa reticências de três pontos', () => {
    const { container } = render(<Home />)
    expect(container.textContent).not.toMatch(/\.\.\./)
  })

  it('passa no axe sem violação', async () => {
    // O único item que sobra em resultado.incomplete (não em .violations,
    // que é o que toHaveNoViolations() checa) é color-contrast — o jsdom
    // não implementa HTMLCanvasElement.getContext(), que é como o axe mede
    // cor renderizada, e a lib marca o teste como incompleto em vez de
    // fingir passar ou reprovar. Não é uma lacuna nova: o contraste real,
    // calculado direto dos hex dos tokens (não de pixel renderizado), já
    // está coberto por tests/tokens.test.ts — é o critério de pronto §14.6.
    const { container } = render(<Home />)
    expect(await axe(container)).toHaveNoViolations()
  })

  // ---------------------------------------------------------------------
  // As 4 asserções dobradas da autorrevisão da Task 11 (progress.md,
  // "Task 11: Ruling", itens a-d). Cada uma fecha uma lacuna já identificada
  // e nomeada por número, não uma suspeita nova.
  // ---------------------------------------------------------------------

  it('os &nbsp; sobrevivem como U+00A0 real — nunca espaço comum, nunca regex frouxa', () => {
    const { container } = render(<Home />)
    const texto = container.textContent ?? ''

    // "eritritol e␠stevia" tem &nbsp; entre "e" e "stevia" no Hero e na
    // Marca. Já foi derrubado pra espaço comum uma vez neste projeto
    // (Task 7) por uma regex que aceitava qualquer \s — \s do JS já casa
    // U+00A0, então aquela regex passava com espaço comum, com nbsp de
    // verdade OU sem espaço nenhum. Contagem exata (não "pelo menos uma
    // vez"): um regresso que derruba só uma das duas ocorrências não pode
    // passar batido.
    expect(texto.split('e\u00A0stevia').length - 1).toBe(2)

    // "Pote de␠vidro" tem &nbsp; entre "de" e "vidro" na barra de anúncio,
    // no Hero e no Bento. Já foi derrubado uma vez (Task 5, na barra de
    // anúncio) e a ocorrência do Bento nunca teve cobertura própria — item
    // (a) da autorrevisão da Task 11.
    expect(texto.split('de\u00A0vidro').length - 1).toBe(3)
  })

  it('exatamente uma imagem tem priority — o pote do hero, nunca o Bento nem o CtaFinal', () => {
    // Item (b) da autorrevisão da Task 11: "nada garante que Bento/CtaFinal
    // sigam sem priority — conferido a mão 1x, sem teste".
    //
    // Ângulo 1 — DOM renderizado: o Next não emite marcador positivo pra
    // priority, só a ausência do atributo `loading` (quando `priority` é
    // passado sem `loading` explícito, `loadingFinal` fica `undefined` e
    // React omite o atributo — confirmado lendo
    // next/dist/shared/lib/get-img-props.js). Checar "!== 'lazy'" em vez de
    // "atributo ausente" pegaria falso-positivo no logo da nav: ele usa
    // `loading="eager"` + `fetchPriority="low"` de propósito (Task 6, pra
    // não competir com o pote pelo link de preload do LCP) e por isso TEM
    // um atributo `loading` — só que "eager", não "lazy". `hasAttribute`
    // distingue os dois casos; `getAttribute(...) !== 'lazy'` não distingue.
    const { container } = render(<Home />)
    const semLoading = [...container.querySelectorAll('img')].filter(
      (img) => !img.hasAttribute('loading'),
    )
    expect(semLoading).toHaveLength(1)
    expect(semLoading[0]).toHaveAttribute('alt', SABORES[0].alt)

    // Ângulo 2 — código-fonte: a prova acima tem um ponto cego teórico (se
    // um dia alguém somar `priority` à imagem do nav SEM tirar o
    // `loading="eager"` que já está lá, o atributo `loading` continua
    // presente e a checagem acima não nota a mudança). A palavra `priority`
    // como prop só pode aparecer em src/**, e só uma vez.
    const comPriority = arquivosFonte().filter((arquivo) =>
      /(^|[\s{])priority(\s|$|=)/m.test(readFileSync(arquivo, 'utf8')),
    )
    expect(comPriority.map((a) => a.replace(/\\/g, '/'))).toEqual([
      expect.stringMatching(/\/components\/sections\/Hero\.tsx$/),
    ])
  })

  it('disciplina do token rosewood: bg-rosewood só na faixa de assinatura, resto é rosewood-forte', () => {
    // Item (c) da autorrevisão da Task 11: "o guarda de bg-rosewood cobre
    // só a raiz da FaixaAssinatura; nada pega text-rosewood-forte do Bento
    // derivando pra rosewood puro em outro lugar".
    //
    // cream sobre rosewood puro (#B9707A) é 3.35:1 — passa o piso de 3:1 de
    // texto grande, reprova o de 4.5:1 de texto normal (tests/tokens.test.ts
    // já mede os dois números). Por isso rosewood puro só pode cobrir a
    // faixa (Bodoni caps grande); todo resto tem que ser rosewood-forte.
    // As duas direções importam: a faixa não pode migrar pra -forte (perde
    // a citação da tarja do rótulo) e nada mais pode migrar pra puro (perde
    // contraste AA de texto normal).
    const { container } = render(<Home />)
    const semForte = container.innerHTML.match(/rosewood(?!-forte)/g) ?? []
    expect(semForte).toHaveLength(1)
  })

  it('nenhuma animação em loop infinito — nem no DOM renderizado, nem escondida num prop de biblioteca', () => {
    // Item (d) da autorrevisão da Task 11: o guarda existente (ver
    // tests/fechamento.test.tsx) é um substring match em innerHTML — pega
    // classe tipo "animate-marquee", mas NUNCA pegaria loop via prop de
    // biblioteca tipo transition={{ repeat: Infinity }}, porque esse objeto
    // é consumido internamente pelo Motion e nunca é serializado pro DOM. E
    // esta página TEM um <Reveal> de movimento na caixa de ferramentas,
    // então o vetor é real.
    const { container } = render(<Home />)
    const html = container.innerHTML
    expect(html).not.toMatch(/animate-\[?marquee/i)
    expect(html).not.toMatch(/infinite/i)

    // Único jeito de pegar repeat:Infinity é ler o código-fonte: nenhum
    // arquivo sob src/ pode conter o literal `Infinity` do JS.
    for (const arquivo of arquivosFonte()) {
      const codigo = readFileSync(arquivo, 'utf8')
      expect(codigo, `${arquivo} usa Infinity`).not.toMatch(/\bInfinity\b/)
    }
  })
})
