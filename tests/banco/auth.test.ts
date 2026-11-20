import { afterAll, describe, expect, it } from 'vitest'
import { cookiesDoNavegador, trocarNavegador } from './preparar'
import { obterUsuario } from '@/lib/auth'
import { confirmarCadastro, entrar, excluirConta, pedirCodigoDeSenha, trocarSenhaComCodigo } from '@/lib/auth/acoes'
import { criarClienteAdmin } from '@/lib/auth/admin'
import { VERSAO_DOS_TERMOS } from '@/lib/auth/termos'
import { conferirPerfil } from '@/lib/conta/regras'

/**
 * A conta de ponta a ponta, com as acoes de verdade contra o banco de
 * desenvolvimento. Os codigos vem de generateLink, que nao manda e-mail; cada
 * "navegador" e um pote de cookies (preparar.ts). Os casos dependem um do
 * outro, na ordem em que a cliente faria.
 */

const admin = criarClienteAdmin()
const sorteio = () => crypto.randomUUID().slice(0, 8)
const criadas: string[] = []
const formulario = (campos: Record<string, string>) => {
  const form = new FormData()
  for (const [campo, valor] of Object.entries(campos)) form.set(campo, valor)
  return form
}
const temSessao = () => cookiesDoNavegador().some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))

const perfil = conferirPerfil({ nome: 'Maria Ensaio', celular: '(11) 98765-4321' })
if (!perfil.ok) throw new Error('o perfil de ensaio nao passa nas regras')
const dados = (versao_termos: string) => ({
  nome: perfil.valor.nome,
  celular: perfil.valor.celular,
  aceite_termos: true,
  versao_termos,
  aceite_marketing: false,
})

const email = `ensaio-${sorteio()}@amo-ensaio.dev`
const senha = `ensaio-${sorteio()}-senha`
const senhaNova = `ensaio-${sorteio()}-nova`

afterAll(async () => {
  for (const id of criadas) await admin.auth.admin.deleteUser(id)
})

describe('a conta de ponta a ponta', () => {
  it('cadastro confirmado com o codigo: sessao no cookie e o perfil do cadastro', async () => {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'signup', email, password: senha, options: { data: dados(VERSAO_DOS_TERMOS) } })
    expect(error).toBeNull()
    criadas.push(data.user!.id)
    trocarNavegador('cadastro')
    await expect(confirmarCadastro(null, formulario({ email, codigo: data.properties!.email_otp }))).rejects.toThrow('REDIRECIONOU /conta')
    expect(temSessao()).toBe(true)
    expect(await obterUsuario()).toMatchObject({ email, nome: perfil.valor.nome, celular: perfil.valor.celular })
  })

  it('termos de outra versao: o gatilho do banco recusa o cadastro', async () => {
    const outro = `ensaio-${sorteio()}@amo-ensaio.dev`
    const { data, error } = await admin.auth.admin.generateLink({ type: 'signup', email: outro, password: senha, options: { data: dados('2000-01-01') } })
    if (data.user) criadas.push(data.user.id)
    expect(error).not.toBeNull()
  })

  it('entrar com a senha certa, noutro navegador', async () => {
    trocarNavegador('segundo')
    await expect(entrar(null, formulario({ email, senha }))).rejects.toThrow('REDIRECIONOU /conta')
    expect(await obterUsuario()).toMatchObject({ email })
  })

  it('entrar com a senha errada', async () => {
    trocarNavegador('anonimo')
    expect(await entrar(null, formulario({ email, senha: 'senha-que-nao-e' }))).toEqual({ ok: false, erro: 'credenciais' })
  })

  it('pedir o codigo de senha responde igual com e sem conta', async () => {
    trocarNavegador('anonimo')
    const semConta = `ensaio-${sorteio()}@amo-ensaio.dev`
    const comConta = await pedirCodigoDeSenha(null, formulario({ email }))
    const naoExiste = await pedirCodigoDeSenha(null, formulario({ email: semConta }))
    expect(comConta).toEqual({ ok: true, passo: 'senha-nova', email })
    expect(naoExiste).toEqual({ ok: true, passo: 'senha-nova', email: semConta })
  })

  it('senha nova com o codigo: as outras sessoes caem e a senha nova entra', async () => {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
    expect(error).toBeNull()
    trocarNavegador('recuperacao')
    await expect(trocarSenhaComCodigo(null, formulario({ email, codigo: data.properties!.email_otp, senha: senhaNova }))).rejects.toThrow(
      'REDIRECIONOU /conta',
    )
    trocarNavegador('segundo')
    expect(await obterUsuario()).toBeNull()
    trocarNavegador('quarto')
    await expect(entrar(null, formulario({ email, senha: senhaNova }))).rejects.toThrow('REDIRECIONOU /conta')
  })

  it('excluir com a senha errada nao apaga', async () => {
    trocarNavegador('quarto')
    expect(await excluirConta(null, formulario({ senha: 'senha-que-nao-e', confirmo: 'on' }))).toEqual({ ok: false, erro: 'credenciais' })
    const { data } = await admin.auth.admin.getUserById(criadas[0])
    expect(data.user?.email).toBe(email)
  })

  it('excluir com a senha certa apaga a conta e a sessao', async () => {
    trocarNavegador('quarto')
    await expect(excluirConta(null, formulario({ senha: senhaNova, confirmo: 'on' }))).rejects.toThrow('REDIRECIONOU /conta/excluida')
    const { data } = await admin.auth.admin.getUserById(criadas[0])
    expect(data.user).toBeNull()
    expect(cookiesDoNavegador().filter((c) => c.name.startsWith('sb-'))).toEqual([])
  })
})
