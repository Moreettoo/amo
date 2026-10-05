import Image from 'next/image'
import type { Produto } from '@/lib/catalogo'
import { ComAmo } from '@/components/ui/ComAmo'
import { MolduraProduto } from '@/components/ui/MolduraProduto'
import { PoteEnche } from '@/components/ui/PoteEnche'

type Props = {
  produto: Produto
  /** o tipo da linha no singular: "Bolo no pote" */
  tipo: string
  nomesDosSelos: Readonly<Record<string, string>>
}

/**
 * O card do cardapio. Hover decorativo (o card nao e clicavel: nao ha pagina
 * de produto), entao sem cursor de mao. Os selos sobem por cima da foto no
 * hover; no toque ficam sempre a mostra.
 */
export function CardProduto({ produto, tipo, nomesDosSelos }: Props) {
  const idTitulo = `produto-${produto.slug}`
  return (
    <article className="card-produto" aria-labelledby={idTitulo}>
      <MolduraProduto
        formato={produto.formato}
        nome={produto.nome}
        sobreFoto={
          produto.selos.length > 0 ? (
            <ul className="selos-foto" aria-label="Selos">
              {produto.selos.map((id) => (
                <li key={id}>{nomesDosSelos[id] ?? id}</li>
              ))}
            </ul>
          ) : null
        }
      >
        <PoteEnche>
          <Image
            src={produto.imagem.src}
            alt={produto.imagem.alt}
            width={produto.imagem.largura}
            height={produto.imagem.altura}
            loading="lazy"
            sizes="(max-width: 520px) 50vw, (max-width: 1240px) 33vw, 300px"
            className="moldura__foto"
          />
        </PoteEnche>
      </MolduraProduto>
      <p className="card-produto__tipo">{tipo}</p>
      <h3 id={idTitulo}>{produto.nome}</h3>
      {produto.frase ? (
        <p className="card-produto__frase">
          <ComAmo texto={produto.frase} />
        </p>
      ) : null}
    </article>
  )
}
