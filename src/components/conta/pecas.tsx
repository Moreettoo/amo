'use client'

import { useId, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import type { RespostaDaConta } from '@/lib/auth/acoes'
import { MENSAGENS_DA_CONTA } from '@/lib/conta/mensagens'

/**
 * As pecas dos formularios da conta, no desenho dos campos da sacola: rotulo
 * visivel em cima, contorno fino, erro embaixo ligado ao campo.
 */

type CampoProps = InputHTMLAttributes<HTMLInputElement> & { rotulo: string; erro?: string; largura?: 'meio' | 'largo' | 'cep' | 'numero' }

/**
 * O valor guardado no proprio campo. Com <form action>, o React 19 limpa todo
 * campo sem estado no fim de cada acao, ate quando ela volta com erro, e a
 * cliente teria de digitar tudo de novo. Quem passa `value` manda no valor;
 * `defaultValue` vira o valor inicial (o perfil nasce preenchido).
 */
function useValorProprio(input: InputHTMLAttributes<HTMLInputElement>) {
  const [valor, setValor] = useState(() => (input.defaultValue === undefined ? '' : String(input.defaultValue)))
  if (input.value !== undefined) return {}
  return { value: valor, defaultValue: undefined, onChange: (e: ChangeEvent<HTMLInputElement>) => setValor(e.target.value) }
}

export function Campo({ rotulo, erro, dica, largura = 'largo', ...input }: CampoProps & { dica?: string }) {
  const id = useId()
  const proprio = useValorProprio(input)
  const descricao = [erro && `${id}-erro`, dica && `${id}-dica`].filter(Boolean).join(' ') || undefined
  return (
    <div className={`campo campo--${largura}`}>
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} aria-invalid={erro ? true : undefined} aria-describedby={descricao} {...input} {...proprio} />
      {dica && !erro ? (
        <span id={`${id}-dica`} className="campo__dica">
          {dica}
        </span>
      ) : null}
      {erro ? (
        <span id={`${id}-erro`} className="campo__erro">
          {erro}
        </span>
      ) : null}
    </div>
  )
}

export function CampoSenha({ rotulo, erro, dica, ...input }: CampoProps & { dica?: string }) {
  const id = useId()
  const [visivel, setVisivel] = useState(false)
  const proprio = useValorProprio(input)
  const descricao = [erro && `${id}-erro`, dica && `${id}-dica`].filter(Boolean).join(' ') || undefined
  return (
    <div className="campo campo--largo">
      <label htmlFor={id}>{rotulo}</label>
      <span className="campo__senha">
        <input id={id} type={visivel ? 'text' : 'password'} aria-invalid={erro ? true : undefined} aria-describedby={descricao} {...input} {...proprio} />
        <button type="button" className="campo__mostrar" aria-pressed={visivel} onClick={() => setVisivel((v) => !v)}>
          mostrar
        </button>
      </span>
      {dica && !erro ? (
        <span id={`${id}-dica`} className="campo__dica">
          {dica}
        </span>
      ) : null}
      {erro ? (
        <span id={`${id}-erro`} className="campo__erro">
          {erro}
        </span>
      ) : null}
    </div>
  )
}

export function Marcar({ nome, children, erro }: { nome: string; children: React.ReactNode; erro?: string }) {
  const id = useId()
  // pelo mesmo motivo de useValorProprio: o React copia defaultChecked para a
  // caixa a cada mudanca, e e a ele que o reinicio do formulario volta
  const [marcada, setMarcada] = useState(false)
  return (
    <div className="marcar">
      <input
        id={id}
        type="checkbox"
        name={nome}
        defaultChecked={marcada}
        onChange={(e) => setMarcada(e.target.checked)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
      />
      <span className="marcar__visto" aria-hidden="true" />
      <label htmlFor={id}>{children}</label>
      {erro ? (
        <span id={`${id}-erro`} className="campo__erro">
          {erro}
        </span>
      ) : null}
    </div>
  )
}

/** O erro que vale para o formulario todo, numa linha ja reservada (a pagina nao pula). */
export function ErroGeral({ resposta }: { resposta: RespostaDaConta | null }) {
  const erro = resposta && !resposta.ok && resposta.erro !== 'campos_invalidos' ? MENSAGENS_DA_CONTA[resposta.erro] : ''
  return (
    <p className="conta__erro" role={erro ? 'alert' : undefined}>
      {erro}
    </p>
  )
}

export const erroDe = (resposta: RespostaDaConta | null, campo: string) =>
  resposta && !resposta.ok ? resposta.campos?.[campo] : undefined

/**
 * O fim do formulario, num bloco so: a verificacao contra robos (quando ha),
 * a linha de erro reservada e o botao, a 6 px um do outro. O Turnstile sem
 * desafio tem altura 0 e, fora da grade do formulario, nao abre intervalo.
 */
export function Envio({ resposta, children, ...botao }: { resposta: RespostaDaConta | null; children?: React.ReactNode } & EnviarProps) {
  return (
    <div className="conta__envio">
      {children}
      <ErroGeral resposta={resposta} />
      <Enviar {...botao} />
    </div>
  )
}

type EnviarProps = { enviando: boolean; rotulo: string; rotuloEnviando: string }

export function Enviar({ enviando, rotulo, rotuloEnviando }: EnviarProps) {
  return (
    <button type="submit" className="btn-retro btn-retro--escuro conta__enviar" disabled={enviando}>
      {enviando ? rotuloEnviando : rotulo}
    </button>
  )
}
