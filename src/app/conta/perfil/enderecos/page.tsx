import type { Metadata } from 'next'
import { ItemDeEndereco, NovoEndereco } from '@/components/conta/FormsDaConta'
import { CabecaDaConta, PainelDaConta, lerDadosDoPainel } from '@/components/conta/PainelDaConta'
import { exigirUsuario } from '@/lib/auth'
import { MAXIMO_DE_ENDERECOS } from '@/lib/conta/regras'
import { lerEnderecos, type Endereco } from '@/lib/dados/enderecos'

export const metadata: Metadata = { title: 'Endereços · AMO', robots: { index: false } }

const cepComTraco = (cep: string) => `${cep.slice(0, 5)}-${cep.slice(5)}`
/** Em duas linhas, como o "Entregar em" do pedido: a rua; o bairro, a cidade e o CEP inteiro. */
const textoDoEndereco = (e: Endereco) => (
  <>
    <span className="endereco__linha">{[e.logradouro, e.numero, e.complemento].filter(Boolean).join(', ')}</span>
    <span className="endereco__linha">
      {e.bairro}, {e.cidade}, {e.uf} · <span className="endereco__cep num">CEP {cepComTraco(e.cep)}</span>
    </span>
  </>
)

/** A frase ao lado do titulo: o limite e, com enderecos guardados, quantos ja ha. */
const fraseDaConta = (n: number) =>
  n === 0
    ? `Até ${MAXIMO_DE_ENDERECOS} endereços, um deles o principal: é o que a sacola sugere primeiro.`
    : `${n} ${n === 1 ? 'guardado' : 'guardados'}, de até ${MAXIMO_DE_ENDERECOS}. O principal é o que a sacola sugere primeiro.`

export default async function PaginaDosEnderecos() {
  const usuario = await exigirUsuario('/conta/perfil/enderecos')
  const [dados, enderecos] = await Promise.all([lerDadosDoPainel(usuario.id), lerEnderecos(usuario.id)])

  return (
    <PainelDaConta atual="enderecos" usuario={usuario} dados={dados}>
      <CabecaDaConta titulo="Endereços" frase="de entrega" lado={<p>{fraseDaConta(enderecos.length)}</p>} />
      {enderecos.length > 0 ? (
        <ul className="enderecos">
          {enderecos.map(({ id, ...endereco }, i) => (
            <li key={id}>
              <ItemDeEndereco id={id} endereco={endereco} texto={textoDoEndereco({ id, ...endereco })} nome={endereco.apelido ?? `Endereço ${i + 1}`} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="painel__lead">Nenhum endereço guardado ainda. O primeiro vira o principal.</p>
      )}
      <section className="painel__bloco" aria-label="Novo endereço">
        <NovoEndereco primeiro={enderecos.length === 0} cheio={enderecos.length >= MAXIMO_DE_ENDERECOS} />
      </section>
    </PainelDaConta>
  )
}
