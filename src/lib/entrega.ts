/**
 * A entrega e pelo Uber, da cozinha ate a casa da cliente. A cotacao de
 * verdade vai sair do servidor (Uber Direct, com o endereco da cozinha
 * guardado la, nunca na pagina): a tela chama cotarEntrega (src/app/sacola/acoes.ts).
 * Aqui ficam so a mascara e a conferencia do CEP e do numero.
 */

/** So os 8 digitos. */
export const limparCep = (texto: string) => texto.replace(/\D/g, '').slice(0, 8)

/** Os digitos com o traco no lugar, enquanto a pessoa digita: "04567-000". */
export function mascararCep(texto: string): string {
  const d = limparCep(texto)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Confere o que da para conferir sem perguntar a ninguem. */
export function validarEndereco(cep: string, numero: string): string | null {
  if (limparCep(cep).length !== 8) return 'Confira o CEP: ele tem 8 números.'
  if (!numero.trim()) return 'Falta o número da casa ou do prédio.'
  return null
}
