import { FotoParallax } from '@/components/ui/FotoParallax'
import type { ImagemProduto } from '@/lib/catalogo'

/**
 * A marca. Texto escrito para esta pagina (spec §14, pendente de aval do
 * cliente). A assinatura "AMO por voce" nao se repete aqui: a faixa cobre
 * logo abaixo ja e ela.
 */
export function AMarca({ foto }: { foto: ImagemProduto }) {
  return (
    <section id="marca" aria-labelledby="titulo-marca" className="marca grao scroll-mt-24">
      <div className="wrap marca__grade">
        <div className="arco-foto marca__foto">
          <FotoParallax
            imagem={foto}
            sizes="(max-width: 820px) 90vw, 400px"
            className="h-full w-full"
            proporcao="h-full w-full"
          />
        </div>
        <div>
          <p className="rotulo-secao">A marca</p>
          <h2 id="titulo-marca" className="titulo-secao">
            Comer bem não devia cobrar nada depois
          </h2>
          <p className="texto">
            <span translate="no">AMO</span> nasceu de uma ideia simples: o que é gostoso não precisa pesar
            depois. Cada receita é feita na versão saudável, e o rótulo diz o que tem e o que não tem. Nos
            bolos no pote, por exemplo: montados à mão, cozidos a vapor e adoçados com eritritol
            e{' '}stevia. Açúcar, nenhum.
          </p>
        </div>
      </div>
    </section>
  )
}
