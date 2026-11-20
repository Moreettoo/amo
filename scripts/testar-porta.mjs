// Testa a porta do banco (spec 2026-11-18-amo-backend-design.md, regra 6 e
// 14.0) com chamadas HTTP de verdade a API de dados do Supabase.
//
//   node scripts/testar-porta.mjs
//
// Le NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e
// SUPABASE_PORTA do .env.local. Nunca imprime o segredo. Sai com codigo 1 se
// alguma verificacao falhar.
//
// Com SUPABASE_SECRET_KEY no .env.local, testa tambem a porta com o token de
// uma cliente de verdade (etapa 2): cria uma cliente de ensaio, pega o token
// dela pelo link magico do admin (sem senha nem CAPTCHA) e le os perfis com
// e sem o segredo. Apaga a cliente no fim. Nunca imprime o token.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function lerEnv(caminho) {
  const env = {}
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

const env = lerEnv('.env.local')
const url = env.NEXT_PUBLIC_SUPABASE_URL
const chave = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const porta = env.SUPABASE_PORTA

if (!url || !chave || !porta) {
  console.error('Faltam variaveis no .env.local (URL, chave publicavel ou SUPABASE_PORTA).')
  process.exit(1)
}

async function chamar(caminho, { metodo = 'GET', corpo, segredo, token } = {}) {
  const cabecalhos = { apikey: chave, 'content-type': 'application/json' }
  if (segredo !== undefined) cabecalhos['x-amo-porta'] = segredo
  if (token) cabecalhos.authorization = `Bearer ${token}`
  const resposta = await fetch(`${url}/rest/v1/${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  let json = null
  try {
    json = await resposta.json()
  } catch {
    // corpo vazio ou nao JSON
  }
  return { status: resposta.status, json }
}

const barradaPelaPorta = (r) => r.status === 401 && r.json?.code === 'AMO401'

const verificacoes = [
  ['visitante sem o segredo nao le o catalogo', async () => barradaPelaPorta(await chamar('produtos?select=slug&limit=1'))],
  ['segredo errado nao le o catalogo', async () =>
    barradaPelaPorta(await chamar('produtos?select=slug&limit=1', { segredo: 'segredo-errado' }))],
  ['segredo vazio nao le o catalogo', async () =>
    barradaPelaPorta(await chamar('produtos?select=slug&limit=1', { segredo: '' }))],
  ['sem o segredo nao chama funcao', async () =>
    barradaPelaPorta(await chamar('rpc/pode_excluir_conta', { metodo: 'POST', corpo: {} }))],
  ['sem o segredo nao tenta escrever', async () =>
    barradaPelaPorta(await chamar('categorias', { metodo: 'POST', corpo: { slug: 'x', nome: 'X', ordem: 9 } }))],
  ['com o segredo o visitante le o catalogo', async () => {
    const r = await chamar('produtos?select=slug&limit=1', { segredo: porta })
    return r.status === 200 && Array.isArray(r.json) && r.json.length === 1
  }],
  ['com o segredo o visitante continua sem ler perfis', async () => {
    const r = await chamar('perfis?select=id&limit=1', { segredo: porta })
    return r.status === 401 || r.status === 403
  }],
]

// a cliente de ensaio, criada pela chave secreta; o token fica so na memoria
const cliente = { id: null, token: null }
async function abrirCliente() {
  const admin = createClient(url, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-amo-porta': porta } },
  })
  const email = `ensaio-${crypto.randomUUID().slice(0, 8)}@amo-ensaio.dev`
  const criada = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome: 'Cliente Ensaio', celular: '11987654321', aceite_termos: true, versao_termos: '2026-11-18', aceite_marketing: false },
  })
  if (criada.error) throw new Error(`createUser: ${criada.error.code}`)
  cliente.id = criada.data.user.id
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (link.error) throw new Error(`generateLink: ${link.error.code}`)
  const comum = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
  const sessao = await comum.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' })
  if (sessao.error) throw new Error(`verifyOtp: ${sessao.error.code}`)
  cliente.token = sessao.data.session.access_token
  return admin
}

let admin = null
if (env.SUPABASE_SECRET_KEY) {
  verificacoes.push(
    ['a cliente com o token, sem o segredo, nao le o proprio perfil', async () => {
      admin ??= await abrirCliente()
      return barradaPelaPorta(await chamar('perfis?select=nome', { token: cliente.token }))
    }],
    ['a cliente com o token e o segredo le uma linha so, a dela', async () => {
      admin ??= await abrirCliente()
      const r = await chamar('perfis?select=id,nome', { token: cliente.token, segredo: porta })
      return r.status === 200 && Array.isArray(r.json) && r.json.length === 1 && r.json[0].id === cliente.id
    }],
  )
} else {
  console.log('(sem SUPABASE_SECRET_KEY: a porta com o token de uma cliente fica de fora)')
}

let falhas = 0
for (const [nome, verificar] of verificacoes) {
  let ok = false
  try {
    ok = await verificar()
  } catch (erro) {
    console.log(`FALHA ${nome}: ${erro.message}`)
    falhas++
    continue
  }
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}`)
  if (!ok) falhas++
}

if (admin && cliente.id) {
  const { error } = await admin.auth.admin.deleteUser(cliente.id)
  if (error) {
    console.log(`FALHA apagar a cliente de ensaio: ${error.code}`)
    falhas++
  }
}

console.log(`\n${verificacoes.length - falhas} de ${verificacoes.length} passaram`)
process.exit(falhas ? 1 : 0)
