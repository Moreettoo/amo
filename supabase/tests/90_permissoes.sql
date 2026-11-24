-- Inventario de permissoes (spec 14, teste 2). A lista de tudo o que anon,
-- authenticated, service_role e PUBLIC alcancam em public e privado tem de
-- ser exatamente a _esperado. Tabela, coluna ou funcao nova sem decisao
-- quebra este teste. Tambem confere, para todo objeto nosso:
--   RLS ligada em toda tabela;
--   toda funcao SECURITY DEFINER com search_path vazio;
--   nenhuma funcao com SQL dinamico (spec 19.1, ponto 3);
--   nenhuma tabela no Realtime.

create temp table _esperado (objeto text, papel text, privilegio text);
insert into _esperado (objeto, papel, privilegio) values
  ('schema privado', 'service_role', 'USAGE');

-- catalogo, horario, datas fechadas e loja: leitura publica
insert into _esperado (objeto, papel, privilegio)
select 'public.' || tabela, papel, 'SELECT'
from unnest(array['categorias', 'selos', 'vontades', 'linhas', 'produtos', 'horarios', 'loja', 'dias_fechados']) as tabela
cross join unnest(array['anon', 'authenticated']) as papel;

-- perfis: a cliente le o proprio e altera so nome e celular
insert into _esperado (objeto, papel, privilegio) values
  ('public.perfis', 'authenticated', 'SELECT'),
  ('public.perfis(nome)', 'authenticated', 'UPDATE'),
  ('public.perfis(celular)', 'authenticated', 'UPDATE'),
  ('public.definir_marketing(boolean)', 'authenticated', 'EXECUTE');

-- enderecos: a cliente le e apaga os proprios; cria e altera sem tocar em user_id
insert into _esperado (objeto, papel, privilegio) values
  ('public.enderecos', 'authenticated', 'SELECT'),
  ('public.enderecos', 'authenticated', 'DELETE');
insert into _esperado (objeto, papel, privilegio)
select format('public.enderecos(%s)', coluna), 'authenticated', privilegio
from unnest(array['apelido', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'principal']) as coluna
cross join unnest(array['INSERT', 'UPDATE']) as privilegio;

-- pedidos, itens e pagamentos: a cliente so le os proprios
insert into _esperado (objeto, papel, privilegio) values
  ('public.pedidos', 'authenticated', 'SELECT'),
  ('public.itens_do_pedido', 'authenticated', 'SELECT'),
  ('public.pagamentos', 'authenticated', 'SELECT');

-- fechamento: a cliente chama tres funcoes; o servidor registra a cotacao
insert into _esperado (objeto, papel, privilegio) values
  ('public.criar_pedido(jsonb, uuid, integer, boolean)', 'authenticated', 'EXECUTE'),
  ('public.iniciar_pagamento(uuid, text)', 'authenticated', 'EXECUTE'),
  ('public.cancelar_pedido(uuid)', 'authenticated', 'EXECUTE'),
  ('privado.registrar_cotacao(uuid, text, text, text, text, text, text, text, integer, integer, text, text, text, timestamp with time zone, timestamp with time zone)',
    'service_role', 'EXECUTE');

-- pagamento, avisos, entrega e limites: so a chave secreta
insert into _esperado (objeto, papel, privilegio) values
  ('privado.aplicar_pagamento(uuid, text, text, text, text, integer, text, text, integer, text, text, timestamp with time zone, text)',
    'service_role', 'EXECUTE'),
  ('privado.pagamentos_a_reconciliar()', 'service_role', 'EXECUTE'),
  ('privado.pagamentos_a_cancelar_no_mp(uuid)', 'service_role', 'EXECUTE'),
  ('privado.tentativas_a_cancelar_da_cliente(uuid)', 'service_role', 'EXECUTE'),
  ('privado.mp_pedido_da_tentativa(uuid)', 'service_role', 'EXECUTE'),
  ('privado.registrar_evento_webhook(text, text, text, text)', 'service_role', 'EXECUTE'),
  ('privado.concluir_evento_webhook(bigint, text)', 'service_role', 'EXECUTE'),
  ('privado.aplicar_entrega(text, text, text, integer)', 'service_role', 'EXECUTE'),
  ('privado.reservar_corridas(integer)', 'service_role', 'EXECUTE'),
  ('privado.marcar_corrida_criada(uuid, text, integer, text, text)', 'service_role', 'EXECUTE'),
  ('privado.marcar_corrida_falhou(uuid, text, boolean)', 'service_role', 'EXECUTE'),
  ('privado.remarcar_entrega(uuid, timestamp with time zone, timestamp with time zone)', 'service_role', 'EXECUTE'),
  ('privado.corridas_a_cancelar()', 'service_role', 'EXECUTE'),
  ('privado.corrida_cancelada(uuid)', 'service_role', 'EXECUTE'),
  ('privado.corridas_a_conferir()', 'service_role', 'EXECUTE'),
  ('privado.escalar_cancelamentos_incertos()', 'service_role', 'EXECUTE'),
  ('privado.ler_token_uber()', 'service_role', 'EXECUTE'),
  ('privado.guardar_token_uber(text, timestamp with time zone)', 'service_role', 'EXECUTE'),
  ('privado.reservar_renovacao_token()', 'service_role', 'EXECUTE'),
  ('privado.consumir_limite(text, integer, integer)', 'service_role', 'EXECUTE'),
  ('privado.faixa_valida(timestamp with time zone, timestamp with time zone, timestamp with time zone, boolean)',
    'service_role', 'EXECUTE');

