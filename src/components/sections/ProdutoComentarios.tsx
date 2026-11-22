'use client'

import { useId, useState, type FormEvent } from 'react'
import { enviarComentario } from '@/app/catalogo/acoes'
import { MENSAGENS_DO_FECHAMENTO, TEXTOS_DO_COMENTARIO } from '@/lib/fechamento/tipos'
import {
  MINIMO_PARA_RESUMO,
  contarComentarios,
  formatarData,
  formatarNota,
  type Comentario,
  type Nota,
  type ResumoDasNotas,
} from '@/lib/produto'

type Ordem = 'recentes' | 'melhores' | 'piores'

const ORDENS: Record<Ordem, { nome: string; comparar: (a: Comentario, b: Comentario) => number }> = {
  recentes: { nome: 'Mais recentes', comparar: (a, b) => b.data.localeCompare(a.data) },
  melhores: { nome: 'Melhor nota', comparar: (a, b) => b.nota - a.nota || b.data.localeCompare(a.data) },
  piores: { nome: 'Menor nota', comparar: (a, b) => a.nota - b.nota || b.data.localeCompare(a.data) },
}

/** Cinco estrelas de traco fino; as cheias em cobre. */
export function Estrelas({ nota, rotulo }: { nota: number; rotulo?: string }) {
  // 4,5 mostra quatro: arredondar para cima prometeria mais do que a media
  const cheias = Math.floor(nota + 0.25)
  return (
    <span className="estrelas" role="img" aria-label={rotulo ?? `Nota ${nota} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" aria-hidden="true" className={i <= cheias ? 'cheia' : undefined}>
          <path d="M10 1.8l2.5 5.3 5.7.7-4.2 3.9 1.1 5.7L10 14.6l-5.1 2.8 1.1-5.7-4.2-3.9 5.7-.7z" />
        </svg>
      ))}
    </span>
  )
}

type Props = { produto: string; comentarios: readonly Comentario[]; resumo: ResumoDasNotas }

/**
 * Os comentarios: o resumo das notas (so com 6 ou mais; com poucos ele
 * engana), que filtra a lista quando tocado, a ordem e o formulario. O
 * comentario novo so aparece depois que a marca aprova; por enquanto o
 * envio e de exemplo e nao guarda nada.
 */
export function ProdutoComentarios({ produto, comentarios, resumo }: Props) {
  const [filtro, setFiltro] = useState<Nota | null>(null)
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const comResumo = resumo.total >= MINIMO_PARA_RESUMO
  const lista = comentarios.filter((c) => !filtro || c.nota === filtro).sort(ORDENS[ordem].comparar)

  return (
    <div className="comentarios__grade">
      <div className="comentarios__lado">
        {comResumo ? (
          <>
            <p className="comentarios__media">
              {formatarNota(resumo.media)}
              <small>de 5 · {contarComentarios(resumo.total)}</small>
            </p>
            <Estrelas nota={resumo.media} rotulo={`Média ${formatarNota(resumo.media)} de 5`} />
            <ul className="barras" aria-label="Filtrar por nota">
              {resumo.porNota.map(({ nota, quantos }) => (
                <li key={nota}>
                  <button
                    type="button"
                    className="barras__linha"
                    aria-pressed={filtro === nota}
                    disabled={quantos === 0}
                    onClick={() => setFiltro(filtro === nota ? null : nota)}
                  >
                    <span>{nota === 1 ? '1 estrela' : `${nota} estrelas`}</span>
                    <s style={{ ['--p' as string]: `${(quantos / resumo.total) * 100}%` }} aria-hidden="true" />
                    <span className="barras__conta">{quantos}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <Formulario produto={produto} />
      </div>

      <div className="comentarios__lista">
        {comentarios.length === 0 ? (
          <p className="comentarios__vazio">Ninguém comentou este sabor ainda. Provou? Conte o que achou.</p>
        ) : (
          <>
            <div className="comentarios__barra">
              <p aria-live="polite">
                {filtro
                  ? `${contarComentarios(lista.length)} com ${filtro === 1 ? '1 estrela' : `${filtro} estrelas`}`
                  : contarComentarios(comentarios.length)}
                {filtro ? (
                  <button type="button" className="comentarios__limpar" onClick={() => setFiltro(null)}>
                    Ver todos
                  </button>
                ) : null}
              </p>
              {comentarios.length > 1 ? (
                <label className="comentarios__ordem so-js">
                  Ordenar por
                  <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
                    {(Object.keys(ORDENS) as Ordem[]).map((o) => (
                      <option key={o} value={o}>
                        {ORDENS[o].nome}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <ul className="comentarios__itens">
              {lista.map((c) => (
                <li key={c.id} className="comentario">
                  <p className="comentario__quem">
                    <b>{c.nome}</b>
                    <Estrelas nota={c.nota} />
                    <time dateTime={c.data}>{formatarData(c.data)}</time>
                  </p>
                  <p className="comentario__texto">{c.texto}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

/** O formulario abre no lugar do botao; enviado, vira o agradecimento. */
function Formulario({ produto }: { produto: string }) {
  const id = useId()
  const [aberto, setAberto] = useState(false)
  const [nota, setNota] = useState<Nota | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [semSessao, setSemSessao] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (enviando) return
    const texto = String(new FormData(e.currentTarget).get('texto') ?? '')
    setErro(null)
    setSemSessao(false)
    setEnviando(true)
    try {
      const r = await enviarComentario({ produto, nota, texto })
      if (r.ok) return setEnviado(true)
      if (r.erro === 'sem_sessao') {
        setErro(TEXTOS_DO_COMENTARIO.sem_sessao)
        return setSemSessao(true)
      }
      if (r.erro === 'campos_invalidos') return setErro(r.campos?.nota ?? r.campos?.texto ?? MENSAGENS_DO_FECHAMENTO.campos_invalidos)
      if (r.erro === 'comentario_nao_permitido') return setErro(TEXTOS_DO_COMENTARIO.comentario_nao_permitido)
      setErro(r.erro === 'muitas_tentativas' ? MENSAGENS_DO_FECHAMENTO.muitas_tentativas : MENSAGENS_DO_FECHAMENTO.tente_de_novo)
    } catch {
      setErro(MENSAGENS_DO_FECHAMENTO.tente_de_novo)
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <p className="comentar__obrigado" role="status">
        Recebemos seu comentário. Ele aparece aqui depois que a gente ler.
      </p>
    )
  }

  return (
    <div className="comentar so-js">
      <button
        type="button"
        className="btn-retro btn-retro--contorno"
        aria-expanded={aberto}
        aria-controls={`${id}-f`}
        onClick={() => setAberto((a) => !a)}
      >
        Escrever um comentário
      </button>
      <form id={`${id}-f`} className="comentar__form" hidden={!aberto} onSubmit={enviar} noValidate>
        <fieldset className="comentar__notas">
          <legend>Sua nota</legend>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <label key={n} className={nota && n <= nota ? 'cheia' : undefined}>
              <input type="radio" name="nota" value={n} checked={nota === n} onChange={() => setNota(n)} />
              <span className="sr-only">{n === 1 ? '1 estrela' : `${n} estrelas`}</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 1.8l2.5 5.3 5.7.7-4.2 3.9 1.1 5.7L10 14.6l-5.1 2.8 1.1-5.7-4.2-3.9 5.7-.7z" />
              </svg>
            </label>
          ))}
        </fieldset>
        <label className="comentar__campo">
          O que achou
          <textarea name="texto" rows={4} maxLength={1000} />
        </label>
        <p className="comentar__erro" aria-live="assertive">
          {erro}
          {semSessao ? (
            <>
              {' '}
              <a href={`/entrar?volta=/catalogo/${produto}`}>Entrar</a>
            </>
          ) : null}
        </p>
        <button type="submit" className="btn-retro btn-retro--escuro" disabled={enviando}>
          Enviar comentário
        </button>
        <p className="comentar__nota">Seu nome aparece como no seu perfil, com a inicial do sobrenome. Os comentários aparecem depois que a gente lê.</p>
      </form>
    </div>
  )
}
