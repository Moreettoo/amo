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
    // #conteudo não é mais excluído: é âncora do skip link e do logo da nav,
    // e <main id="conteudo"> está presente sempre que <Home/> é montado — a
    // exclusão nunca protegia nada, só escondia o alvo mais carregado da
    // página deste próprio guarda (revisão da Task 12).
    const ancoras = [...container.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href')!.slice(1))
      .filter((id) => id)
    for (const id of new Set(ancoras)) {
      expect(container.querySelector(`#${id}`), `âncora morta: #${id}`).toBeTruthy()
    }
  })

  it('todo alvo de âncora tem scroll-margin-top — a nav sticky não pode cobrir o elemento focado', () => {
    // Spec §11 e §14.4: "scroll-margin-top em todo alvo de âncora, igual à
    // altura da nav". #conteudo é alvo do skip link (layout.tsx) e do logo
    // da nav (Nav.tsx) — o candidato mais carregado a este requisito, porque
    // ativar o skip link é a primeira coisa que uma pessoa usando teclado
    // faz na página. Era o único alvo sem `scroll-mt-28` até a revisão da
    // Task 12 (page.tsx só tinha `<main id="conteudo">`, sem classe).
    const { container } = render(<Home />)
    const ancoras = [...container.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href')!.slice(1))
      .filter((id) => id)
    for (const id of new Set(ancoras)) {
      const alvo = container.querySelector(`#${id}`)
      expect(alvo, `âncora morta: #${id}`).toBeTruthy()
      expect(alvo!.className, `#${id} sem scroll-mt-28`).toMatch(/\bscroll-mt-28\b/)
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
    // Ponto cego 1 — color-contrast (limite conhecido, não é lacuna nova):
    // o único item que sobra em resultado.incomplete (não em .violations,
    // que é o que toHaveNoViolations() checa) é color-contrast — o jsdom
    // não implementa HTMLCanvasElement.getContext(), que é como o axe mede
    // cor renderizada, e a lib marca o teste como incompleto em vez de
    // fingir passar ou reprovar. O contraste real, calculado direto dos hex
    // dos tokens (não de pixel renderizado), já está coberto por
    // tests/tokens.test.ts — é o critério de pronto §14.6.
    //
    // Ponto cego 2 — regras de documento inteiro NUNCA disparam aqui, e
    // isso já deixou passar um bug real. Este teste (e todo teste de
    // componente da suíte) renderiza só o fragmento <Home/> via
    // @testing-library/react — nunca um <html>/<body> de verdade. As
    // regras do axe que avaliam a árvore a partir da raiz do documento —
    // `region` ("All page content should be contained by landmarks"),
    // `landmark-one-main`, `page-has-heading-one` — só têm onde disparar
    // contra um <body> real; contra um fragmento desconectado, elas não
    // rodam, ponto. Isto não é hipotético: foi exatamente assim que a
    // violação `region` do AnnouncementBar (root <div> solto direto em
    // <body>, antes da <Nav>, sem landmark nenhum cobrindo — ver
    // AnnouncementBar.tsx) escapou dos onze arquivos de teste de
    // componente inteiros E deste mesmo teste de portão nesta mesma
    // tarefa. Só foi encontrada rodando axe-core à mão direto contra o
    // documento real do servidor de dev ao vivo — uma checagem avulsa que
    // não ficou registrada em lugar nenhum do repositório. Sem este
    // parágrafo, uma regressão futura da mesma classe — um novo elemento
    // de topo de nível somado fora de qualquer landmark — passaria por
    // este portão em silêncio, do mesmo jeito, de novo. Fechar o ponto
    // cego de vez exigiria renderizar contra um documento jsdom completo
    // (ou repetir a checagem live-server) — nenhuma das duas está
    // automatizada aqui; isto é a fronteira documentada do que este teste
    // cobre, não uma correção dela.
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
    // presente e a checagem acima não nota a mudança). A prop `priority`
    // como atributo JSX só pode aparecer em src/**, e só uma vez.
    //
    // O padrão casa `priority` só em posição de atributo JSX — início de
    // linha (ou depois de espaço/`{`), seguido só de `=` ou do fim da
    // linha — nunca em qualquer lugar do arquivo. Banir a palavra inteira
    // reprovaria um comentário que citasse "priority" como palavra solta
    // em prosa (termo em inglês dentro de um comentário em português é
    // plausível neste projeto), o que reprovaria código legítimo por um
    // motivo alheio ao que este guarda existe pra pegar. Revisão da
    // Task 12, correção 3.
    const comPriority = arquivosFonte().filter((arquivo) =>
      /(^|[\s{])priority(?=\s*$|=)/m.test(readFileSync(arquivo, 'utf8')),
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

    // Único jeito de pegar repeat:Infinity é ler o código-fonte. O padrão
    // casa só a forma de verdade que o Motion usa — `repeat: Infinity`,
    // dois-pontos e tudo — em vez do literal `Infinity` do JS sozinho:
    // banir a palavra inteira em todo src/ reprovaria qualquer uso legítimo
    // do global `Infinity` do JavaScript sem relação nenhuma com animação
    // (ex.: um `Math.min(x, Infinity)` num cálculo comum). Revisão da
    // Task 12, correção 3.
    for (const arquivo of arquivosFonte()) {
      const codigo = readFileSync(arquivo, 'utf8')
      expect(codigo, `${arquivo} usa repeat: Infinity`).not.toMatch(/repeat:\s*Infinity/)
    }
  })

  // ---------------------------------------------------------------------
  // Achado da revisão final de branch da Task 12 (Important 3): "AMO" —
  // "eu amo" em português — some da marca se um tradutor automático mexer
  // nela. A regra (Global Constraints, ecoada na spec §11) não admite
  // exceção. A omissão real que motivou este teste não foi de uma
  // ocorrência: foram três arquivos ao mesmo tempo (AMarca, Bento, Ritual)
  // sem que nenhum teste de seção isolada notasse, porque nenhum deles
  // afirmava a regra — só citava o texto. Este teste afirma a regra.
  // ---------------------------------------------------------------------

  it('todo "AMO" renderizado como texto está dentro de translate="no" — a única exceção é o fantasma decorativo do Bento', () => {
    const { container } = render(<Home />)

    // TreeWalker sobre nós de texto, não regex em innerHTML: precisa do nó
    // de texto de verdade pra perguntar "o elemento pai tem translate=no?"
    // depois de "AMO" poder estar dentro do seu próprio <span> (é exatamente
    // o que a correção da Task 12 fez em AMarca/Bento/Ritual).
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    const ocorrencias: Text[] = []
    let no: Node | null
    while ((no = walker.nextNode())) {
      if (/\bAMO\b/.test(no.textContent ?? '')) ocorrencias.push(no as Text)
    }

    // A única exceção deliberada: o "AMO" fantasma do Bento (data-fantasma,
    // aria-hidden="true") — puramente decorativo, já escondido de leitor de
    // tela, e por isso deixado de fora do escopo desta regra (revisão da
    // Task 12, Important 3). Tudo o mais tem que estar blindado.
    const reais = ocorrencias.filter(
      (t) => !t.parentElement?.closest('[aria-hidden="true"]'),
    )

    // Contagem exata, não "pelo menos uma": AMarca (1) + "AMO por você. Por
    // seu AMO." em AMarca (2) + a mesma linha no Bento (2) + Footer (1) +
    // "seu AMO" no Ritual (1) = 7. Uma correção futura que blinde só uma das
    // duas ocorrências de uma linha (do jeito que já aconteceu com &nbsp; —
    // ver o teste de nbsp acima) reprova aqui.
    expect(ocorrencias.length - reais.length).toBe(1) // só o fantasma do Bento fica de fora
    expect(reais).toHaveLength(7)

    for (const t of reais) {
      expect(
        t.parentElement?.getAttribute('translate'),
        `"AMO" sem translate="no" — pai: ${t.parentElement?.outerHTML}`,
      ).toBe('no')
    }
  })
})
