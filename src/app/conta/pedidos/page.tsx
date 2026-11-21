import type { Metadata } from 'next'
import { CabecaDaConta, PainelDaConta, lerDadosDoPainel } from '@/components/conta/PainelDaConta'
import { ListaDePedidos } from '@/components/conta/PecasDoPedido'
import { exigirUsuario } from '@/lib/auth'
import { lerPedidos } from '@/lib/dados/pedidos'
import { CAMINHO_CATALOGO } from '@/lib/visao'

export const metadata: Metadata = { title: 'Pedidos · AMO', robots: { index: false } }

export default async function PaginaDosPedidos() {
  const usuario = await exigirUsuario('/conta/pedidos')
  const [dados, pedidos] = await Promise.all([lerDadosDoPainel(usuario.id), lerPedidos(usuario.id)])

  return (
    <PainelDaConta atual="pedidos" usuario={usuario} dados={dados}>
      <CabecaDaConta titulo="Pedidos" frase="até aqui" lado={pedidos.length > 0 ? <p>Do mais novo ao mais antigo.</p> : undefined} />
      {pedidos.length > 0 ? (
        <ListaDePedidos pedidos={pedidos} />
      ) : (
        <>
          <p className="painel__lead">Você ainda não fez nenhum pedido. Os sabores estão no catálogo.</p>
          <p className="painel__mais">
            <a className="btn-retro btn-retro--escuro" href={CAMINHO_CATALOGO}>
              Ver o catálogo
            </a>
          </p>
        </>
      )}
    </PainelDaConta>
  )
}
