-- AMO: a porta do banco (spec 5, regra 6).
--
-- A chave publicavel e publica por natureza: com ela, qualquer um chegaria a
-- API de dados do Supabase direto, pulando o site e os limites dele. A porta
-- fecha isso: antes de cada chamada a API de dados, o Supabase roda
-- conferir_porta(), que exige o cabecalho x-amo-porta com um segredo que so o
-- servidor do site conhece. O banco guarda so o hash do segredo.
--
-- O segredo NAO entra nesta migration nem no repositorio. Depois de aplicar,
-- grave o hash a mao (supabase/README.md, "Segredo da porta"). Sem nenhum
-- hash em privado.porta, a API de dados fica fechada para todos.
--
-- A porta cobre a API de dados (PostgREST). O Supabase Auth, o painel e as
-- tarefas agendadas nao passam por ela.
--
-- Para desfazer:
--   alter role authenticator reset pgrst.db_pre_request;
--   notify pgrst, 'reload config';

create table privado.porta (
  hash bytea primary key check (octet_length(hash) = 32),
  criado_em timestamptz not null default now()
);

alter table privado.porta enable row level security;

create function public.conferir_porta()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_segredo text := nullif(current_setting('request.headers', true), '')::json ->> 'x-amo-porta';
begin
  if v_segredo is null
     or char_length(v_segredo) not between 1 and 200
     or not exists (select 1 from privado.porta p where p.hash = sha256(convert_to(v_segredo, 'UTF8'))) then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'AMO401', 'message', 'nao autorizado')::text,
      detail = json_build_object('status', 401, 'headers', json_build_object())::text;
  end if;
end
$$;

grant execute on function public.conferir_porta() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'public.conferir_porta';
notify pgrst, 'reload config';
