'use server'

import { obterUsuario } from '@/lib/auth'
import { gravarComentario } from '@/lib/dados/comentarios'
import { ErroDeRegra, registrarFalha } from '@/lib/dados/erros'
import { consumirLimite } from '@/lib/dados/limites'
import { normalizarComentario } from '@/lib/fechamento/tipos'

export type RespostaDoComentario =
  | { ok: true }
  | {
      ok: false
      erro: 'sem_sessao' | 'campos_invalidos' | 'comentario_nao_permitido' | 'muitas_tentativas' | 'tente_de_novo'
      campos?: Partial<Record<'nota' | 'texto', string>>
    }

const PRODUTO = /^[a-z0-9]+(-[a-z0-9]+)*$/
// a quebra de linha passa (a tabulacao ja virou espaco); os outros controles (e os C1), < e > nao
const PROIBIDO = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f<>]/

const MSG_NOTA = 'Escolha uma nota de 1 a 5.'
const MSG_TEXTO = 'Conte um pouco mais: de 10 a 1000 letras, sem < nem >.'

const CODIGOS_DO_BANCO: Record<string, 'campos_invalidos' | 'comentario_nao_permitido' | 'sem_sessao'> = {
  sem_sessao: 'sem_sessao',
  nota_invalida: 'campos_invalidos',
  texto_invalido: 'campos_invalidos',
  comentario_nao_permitido: 'comentario_nao_permitido',
}

/**
 * O comentario no servidor. Ordem: a sessao, cada campo conferido, o limite
 * (5 por dia por cliente), o banco, a traducao do codigo. Campo invalido nao
 * gasta limite; so quem recebeu o sabor comenta (o banco decide).
 */
export async function enviarComentario(entrada: unknown): Promise<RespostaDoComentario> {
  try {
    const usuario = await obterUsuario()
    if (!usuario) return { ok: false, erro: 'sem_sessao' }

    if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
      return { ok: false, erro: 'campos_invalidos' }
    }
    const { produto, nota, texto: bruto } = entrada as Record<string, unknown>
    if (typeof produto !== 'string' || produto.length > 80 || !PRODUTO.test(produto) || typeof bruto !== 'string') {
      return { ok: false, erro: 'campos_invalidos' }
    }
    const campos: { nota?: string; texto?: string } = {}
    if (typeof nota !== 'number' || !Number.isInteger(nota) || nota < 1 || nota > 5) campos.nota = MSG_NOTA
    const texto = bruto.length > 20_000 ? '' : normalizarComentario(bruto).trim()
    const letras = [...texto].length
    if (letras < 10 || letras > 1000 || PROIBIDO.test(texto)) campos.texto = MSG_TEXTO
    if (campos.nota || campos.texto) return { ok: false, erro: 'campos_invalidos', campos }

    if (!(await consumirLimite(`comentario:${usuario.id}`, 5, 86400))) return { ok: false, erro: 'muitas_tentativas' }

    await gravarComentario(produto, nota as number, texto)
    return { ok: true }
  } catch (erro) {
    if (erro instanceof ErroDeRegra && Object.hasOwn(CODIGOS_DO_BANCO, erro.codigo)) {
      const codigo = CODIGOS_DO_BANCO[erro.codigo]
      return codigo === 'campos_invalidos'
        ? { ok: false, erro: codigo, campos: erro.codigo === 'nota_invalida' ? { nota: MSG_NOTA } : { texto: MSG_TEXTO } }
        : { ok: false, erro: codigo }
    }
    if (!(erro instanceof ErroDeRegra)) registrarFalha('enviar_comentario', erro)
    return { ok: false, erro: 'tente_de_novo' }
  }
}
