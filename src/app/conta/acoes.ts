'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirUsuario, type Usuario } from '@/lib/auth'
import { senhaConfere } from '@/lib/auth/senha'
import { criarClienteServidor } from '@/lib/auth/servidor'
import { conferirEmail, conferirEndereco, conferirNumeroDoPedido, conferirPerfil, conferirSenha, conferirSenhaAtual } from '@/lib/conta/regras'
import type { AvisoDaConta, CodigoDeErro } from '@/lib/conta/mensagens'
import { buscarCep, type EnderecoDoCep } from '@/lib/dados/cep'
import { alterarEndereco, apagarEndereco, criarEndereco, tornarEnderecoPrincipal } from '@/lib/dados/enderecos'
import { ErroDeRegra, registrarFalha } from '@/lib/dados/erros'
import { consumirLimite } from '@/lib/dados/limites'
import { cancelarPedidoDaCliente } from '@/lib/dados/pedidos'
import { gravarMarketing, gravarPerfil } from '@/lib/dados/perfil'

/**
 * As acoes de Minha conta. Toda acao, nesta ordem (backend 11): a sessao, cada
 * campo conferido, o limite de tentativas, a camada de dados e a traducao do
 * erro. Campo invalido nao gasta limite. A resposta leva so o que a tela usa;
 * o redirecionamento de quem nao esta logada fica fora de qualquer try.
 */

export type Resposta = { ok: true; aviso?: AvisoDaConta } | { ok: false; erro: CodigoDeErro; campos?: Record<string, string> }

const PERFIL = '/conta/perfil'
const ENDERECOS = '/conta/perfil/enderecos'
const EMAIL_E_SENHA = '/conta/perfil/email-e-senha'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODIGOS_DO_BANCO: ReadonlySet<string> = new Set<CodigoDeErro>(['limite_de_enderecos', 'endereco_nao_encontrado', 'pedido_invalido'])

const texto = (form: FormData, campo: string) => {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor : ''
}
/** O token do Turnstile; um enorme nao e token, vira vazio e o Supabase recusa. */
const tokenDoCaptcha = (form: FormData) => {
  const token = texto(form, 'cf-turnstile-response')
  return token.length <= 4096 ? token : ''
}

const falha = (erro: CodigoDeErro, campos?: Record<string, string>): Resposta => (campos ? { ok: false, erro, campos } : { ok: false, erro })
const feito = (aviso: AvisoDaConta): Resposta => ({ ok: true, aviso })

/**
 * A parte comum: a sessao (fora do try, porque o redirecionamento e uma
 * excecao do Next), e qualquer erro da camada de dados traduzido para um
 * codigo que a tela conhece. A mensagem crua nunca sai daqui.
 */
async function comSessao(volta: string, fazer: (usuario: Usuario) => Promise<Resposta>): Promise<Resposta> {
  const usuario = await exigirUsuario(volta)
  try {
    return await fazer(usuario)
  } catch (erro) {
    return erro instanceof ErroDeRegra && CODIGOS_DO_BANCO.has(erro.codigo) ? falha(erro.codigo as CodigoDeErro) : falha('tente_de_novo')
  }
}

/** Grava e atualiza a pagina atual, que le do banco a cada visita. */
async function gravarEAtualizar(gravar: () => Promise<boolean | void>): Promise<Resposta> {
  if ((await gravar()) === false) return falha('endereco_nao_encontrado')
  refresh()
  return feito('salvo')
}

export async function salvarPerfil(_: Resposta | null, form: FormData): Promise<Resposta> {
  return comSessao(PERFIL, async (usuario) => {
    const conferido = conferirPerfil({ nome: form.get('nome'), celular: form.get('celular') })
    if (!conferido.ok) return falha('campos_invalidos', conferido.erros)
    if (!(await consumirLimite(`perfil:${usuario.id}`, 20, 3600))) return falha('muitas_tentativas')
    return gravarEAtualizar(() => gravarPerfil(usuario.id, conferido.valor))
  })
}

