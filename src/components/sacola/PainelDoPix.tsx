'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { MENSAGENS_DO_FECHAMENTO, type CodigoDoFechamento, type PagamentoNaTela } from '@/lib/fechamento/tipos'
import { horaDeSaoPaulo } from './espera'

export type PixDaTela = NonNullable<PagamentoNaTela['pix']>

type Props = {
  /** o codigo da tentativa que espera; null quando ele nao vale mais (venceu ou foi trocado por outro) */
  pix: PixDaTela | null
  aoGerarOutro: () => void
  /** enquanto o codigo novo e pedido, o botao diz o que faz */
  gerando?: boolean
  /** o que deu errado ao pedir o codigo novo */
  erro?: CodigoDoFechamento | null
}

/** Quanto tempo o "Codigo copiado." fica dito, para a segunda copia ser dita de novo. */
const COPIADO_MS = 4000

/**
 * O Pix do pedido: o QR sobre o papel, o copia e cola num campo so de leitura
 * com o botao "Copiar codigo", ate que horas vale e o que fazer. Vencido pelo
 * relogio daqui, ou trocado no servidor (pix null), diz que venceu e oferece
 * outro. A linha de cima e a do "Codigo copiado." sao regioes vivas, sempre
 * no lugar, para o leitor de tela ouvir quando mudam.
 */
export function PainelDoPix({ pix, aoGerarOutro, gerando = false, erro = null }: Props) {
  const id = useId()
  const campo = useRef<HTMLInputElement>(null)
  const vence = pix?.expiraEm ? Date.parse(pix.expiraEm) : null
  // o vencimento que ja passou por este relogio (o servidor confirma depois)
  const [vencido, setVencido] = useState<number | null>(() => (vence !== null && vence <= Date.now() ? vence : null))
  // o codigo que acabou de ser copiado
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    if (vence === null) return
    const relogio = setTimeout(() => setVencido(vence), Math.max(0, vence - Date.now()))
    return () => clearTimeout(relogio)
  }, [vence])

  useEffect(() => {
    if (copiado === null) return
    const relogio = setTimeout(() => setCopiado(null), COPIADO_MS)
    return () => clearTimeout(relogio)
  }, [copiado])

  const valendo = pix !== null && (vence === null || vencido !== vence) ? pix : null

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(codigo)
    } catch {
      // sem a API (ou sem permissao): o codigo fica selecionado, para copiar a mao
      campo.current?.focus()
      campo.current?.select()
    }
  }

  return (
    <div className="pix">
      <p className="pix__aviso" aria-live="polite">
        {valendo ? '' : erro ? MENSAGENS_DO_FECHAMENTO[erro] : 'O código venceu.'}
      </p>
      {valendo ? (
        <>
          <Image
            className="pix__qr"
            src={`data:image/png;base64,${valendo.qrBase64}`}
            alt="QR Code do Pix"
            width={220}
            height={220}
            unoptimized
          />
          <div className="pix__lado">
            <p className="pix__instrucao">Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código.</p>
            <div className="campo pix__campo">
              <label htmlFor={`${id}-codigo`}>Pix copia e cola</label>
              <input
                ref={campo}
                id={`${id}-codigo`}
                readOnly
                value={valendo.copiaECola}
                spellCheck={false}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <button type="button" className="btn-retro btn-retro--contorno pix__copiar" onClick={() => void copiar(valendo.copiaECola)}>
              Copiar código
            </button>
            <p className="pix__copiado" aria-live="polite">
              {copiado === valendo.copiaECola ? 'Código copiado.' : ''}
            </p>
            {valendo.expiraEm ? <p className="pix__validade">Vale até {horaDeSaoPaulo(valendo.expiraEm)}</p> : null}
          </div>
        </>
      ) : (
        <button
          type="button"
          className="btn-retro btn-retro--contorno pix__outro"
          onClick={aoGerarOutro}
          disabled={gerando}
          aria-busy={gerando}
        >
          {gerando ? 'Gerando outro código' : 'Gerar outro código'}
        </button>
      )}
    </div>
  )
}
