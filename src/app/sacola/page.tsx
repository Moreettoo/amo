import { createHash } from 'node:crypto'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import { TelaSacola } from '@/components/layout/TelaSacola'
import type { DadosDaSacola } from '@/components/sacola/Fechamento'
import { obterUsuario } from '@/lib/auth'
import { chavePublicaDoMercadoPago, variavel } from '@/lib/dados/ambiente'
import { carregarCatalogo } from '@/lib/dados/catalogo'
import { lerEnderecos } from '@/lib/dados/enderecos'
import { registrarFalha } from '@/lib/dados/erros'
import { lerLoja } from '@/lib/dados/loja'
import { resumoDosHorarios, situacaoDaLoja, textoDaLoja } from '@/lib/loja'
import { linhasComProduto, montarGaveta } from '@/lib/visao'

export const metadata: Metadata = {
  title: 'Sacola · AMO',
  description: 'Os potes que você escolheu, a entrega pelo Uber e o fechamento do pedido.',
  robots: { index: false },
}

/** O endereco principal; se os enderecos nao vierem, a sacola abre sem ele. */
async function lerPrincipal(usuarioId: string) {
  try {
    return (await lerEnderecos(usuarioId)).find((e) => e.principal) ?? null
  } catch (erro) {
    registrarFalha('sacola_enderecos', erro)
    return null
  }
}

/** A marca da conta no progresso da aba: nao revela o id nem volta a ele. */
const marcaDaConta = (id: string) => createHash('sha256').update(id).digest('hex').slice(0, 16)

/** A cliente (com o endereco principal), a loja agora e as chaves publicas. */
async function lerDadosDaSacola(): Promise<DadosDaSacola> {
  const [usuario, loja, cabecalhos] = await Promise.all([obterUsuario(), lerLoja(), headers()])
  const principal = usuario ? await lerPrincipal(usuario.id) : null
  const situacao = situacaoDaLoja(loja.horarios, loja.pausada, new Date())
  return {
    usuario: usuario ? { nome: usuario.nome, celular: usuario.celular, email: usuario.email } : null,
    conta: usuario ? marcaDaConta(usuario.id) : null,
    enderecoPrincipal: principal ? { cep: principal.cep, numero: principal.numero, complemento: principal.complemento } : null,
    loja: { aberta: situacao.aberta, texto: textoDaLoja(situacao), horarios: resumoDosHorarios(loja.horarios) },
    porta: { chaveDoTurnstile: variavel('NEXT_PUBLIC_TURNSTILE_SITE_KEY'), nonce: cabecalhos.get('x-nonce') ?? '' },
    chavePublicaMp: chavePublicaDoMercadoPago(),
  }
}

/** A sacola e o fechamento do pedido. A sacola mora no navegador; a pagina
 *  traz a loja (nome, foto e preco de cada sabor) e o que o fechamento le no
 *  servidor (a cliente, a loja agora e as chaves publicas). */
export default async function PaginaSacola() {
  // a politica com nonce (proxy.ts) exige a pagina montada a cada visita
  await connection()
  const [catalogo, dados] = await Promise.all([carregarCatalogo(), lerDadosDaSacola()])
  return <TelaSacola gaveta={montarGaveta(catalogo)} linhas={linhasComProduto(catalogo)} dados={dados} />
}
