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
    expect(saida).toHaveTextContent('bolos-no-pote|fibras|fruta')
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
    const original = window.IntersectionObserver
    window.IntersectionObserver = IOFalso as unknown as typeof IntersectionObserver

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
    window.IntersectionObserver = original
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

  it('avisa quando solta, pelo fim da rolagem ou pela validade, para quem usa reler a posição', () => {
    // Achado da revisao final: a trava soltava, mas ninguem relia a rolagem,
    // e a secao ficava mostrando a vontade escolhida no lugar da posicao real.
    vi.useFakeTimers()
    const aoSoltar = vi.fn()
    const { result } = renderHook(() => useTrava(1600, aoSoltar))

    result.current.travar(1)
    result.current.soltar()
    expect(aoSoltar).toHaveBeenCalledTimes(1)

    result.current.travar(2)
    vi.advanceTimersByTime(1600)
    expect(aoSoltar).toHaveBeenCalledTimes(2)

    // soltar sem estar travada nao avisa de novo
    result.current.soltar()
    expect(aoSoltar).toHaveBeenCalledTimes(2)
  })
})
