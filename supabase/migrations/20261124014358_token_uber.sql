-- AMO: o token da Uber, um para o site inteiro (spec 8).
--
-- O token do client_credentials dura 30 dias e a Uber limita os pedidos de
-- token por hora, entao o site guarda um so, no cofre (vault), e so uma
-- instancia renova por vez: reservar_renovacao_token da a vez por 60 s.
-- A tabela tem uma linha so (id verdadeiro); o token em si nunca fica nela.

create table privado.uber_token (
  id boolean primary key default true check (id),
  segredo_id uuid,
  expira_em timestamptz,
  renovando_ate timestamptz
);
alter table privado.uber_token enable row level security;
revoke all on privado.uber_token from public, anon, authenticated, service_role;

create function privado.ler_token_uber()
returns table (token text, expira_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret, t.expira_em
  from privado.uber_token t
  join vault.decrypted_secrets s on s.id = t.segredo_id
  where t.id and s.decrypted_secret is not null;
$$;

create function privado.guardar_token_uber(p_token text, p_expira_em timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_segredo uuid;
begin
  insert into privado.uber_token (id) values (true) on conflict (id) do nothing;
  select t.segredo_id into v_segredo from privado.uber_token t where t.id for update;
  if v_segredo is null then
    v_segredo := vault.create_secret(p_token, 'amo_uber_token', 'token da Uber Direct');
  else
    perform vault.update_secret(v_segredo, p_token);
  end if;
  update privado.uber_token t set segredo_id = v_segredo, expira_em = p_expira_em where t.id;
end
$$;

-- Verdadeiro para um so chamador a cada 60 s (um update atomico que trava a linha).
create function privado.reservar_renovacao_token()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vez boolean;
begin
  insert into privado.uber_token (id) values (true) on conflict (id) do nothing;
  update privado.uber_token t set renovando_ate = now() + interval '60 seconds'
  where t.id and (t.renovando_ate is null or t.renovando_ate <= now())
  returning true into v_vez;
  return coalesce(v_vez, false);
end
$$;

revoke all on function privado.ler_token_uber() from public, anon, authenticated;
revoke all on function privado.guardar_token_uber(text, timestamptz) from public, anon, authenticated;
revoke all on function privado.reservar_renovacao_token() from public, anon, authenticated;
grant execute on function privado.ler_token_uber() to service_role;
grant execute on function privado.guardar_token_uber(text, timestamptz) to service_role;
grant execute on function privado.reservar_renovacao_token() to service_role;
