'use client'

import { useActionState, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { Campo, CampoSenha, Enviar } from '@/components/conta/pecas'
import { Turnstile } from '@/components/conta/Turnstile'
import {
  cancelarPedido,
  consultarCep,
  definirMarketing,
  removerEndereco,
  salvarEndereco,
  salvarPerfil,
  tornarPrincipal,
  trocarEmail,
  trocarSenha,
  type Resposta,
} from '@/app/conta/acoes'
import { MAXIMO_DE_ENDERECOS, UFS, type EnderecoNovo } from '@/lib/conta/regras'
import { AVISOS, MENSAGENS } from '@/lib/conta/mensagens'
import { mascararCelular } from '@/lib/pedido'

/**
 * Os formularios de Minha conta. Cada um chama a sua acao de servidor e diz a
 * resposta numa linha ja reservada que o leitor de tela anuncia; o erro de
 * cada campo fica embaixo dele. Nada daqui fala com o banco.
 */

type Acao = (anterior: Resposta | null, form: FormData) => Promise<Resposta>

const erroDoCampo = (r: Resposta | null, campo: string) => (r && !r.ok ? r.campos?.[campo] : undefined)

/** A linha da resposta: o aviso em expresso, o erro em cobre de leitura. */
function RespostaDaAcao({ resposta }: { resposta: Resposta | null }) {
  const texto = !resposta ? '' : resposta.ok ? (resposta.aviso ? AVISOS[resposta.aviso] : '') : MENSAGENS[resposta.erro]
  return (
    <p className={resposta && !resposta.ok ? 'painel__resposta painel__resposta--erro' : 'painel__resposta'} aria-live="polite">
      {texto}
    </p>
  )
}

export function FormPerfil({ nome, celular }: { nome: string; celular: string }) {
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(salvarPerfil, null)
  const [cel, setCel] = useState(() => mascararCelular(celular))
  return (
    <form action={enviar} className="painel__form" noValidate>
      <div className="painel__par">
        <Campo rotulo="Nome" name="nome" autoComplete="name" defaultValue={nome} largura="meio" erro={erroDoCampo(resposta, 'nome')} />
        <Campo
          rotulo="Celular"
          name="celular"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          largura="meio"
          value={cel}
          onChange={(e) => setCel(mascararCelular(e.target.value))}
          erro={erroDoCampo(resposta, 'celular')}
        />
      </div>
      <div className="painel__fim">
        <Enviar enviando={enviando} rotulo="Salvar" rotuloEnviando="Salvando" />
        <RespostaDaAcao resposta={resposta} />
      </div>
    </form>
  )
}

/**
 * Com JavaScript a caixa salva sozinha ao mudar; sem ele, o botao de texto envia.
 * A acao vai direto ao useActionState, sem funcao em volta: so com a referencia
 * da acao de servidor o servidor escreve o formulario que envia sem JavaScript.
 */
export function FormNovidades({ aceita }: { aceita: boolean }) {
  // a caixa segue o estado pelo defaultChecked: e a ele que o reinicio do formulario volta
  const [marcada, setMarcada] = useState(aceita)
  const [resposta, enviar] = useActionState<Resposta | null, FormData>(definirMarketing, null)
  // a escolha que nao salvou volta a do banco: `aceita`, que a pagina traz de novo depois de cada escolha salva
  const [respostaVista, setRespostaVista] = useState(resposta)
  if (resposta !== respostaVista) {
    setRespostaVista(resposta)
    if (resposta && !resposta.ok) setMarcada(aceita)
  }
  return (
    <form action={enviar} className="painel__form painel__form--linha">
      <div className="marcar">
        <input
          id="novidades"
          type="checkbox"
          name="novidades"
          defaultChecked={marcada}
          onChange={(e) => {
            setMarcada(e.target.checked)
            e.currentTarget.form?.requestSubmit()
          }}
        />
        <label htmlFor="novidades">Quero receber novidades e sabores novos por e-mail.</label>
      </div>
      <button type="submit" className="conta__texto-botao painel__sem-js">
        Salvar a escolha
      </button>
      <RespostaDaAcao resposta={resposta} />
    </form>
  )
}

const ENDERECO_VAZIO: EnderecoNovo = {
  apelido: null,
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: 'SP',
  principal: false,
}
const cepComTraco = (cep: string) => (cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep)

type FormEnderecoProps = {
  id?: string
  inicial?: EnderecoNovo
  primeiro?: boolean
  /** o primeiro campo recebe o foco ao abrir */
  focar?: boolean
  aoDesistir?: () => void
  /** depois de guardar: quem abriu o formulario o fecha */
  aoSalvar?: () => void
}

/**
 * Um endereco, novo ou para alterar. O CEP completo preenche rua, bairro,
 * cidade e estado (ViaCEP, pelo servidor); o que a cliente ja escreveu fica.
 * A acao vai direto ao useActionState, como nas novidades: sem JavaScript o
 * formulario do endereco novo nasce aberto e envia.
 */
export function FormEndereco({ id = '', inicial = ENDERECO_VAZIO, primeiro = false, focar = false, aoDesistir, aoSalvar }: FormEnderecoProps) {
  const [campos, setCampos] = useState({ ...inicial, cep: cepComTraco(inicial.cep) })
  const [buscando, setBuscando] = useState(false)
  const [avisoDoCep, setAvisoDoCep] = useState('')
  // embaixo do campo de 160 px vai a frase curta; a completa vai ao leitor de tela
  const [cepNaoAchado, setCepNaoAchado] = useState(false)
  // o ultimo CEP buscado (ou o guardado): passar pelo campo sem mudar nao busca nem troca a rua corrigida a mao
  const cepBuscado = useRef(inicial.cep.replace(/\D/g, ''))
  // cada busca leva um numero: a que volta depois de outra ter saido e de um CEP que ja nao esta no campo
  const buscaDoCep = useRef(0)
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(salvarEndereco, null)
  // cada resposta e vista uma vez: o endereco novo guardado volta vazio, para nao guardar de novo
  const [respostaVista, setRespostaVista] = useState(resposta)
  if (resposta !== respostaVista) {
    setRespostaVista(resposta)
    if (resposta?.ok) {
      if (!id) setCampos({ ...ENDERECO_VAZIO })
      setAvisoDoCep('')
    }
  }
  // e quem abriu o formulario o fecha
  const depoisDeGuardar = useEffectEvent(() => aoSalvar?.())
  useLayoutEffect(() => {
    if (resposta?.ok) depoisDeGuardar()
  }, [resposta])
  const mudar = (campo: keyof EnderecoNovo) => (e: { target: { value: string } }) => setCampos((c) => ({ ...c, [campo]: e.target.value }))
  const erro = (campo: string) => erroDoCampo(resposta, campo)

  async function preencherPeloCep(valor: string) {
    if (!/^\d{5}-?\d{3}$/.test(valor.trim())) return
    const digitos = valor.replace(/\D/g, '')
    if (digitos === cepBuscado.current) return
    cepBuscado.current = digitos
    const busca = ++buscaDoCep.current
    // a rua e o bairro do comeco da busca: na volta, so troca o campo que ainda esta igual
    const { logradouro: ruaAntes, bairro: bairroAntes } = campos
    setBuscando(true)
    const achado = await consultarCep(valor)
    // outra busca saiu depois desta: a resposta velha nao mexe em nada, nem no "buscando" da nova
    if (busca !== buscaDoCep.current) return
    setBuscando(false)
    if (!achado) {
      cepBuscado.current = '' // nao achou (ou o limite estourou): passar de novo tenta de novo
      setCepNaoAchado(true)
      setAvisoDoCep('Não achamos esse CEP. Confira os números ou escreva a rua, o bairro e a cidade.')
      return
    }
    setAvisoDoCep('')
    setCepNaoAchado(false)
    // o CEP manda na rua, no bairro, na cidade e no estado; numero e complemento ficam
    setCampos((c) => ({
      ...c,
      logradouro: c.logradouro === ruaAntes ? achado.logradouro || c.logradouro : c.logradouro,
      bairro: c.bairro === bairroAntes ? achado.bairro || c.bairro : c.bairro,
      cidade: achado.cidade,
      uf: achado.uf,
    }))
  }

  const prefixo = id || 'novo'
  return (
    <form action={enviar} className="painel__form painel__endereco" noValidate>
      <input type="hidden" name="id" value={id} />
      <div className="campos">
        <Campo rotulo="Nome do lugar (opcional)" name="apelido" largura="meio" autoFocus={focar} value={campos.apelido ?? ''} onChange={mudar('apelido')} erro={erro('apelido')} />
        <Campo
          rotulo={buscando ? 'CEP (buscando o endereço)' : 'CEP'}
          name="cep"
          inputMode="numeric"
          autoComplete="postal-code"
          largura="cep"
          value={campos.cep}
          onChange={mudar('cep')}
          onBlur={(e) => preencherPeloCep(e.target.value)}
          erro={erro('cep') || (cepNaoAchado ? 'Não achamos esse CEP.' : undefined)}
        />
        <Campo rotulo="Rua" name="logradouro" autoComplete="address-line1" value={campos.logradouro} onChange={mudar('logradouro')} erro={erro('logradouro')} />
        <Campo rotulo="Número" name="numero" largura="numero" value={campos.numero} onChange={mudar('numero')} erro={erro('numero')} />
        <Campo rotulo="Complemento (opcional)" name="complemento" largura="meio" value={campos.complemento} onChange={mudar('complemento')} erro={erro('complemento')} />
        <Campo rotulo="Bairro" name="bairro" largura="meio" value={campos.bairro} onChange={mudar('bairro')} erro={erro('bairro')} />
        <Campo rotulo="Cidade" name="cidade" largura="meio" value={campos.cidade} onChange={mudar('cidade')} erro={erro('cidade')} />
        <div className="campo campo--uf">
          <label htmlFor={`${prefixo}-uf`}>Estado</label>
          <select id={`${prefixo}-uf`} name="uf" value={campos.uf} onChange={mudar('uf')}>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {avisoDoCep}
      </p>
      {!inicial.principal && !primeiro ? (
        <div className="marcar">
          <input id={`${prefixo}-principal`} type="checkbox" name="principal" />
          <label htmlFor={`${prefixo}-principal`}>Usar como endereço principal</label>
        </div>
      ) : (
        <input type="hidden" name="principal" value={primeiro || inicial.principal ? 'on' : ''} />
      )}
      <div className="painel__fim">
        <Enviar enviando={enviando} rotulo={id ? 'Salvar o endereço' : 'Guardar o endereço'} rotuloEnviando="Guardando" />
        {aoDesistir ? (
          <button type="button" className="conta__texto-botao" onClick={aoDesistir}>
            Desistir
          </button>
        ) : null}
        <RespostaDaAcao resposta={resposta} />
      </div>
    </form>
  )
}

/** Um botao de acao sobre um endereco, num formulario so dele; o aria-label diz de qual endereco, quando o texto nao diz. */
function AcaoDoEndereco({
  acao,
  id,
  rotulo,
  rotuloEnviando,
  focar = false,
  semJs = false,
  'aria-label': nomeLido,
}: {
  acao: Acao
  id: string
  rotulo: string
  rotuloEnviando: string
  focar?: boolean
  semJs?: boolean
  'aria-label'?: string
}) {
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(acao, null)
  return (
    <form action={enviar} className={semJs ? 'painel__acao painel__sem-js' : 'painel__acao'}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={semJs ? 'conta__texto-botao painel__sem-js' : 'conta__texto-botao'} disabled={enviando} autoFocus={focar} aria-label={nomeLido}>
        {enviando ? rotuloEnviando : rotulo}
      </button>
      <RespostaDaAcao resposta={resposta} />
    </form>
  )
}

type ItemProps = { id: string; endereco: EnderecoNovo; texto: React.ReactNode; nome: string }

/** Um endereco guardado: o texto e as acoes; "Alterar" abre o formulario no lugar. */
export function ItemDeEndereco({ id, endereco, texto, nome }: ItemProps) {
  const [alterando, setAlterando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  // ao fechar a alteracao ou a confirmacao, o foco volta ao botao que as abriu
  const [voltar, setVoltar] = useState<'alterar' | 'remover' | null>(null)
  const fecharAlteracao = () => {
    setAlterando(false)
    setVoltar('alterar')
  }
  if (alterando) return <FormEndereco id={id} inicial={endereco} focar aoDesistir={fecharAlteracao} aoSalvar={fecharAlteracao} />
  return (
    <div className="endereco">
      <p className="endereco__nome">
        <b>{nome}</b>
        {endereco.principal ? <span className="endereco__principal">Principal</span> : null}
      </p>
      <p className="endereco__texto">{texto}</p>
      <div className="endereco__acoes">
        <button type="button" className="conta__texto-botao so-js" onClick={() => setAlterando(true)} aria-label={`Alterar ${nome}`} autoFocus={voltar === 'alterar'}>
          Alterar
        </button>
        {endereco.principal ? null : <AcaoDoEndereco acao={tornarPrincipal} id={id} rotulo="Tornar principal" rotuloEnviando="Trocando" />}
        {removendo ? (
          <span className="endereco__confirmar">
            <AcaoDoEndereco acao={removerEndereco} id={id} rotulo="Sim, remover" rotuloEnviando="Removendo" focar />
            <button
              type="button"
              className="conta__texto-botao"
              onClick={() => {
                setRemovendo(false)
                setVoltar('remover')
              }}
            >
              Manter
            </button>
          </span>
        ) : (
          <>
            <button type="button" className="conta__texto-botao so-js" onClick={() => setRemovendo(true)} aria-label={`Remover ${nome}`} autoFocus={voltar === 'remover'}>
              Remover
            </button>
            {/* sem JavaScript nao ha confirmacao no lugar: o botao envia direto */}
            <AcaoDoEndereco acao={removerEndereco} id={id} rotulo="Remover" rotuloEnviando="Removendo" semJs aria-label={`Remover ${nome}`} />
          </>
        )}
      </div>
    </div>
  )
}

/** O botao que abre o formulario do endereco novo; sem JavaScript o formulario ja nasce aberto. */
export function NovoEndereco({ primeiro, cheio }: { primeiro: boolean; cheio: boolean }) {
  const [aberto, setAberto] = useState(primeiro)
  const [aviso, setAviso] = useState('')
  const [voltar, setVoltar] = useState(false)
  // cada abertura monta um formulario novo: sem a resposta da vez anterior, e o autoFocus age
  const [vez, setVez] = useState(0)
  const nota = useRef<HTMLParagraphElement>(null)
  const fechar = (texto: string) => {
    setAberto(false)
    setAviso(texto)
    setVoltar(true)
  }
  // aberto, o formulario fica mesmo com 5: a resposta do quinto chega junto com a pagina cheia, e e ele quem fecha
  const comFormulario = aberto || !cheio
  // fechado com 5, o botao que tinha o foco saiu e nao ha "Adicionar endereco": o foco vai para a nota
  const focarNota = !comFormulario && voltar
  useLayoutEffect(() => {
    if (focarNota) nota.current?.focus()
  }, [focarNota])
  return (
    <div className={aberto ? 'novo-endereco novo-endereco--aberto' : 'novo-endereco'}>
      {aberto || cheio ? null : (
        <button
          type="button"
          className="btn-retro btn-retro--escuro so-js"
          autoFocus={voltar}
          onClick={() => {
            setAberto(true)
            setAviso('')
            setVez((v) => v + 1)
          }}
        >
          Adicionar endereço
        </button>
      )}
      <p className="painel__resposta" aria-live="polite">
        {aviso}
      </p>
      {comFormulario ? (
        <div className="novo-endereco__form">
          <FormEndereco
            key={vez}
            primeiro={primeiro}
            focar={aberto && !primeiro}
            aoDesistir={primeiro ? undefined : () => fechar('')}
            aoSalvar={() => fechar('Endereço guardado.')}
          />
        </div>
      ) : (
        <p ref={nota} className="painel__nota" tabIndex={focarNota ? -1 : undefined}>
          {`Já são ${MAXIMO_DE_ENDERECOS} endereços: para guardar outro, remova um.`}
        </p>
      )}
    </div>
  )
}

export function FormEmail({ email }: { email: string }) {
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(trocarEmail, null)
  return (
    <form action={enviar} className="painel__form" noValidate>
      <p className="painel__valor">
        Agora: <b>{email}</b>
      </p>
      <Campo
        rotulo="E-mail novo"
        name="email"
        type="email"
        autoComplete="email"
        dica="A troca vale depois que você confirmar nos dois e-mails, o atual e o novo."
        erro={erroDoCampo(resposta, 'email')}
      />
      <div className="painel__fim painel__fim--largo">
        <RespostaDaAcao resposta={resposta} />
        <Enviar enviando={enviando} rotulo="Trocar o e-mail" rotuloEnviando="Enviando" />
      </div>
    </form>
  )
}

export function FormSenha({ chave, nonce }: { chave: string; nonce: string }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(async (anterior, form) => {
    const r = await trocarSenha(anterior, form)
    if (r.ok) {
      setAtual('')
      setNova('')
    }
    return r
  }, null)
  return (
    <form action={enviar} className="painel__form" noValidate>
      <CampoSenha rotulo="Senha atual" name="atual" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} erro={erroDoCampo(resposta, 'atual')} />
      <CampoSenha
        rotulo="Senha nova"
        name="nova"
        autoComplete="new-password"
        dica="8 caracteres ou mais."
        value={nova}
        onChange={(e) => setNova(e.target.value)}
        erro={erroDoCampo(resposta, 'nova')}
      />
      {/* como nas portas: a resposta em cima do botao; a nota e "Esqueci a senha" logo embaixo */}
      <div className="painel__fim painel__fim--largo">
        <Turnstile chave={chave} nonce={nonce} reiniciar={resposta} />
        <RespostaDaAcao resposta={resposta} />
        <Enviar enviando={enviando} rotulo="Trocar a senha" rotuloEnviando="Trocando a senha" />
        <p className="painel__nota">Trocar a senha encerra a conta nos outros aparelhos.</p>
        <p className="painel__nota">
          <a href="/esqueci-a-senha">Esqueci a senha</a>
        </p>
      </div>
    </form>
  )
}

/**
 * No celular o sumario e uma fileira que rola de lado: a etiqueta da pagina
 * atual vem para a vista ao abrir. Sem JavaScript a fileira comeca do inicio.
 */
export function RolarAteAtual() {
  useEffect(() => {
    const atual = document.querySelector('.painel__item--atual')
    if (typeof atual?.scrollIntoView === 'function') atual.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [])
  return null
}

/** Cancelar pede confirmacao no lugar, sem janela por cima. */
export function CancelarPedido({ numero }: { numero: string }) {
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(cancelarPedido, null)
  const [certeza, setCerteza] = useState(false)
  const [voltar, setVoltar] = useState(false)
  return (
    <form action={enviar} className="cancelar-pedido">
      <input type="hidden" name="numero" value={numero} />
      {certeza ? (
        <>
          <p className="painel__nota">O pedido sai da fila e nada é cobrado.</p>
          <div className="cancelar-pedido__escolha">
            <button type="submit" className="btn-retro btn-retro--escuro" disabled={enviando} autoFocus>
              {enviando ? 'Cancelando' : 'Sim, cancelar'}
            </button>
            <button
              type="button"
              className="conta__texto-botao"
              onClick={() => {
                setCerteza(false)
                setVoltar(true)
              }}
            >
              Manter o pedido
            </button>
          </div>
        </>
      ) : (
        <>
          <button type="button" className="conta__texto-botao so-js" onClick={() => setCerteza(true)} autoFocus={voltar}>
            Cancelar pedido
          </button>
          {/* sem JavaScript nao ha confirmacao no lugar: o botao envia direto */}
          <button type="submit" className="conta__texto-botao painel__sem-js">
            Cancelar pedido
          </button>
        </>
      )}
      <RespostaDaAcao resposta={resposta} />
    </form>
  )
}
