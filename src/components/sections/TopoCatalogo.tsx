import { ComAmo } from '@/components/ui/ComAmo'
import type { VistaCatalogo } from '@/lib/visao'

/** As palavras pequenas que nao podem sobrar no fim da primeira voz. */
const CONECTIVOS = new Set(['a', 'o', 'e', 'de', 'da', 'do', 'das', 'dos', 'no', 'na', 'nos', 'nas', 'em', 'com', 'sem', 'para', 'por'])

/**
 * As duas vozes do titulo, como no H1 da home: o comeco em Poppins leve e o
 * fim em script. O corte e uma regra e nao um texto: a ultima palavra vai
 * para o script e leva junto o conectivo que a antecede ("Bolos" + "no
 * pote", "O catalogo" + "inteiro"). Titulo de uma palavra so fica inteiro
 * na primeira voz.
 */
export function duasVozes(titulo: string): readonly [string, string | null] {
  const palavras = titulo.trim().split(/\s+/)
  if (palavras.length < 2) return [titulo, null]
  let corte = palavras.length - 1
  while (corte > 1 && CONECTIVOS.has(palavras[corte - 1].toLowerCase())) corte--
  return [palavras.slice(0, corte).join(' '), palavras.slice(corte).join(' ')]
}

/**
 * O topo do catalogo, creme como o corpo: a trilha, o titulo em duas vozes
 * e, a direita pela base dele, a frase que diz o que ha na pagina. Sem capa:
 * a primeira fileira de fotos fica logo abaixo, e e dela a imagem
 * pre-carregada. O 404 continua com o topo expresso (.topo-catalogo sem o
 * --claro).
 */
export function TopoCatalogo({ vista }: { vista: VistaCatalogo }) {
  const [comeco, fim] = duasVozes(vista.titulo)
  return (
    <div className="topo-catalogo topo-catalogo--claro">
      <div className="wrap topo-catalogo__grade">
        <div className="topo-catalogo__texto">
          <nav aria-label="Trilha">
            <ol className="trilha">
              <li>
                <a href="/">Início</a>
              </li>
              <li>
                <span aria-current="page">Catálogo</span>
              </li>
            </ol>
          </nav>
          <h1 className="topo-catalogo__titulo">
            {comeco}
            {fim ? (
              <>
                {' '}
                <em>{fim}</em>
              </>
            ) : null}
          </h1>
        </div>
        <p className="topo-catalogo__lead">
          <ComAmo texto={vista.lead} />
        </p>
      </div>
    </div>
  )
}
