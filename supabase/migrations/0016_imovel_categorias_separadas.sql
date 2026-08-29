-- Separa a categoria única de imóveis em duas: "Imóveis para Alugar" e
-- "Imóveis à Venda" — cada tipo de anúncio (aluguel/venda) passa a ter sua
-- própria categoria, em vez de compartilhar a mesma.

-- Garante o nome original (caso a 0014_venda_imovel.sql já tenha renomeado
-- pra "Imóveis").
update public.categories set name = 'Imóveis para Alugar' where name = 'Imóveis';

insert into public.categories (name, sort_order) values ('Imóveis à Venda', 38);

with cat as (select id, name from public.categories where name = 'Imóveis à Venda')
insert into public.subcategories (category_id, name, sort_order)
select cat.id, v.name, v.sort_order
from (values
  ('Apartamento',1),
  ('Casa',2),
  ('Kitnet/Studio',3),
  ('Terreno',4),
  ('Comercial/Sala',5),
  ('Vaga de garagem',6),
  ('Sítio',7),
  ('Outros',8)
) as v(name, sort_order)
cross join cat;

-- "Sítio" também em "Imóveis para Alugar".
insert into public.subcategories (category_id, name, sort_order)
select id, 'Sítio', 9 from public.categories where name = 'Imóveis para Alugar';
