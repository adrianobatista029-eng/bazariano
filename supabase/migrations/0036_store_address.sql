-- Endereço/localização da loja (pra exibir no mapa) — mesma estrutura usada
-- em products (0018_product_address.sql).
alter table public.stores add column street text;
alter table public.stores add column number text;
alter table public.stores add column neighborhood text;
alter table public.stores add column city text;
alter table public.stores add column state text;
alter table public.stores add column lat double precision;
alter table public.stores add column lng double precision;
