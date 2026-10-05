/**
 * O selo redondo de cobre, girado, com anel tracejado. No hover recarimba e
 * o anel gira. Texto de verdade (nao aria-hidden): e a regra da linha.
 */
export function SeloCarimbo({ texto }: { texto: string }) {
  return (
    <p className="selo-carimbo">
      <span>{texto}</span>
    </p>
  )
}
