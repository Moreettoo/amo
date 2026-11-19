-- AMO: a loja nao abre aos domingos (decisao do dono, 2026-11-19). Dia sem
-- linha em horarios e dia fechado (spec 7.1); domingo e o dia 0.
delete from public.horarios where dia_da_semana = 0;
