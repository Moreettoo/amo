-- AMO: ajustes apontados pelo conselheiro de desempenho do Supabase.
--
-- 1. cotacoes.user_id sem indice: a exclusao de conta apaga as cotacoes da
--    cliente por essa coluna.
-- 2. comentarios com duas regras de leitura para authenticated: viram uma
--    so, com o mesmo efeito (aprovados, mais os proprios).

create index cotacoes_user_id on privado.cotacoes (user_id);

drop policy ler_os_aprovados on public.comentarios;
drop policy ler_os_proprios on public.comentarios;

create policy ler_os_aprovados on public.comentarios
  for select to anon using (status = 'aprovado');
create policy ler_os_aprovados_e_os_proprios on public.comentarios
  for select to authenticated using (status = 'aprovado' or user_id = (select auth.uid()));
