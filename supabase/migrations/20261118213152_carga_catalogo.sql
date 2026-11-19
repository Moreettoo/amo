-- AMO: a carga inicial do catalogo, gerada de src/data/*.ts.
-- Preco e descricao sao os de src/data/exemplos.ts: DADOS DE EXEMPLO, a
-- trocar pelos reais antes de ir ao ar (spec 15, etapa 4).

insert into public.categorias (slug, nome, ordem) values
  ('doces', 'Doces', 1);

insert into public.selos (id, nome) values
  ('zero-acucar', 'Zero açúcar'),
  ('adocante', 'Adoçado com eritritol e stevia'),
  ('vapor', 'Cozido a vapor'),
  ('fibras', 'Fonte de fibras'),
  ('vidro', 'Pote de vidro reutilizável'),
  ('ingredientes', 'Ingredientes selecionados'),
  ('artesanal', 'Produzido artesanalmente');

insert into public.vontades (slug, palavra, ordem) values
  ('chocolate', 'Chocolate', 1),
  ('fruta', 'Fruta', 2),
  ('coco', 'Coco', 3),
  ('classico', 'Um clássico', 4),
  ('salgado', 'Algo salgado', 5);

insert into public.linhas (slug, categoria, nome, tipo, regra, selos, frase, modo_de_aproveitar, cor_do_rotulo, ordem) values
  ('bolos-no-pote', 'doces', 'Bolos no pote', 'Bolo no pote', 'Zero açúcar', array['adocante', 'vapor', 'fibras', 'vidro', 'ingredientes', 'artesanal']::text[], 'Um abraço em forma de sobremesa', '{"titulo":"Como aproveitar seu AMO","passos":["Abra com amor","Pegue sua colher","A saboreie sem culpa","Cuide do pote de vidro"]}'::jsonb, 'papel', 1);

insert into public.produtos (slug, nome, linha, formato, frase, descricao, imagem_src, imagem_alt, imagem_largura, imagem_altura, selos, vontades, destaque, ordem, preco_centavos, a_venda) values
  ('prestigio', 'Prestígio', 'bolos-no-pote', 'pote', 'Um abraço em forma de sobremesa', 'Massa de chocolate úmida, cozida a vapor, com creme de coco e coco ralado por cima. Zero açúcar, adoçado com eritritol e stevia.', '/produtos/prestigio.webp', 'Pote de vidro com bolo de prestígio, coberto de coco ralado, ao lado de pedaços de chocolate e coco fresco', 666, 1000, array['zero-acucar', 'fibras']::text[], array['chocolate', 'coco', 'classico']::text[], true, 1, 1890, true),
  ('pacoca', 'Paçoca', 'bolos-no-pote', 'pote', 'O sabor que desperta boas lembranças', 'Massa fofinha com creme de paçoca e amendoim inteiro por cima, o gosto de festa junina sem o açúcar.', '/produtos/pacoca.webp', 'Pote de vidro com bolo de paçoca, com amendoins inteiros por cima, ao lado de cubos de paçoca', 714, 1000, array['zero-acucar', 'fibras']::text[], array['classico']::text[], false, 2, 1890, true),
  ('mousse-de-maracuja', 'Mousse de maracujá', 'bolos-no-pote', 'pote', 'Para dias mais leves', 'Massa leve com mousse de maracujá aerado e as sementes da fruta na cobertura. Azedinho na medida.', '/produtos/mousse-de-maracuja.webp', 'Pote de vidro com mousse de maracujá, com sementes de maracujá na cobertura, ao lado de maracujás cortados', 800, 951, array['zero-acucar', 'fibras']::text[], array['fruta']::text[], false, 3, 1890, true),
  ('ninho-com-frutas-vermelhas', 'Ninho com frutas vermelhas', 'bolos-no-pote', 'pote', 'Quando o doce encontra o azedinho perfeito', 'Creme de leite Ninho entre camadas de massa branca, com calda de frutas vermelhas que corta o doce.', '/produtos/ninho-com-frutas-vermelhas.webp', 'Pote de vidro com bolo de ninho com frutas vermelhas, com calda vermelha por cima, ao lado de framboesas e amoras', 750, 1000, array['zero-acucar', 'fibras']::text[], array['fruta']::text[], false, 4, 2190, true),
  ('beijinho', 'Beijinho', 'bolos-no-pote', 'pote', 'Para adoçar o coração', 'Massa branca com creme de coco cremoso e coco ralado por cima, como o docinho da festa.', '/produtos/beijinho.webp', 'Pote de vidro com bolo de beijinho, com coco ralado na cobertura, ao lado de doces de beijinho em prato branco', 666, 1000, array['zero-acucar', 'fibras']::text[], array['coco', 'classico']::text[], false, 5, 1890, true),
  ('chocolate', 'Chocolate', 'bolos-no-pote', 'pote', 'Para os apaixonados por chocolate', 'Massa de cacau com creme de chocolate meio amargo e raspas por cima. Para quem não abre mão do chocolate.', '/produtos/chocolate.webp', 'Pote de vidro com bolo de chocolate, com raspas de chocolate por cima, ao lado de barras de chocolate meio amargo', 750, 1000, array['zero-acucar', 'fibras']::text[], array['chocolate']::text[], false, 6, 1890, true),
  ('frutas-amarelas', 'Frutas amarelas', 'bolos-no-pote', 'pote', 'Manga, pêssego e maracujá', 'Massa leve com creme de manga, pêssego e calda de maracujá. Fresco, de fruta mesmo.', '/produtos/frutas-amarelas.webp', 'Pote de vidro com bolo de frutas amarelas, com calda de maracujá na cobertura, ao lado de manga cortada em cubos', 750, 1000, array['zero-acucar', 'fibras']::text[], array['fruta']::text[], false, 7, 2090, true);
