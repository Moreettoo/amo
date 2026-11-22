'use client'

import Script from 'next/script'
import { useEffect, useId, useImperativeHandle, useRef, useState, type RefObject } from 'react'

/** O que o getFormData do Brick devolve (contrato do Mercado Pago, 6). */
export type DadosDoBrick = {
  formData: {
    token: string
    payment_method_id: string
    installments: number
    payer?: { identification?: { type?: string; number?: string } }
  }
  additionalData?: { lastFourDigits?: string; paymentTypeId?: string }
}

/** O que o pai usa do Brick montado: o getFormData dele (null enquanto nao ha Brick). */
export type ControleDoCartao = { getFormData: () => Promise<DadosDoBrick | null | undefined> }

type ControleDoBrick = ControleDoCartao & { unmount: () => void }
type OpcoesDoBrick = {
  initialization: { amount: number }
  customization: {
    visual: { hidePaymentButton: boolean; style: { customVariables: Record<string, string> } }
    paymentMethods: { maxInstallments: number }
  }
  callbacks: { onReady: () => void; onError: (erro?: { type?: string }) => void; onSubmit: () => Promise<void> }
}

declare global {
  interface Window {
    MercadoPago?: new (chave: string, opcoes: { locale: string }) => {
      bricks: () => { create: (tipo: 'cardPayment', lugar: string, opcoes: OpcoesDoBrick) => Promise<ControleDoBrick> }
    }
  }
}

export const SDK_DO_MERCADO_PAGO = 'https://sdk.mercadopago.com/js/v2'

/**
 * As cores e a letra da casa (DESIGN.md) no Brick. Os campos do cartao moram
 * em iframes do Mercado Pago, que nao leem as variaveis da pagina: os valores
 * vao escritos. Cantos de 2 px, fio de 1 px e nenhum peso acima de 500.
 */
const VARIAVEIS: Record<string, string> = {
  textPrimaryColor: '#2B1B16', // expresso
  textSecondaryColor: '#5E4A40', // suave
  inputBackgroundColor: '#FFFBF5', // papel
  formBackgroundColor: '#FAF2E9', // creme, o chao da sacola: o formulario nao vira caixa
  baseColor: '#2B1B16', // expresso: o escolhido e o foco no chao claro
  baseColorFirstVariant: '#4A2E25', // chocolate
  baseColorSecondVariant: '#9A5530', // cobre de leitura
  errorColor: '#9A5530', // cobre de leitura, como o erro dos campos da casa
  outlinePrimaryColor: '#ABA099', // o contorno de controle: expresso a 38% sobre o creme
  outlineSecondaryColor: '#2B1B16',
  fontSizeExtraSmall: '13px',
  fontSizeSmall: '14px',
  fontSizeMedium: '15px',
  fontSizeLarge: '16px',
  fontSizeExtraLarge: '22px',
  fontWeightNormal: '400',
  fontWeightSemiBold: '500',
  inputBorderWidth: '1px',
  inputFocusedBorderWidth: '1px',
  borderRadiusSmall: '2px',
  borderRadiusMedium: '2px',
  borderRadiusLarge: '2px',
  borderRadiusFull: '2px',
  formPadding: '0px',
}

/** Os campos que pagarComCartao espera, tirados do getFormData; o documento so com o CPF que o Brick pediu. */
export function entradaDoCartao(numero: string, { formData, additionalData }: DadosDoBrick) {
  const id = formData.payer?.identification
  return {
    numero,
    token: formData.token,
    bandeira: formData.payment_method_id,
    tipo: additionalData?.paymentTypeId ?? '',
    parcelas: Number(formData.installments),
    final: additionalData?.lastFourDigits ?? '',
    ...(id?.type === 'CPF' && id.number ? { documento: { tipo: 'CPF' as const, numero: id.number } } : {}),
  }
}

type Props = {
  chave: string
  nonce: string
  valorCentavos: number
  /** o Brick esta na tela, pronto para ler o cartao */
  aoPronto: () => void
  /** o script ou o Brick nao carregou */
  aoFalhar?: () => void
  /** onde o pai acha o getFormData do Brick montado */
  controle: RefObject<ControleDoCartao | null>
}

/**
 * O script do Mercado Pago nesta pagina. O next/script nao tenta de novo o
 * que falhou, e o onError dele e o da primeira montagem, que pode ja ter
 * saido: a falha fica lembrada aqui, toda montagem nova a diz, e so os
 * cartoes montados (os ouvintes) ouvem a que chegar.
 */
