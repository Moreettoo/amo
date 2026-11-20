'use client'

import { useActionState, useState } from 'react'
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

type FormEnderecoProps = { id?: string; inicial?: EnderecoNovo; primeiro?: boolean; aoDesistir?: () => void }

/**
 * Um endereco, novo ou para alterar. O CEP completo preenche rua, bairro,
 * cidade e estado (ViaCEP, pelo servidor); o que a cliente ja escreveu fica.
 */
export function FormEndereco({ id = '', inicial = ENDERECO_VAZIO, primeiro = false, aoDesistir }: FormEnderecoProps) {
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(salvarEndereco, null)
  const [campos, setCampos] = useState({ ...inicial, cep: cepComTraco(inicial.cep) })
  const [buscando, setBuscando] = useState(false)
  const mudar = (campo: keyof EnderecoNovo) => (e: { target: { value: string } }) => setCampos((c) => ({ ...c, [campo]: e.target.value }))
  const erro = (campo: string) => erroDoCampo(resposta, campo)

  async function preencherPeloCep(valor: string) {
    if (!/^\d{5}-?\d{3}$/.test(valor.trim())) return
    setBuscando(true)
    const achado = await consultarCep(valor)
    setBuscando(false)
    if (!achado) return
    setCampos((c) => ({
      ...c,
      logradouro: c.logradouro || achado.logradouro,
      bairro: c.bairro || achado.bairro,
      cidade: c.cidade || achado.cidade,
      uf: achado.uf,
    }))
  }

  const prefixo = id || 'novo'
  return (
    <form action={enviar} className="painel__form painel__endereco" noValidate>
      <input type="hidden" name="id" value={id} />
      <div className="campos">
        <Campo rotulo="Nome do lugar (opcional)" name="apelido" largura="meio" value={campos.apelido ?? ''} onChange={mudar('apelido')} placeholder="Casa" erro={erro('apelido')} />
        <Campo
          rotulo={buscando ? 'CEP (buscando o endereço)' : 'CEP'}
          name="cep"
          inputMode="numeric"
          autoComplete="postal-code"
          largura="cep"
          value={campos.cep}
          onChange={mudar('cep')}
          onBlur={(e) => preencherPeloCep(e.target.value)}
          erro={erro('cep')}
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
function AcaoDoEndereco({ acao, id, rotulo, rotuloEnviando }: { acao: Acao; id: string; rotulo: string; rotuloEnviando: string }) {
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(acao, null)
  return (
    <form action={enviar} className="painel__acao">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="conta__texto-botao" disabled={enviando}>
        {enviando ? rotuloEnviando : rotulo}
      </button>
      <RespostaDaAcao resposta={resposta} />
    </form>
  )
}

type ItemProps = { id: string; endereco: EnderecoNovo; texto: string; nome: string }

/** Um endereco guardado: o texto e as acoes; "Alterar" abre o formulario no lugar. */
export function ItemDeEndereco({ id, endereco, texto, nome }: ItemProps) {
  const [alterando, setAlterando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  if (alterando) return <FormEndereco id={id} inicial={endereco} aoDesistir={() => setAlterando(false)} />
  return (
    <div className="endereco">
      <p className="endereco__nome">
        <b>{nome}</b>
        {endereco.principal ? <span className="endereco__principal">Principal</span> : null}
      </p>
      <p className="endereco__texto">{texto}</p>
      <div className="endereco__acoes">
        <button type="button" className="conta__texto-botao so-js" onClick={() => setAlterando(true)} aria-label={`Alterar ${nome}`}>
          Alterar
        </button>
        {endereco.principal ? null : <AcaoDoEndereco acao={tornarPrincipal} id={id} rotulo="Tornar principal" rotuloEnviando="Trocando" />}
        {removendo ? (
          <span className="endereco__confirmar">
            <AcaoDoEndereco acao={removerEndereco} id={id} rotulo="Sim, remover" rotuloEnviando="Removendo" />
            <button type="button" className="conta__texto-botao" onClick={() => setRemovendo(false)}>
              Manter
            </button>
          </span>
        ) : (
          <button type="button" className="conta__texto-botao" onClick={() => setRemovendo(true)} aria-label={`Remover ${nome}`}>
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
  return (
    <div className={aberto ? 'novo-endereco novo-endereco--aberto' : 'novo-endereco'}>
      {aberto ? null : (
        <button type="button" className="btn-retro btn-retro--escuro so-js" onClick={() => setAberto(true)}>
          Adicionar endereço
        </button>
      )}
      <div className="novo-endereco__form">
        <FormEndereco primeiro={primeiro} aoDesistir={primeiro ? undefined : () => setAberto(false)} />
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

/** Cancelar pede confirmacao no lugar, sem janela por cima. */
export function CancelarPedido({ numero }: { numero: string }) {
  const [resposta, enviar, enviando] = useActionState<Resposta | null, FormData>(cancelarPedido, null)
  const [certeza, setCerteza] = useState(false)
  return (
    <form action={enviar} className="cancelar-pedido">
      <input type="hidden" name="numero" value={numero} />
      {certeza ? (
        <>
          <p className="painel__nota">O pedido sai da fila e nada é cobrado.</p>
          <div className="cancelar-pedido__escolha">
            <button type="submit" className="btn-retro btn-retro--escuro" disabled={enviando}>
              {enviando ? 'Cancelando' : 'Sim, cancelar'}
            </button>
            <button type="button" className="conta__texto-botao" onClick={() => setCerteza(false)}>
              Manter o pedido
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="conta__texto-botao" onClick={() => setCerteza(true)}>
          Cancelar pedido
        </button>
      )}
      <RespostaDaAcao resposta={resposta} />
    </form>
  )
}
