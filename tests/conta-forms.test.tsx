import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Os formularios de Minha conta no navegador: o que acontece depois de cada
 * resposta (o defeito do ensaio de 2026-11-20 era o endereco novo continuar
 * no formulario e ser guardado de novo).
 */

const m = vi.hoisted(() => ({
  salvarEndereco: vi.fn(async () => ({ ok: true, aviso: 'salvo' }) as unknown),
  consultarCep: vi.fn(async () => null as unknown),
  cancelarPedido: vi.fn(async () => ({ ok: true }) as unknown),
  removerEndereco: vi.fn(async () => ({ ok: true, aviso: 'salvo' }) as unknown),
  definirMarketing: vi.fn(async () => ({ ok: true }) as unknown),
}))
vi.mock('@/app/conta/acoes', () => ({
  salvarPerfil: vi.fn(),
  definirMarketing: m.definirMarketing,
  salvarEndereco: m.salvarEndereco,
  removerEndereco: m.removerEndereco,
  tornarPrincipal: vi.fn(async () => ({ ok: true, aviso: 'salvo' })),
  consultarCep: m.consultarCep,
  trocarSenha: vi.fn(),
  trocarEmail: vi.fn(),
  cancelarPedido: m.cancelarPedido,
}))
vi.mock('@/components/conta/Turnstile', () => ({ Turnstile: () => null }))

const { CancelarPedido, FormNovidades, ItemDeEndereco, NovoEndereco, RolarAteAtual } = await import('@/components/conta/FormsDaConta')

const endereco = {
  apelido: 'Casa',
  cep: '03183002',
  logradouro: 'Rua Cuiabá',
  numero: '412',
  complemento: '',
  bairro: 'Alto da Mooca',
  cidade: 'São Paulo',
  uf: 'SP',
  principal: false,
}

beforeEach(() => {
  m.salvarEndereco.mockClear()
  m.consultarCep.mockReset()
  m.consultarCep.mockResolvedValue(null)
  document.documentElement.classList.add('js')
})

async function preencher(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('CEP'), '03183-002')
  await user.type(screen.getByLabelText('Rua'), 'Rua Cuiabá')
  await user.type(screen.getByLabelText('Número'), '412')
  await user.type(screen.getByLabelText('Bairro'), 'Alto da Mooca')
  await user.type(screen.getByLabelText('Cidade'), 'São Paulo')
}

describe('o endereco novo', () => {
  it('guardado, o formulario fecha, volta vazio e diz que guardou', async () => {
    const user = userEvent.setup()
    render(<NovoEndereco primeiro={false} cheio={false} />)
    await user.click(screen.getByRole('button', { name: 'Adicionar endereço' }))
    await preencher(user)
    await user.click(screen.getByRole('button', { name: 'Guardar o endereço' }))
    await waitFor(() => expect(m.salvarEndereco).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Endereço guardado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar endereço' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Adicionar endereço' }))
    expect(screen.getByLabelText('Rua')).toHaveValue('')
    expect(screen.getByLabelText('CEP')).toHaveValue('')
  })

  it('reaberto depois de guardar, nao traz a resposta velha (ensaio de 2026-11-20)', async () => {
    const user = userEvent.setup()
    render(<NovoEndereco primeiro={false} cheio={false} />)
    await user.click(screen.getByRole('button', { name: 'Adicionar endereço' }))
    await preencher(user)
    await user.click(screen.getByRole('button', { name: 'Guardar o endereço' }))
    expect(await screen.findByText('Endereço guardado.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Adicionar endereço' }))
    expect(screen.queryByText('Salvo.')).toBeNull()
  })

  it('abrir leva o foco ao primeiro campo, e nao ao body (ensaio de 2026-11-20)', async () => {
    const user = userEvent.setup()
    render(<NovoEndereco primeiro={false} cheio={false} />)
    await user.click(screen.getByRole('button', { name: 'Adicionar endereço' }))
    expect(screen.getByLabelText('Nome do lugar (opcional)')).toHaveFocus()
  })

  it('com erro, o formulario fica aberto com o que foi digitado', async () => {
    m.salvarEndereco.mockResolvedValueOnce({ ok: false, erro: 'campos_invalidos', campos: { numero: 'Confira o número, como 412 ou S/N.' } })
    const user = userEvent.setup()
    render(<NovoEndereco primeiro={false} cheio={false} />)
    await user.click(screen.getByRole('button', { name: 'Adicionar endereço' }))
    await preencher(user)
    await user.click(screen.getByRole('button', { name: 'Guardar o endereço' }))
    expect(await screen.findByText('Confira o número, como 412 ou S/N.')).toBeInTheDocument()
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua Cuiabá')
  })

  it('o CEP achado preenche rua, bairro, cidade e estado, mesmo por cima do que havia', async () => {
    m.consultarCep.mockResolvedValueOnce({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' })
    const user = userEvent.setup()
    render(<NovoEndereco primeiro cheio={false} />)
    await user.type(screen.getByLabelText('Rua'), 'Rua Velha')
    await user.type(screen.getByLabelText('CEP'), '01310-100')
    await user.tab()
    await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Avenida Paulista'))
    expect(screen.getByLabelText('Bairro')).toHaveValue('Bela Vista')
  })

  it('o CEP que nao existe diz isso, sem apagar nada', async () => {
    const user = userEvent.setup()
    render(<NovoEndereco primeiro cheio={false} />)
    await user.type(screen.getByLabelText('Rua'), 'Rua Cuiabá')
    await user.type(screen.getByLabelText('CEP'), '99999-999')
    await user.tab()
    expect((await screen.findAllByText(/Não achamos esse CEP/)).length).toBeGreaterThan(0)
    // a frase fica junto do campo CEP (revisao de acabamento), e o leitor de tela ainda ouve
    expect(screen.getByLabelText('CEP')).toHaveAccessibleDescription(/Não achamos esse CEP/)
    // embaixo do campo de 160 px, a frase curta; a completa vai ao leitor de tela (terceira rodada do ensaio)
    expect(document.querySelector('.campo--cep .campo__erro')).toHaveTextContent(/^Não achamos esse CEP\.$/)
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua Cuiabá')
  })
})

