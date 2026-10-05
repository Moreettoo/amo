/**
 * O rotulo de secao: um filete curto e a caixa alta solta.
 *
 * Era uma elipse preenchida, citando a etiqueta oval pendurada no barbante do
 * pote. A forma nao funcionou: `border-radius: 50%` numa caixa larga e baixa
 * nao da uma elipse de etiqueta, da uma lente, e o desenho ficava estranho no
 * lugar mais visivel da pagina.
 *
 * A regra da spec §4 ("elipse e rotulo, pill e acao") continua valendo, so
 * mudou de eixo: quem nao e clicavel nao tem caixa nenhuma, quem e clicavel
 * tem. A distincao ficou mais forte do que era com duas formas arredondadas
 * competindo, porque agora ela nao depende de a pessoa comparar raios de
 * canto. E por isso que a pill esta fora de questao aqui: usar a forma do CTA
 * num rotulo faria o rotulo parecer um botao que nao clica.
 *
 * O filete tambem nao e ornamento solto: e a mesma regua que separa os passos
 * do ritual e as colunas da lista pinada, que vem da referencia.
 *
 * Sem alfa no filete: `bg-ink` cheio da 9.16:1 sobre sage e 13.64:1 sobre
 * cream. Todo filete translucido que este projeto tentou reprovou o piso de
 * 3:1 (o `border-ink/25` da elipse antiga media 1.57:1 sobre sage).
 */
type Props = {
  children: React.ReactNode
  className?: string
}

export function Etiqueta({ children, className }: Props) {
  return (
    <span
      className={
        'inline-flex items-center gap-3.5 ' +
        'font-sans text-[0.78125rem] font-semibold uppercase tracking-[0.1em] ' +
        `text-ink ${className ?? ''}`
      }
    >
      <span aria-hidden="true" className="h-0.5 w-8 shrink-0 bg-ink" />
      {children}
    </span>
  )
}