/** Sem limite (backend 11): o banco so grava a data do aceite. */
export async function definirMarketing(_: Resposta | null, form: FormData): Promise<Resposta> {
  return comSessao(PERFIL, async () => gravarEAtualizar(() => gravarMarketing(texto(form, 'novidades') === 'on')))
}

/** Campo id vazio cria; preenchido, altera o endereco da cliente com esse id. */
export async function salvarEndereco(_: Resposta | null, form: FormData): Promise<Resposta> {
  return comSessao(ENDERECOS, async (usuario) => {
    const id = texto(form, 'id')
    const conferido = conferirEndereco({
      apelido: form.get('apelido'),
      cep: form.get('cep'),
      logradouro: form.get('logradouro'),
      numero: form.get('numero'),
      complemento: form.get('complemento'),
      bairro: form.get('bairro'),
      cidade: form.get('cidade'),
      uf: form.get('uf'),
      principal: form.get('principal'),
    })
    if (id !== '' && !UUID.test(id)) return falha('campos_invalidos')
    if (!conferido.ok) return falha('campos_invalidos', conferido.erros)
    if (!(await consumirLimite(`enderecos:${usuario.id}`, 20, 3600))) return falha('muitas_tentativas')
    return gravarEAtualizar(() => (id === '' ? criarEndereco(conferido.valor) : alterarEndereco(usuario.id, id, conferido.valor)))
  })
}

async function porEndereco(form: FormData, fazer: (usuarioId: string, id: string) => Promise<boolean>): Promise<Resposta> {
  return comSessao(ENDERECOS, async (usuario) => {
    const id = texto(form, 'id')
    if (!UUID.test(id)) return falha('campos_invalidos')
    if (!(await consumirLimite(`enderecos:${usuario.id}`, 20, 3600))) return falha('muitas_tentativas')
    return gravarEAtualizar(() => fazer(usuario.id, id))
  })
}

export async function removerEndereco(_: Resposta | null, form: FormData): Promise<Resposta> {
  return porEndereco(form, apagarEndereco)
}

export async function tornarPrincipal(_: Resposta | null, form: FormData): Promise<Resposta> {
  return porEndereco(form, tornarEnderecoPrincipal)
}

/** O endereco do CEP para preencher o formulario. Invalido ou limite estourado: null. */
export async function consultarCep(cep: string): Promise<EnderecoDoCep | null> {
  const usuario = await exigirUsuario(ENDERECOS)
  if (typeof cep !== 'string' || !/^\d{5}-?\d{3}$/.test(cep.trim())) return null
  if (!(await consumirLimite(`cep:${usuario.id}`, 30, 3600))) return null
  return buscarCep(cep.trim().replace('-', ''))
}

const CONFERENCIA_DA_SENHA: Record<string, CodigoDeErro> = {
  credenciais: 'senha_atual_errada',
  captcha: 'captcha',
  muitas_tentativas: 'muitas_tentativas',
}

const ERRO_DA_TROCA_DE_SENHA = (erro: { code?: string; reasons?: string[] }): CodigoDeErro => {
  switch (erro.code) {
    case 'weak_password':
      return erro.reasons?.includes('pwned') ? 'senha_vazada' : 'senha_fraca'
    case 'same_password':
      return 'senha_igual'
    case 'over_request_rate_limit':
      return 'muitas_tentativas'
    // "Secure password change" no painel pede login recente (24 h): diz o caminho em vez de "tente de novo"
    case 'reauthentication_needed':
      return 'entre_de_novo'
    default:
      return 'tente_de_novo'
  }
}

/**
 * A senha atual e conferida aqui, num login a parte (senhaConfere), porque o
 * painel do Supabase pode trocar a senha sem conferir a atual (achado de
 * 2026-11-20); ela tambem segue no updateUser, para quando o painel conferir.
 * A sessao do login a parte ja se fecha em senhaConfere; so no sucesso as outras sessoes caem.
 */
