import Image from 'next/image'
import { ComAmo } from '@/components/ui/ComAmo'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import { CAMINHO_CATALOGO, contarReceitas, type VistaCatalogo } from '@/lib/visao'

/**
 * O topo do catalogo, expresso: trilha, rotulo, o nome da linha (ou "O
 * catalogo inteiro"), a frase, a contagem e, a direita, a capa na moldura do
 * formato com o selo da regra. A primeira capa e a unica imagem da pagina
 * pre-carregada. No celular as capas somem; o sizes de 1px faz o navegador
 * baixar a menor versao delas.
 */
export function TopoCatalogo({ vista }: { vista: VistaCatalogo }) {
  const { linha, capas } = vista
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
          <p className="rotulo-secao">O catálogo</p>
          <h1 className="topo-catalogo__titulo">{vista.titulo}</h1>
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
            <div key={c.produto} className={`topo-catalogo__capa topo-catalogo__capa--${classeDoFormato(c.formato)}`}>
              {i === 0 ? (
                <Image
                  src={c.imagem.src}
                  alt=""
                  width={c.imagem.largura}
                  height={c.imagem.altura}
                  sizes="(max-width: 820px) 1px, 280px"
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
                  sizes="(max-width: 820px) 1px, 140px"
                />
              )}
            </div>
          ))}
        </div>

        {linha ? (
          <div className="topo-catalogo__selo">
            <SeloCarimbo texto={linha.regra} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
