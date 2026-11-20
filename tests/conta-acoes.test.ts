// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HOSTIS } from './fixtures/hostis'

/**
 * As acoes de Minha conta, sem banco: a ordem de cada uma (sessao, campos,
 * limite, banco), a traducao do erro e o que a resposta leva. A camada de
 * dados esta provada contra o banco em tests/banco/conta.test.ts.
 */

const m = vi.hoisted(() => {
  const ordem: string[] = []
  const registrar = <T,>(nome: string, resposta: T) =>
    vi.fn(async (...argumentos: unknown[]) => {
      void argumentos
      ordem.push(nome)
      return resposta
    })
  return {
    ordem,
    exigirUsuario: registrar('exigirUsuario', { id: 'usuario-1', email: 'maria@exemplo.com', nome: 'Maria', celular: '11987654321' }),
    consumirLimite: registrar('consumirLimite', true as boolean),
    gravarPerfil: registrar('gravarPerfil', undefined),
    gravarMarketing: registrar('gravarMarketing', undefined),
    criarEndereco: registrar('criarEndereco', undefined),
    alterarEndereco: registrar('alterarEndereco', true as boolean),
    apagarEndereco: registrar('apagarEndereco', true as boolean),
    tornarEnderecoPrincipal: registrar('tornarEnderecoPrincipal', true as boolean),
    buscarCep: registrar('buscarCep', { logradouro: 'Rua Cuiabá', bairro: 'Alto da Mooca', cidade: 'São Paulo', uf: 'SP' } as unknown),
    cancelarPedidoDaCliente: registrar('cancelarPedidoDaCliente', undefined),
    senhaConfere: registrar('senhaConfere', true as unknown),
    updateUser: registrar('updateUser', { data: {}, error: null } as { data: unknown; error: unknown }),
    signOut: registrar('signOut', { error: null }),
    refresh: vi.fn(),
  }
})

vi.mock('@/lib/auth', () => ({ exigirUsuario: m.exigirUsuario }))
vi.mock('@/lib/auth/servidor', () => ({ criarClienteServidor: async () => ({ auth: { updateUser: m.updateUser, signOut: m.signOut } }) }))
vi.mock('@/lib/auth/senha', () => ({ senhaConfere: m.senhaConfere }))
vi.mock('@/lib/dados/limites', () => ({ consumirLimite: m.consumirLimite }))
vi.mock('@/lib/dados/perfil', () => ({ gravarPerfil: m.gravarPerfil, gravarMarketing: m.gravarMarketing }))
vi.mock('@/lib/dados/enderecos', () => ({
  criarEndereco: m.criarEndereco,
  alterarEndereco: m.alterarEndereco,
  apagarEndereco: m.apagarEndereco,
  tornarEnderecoPrincipal: m.tornarEnderecoPrincipal,
}))
vi.mock('@/lib/dados/cep', () => ({ buscarCep: m.buscarCep }))
vi.mock('@/lib/dados/pedidos', () => ({ cancelarPedidoDaCliente: m.cancelarPedidoDaCliente }))
vi.mock('next/cache', () => ({ refresh: m.refresh }))

import {
  cancelarPedido,
  consultarCep,
  definirMarketing,
  removerEndereco,
  salvarEndereco,
  salvarPerfil,
  tornarPrincipal,
  trocarEmail,
  trocarSenha,
} from '@/app/conta/acoes'
import { ErroDeRegra } from '@/lib/dados/erros'

const form = (campos: Record<string, string>) => {
  const f = new FormData()
  for (const [nome, valor] of Object.entries(campos)) f.set(nome, valor)
  return f
}
const UUID = '6f1c2d3e-4a5b-4c6d-8e7f-0123456789ab'
const enderecoValido = {
  id: '',
  apelido: 'Casa',
  cep: '03183-002',
  logradouro: 'Rua Cuiabá',
  numero: '412',
  complemento: 'apto 31',
  bairro: 'Alto da Mooca',
  cidade: 'São Paulo',
  uf: 'SP',
}
const senhas = { atual: 'senha-atual-123', nova: 'senha-nova-456', 'cf-turnstile-response': 'token' }

