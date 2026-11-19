-- AMO: perfis e o cadastro (spec 7.2, 8, 9.1 e 9.3).
--
-- O perfil nasce do gatilho de cadastro em auth.users. O que vem do
-- navegador no cadastro (raw_user_meta_data) nao e confiavel: o gatilho copia
-- so nome e celular, validados; exige o aceite dos termos na versao vigente;
-- grava as datas com a hora do banco. Nenhum papel ou privilegio sai dali.
--
-- A cliente le o proprio perfil e altera so nome e celular. O aceite de
-- marketing muda so por definir_marketing().

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 80 and nome !~ '[[:cntrl:]<>]'),
  celular text not null check (celular ~ '^[0-9]{10,11}$'),
  termos_aceitos_em timestamptz not null,
  versao_termos text not null check (char_length(versao_termos) between 1 and 20),
  marketing_aceito_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy ler_o_proprio on public.perfis
  for select to authenticated
  using (id = (select auth.uid()));

create policy alterar_o_proprio on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select on public.perfis to authenticated;
grant update (nome, celular) on public.perfis to authenticated;

create trigger carimbar_atualizado
  before update on public.perfis
  for each row execute function privado.carimbar_atualizado();

create function privado.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nome text := regexp_replace(btrim(coalesce(v_meta ->> 'nome', '')), '\s+', ' ', 'g');
  v_celular_enviado text := coalesce(v_meta ->> 'celular', '');
  v_celular text := regexp_replace(v_celular_enviado, '[^0-9]', '', 'g');
begin
  if (v_meta -> 'aceite_termos') is distinct from 'true'::jsonb then
    raise exception using errcode = 'P0001', message = 'termos_nao_aceitos';
  end if;
  if (v_meta ->> 'versao_termos') is distinct from privado.versao_termos() then
    raise exception using errcode = 'P0001', message = 'termos_desatualizados';
  end if;
  if char_length(v_nome) not between 2 and 80 or v_nome ~ '[[:cntrl:]<>]' then
    raise exception using errcode = 'P0001', message = 'nome_invalido';
  end if;
  -- so digitos e a mascara de telefone; o que sobra tem de ter 10 ou 11 digitos
  if v_celular_enviado !~ '^[0-9 ()+-]{10,20}$' or v_celular !~ '^[0-9]{10,11}$' then
    raise exception using errcode = 'P0001', message = 'celular_invalido';
  end if;

  insert into public.perfis (id, nome, celular, termos_aceitos_em, versao_termos, marketing_aceito_em)
  values (
    new.id, v_nome, v_celular, now(), privado.versao_termos(),
    case when (v_meta -> 'aceite_marketing') = 'true'::jsonb then now() end
  );
  return new;
end
$$;

create trigger amo_criar_perfil
  after insert on auth.users
  for each row execute function privado.criar_perfil();

create function public.definir_marketing(p_aceita boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := auth.uid();
begin
  if v_id is null then
    raise exception using errcode = 'P0001', message = 'sem_sessao';
  end if;
  update public.perfis
  set marketing_aceito_em = case when coalesce(p_aceita, false) then coalesce(marketing_aceito_em, now()) end
  where id = v_id;
end
$$;

grant execute on function public.definir_marketing(boolean) to authenticated;
