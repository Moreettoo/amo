import type { Metadata } from 'next'
import { ItemDeEndereco, NovoEndereco } from '@/components/conta/FormsDaConta'
import { CabecaDaConta, PainelDaConta, lerDadosDoPainel } from '@/components/conta/PainelDaConta'
import { exigirUsuario } from '@/lib/auth'
import { lerEnderecos, type Endereco } from '@/lib/dados/enderecos'

export const metadata: Metadata = { title: 'Endereços · AMO', robots: { index: false } }

/** O banco guarda ate 5 (gatilho limitar_enderecos). */
const MAXIMO = 5

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

export default async function PaginaDosEnderecos() {
  const usuario = await exigirUsuario('/conta/perfil/enderecos')
  const [dados, enderecos] = await Promise.all([lerDadosDoPainel(usuario.id), lerEnderecos(usuario.id)])

  return (
    <PainelDaConta atual="enderecos" usuario={usuario} dados={dados}>
      <CabecaDaConta titulo="Endereços" frase="de entrega" lado={<p>Até {MAXIMO} endereços, um deles o principal: é o que a sacola sugere primeiro.</p>} />
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
      {enderecos.length < MAXIMO ? (
        <section className="painel__bloco" aria-label="Novo endereço">
          <NovoEndereco primeiro={enderecos.length === 0} />
        </section>
      ) : (
        <p className="painel__nota painel__nota--esquerda">Já são {MAXIMO} endereços: para guardar outro, remova um.</p>
      )}
    </PainelDaConta>
  )
}
