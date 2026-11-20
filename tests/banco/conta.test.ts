import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { trocarNavegador } from './preparar'
import { criarClienteAdmin } from '@/lib/auth/admin'
import { senhaConfere } from '@/lib/auth/senha'
import { criarClienteServidor } from '@/lib/auth/servidor'
import { VERSAO_DOS_TERMOS } from '@/lib/auth/termos'
import type { EnderecoNovo } from '@/lib/conta/regras'
import { apagarEndereco, criarEndereco, lerEnderecos, tornarEnderecoPrincipal } from '@/lib/dados/enderecos'
import { ErroDeRegra } from '@/lib/dados/erros'
import { consumirLimite } from '@/lib/dados/limites'
import { cancelarPedidoDaCliente, lerPedido, lerPedidos } from '@/lib/dados/pedidos'
import { gravarMarketing, gravarPerfil, lerPerfil, podeExcluirConta } from '@/lib/dados/perfil'

/**
 * A camada de dados de Minha conta contra o banco de desenvolvimento, com a
 * sessao de duas clientes de ensaio de verdade. A sessao nasce sem senha e
 * sem CAPTCHA (createUser e o link magico do admin, conferido no "navegador"
 * de cada uma); cada funcao usa o cliente da sessao do navegador da vez.
 */

const admin = criarClienteAdmin()
const sorteio = () => crypto.randomUUID().slice(0, 8)
const SENHA = `ensaio-${sorteio()}-senha`
const clientes: Record<'A' | 'B', { id: string; email: string }> = {
  A: { id: '', email: `ensaio-${sorteio()}@amo-ensaio.dev` },
  B: { id: '', email: `ensaio-${sorteio()}@amo-ensaio.dev` },
}

async function abrirSessao(quem: 'A' | 'B') {
  const { email } = clientes[quem]
  const criada = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
    user_metadata: { nome: 'Cliente Ensaio', celular: '11987654321', aceite_termos: true, versao_termos: VERSAO_DOS_TERMOS, aceite_marketing: false },
  })
  if (criada.error || !criada.data.user) throw new Error(`createUser: ${criada.error?.code}`)
  clientes[quem].id = criada.data.user.id
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (link.error) throw new Error(`generateLink: ${link.error.code}`)
  trocarNavegador(quem)
  const { error } = await (await criarClienteServidor()).auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' })
  if (error) throw new Error(`verifyOtp: ${error.code}`)
}

const endereco = (n: number): EnderecoNovo => ({
  apelido: `Lugar ${n}`,
  cep: '03183002',
  logradouro: 'Rua Cuiabá',
  numero: String(400 + n),
  complemento: '',
  bairro: 'Alto da Mooca',
  cidade: 'São Paulo',
  uf: 'SP',
  principal: false,
})

beforeAll(async () => {
  await abrirSessao('A')
  await abrirSessao('B')
})

afterAll(async () => {
  for (const { id } of Object.values(clientes)) if (id) await admin.auth.admin.deleteUser(id)
})

describe('a camada de dados da conta', () => {
  it('le e grava o perfil e o aceite de novidades', async () => {
    trocarNavegador('A')
    const A = clientes.A.id
    expect(await lerPerfil(A)).toEqual({ nome: 'Cliente Ensaio', celular: '11987654321', aceitaMarketing: false })
    await gravarPerfil(A, { nome: 'Maria Ensaio', celular: '11912345678' })
    await gravarMarketing(true)
    expect(await lerPerfil(A)).toEqual({ nome: 'Maria Ensaio', celular: '11912345678', aceitaMarketing: true })
  })

  it('ate cinco enderecos; o sexto e recusado pela regra do banco', async () => {
    trocarNavegador('A')
    for (let n = 1; n <= 5; n++) await criarEndereco(endereco(n))
    expect(await lerEnderecos(clientes.A.id)).toHaveLength(5)
    const sexto = criarEndereco(endereco(6))
    await expect(sexto).rejects.toBeInstanceOf(ErroDeRegra)
    await expect(sexto).rejects.toMatchObject({ codigo: 'limite_de_enderecos' })
  })

  it('tornar principal deixa um so, e ele vem primeiro', async () => {
    trocarNavegador('A')
    const A = clientes.A.id
    const terceiro = (await lerEnderecos(A)).find((e) => e.apelido === 'Lugar 3')!
    expect(await tornarEnderecoPrincipal(A, terceiro.id)).toBe(true)
    const depois = await lerEnderecos(A)
    expect(depois.filter((e) => e.principal).map((e) => e.id)).toEqual([terceiro.id])
    expect(depois[0].id).toBe(terceiro.id)
  })

  it('apagar devolve true uma vez e false depois', async () => {
    trocarNavegador('A')
    const A = clientes.A.id
    const quinto = (await lerEnderecos(A)).find((e) => e.apelido === 'Lugar 5')!
    expect(await apagarEndereco(A, quinto.id)).toBe(true)
    expect(await apagarEndereco(A, quinto.id)).toBe(false)
  })

  it('a cliente B nao le nem apaga nada de A', async () => {
    trocarNavegador('A')
    const deA = (await lerEnderecos(clientes.A.id))[0]
    trocarNavegador('B')
    expect(await lerEnderecos(clientes.A.id)).toEqual([])
    expect(await lerPerfil(clientes.A.id)).toBeNull()
    expect(await apagarEndereco(clientes.A.id, deA.id)).toBe(false)
    expect(await tornarEnderecoPrincipal(clientes.A.id, deA.id)).toBe(false)
    trocarNavegador('A')
    expect(await lerEnderecos(clientes.A.id)).toHaveLength(4)
  })

  it('sem pedidos: lista vazia, pedido nulo e cancelar recusa', async () => {
    trocarNavegador('A')
    const A = clientes.A.id
    expect(await lerPedidos(A)).toEqual([])
    expect(await lerPedido(A, 'AMO-22222222')).toBeNull()
    const cancelar = cancelarPedidoDaCliente(A, 'AMO-22222222')
    await expect(cancelar).rejects.toBeInstanceOf(ErroDeRegra)
    await expect(cancelar).rejects.toMatchObject({ codigo: 'pedido_invalido' })
  })

  it('sem pedido em aberto, a conta pode ser excluida', async () => {
    trocarNavegador('A')
    expect(await podeExcluirConta()).toEqual({ pode: true, motivo: null })
  })

  it('o limite conta e fecha', async () => {
    const chave = `ensaio:${sorteio()}`
    expect([await consumirLimite(chave, 2, 60), await consumirLimite(chave, 2, 60), await consumirLimite(chave, 2, 60)]).toEqual([true, true, false])
  })

  // o painel de desenvolvimento troca a senha sem conferir a atual (achado de
  // 2026-11-20): quem confere e o servidor, com senhaConfere, antes de trocar
  it('a senha atual e conferida a parte, sem mexer na sessao', async () => {
    expect(await senhaConfere(clientes.A.email, 'senha-errada', '')).toBe('credenciais')
    expect(await senhaConfere(clientes.A.email, SENHA, '')).toBe(true)
    trocarNavegador('A')
    expect(await lerPerfil(clientes.A.id)).not.toBeNull()
  })
})
