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

  it('o Lenis ignora a roda na gaveta inteira, inclusive no fundo, cujo alvo é o próprio <dialog>', () => {
    // sem allow-discrete (Safari ate 17.3) o autoToggle nao para o Lenis, e a
    // roda sobre o fundo rolaria a pagina de tras
    render(<Bancada dados={misto} linhaAtual={null} aoFechar={() => {}} />)
    expect(dialogo()).toHaveAttribute('data-lenis-prevent')
  })

  it('a borda é reta: sem a onda da v2, o painel é o único filho do diálogo', () => {
    // o clique fora conta com isso: alvo no proprio <dialog> so pode ser o fundo
    render(<Bancada dados={misto} linhaAtual={null} aoFechar={() => {}} />)
    expect(dialogo().querySelector('.gaveta__onda')).toBeNull()
    expect([...dialogo().children].map((el) => el.className)).toEqual(['gaveta__painel'])
  })

  it('as fotos do cartão da linha única são decorativas', async () => {
    await abrir(real)
    const fotos = dialogo().querySelector('.gaveta__unica .gaveta__fotos')!
    expect(fotos).toHaveAttribute('aria-hidden', 'true')
    expect(fotos.querySelectorAll('img')).toHaveLength(3)
  })

  it('passa no axe aberta', async () => {
    // no conteiner, nao no body: as regras de pagina inteira do axe (region,
    // h1) nao fazem sentido para um componente solto
    const { container } = await abrir()
    expect(await axe(container)).toHaveNoViolations()
  })
})