beforeEach(() => {
  m.ordem.length = 0
  for (const f of Object.values(m)) if (typeof f === 'function' && 'mockClear' in f) f.mockClear()
})

const chavesPermitidas = (r: object) => expect(Object.keys(r).every((k) => ['ok', 'aviso', 'erro', 'campos'].includes(k))).toBe(true)

describe('a ordem: a sessao primeiro, sempre', () => {
  it.each([
    ['salvarPerfil', () => salvarPerfil(null, form({ nome: 'Maria', celular: '11987654321' })), '/conta/perfil'],
    ['definirMarketing', () => definirMarketing(null, form({ novidades: 'on' })), '/conta/perfil'],
    ['salvarEndereco', () => salvarEndereco(null, form(enderecoValido)), '/conta/perfil/enderecos'],
    ['removerEndereco', () => removerEndereco(null, form({ id: UUID })), '/conta/perfil/enderecos'],
    ['tornarPrincipal', () => tornarPrincipal(null, form({ id: UUID })), '/conta/perfil/enderecos'],
    ['consultarCep', () => consultarCep('03183-002'), '/conta/perfil/enderecos'],
    ['trocarSenha', () => trocarSenha(null, form(senhas)), '/conta/perfil/email-e-senha'],
    ['trocarEmail', () => trocarEmail(null, form({ email: 'nova@exemplo.com' })), '/conta/perfil/email-e-senha'],
    ['cancelarPedido', () => cancelarPedido(null, form({ numero: 'AMO-2B7KQ9XZ' })), '/conta/pedidos/AMO-2B7KQ9XZ'],
  ])('%s chama exigirUsuario antes de tudo, com a propria rota', async (_, acao, rota) => {
    await acao()
    expect(m.ordem[0]).toBe('exigirUsuario')
    expect(m.exigirUsuario).toHaveBeenCalledWith(rota)
  })

  it('sem sessao, nada acontece depois do redirecionamento', async () => {
    m.exigirUsuario.mockRejectedValueOnce(new Error('REDIRECIONOU /entrar'))
    await expect(salvarPerfil(null, form({ nome: 'Maria', celular: '11987654321' }))).rejects.toThrow('REDIRECIONOU')
    expect(m.ordem).toEqual([])
  })
})

describe('salvarPerfil e definirMarketing', () => {
  it('entrada invalida para na validacao', async () => {
    const r = await salvarPerfil(null, form({ nome: 'M', celular: '11987654321' }))
    expect(r).toEqual({ ok: false, erro: 'campos_invalidos', campos: { nome: expect.any(String) } })
    expect(m.consumirLimite).not.toHaveBeenCalled()
    expect(m.gravarPerfil).not.toHaveBeenCalled()
  })

  it('limite estourado nao chega ao banco', async () => {
    m.consumirLimite.mockResolvedValueOnce(false)
    expect(await salvarPerfil(null, form({ nome: 'Maria', celular: '11987654321' }))).toEqual({ ok: false, erro: 'muitas_tentativas' })
    expect(m.gravarPerfil).not.toHaveBeenCalled()
  })

  it('grava o que foi conferido, para a cliente da sessao, e atualiza a tela', async () => {
    expect(await salvarPerfil(null, form({ nome: ' Maria  José ', celular: '(11) 98765-4321' }))).toEqual({ ok: true, aviso: 'salvo' })
    expect(m.consumirLimite).toHaveBeenCalledWith('perfil:usuario-1', 20, 3600)
    expect(m.gravarPerfil).toHaveBeenCalledWith('usuario-1', { nome: 'Maria José', celular: '11987654321' })
    expect(m.refresh).toHaveBeenCalled()
  })

  it('erro desconhecido do banco vira tente_de_novo, sem a mensagem crua', async () => {
    m.gravarPerfil.mockRejectedValueOnce(new Error('permission denied for table perfis'))
    const r = await salvarPerfil(null, form({ nome: 'Maria', celular: '11987654321' }))
    expect(r).toEqual({ ok: false, erro: 'tente_de_novo' })
    expect(JSON.stringify(r)).not.toMatch(/permission|perfis/)
    expect(m.refresh).not.toHaveBeenCalled()
  })

  it('definirMarketing: sem limite, marcado e desmarcado', async () => {
    expect(await definirMarketing(null, form({ novidades: 'on' }))).toEqual({ ok: true, aviso: 'salvo' })
    expect(await definirMarketing(null, form({}))).toEqual({ ok: true, aviso: 'salvo' })
    expect(m.gravarMarketing.mock.calls).toEqual([[true], [false]])
    expect(m.consumirLimite).not.toHaveBeenCalled()
  })
})