describe('o endereco guardado', () => {
  it('passar pelo CEP sem mudar nao busca de novo nem troca a rua corrigida a mao', async () => {
    m.consultarCep.mockResolvedValue({ logradouro: 'Rua Cuiabá', bairro: 'Alto da Mooca', cidade: 'São Paulo', uf: 'SP' })
    const user = userEvent.setup()
    render(<ItemDeEndereco id="00000000-0000-4000-8000-000000000001" endereco={{ ...endereco, logradouro: 'Rua Cuiabá (fundos)' }} texto="Rua Cuiabá, 412" nome="Casa" />)
    await user.click(screen.getByRole('button', { name: 'Alterar Casa' }))
    await user.click(screen.getByLabelText('CEP'))
    await user.tab()
    await user.type(screen.getByLabelText('Complemento (opcional)'), 'casa 2')
    expect(m.consultarCep).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua Cuiabá (fundos)')
  })

  it('mudar o CEP busca de novo', async () => {
    m.consultarCep.mockResolvedValue({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' })
    const user = userEvent.setup()
    render(<ItemDeEndereco id="00000000-0000-4000-8000-000000000001" endereco={endereco} texto="Rua Cuiabá, 412" nome="Casa" />)
    await user.click(screen.getByRole('button', { name: 'Alterar Casa' }))
    await user.clear(screen.getByLabelText('CEP'))
    await user.type(screen.getByLabelText('CEP'), '01310-100')
    await user.tab()
    await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Avenida Paulista'))
    expect(m.consultarCep).toHaveBeenCalledTimes(1)
  })

  it('alterado e salvo, o formulario fecha', async () => {
    const user = userEvent.setup()
    render(<ItemDeEndereco id="00000000-0000-4000-8000-000000000001" endereco={endereco} texto="Rua Cuiabá, 412" nome="Casa" />)
    await user.click(screen.getByRole('button', { name: 'Alterar Casa' }))
    expect(screen.getByLabelText('Nome do lugar (opcional)')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Salvar o endereço' }))
    await waitFor(() => expect(screen.queryByLabelText('Rua')).toBeNull())
    expect(screen.getByRole('button', { name: 'Alterar Casa' })).toHaveFocus()
  })

  it('remover pede confirmacao e leva o foco a ela; manter devolve o foco', async () => {
    const user = userEvent.setup()
    render(<ItemDeEndereco id="00000000-0000-4000-8000-000000000001" endereco={endereco} texto="Rua Cuiabá, 412" nome="Casa" />)
    await user.click(screen.getByRole('button', { name: 'Remover Casa' }))
    expect(screen.getByRole('button', { name: 'Sim, remover' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Manter' }))
    expect(screen.getByRole('button', { name: 'Remover Casa' })).toHaveFocus()
  })
})

describe('o CEP que volta tarde', () => {
  const achado = { logradouro: 'Rua Cuiabá', bairro: 'Mooca', cidade: 'São Paulo', uf: 'SP' }

  it('a rua que a cliente escreveu durante a busca fica; bairro, cidade e estado vem da busca', async () => {
    let resolver: (v: unknown) => void = () => {}
    m.consultarCep.mockReturnValueOnce(new Promise((r) => (resolver = r)))
    const user = userEvent.setup()
    render(<NovoEndereco primeiro cheio={false} />)
    await user.type(screen.getByLabelText('CEP'), '03183-002')
    await user.tab()
    await user.type(screen.getByLabelText('Rua'), 'Rua que eu sei')
    resolver(achado)
    await waitFor(() => expect(screen.getByLabelText('Bairro')).toHaveValue('Mooca'))
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua que eu sei')
    expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo')
  })

  it('sem digitar nada durante a busca, a rua vira a da busca', async () => {
    let resolver: (v: unknown) => void = () => {}
    m.consultarCep.mockReturnValueOnce(new Promise((r) => (resolver = r)))
    const user = userEvent.setup()
    render(<NovoEndereco primeiro cheio={false} />)
    await user.type(screen.getByLabelText('CEP'), '03183-002')
    await user.tab()
    resolver(achado)
    await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Rua Cuiabá'))
  })
})

describe('o quinto endereco', () => {
  it('guardado o quinto, a regiao viva segue e a nota de 5 ocupa o lugar do botao', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<NovoEndereco primeiro={false} cheio={false} />)
    await user.click(screen.getByRole('button', { name: 'Adicionar endereço' }))
    await preencher(user)
    await user.click(screen.getByRole('button', { name: 'Guardar o endereço' }))
    expect(await screen.findByText('Endereço guardado.')).toBeInTheDocument()
    rerender(<NovoEndereco primeiro={false} cheio />)
    expect(screen.getByText('Endereço guardado.')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Já são 5 endereços: para guardar outro, remova um.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adicionar endereço' })).toBeNull()
    expect(screen.queryByLabelText('Rua')).toBeNull()
  })
})

describe('as novidades que nao salvam', () => {
  it('a caixa volta desmarcada e o erro aparece', async () => {
    m.definirMarketing.mockResolvedValueOnce({ ok: false, erro: 'tente_de_novo' })
    const user = userEvent.setup()
    render(<FormNovidades aceita={false} />)
    const caixa = screen.getByRole('checkbox')
    await user.click(caixa)
    await waitFor(() => expect(m.definirMarketing).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(document.querySelector('.painel__resposta--erro')).toHaveTextContent(/\S/))
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked())
  })
})

describe('sem JavaScript', () => {
  it('remover tem o botao de confirmar (so-js) e o de enviar direto (painel__sem-js)', async () => {
    render(<ItemDeEndereco id="00000000-0000-4000-8000-000000000001" endereco={endereco} texto="Rua Cuiabá, 412" nome="Casa" />)
    expect(screen.getByRole('button', { name: 'Remover Casa' })).toHaveClass('so-js')
    const direto = document.querySelector('button.painel__sem-js') as HTMLButtonElement
    expect(direto).toHaveTextContent('Remover')
    expect(direto.type).toBe('submit')
    const form = direto.closest('form') as HTMLFormElement
    expect((form.querySelector('input[name="id"]') as HTMLInputElement).value).toBe('00000000-0000-4000-8000-000000000001')
    form.requestSubmit(direto)
    await waitFor(() => expect(m.removerEndereco).toHaveBeenCalledTimes(1))
  })

  it('cancelar tem o botao de confirmar (so-js) e o de enviar direto (painel__sem-js), no mesmo formulario', () => {
    render(<CancelarPedido numero="AMO-7K2M9QXR" />)
    expect(screen.getAllByRole('button', { name: 'Cancelar pedido' })[0]).toHaveClass('so-js')
    const direto = document.querySelector('button.painel__sem-js') as HTMLButtonElement
    expect(direto).toHaveTextContent('Cancelar pedido')
    expect(direto.type).toBe('submit')
    expect((direto.closest('form')!.querySelector('input[name="numero"]') as HTMLInputElement).value).toBe('AMO-7K2M9QXR')
  })
})

describe('cancelar o pedido', () => {
  it('a confirmacao recebe o foco; manter devolve', async () => {
    const user = userEvent.setup()
    render(<CancelarPedido numero="AMO-7K2M9QXR" />)
    await user.click(screen.getAllByRole('button', { name: 'Cancelar pedido' })[0])
    expect(screen.getByRole('button', { name: 'Sim, cancelar' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Manter o pedido' }))
    expect(screen.getAllByRole('button', { name: 'Cancelar pedido' })[0]).toHaveFocus()
  })
})

describe('a fileira do sumario no celular', () => {
  it('traz a etiqueta atual para a vista', () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    render(
      <ul>
        <li className="painel__item">Pedido atual</li>
        <li className="painel__item painel__item--atual">E-mail e senha</li>
        <RolarAteAtual />
      </ul>,
    )
    expect(rolar).toHaveBeenCalledWith({ block: 'nearest', inline: 'center' })
    expect(rolar.mock.contexts[0]).toHaveTextContent('E-mail e senha')
  })
})