const sdk = { falhou: false, ouvintes: new Set<() => void>() }
function falhaDoSdk() {
  sdk.falhou = true
  for (const ouvir of sdk.ouvintes) ouvir()
}
/** A conta das criacoes: cada Brick mora numa casa propria dentro do lugar. */
let criacoes = 0

/**
 * O cartao: o script do Mercado Pago (next/script, com o nonce da pagina) e o
 * Card Payment Brick sem o botao dele, montado no lugar com o valor em reais.
 * Quem paga e o botao do resumo, pelo getFormData que o controle expoe. Ao
 * sair (trocar para o Pix, sair da etapa), o Brick desmonta.
 */
export function CartaoMercadoPago({ chave, nonce, valorCentavos, aoPronto, aoFalhar, controle }: Props) {
  const lugar = `cartao-${useId().replace(/[^\w-]/g, '')}`
  // o script ja carregado (uma volta ao cartao) monta o Brick sem esperar
  const [carregado, setCarregado] = useState(() => typeof window !== 'undefined' && window.MercadoPago !== undefined)
  const brick = useRef<ControleDoBrick | null>(null)
  // os avisos mais novos do pai, sem desmontar o Brick a cada desenho
  const avisos = useRef({ aoPronto, aoFalhar })
  useEffect(() => {
    avisos.current = { aoPronto, aoFalhar }
  })
  useImperativeHandle(controle, () => ({ getFormData: async () => (brick.current ? brick.current.getFormData() : null) }), [])

  // montado, o cartao ouve a falha do script; a que ja aconteceu ele diz agora
  useEffect(() => {
    const ouvir = () => avisos.current.aoFalhar?.()
    if (sdk.falhou) ouvir()
    sdk.ouvintes.add(ouvir)
    return () => {
      sdk.ouvintes.delete(ouvir)
    }
  }, [])

  useEffect(() => {
    if (!carregado || sdk.falhou) return
    const MercadoPago = window.MercadoPago
    // carregou sem o MercadoPago: e falha, nesta montagem e nas proximas
    if (!MercadoPago) {
      falhaDoSdk()
      return
    }
    const guardado = brick
    let vivo = true
    let desenhado = false
    let criado: ControleDoBrick | null = null
    // a casa deste Brick: uma criacao que ficar para tras desmonta so o Brick
    // dela, numa casa que ja saiu da pagina, e nunca o Brick vivo
    const casa = document.createElement('div')
    casa.id = `${lugar}-${++criacoes}`
    // pronto e quando o Brick desenhou e o controle chegou, na ordem que vier
    const avisar = () => {
      if (vivo && desenhado && criado) avisos.current.aoPronto()
    }
    const falhar = () => {
      if (vivo) avisos.current.aoFalhar?.()
    }
    // um tique de espera: no Strict Mode a primeira montagem sai antes de criar, e o Brick nasce uma vez so
    const relogio = setTimeout(() => {
      const lugarDoBrick = document.getElementById(lugar)
      if (!lugarDoBrick) return
      lugarDoBrick.append(casa)
      let criacao: Promise<ControleDoBrick>
      try {
        criacao = new MercadoPago(chave, { locale: 'pt-BR' }).bricks().create('cardPayment', casa.id, {
          initialization: { amount: valorCentavos / 100 },
          customization: { visual: { hidePaymentButton: true, style: { customVariables: VARIAVEIS } }, paymentMethods: { maxInstallments: 12 } },
          callbacks: {
            onReady: () => {
              desenhado = true
              avisar()
            },
            // o erro de campo o Brick mostra sozinho; so o critico impede pagar
            onError: (erro) => {
              if (erro?.type === 'critical') falhar()
            },
            // sem o botao do Brick, quem paga e o botao do resumo
            onSubmit: async () => {},
          },
        })
      } catch {
        falhar()
        return
      }
      criacao.then((c) => {
        if (!vivo) return c.unmount()
        criado = c
        guardado.current = c
        avisar()
      }, falhar)
    }, 0)
    return () => {
      vivo = false
      clearTimeout(relogio)
      if (guardado.current === criado) guardado.current = null
      criado?.unmount()
      casa.remove()
    }
  }, [carregado, chave, valorCentavos, lugar])

  return (
    <>
      <Script
        id="sdk-mercadopago"
        src={SDK_DO_MERCADO_PAGO}
        strategy="afterInteractive"
        nonce={nonce}
        onReady={() => setCarregado(true)}
        onError={falhaDoSdk}
      />
      <div id={lugar} className="cartao" />
    </>
  )
}
