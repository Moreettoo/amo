// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const SCRIPT = resolve(import.meta.dirname, '../scripts/varrer-segredos.mjs')
const SEGREDO = 'segredo-da-porta-de-teste-123'
let pasta = ''

function montar(arquivos: Record<string, string>) {
  pasta = mkdtempSync(join(tmpdir(), 'varrer-'))
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(pasta, caminho)), { recursive: true })
    writeFileSync(join(pasta, caminho), conteudo)
  }
}

function varrer(env: Record<string, string> = {}) {
  const limpo = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/SUPABASE|MERCADOPAGO|TAREFAS/.test(k)))
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: pasta, env: { ...limpo, ...env } as NodeJS.ProcessEnv, encoding: 'utf8' })
  return { codigo: r.status, saida: r.stdout + r.stderr }
}

afterEach(() => rmSync(pasta, { recursive: true, force: true }))

describe('varrer-segredos', () => {
  it('sem achado, sai com 0', () => {
    montar({ '.env.local': `SUPABASE_PORTA=${SEGREDO}\n`, '.next/static/a.js': 'ok', '.next/server/app/index.html': '<p>ok</p>' })
    expect(varrer().codigo).toBe(0)
  })
  it('pega o segredo no HTML pre-renderizado, sem imprimir o valor', () => {
    montar({ '.env.local': `SUPABASE_PORTA=${SEGREDO}\n`, '.next/static/a.js': 'ok', '.next/server/app/index.html': `<p>${SEGREDO}</p>` })
    const r = varrer()
    expect(r.codigo).toBe(1)
    expect(r.saida).toMatch(/index\.html: SUPABASE_PORTA/)
    expect(r.saida).not.toContain(SEGREDO)
  })
  it('pega o segredo no RSC, com o valor vindo do ambiente (sem .env.local, como na hospedagem)', () => {
    montar({ '.next/static/a.js': 'ok', '.next/server/app/catalogo.rsc': `x${SEGREDO}x` })
    const r = varrer({ SUPABASE_PORTA: SEGREDO })
    expect(r.codigo).toBe(1)
    expect(r.saida).toMatch(/catalogo\.rsc: SUPABASE_PORTA/)
  })
  it('o JS de servidor pode conter o nome do cabecalho da porta', () => {
    montar({ '.env.local': `SUPABASE_PORTA=${SEGREDO}\n`, '.next/static/a.js': 'ok', '.next/server/app/page.js': 'headers["x-amo-porta"]' })
    expect(varrer().codigo).toBe(0)
  })
  it('sem nenhum valor de segredo para procurar, falha em vez de dizer que esta limpo', () => {
    montar({ '.next/static/a.js': 'ok' })
    const r = varrer()
    expect(r.codigo).toBe(1)
    expect(r.saida).toMatch(/Nenhum segredo de servidor para procurar/)
  })
  it('a chave publica do Mercado Pago, que vai ao navegador, nao dispara', () => {
    montar({ '.env.local': `SUPABASE_PORTA=${SEGREDO}
`, '.next/static/a.js': 'APP_USR-6b0d5c4a-1f2e-4d3c-9b8a-7f6e5d4c3b2a' })
    expect(varrer().codigo).toBe(0)
  })
  it.each(['APP_USR', 'TEST'])('o token do Mercado Pago (%s) dispara, sem imprimir o valor', (prefixo) => {
    const token = `${prefixo}-1234567890123456-112118-0123456789abcdef0123456789abcdef-123456789`
    montar({ '.env.local': `SUPABASE_PORTA=${SEGREDO}
`, '.next/static/a.js': `x ${token} x` })
    const r = varrer()
    expect(r.codigo).toBe(1)
    expect(r.saida).toMatch(/a\.js: token do Mercado Pago/)
    expect(r.saida).not.toContain(token)
  })
})
