'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { fecharPedido, pagarComPix } from '@/app/sacola/acoes'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { useSacola } from '@/components/ui/useSacola'
import { mascararCep } from '@/lib/entrega'
import {
  MENSAGENS_DO_FECHAMENTO,
  type CodigoDoFechamento,
  type Cotacao,
  type RespostaDoPagamento,
  type RespostaDoPedido,
  type SituacaoDoPedido,
} from '@/lib/fechamento/tipos'
import { mascararCelular, type Pagamento } from '@/lib/pedido'
import { formatarPreco } from '@/lib/produto'
import { contarPotes, esvaziarSacola, somarLinhas, textoPotes, type ItemDaLoja, type LinhaDaSacola } from '@/lib/sacola'
import { CAMINHO_CATALOGO } from '@/lib/visao'
import { EtapaDados } from './EtapaDados'
import { EtapaEntrega } from './EtapaEntrega'
import { EtapaPagamento } from './EtapaPagamento'
import { aprovado } from './espera'
import { PedidoFeito } from './PedidoFeito'
import { deExemplo, Fio, ListaDePotes, ruaENumero, Titulo } from './pecas'
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

/** O pedido fechado, pago ou esperando o Pix: a situacao que o servidor devolveu e o que foi pedido. */
type Feito = { situacao: SituacaoDoPedido; linhas: LinhaDaSacola[]; entrega: Cotacao; total: number }

/** A frase de um erro, na etapa em que a cliente resolve. */
type Aviso = { etapa: Etapa; codigo: CodigoDoFechamento }
/** Em que parte do pagamento o botao esta: fechando o pedido (ate uns 30 s) ou gerando o Pix. */
type Fase = 'fechando' | 'gerando'

/** Onde cada erro do pagamento se resolve; o resto fica na etapa 4, com a frase. */
const ETAPA_DO_ERRO: Partial<Record<CodigoDoFechamento, Etapa>> = {
  cotacao_vencida: 2,
  produto_indisponivel: 1,
  sem_sessao: 3,
  email_nao_confirmado: 3,
}
/** O que mudou no servidor e volta com a pagina (router.refresh): os precos, o cardapio, a loja, a sessao. */
const PEDEM_A_PAGINA = new Set<CodigoDoFechamento>(['total_mudou', 'loja_fechada', 'produto_indisponivel', 'sem_sessao', 'email_nao_confirmado'])
/** Do codigo novo, estes pedem o pedido de novo (ou a conta): a cliente volta as etapas. */
const VOLTAM_AS_ETAPAS = new Set<CodigoDoFechamento>(['pedido_invalido', 'tentativas_esgotadas', 'sem_sessao', 'email_nao_confirmado'])

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
 * Pagar com Pix fecha o pedido (fecharPedido) e gera o Pix (pagarComPix);
 * cada erro leva a etapa em que a cliente resolve. A sacola so esvazia com
 * o pagamento aprovado.
 */
