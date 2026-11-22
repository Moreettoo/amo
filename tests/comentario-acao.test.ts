// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HOSTIS } from './fixtures/hostis'

const m = vi.hoisted(() => ({
  obterUsuario: vi.fn(),
  consumirLimite: vi.fn(),
  gravarComentario: vi.fn(),
  registrarFalha: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({ obterUsuario: m.obterUsuario }))
vi.mock('@/lib/dados/limites', () => ({ consumirLimite: m.consumirLimite }))
vi.mock('@/lib/dados/comentarios', () => ({ gravarComentario: m.gravarComentario }))
vi.mock('@/lib/dados/erros', async () => {
  class ErroDeRegra extends Error {
    readonly codigo: string
    constructor(codigo: string) {
      super(codigo)
      this.codigo = codigo
    }
  }
  return { ErroDeRegra, registrarFalha: m.registrarFalha }
})

import { enviarComentario } from '@/app/catalogo/acoes'
import { ErroDeRegra } from '@/lib/dados/erros'

const TEXTO = 'Muito bom, voltarei a pedir.'
const ok = { produto: 'prestigio', nota: 5, texto: TEXTO }
const MSG_NOTA = 'Escolha uma nota de 1 a 5.'
const MSG_TEXTO = 'Conte um pouco mais: de 10 a 1000 letras, sem < nem >.'

beforeEach(() => {
  m.obterUsuario.mockReset().mockResolvedValue({ id: 'u1' })
  m.consumirLimite.mockReset().mockResolvedValue(true)
  m.gravarComentario.mockReset().mockResolvedValue(undefined)
  m.registrarFalha.mockReset()
})

describe('a ordem', () => {
  it('deslogada nao chama nada', async () => {
    m.obterUsuario.mockResolvedValue(null)
    expect(await enviarComentario(ok)).toEqual({ ok: false, erro: 'sem_sessao' })
    expect(m.consumirLimite).not.toHaveBeenCalled()
    expect(m.gravarComentario).not.toHaveBeenCalled()
  })

  it('campo errado nao gasta limite', async () => {
    expect(await enviarComentario({ ...ok, nota: 0 })).toMatchObject({ ok: false, erro: 'campos_invalidos' })
    expect(m.consumirLimite).not.toHaveBeenCalled()
    expect(m.gravarComentario).not.toHaveBeenCalled()
  })

  it('limite 5 por dia por cliente; estourado nao grava', async () => {
    m.consumirLimite.mockResolvedValue(false)
    expect(await enviarComentario(ok)).toEqual({ ok: false, erro: 'muitas_tentativas' })
    expect(m.consumirLimite).toHaveBeenCalledWith('comentario:u1', 5, 86400)
    expect(m.gravarComentario).not.toHaveBeenCalled()
  })

  it('grava com produto, nota e texto aparado', async () => {
    expect(await enviarComentario({ ...ok, texto: `  ${TEXTO}\n` })).toEqual({ ok: true })
    expect(m.gravarComentario).toHaveBeenCalledWith('prestigio', 5, TEXTO)
  })
})

describe('campos', () => {
  it('entrada que nao e objeto, produto fora do slug', async () => {
    for (const x of [null, undefined, 'x', 3, [], { ...ok, produto: 'A b' }, { ...ok, produto: 1 }, { ...ok, texto: 1 }]) {
      expect(await enviarComentario(x)).toMatchObject({ ok: false, erro: 'campos_invalidos' })
    }
    expect(m.gravarComentario).not.toHaveBeenCalled()
  })

  it.each([0, 6, 2.5, '5', null, NaN])('nota %j recusada', async (nota) => {
    expect(await enviarComentario({ ...ok, nota })).toEqual({ ok: false, erro: 'campos_invalidos', campos: { nota: MSG_NOTA } })
  })

  it('o texto: 10 a 1000, sem < > nem controle alem da quebra', async () => {
    for (const texto of ['curto', 'a'.repeat(1001), 'bom <b>demais</b>', 'bom demais >', 'bom\u0000demais', 'bom\u007fdemais!', 'bom\u009fdemais!', '😀'.repeat(1001), '😀'.repeat(9), 'bom\rdemais!', 'bom\u0085demais!', 'bom\tdemais!', '          ']) {
      expect(await enviarComentario({ ...ok, texto })).toEqual({ ok: false, erro: 'campos_invalidos', campos: { texto: MSG_TEXTO } })
    }
    expect((await enviarComentario({ ...ok, texto: 'a'.repeat(1000) })).ok).toBe(true)
    expect((await enviarComentario({ ...ok, texto: 'linha um\nlinha dois' })).ok).toBe(true)
    expect((await enviarComentario({ ...ok, texto: '😀'.repeat(1000) })).ok).toBe(true)
    expect((await enviarComentario({ ...ok, texto: '😀'.repeat(10) })).ok).toBe(true)
    m.gravarComentario.mockClear()
    expect((await enviarComentario({ ...ok, texto: 'linha um\r\nlinha dois' })).ok).toBe(true)
    expect(m.gravarComentario).toHaveBeenCalledWith('prestigio', 5, 'linha um\nlinha dois')
  })

  it.each(HOSTIS.map((h) => [h.slice(0, 24), h]))('texto hostil %j: recusa ou ao pe da letra, nunca excecao', async (_, hostil) => {
    const r = await enviarComentario({ ...ok, texto: hostil })
    if (r.ok) expect(m.gravarComentario).toHaveBeenCalledWith('prestigio', 5, hostil.trim())
    else expect(r.erro).toBe('campos_invalidos')
  })
})

describe('o banco', () => {
  it.each([
    ['sem_sessao', { ok: false, erro: 'sem_sessao' }],
    ['comentario_nao_permitido', { ok: false, erro: 'comentario_nao_permitido' }],
    ['nota_invalida', { ok: false, erro: 'campos_invalidos', campos: { nota: MSG_NOTA } }],
    ['texto_invalido', { ok: false, erro: 'campos_invalidos', campos: { texto: MSG_TEXTO } }],
  ])('%s', async (codigo, esperado) => {
    m.gravarComentario.mockRejectedValue(new ErroDeRegra(codigo))
    expect(await enviarComentario(ok)).toEqual(esperado)
  })

  it('codigo desconhecido e falha solta viram tente_de_novo', async () => {
    m.gravarComentario.mockRejectedValue(new ErroDeRegra('constructor'))
    expect(await enviarComentario(ok)).toEqual({ ok: false, erro: 'tente_de_novo' })
    m.gravarComentario.mockRejectedValue(new Error('x'))
    expect(await enviarComentario(ok)).toEqual({ ok: false, erro: 'tente_de_novo' })
    expect(m.registrarFalha).toHaveBeenCalledTimes(1)
  })
})
