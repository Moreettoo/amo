'use client'

import Image from 'next/image'
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { Quantidade } from '@/components/ui/Quantidade'
import { useSacola } from '@/components/ui/useSacola'
import { cotarEntregaDeExemplo, mascararCep } from '@/lib/entrega'
import {
  descreverEndereco,
  enviarPedidoDeExemplo,
  mascararCelular,
  NOMES_DO_PAGAMENTO,
  validarDados,
  type Dados,
  type Entrega,
  type ErrosDosDados,
  type Pagamento,
} from '@/lib/pedido'
import { formatarPreco } from '@/lib/produto'
import {
  contarPotes,
  definirQuantidade,
  esvaziarSacola,
  somarLinhas,
  textoPotes,
  tirarDaSacola,
  type ItemDaLoja,
  type LinhaDaSacola,
} from '@/lib/sacola'
import { CAMINHO_CATALOGO } from '@/lib/visao'

type Etapa = 1 | 2 | 3 | 4
const NOMES: Record<Etapa, string> = { 1: 'Os potes', 2: 'Entrega', 3: 'Seus dados', 4: 'Pagamento' }
const DICAS: Record<Etapa, string> = {
  1: 'Confira os sabores e quantos de cada.',
  2: 'CEP e número; o valor do Uber aparece aqui.',
  3: 'Nome, celular e e-mail para acompanhar o pedido.',
  4: 'Pix ou cartão.',
}

type Feito = { numero: string; linhas: LinhaDaSacola[]; entrega: Entrega; dados: Dados; pagamento: Pagamento }

/**
 * O fechamento do pedido, "o fio das etapas": os potes, a entrega, os dados
 * e o pagamento presos num fio vertical, com o coracao do logo pousado na
 * etapa atual. Uma etapa feita vira uma linha de resumo com "Alterar". O
 * resumo fica ao lado (no celular, preso embaixo) e o botao dele envia a
 * etapa atual: um botao so, ligado ao formulario pelo atributo form.
 */