export function Fechamento({ loja, dados }: { loja: readonly ItemDaLoja[]; dados: DadosDaSacola }) {
  const id = useId()
  const router = useRouter()
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
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [fase, setFase] = useState<Fase | null>(null)
  // o banco disse loja_fechada: o botao desliga ja, antes de a pagina voltar com a loja
  const [lojaFechou, setLojaFechou] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [erroDoCodigo, setErroDoCodigo] = useState<CodigoDoFechamento | null>(null)
  // o pagamento em curso (o clique duplo nao fecha dois pedidos) e o numero da
  // chamada: a resposta de uma chamada que ficou para tras e ignorada
  const pagando = useRef(false)
  const chamada = useRef(0)
  // a conta que a etapa 3 conhecia: de nenhuma para uma, a cliente acabou de entrar
  const contaVista = useRef(guardado ? guardado.conta : dados.conta)
  const prontas = linhas !== null && linhas.length > 0

  useEffect(() => {
    if (!feito) gravarProgresso({ etapa, endereco, cotacao, conta: dados.conta })
  }, [feito, etapa, endereco, cotacao, dados.conta])

  useEffect(() => {
    const chamadas = chamada
    // a pagina que sai leva junto a resposta que ainda nao chegou
    return () => {
      chamadas.current++
    }
  }, [])

  useEffect(() => {
    if (!prontas) return
    const antes = contaVista.current
    contaVista.current = dados.conta
    // entrou pela porta da etapa 3 e voltou logada: o leitor de tela ouve onde ela esta
    if (antes === null && dados.conta !== null && etapa === 3) document.getElementById(`${id}-t3`)?.focus()
  }, [prontas, dados.conta, etapa, id])

  const formulario = (e: Etapa) => `${id}-etapa-${e}`
  const ir = (e: Etapa) => {
    if (pagando.current) {
      // saiu da etapa 4 com o pagamento em curso: a resposta que vier fica para tras
      chamada.current++
      pagando.current = false
      setOcupado(false)
      setFase(null)
    }
    setAviso(null)
    setEtapa(e)
    // o foco vai para o titulo da etapa nova, para o leitor de tela seguir
    requestAnimationFrame(() => document.getElementById(`${id}-t${e}`)?.focus())
  }

  /** O erro leva a etapa em que a cliente resolve, com a frase na linha de erro dela. */
  function tratarErro(codigo: CodigoDoFechamento) {
    const destino = ETAPA_DO_ERRO[codigo] ?? 4
    if (codigo === 'cotacao_vencida') setCotacao(null)
    if (codigo === 'loja_fechada') setLojaFechou(true)
    if (PEDEM_A_PAGINA.has(codigo)) router.refresh()
    // vindo do pedido feito, o titulo dele sai da tela: o foco vai a etapa tambem
    if (destino !== etapa || feito) ir(destino)
    // a frase entra depois que a etapa aparece, para a regiao viva dizer
    requestAnimationFrame(() => setAviso({ etapa: destino, codigo }))
  }

  /** O que o servidor disse do pedido: pago esvazia a sacola; cancelado volta as etapas. */
  function chegou(s: SituacaoDoPedido) {
    if (s.estado === 'cancelado') {
      setFeito(null)
      return tratarErro('pedido_invalido')
    }
    if (aprovado(s)) {
      esvaziarSacola()
      apagarProgresso()
    }
    setFeito((f) => (f && f.situacao.numero === s.numero ? { ...f, situacao: s } : f))
  }

  /** O codigo venceu, ou foi trocado: pede outro para o mesmo pedido. */
  async function gerarOutro() {
    if (!feito || gerando) return
    const { numero } = feito.situacao
    const minha = chamada.current
    setGerando(true)
    setErroDoCodigo(null)
    let r: RespostaDoPagamento
    try {
      r = await pagarComPix({ numero })
    } catch {
      r = { ok: false, erro: 'tente_de_novo' }
    }
    if (minha !== chamada.current) return
    setGerando(false)
    if (r.ok) return chegou(r.situacao)
    if (!VOLTAM_AS_ETAPAS.has(r.erro)) return setErroDoCodigo(r.erro)
    setFeito(null)
    tratarErro(r.erro)
  }

  if (feito)
    return (
      <PedidoFeito
        situacao={feito.situacao}
        linhas={feito.linhas}
        entrega={feito.entrega}
        total={feito.total}
        aoGerarOutro={() => void gerarOutro()}
        aoMudar={chegou}
        gerando={gerando}
        erro={erroDoCodigo}
      />
    )
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
  const fechada = !dados.loja.aberta || lojaFechou

  /**
   * Pagar com Pix: fecha o pedido com os potes, a cotacao e o total que a tela
   * mostra (o banco recusa com total_mudou se os precos mudaram) e gera o Pix
   * do numero que voltou. fecharPedido espera o Mercado Pago cancelar as
   * tentativas antigas e pode levar uns 30 s: o botao fica ocupado ate o fim.
   */
  async function pagar() {
    if (pagando.current || !linhas || !cotacao || !dados.usuario || fechada) return
    pagando.current = true
    const minha = ++chamada.current
    const pedidas = linhas
    const entrega = cotacao
    const fim = (erro: CodigoDoFechamento | null) => {
      pagando.current = false
      setOcupado(false)
      setFase(null)
      if (erro) tratarErro(erro)
    }
    setOcupado(true)
    setFase('fechando')
    setAviso(null)

    let pedido: RespostaDoPedido
    try {
      pedido = await fecharPedido({
        itens: pedidas.map((l) => ({ produto: l.slug, quantos: l.quantos })),
        cotacao: entrega.id,
        totalVisto: somarLinhas(pedidas) + entrega.valorCentavos,
        guardarEndereco,
      })
    } catch {
      pedido = { ok: false, erro: 'tente_de_novo' }
    }
    if (minha !== chamada.current) return
    if (!pedido.ok) return fim(pedido.erro)

    setFase('gerando')
    let pix: RespostaDoPagamento
    try {
      pix = await pagarComPix({ numero: pedido.pedido.numero })
    } catch {
      pix = { ok: false, erro: 'tente_de_novo' }
    }
    if (minha !== chamada.current) return
    if (!pix.ok) return fim(pix.erro)
    fim(null)
    if (pix.situacao.estado === 'cancelado') return tratarErro('pedido_invalido')
    setErroDoCodigo(null)
    setFeito({ situacao: pix.situacao, linhas: pedidas, entrega, total: pedido.pedido.totalCentavos })
    if (aprovado(pix.situacao)) {
      esvaziarSacola()
      apagarProgresso()
    }
    window.scrollTo({ top: 0 })
  }

  const rotuloDoBotao: Record<Etapa, string> = {
    1: 'Continuar para a entrega',
    2: ocupado ? 'Calculando a entrega' : 'Calcular e continuar',
    // deslogada, a etapa 3 e a porta, que tem os proprios botoes
    3: dados.usuario ? 'Continuar para o pagamento' : 'Entre para continuar',
    4:
      fase === 'fechando'
        ? 'Fechando o pedido, só um instante'
        : fase === 'gerando'
          ? 'Gerando o código Pix'
          : fechada
            ? 'Cozinha fechada agora'
            : `Pagar com Pix · ${formatarPreco(total)}`,
  }
  /** A frase de erro da etapa, quando o erro a trouxe ate ela. */
  const avisoDa = (e: Etapa) => (aviso?.etapa === e ? aviso.codigo : null)
  const avisoDosPotes = avisoDa(1)

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
                  <p className="etapa__erro" aria-live="polite">
                    {avisoDosPotes ? MENSAGENS_DO_FECHAMENTO[avisoDosPotes] : ''}
                  </p>
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
                    setAviso(null)
                  }}
                  cotacao={cotacao}
                  ocupado={ocupado}
                  setOcupado={setOcupado}
                  aoCotar={(c) => {
                    setCotacao(c)
                    ir(3)
                  }}
                  aviso={avisoDa(2)}
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
                  aviso={avisoDa(3)}
                />
              ) : null}
              {atual && e === 4 ? (
                <EtapaPagamento
                  id={formulario(4)}
                  forma={pagamento}
                  aoMudarForma={setPagamento}
                  aviso={avisoDa(4)}
                  aoPagar={() => void pagar()}
                />
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
          disabled={ocupado || (etapa === 3 && !dados.usuario) || (etapa === 4 && fechada)}
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
