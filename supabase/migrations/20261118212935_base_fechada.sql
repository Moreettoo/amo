-- AMO: a base fechada (spec 2026-11-18-amo-backend-design.md, secao 5).
--
-- 1. O que nasce em public nasce sem acesso para anon, authenticated e
--    service_role. Cada permissao passa a ser escrita a mao.
-- 2. Funcoes criadas pelo postgres deixam de nascer executaveis por PUBLIC.
-- 3. O schema privado guarda o que so o servidor alcanca: visitante e
--    cliente nao tem nem USAGE; a chave secreta (service_role) tem USAGE e
--    recebe EXECUTE so nas funcoes nomeadas.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres
  revoke execute on functions from public;

create schema privado;
revoke all on schema privado from public;
grant usage on schema privado to service_role;

-- A versao vigente dos termos de uso. Trocar os termos e trocar esta funcao
-- (nova migration) e a constante VERSAO_TERMOS do site, no mesmo commit.
create function privado.versao_termos()
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select '2026-11-18'::text;
$$;

-- Gatilho comum: carimba atualizado_em.
create function privado.carimbar_atualizado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end
$$;