export function Fechamento({ loja }: { loja: readonly ItemDaLoja[] }) {
  const id = useId()
  const linhas = useSacola(loja)
  const [etapa, setEtapa] = useState<Etapa>(1)
  const [entrega, setEntrega] = useState<Entrega | null>(null)
  const [dados, setDados] = useState<Dados | null>(null)
  const [pagamento, setPagamento] = useState<Pagamento>('pix')
  const [ocupado, setOcupado] = useState(false)
  const [feito, setFeito] = useState<Feito | null>(null)

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
  const total = subtotal + (entrega?.cotacao.valor ?? 0)
  const potes = contarPotes(linhas)

  async function fazerPedido() {
    if (!linhas || !entrega || !dados) return
    setOcupado(true)
    const { numero } = await enviarPedidoDeExemplo()
    setFeito({ numero, linhas, entrega, dados, pagamento })
    esvaziarSacola()
    window.scrollTo({ top: 0 })
  }

  const rotuloDoBotao: Record<Etapa, string> = {
    1: 'Continuar para a entrega',
    2: ocupado ? 'Calculando a entrega' : 'Calcular e continuar',
    3: 'Continuar para o pagamento',
    4: ocupado ? 'Enviando o pedido' : `Fazer o pedido · ${formatarPreco(total)}`,
  }

  const resumos: Record<Etapa, ReactNode> = {
    1: textoPotes(potes),
    2: entrega ? `${descreverEndereco(entrega)} · Uber, ${formatarPreco(entrega.cotacao.valor)} (valor de exemplo)` : null,
    3: dados ? `${dados.nome} · ${dados.celular}` : null,
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
                <FormEntrega
                  id={formulario(2)}
                  inicial={entrega}
                  ocupado={ocupado}
                  setOcupado={setOcupado}
                  aoCotar={(x) => {
                    setEntrega(x)
                    ir(3)
                  }}
                  aoMudar={() => setEntrega(null)}
                />
              ) : null}
              {atual && e === 3 ? (
                <FormDados
                  id={formulario(3)}
                  inicial={dados}
                  aoConfirmar={(d) => {
                    setDados(d)
                    ir(4)
                  }}
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
            <dt>Entrega</dt>
            <dd className={entrega ? undefined : 'resumo__falta'}>
              {entrega ? formatarPreco(entrega.cotacao.valor) : 'informe o CEP'}
            </dd>
          </div>
          <div className="resumo__total">
            <dt>Total</dt>
            <dd>{formatarPreco(total)}</dd>
          </div>
        </dl>
        <button
          type="submit"
          form={formulario(etapa)}
          className="btn-retro btn-retro--escuro resumo__botao"
          disabled={ocupado}
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

/** O fio de 1 px pela margem e o coracao na etapa atual, que desliza ate ela. */
function Fio({ etapa, id, children }: { etapa: Etapa; id: string; children: ReactNode }) {
  const lista = useRef<HTMLOListElement>(null)
  const [y, setY] = useState<number | null>(null)

  useLayoutEffect(() => {
    const medir = () => {
      const alvo = document.getElementById(`${id}-t${etapa}`)
      const ol = lista.current
      if (!alvo || !ol) return
      const a = alvo.getBoundingClientRect()
      setY(a.top - ol.getBoundingClientRect().top + a.height / 2)
    }
    // o titulo da etapa atual so muda de altura quando a etapa muda (as de
    // cima ja sao resumo) ou quando a janela muda de largura
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [etapa, id])

  return (
    <ol ref={lista} className="etapas" aria-label="Etapas do pedido">
      {y !== null ? <span className="etapas__coracao" aria-hidden="true" style={{ '--y': `${y}px` } as CSSProperties} /> : null}
      {children}
    </ol>
  )
}

function ListaDePotes({ linhas }: { linhas: readonly LinhaDaSacola[] }) {
  return (
    <ul className="potes" aria-label="Potes na sacola">
      {linhas.map((l) => (
        <li key={l.slug} className="pote">
          <Image src={l.imagem.src} alt="" width={l.imagem.largura} height={l.imagem.altura} sizes="64px" />
          <p className="pote__nome">
            <a href={`${CAMINHO_CATALOGO}/${l.slug}`}>{l.nome}</a>
            <small>{l.tipo}</small>
            <small>{formatarPreco(l.preco)} cada</small>
          </p>
          <div className="pote__acoes">
            <Quantidade valor={l.quantos} de={l.nome} compacta aoMudar={(n) => definirQuantidade(l.slug, n)} />
            <button type="button" className="sacola__tirar" aria-label={`Tirar ${l.nome} da sacola`} onClick={() => tirarDaSacola(l.slug)}>
              Tirar
            </button>
          </div>
          <b className="pote__preco">{formatarPreco(l.total)}</b>
        </li>
      ))}
    </ul>
  )
}

type PropsEntrega = {
  id: string
  inicial: Entrega | null
  ocupado: boolean
  setOcupado: (b: boolean) => void
  aoCotar: (e: Entrega) => void
  aoMudar: () => void
}

function FormEntrega({ id, inicial, ocupado, setOcupado, aoCotar, aoMudar }: PropsEntrega) {
  const [cep, setCep] = useState(inicial?.cep ?? '')
  const [numero, setNumero] = useState(inicial?.numero ?? '')
  const [complemento, setComplemento] = useState(inicial?.complemento ?? '')
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (ocupado) return
    setOcupado(true)
    const r = await cotarEntregaDeExemplo(cep, numero)
    setOcupado(false)
    if (r.tipo === 'erro') return setErro(r.mensagem)
    setErro(null)
    aoCotar({ cep, numero: numero.trim(), complemento: complemento.trim(), cotacao: r.cotacao })
  }

  const mudou = () => {
    setErro(null)
    if (inicial) aoMudar()
  }

  return (
    <form id={id} className="campos" onSubmit={enviar} noValidate aria-busy={ocupado}>
      <label className="campo campo--cep">
        <span>CEP</span>
        <input
          name="cep"
          inputMode="numeric"
          autoComplete="postal-code"
          value={cep}
          onChange={(e) => (setCep(mascararCep(e.target.value)), mudou())}
          aria-invalid={erro?.startsWith('Confira') || erro?.startsWith('O Uber') || undefined}
          aria-describedby={`${id}-erro`}
          required
        />
      </label>
      <label className="campo campo--numero">
        <span>Número</span>
        <input
          name="numero"
          autoComplete="address-line2"
          value={numero}
          onChange={(e) => (setNumero(e.target.value.slice(0, 10)), mudou())}
          aria-invalid={erro?.startsWith('Falta') || undefined}
          aria-describedby={`${id}-erro`}
          required
        />
      </label>
      <label className="campo campo--largo">
        <span>Complemento (opcional)</span>
        <input name="complemento" autoComplete="address-line3" value={complemento} onChange={(e) => setComplemento(e.target.value.slice(0, 60))} />
      </label>
      <p id={`${id}-erro`} className="campos__erro" aria-live="polite">
        {erro ?? ''}
      </p>
    </form>
  )
}

function FormDados({ id, inicial, aoConfirmar }: { id: string; inicial: Dados | null; aoConfirmar: (d: Dados) => void }) {
  const [d, setD] = useState<Dados>(inicial ?? { nome: '', celular: '', email: '' })
  const [erros, setErros] = useState<ErrosDosDados>({})
  const primeiro = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const campo = Object.keys(erros)[0]
    if (campo) primeiro.current?.querySelector<HTMLInputElement>(`[name="${campo}"]`)?.focus()
  }, [erros])

  function enviar(e: FormEvent) {
    e.preventDefault()
    const limpos = { nome: d.nome.trim(), celular: d.celular, email: d.email.trim() }
    const achados = validarDados(limpos)
    setErros(achados)
    if (Object.keys(achados).length === 0) aoConfirmar(limpos)
  }

  const campo = (nome: keyof Dados, rotulo: string, extra: Partial<InputHTMLAttributes<HTMLInputElement>>, mascara = (v: string) => v) => (
    <div className={`campo ${nome === 'email' ? 'campo--largo' : 'campo--meio'}`}>
      <label htmlFor={`${id}-campo-${nome}`}>{rotulo}</label>
      <input
        id={`${id}-campo-${nome}`}
        name={nome}
        value={d[nome]}
        onChange={(e) => setD({ ...d, [nome]: mascara(e.target.value) })}
        aria-invalid={erros[nome] ? true : undefined}
        aria-describedby={erros[nome] ? `${id}-${nome}` : undefined}
        required
        {...extra}
      />
      {erros[nome] ? (
        <small id={`${id}-${nome}`} className="campo__erro">
          {erros[nome]}
        </small>
      ) : null}
    </div>
  )

  return (
    <form id={id} ref={primeiro} className="campos" onSubmit={enviar} noValidate>
      {campo('nome', 'Nome', { autoComplete: 'name', maxLength: 80 })}
      {campo('celular', 'Celular (WhatsApp)', { autoComplete: 'tel-national', inputMode: 'tel' }, mascararCelular)}
      {campo('email', 'E-mail', { autoComplete: 'email', inputMode: 'email', type: 'email', maxLength: 120 })}
    </form>
  )
}

