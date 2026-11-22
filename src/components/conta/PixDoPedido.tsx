'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { pagarComPix } from '@/app/sacola/acoes'
import { EsperaDoPagamento } from '@/components/sacola/EsperaDoPagamento'
import { PainelDoPix } from '@/components/sacola/PainelDoPix'
import type { CodigoDoFechamento, SituacaoDoPedido } from '@/lib/fechamento/tipos'

type Pix = NonNullable<NonNullable<SituacaoDoPedido['pagamento']>['pix']>

/**
 * O Pix do pedido que ainda espera, em Minha conta: o mesmo painel e a mesma
 * espera do fechamento. O codigo vem do servidor (a pagina o leu); quando a
 * espera ve o pedido sair de aguardando, a pagina e lida de novo.
 */
export function PixDoPedido({ numero, pix }: { numero: string; pix: Pix }) {
  const router = useRouter()
  const [situacao, setSituacao] = useState<SituacaoDoPedido>({
    numero,
    estado: 'aguardando_pagamento',
    pagamento: { forma: 'pix', estado: 'pendente', recusa: null, pix, desafioUrl: null },
  })
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<CodigoDoFechamento | null>(null)

  function mudou(s: SituacaoDoPedido) {
    setSituacao(s)
    if (s.estado !== 'aguardando_pagamento') router.refresh()
  }

  async function gerarOutro() {
    if (gerando) return
    setGerando(true)
    setErro(null)
    let r: Awaited<ReturnType<typeof pagarComPix>>
    try {
      r = await pagarComPix({ numero })
    } catch {
      r = { ok: false, erro: 'tente_de_novo' }
    }
    setGerando(false)
    if (r.ok) mudou(r.situacao)
    else setErro(r.erro)
  }

  return (
    <div className="pedido__pix">
      <PainelDoPix
        pix={situacao.pagamento?.pix ?? null}
        aoGerarOutro={() => void gerarOutro()}
        recusado={situacao.pagamento?.estado === 'recusado'}
        gerando={gerando}
        erro={erro}
      />
      <EsperaDoPagamento numero={numero} inicial={situacao} aoMudar={mudou} textoAoParar="Paramos de conferir sozinhos. Atualize a página para conferir." />
    </div>
  )
}
