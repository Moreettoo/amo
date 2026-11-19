// Testa a porta do banco (spec 2026-11-18-amo-backend-design.md, regra 6 e
// 14.0) com chamadas HTTP de verdade a API de dados do Supabase.
//
//   node scripts/testar-porta.mjs
//
// Le NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e
// SUPABASE_PORTA do .env.local. Nunca imprime o segredo. Sai com codigo 1 se
// alguma verificacao falhar.

import { readFileSync } from 'node:fs'

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

async function chamar(caminho, { metodo = 'GET', corpo, segredo } = {}) {
  const cabecalhos = { apikey: chave, 'content-type': 'application/json' }
  if (segredo !== undefined) cabecalhos['x-amo-porta'] = segredo
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

console.log(`\n${verificacoes.length - falhas} de ${verificacoes.length} passaram`)
process.exit(falhas ? 1 : 0)
