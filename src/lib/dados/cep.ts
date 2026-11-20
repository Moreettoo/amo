import 'server-only'
import { UFS } from '@/lib/conta/regras'

/**
 * O endereco a partir do CEP, pelo ViaCEP, chamado pelo servidor: so o CEP
 * sai daqui. O que volta e conferido como entrada de fora: aparado, sem
 * caractere de controle nem < >, cortado no maximo do banco.
 */

export type EnderecoDoCep = { logradouro: string; bairro: string; cidade: string; uf: string }

const limpar = (valor: unknown, maximo: number) =>
  typeof valor === 'string'
    ? valor
        .replace(/[\u0000-\u001f\u007f<>]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, maximo)
        .trim()
    : ''

/** null quando o CEP nao existe, o servico falhou ou demorou mais de 3 segundos. */
export async function buscarCep(cep: string): Promise<EnderecoDoCep | null> {
  if (!/^[0-9]{8}$/.test(cep)) return null
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    if (!resposta.ok) return null
    const corpo: unknown = await resposta.json()
    if (typeof corpo !== 'object' || corpo === null || 'erro' in corpo) return null
    const campos = corpo as Record<string, unknown>
    const cidade = limpar(campos.localidade, 60)
    const uf = typeof campos.uf === 'string' && UFS.includes(campos.uf) ? campos.uf : null
    if (!uf || cidade.length < 2) return null
    return { logradouro: limpar(campos.logradouro, 120), bairro: limpar(campos.bairro, 60), cidade, uf }
  } catch {
    return null
  }
}
