-- AMO: os selos ganham ordem. A pagina do catalogo mostra os selos como
-- filtro, na ordem do cadastro; sem coluna, a ordem que o banco devolve nao
-- e garantida.
alter table public.selos add column ordem integer;

update public.selos set ordem = case id
  when 'zero-acucar' then 1 when 'adocante' then 2 when 'vapor' then 3
  when 'fibras' then 4 when 'vidro' then 5 when 'ingredientes' then 6
  when 'artesanal' then 7 end;

alter table public.selos alter column ordem set not null;
