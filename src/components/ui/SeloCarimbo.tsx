/**
 * A regra da linha ("Zero acucar") em caixa alta espacada, com o coracao do
 * logo na frente (o desenho mora em .selo-carimbo, pecas.css). Texto de
 * verdade, nao aria-hidden. O nome ficou da v2, quando era um carimbo
 * redondo; o 404 usa a mesma peca para o "Erro 404".
 */
export function SeloCarimbo({ texto }: { texto: string }) {
  return (
    <p className="selo-carimbo">
      <span>{texto}</span>
    </p>
  )
}
