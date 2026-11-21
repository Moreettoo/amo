'use client'

import { useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { cotarEntrega } from '@/app/sacola/acoes'
import { mascararCep } from '@/lib/entrega'
import { MENSAGENS_DO_FECHAMENTO, type CodigoDoFechamento, type Cotacao, type RespostaDaCotacao } from '@/lib/fechamento/tipos'
import type { EnderecoDigitado } from './progresso'

type Campo = keyof EnderecoDigitado
type Erro = { codigo: CodigoDoFechamento; campos: Partial<Record<Campo, string>> }

type Props = {
  /** o id do formulario, que o botao do resumo envia pelo atributo form */
  id: string
  endereco: EnderecoDigitado
  aoMudarEndereco: (e: EnderecoDigitado) => void
  /** a cotacao do endereco atual, se houver (mudar o endereco a apaga) */
  cotacao: Cotacao | null
  ocupado: boolean
  setOcupado: (b: boolean) => void
  aoCotar: (c: Cotacao) => void
  /** a frase que trouxe a cliente de volta a esta etapa (a entrega venceu ao pagar) */
  aviso?: CodigoDoFechamento | null
}

/** A cotacao que vence antes disso e pedida de novo. */
const FOLGA_MS = 60_000

/**
 * A etapa 2: CEP, numero e complemento, cotados no servidor (cotarEntrega).
 * O erro de um campo fica embaixo dele; o erro geral, na linha de erro da
 * etapa, que e uma regiao viva.
 */
export function EtapaEntrega({ id, endereco, aoMudarEndereco, cotacao, ocupado, setOcupado, aoCotar, aviso = null }: Props) {
  const [erro, setErro] = useState<Erro | null>(null)
  const formulario = useRef<HTMLFormElement>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (ocupado) return
    // a cotacao do mesmo endereco, ainda longe de vencer, segue sem perguntar de novo
    if (cotacao && Date.parse(cotacao.expiraEm) - Date.now() > FOLGA_MS) return aoCotar(cotacao)
    setOcupado(true)
    let r: RespostaDaCotacao
    try {
      r = await cotarEntrega({ cep: endereco.cep, numero: endereco.numero, complemento: endereco.complemento })
    } catch {
      r = { ok: false, erro: 'tente_de_novo' }
    }
    setOcupado(false)
    if (!r.ok) {
      const campos = r.campos ?? {}
      setErro({ codigo: r.erro, campos })
      // so depois de enviar o foco vai ao primeiro campo marcado, para o leitor
      // de tela dizer o que falta; enquanto ela digita, o foco nunca anda
      const primeiro = Object.keys(campos)[0]
      if (primeiro) requestAnimationFrame(() => formulario.current?.querySelector<HTMLInputElement>('[name="' + primeiro + '"]')?.focus())
      return
    }
    setErro(null)
    aoCotar(r.cotacao)
  }

  function mudar(campo: Campo, valor: string) {
    if (erro) {
      // o campo mexido perde o erro; sem erro em campo nenhum, a linha geral tambem some
      const campos = { ...erro.campos }
      delete campos[campo]
      setErro(Object.keys(campos).length > 0 ? { ...erro, campos } : null)
    }
    aoMudarEndereco({ ...endereco, [campo]: valor })
  }

  const campo = (nome: Campo, rotulo: string, classe: string, aplicar: (v: string) => string, extra: InputHTMLAttributes<HTMLInputElement>) => {
    const falha = erro?.campos[nome]
    return (
      <div className={`campo ${classe}`}>
        <label htmlFor={`${id}-${nome}`}>{rotulo}</label>
        <input
          id={`${id}-${nome}`}
          name={nome}
          value={endereco[nome]}
          onChange={(e) => mudar(nome, aplicar(e.target.value))}
          aria-invalid={falha ? true : undefined}
          aria-describedby={falha ? `${id}-${nome}-erro ${id}-erro` : `${id}-erro`}
          {...extra}
        />
        {falha ? (
          <small id={`${id}-${nome}-erro`} className="campo__erro">
            {falha}
          </small>
        ) : null}
      </div>
    )
  }

  return (
    <form id={id} ref={formulario} className="campos" onSubmit={enviar} noValidate aria-busy={ocupado}>
      {campo('cep', 'CEP', 'campo--cep', mascararCep, { inputMode: 'numeric', autoComplete: 'postal-code', required: true })}
      {campo('numero', 'Número', 'campo--numero', (v) => v.slice(0, 10), { autoComplete: 'address-line2', required: true })}
      {campo('complemento', 'Complemento (opcional)', 'campo--largo', (v) => v.slice(0, 60), { autoComplete: 'address-line3' })}
      <p id={`${id}-erro`} className="campos__erro" aria-live="polite">
        {erro ? MENSAGENS_DO_FECHAMENTO[erro.codigo] : aviso ? MENSAGENS_DO_FECHAMENTO[aviso] : ''}
      </p>
    </form>
  )
}
