// tests/lista-pinada.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListaPinada } from '@/components/sections/ListaPinada'
import { SABORES } from '@/data/sabores'

describe('ListaPinada', () => {
  it('é um tablist vertical com uma aba por sabor', () => {
    render(<ListaPinada />)
    const lista = screen.getByRole('tablist')
    expect(lista).toHaveAttribute('aria-orientation', 'vertical')
    expect(screen.getAllByRole('tab')).toHaveLength(SABORES.length)
  })

  it('começa com a primeira aba selecionada e as outras não', () => {
    render(<ListaPinada />)
    const abas = screen.getAllByRole('tab')
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
    for (const a of abas.slice(1)) {
      expect(a).toHaveAttribute('aria-selected', 'false')
    }
  })

  it('mantém só a aba ativa no índice de tabulação', () => {
    render(<ListaPinada />)
    const abas = screen.getAllByRole('tab')
    expect(abas[0]).toHaveAttribute('tabindex', '0')
    for (const a of abas.slice(1)) expect(a).toHaveAttribute('tabindex', '-1')
  })

  it('clique troca a seleção', async () => {
    const u = userEvent.setup()
    render(<ListaPinada />)
    const abas = screen.getAllByRole('tab')
    await u.click(abas[3])
    expect(abas[3]).toHaveAttribute('aria-selected', 'true')
    expect(abas[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('seta para baixo avança, seta para cima volta', async () => {
    const u = userEvent.setup()
    render(<ListaPinada />)
    const abas = screen.getAllByRole('tab')
    abas[0].focus()
    await u.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true')
    await u.keyboard('{ArrowUp}')
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('a seta circula do fim para o começo', async () => {
    const u = userEvent.setup()
    render(<ListaPinada />)
    const abas = screen.getAllByRole('tab')
    abas[0].focus()
    await u.keyboard('{ArrowUp}')
    expect(screen.getAllByRole('tab')[SABORES.length - 1]).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('cada aba controla o painel, e o painel aponta de volta pra aba', () => {
    render(<ListaPinada />)
    const aba = screen.getAllByRole('tab')[0]
    const painel = screen.getByRole('tabpanel')
    expect(aba.getAttribute('aria-controls')).toBe(painel.id)
    expect(painel.getAttribute('aria-labelledby')).toBe(aba.id)
  })

  it('o painel mostra a foto do sabor selecionado', async () => {
    const u = userEvent.setup()
    render(<ListaPinada />)
    await u.click(screen.getAllByRole('tab')[2])
    expect(screen.getByRole('img')).toHaveAttribute('alt', SABORES[2].alt)
  })
})

// AVISO — leia antes de confiar nestes testes:
//
// O jsdom não faz layout de verdade: por padrão, toda getBoundingClientRect()
// devolve {top: 0, height: 0, ...} e window.innerHeight vem com um valor fixo
// do próprio jsdom (768), não com uma medida de layout real. Com altura 0,
// `total = r.height - window.innerHeight` fica negativo, e o guard
// `if (total <= 0) return` dentro de aoRolar() em ListaPinada.tsx descarta
// TODO evento de scroll incondicionalmente. Ou seja: um teste que disparasse
// 'scroll' sem fabricar geometria passaria de graça — a aba 0 continuaria
// selecionada porque nada rodou, não porque foi verificado. Confirmado
// medindo os valores default do jsdom diretamente antes de escrever isto.
//
// Os testes abaixo fabricam getBoundingClientRect() (da seção) e
// window.innerHeight para poder exercitar aoRolar() de verdade, sempre
// partindo de uma geometria "neutra" e só então trocando para a geometria
// alvo e disparando 'scroll' — assim a mudança observada vem do listener de
// scroll, não só do cálculo que já roda uma vez no mount.
//
// O que isto verifica é a ARITMÉTICA de aoRolar(): a razão percorrido/total,
// o índice derivado dela (Math.floor(p * SABORES.length)) e o grampo (clamp)
// nas duas pontas — contra uma geometria fabricada em memória.
//
// O que isto NÃO verifica: rolagem real num navegador de verdade. Nada aqui
// mede layout real, o pin da seção (sticky), o timing do crossfade, ou o
// ponto exato em que a seção solta o scroll. Isso continua sem cobertura
// automatizada neste projeto — é exatamente a checagem manual do Step 6 do
// brief, que exige um navegador que este ambiente não consegue dirigir.
// Um teste verde aqui não é prova de que rolar a página de verdade seleciona
// o sabor certo — é prova de que a conta por trás disso está certa.

/**
 * Fabrica a geometria que aoRolar() lê: getBoundingClientRect() da seção
 * (aqui aplicado a Element.prototype, já que só a seção chama isso neste
 * componente) e window.innerHeight.
 */
function definirGeometria(topPx: number, alturaPx: number, innerHeightPx: number) {
  Element.prototype.getBoundingClientRect = () =>
    ({
      top: topPx,
      bottom: topPx + alturaPx,
      height: alturaPx,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: topPx,
      toJSON() {
        return this
      },
    }) as DOMRect

  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: innerHeightPx,
  })
}

/** Guarda o estado real antes de qualquer mock; devolve a função que restaura. */
function capturarGeometriaOriginal() {
  const gbcrOriginal = Element.prototype.getBoundingClientRect
  const innerHeightOriginal = Object.getOwnPropertyDescriptor(window, 'innerHeight')
  return () => {
    Element.prototype.getBoundingClientRect = gbcrOriginal
    if (innerHeightOriginal) {
      Object.defineProperty(window, 'innerHeight', innerHeightOriginal)
    }
  }
}

/** Dispara o scroll que o componente escuta em window, dentro de act(). */
function rolar() {
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

describe('ListaPinada — aritmética do progresso de rolagem (geometria simulada, ver aviso acima)', () => {
  it('rolar até o meio da seção seleciona o sabor do índice calculado, não só "algum"', () => {
    const restaurar = capturarGeometriaOriginal()
    try {
      definirGeometria(0, 3000, 1000) // percorrido 0 → aba 0, estado de partida
      render(<ListaPinada />)
      expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true')

      // altura 3000, innerHeight 1000 → total 2000; top -1000 → percorrido 1000
      // → p = 1000/2000 = 0.5 → índice = Math.floor(0.5 * 7) = 3, não "qualquer um"
      definirGeometria(-1000, 3000, 1000)
      rolar()

      const abas = screen.getAllByRole('tab')
      expect(abas[3]).toHaveAttribute('aria-selected', 'true')
      expect(abas[0]).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('img')).toHaveAttribute('alt', SABORES[3].alt)
    } finally {
      restaurar()
    }
  })

  it('progresso no início, ou antes dele, trava na primeira aba — nunca um índice negativo', () => {
    const restaurar = capturarGeometriaOriginal()
    try {
      definirGeometria(-1000, 3000, 1000) // primeiro afasta do índice 0 (vira 3)
      render(<ListaPinada />)
      rolar()
      expect(screen.getAllByRole('tab')[3]).toHaveAttribute('aria-selected', 'true')

      // top 400 → percorrido -400 → p bruto -0.2; sem o clamp Math.max(p, 0)
      // o índice cairia abaixo de 0. Com o clamp, trava em 0.
      definirGeometria(400, 3000, 1000)
      rolar()
      let abas = screen.getAllByRole('tab')
      expect(abas[0]).toHaveAttribute('aria-selected', 'true')

      // bem antes do início ainda: o clamp segura em 0, não só "coincide" com 0.
      definirGeometria(5000, 3000, 1000)
      rolar()
      abas = screen.getAllByRole('tab')
      expect(abas[0]).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('img')).toHaveAttribute('alt', SABORES[0].alt)
    } finally {
      restaurar()
    }
  })

  it('progresso no fim, ou além dele, trava na última aba — nunca um índice fora do intervalo', () => {
    const ultimo = SABORES.length - 1
    const restaurar = capturarGeometriaOriginal()
    try {
      definirGeometria(0, 3000, 1000)
      render(<ListaPinada />)
      rolar()
      expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true')

      // total 2000; top -2000 → percorrido 2000 → p bruto exatamente 1. Sem o
      // clamp em 0.999, Math.floor(1 * 7) = 7 é fora do array (SABORES[7] não
      // existe) — exatamente o valor-limite que o clamp existe para evitar.
      definirGeometria(-2000, 3000, 1000)
      rolar()
      let abas = screen.getAllByRole('tab')
      expect(abas[ultimo]).toHaveAttribute('aria-selected', 'true')

      // muito além do fim: se o índice tivesse escapado do intervalo,
      // SABORES[indice] seria undefined e o acesso a .slug/.alt quebraria o
      // render — o teste falharia com uma exceção, não com uma asserção.
      definirGeometria(-8000, 3000, 1000)
      rolar()
      abas = screen.getAllByRole('tab')
      expect(abas[ultimo]).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('img')).toHaveAttribute('alt', SABORES[ultimo].alt)
    } finally {
      restaurar()
    }
  })

  it('rolagem e clique convergem no mesmo estado — nenhum dos dois caminhos deriva sozinho', async () => {
    const u = userEvent.setup()
    const restaurar = capturarGeometriaOriginal()
    try {
      // total 2000; top -1500 → percorrido 1500 → p = 0.75 → índice 5
      definirGeometria(-1500, 3000, 1000)
      render(<ListaPinada />)
      rolar()
      let abas = screen.getAllByRole('tab')
      expect(abas[5]).toHaveAttribute('aria-selected', 'true')
      expect(abas[0]).toHaveAttribute('aria-selected', 'false')

      // clique agora deve sobrepor o estado que veio da rolagem, não coexistir
      // com ele — os dois caminhos escrevem no mesmo estado.
      await u.click(abas[1])
      abas = screen.getAllByRole('tab')
      expect(abas[1]).toHaveAttribute('aria-selected', 'true')
      expect(abas[5]).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('img')).toHaveAttribute('alt', SABORES[1].alt)

      // e uma rolagem depois do clique deve sobrepor o clique de volta —
      // convergência nos dois sentidos, sem resíduo de nenhum dos dois lados.
      definirGeometria(-1000, 3000, 1000) // p = 0.5 → índice 3
      rolar()
      abas = screen.getAllByRole('tab')
      expect(abas[3]).toHaveAttribute('aria-selected', 'true')
      expect(abas[1]).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('img')).toHaveAttribute('alt', SABORES[3].alt)
    } finally {
      restaurar()
    }
  })
})

describe('ListaPinada — Home e End, partindo do meio (não da borda que a tecla já alcança)', () => {
  it('Home seleciona a primeira aba a partir de uma aba do meio, não já selecionada', async () => {
    const u = userEvent.setup()
    render(<ListaPinada />)
    // Tira a seleção do índice 0 por clique — um caminho já coberto pelas
    // asserções existentes — antes de testar o Home. Se a aba 0 continuasse
    // selecionada por já ser o estado inicial, a asserção do Home passaria
    // mesmo com o handler quebrado: exatamente a armadilha do teste vazio.
    await u.click(screen.getAllByRole('tab')[3])
    let abas = screen.getAllByRole('tab')
    expect(abas[3]).toHaveAttribute('aria-selected', 'true')

    await u.keyboard('{Home}')
    abas = screen.getAllByRole('tab')
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('End seleciona a última aba a partir de uma aba do meio, não já selecionada', async () => {
    const u = userEvent.setup()
    render(<ListaPinada />)
    await u.click(screen.getAllByRole('tab')[3])
    let abas = screen.getAllByRole('tab')
    expect(abas[3]).toHaveAttribute('aria-selected', 'true')

    await u.keyboard('{End}')
    abas = screen.getAllByRole('tab')
    expect(abas[SABORES.length - 1]).toHaveAttribute('aria-selected', 'true')
  })
})

describe('ListaPinada — roving tabindex depois de interação, e ordem real de Tab', () => {
  it('depois de um clique, a aba recém-selecionada fica com tabIndex 0 e todas as outras com -1', async () => {
    const u = userEvent.setup()
    render(<ListaPinada />)
    await u.click(screen.getAllByRole('tab')[3])
    const abas = screen.getAllByRole('tab')
    abas.forEach((aba, i) => {
      expect(aba).toHaveAttribute('tabindex', i === 3 ? '0' : '-1')
    })
  })

  it('depois de uma seta, a aba recém-selecionada fica com tabIndex 0 e todas as outras com -1', async () => {
    const u = userEvent.setup()
    render(<ListaPinada />)
    const abas = screen.getAllByRole('tab')
    abas[0].focus()
    await u.keyboard('{ArrowDown}')
    const abasDepois = screen.getAllByRole('tab')
    abasDepois.forEach((aba, i) => {
      expect(aba).toHaveAttribute('tabindex', i === 1 ? '0' : '-1')
    })
  })

  it('Tab entra na lista uma única vez: da sentinela de antes vai pra aba ativa, e de lá direto pra sentinela de depois', async () => {
    const u = userEvent.setup()
    render(
      <>
        <button type="button">sentinela antes</button>
        <ListaPinada />
        <button type="button">sentinela depois</button>
      </>,
    )
    const sentinelaAntes = screen.getByRole('button', { name: 'sentinela antes' })
    const sentinelaDepois = screen.getByRole('button', { name: 'sentinela depois' })
    const abas = screen.getAllByRole('tab')

    sentinelaAntes.focus()
    await u.tab()
    expect(document.activeElement).toBe(abas[0])

    await u.tab()
    expect(document.activeElement).toBe(sentinelaDepois)
  })
})
