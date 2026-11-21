'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { useSacola } from '@/components/ui/useSacola'
import { mascararCep } from '@/lib/entrega'
import type { Cotacao } from '@/lib/fechamento/tipos'
import { enviarPedidoDeExemplo, mascararCelular, NOMES_DO_PAGAMENTO, type Pagamento } from '@/lib/pedido'
import { formatarPreco } from '@/lib/produto'
import { contarPotes, esvaziarSacola, somarLinhas, textoPotes, type ItemDaLoja, type LinhaDaSacola } from '@/lib/sacola'
import { CAMINHO_CATALOGO } from '@/lib/visao'
import { EtapaDados } from './EtapaDados'
import { EtapaEntrega } from './EtapaEntrega'
import { Fio, ListaDePotes, Titulo } from './pecas'
import { apagarProgresso, gravarProgresso, lerProgresso, type EnderecoDigitado, type Etapa } from './progresso'

/** O que a pagina le no servidor para o fechamento. */
export type DadosDaSacola = {
  usuario: ContaDaSacola | null
  /** a marca da conta (16 hex do SHA-256 do id, feita no servidor), null sem sessao */
  conta: string | null
  enderecoPrincipal: { cep: string; numero: string; complemento: string } | null
  loja: { aberta: boolean; texto: string; horarios: string }
  porta: { chaveDoTurnstile: string; nonce: string }
  chavePublicaMp: string | null
}

/** A cliente logada: o pedido sai com o nome, o celular e o e-mail da conta. */
export type ContaDaSacola = { nome: string; celular: string; email: string }

const NOMES: Record<Etapa, string> = { 1: 'Os potes', 2: 'Entrega', 3: 'Seus dados', 4: 'Pagamento' }
const DICAS: Record<Etapa, string> = {
  1: 'Confira os sabores e quantos de cada.',
  2: 'CEP e número; o valor do Uber aparece aqui.',
  3: 'Nome, celular e e-mail para acompanhar o pedido.',
  4: 'Pix ou cartão.',
}

type Feito = { numero: string; linhas: LinhaDaSacola[]; cotacao: Cotacao; cliente: ContaDaSacola; pagamento: Pagamento }

/** A Regra do Exemplo Dito: enquanto a cotacao for de exemplo, o valor diz isso. */
const deExemplo = (c: Cotacao) => (c.exemplo ? ' (valor de exemplo)' : '')
const ruaENumero = (c: Cotacao) => `${c.endereco.logradouro}, ${c.endereco.numero}`
/** "Rua Gomes de Carvalho, 10 · Vila Olimpia · Uber, R$ 12,90 (valor de exemplo)" */
const linhaDaEntrega = (c: Cotacao) => `${ruaENumero(c)} · ${c.endereco.bairro} · Uber, ${formatarPreco(c.valorCentavos)}${deExemplo(c)}`

const SEM_ENDERECO: EnderecoDigitado = { cep: '', numero: '', complemento: '' }

/**
 * O fechamento do pedido, "o fio das etapas": os potes, a entrega, os dados
 * e o pagamento presos num fio vertical, com o coracao do logo pousado na
 * etapa atual. Uma etapa feita vira uma linha de resumo com "Alterar". O
 * resumo fica ao lado (no celular, preso embaixo) e o botao dele envia a
 * etapa atual: um botao so, ligado ao formulario pelo atributo form.
 * A etapa, o endereco e a cotacao ficam guardados na aba (progresso.ts).
 */
