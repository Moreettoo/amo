'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { cotarEntrega } from '@/app/sacola/acoes'
import { mascararCep } from '@/lib/entrega'
import { MENSAGENS_DO_FECHAMENTO, type RespostaDaCotacao } from '@/lib/fechamento/tipos'
import { Quantidade } from '@/components/ui/Quantidade'
import { formatarPreco } from '@/lib/produto'
import { abrirGavetaDaSacola, somarNaSacola, textoPotes } from '@/lib/sacola'

type Props = { slug: string; nome: string; preco: number }

/**
 * A coluna de compra: quantidade, sacola e a entrega pelo CEP. Tudo aqui
 * precisa de JS (.so-js): sem ele a pagina mostra o produto e o preco, sem
 * botao que nao faz nada. No celular, quando o botao sai da tela por cima,
 * uma barra fina com o preco e o botao fica presa embaixo.
 */
export function ProdutoCompra({ slug, nome, preco }: Props) {
  const [quantos, setQuantos] = useState(1)
  const [naSacola, setNaSacola] = useState<number | null>(null)
  const [foraDaTela, setForaDaTela] = useState(false)
  const fileira = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = fileira.current
    if (!el) return
    const o = new IntersectionObserver(([e]) => setForaDaTela(!e.isIntersecting && e.boundingClientRect.top < 0))
    o.observe(el)
    return () => o.disconnect()
  }, [])

  const adicionar = () => {
    setNaSacola(somarNaSacola(slug, quantos))
    abrirGavetaDaSacola()
  }

  return (
    <div className="compra so-js">
      <div className="compra__fileira" ref={fileira}>
        <Quantidade valor={quantos} aoMudar={setQuantos} />
        <button type="button" className="btn-retro btn-retro--escuro compra__botao" onClick={adicionar}>
          Adicionar à sacola
        </button>
      </div>
      <p className="compra__aviso" role="status">
        {naSacola ? `Pronto: ${textoPotes(naSacola)} de ${nome} na sacola.` : ''}
      </p>

      <Entrega />

      <div className="compra-fixa" data-visivel={foraDaTela} inert={!foraDaTela}>
        <p className="compra-fixa__texto">
          <span>{nome}</span>
          <b>{formatarPreco(preco)}</b>
        </p>
        <button type="button" className="btn-retro btn-retro--escuro btn-retro--compacto" onClick={adicionar}>
          Adicionar à sacola
        </button>
      </div>
    </div>
  )
}

/** O CEP e o numero viram o valor e o prazo do Uber, cotados no servidor. */
function Entrega() {
  const id = useId()
  const [cep, setCep] = useState('')
  const [numero, setNumero] = useState('')
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState<RespostaDaCotacao | null>(null)
  // o CEP e o numero da ultima cotacao que deu certo
  const [cotadoPara, setCotadoPara] = useState('')

  async function calcular(e: FormEvent) {
    e.preventDefault()
    if (calculando) return
    const pedido = cep + '|' + numero.trim()
    // o mesmo CEP e numero, com a cotacao longe de vencer: nada a perguntar de novo
    if (resultado?.ok && cotadoPara === pedido && Date.parse(resultado.cotacao.expiraEm) - Date.now() > 60_000) return
    setCalculando(true)
    let r: RespostaDaCotacao
    try {
      r = await cotarEntrega({ cep, numero })
    } catch {
      r = { ok: false, erro: 'tente_de_novo' }
    }
    setResultado(r)
    setCotadoPara(r.ok ? pedido : '')
    setCalculando(false)
  }

  const falha = resultado && !resultado.ok ? resultado : null
  // o erro de um campo diz o que falta nele; os outros, o texto do codigo
  const doCampo = [falha?.campos?.cep, falha?.campos?.numero].filter(Boolean).join(' ')
  const erro = falha ? doCampo || MENSAGENS_DO_FECHAMENTO[falha.erro] : null
  return (
    <form className="entrega" onSubmit={calcular} noValidate aria-busy={calculando}>
      <p className="entrega__titulo" id={`${id}-t`}>
        Calcule a entrega
      </p>
      <div className="entrega__campos" role="group" aria-labelledby={`${id}-t`}>
        <label className="campo campo--cep">
          <span className="sr-only">CEP</span>
          <input
            name="cep"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="CEP"
            value={cep}
            onChange={(e) => setCep(mascararCep(e.target.value))}
            aria-invalid={falha?.campos?.cep ? true : undefined}
            aria-describedby={`${id}-r`}
          />
        </label>
        <label className="campo campo--numero">
          <span className="sr-only">Número</span>
          <input
            name="numero"
            autoComplete="address-line2"
            placeholder="Número"
            value={numero}
            onChange={(e) => setNumero(e.target.value.slice(0, 10))}
            aria-invalid={falha?.campos?.numero ? true : undefined}
            aria-describedby={`${id}-r`}
          />
        </label>
        <button type="submit" className="pilula entrega__botao" disabled={calculando}>
          {calculando ? 'Calculando' : 'Calcular'}
        </button>
      </div>
      <div id={`${id}-r`} className="entrega__resultado" aria-live="polite">
        {resultado?.ok ? (
          <p className="entrega__opcao">
            <span>
              {/* a Regra do Exemplo Dito: no texto em volta do valor, como no resumo da sacola */}
              Uber, entrega hoje{resultado.cotacao.exemplo ? ' (valor de exemplo)' : ''}
              <small>Chega em até {resultado.cotacao.minutos} min depois do pedido</small>
            </span>
            <b>{formatarPreco(resultado.cotacao.valorCentavos)}</b>
          </p>
        ) : erro ? (
          <p className="entrega__erro">{erro}</p>
        ) : (
          <p className="entrega__dica">A entrega sai da nossa cozinha pelo Uber, no mesmo dia.</p>
        )}
      </div>
    </form>
  )
}
