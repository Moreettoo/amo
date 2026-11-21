import { erroDoCelular, erroDoNome } from '@/lib/pedido'

/**
 * As regras de entrada da conta: o que a cliente digita, conferido antes de
 * chegar ao Supabase. Puro, para servir ao formulario e a acao do servidor.
 * Os limites sao os do banco (perfis, enderecos); o banco confere de novo.
 */

export type Conferido<T, C extends string> = { ok: true; valor: T } | { ok: false; erros: Partial<Record<C, string>> }

const CONTROLE_OU_TAG = /[\u0000-\u001f\u007f-\u009f<>]/
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

/** As 27 unidades da federacao, em siglas. */
export const UFS: readonly string[] = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export type CampoDoEndereco = 'apelido' | 'cep' | 'logradouro' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'uf'

export type EnderecoNovo = {
  apelido: string | null
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  principal: boolean
}

/** Texto limpo que cabe entre `min` e `max` e nao traz controle nem tag; ou null. */
function textoEntre(bruto: unknown, min: number, max: number): string | null {
  if (typeof bruto !== 'string') return null
  const texto = limparTexto(bruto)
  if (texto.length < min || texto.length > max || CONTROLE_OU_TAG.test(texto)) return null
  return texto
}

/** Um endereco de entrega, nos limites da tabela enderecos. */
export function conferirEndereco(bruto: Record<CampoDoEndereco | 'principal', unknown>): Conferido<EnderecoNovo, CampoDoEndereco> {
  const erros: Partial<Record<CampoDoEndereco, string>> = {}

  const apelidoBruto = typeof bruto.apelido === 'string' ? limparTexto(bruto.apelido) : ''
  const apelido = apelidoBruto === '' ? null : textoEntre(apelidoBruto, 1, 30)
  if (apelidoBruto !== '' && apelido === null) erros.apelido = 'Um nome curto, até 30 letras, como Casa.'

  const cepBruto = typeof bruto.cep === 'string' ? bruto.cep.trim() : ''
  const cep = /^\d{5}-?\d{3}$/.test(cepBruto) ? cepBruto.replace('-', '') : null
  if (!cep) erros.cep = 'Confira o CEP: são 8 números.'

  const logradouro = textoEntre(bruto.logradouro, 2, 120)
  if (!logradouro) erros.logradouro = 'Diga a rua, até 120 letras.'

  const numeroBruto = typeof bruto.numero === 'string' ? bruto.numero.trim() : ''
  const numero = /^[0-9A-Za-z][0-9A-Za-z /-]{0,9}$/.test(numeroBruto) ? numeroBruto : null
  if (!numero) erros.numero = 'Confira o número, como 412 ou S/N.'

  const complementoBruto = typeof bruto.complemento === 'string' ? limparTexto(bruto.complemento) : ''
  const complemento = complementoBruto === '' ? '' : textoEntre(complementoBruto, 1, 60)
  if (complemento === null) erros.complemento = 'O complemento cabe em 60 letras.'

  const bairro = textoEntre(bruto.bairro, 1, 60)
  if (!bairro) erros.bairro = 'Diga o bairro, até 60 letras.'

  const cidade = textoEntre(bruto.cidade, 2, 60)
  if (!cidade) erros.cidade = 'Diga a cidade, até 60 letras.'

  const uf = typeof bruto.uf === 'string' && UFS.includes(bruto.uf) ? bruto.uf : null
  if (!uf) erros.uf = 'Escolha o estado.'

  if (Object.keys(erros).length > 0) return { ok: false, erros }
  return {
    ok: true,
    valor: {
      apelido,
      cep: cep!,
      logradouro: logradouro!,
      numero: numero!,
      complemento: complemento ?? '',
      bairro: bairro!,
      cidade: cidade!,
      uf: uf!,
      principal: bruto.principal === 'on' || bruto.principal === true,
    },
  }
}

/** O numero do pedido no formato do banco (AMO- e 8 caracteres sem 0, 1, I, L, O), ou null. */
export function conferirNumeroDoPedido(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  return /^AMO-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(bruto) ? bruto : null
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
