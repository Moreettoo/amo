// Roda a reconciliacao no servidor local (npm run reconciliar). Em producao
// quem chama e o agendador; aqui nao ha agendador, entao e a mao.
const segredo = process.env.TAREFAS_SEGREDO ?? ''
if (segredo === '') {
  console.error('Defina TAREFAS_SEGREDO no .env.local para rodar a reconciliacao.')
  process.exit(1)
}

try {
  const resposta = await fetch('http://localhost:3000/api/tarefas/reconciliar', {
    method: 'POST',
    headers: { authorization: `Bearer ${segredo}` },
    signal: AbortSignal.timeout(60_000),
  })
  console.log(await resposta.text())
  process.exit(resposta.ok ? 0 : 1)
} catch {
  console.error('A reconciliacao nao respondeu (o servidor esta no ar em localhost:3000?).')
  process.exit(1)
}
