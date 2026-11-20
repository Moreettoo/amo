// A exclusao de conta pelo caminho do Supabase Auth (spec do backend, 12 e
// 14, teste 6): o que os testes SQL so provam como postgres, aqui passa pela
// API do Auth com a chave secreta, como o site faz.
//
//   node scripts/testar-exclusao.mjs              cria uma cliente de ensaio e imprime o id
//   node scripts/testar-exclusao.mjs --apagar <id>   apaga essa cliente pelo Auth
//
// Entre um e outro, o banco recebe pelo MCP o que a cliente teria (pedido,
// comentario, endereco), e depois o MCP confere o que sobrou: o roteiro esta
// em supabase/README.md. Le NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e
// SUPABASE_PORTA do .env.local; nunca imprime segredo. Sai com 1 se falhar.

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
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY || !env.SUPABASE_PORTA) {
  console.error('Faltam variaveis no .env.local (URL, SUPABASE_SECRET_KEY ou SUPABASE_PORTA).')
  process.exit(1)
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-amo-porta': env.SUPABASE_PORTA } },
})

const [opcao, id] = process.argv.slice(2)

if (opcao === '--apagar') {
  if (!/^[0-9a-f-]{36}$/.test(id ?? '')) {
    console.error('uso: node scripts/testar-exclusao.mjs --apagar <id>')
    process.exit(1)
  }
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    console.log(`o Auth recusou a exclusao: ${error.code ?? error.status}`)
    process.exit(1)
  }
  console.log('apagada pelo Auth')
} else {
  const email = `ensaio-${crypto.randomUUID().slice(0, 8)}@amo-ensaio.dev`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome: 'Cliente Ensaio', celular: '11987654321', aceite_termos: true, versao_termos: '2026-11-18', aceite_marketing: false },
  })
  if (error) {
    console.log(`createUser: ${error.code}`)
    process.exit(1)
  }
  console.log(data.user.id)
}
