import 'server-only'
import { redirect } from 'next/navigation'
import { PortaDaConta } from '@/components/conta/PortaDaConta'
import { TelaConta, lerDadosDaTela } from '@/components/conta/TelaConta'
import { obterUsuario } from '@/lib/auth'
import { voltaSegura } from '@/lib/auth/volta'

type Busca = Record<string, string | string[] | undefined>

/**
 * /entrar e /cadastro: a mesma porta, cada uma nascendo na sua aba. Ja logada,
 * vai direto ao destino. Funcao que a pagina aguarda (nao um componente), para
 * o redirecionamento sair da propria pagina.
 */
export async function paginaDaPorta(aba: 'entrar' | 'cadastro', busca: Busca) {
  const volta = voltaSegura(busca.volta)
  if (await obterUsuario()) redirect(volta)
  const { gaveta, linhas, nonce, chaveDoTurnstile } = await lerDadosDaTela()
  return (
    <TelaConta gaveta={gaveta} linhas={linhas} titulo="Que bom" frase="ter você aqui">
      <PortaDaConta aba={aba} volta={volta} chaveDoTurnstile={chaveDoTurnstile} nonce={nonce} />
    </TelaConta>
  )
}
