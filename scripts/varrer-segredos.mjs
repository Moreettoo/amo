// Varre o que o site entrega atras de segredo de servidor (spec 14,
// "Varredura de segredo"). Roda sozinho depois do build (postbuild) e pode ser
// chamado a mao:
//
//   npm run build        (ja chama a varredura no fim)
//   npm run varrer
//
// Onde procura:
//   .next/static, inteiro (o JS e o CSS que vao ao navegador);
//   .next/server/app, so as paginas prontas (.html, .rsc, .body, .meta): e ai
//   que cai um segredo que um Server Component passe para a pagina. O JS de
//   servidor fica de fora, porque ele contem, com razao, o nome do cabecalho
//   da porta.
//
// O que procura: o valor de cada variavel de servidor (as da spec 13 e as do
// .env.local que nao comecam com NEXT_PUBLIC_), lido do ambiente e do
// .env.local, com 8 caracteres ou mais; e as marcas sb_secret_, x-amo-porta e APP_USR-.
// Cada achado sai como arquivo e nome da regra, nunca o valor. Sai com codigo
// 1 se achar algo, ou se nao houver nenhum valor de segredo para procurar
// (uma varredura sem o que procurar nao prova nada).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const DO_NAVEGADOR = '.next/static'
const PAGINAS_PRONTAS = '.next/server/app'
const EXTENSOES_DE_PAGINA = /\.(html|rsc|body|meta)$/

const VARIAVEIS_DE_SERVIDOR = [
  'SUPABASE_PORTA',
  'SUPABASE_SECRET_KEY',
  'TAREFAS_SEGREDO',
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_WEBHOOK_SECRET',
]

if (!existsSync(DO_NAVEGADOR)) {
  console.error('Rode npm run build antes.')
  process.exit(1)
}

const valores = new Map()
for (const nome of VARIAVEIS_DE_SERVIDOR) {
  if (process.env[nome]) valores.set(nome, process.env[nome].trim())
}
if (existsSync('.env.local')) {
  for (const linha of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !m[1].startsWith('NEXT_PUBLIC_') && !valores.has(m[1])) valores.set(m[1], m[2].trim())
  }
}

const regras = [...valores].filter(([, valor]) => valor.length >= 8).map(([nome, texto]) => ({ nome, texto }))
if (regras.length === 0) {
  console.error('Nenhum segredo de servidor para procurar: confira o ambiente ou o .env.local.')
  process.exit(1)
}
for (const marca of ['sb_secret_', 'x-amo-porta', 'APP_USR-']) regras.push({ nome: marca, texto: marca })

function arquivos(dir, filtro = () => true) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho, filtro) : filtro(caminho) ? [caminho] : []
  })
}

const lidos = [...arquivos(DO_NAVEGADOR), ...arquivos(PAGINAS_PRONTAS, (c) => EXTENSOES_DE_PAGINA.test(c))]
const achados = []
for (const arquivo of lidos) {
  const conteudo = readFileSync(arquivo, 'latin1')
  for (const regra of regras) {
    if (conteudo.includes(regra.texto)) achados.push(`${relative('.', arquivo)}: ${regra.nome}`)
  }
}

if (achados.length > 0) {
  console.error(`Segredo no que o site entrega (${achados.length}):`)
  for (const achado of achados) console.error(`  ${achado}`)
  process.exit(1)
}
console.log(`Nenhum segredo em ${lidos.length} arquivos (${regras.length} regras).`)
