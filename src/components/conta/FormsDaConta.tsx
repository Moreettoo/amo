'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
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
import { UFS, type EnderecoNovo } from '@/lib/conta/regras'
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

/** Com JavaScript a caixa salva sozinha ao mudar; sem ele, o botao de texto envia. */
export function FormNovidades({ aceita }: { aceita: boolean }) {
  const [resposta, enviar] = useActionState<Resposta | null, FormData>(definirMarketing, null)
  // a caixa segue o estado pelo defaultChecked: e a ele que o reinicio do formulario volta
  const [marcada, setMarcada] = useState(aceita)
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
 */
export function FormEndereco({ id = '', inicial = ENDERECO_VAZIO, primeiro = false, focar = false, aoDesistir, aoSalvar }: FormEnderecoProps) {
  const [campos, setCampos] = useState({ ...inicial, cep: cepComTraco(inicial.cep) })
  const [buscando, setBuscando] = useState(false)
  const [avisoDoCep, setAvisoDoCep] = useState('')
  // o ultimo CEP buscado (ou o guardado): passar pelo campo sem mudar nao busca nem troca a rua corrigida a mao
  const cepBuscado = useRef(inicial.cep.replace(/\D/g, ''))
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(async (anterior, form) => {
    const r = await salvarEndereco(anterior, form)
    if (r.ok) {
      // o endereco novo foi guardado: o formulario volta vazio, para nao guardar de novo
      if (!id) setCampos({ ...ENDERECO_VAZIO })
      setAvisoDoCep('')
      aoSalvar?.()
    }
    return r
  }, null)
  const mudar = (campo: keyof EnderecoNovo) => (e: { target: { value: string } }) => setCampos((c) => ({ ...c, [campo]: e.target.value }))
  const erro = (campo: string) => erroDoCampo(resposta, campo)

  async function preencherPeloCep(valor: string) {
    if (!/^\d{5}-?\d{3}$/.test(valor.trim())) return
    const digitos = valor.replace(/\D/g, '')
    if (digitos === cepBuscado.current) return
    cepBuscado.current = digitos
    setBuscando(true)
    const achado = await consultarCep(valor)
    setBuscando(false)
    if (!achado) {
      cepBuscado.current = '' // nao achou (ou o limite estourou): passar de novo tenta de novo
      setAvisoDoCep('Não achamos esse CEP. Confira os números ou escreva a rua, o bairro e a cidade.')
      return
    }
    setAvisoDoCep('')
    // o CEP manda na rua, no bairro, na cidade e no estado; numero e complemento ficam
    setCampos((c) => ({
      ...c,
      logradouro: achado.logradouro || c.logradouro,
      bairro: achado.bairro || c.bairro,
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
          erro={erro('cep') || avisoDoCep}
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

/** Um botao de acao sobre um endereco, num formulario so dele. */
function AcaoDoEndereco({ acao, id, rotulo, rotuloEnviando, focar = false }: { acao: Acao; id: string; rotulo: string; rotuloEnviando: string; focar?: boolean }) {
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(acao, null)
  return (
    <form action={enviar} className="painel__acao">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="conta__texto-botao" disabled={enviando} autoFocus={focar}>
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
          <button type="button" className="conta__texto-botao" onClick={() => setRemovendo(true)} aria-label={`Remover ${nome}`} autoFocus={voltar === 'remover'}>
            Remover
          </button>
        )}
      </div>
    </div>
  )
}

/** O botao que abre o formulario do endereco novo; sem JavaScript o formulario ja nasce aberto. */
export function NovoEndereco({ primeiro }: { primeiro: boolean }) {
  const [aberto, setAberto] = useState(primeiro)
  const [aviso, setAviso] = useState('')
  const [voltar, setVoltar] = useState(false)
  // cada abertura monta um formulario novo: sem a resposta da vez anterior, e o autoFocus age
  const [vez, setVez] = useState(0)
  const fechar = (texto: string) => {
    setAberto(false)
    setAviso(texto)
    setVoltar(true)
  }
  return (
    <div className={aberto ? 'novo-endereco novo-endereco--aberto' : 'novo-endereco'}>
      {aberto ? null : (
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
      <div className="novo-endereco__form">
        <FormEndereco
          key={vez}
          primeiro={primeiro}
          focar={aberto && !primeiro}
          aoDesistir={primeiro ? undefined : () => fechar('')}
          aoSalvar={() => fechar('Endereço guardado.')}
        />
      </div>
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
      <Campo rotulo="E-mail novo" name="email" type="email" autoComplete="email" erro={erroDoCampo(resposta, 'email')} />
      <div className="painel__fim painel__fim--largo">
        <Enviar enviando={enviando} rotulo="Trocar o e-mail" rotuloEnviando="Enviando" />
        <RespostaDaAcao resposta={resposta} />
      </div>
      <p className="painel__nota">A troca vale depois que você confirmar nos dois e-mails, o atual e o novo.</p>
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
      <div className="painel__fim painel__fim--largo">
        <Turnstile chave={chave} nonce={nonce} reiniciar={resposta} />
        <Enviar enviando={enviando} rotulo="Trocar a senha" rotuloEnviando="Trocando a senha" />
        <RespostaDaAcao resposta={resposta} />
      </div>
      <p className="painel__nota">Trocar a senha encerra a conta nos outros aparelhos.</p>
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
        <button type="button" className="conta__texto-botao" onClick={() => setCerteza(true)} autoFocus={voltar}>
          Cancelar pedido
        </button>
      )}
      <RespostaDaAcao resposta={resposta} />
    </form>
  )
}
