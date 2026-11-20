import { erroDoCelular, erroDoNome } from '@/lib/pedido'

/**
 * As regras de entrada da conta: o que a cliente digita, conferido antes de
 * chegar ao Supabase. Puro, para servir ao formulario e a acao do servidor.
 * Os limites sao os do banco (perfis, enderecos); o banco confere de novo.
 */

export type Conferido<T, C extends string> = { ok: true; valor: T } | { ok: false; erros: Partial<Record<C, string>> }

const CONTROLE_OU_TAG = /[\u0000-\u001f\u007f<>]/
const BYTE_NULO = /\u0000/

/** Apara e troca espacos seguidos por um so. */
const limparTexto = (texto: string) => texto.trim().replace(/\s+/g, ' ')

/** E-mail aparado e em minusculas, ou null. */
export function conferirEmail(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  const email = bruto.trim().toLowerCase()
  if (email.length < 3 || email.length > 320) return null
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || CONTROLE_OU_TAG.test(email)) return null
  return email
}

/** Nome e celular do perfil: o celular sai so com os digitos. */
export function conferirPerfil(bruto: {
  nome: unknown
  celular: unknown
}): Conferido<{ nome: string; celular: string }, 'nome' | 'celular'> {
  const erros: Partial<Record<'nome' | 'celular', string>> = {}

  const nome = typeof bruto.nome === 'string' ? limparTexto(bruto.nome) : ''
  const erroNome = erroDoNome(nome)
  if (erroNome) erros.nome = erroNome
  else if (nome.length > 80 || CONTROLE_OU_TAG.test(nome)) erros.nome = 'Use só letras no nome, até 80.'

  const celularBruto = typeof bruto.celular === 'string' ? bruto.celular : ''
  const soMascara = /^[0-9 ()+-]*$/.test(celularBruto)
  const erroCelular = soMascara ? erroDoCelular(celularBruto) : erroDoCelular('')
  if (erroCelular) erros.celular = erroCelular

  if (Object.keys(erros).length > 0) return { ok: false, erros }
  return { ok: true, valor: { nome, celular: celularBruto.replace(/\D/g, '') } }
}

/** Senha nova: 8 a 72 caracteres (o limite do bcrypt), sem aparar. */
export function conferirSenha(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  if (bruto.length < 8 || bruto.length > 72 || BYTE_NULO.test(bruto)) return null
  return bruto
}

/** Senha de quem ja tem conta: so confere que existe e cabe. */
export function conferirSenhaAtual(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  if (bruto.length < 1 || bruto.length > 72 || BYTE_NULO.test(bruto)) return null
  return bruto
}

/** O codigo de 6 digitos, aceitando espaco e traco no meio. */
export function conferirCodigo(bruto: unknown): string | null {
  if (typeof bruto !== 'string' || bruto.length > 20) return null
  const codigo = bruto.replace(/[\s-]/g, '')
  return /^\d{6}$/.test(codigo) ? codigo : null
}