describe('os enderecos', () => {
  it('id vazio cria; com id, altera so o da cliente', async () => {
    expect(await salvarEndereco(null, form(enderecoValido))).toEqual({ ok: true, aviso: 'salvo' })
    expect(m.criarEndereco).toHaveBeenCalledWith(expect.objectContaining({ cep: '03183002', principal: false }))
    expect(m.consumirLimite).toHaveBeenCalledWith('enderecos:usuario-1', 20, 3600)
    expect(await salvarEndereco(null, form({ ...enderecoValido, id: UUID, principal: 'on' }))).toEqual({ ok: true, aviso: 'salvo' })
    expect(m.alterarEndereco).toHaveBeenCalledWith('usuario-1', UUID, expect.objectContaining({ principal: true }))
  })

  it('a regra do banco chega como codigo', async () => {
    m.criarEndereco.mockRejectedValueOnce(new ErroDeRegra('limite_de_enderecos'))
    expect(await salvarEndereco(null, form(enderecoValido))).toEqual({ ok: false, erro: 'limite_de_enderecos' })
  })

  it('codigo do banco que a tela nao conhece vira tente_de_novo', async () => {
    m.criarEndereco.mockRejectedValueOnce(new ErroDeRegra('sem_sessao'))
    expect(await salvarEndereco(null, form(enderecoValido))).toEqual({ ok: false, erro: 'tente_de_novo' })
  })

  it('alterar um que nao e dela: endereco_nao_encontrado', async () => {
    m.alterarEndereco.mockResolvedValueOnce(false)
    expect(await salvarEndereco(null, form({ ...enderecoValido, id: UUID }))).toEqual({ ok: false, erro: 'endereco_nao_encontrado' })
  })

  it('campo invalido volta com o campo marcado, sem limite nem banco', async () => {
    const r = await salvarEndereco(null, form({ ...enderecoValido, cep: '123' }))
    expect(r).toEqual({ ok: false, erro: 'campos_invalidos', campos: { cep: expect.any(String) } })
    expect(m.consumirLimite).not.toHaveBeenCalled()
    expect(m.criarEndereco).not.toHaveBeenCalled()
  })

  it('id de alteracao fora do formato: campos_invalidos, sem banco', async () => {
    expect(await salvarEndereco(null, form({ ...enderecoValido, id: "1' or 1=1" }))).toMatchObject({ ok: false, erro: 'campos_invalidos' })
    expect(m.alterarEndereco).not.toHaveBeenCalled()
  })

  it.each([
    ['removerEndereco', removerEndereco, m.apagarEndereco],
    ['tornarPrincipal', tornarPrincipal, m.tornarEnderecoPrincipal],
  ] as const)('%s: id que nao e UUID para antes do banco; false vira endereco_nao_encontrado', async (_, acao, dados) => {
    expect(await acao(null, form({ id: 'nao-e-uuid' }))).toMatchObject({ ok: false, erro: 'campos_invalidos' })
    expect(dados).not.toHaveBeenCalled()
    expect(await acao(null, form({ id: UUID }))).toEqual({ ok: true, aviso: 'salvo' })
    expect(dados).toHaveBeenCalledWith('usuario-1', UUID)
    dados.mockResolvedValueOnce(false)
    expect(await acao(null, form({ id: UUID }))).toEqual({ ok: false, erro: 'endereco_nao_encontrado' })
  })

  it.each(HOSTIS.map((h) => [h.slice(0, 40), h]))('entrada hostil %j em cada campo: recusa ou texto ao pe da letra, nunca erro solto', async (_, hostil) => {
    for (const campo of ['apelido', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep']) {
      const r = await salvarEndereco(null, form({ ...enderecoValido, [campo]: hostil }))
      expect(r.ok || r.erro === 'campos_invalidos').toBe(true)
    }
  })
})

describe('consultarCep', () => {
  it('devolve o endereco do CEP, com a mascara tirada', async () => {
    expect(await consultarCep('03183-002')).toEqual({ logradouro: 'Rua Cuiabá', bairro: 'Alto da Mooca', cidade: 'São Paulo', uf: 'SP' })
    expect(m.consumirLimite).toHaveBeenCalledWith('cep:usuario-1', 30, 3600)
    expect(m.buscarCep).toHaveBeenCalledWith('03183002')
  })

  it('limite estourado: null, sem chamar o servico', async () => {
    m.consumirLimite.mockResolvedValueOnce(false)
    expect(await consultarCep('03183-002')).toBeNull()
    expect(m.buscarCep).not.toHaveBeenCalled()
  })

  it.each(['123', '03183-0021', 'abcdefgh', 12345678 as unknown as string])('CEP %j fora do formato: null, sem limite nem servico', async (cep) => {
    expect(await consultarCep(cep)).toBeNull()
    expect(m.consumirLimite).not.toHaveBeenCalled()
    expect(m.buscarCep).not.toHaveBeenCalled()
  })
})

describe('trocarSenha', () => {
  it('senha nova fora da regra: campos_invalidos, sem conferir nem trocar', async () => {
    expect(await trocarSenha(null, form({ ...senhas, nova: 'curta' }))).toEqual({ ok: false, erro: 'campos_invalidos', campos: { nova: expect.any(String) } })
    expect(m.senhaConfere).not.toHaveBeenCalled()
    expect(m.updateUser).not.toHaveBeenCalled()
  })

  it('a senha atual e conferida no servidor antes da troca, com o token da verificacao', async () => {
    m.senhaConfere.mockResolvedValueOnce('credenciais')
    expect(await trocarSenha(null, form(senhas))).toEqual({ ok: false, erro: 'senha_atual_errada' })
    expect(m.senhaConfere).toHaveBeenCalledWith('maria@exemplo.com', 'senha-atual-123', 'token')
    expect(m.consumirLimite).toHaveBeenCalledWith('credenciais:usuario-1', 5, 3600)
    expect(m.updateUser).not.toHaveBeenCalled()
    expect(m.signOut).not.toHaveBeenCalled()
  })

  it.each([
    ['captcha', 'captcha'],
    ['muitas_tentativas', 'muitas_tentativas'],
    ['tente_de_novo', 'tente_de_novo'],
  ])('a conferencia que volta %s vira %s', async (volta, erro) => {
    m.senhaConfere.mockResolvedValueOnce(volta)
    expect(await trocarSenha(null, form(senhas))).toEqual({ ok: false, erro })
  })

  it.each([
    [{ code: 'weak_password' }, 'senha_fraca'],
    [{ code: 'weak_password', reasons: ['pwned'] }, 'senha_vazada'],
    [{ code: 'same_password' }, 'senha_igual'],
    [{ code: 'over_request_rate_limit' }, 'muitas_tentativas'],
    [{ code: 'unexpected_failure', message: 'segredo' }, 'tente_de_novo'],
  ])('erro do Supabase %j vira %s, sem signOut', async (error, erro) => {
    m.updateUser.mockResolvedValueOnce({ data: null, error })
    const r = await trocarSenha(null, form(senhas))
    expect(r).toEqual({ ok: false, erro })
    expect(m.signOut).not.toHaveBeenCalled()
  })

  it('sucesso: troca com a senha atual junto e encerra as outras sessoes', async () => {
    expect(await trocarSenha(null, form(senhas))).toEqual({ ok: true, aviso: 'senha_trocada' })
    expect(m.updateUser).toHaveBeenCalledWith({ password: 'senha-nova-456', current_password: 'senha-atual-123' })
    expect(m.signOut).toHaveBeenCalledWith({ scope: 'others' })
    expect(m.ordem.slice(-2)).toEqual(['updateUser', 'signOut'])
  })
})

describe('trocarEmail', () => {
  it('e-mail invalido marca o campo, sem limite nem Supabase', async () => {
    expect(await trocarEmail(null, form({ email: 'maria' }))).toEqual({ ok: false, erro: 'campos_invalidos', campos: { email: expect.any(String) } })
    expect(m.consumirLimite).not.toHaveBeenCalled()
    expect(m.updateUser).not.toHaveBeenCalled()
  })

  it('pede a troca sem emailRedirectTo, com o e-mail aparado e em minusculas', async () => {
    expect(await trocarEmail(null, form({ email: '  Nova@Exemplo.com ' }))).toEqual({ ok: true, aviso: 'confira_os_dois_emails' })
    expect(m.updateUser).toHaveBeenCalledWith({ email: 'nova@exemplo.com' })
    expect(m.consumirLimite).toHaveBeenCalledWith('credenciais:usuario-1', 5, 3600)
  })

  it('e-mail ja cadastrado responde igual ao sucesso', async () => {
    m.updateUser.mockResolvedValueOnce({ data: null, error: { code: 'email_exists' } })
    expect(await trocarEmail(null, form({ email: 'outra@exemplo.com' }))).toEqual({ ok: true, aviso: 'confira_os_dois_emails' })
  })

  it.each([
    [{ code: 'email_address_invalid' }, { ok: false, erro: 'campos_invalidos', campos: { email: expect.any(String) } }],
    [{ code: 'over_email_send_rate_limit' }, { ok: false, erro: 'muitas_tentativas' }],
    [{ code: 'over_request_rate_limit' }, { ok: false, erro: 'muitas_tentativas' }],
    [{ code: 'unexpected_failure' }, { ok: false, erro: 'tente_de_novo' }],
  ])('erro %j', async (error, esperado) => {
    m.updateUser.mockResolvedValueOnce({ data: null, error })
    expect(await trocarEmail(null, form({ email: 'outra@exemplo.com' }))).toEqual(esperado)
  })
})

describe('cancelarPedido', () => {
  it('numero fora do formato: pedido_invalido, sem banco', async () => {
    expect(await cancelarPedido(null, form({ numero: "AMO-2B7KQ9XZ' or 1=1" }))).toEqual({ ok: false, erro: 'pedido_invalido' })
    expect(m.exigirUsuario).toHaveBeenCalledWith('/conta/pedidos')
    expect(m.cancelarPedidoDaCliente).not.toHaveBeenCalled()
  })

  it('o pedido que nao e dela chega como pedido_invalido', async () => {
    m.cancelarPedidoDaCliente.mockRejectedValueOnce(new ErroDeRegra('pedido_invalido'))
    expect(await cancelarPedido(null, form({ numero: 'AMO-2B7KQ9XZ' }))).toEqual({ ok: false, erro: 'pedido_invalido' })
  })

  it('sucesso: cancela o da cliente, sem limite', async () => {
    expect(await cancelarPedido(null, form({ numero: 'AMO-2B7KQ9XZ' }))).toEqual({ ok: true, aviso: 'pedido_cancelado' })
    expect(m.cancelarPedidoDaCliente).toHaveBeenCalledWith('usuario-1', 'AMO-2B7KQ9XZ')
    expect(m.consumirLimite).not.toHaveBeenCalled()
  })
})

describe('a resposta', () => {
  it('leva so ok, aviso, erro e campos', async () => {
    m.gravarPerfil.mockRejectedValueOnce(Object.assign(new Error('x'), { stack: 'pilha', detalhe: 'y' }))
    const respostas = [
      await salvarPerfil(null, form({ nome: 'Maria', celular: '11987654321' })),
      await salvarPerfil(null, form({ nome: 'M', celular: '1' })),
      await trocarSenha(null, form(senhas)),
      await cancelarPedido(null, form({ numero: 'x' })),
    ]
    for (const r of respostas) chavesPermitidas(r)
  })
})
