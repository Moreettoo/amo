'use client'

import { PapelRotulo } from '@/components/ui/PapelRotulo'
import { useNaTela } from '@/components/ui/useNaTela'
import type { Linha } from '@/lib/catalogo'

const GIROS = ['-2deg', '1.4deg', '-1deg'] as const

type Props = {
  linhas: readonly Linha[]
  nomesDosSelos: Readonly<Record<string, string>>
}

/**
 * O que é saudável: um rotulo de papel por linha, pousando na mesa quando a
 * secao entra na tela. Com uma linha so, o titulo deixa de falar em "cada
 * linha" e o cartao fica largo.
 */
export function Rotulos({ linhas, nomesDosSelos }: Props) {
  const [ref, visto] = useNaTela<HTMLDivElement>()
  const unica = linhas.length === 1
  return (
    <section id="rotulos" aria-labelledby="titulo-rotulos" className="rotulos superficie-escura scroll-mt-24">
      <div className="wrap">
        <p className="rotulo-secao">Sabores saudáveis</p>
        <h2 id="titulo-rotulos" className="titulo-secao">
          {unica ? 'O que é saudável aqui está no rótulo.' : 'Cada linha tem a sua regra. Todas estão no rótulo.'}
        </h2>
        <div ref={ref} className={`mesa${unica ? ' mesa--unica' : ''}${visto ? ' play' : ''}`}>
          {linhas.map((linha, i) => (
            <div key={linha.slug} className="mesa__item">
              <PapelRotulo
                linha={linha}
                nomesDosSelos={nomesDosSelos}
                giro={GIROS[i % GIROS.length]}
                largo={unica}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
