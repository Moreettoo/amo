'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { exigirUsuario } from '@/lib/auth'
import { criarClienteAdmin } from '@/lib/auth/admin'
import { apagarCookiesDaSessao } from '@/lib/auth/cookies'
import { erroQueNaoRevelaNada, limiteDeEmailDoSupabase, traduzirErroDoAuth, type CodigoDaConta } from '@/lib/auth/erros'
import { lerIp } from '@/lib/auth/ip'
import { senhaConfere } from '@/lib/auth/senha'
import { criarClienteServidor } from '@/lib/auth/servidor'
import { VERSAO_DOS_TERMOS } from '@/lib/auth/termos'
import { voltaSegura } from '@/lib/auth/volta'
import { conferirCodigo, conferirEmail, conferirPerfil, conferirSenha, conferirSenhaAtual } from '@/lib/conta/regras'
import { consumirLimite } from '@/lib/dados/limites'

/**
 * As acoes da conta. Toda acao, nesta ordem: sessao (quando e de quem esta
 * logada), cada campo conferido, o limite de tentativas, o Supabase e a
 * traducao do erro. Campo invalido nao gasta limite. A resposta leva so o que
 * a tela usa; redirect fica fora de qualquer try.
 */

export type PassoDaConta = 'codigo' | 'senha-nova'
export type RespostaDaConta =
  | { ok: true; passo?: PassoDaConta; email?: string; aviso?: 'codigo_reenviado' }
  | { ok: false; erro: CodigoDaConta; campos?: Record<string, string>; passo?: PassoDaConta; email?: string }

const MENSAGEM = {
  email: 'Confira o e-mail: falta algo como nome@exemplo.com.',
  senha: 'Use 8 caracteres ou mais.',
  senhaAtual: 'Digite a sua senha.',
  codigo: 'O código tem 6 números.',
  termos: 'Para criar a conta, aceite os termos.',
  confirmo: 'Marque que você entende o que acontece com a conta.',
}

const texto = (form: FormData, campo: string) => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor : ''
}
/** O token do Turnstile; um enorme nao e token, vira vazio e o Supabase recusa. */
const tokenDoCaptcha = (form: FormData) => {
  const token = texto(form, 'cf-turnstile-response')
  return token.length <= 4096 ? token : ''
}
const falha = (erro: CodigoDaConta, extra: Omit<Extract<RespostaDaConta, { ok: false }>, 'ok' | 'erro'> = {}): RespostaDaConta => ({
  ok: false,
  erro,
  ...extra,
})
const camposInvalidos = (campos: Record<string, string>, extra = {}) => falha('campos_invalidos', { campos, ...extra })

async function dentroDosLimites(limites: [string, number, number][]): Promise<boolean> {
  for (const [chave, maximo, janela] of limites) {
    if (!(await consumirLimite(chave, maximo, janela))) return false
  }
  return true
}
const ipDoPedido = async () => lerIp(await headers())

export async function entrar(_: RespostaDaConta | null, form: FormData): Promise<RespostaDaConta> {
  const email = conferirEmail(texto(form, 'email'))
  const senha = conferirSenhaAtual(texto(form, 'senha'))
  if (!email || !senha) {
    return camposInvalidos({ ...(!email && { email: MENSAGEM.email }), ...(!senha && { senha: MENSAGEM.senhaAtual }) })
  }
  const ip = await ipDoPedido()
  if (!(await dentroDosLimites([[`entrar:ip:${ip}`, 10, 900], [`entrar:email:${email}`, 10, 900]]))) return falha('muitas_tentativas')
  try {
    const banco = await criarClienteServidor()
    const { error } = await banco.auth.signInWithPassword({ email, password: senha, options: { captchaToken: tokenDoCaptcha(form) } })
    if (error?.code === 'email_not_confirmed') return { ok: true, passo: 'codigo', email }
    if (error) return falha(traduzirErroDoAuth(error))
  } catch {
    return falha('tente_de_novo')
  }
  redirect(voltaSegura(texto(form, 'volta')))
}

