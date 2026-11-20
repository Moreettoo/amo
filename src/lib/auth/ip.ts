import 'server-only'

/**
 * O IP de quem chamou, para o limite de tentativas. O primeiro item de
 * x-forwarded-for e o cliente quando a hospedagem sobrescreve o cabecalho
 * (conferir ao escolher a hospedagem, spec 18); em desenvolvimento ele e
 * falsificavel, e por isso todo limite por IP tem um irmao por e-mail.
 */
export function lerIp(cabecalhos: Headers): string {
  const encaminhado = cabecalhos.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = encaminhado || cabecalhos.get('x-real-ip')?.trim() || 'desconhecido'
  return ip.slice(0, 64)
}