export function Fechamento({ loja, dados }: { loja: readonly ItemDaLoja[]; dados: DadosDaSacola }) {
  const id = useId()
  const linhas = useSacola(loja)
  // o progresso da aba so existe no navegador; no servidor (e enquanto a
  // sacola e lida) a pagina mostra a area reservada, sem as etapas
  const [guardado] = useState(() => lerProgresso(Date.now(), dados.conta))
  // a escolha de guardar o endereco nao fica na aba: quem parou na 4 volta
  // para a 3, onde ela esta
  const [etapa, setEtapa] = useState<Etapa>(guardado ? (guardado.etapa === 4 ? 3 : guardado.etapa) : 1)
  const [endereco, setEndereco] = useState<EnderecoDigitado>(() => {
    if (guardado) return guardado.endereco
    const p = dados.enderecoPrincipal
    return p ? { cep: mascararCep(p.cep), numero: p.numero, complemento: p.complemento } : SEM_ENDERECO
  })
  const [cotacao, setCotacao] = useState<Cotacao | null>(guardado?.cotacao ?? null)
  // "Guardar este endereco em Minha conta" (etapa 3), que vai com o pedido
  const [guardarEndereco, setGuardarEndereco] = useState(false)
  const [pagamento, setPagamento] = useState<Pagamento>('pix')
  const [ocupado, setOcupado] = useState(false)
  const [feito, setFeito] = useState<Feito | null>(null)

  useEffect(() => {
    if (!feito) gravarProgresso({ etapa, endereco, cotacao, conta: dados.conta })
  }, [feito, etapa, endereco, cotacao, dados.conta])

  const formulario = (e: Etapa) => `${id}-etapa-${e}`
  const ir = (e: Etapa) => {
    setEtapa(e)
    // o foco vai para o titulo da etapa nova, para o leitor de tela seguir
    requestAnimationFrame(() => document.getElementById(`${id}-t${e}`)?.focus())
  }

  if (feito) return <PedidoFeito feito={feito} />
  if (linhas === null)
    return (
      <>
        <Titulo>Sua sacola</Titulo>
        <div className="fechamento fechamento--lendo" aria-busy="true" />
      </>
    )
  if (linhas.length === 0) {
    return (
      <>
        <Titulo frase="ainda vazia">Sua sacola</Titulo>
        <div className="fechamento__vazia">
          <p>Os sabores esperam no catálogo, um pote de cada vez.</p>
          <BotaoRetro href={CAMINHO_CATALOGO} escuro>
            Ver o catálogo
          </BotaoRetro>
        </div>
      </>
    )
  }

  const subtotal = somarLinhas(linhas)
  const total = subtotal + (cotacao?.valorCentavos ?? 0)
  const potes = contarPotes(linhas)

  async function fazerPedido() {
    if (!linhas || !cotacao || !dados.usuario) return
    setOcupado(true)
    const { numero } = await enviarPedidoDeExemplo({ guardarEndereco })
    setFeito({ numero, linhas, cotacao, cliente: dados.usuario, pagamento })
    apagarProgresso()
    esvaziarSacola()
    window.scrollTo({ top: 0 })
  }

  const rotuloDoBotao: Record<Etapa, string> = {
    1: 'Continuar para a entrega',
    2: ocupado ? 'Calculando a entrega' : 'Calcular e continuar',
    // deslogada, a etapa 3 e a porta, que tem os proprios botoes
    3: dados.usuario ? 'Continuar para o pagamento' : 'Entre para continuar',
    4: ocupado ? 'Enviando o pedido' : `Fazer o pedido · ${formatarPreco(total)}`,
  }

  const resumos: Record<Etapa, ReactNode> = {
    1: textoPotes(potes),
    2: cotacao ? linhaDaEntrega(cotacao) : null,
    3: dados.usuario ? `${dados.usuario.nome} · ${mascararCelular(dados.usuario.celular)}` : null,
    4: null,
  }

  return (
    <>
    <Titulo frase="quase pronta">Sua sacola</Titulo>
    <div className="fechamento">
      <Fio etapa={etapa} id={id}>
        {([1, 2, 3, 4] as const).map((e) => {
          const atual = e === etapa
          const pronta = e < etapa
          return (
            <li
              key={e}
              id={`${id}-e${e}`}
              className={`etapa${atual ? ' etapa--atual' : ''}${pronta ? ' etapa--pronta' : ''}`}
              aria-current={atual ? 'step' : undefined}
            >
              <div className="etapa__topo">
                <h2 id={`${id}-t${e}`} tabIndex={-1} className="etapa__nome">
                  {e}. {NOMES[e]}
                </h2>
                {pronta ? (
                  <button type="button" className="etapa__alterar" aria-label={`Alterar ${NOMES[e].toLowerCase()}`} onClick={() => ir(e)}>
                    Alterar
                  </button>
                ) : null}
                {atual && e === 1 ? (
                  <a className="etapa__alterar" href={CAMINHO_CATALOGO}>
                    Escolher mais
                  </a>
                ) : null}
              </div>
              {pronta && resumos[e] ? <p className="etapa__resumo">{resumos[e]}</p> : null}
              {!atual && !pronta ? <p className="etapa__dica">{DICAS[e]}</p> : null}

              {atual && e === 1 ? (
                <form id={formulario(1)} onSubmit={(ev) => (ev.preventDefault(), ir(2))}>
                  <ListaDePotes linhas={linhas} />
                </form>
              ) : null}
              {atual && e === 2 ? (
                <EtapaEntrega
                  id={formulario(2)}
                  endereco={endereco}
                  aoMudarEndereco={(novo) => {
                    setEndereco(novo)
                    // o endereco mudou: a cotacao era do outro
                    setCotacao(null)
                  }}
                  cotacao={cotacao}
                  ocupado={ocupado}
                  setOcupado={setOcupado}
                  aoCotar={(c) => {
                    setCotacao(c)
                    ir(3)
                  }}
                />
              ) : null}
              {atual && e === 3 ? (
                <EtapaDados
                  id={formulario(3)}
                  usuario={dados.usuario}
                  porta={dados.porta}
                  guardar={guardarEndereco}
                  aoMudarGuardar={setGuardarEndereco}
                  aoContinuar={() => ir(4)}
                />
              ) : null}
              {atual && e === 4 ? (
                <form
                  id={formulario(4)}
                  onSubmit={(ev) => {
                    ev.preventDefault()
                    if (!ocupado) void fazerPedido()
                  }}
                >
                  <fieldset className="pagamento">
                    <legend className="sr-only">Como pagar</legend>
                    {(['pix', 'cartao'] as const).map((p) => (
                      <label key={p} className="pagamento__opcao">
                        <input
                          type="radio"
                          name="pagamento"
                          value={p}
                          checked={pagamento === p}
                          onChange={() => setPagamento(p)}
                        />
                        <span>
                          {NOMES_DO_PAGAMENTO[p]}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="etapa__aviso">Pagamento de exemplo: por enquanto nenhum valor é cobrado.</p>
                </form>
              ) : null}
            </li>
          )
        })}
      </Fio>

      <aside className="resumo" aria-labelledby={`${id}-resumo`}>
        <h2 id={`${id}-resumo`} className="resumo__rotulo">
          Resumo
        </h2>
        <dl className="resumo__contas">
          <div>
            <dt>Subtotal, {textoPotes(potes)}</dt>
            <dd>{formatarPreco(subtotal)}</dd>
          </div>
          <div>
            <dt>Entrega{cotacao ? deExemplo(cotacao) : ''}</dt>
            <dd className={cotacao ? undefined : 'resumo__falta'}>
              {cotacao ? formatarPreco(cotacao.valorCentavos) : 'informe o CEP'}
            </dd>
          </div>
          <div className="resumo__total">
            <dt>Total</dt>
            <dd>{formatarPreco(total)}</dd>
          </div>
        </dl>
        <p className={`resumo__loja${dados.loja.aberta ? '' : ' resumo__loja--fechada'}`}>
          <span>{dados.loja.texto}</span>
          {!dados.loja.aberta && dados.loja.horarios ? <span>{dados.loja.horarios}</span> : null}
        </p>
        <button
          type="submit"
          form={formulario(etapa)}
          className="btn-retro btn-retro--escuro resumo__botao"
          disabled={ocupado || (etapa === 3 && !dados.usuario)}
          aria-busy={ocupado}
        >
          {rotuloDoBotao[etapa]}
        </button>
        <a className="resumo__voltar" href={CAMINHO_CATALOGO}>
          Voltar ao catálogo
        </a>
        <p className="resumo__nota">Feito no dia, cozido a vapor, no pote de vidro que você reaproveita.</p>
      </aside>
    </div>
    </>
  )
}

function PedidoFeito({ feito }: { feito: Feito }) {
  const subtotal = somarLinhas(feito.linhas)
  const { complemento } = feito.cotacao.endereco
  return (
    <section className="feito" aria-labelledby="pedido-feito">
      <Titulo frase="recebido" id="pedido-feito" foco>
        Pedido {feito.numero}
      </Titulo>
      <p className="feito__texto">
        Este é um pedido de exemplo: nada foi cobrado e nenhum pote sai da cozinha ainda. Quando o pagamento
        estiver ligado, {feito.cliente.nome.split(' ')[0]}, a confirmação chega no {mascararCelular(feito.cliente.celular)}.
      </p>
      {feito.pagamento === 'pix' ? (
        <p className="feito__pix">O código Pix aparece aqui quando o pagamento estiver ligado.</p>
      ) : null}
      <dl className="feito__contas">
        {feito.linhas.map((l) => (
          <div key={l.slug}>
            <dt>
              {l.quantos} × {l.nome}
            </dt>
            <dd>{formatarPreco(l.total)}</dd>
          </div>
        ))}
        <div>
          <dt>
            Entrega pelo Uber{deExemplo(feito.cotacao)}, {ruaENumero(feito.cotacao)}
            {complemento ? `, ${complemento}` : ''}
          </dt>
          <dd>{formatarPreco(feito.cotacao.valorCentavos)}</dd>
        </div>
        <div className="resumo__total">
          <dt>Total, {feito.pagamento === 'pix' ? 'no Pix' : 'no cartão'}</dt>
          <dd>{formatarPreco(subtotal + feito.cotacao.valorCentavos)}</dd>
        </div>
      </dl>
      <BotaoRetro href={CAMINHO_CATALOGO} escuro>
        Voltar ao catálogo
      </BotaoRetro>
    </section>
  )
}