export async function cadastrar(_: RespostaDaConta | null, form: FormData): Promise<RespostaDaConta> {
  const perfil = conferirPerfil({ nome: texto(form, 'nome'), celular: texto(form, 'celular') })
  const email = conferirEmail(texto(form, 'email'))
  const senha = conferirSenha(texto(form, 'senha'))
  const aceitou = texto(form, 'termos') === 'on'
  if (!perfil.ok || !email || !senha || !aceitou) {
    return camposInvalidos({
      ...(!perfil.ok && perfil.erros),
      ...(!email && { email: MENSAGEM.email }),
      ...(!senha && { senha: MENSAGEM.senha }),
      ...(!aceitou && { termos: MENSAGEM.termos }),
    } as Record<string, string>)
  }
  const ip = await ipDoPedido()
  if (!(await dentroDosLimites([[`cadastrar:ip:${ip}`, 5, 3600]]))) return falha('muitas_tentativas')
  try {
    const banco = await criarClienteServidor()
    const { error } = await banco.auth.signUp({
      email,
      password: senha,
      options: {
        captchaToken: tokenDoCaptcha(form),
        data: {
          nome: perfil.valor.nome,
          celular: perfil.valor.celular,
          aceite_termos: true,
          versao_termos: VERSAO_DOS_TERMOS,
          aceite_marketing: texto(form, 'novidades') === 'on',
        },
      },
    })
    // conta que ja existe responde igual a conta nova (spec 4.1), e o limite de
    // e-mail, que so pega conta nova, tambem
    const naoRevela = error?.code === 'user_already_exists' || error?.code === 'email_exists' || limiteDeEmailDoSupabase(error)
    if (error && !naoRevela) return falha(traduzirErroDoAuth(error))
  } catch {
    return falha('tente_de_novo')
  }
  return { ok: true, passo: 'codigo', email }
}

export async function confirmarCadastro(_: RespostaDaConta | null, form: FormData): Promise<RespostaDaConta> {
  const email = conferirEmail(texto(form, 'email'))
  const codigo = conferirCodigo(texto(form, 'codigo'))
  if (!email || !codigo) {
    return camposInvalidos(
      { ...(!email && { email: MENSAGEM.email }), ...(!codigo && { codigo: MENSAGEM.codigo }) },
      { passo: 'codigo', ...(email && { email }) },
    )
  }
  if (!(await dentroDosLimites([[`confirmar:email:${email}`, 10, 3600]]))) return falha('muitas_tentativas', { passo: 'codigo', email })
  try {
    const banco = await criarClienteServidor()
    const { error } = await banco.auth.verifyOtp({ email, token: codigo, type: 'email' })
    if (error) return falha(traduzirErroDoAuth(error), { passo: 'codigo', email })
  } catch {
    return falha('tente_de_novo', { passo: 'codigo', email })
  }
  redirect(voltaSegura(texto(form, 'volta')))
}

export async function reenviarCodigo(_: RespostaDaConta | null, form: FormData): Promise<RespostaDaConta> {
  const email = conferirEmail(texto(form, 'email'))
  if (!email) return camposInvalidos({ email: MENSAGEM.email }, { passo: 'codigo' })
  if (!(await dentroDosLimites([[`codigo:email:${email}`, 5, 3600]]))) return falha('muitas_tentativas', { passo: 'codigo', email })
  try {
    const banco = await criarClienteServidor()
    const { error } = await banco.auth.resend({ type: 'signup', email, options: { captchaToken: tokenDoCaptcha(form) } })
    if (error && !erroQueNaoRevelaNada(error)) return falha(traduzirErroDoAuth(error), { passo: 'codigo', email })
  } catch {
    return falha('tente_de_novo', { passo: 'codigo', email })
  }
  return { ok: true, passo: 'codigo', email, aviso: 'codigo_reenviado' }
}