-- comentarios: o visitante le o aprovado sem saber quem escreveu
insert into _esperado (objeto, papel, privilegio)
select format('public.comentarios(%s)', coluna), 'anon', 'SELECT'
from unnest(array['id', 'produto', 'nome_exibido', 'nota', 'texto', 'criado_em']) as coluna;
insert into _esperado (objeto, papel, privilegio)
select format('public.comentarios(%s)', coluna), 'authenticated', 'SELECT'
from unnest(array['id', 'produto', 'nome_exibido', 'nota', 'texto', 'criado_em', 'status']) as coluna;
insert into _esperado (objeto, papel, privilegio) values
  ('public.enviar_comentario(text, integer, text)', 'authenticated', 'EXECUTE');

-- conta: a cliente pergunta se pode excluir
insert into _esperado (objeto, papel, privilegio) values
  ('public.pode_excluir_conta()', 'authenticated', 'EXECUTE');

-- a porta: o Supabase a roda com o papel de quem chama
insert into _esperado (objeto, papel, privilegio) values
  ('public.conferir_porta()', 'anon', 'EXECUTE'),
  ('public.conferir_porta()', 'authenticated', 'EXECUTE'),
  ('public.conferir_porta()', 'service_role', 'EXECUTE');

create temp table _real as
with papeis as (
  select oid, rolname from pg_roles where rolname in ('anon', 'authenticated', 'service_role')
  union all
  select 0, 'PUBLIC'
),
esquemas as (
  select oid, nspname from pg_namespace where nspname in ('public', 'privado')
)
select format('%s.%s', e.nspname, c.relname) as objeto, p.rolname as papel, a.privilege_type as privilegio
from pg_class c
join esquemas e on e.oid = c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl,
  acldefault(case when c.relkind = 'S' then 's'::"char" else 'r'::"char" end, c.relowner))) a
join papeis p on p.oid = a.grantee
where c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
union all
select format('%s.%s(%s)', e.nspname, c.relname, att.attname), p.rolname, a.privilege_type
from pg_attribute att
join pg_class c on c.oid = att.attrelid
join esquemas e on e.oid = c.relnamespace
cross join lateral aclexplode(att.attacl) a
join papeis p on p.oid = a.grantee
where att.attnum > 0 and not att.attisdropped and att.attacl is not null
union all
select format('%s.%s(%s)', e.nspname, f.proname, oidvectortypes(f.proargtypes)), p.rolname, a.privilege_type
from pg_proc f
join esquemas e on e.oid = f.pronamespace
cross join lateral aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a
join papeis p on p.oid = a.grantee
union all
select 'schema privado', p.rolname, a.privilege_type
from pg_namespace n
cross join lateral aclexplode(n.nspacl) a
join papeis p on p.oid = a.grantee
where n.nspname = 'privado';

select pg_temp.verificar('permissao sobrando: ' || objeto || ' ' || papel || ' ' || privilegio, false)
from (select * from _real except select * from _esperado) sobrando;

select pg_temp.verificar('permissao faltando: ' || objeto || ' ' || papel || ' ' || privilegio, false)
from (select * from _esperado except select * from _real) faltando;

select pg_temp.verificar('inventario de permissoes confere',
  not exists (select * from _real except select * from _esperado)
  and not exists (select * from _esperado except select * from _real));

select pg_temp.verificar('RLS ligada: ' || n.nspname || '.' || c.relname, c.relrowsecurity)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'privado') and c.relkind in ('r', 'p');

select pg_temp.verificar('definer e search_path vazio: ' || n.nspname || '.' || f.proname,
  f.prosecdef and coalesce('search_path=""' = any(f.proconfig), false))
from pg_proc f join pg_namespace n on n.oid = f.pronamespace
where n.nspname in ('public', 'privado');

select pg_temp.verificar('sem SQL dinamico: ' || n.nspname || '.' || f.proname,
  f.prosrc !~* '\mexecute\M')
from pg_proc f join pg_namespace n on n.oid = f.pronamespace
where n.nspname in ('public', 'privado');

select pg_temp.verificar('nenhuma tabela nossa no Realtime',
  not exists (select 1 from pg_publication_tables where schemaname in ('public', 'privado')));

select * from pg_temp.relatorio();
rollback;
