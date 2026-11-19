-- AMO: o catalogo, o horario e a loja (spec 7.1 e 8).
-- Leitura publica para visitante e cliente; ninguem da API escreve. A equipe
-- edita pelo painel, e as regras de formato valem para ela tambem.
--
-- Formatos usados aqui e nas proximas migrations:
--   identificador (slug): letras minusculas, numeros e hifen, ate 80
--   texto livre: sem caractere de controle e sem < nem >, com tamanho maximo

create table public.categorias (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  nome text not null check (char_length(nome) between 1 and 80 and nome !~ '[[:cntrl:]<>]'),
  ordem integer not null
);

create table public.selos (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 80),
  nome text not null check (char_length(nome) between 1 and 80 and nome !~ '[[:cntrl:]<>]')
);

create table public.vontades (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  palavra text not null check (char_length(palavra) between 1 and 40 and palavra !~ '[[:cntrl:]<>]'),
  ordem integer not null
);

create table public.linhas (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  categoria text not null references public.categorias (slug),
  nome text not null check (char_length(nome) between 1 and 80 and nome !~ '[[:cntrl:]<>]'),
  tipo text not null check (char_length(tipo) between 1 and 80 and tipo !~ '[[:cntrl:]<>]'),
  regra text not null check (char_length(regra) between 1 and 80 and regra !~ '[[:cntrl:]<>]'),
  selos text[] not null default '{}' check (cardinality(selos) <= 20),
  frase text check (char_length(frase) between 1 and 120 and frase !~ '[[:cntrl:]<>]'),
  modo_de_aproveitar jsonb check (jsonb_typeof(modo_de_aproveitar) = 'object'),
  cor_do_rotulo text not null check (cor_do_rotulo in ('papel', 'linho', 'kraft')),
  ordem integer not null
);

create table public.produtos (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  nome text not null check (char_length(nome) between 1 and 80 and nome !~ '[[:cntrl:]<>]'),
  linha text not null references public.linhas (slug),
  formato text not null check (formato ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(formato) <= 30),
  frase text check (char_length(frase) between 1 and 120 and frase !~ '[[:cntrl:]<>]'),
  descricao text check (char_length(descricao) between 1 and 600 and descricao !~ '[[:cntrl:]<>]'),
  imagem_src text not null check (imagem_src ~ '^/[a-z0-9/_.-]+$' and char_length(imagem_src) <= 200),
  imagem_alt text not null check (char_length(imagem_alt) between 1 and 300 and imagem_alt !~ '[[:cntrl:]<>]'),
  imagem_largura integer not null check (imagem_largura > 0),
  imagem_altura integer not null check (imagem_altura > 0),
  selos text[] not null default '{}' check (cardinality(selos) <= 20),
  vontades text[] not null default '{}' check (cardinality(vontades) <= 20),
  destaque boolean not null default false,
  ordem integer not null,
  preco_centavos integer check (preco_centavos > 0),
  a_venda boolean not null default false,
  constraint a_venda_exige_preco check (not a_venda or preco_centavos is not null)
);

create index linhas_categoria on public.linhas (categoria);
create index produtos_linha on public.produtos (linha);

-- Dia da semana como o Postgres conta (0 = domingo), na hora de Sao Paulo.
-- Dia sem linha e dia fechado.
create table public.horarios (
  dia_da_semana smallint primary key check (dia_da_semana between 0 and 6),
  abre time not null,
  fecha time not null,
  constraint abre_antes_de_fechar check (abre < fecha and fecha <= '24:00')
);

-- Uma linha so.
create table public.loja (
  id boolean primary key default true check (id),
  vendas_pausadas boolean not null default false
);

insert into public.horarios (dia_da_semana, abre, fecha)
select dia, '09:00', '18:00' from generate_series(0, 6) as dia;

insert into public.loja (vendas_pausadas) values (false);

alter table public.categorias enable row level security;
alter table public.selos enable row level security;
alter table public.vontades enable row level security;
alter table public.linhas enable row level security;
alter table public.produtos enable row level security;
alter table public.horarios enable row level security;
alter table public.loja enable row level security;

create policy leitura_publica on public.categorias for select to anon, authenticated using (true);
create policy leitura_publica on public.selos for select to anon, authenticated using (true);
create policy leitura_publica on public.vontades for select to anon, authenticated using (true);
create policy leitura_publica on public.linhas for select to anon, authenticated using (true);
create policy leitura_publica on public.produtos for select to anon, authenticated using (true);
create policy leitura_publica on public.horarios for select to anon, authenticated using (true);
create policy leitura_publica on public.loja for select to anon, authenticated using (true);

grant select on public.categorias, public.selos, public.vontades, public.linhas,
  public.produtos, public.horarios, public.loja to anon, authenticated;
