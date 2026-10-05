export function AnnouncementBar() {
  // <section> com aria-label vira landmark "region" (mesma tecnica do
  // Bento). Sem isso, esta faixa fica como conteudo solto direto em
  // <body>, antes da <Nav>, sem nenhum outro landmark cobrindo, e o axe
  // reprova "region: All page content should be contained by landmarks"
  // ao varrer o documento completo (so aparece rodando contra html/body
  // reais, nao contra o fragmento isolado que os testes de componente
  // montam, e foi por isso que nenhum teste de secao pegou antes da Task 12).
  return (
    <section aria-label="Aviso" className="bg-ink px-4 py-2.5 text-center">
      {/* 12px em vez de 11, tracking 0.14em em vez de 0.20em. A tarja e a
          primeira linha de texto da pagina e estava no menor corpo dela com o
          maior tracking: os dois na direcao errada. */}
      <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-cream/90">
        Zero açúcar · Cozido a vapor · Pote de&nbsp;vidro reutilizável
      </p>
    </section>
  )
}
