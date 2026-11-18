import type { ReactNode } from 'react'
import type { Formato } from '@/lib/catalogo'

const CONHECIDOS = ['pote', 'inteiro', 'unidade'] as const
type Conhecido = (typeof CONHECIDOS)[number]

/** O formato que o site sabe desenhar; qualquer outro cai na moldura neutra. */
export function classeDoFormato(formato: Formato): Conhecido | 'neutra' {
  return (CONHECIDOS as readonly string[]).includes(formato) ? (formato as Conhecido) : 'neutra'
}

type Props = {
  formato: Formato
  nome: string
  children: ReactNode
}

/**
 * A moldura vem da embalagem: arco do pote com etiqueta oval, circulo do
 * bolo inteiro com fita, quadrado da unidade com carimbo kraft. O acessorio
 * repete o nome do h3 e por isso e aria-hidden. Ele fica fora da janela
 * (que recorta a foto) para poder sair da borda.
 */
export function MolduraProduto({ formato, nome, children }: Props) {
  const classe = classeDoFormato(formato)
  return (
    <div className={`moldura moldura--${classe}`}>
      <div className="moldura__janela">{children}</div>
      <Acessorio classe={classe} nome={nome} />
    </div>
  )
}

function Acessorio({ classe, nome }: { classe: Conhecido | 'neutra'; nome: string }) {
  if (classe === 'pote') {
    return (
      <span className={`etiqueta${nome.length > 11 ? ' etiqueta--longa' : ''}`} aria-hidden="true">
        <b>{nome}</b>
        <i>♥</i>
      </span>
    )
  }
  if (classe === 'inteiro') {
    return (
      <span className="fita" aria-hidden="true">
        {nome}
      </span>
    )
  }
  if (classe === 'unidade') {
    return (
      <span className="carimbo" aria-hidden="true">
        {nome}
      </span>
    )
  }
  return null
}
