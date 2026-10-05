import { Fragment } from 'react'

/**
 * Texto do cadastro com todo "AMO" blindado contra tradutor automatico:
 * "AMO" e "eu amo" em portugues, e some da marca se o tradutor mexer nele.
 */
export function ComAmo({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/\b(AMO)\b/).map((parte, i) =>
        parte === 'AMO' ? (
          <span key={i} translate="no">
            AMO
          </span>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </>
  )
}