export async function pedirCodigoDeSenha(_: RespostaDaConta | null, form: FormData): Promise<RespostaDaConta> {
  const email = conferirEmail(texto(form, 'email'))
  if (!email) return camposInvalidos({ email: MENSAGEM.email })
  const ip = await ipDoPedido()
  if (!(await dentroDosLimites([[`esqueci:ip:${ip}`, 5, 3600], [`esqueci:email:${email}`, 5, 3600]]))) return falha('muitas_tentativas')
  try {
    const banco = await criarClienteServidor()
    const { error } = await banco.auth.resetPasswordForEmail(email, { captchaToken: tokenDoCaptcha(form) })
    // com e sem conta, a mesma resposta (spec 4.1)
    if (error && !erroQueNaoRevelaNada(error)) return falha(traduzirErroDoAuth(error))
  } catch {
    return falha('tente_de_novo')
  }
  return { ok: true, passo: 'senha-nova', email }
}

export async function trocarSenhaComCodigo(_: RespostaDaConta | null, form: FormData): Promise<RespostaDaConta> {
  const email = conferirEmail(texto(form, 'email'))
  const codigo = conferirCodigo(texto(form, 'codigo'))
  const senha = conferirSenha(texto(form, 'senha'))
  if (!email || !codigo || !senha) {
    return camposInvalidos(
      {
        ...(!email && { email: MENSAGEM.email }),
        ...(!codigo && { codigo: MENSAGEM.codigo }),
        ...(!senha && { senha: MENSAGEM.senha }),
      },
      { passo: 'senha-nova', ...(email && { email }) },
    )
  }
  const ip = await ipDoPedido()
  const passo = { passo: 'senha-nova' as const, email }
  if (!(await dentroDosLimites([[`redefinir:ip:${ip}`, 10, 3600], [`redefinir:email:${email}`, 10, 3600]]))) return falha('muitas_tentativas', passo)
  try {
    const banco = await criarClienteServidor()
    const conferido = await banco.auth.verifyOtp({ email, token: codigo, type: 'recovery' })
    if (conferido.error) return falha(traduzirErroDoAuth(conferido.error), passo)
    const trocado = await banco.auth.updateUser({ password: senha })
    if (trocado.error) return falha(traduzirErroDoAuth(trocado.error), passo)
    // trocar a senha encerra as outras sessoes (contrato, item 6)
    const encerrado = await banco.auth.signOut({ scope: 'others' })
    if (encerrado.error) return falha('tente_de_novo', passo)
  } catch {
    return falha('tente_de_novo', passo)
  }
  redirect('/conta')
}

export async function excluirConta(_: RespostaDaConta | null, form: FormData): Promise<RespostaDaConta> {
  const usuario = await exigirUsuario('/conta/excluir')
  const senha = conferirSenhaAtual(texto(form, 'senha'))
  const confirmou = texto(form, 'confirmo') === 'on'
  if (!senha || !confirmou) {
    return camposInvalidos({ ...(!senha && { senha: MENSAGEM.senhaAtual }), ...(!confirmou && { confirmo: MENSAGEM.confirmo }) })
  }
  if (!(await dentroDosLimites([[`excluir:${usuario.id}`, 3, 3600]]))) return falha('muitas_tentativas')
  try {
    const banco = await criarClienteServidor()
    const { data, error } = await banco.rpc('pode_excluir_conta')
    if (error || !data?.[0]) return falha('tente_de_novo')
    if (!data[0].pode) return falha('pedido_em_aberto')
    const conferida = await senhaConfere(usuario.email, senha, tokenDoCaptcha(form))
    if (conferida !== true) return falha((conferida as CodigoDaConta | false) || 'credenciais')
    const apagada = await criarClienteAdmin().auth.admin.deleteUser(usuario.id)
    if (apagada.error) return falha('tente_de_novo')
    await apagarCookiesDaSessao()
  } catch {
    return falha('tente_de_novo')
  }
  // apagar o cookie faz o Next renderizar de novo /conta/excluir, que sem
  // sessao manda entrar: o aviso mora numa pagina propria
  redirect('/conta/excluida')
}

/** Encerra esta sessao e volta para a home. */
export async function sair(): Promise<never> {
  try {
    const banco = await criarClienteServidor()
    await banco.auth.signOut()
  } catch {
    // sem sessao ou Supabase fora do ar: o cookie local some do mesmo jeito
    await apagarCookiesDaSessao()
  }
  redirect('/')
}
