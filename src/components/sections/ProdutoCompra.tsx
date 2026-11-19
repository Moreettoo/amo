'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { cotarEntregaDeExemplo, mascararCep, type ResultadoEntrega } from '@/lib/entrega'
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

/** O CEP e o numero viram o valor e o prazo do Uber. */
function Entrega() {
  const id = useId()
  const [cep, setCep] = useState('')
  const [numero, setNumero] = useState('')
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoEntrega | null>(null)

  async function calcular(e: FormEvent) {
    e.preventDefault()
    setCalculando(true)
    setResultado(await cotarEntregaDeExemplo(cep, numero))
    setCalculando(false)
  }

  const erro = resultado?.tipo === 'erro' ? resultado.mensagem : null
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
            aria-invalid={erro?.startsWith('Confira') || undefined}
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
            aria-invalid={erro?.startsWith('Falta') || undefined}
            aria-describedby={`${id}-r`}
          />
        </label>
        <button type="submit" className="pilula entrega__botao" disabled={calculando}>
          {calculando ? 'Calculando' : 'Calcular'}
        </button>
      </div>
      <div id={`${id}-r`} className="entrega__resultado" aria-live="polite">
        {resultado?.tipo === 'cotado' ? (
          <p className="entrega__opcao">
            <span>
              Uber, entrega hoje
              <small>Chega em até {resultado.cotacao.minutos} min depois do pedido</small>
            </span>
            <b>{formatarPreco(resultado.cotacao.valor)}</b>
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
