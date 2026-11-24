-- AMO: a janela do agendado exige inicio e fim.
--
-- Os checks de 20261124002153_modo_de_entrega.sql deixavam passar um agendado
-- com o fim nulo: "fim > inicio" da nulo, o "or" inteiro da nulo, e o
-- Postgres aceita check nulo. Os dois checks voltam com os mesmos nomes e
-- "fim is not null" escrito.

alter table privado.cotacoes
  drop constraint modo_e_janela,
  add constraint modo_e_janela check (
    (modo = 'agora' and janela_inicio is null and janela_fim is null)
    or (modo = 'agendado' and janela_inicio is not null and janela_fim is not null
        and janela_fim > janela_inicio));

alter table public.pedidos
  drop constraint entrega_modo_e_janela,
  add constraint entrega_modo_e_janela check (
    (entrega_modo = 'agora' and entrega_janela_inicio is null and entrega_janela_fim is null)
    or (entrega_modo = 'agendado' and entrega_janela_inicio is not null and entrega_janela_fim is not null
        and entrega_janela_fim > entrega_janela_inicio));
