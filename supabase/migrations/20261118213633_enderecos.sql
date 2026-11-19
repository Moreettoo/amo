-- AMO: enderecos da cliente (spec 7.2, 8 e 9.3).
-- A cliente le, cria, altera e apaga so os proprios. A dona e sempre a da
-- sessao: user_id vem de auth.uid() e nao recebe permissao de escrita.
-- No maximo 5 por cliente; um so principal.

create table public.enderecos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  apelido text check (char_length(apelido) between 1 and 30 and apelido !~ '[[:cntrl:]<>]'),
  cep text not null check (cep ~ '^[0-9]{8}$'),
  logradouro text not null check (char_length(logradouro) between 2 and 120 and logradouro !~ '[[:cntrl:]<>]'),
  numero text not null check (numero ~ '^[0-9A-Za-z][0-9A-Za-z /-]{0,9}$'),
  complemento text not null default '' check (char_length(complemento) <= 60 and complemento !~ '[[:cntrl:]<>]'),
  bairro text not null check (char_length(bairro) between 1 and 60 and bairro !~ '[[:cntrl:]<>]'),
  cidade text not null check (char_length(cidade) between 2 and 60 and cidade !~ '[[:cntrl:]<>]'),
  uf text not null check (uf in (
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')),
  principal boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index enderecos_user_id on public.enderecos (user_id);
create unique index enderecos_um_principal on public.enderecos (user_id) where principal;

alter table public.enderecos enable row level security;

create policy ler_os_proprios on public.enderecos
  for select to authenticated using (user_id = (select auth.uid()));
create policy criar_os_proprios on public.enderecos
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy alterar_os_proprios on public.enderecos
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy apagar_os_proprios on public.enderecos
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on public.enderecos to authenticated;
grant insert (apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, principal)
  on public.enderecos to authenticated;
grant update (apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, principal)
  on public.enderecos to authenticated;

create function privado.limitar_enderecos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- uma insercao por cliente de cada vez, para a contagem valer
  perform pg_advisory_xact_lock(hashtextextended('enderecos:' || new.user_id::text, 0));
  if (select count(*) from public.enderecos where user_id = new.user_id) >= 5 then
    raise exception using errcode = 'P0001', message = 'limite_de_enderecos';
  end if;
  return new;
end
$$;

create function privado.um_principal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.principal then
    update public.enderecos
    set principal = false
    where user_id = new.user_id and id <> new.id and principal;
  end if;
  return new;
end
$$;

create trigger limitar_enderecos
  before insert on public.enderecos
  for each row execute function privado.limitar_enderecos();

create trigger um_principal
  before insert or update of principal on public.enderecos
  for each row execute function privado.um_principal();

create trigger carimbar_atualizado
  before update on public.enderecos
  for each row execute function privado.carimbar_atualizado();
