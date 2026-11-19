'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { GavetaModal } from '@/components/ui/GavetaModal'
import { Quantidade } from '@/components/ui/Quantidade'
import { useSacola } from '@/components/ui/useSacola'
import { formatarPreco } from '@/lib/produto'
import {
  CAMINHO_SACOLA,
  contarPotes,
  definirQuantidade,
  somarLinhas,
  textoPotes,
  tirarDaSacola,
  type ItemDaLoja,
} from '@/lib/sacola'
import { CAMINHO_CATALOGO } from '@/lib/visao'

const ordem = (i: number) => ({ '--i': i }) as CSSProperties

type Props = {
  id: string
  loja: readonly ItemDaLoja[]
  aberta: boolean
  aoFechar: (devolverFoco: boolean) => void
}

/**
 * A gaveta da sacola: o espelho da do catalogo, vindo da direita. Abre pelo
 * botao Sacola da nav e quando um pote entra na sacola. Mostra os potes, o
 * subtotal e o caminho para fechar o pedido; a entrega e os dados ficam na
 * pagina /sacola.
 */
export function GavetaSacola({ id, loja, aberta, aoFechar }: Props) {
  const linhas = useSacola(loja) ?? []
  const potes = contarPotes(linhas)

  return (
    <GavetaModal id={id} titulo="Sacola" rotuloFechar="Fechar a sacola" lado="direita" aberta={aberta} aoFechar={aoFechar}>
      {linhas.length === 0 ? (
        <div className="sacola-gaveta__vazia gaveta__item">
          <p>Sua sacola está vazia. Os sabores estão no catálogo, um pote de cada vez.</p>
          <BotaoRetro href={CAMINHO_CATALOGO} escuro>
            Ver o catálogo
          </BotaoRetro>
        </div>
      ) : (
        <>
          <p className="gaveta__frase">{textoPotes(potes)} esperando por você.</p>
          <ul className="sacola-gaveta__itens" aria-label="Potes na sacola">
            {linhas.map((l, i) => (
              <li key={l.slug} className="sacola-gaveta__item gaveta__item" style={ordem(i)}>
                <Image src={l.imagem.src} alt="" width={l.imagem.largura} height={l.imagem.altura} sizes="56px" />
                <div className="sacola-gaveta__texto">
                  <p className="sacola-gaveta__nome">
                    <a href={`${CAMINHO_CATALOGO}/${l.slug}`}>{l.nome}</a>
                    <b>{formatarPreco(l.total)}</b>
                  </p>
                  <div className="sacola-gaveta__acoes">
                    <Quantidade valor={l.quantos} de={l.nome} compacta aoMudar={(n) => definirQuantidade(l.slug, n)} />
                    <button type="button" className="sacola__tirar" aria-label={`Tirar ${l.nome} da sacola`} onClick={() => tirarDaSacola(l.slug)}>
                      Tirar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="sacola-gaveta__pe gaveta__item" style={ordem(linhas.length)}>
            <p className="sacola-gaveta__subtotal">
              <span>Subtotal</span>
              <b>{formatarPreco(somarLinhas(linhas))}</b>
            </p>
            <p className="sacola-gaveta__nota">A entrega pelo Uber é calculada no próximo passo.</p>
            <BotaoRetro href={CAMINHO_SACOLA} escuro className="sacola-gaveta__fechar-pedido">
              Ver sacola e fechar o pedido
            </BotaoRetro>
            <button type="button" className="sacola-gaveta__continuar" data-fecha-gaveta>
              Continuar escolhendo
            </button>
          </div>
        </>
      )}
    </GavetaModal>
  )
}
