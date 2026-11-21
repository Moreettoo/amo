// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderToReadableStream } from 'react-dom/server'

/**
 * Sem JavaScript, os formularios de Minha conta enviam pelo proprio navegador.
 * O servidor so escreve esse envio (action, method POST e os campos $ACTION_)
 * quando o useActionState recebe a referencia da acao de servidor, que traz
 * $$FORM_ACTION. Com uma funcao do cliente em volta da acao, ele escreve
 * action="javascript:throw ..." e o botao nao faz nada (revisao final de
 * 2026-11-21: as novidades e o endereco novo).
 *
 * As referencias daqui sao as de verdade: o Next cria a de um arquivo
 * 'use client' que importa uma acao com o createServerReference do cliente do
 * React Server DOM que vem com ele. renderToString nao serve: a referencia com
 * o estado ligado (o bind do useActionState) se codifica de forma assincrona,
 * e so a renderizacao em fluxo espera por ela, como a do Next.
 */

vi.mock('@/app/conta/acoes', async () => {
  const { createRequire } = await import('node:module')
  const { createServerReference } = createRequire(import.meta.url)('next/dist/compiled/react-server-dom-turbopack/client.node.js') as {
    createServerReference: (id: string) => () => Promise<unknown>
  }
  const acoes = ['salvarPerfil', 'definirMarketing', 'salvarEndereco', 'removerEndereco', 'tornarPrincipal', 'consultarCep', 'trocarSenha', 'trocarEmail', 'cancelarPedido']
  return Object.fromEntries(acoes.map((nome) => [nome, createServerReference(`acao-${nome}`)]))
})
vi.mock('@/components/conta/Turnstile', () => ({ Turnstile: () => null }))

const { CancelarPedido, FormEmail, FormNovidades, FormPerfil, ItemDeEndereco, NovoEndereco } = await import('@/components/conta/FormsDaConta')

async function noServidor(arvore: ReactNode): Promise<string> {
  const fluxo = await renderToReadableStream(arvore)
  await fluxo.allReady
  return new Response(fluxo).text()
}

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

// o que o servidor escreve e, para cada formulario, a acao que ele chama
const CASOS: [string, ReactNode, string[]][] = [
  ['as novidades: retirar o aceite segue facil', <FormNovidades key="n" aceita />, ['definirMarketing']],
  ['o endereco novo, que sem JavaScript nasce aberto', <NovoEndereco key="e" primeiro={false} cheio={false} />, ['salvarEndereco']],
  ['o primeiro endereco', <NovoEndereco key="p" primeiro cheio={false} />, ['salvarEndereco']],
  ['os seus dados', <FormPerfil key="d" nome="Mariana Costa" celular="11987654321" />, ['salvarPerfil']],
  ['o e-mail novo', <FormEmail key="m" email="mariana@exemplo.com.br" />, ['trocarEmail']],
  ['tornar principal e remover o endereco', <ItemDeEndereco key="i" id="00000000-0000-4000-8000-000000000001" endereco={endereco} texto="Rua Cuiabá, 412" nome="Casa" />, ['tornarPrincipal', 'removerEndereco']],
  ['cancelar o pedido', <CancelarPedido key="c" numero="AMO-7K2M9QXR" />, ['cancelarPedido']],
]

describe('sem JavaScript, o formulario envia pelo navegador', () => {
  it.each(CASOS)('%s', async (_, arvore, acoes) => {
    const html = await noServidor(arvore)
    expect(html).not.toContain('javascript:')
    const formularios = html.match(/<form\b[^>]*>/g) ?? []
    expect(formularios).toHaveLength(acoes.length)
    for (const form of formularios) {
      expect(form).toContain('action=""')
      expect(form).toContain('method="POST"')
      expect(form).toMatch(/enctype="multipart\/form-data"/i)
    }
    // cada formulario leva a referencia da acao e a chave do estado, com que o servidor responde no lugar
    expect(html.match(/name="\$ACTION_REF_[^"]*"/g)).toHaveLength(acoes.length)
    expect(html.match(/name="\$ACTION_KEY"/g)).toHaveLength(acoes.length)
    for (const acao of acoes) expect(html).toContain(`acao-${acao}`)
  })
})
