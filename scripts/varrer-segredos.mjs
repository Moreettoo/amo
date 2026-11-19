// Varre o que vai para o navegador (.next/static) atras de segredo (spec 14,
// "Varredura de segredo"). Roda depois do build:
//
//   npm run build && npm run varrer
//
// Procura o valor de cada variavel de servidor do .env.local (as que nao
// comecam com NEXT_PUBLIC_ e tem 8 caracteres ou mais) e as marcas
// sb_secret_, x-amo-porta e APP_USR-. Cada achado sai como arquivo e nome da
// regra, nunca o valor. Sai com codigo 1 se achar algo.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = '.next/static'

if (!existsSync(RAIZ)) {
  console.error('Rode npm run build antes.')
  process.exit(1)
}

const regras = []
if (existsSync('.env.local')) {
  for (const linha of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m || m[1].startsWith('NEXT_PUBLIC_')) continue
    const valor = m[2].trim()
    if (valor.length >= 8) regras.push({ nome: m[1], texto: valor })
  }
}
for (const marca of ['sb_secret_', 'x-amo-porta', 'APP_USR-']) regras.push({ nome: marca, texto: marca })

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

const lidos = arquivos(RAIZ)
const achados = []
for (const arquivo of lidos) {
  const conteudo = readFileSync(arquivo, 'latin1')
  for (const regra of regras) {
    if (conteudo.includes(regra.texto)) achados.push(`${relative('.', arquivo)}: ${regra.nome}`)
  }
}

if (achados.length > 0) {
  console.error(`Segredo no que vai ao navegador (${achados.length}):`)
  for (const achado of achados) console.error(`  ${achado}`)
  process.exit(1)
}
console.log(`Nenhum segredo em ${lidos.length} arquivos de ${RAIZ} (${regras.length} regras).`)
