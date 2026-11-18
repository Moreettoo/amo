import Image from 'next/image'
import { ComAmo } from '@/components/ui/ComAmo'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import { CAMINHO_CATALOGO, contarReceitas, type VistaCatalogo } from '@/lib/visao'

/** As palavras pequenas que nao podem sobrar no fim da primeira voz. */
const CONECTIVOS = new Set(['a', 'o', 'e', 'de', 'da', 'do', 'das', 'dos', 'no', 'na', 'nos', 'nas', 'em', 'com', 'sem', 'para', 'por'])

/**
 * As duas vozes do titulo, como no H1 da home: o comeco em Poppins leve e o
 * fim em script. O titulo vem do cadastro (o nome da linha), entao o corte e
 * uma regra e nao um texto: a ultima palavra vai para o script e leva junto
 * o conectivo que a antecede ("Bolos" + "no pote", "O catalogo" + "inteiro").
 * Titulo de uma palavra so fica inteiro na primeira voz.
 */
export function duasVozes(titulo: string): readonly [string, string | null] {
  const palavras = titulo.trim().split(/\s+/)
  if (palavras.length < 2) return [titulo, null]
  let corte = palavras.length - 1
  while (corte > 1 && CONECTIVOS.has(palavras[corte - 1].toLowerCase())) corte--
  return [palavras.slice(0, corte).join(' '), palavras.slice(corte).join(' ')]
}

/**
 * O topo do catalogo, expresso, na ordem do hero da home: a trilha, o nome
 * da linha (ou "O catalogo inteiro") em duas vozes, a regra da linha, a
 * frase e a contagem; a direita, a capa reta com o fio cobre deslocado atras.
 * A primeira capa e a unica imagem da pagina pre-carregada. No celular as
 * capas somem; o sizes de 1px faz o navegador baixar a menor versao delas.
 */
export function TopoCatalogo({ vista }: { vista: VistaCatalogo }) {
  const { linha, capas } = vista
  const [comeco, fim] = duasVozes(vista.titulo)
  return (
    <div className="topo-catalogo superficie-escura">
      <div className="wrap topo-catalogo__grade">
        <div className="topo-catalogo__texto">
          <nav aria-label="Trilha">
            <ol className="trilha">
              <li>
                <a href="/">Início</a>
              </li>
              <li>{linha ? <a href={CAMINHO_CATALOGO}>Catálogo</a> : <span aria-current="page">Catálogo</span>}</li>
              {linha ? (
                <li>
                  <span aria-current="page">{linha.nome}</span>
                </li>
              ) : null}
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
          {linha ? (
            <div className="topo-catalogo__regra">
              <SeloCarimbo texto={linha.regra} />
            </div>
          ) : null}
          {vista.lead ? (
            <p className="topo-catalogo__lead">
              <ComAmo texto={vista.lead} />
            </p>
          ) : null}
          <p className="topo-catalogo__conta">{contarReceitas(vista.contagem)}</p>
        </div>

        <div
          className={`topo-catalogo__capas topo-catalogo__capas--${capas.length > 1 ? 'varias' : 'uma'}`}
          aria-hidden="true"
        >
          {capas.map((c, i) => (
            <div
              key={c.produto}
              className={`arco-foto topo-catalogo__capa topo-catalogo__capa--${classeDoFormato(c.formato)}`}
            >
              {i === 0 ? (
                <Image
                  src={c.imagem.src}
                  alt=""
                  width={c.imagem.largura}
                  height={c.imagem.altura}
                  sizes={`(max-width: 820px) 1px, ${capas.length > 1 ? 112 : 340}px`}
                  preload
                />
              ) : (
                <Image
                  src={c.imagem.src}
                  alt=""
                  width={c.imagem.largura}
                  height={c.imagem.altura}
                  loading="eager"
                  fetchPriority="low"
                  sizes="(max-width: 820px) 1px, 112px"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
