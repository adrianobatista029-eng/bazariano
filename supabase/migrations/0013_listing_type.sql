-- Tipo de anúncio: produto (venda física, o que já existia), serviço
-- (encanador, eletricista, diarista...) e aluguel de imóvel. Serviço e
-- aluguel não usam estoque/condição/entrega (não fazem sentido pra eles) e
-- passam a exigir telefone de contato, já que o contato costuma ser
-- combinado direto por fora do fluxo de carrinho/checkout.

alter table public.products add column listing_type text not null default 'produto'
  check (listing_type in ('produto', 'servico', 'aluguel'));

alter table public.products add column contact_phone text;
alter table public.products add constraint products_contact_phone_required
  check (listing_type = 'produto' or contact_phone is not null);

-- Produto continua exigindo pelo menos uma opção de entrega; serviço e
-- aluguel não usam esse conceito, então ficam isentos dessa exigência.
alter table public.products drop constraint products_delivery_option_required;
alter table public.products add constraint products_delivery_option_required
  check (listing_type <> 'produto' or allow_pickup or allow_delivery or allow_seller_delivery);

-- Novas categorias pra cobrir serviço e aluguel.
insert into public.categories (name, sort_order) values
  ('Serviços', 21),
  ('Imóveis para Alugar', 22);

with cat as (select id, name from public.categories)
insert into public.subcategories (category_id, name, sort_order)
select cat.id, v.name, v.sort_order
from (values
  ('Serviços','Encanador',1),
  ('Serviços','Eletricista',2),
  ('Serviços','Diarista',3),
  ('Serviços','Pintor',4),
  ('Serviços','Marceneiro',5),
  ('Serviços','Jardinagem',6),
  ('Serviços','Montador de móveis',7),
  ('Serviços','Frete e mudança',8),
  ('Serviços','Professor particular',9),
  ('Serviços','Manicure e cabeleireiro',10),
  ('Serviços','Técnico em informática',11),
  ('Serviços','Mecânico',12),
  ('Serviços','Personal trainer',13),
  ('Serviços','Fotógrafo',14),
  ('Serviços','Outros',15),

  ('Imóveis para Alugar','Apartamento',1),
  ('Imóveis para Alugar','Casa',2),
  ('Imóveis para Alugar','Kitnet/Studio',3),
  ('Imóveis para Alugar','Quarto',4),
  ('Imóveis para Alugar','Temporada',5),
  ('Imóveis para Alugar','Comercial/Sala',6),
  ('Imóveis para Alugar','Vaga de garagem',7),
  ('Imóveis para Alugar','Outros',8)
) as v(category_name, name, sort_order)
join cat on cat.name = v.category_name;
