-- 4º tipo de anúncio: venda de imóvel (além de produto/serviço/aluguel).
-- Renomeia a categoria pra cobrir aluguel e venda juntos, distinguidos pelo
-- listing_type, não por categorias separadas.

alter table public.products drop constraint products_listing_type_check;
alter table public.products add constraint products_listing_type_check
  check (listing_type in ('produto', 'servico', 'aluguel', 'venda_imovel'));

update public.categories set name = 'Imóveis' where name = 'Imóveis para Alugar';
