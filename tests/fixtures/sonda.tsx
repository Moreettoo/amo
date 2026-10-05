import { useFiltro } from '@/components/FiltroProvider'

/** Mostra o filtro como "linha|selo|vontade" e mexe nele de fora. */
export function Sonda() {
  const f = useFiltro()
  return (
    <div>
      <output data-testid="filtro">{`${f.linha ?? '-'}|${f.selo ?? '-'}|${f.vontade ?? '-'}`}</output>
      <button type="button" onClick={() => f.definir({ vontade: 'chocolate' })}>
        sonda: vontade chocolate
      </button>
      <button type="button" onClick={() => f.definir({ linha: 'pote', selo: 'fibras', vontade: 'fruta' })}>
        sonda: tudo ligado
      </button>
    </div>
  )
}
