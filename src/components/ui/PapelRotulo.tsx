import type { CSSProperties } from 'react'
import { Coracao } from '@/components/icons/Coracao'
import { IconeSelo } from '@/components/icons/selos'
import { ComAmo } from '@/components/ui/ComAmo'
import type { Linha } from '@/lib/catalogo'

type Props = {
  linha: Linha
  nomesDosSelos: Readonly<Record<string, string>>
  /** o giro de leve do papel na mesa */
  giro: string
  /** linha unica: o cartao fica largo e se divide em duas colunas */
  largo?: boolean
}

/** O rotulo de papel de uma linha: regra, selos, modo de aproveitar, faixa. */
export function PapelRotulo({ linha, nomesDosSelos, giro, largo = false }: Props) {
  const idTitulo = `rotulo-${linha.slug}`
  return (
    <article
      aria-labelledby={idTitulo}
      className={`papel-rotulo papel-rotulo--${linha.corDoRotulo}${largo ? ' papel-rotulo--largo' : ''}`}
      style={{ '--giro': giro } as CSSProperties}
    >
      <h3 id={idTitulo}>{linha.nome}</h3>
      <p className="papel-rotulo__regra">{linha.regra}</p>
      <div className="papel-rotulo__corpo">
        <ul className="papel-rotulo__selos" aria-label={`Selos da linha ${linha.nome}`}>
          {linha.selos.map((id) => (
            <li key={id}>
              <IconeSelo id={id} />
              {nomesDosSelos[id] ?? id}
            </li>
          ))}
        </ul>
        {linha.modoDeAproveitar ? (
          <div className="papel-rotulo__modo">
            <p className="papel-rotulo__modo-titulo">
              <ComAmo texto={linha.modoDeAproveitar.titulo} />
            </p>
            <ol>
              {linha.modoDeAproveitar.passos.map((passo) => (
                <li key={passo}>{passo}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
      {linha.frase ? (
        <p className="papel-rotulo__faixa">
          <ComAmo texto={linha.frase} /> <Coracao className="papel-rotulo__coracao" />
        </p>
      ) : null}
    </article>
  )
}
