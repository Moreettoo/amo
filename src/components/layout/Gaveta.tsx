'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import { BotaoRetro } from '@/components/ui/BotaoRetro'
import { GavetaModal } from '@/components/ui/GavetaModal'
import { classeDoFormato } from '@/components/ui/MolduraProduto'
import {
  CAMINHO_CATALOGO,
  caminhoDaLinha,
  contarReceitas,
  textoVerReceitas,
  type DadosGaveta,
} from '@/lib/visao'

/** Os links da home: na nav (desktop) e no pe da gaveta (celular). */
export const LINKS_DA_HOME = [
  { href: '/#hoje', rotulo: 'Hoje o dia pede' },
  { href: '/#rotulos', rotulo: 'O que é saudável' },
  { href: '/#marca', rotulo: 'A marca' },
] as const

export { DURACAO_SAIDA } from '@/components/ui/GavetaModal'

/** Os itens entram um depois do outro; o atraso vem de --i (movimento.css). */
const ordem = (i: number) => ({ '--i': i }) as CSSProperties

function Seta() {
  return (
    <svg className="gaveta__icone" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

type Props = {
  id: string
  dados: DadosGaveta
  aberta: boolean
  /** a gaveta fechou de vez; `devolverFoco` e falso quando um link da
   *  propria pagina levou o foco para o alvo */
  aoFechar: (devolverFoco: boolean) => void
}

/**
 * A gaveta do catalogo: vem da esquerda (a casca e a GavetaModal). Com uma
 * linha so, ela e os sabores; com varias, uma capa por linha.
 */
export function Gaveta({ id, dados, aberta, aoFechar }: Props) {
  const [primeira] = dados.linhas
  const unica = dados.linhas.length === 1
  const pe = unica ? dados.sabores.length + 1 : dados.linhas.length + 1

  return (
    <GavetaModal id={id} titulo="Catálogo" rotuloFechar="Fechar o catálogo" aberta={aberta} aoFechar={aoFechar}>
        {unica ? (
          <>
            <p className="gaveta__frase">Escolha a linha ou vá direto a um sabor.</p>
            <a
              href={caminhoDaLinha(primeira.slug)}
              className="gaveta__unica gaveta__item"
              style={ordem(0)}
            >
              <span className="gaveta__texto">
                <span className="gaveta__nome">{primeira.nome}</span>
                <span className="gaveta__regra">{primeira.regra}</span>
                <span className="gaveta__ver">
                  {textoVerReceitas(primeira.contagem)} <Seta />
                </span>
              </span>
              <span className="gaveta__fotos" aria-hidden="true">
                {dados.sabores.slice(0, 3).map((s) => (
                  <Image
                    key={s.slug}
                    src={s.imagem.src}
                    alt=""
                    width={s.imagem.largura}
                    height={s.imagem.altura}
                    loading="lazy"
                    sizes="40px"
                  />
                ))}
              </span>
            </a>
            <p id={`${id}-sabores`} className="gaveta__rotulo">
              Os sabores
            </p>
            <ul aria-labelledby={`${id}-sabores`} className="gaveta__sabores">
              {dados.sabores.map((s, i) => (
                <li key={s.slug} className="gaveta__item" style={ordem(i + 1)}>
                  <a href={`${CAMINHO_CATALOGO}#${s.slug}`}>
                    <Image
                      src={s.imagem.src}
                      alt=""
                      width={s.imagem.largura}
                      height={s.imagem.altura}
                      loading="lazy"
                      sizes="40px"
                    />
                    {s.nome}
                    <svg className="gaveta__icone" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="gaveta__frase">Escolha uma linha para ver as receitas dela.</p>
            <ul className="gaveta__linhas">
              {dados.linhas.map((l, i) => (
                <li key={l.slug} className="gaveta__item" style={ordem(i)}>
                  <a href={caminhoDaLinha(l.slug)} className="gaveta__linha">
                    <span className="gaveta__moldura">
                      <span className={`gaveta__capa gaveta__capa--${classeDoFormato(l.capa.formato)}`}>
                        <Image
                          src={l.capa.imagem.src}
                          alt=""
                          width={l.capa.imagem.largura}
                          height={l.capa.imagem.altura}
                          loading="lazy"
                          sizes="70px"
                        />
                      </span>
                    </span>
                    <span className="gaveta__texto">
                      <span className="gaveta__nome">{l.nome}</span>
                      <span className="gaveta__regra">{l.regra}</span>
                      <span className="gaveta__conta">{contarReceitas(l.contagem)}</span>
                    </span>
                    <span className="gaveta__seta" aria-hidden="true">
                      <Seta />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <BotaoRetro
              href={CAMINHO_CATALOGO}
              escuro
              className="gaveta__tudo gaveta__item"
              style={ordem(dados.linhas.length)}
            >
              Ver o catálogo inteiro <span className="gaveta__total">{contarReceitas(dados.total)}</span>
            </BotaoRetro>
          </>
        )}

        <div className="gaveta__casa gaveta__item" style={ordem(pe)}>
          <p id={`${id}-casa`}>Na página inicial</p>
          <ul aria-labelledby={`${id}-casa`}>
            {LINKS_DA_HOME.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.rotulo}</a>
              </li>
            ))}
          </ul>
        </div>

        <a href="/#hoje" className="gaveta__hoje gaveta__item" style={ordem(pe)}>
          <span>Não sabe o que escolher?</span>
          <b>
            Hoje o dia pede <Seta />
          </b>
        </a>
    </GavetaModal>
  )
}
