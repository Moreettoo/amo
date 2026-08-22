// tests/lista-pinada.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
