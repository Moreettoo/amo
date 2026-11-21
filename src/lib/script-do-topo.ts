/**
 * O script do topo: marca o <html> com a classe `js` durante o parse do HTML,
 * antes da primeira pintura. A classe `js` e o portao de todo estado inicial
 * escondido (src/app/estilos/movimento.css). Sem JavaScript ela nao existe e a
 * pagina nasce no estado final, que e o que impede o hero em branco da v1.1.
 *
 * So a constante, sem React nem import: o InlineScript a poe na pagina e a
 * politica de seguranca, que o proxy importa, faz o hash dela.
 */
export const MARCAR_JS = "document.documentElement.classList.add('js')"