export async function trocarSenha(_: Resposta | null, form: FormData): Promise<Resposta> {
  return comSessao(EMAIL_E_SENHA, async (usuario) => {
    const atual = conferirSenhaAtual(form.get('atual'))
    const nova = conferirSenha(form.get('nova'))
    const campos: Record<string, string> = {}
    if (!atual) campos.atual = 'Digite a sua senha atual.'
    if (!nova) campos.nova = 'Use 8 caracteres ou mais.'
    if (!atual || !nova) return falha('campos_invalidos', campos)
    if (!(await consumirLimite(`credenciais:${usuario.id}`, 5, 3600))) return falha('muitas_tentativas')

    const conferida = await senhaConfere(usuario.email, atual, tokenDoCaptcha(form))
    if (conferida !== true) return falha(CONFERENCIA_DA_SENHA[conferida] ?? 'tente_de_novo')

    const banco = await criarClienteServidor()
    const { error } = await banco.auth.updateUser({ password: nova, current_password: atual })
    if (error) {
      registrarFalha('trocarSenha', error)
      return falha(ERRO_DA_TROCA_DE_SENHA(error as { code?: string; reasons?: string[] }))
    }
    await banco.auth.signOut({ scope: 'others' })
    return feito('senha_trocada')
  })
}

/**
 * O e-mail novo so vale depois de confirmado no atual e no novo ("Secure email
 * change" do painel). E-mail que ja tem cadastro responde igual ao sucesso:
 * a tela nao revela quem tem conta. O limite de envio de e-mail tambem: o
 * GoTrue confere o e-mail repetido antes de enviar, entao so o e-mail sem
 * conta chegaria ao limite (como limiteDeEmailDoSupabase em src/lib/auth/erros.ts).
 */
export async function trocarEmail(_: Resposta | null, form: FormData): Promise<Resposta> {
  return comSessao(EMAIL_E_SENHA, async (usuario) => {
    const email = conferirEmail(form.get('email'))
    const campoEmail = { email: 'Confira o e-mail: falta algo como nome@exemplo.com.' }
    if (!email) return falha('campos_invalidos', campoEmail)
    if (email === usuario.email.toLowerCase()) return falha('campos_invalidos', { email: 'Esse já é o e-mail da sua conta.' })
    if (!(await consumirLimite(`credenciais:${usuario.id}`, 5, 3600))) return falha('muitas_tentativas')

    const { error } = await (await criarClienteServidor()).auth.updateUser({ email })
    if (error) registrarFalha('trocarEmail', error)
    switch (error?.code) {
      case undefined:
      case 'email_exists':
      case 'over_email_send_rate_limit':
        return feito('confira_os_dois_emails')
      case 'email_address_invalid':
        return falha('campos_invalidos', campoEmail)
      case 'over_request_rate_limit':
        return falha('muitas_tentativas')
      default:
        return falha('tente_de_novo')
    }
  })
}

/**
 * Sem limite (backend 11): o banco so cancela o que aguarda pagamento. Feito,
 * volta ao pedido com ?cancelado=1, que a pagina le para dizer que cancelou
 * (o formulario some com o pedido cancelado). O redirect fica fora do try.
 */
export async function cancelarPedido(_: Resposta | null, form: FormData): Promise<Resposta> {
  const numero = conferirNumeroDoPedido(form.get('numero'))
  const resposta = await comSessao(numero ? `/conta/pedidos/${numero}` : '/conta/pedidos', async (usuario) => {
    if (!numero) return falha('pedido_invalido')
    await cancelarPedidoDaCliente(usuario.id, numero)
    return feito('pedido_cancelado')
  })
  if (resposta.ok && numero) redirect(`/conta/pedidos/${numero}?cancelado=1`)
  return resposta
}