function PedidoFeito({ feito }: { feito: Feito }) {
  const subtotal = somarLinhas(feito.linhas)
  return (
    <section className="feito" aria-labelledby="pedido-feito">
      <Titulo frase="recebido" id="pedido-feito" foco>
        Pedido {feito.numero}
      </Titulo>
      <p className="feito__texto">
        Este é um pedido de exemplo: nada foi cobrado e nenhum pote sai da cozinha ainda. Quando o pagamento
        estiver ligado, {feito.dados.nome.split(' ')[0]}, a confirmação chega no {feito.dados.celular}.
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
          <dt>Entrega pelo Uber (valor de exemplo), {descreverEndereco(feito.entrega)}</dt>
          <dd>{formatarPreco(feito.entrega.cotacao.valor)}</dd>
        </div>
        <div className="resumo__total">
          <dt>Total, {feito.pagamento === 'pix' ? 'no Pix' : 'no cartão'}</dt>
          <dd>{formatarPreco(subtotal + feito.entrega.cotacao.valor)}</dd>
        </div>
      </dl>
      <BotaoRetro href={CAMINHO_CATALOGO} escuro>
        Voltar ao catálogo
      </BotaoRetro>
    </section>
  )
}

/** O h1 da pagina, em duas vozes: segue o estado (lendo, vazia, aberta, feita). */
function Titulo({ children, frase, id, foco }: { children: ReactNode; frase?: string; id?: string; foco?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (foco) ref.current?.focus()
  }, [foco])
  return (
    <h1 ref={ref} id={id} tabIndex={foco ? -1 : undefined} className="sacola-pagina__titulo">
      {children} {frase ? <em>{frase}</em> : null}
    </h1>
  )
}