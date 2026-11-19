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
  /** para onde o card leva (a pagina do produto); sem ele o card nao clica */
  href?: string
  /** o nivel do titulo: 3 na vitrine da home; 4 no catalogo, onde o card
   *  vem depois da categoria (h2) e da linha (h3) */
  nivel?: 3 | 4
  /** a primeira foto da pagina: pre-carregada, sem lazy */
  precarregada?: boolean
}

/**
 * O card do cardapio. Com `href` o card inteiro clica: o link mora no nome
 * e um ::after o estende ate as bordas; a vitrine e o catalogo levam a
 * pagina do produto. Sem `href` ele nao clica e nao reage ao mouse. Os selos ficam
 * sempre a mostra, no texto do card: por cima da foto eles tapavam o pote
 * e o rotulo dele.
 */
export function CardProduto({ produto, tipo, nomesDosSelos, href, nivel = 3, precarregada = false }: Props) {
  const idTitulo = `produto-${produto.slug}`
  const Titulo = nivel === 4 ? 'h4' : 'h3'
  return (
    <article className="card-produto" aria-labelledby={idTitulo}>
      <MolduraProduto formato={produto.formato} nome={produto.nome}>
        <PoteEnche>
          <Image
            src={produto.imagem.src}
            alt={produto.imagem.alt}
            width={produto.imagem.largura}
            height={produto.imagem.altura}
            {...(precarregada ? { preload: true } : { loading: 'lazy' as const })}
            sizes="(max-width: 520px) 50vw, (max-width: 1240px) 33vw, 300px"
            className="moldura__foto"
          />
        </PoteEnche>
      </MolduraProduto>
      <Titulo id={idTitulo} className="card-produto__nome">
        {href ? (
          <a href={href} className="card-produto__link">
            {produto.nome}
          </a>
        ) : (
          produto.nome
        )}
      </Titulo>
      <p className="card-produto__tipo">{tipo}</p>
      {produto.selos.length > 0 ? (
        <ul className="card-produto__selos" aria-label="Selos">
          {produto.selos.map((id) => (
            <li key={id}>{nomesDosSelos[id] ?? id}</li>
          ))}
        </ul>
      ) : null}
      {produto.frase ? (
        <p className="card-produto__frase">
          <ComAmo texto={produto.frase} />
        </p>
      ) : null}
    </article>
  )
}
