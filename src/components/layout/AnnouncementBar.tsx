export function AnnouncementBar() {
  // <section> com aria-label vira landmark "region" (mesma técnica do
  // Bento). Sem isso, esta faixa fica como conteúdo solto direto em
  // <body>, antes da <Nav> — nenhum outro landmark a cobre — e o axe
  // reprova "region: All page content should be contained by landmarks"
  // ao varrer o documento completo (só aparece rodando contra html/body
  // reais, não contra o fragmento isolado que os testes de componente
  // montam — por isso nenhum teste de seção pegou isso antes da Task 12).
  return (
    <section aria-label="Aviso" className="bg-ink px-4 py-2.5 text-center">
      <p className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-cream/85">
        Zero açúcar · Cozido a vapor · Pote de&nbsp;vidro reutilizável
      </p>
    </section>
  )
}
