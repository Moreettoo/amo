import Image from 'next/image'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'
import { IconeSelo } from '@/components/icons/selos'
import { FaixaCobre } from '@/components/sections/FaixaCobre'
import { ProdutoComentarios, Estrelas } from '@/components/sections/ProdutoComentarios'
import { ProdutoCompra } from '@/components/sections/ProdutoCompra'
import { ComAmo } from '@/components/ui/ComAmo'
import { SeloCarimbo } from '@/components/ui/SeloCarimbo'
import type { Linha } from '@/lib/catalogo'
import { contarComentarios, formatarNota, formatarPreco, type PaginaProduto } from '@/lib/produto'
import { CAMINHO_CATALOGO, caminhoDaCategoria, type DadosGaveta } from '@/lib/visao'

type Props = {
  pagina: PaginaProduto
  gaveta: DadosGaveta
  /** as linhas com produto, para o rodape */
  linhas: readonly Linha[]
}

/**
 * A pagina de um produto, "o rotulo na mao": a foto com o fio cobre a
 * esquerda e, a direita, o que a pessoa precisa para decidir e comprar, na
 * ordem em que pergunta: o que e, quanto custa, quando chega. A descricao e
 * o rotulo abrem e fecham (<details>, sem JS). O modo de aproveitar e o
 * mesmo em todo pote e ja mora no cartao do rotulo da home; aqui ele so
 * repetiria. Embaixo, os
 * comentarios; a pagina fecha como o catalogo.
 */
export function TelaProduto({ pagina, gaveta, linhas }: Props) {
  const { produto, linha, categoria, selosDoProduto, selosDaLinha, comentarios, resumo } = pagina
  return (
    <>
      <Nav gaveta={gaveta} />
      <main id="conteudo" className="produto-pagina scroll-mt-24">
        <div className="wrap">
          <nav aria-label="Trilha">
            <ol className="trilha">
              <li>
                <a href="/">Início</a>
              </li>
              <li>
                <a href={CAMINHO_CATALOGO}>Catálogo</a>
              </li>
              <li>
                <a href={caminhoDaCategoria(categoria.slug)}>{categoria.nome}</a>
              </li>
              <li>
                <span aria-current="page">{produto.nome}</span>
              </li>
            </ol>
          </nav>

          <div className="produto">
            <div className="produto__foto arco-foto">
              <Image
                src={produto.imagem.src}
                alt={produto.imagem.alt}
                width={produto.imagem.largura}
                height={produto.imagem.altura}
                preload
                sizes="(max-width: 820px) calc(100vw - 40px), 600px"
              />
            </div>

            <div className="produto__info">
              <p className="produto__tipo">{linha.tipo}</p>
              <h1 className="produto__nome">{produto.nome}</h1>
              {produto.frase ? (
                <p className="produto__frase">
                  <ComAmo texto={produto.frase} />
                </p>
              ) : null}
              {resumo.total > 0 ? (
                <p className="produto__nota">
                  <Estrelas nota={resumo.media} rotulo={`Média ${formatarNota(resumo.media)} de 5`} />
                  <span aria-hidden="true">{formatarNota(resumo.media)}</span>
                  <a href="#comentarios">Ler {resumo.total === 1 ? 'o comentário' : `os ${contarComentarios(resumo.total)}`}</a>
                </p>
              ) : null}

              {produto.preco !== undefined ? (
                <p className="produto__preco">
                  <b>{formatarPreco(produto.preco)}</b> <span>o pote</span>
                </p>
              ) : null}
              {selosDoProduto.length > 0 ? (
                <ul className="produto__selos" aria-label="Selos">
                  {selosDoProduto.map((s) => (
                    <li key={s.id}>{s.nome}</li>
                  ))}
                </ul>
              ) : null}

              {produto.preco !== undefined ? <ProdutoCompra slug={produto.slug} nome={produto.nome} preco={produto.preco} /> : null}

              <div className="produto__secoes">
                {produto.descricao ? (
                  <details className="secao" open>
                    <summary>Descrição</summary>
                    <p>{produto.descricao}</p>
                  </details>
                ) : null}
                <details className="secao">
                  <summary>O que diz o rótulo</summary>
                  <SeloCarimbo texto={linha.regra} />
                  <ul className="secao__selos">
                    {selosDaLinha.map((s) => (
                      <li key={s.id}>
                        <IconeSelo id={s.id} />
                        {s.nome}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
          </div>
        </div>

        <section id="comentarios" aria-labelledby="titulo-comentarios" className="comentarios scroll-mt-24">
          <div className="wrap">
            <h2 id="titulo-comentarios" className="titulo-secao">
              Quem provou <em>conta</em>
            </h2>
            <ProdutoComentarios comentarios={comentarios} resumo={resumo} />
          </div>
        </section>

        <div className="catalogo__fecho superficie-escura">
          <FaixaCobre />
        </div>
      </main>
      <Footer linhas={linhas} />
    </>
  )
}
