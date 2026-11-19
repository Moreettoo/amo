-- Apoio dos testes de banco da AMO.
--
-- Cada teste roda numa chamada so: o conteudo deste arquivo seguido do
-- conteudo do teste. Tudo acontece numa transacao que o proprio teste desfaz
-- no fim ("select * from pg_temp.relatorio(); rollback;"): nada fica gravado.
-- O resultado e uma linha RESUMO e uma linha por verificacao, as falhas
-- primeiro.

begin;

create temp table _resultado (
  n serial primary key,
  nome text not null,
  ok boolean not null,
  detalhe text
);

-- Ids que um teste guarda para usar depois: _v(nome, id).
create temp table _v (nome text primary key, id uuid not null);

create function pg_temp.verificar(p_nome text, p_ok boolean, p_detalhe text default null)
returns void
language sql
as $$
  insert into _resultado (nome, ok, detalhe) values (p_nome, coalesce(p_ok, false), p_detalhe);
$$;

create function pg_temp.id(p_nome text)
returns uuid
language sql
stable
as $$
  select id from _v where nome = p_nome;
$$;

-- Roda um comando como um papel da API (anon, authenticated, service_role),
-- com p_usuario no lugar de auth.uid(). Devolve 'ok' ou 'SQLSTATE mensagem'.
create function pg_temp.como(p_papel text, p_usuario uuid, p_comando text)
returns text
language plpgsql
as $$
declare
  v_saida text := 'ok';
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', p_papel)::text, true);
  execute format('set local role %I', p_papel);
  begin
    execute p_comando;
  exception when others then
    v_saida := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  return v_saida;
end
$$;

-- Igual, para uma consulta de um valor so. Devolve o valor como texto,
-- '<nulo>' quando nulo, ou 'erro SQLSTATE mensagem'.
create function pg_temp.valor(p_papel text, p_usuario uuid, p_consulta text)
returns text
language plpgsql
as $$
declare
  v_saida text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', p_papel)::text, true);
  execute format('set local role %I', p_papel);
  begin
    execute p_consulta into v_saida;
    v_saida := coalesce(v_saida, '<nulo>');
  exception when others then
    v_saida := 'erro ' || sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  return v_saida;
end
$$;

-- Prepara o cenario do teste como dono do banco (pausar as vendas, tirar um
-- produto de venda). Erro aqui derruba o teste inteiro. Como tudo o mais,
-- e desfeito no fim.
create function pg_temp.preparar(p_comando text)
returns void
language plpgsql
as $$
begin
  execute p_comando;
end
$$;

-- Uma cliente nova pelo caminho do cadastro: insere em auth.users e o
-- gatilho de cadastro cria o perfil.
create function pg_temp.nova_cliente(
  p_email text,
  p_meta jsonb default null,
  p_confirmada boolean default true
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, aud, role, email, raw_user_meta_data,
    email_confirmed_at, created_at, updated_at
  ) values (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    coalesce(p_meta, jsonb_build_object(
      'nome', 'Cliente Teste',
      'celular', '11987654321',
      'aceite_termos', true,
      'versao_termos', '2026-11-18',
      'aceite_marketing', false
    )),
    case when p_confirmada then now() end, now(), now()
  );
  return v_id;
end
$$;

-- Um pedido valido de p_usuario (um pote de prestigio, frete 9,90), levado
-- pelas passagens permitidas ate p_status.
create function pg_temp.pedido_de_exemplo(p_usuario uuid, p_status text default 'aguardando_pagamento')
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_numero text := 'AMO-' || (
    select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + floor(random() * 31)::int, 1), '')
    from generate_series(1, 8));
begin
  insert into public.pedidos (
    numero, user_id, subtotal_centavos, frete_centavos, total_centavos,
    cliente_nome, cliente_celular, cliente_email,
    entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento,
    entrega_bairro, entrega_cidade, entrega_uf, entrega_minutos
  ) values (
    v_numero, p_usuario, 1890, 990, 2880,
    'Cliente Teste', '11987654321', 'cliente@teste.invalid',
    '04567000', 'Rua Siqueira Bueno', '120', 'ap 52',
    'Belenzinho', 'São Paulo', 'SP', 35
  ) returning id into v_id;

  insert into public.itens_do_pedido (pedido_id, produto, nome, tipo, preco_centavos, quantos, total_centavos)
  values (v_id, 'prestigio', 'Prestígio', 'Bolo no pote', 1890, 1, 1890);

  if p_status in ('pago', 'em_preparo', 'a_caminho', 'entregue') then
    update public.pedidos set status = 'pago' where id = v_id;
  end if;
  if p_status in ('em_preparo', 'a_caminho', 'entregue') then
    update public.pedidos set status = 'em_preparo' where id = v_id;
  end if;
  if p_status in ('a_caminho', 'entregue') then
    update public.pedidos set status = 'a_caminho' where id = v_id;
  end if;
  if p_status = 'entregue' then
    update public.pedidos set status = 'entregue' where id = v_id;
  end if;
  if p_status = 'cancelado' then
    update public.pedidos set status = 'cancelado', motivo_cancelamento = 'loja' where id = v_id;
  end if;
  return v_id;
end
$$;

create function pg_temp.relatorio()
returns table (resultado text, nome text, detalhe text)
language sql
as $$
  select resultado, nome, detalhe
  from (
    select 0 as ordem, 0 as n, 'RESUMO' as resultado,
      format('%s de %s passaram', count(*) filter (where ok), count(*)) as nome,
      null::text as detalhe
    from _resultado
    union all
    select case when ok then 2 else 1 end, n, case when ok then 'ok' else 'FALHA' end, nome, detalhe
    from _resultado
  ) linhas
  order by ordem, n;
$$;
