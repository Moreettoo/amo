import type { Metadata } from 'next'
import { FormNovidades, FormPerfil } from '@/components/conta/FormsDaConta'
import { CabecaDaConta, PainelDaConta, lerDadosDoPainel } from '@/components/conta/PainelDaConta'
import { exigirUsuario } from '@/lib/auth'
import { MENSAGENS_DA_CONTA } from '@/lib/conta/mensagens'
import { lerPerfil, podeExcluirConta } from '@/lib/dados/perfil'

export const metadata: Metadata = { title: 'Seus dados · AMO', robots: { index: false } }

export default async function PaginaDoPerfil() {
  const usuario = await exigirUsuario('/conta/perfil')
  const [dados, perfil, exclusao] = await Promise.all([lerDadosDoPainel(), lerPerfil(usuario.id), podeExcluirConta()])
  const nome = perfil?.nome ?? usuario.nome
  const celular = perfil?.celular ?? usuario.celular

  return (
    <PainelDaConta atual="perfil" usuario={usuario} dados={dados}>
      <CabecaDaConta titulo="Seus dados" frase="sempre em dia" lado={<p>O nome e o celular vão em cada pedido, para o entregador chamar.</p>} />

      <section className="painel__grupo" aria-labelledby="nome-e-celular">
        <h2 id="nome-e-celular" className="painel__subtitulo">
          Nome e celular
        </h2>
        <FormPerfil nome={nome} celular={celular} />
      </section>

      <section className="painel__grupo" aria-labelledby="email-atual">
        <h2 id="email-atual" className="painel__subtitulo">
          E-mail
        </h2>
        <p className="painel__valor">
          <b>{usuario.email}</b>
          <a className="conta__texto-botao" href="/conta/perfil/email-e-senha">
            Trocar em E-mail e senha
          </a>
        </p>
      </section>

      <section className="painel__grupo" aria-labelledby="novidades-titulo">
        <h2 id="novidades-titulo" className="painel__subtitulo">
          Novidades
        </h2>
        <FormNovidades aceita={perfil?.aceitaMarketing ?? false} />
      </section>

      <section className="painel__excluir" aria-label="Excluir a conta">
        {exclusao.pode ? (
          <>
            <a className="conta__texto-botao" href="/conta/excluir">
              Excluir conta
            </a>
            <span>Pede a sua senha, e a conta não volta depois de excluída.</span>
          </>
        ) : (
          <>
            <span>{MENSAGENS_DA_CONTA.pedido_em_aberto}</span>
            <a className="conta__texto-botao" href="/conta/pedidos">
              Ver os pedidos
            </a>
          </>
        )}
      </section>
    </PainelDaConta>
  )
}
