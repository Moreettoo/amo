-- AMO: as faixas de entrega e as datas fechadas (decisao 1 e spec 5.2).
--
-- Uma faixa e [s, s+60 min] com retirada em [s-30 min, s]. Vale se s e hora
-- cheia de Sao Paulo, s-30 min >= abre e s+60 min <= fecha do dia, s >= agora
-- + 90 min, a data fica ate 7 dias depois de hoje, nao esta em dias_fechados e
-- (quando pedido) as vendas nao estao pausadas.

-- Datas em que a cozinha nao abre, alem da folga da semana (horarios).
create table public.dias_fechados (
  data date primary key,
  motivo text check (char_length(motivo) <= 80 and motivo !~ '[[:cntrl:]<>]'),
  criado_em timestamptz not null default now()
);

alter table public.dias_fechados enable row level security;
create policy leitura_publica on public.dias_fechados for select to anon, authenticated using (true);
grant select on public.dias_fechados to anon, authenticated;

-- A auditoria identifica dias_fechados pela data (nao tem coluna id).
create or replace function privado.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo jsonb;
  v_velho jsonb;
  v_colunas text[];
  v_papel text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_velho := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_novo := to_jsonb(new);
  end if;
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_colunas
    from jsonb_object_keys(v_novo) k
    where (v_novo -> k) is distinct from (v_velho -> k);
    if v_colunas is null then
      return null;
    end if;
  end if;

  v_papel := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    session_user::text);

  insert into privado.auditoria (ator, papel, acao, tabela, registro, colunas)
  values (
    auth.uid(), v_papel, tg_op, tg_table_name,
    coalesce(v_novo, v_velho) ->> case tg_table_name
      when 'produtos' then 'slug'
      when 'dias_fechados' then 'data'
      else 'id' end,
    v_colunas);
  return null;
end
$$;

create trigger auditar after insert or update or delete on public.dias_fechados
  for each row execute function privado.auditar();

-- A loja aceita pedido agora? Horario do dia, vendas nao pausadas e a data de
-- Sao Paulo fora de dias_fechados.
create or replace function privado.loja_aberta(p_quando timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    not (select l.vendas_pausadas from public.loja l)
    and not exists (
      select 1 from public.dias_fechados d
      where d.data = (p_quando at time zone 'America/Sao_Paulo')::date)
    and exists (
      select 1 from public.horarios h
      where h.dia_da_semana = extract(dow from (p_quando at time zone 'America/Sao_Paulo'))
        and h.abre <= (p_quando at time zone 'America/Sao_Paulo')::time
        and (p_quando at time zone 'America/Sao_Paulo')::time < h.fecha),
    false);
$$;

create function privado.faixa_valida(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_agora timestamptz default now(),
  p_respeitar_pausa boolean default true
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_local timestamp;
  v_dia date;
  v_hora interval;
  v_h public.horarios;
begin
  if p_inicio is null or p_fim is null or p_agora is null then
    return false;
  end if;
  if p_fim - p_inicio <> interval '60 minutes' then
    return false;
  end if;
  if p_inicio < p_agora + interval '90 minutes' then
    return false;
  end if;

  v_local := p_inicio at time zone 'America/Sao_Paulo';
  if v_local <> date_trunc('hour', v_local) then
    return false;
  end if;
  v_dia := v_local::date;
  if v_dia > (p_agora at time zone 'America/Sao_Paulo')::date + 7 then
    return false;
  end if;
  if exists (select 1 from public.dias_fechados d where d.data = v_dia) then
    return false;
  end if;
  if p_respeitar_pausa and coalesce((select l.vendas_pausadas from public.loja l), true) then
    return false;
  end if;

  select * into v_h from public.horarios h where h.dia_da_semana = extract(dow from v_dia);
  if not found then
    return false;
  end if;
  v_hora := v_local::time - time '00:00';
  return v_hora - interval '30 minutes' >= v_h.abre - time '00:00'
    and v_hora + interval '60 minutes' <= v_h.fecha - time '00:00';
end
$$;

grant execute on function privado.faixa_valida(timestamptz, timestamptz, timestamptz, boolean)
  to service_role;
