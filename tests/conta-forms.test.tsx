import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect, useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MAXIMO_DE_ENDERECOS } from '@/lib/conta/regras'

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

  // o primeiro "Remover Casa" e o de confirmar no lugar; o outro e o de sem JavaScript, que o CSS esconde com JavaScript
  it('remover pede confirmacao e leva o foco a ela; manter devolve o foco', async () => {
    const user = userEvent.setup()
    render(<ItemDeEndereco id="00000000-0000-4000-8000-000000000001" endereco={endereco} texto="Rua Cuiabá, 412" nome="Casa" />)
    await user.click(screen.getAllByRole('button', { name: 'Remover Casa' })[0])
    expect(screen.getByRole('button', { name: 'Sim, remover' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Manter' }))
    expect(screen.getAllByRole('button', { name: 'Remover Casa' })[0]).toHaveFocus()
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

  // dois CEPs seguidos: a busca do primeiro ainda nao voltou quando a do segundo sai
  async function doisCeps() {
    const soltar: Record<'antigo' | 'novo', (v: unknown) => void> = { antigo: () => {}, novo: () => {} }
    m.consultarCep
      .mockReturnValueOnce(new Promise((r) => (soltar.antigo = r)))
      .mockReturnValueOnce(new Promise((r) => (soltar.novo = r)))
    const user = userEvent.setup()
    render(<NovoEndereco primeiro cheio={false} />)
    const cep = screen.getByLabelText('CEP')
    await user.type(cep, '03183-002')
    await user.tab()
    await user.clear(cep)
    await user.type(cep, '20040-002')
    await user.tab()
    expect(m.consultarCep).toHaveBeenCalledTimes(2)
    return soltar
  }
  const doRio = { logradouro: 'Avenida Rio Branco', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ' }

  it('a busca antiga que volta por ultimo nao troca o endereco do CEP novo', async () => {
    const soltar = await doisCeps()
    await act(async () => soltar.novo(doRio))
    expect(screen.getByLabelText('Cidade')).toHaveValue('Rio de Janeiro')
    await act(async () => soltar.antigo(achado))
    expect(screen.getByLabelText('Rua')).toHaveValue('Avenida Rio Branco')
    expect(screen.getByLabelText('Bairro')).toHaveValue('Centro')
    expect(screen.getByLabelText('Cidade')).toHaveValue('Rio de Janeiro')
    expect(screen.getByLabelText('Estado')).toHaveValue('RJ')
  })

  it('a busca antiga que volta antes, sem achar, nao desliga o "buscando" da nova nem diz que nao achou', async () => {
    const soltar = await doisCeps()
    await act(async () => soltar.antigo(null))
    expect(screen.getByLabelText('CEP (buscando o endereço)')).toBeInTheDocument()
    expect(screen.queryByText(/Não achamos esse CEP/)).toBeNull()
    await act(async () => soltar.novo(doRio))
    expect(screen.getByLabelText('CEP')).toBeInTheDocument()
    expect(screen.getByLabelText('Cidade')).toHaveValue('Rio de Janeiro')
  })
})

/**
 * A pagina de verdade volta junto com a resposta da acao (o refresh do Next):
 * a resposta e os 5 enderecos chegam no mesmo commit. Aqui o cheio muda dentro
 * da acao, para chegar junto com a resposta.
 */
function PaginaQueEnche({ aoMontar }: { aoMontar: (encher: () => void) => void }) {
  const [cheio, setCheio] = useState(false)
  useEffect(() => {
    aoMontar(() => setCheio(true))
  }, [aoMontar])
  return <NovoEndereco primeiro={false} cheio={cheio} />
}

describe('o quinto endereco', () => {
  const notaDeCheio = `Já são ${MAXIMO_DE_ENDERECOS} endereços: para guardar outro, remova um.`

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

  // o botao que tinha o foco sai com o formulario, e nao ha "Adicionar endereco" para recebe-lo (revisao final de 2026-11-21)
  it('com a pagina cheia chegando junto com a resposta, o aviso sai e o foco vai para a nota, e nao ao body', async () => {
    let encher = () => {}
    m.salvarEndereco.mockImplementationOnce(async () => {
      encher()
      return { ok: true, aviso: 'salvo' }
    })
    const user = userEvent.setup()
    render(
      <PaginaQueEnche
        aoMontar={(f) => {
          encher = f
        }}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Adicionar endereço' }))
    await preencher(user)
    await user.click(screen.getByRole('button', { name: 'Guardar o endereço' }))
    const nota = await screen.findByText(notaDeCheio)
    await waitFor(() => expect(nota).toHaveFocus())
    expect(screen.getByText('Endereço guardado.')).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByLabelText('Rua')).toBeNull()
  })

  it('a nota diz o limite das regras de entrada, o mesmo da pagina', () => {
    render(<NovoEndereco primeiro={false} cheio />)
    expect(screen.getByText(notaDeCheio)).toBeInTheDocument()
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

  // a escolha salva volta na pagina renovada pelo servidor (o refresh da acao); a que falha volta a ela
  it('depois de uma escolha salva, a que falha volta a salva', async () => {
    m.definirMarketing.mockClear()
    m.definirMarketing.mockResolvedValueOnce({ ok: true, aviso: 'salvo' })
    const user = userEvent.setup()
    const { rerender } = render(<FormNovidades aceita={false} />)
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(m.definirMarketing).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('Salvo.')).toBeInTheDocument())
    expect(screen.getByRole('checkbox')).toBeChecked()
    rerender(<FormNovidades aceita />)
    m.definirMarketing.mockResolvedValueOnce({ ok: false, erro: 'tente_de_novo' })
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(document.querySelector('.painel__resposta--erro')).toHaveTextContent(/\S/))
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked())
  })
})

describe('sem JavaScript', () => {
  it('remover tem o botao de confirmar (so-js) e o de enviar direto (painel__sem-js), os dois com o nome do endereco', async () => {
    render(<ItemDeEndereco id="00000000-0000-4000-8000-000000000001" endereco={endereco} texto="Rua Cuiabá, 412" nome="Casa" />)
    const [confirmar, direto] = screen.getAllByRole('button', { name: 'Remover Casa' }) as HTMLButtonElement[]
    expect(confirmar).toHaveClass('so-js')
    expect(direto).toHaveClass('painel__sem-js')
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
