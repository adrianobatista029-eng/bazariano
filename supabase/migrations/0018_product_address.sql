-- Endereço próprio de cada anúncio (em vez de herdar do perfil do
-- vendedor) — mesma estrutura usada em profiles (0010_structured_address.sql).
alter table public.products add column street text;
alter table public.products add column number text;
alter table public.products add column neighborhood text;
alter table public.products add column city text;
alter table public.products add column state text;
alter table public.products add column lat double precision;
alter table public.products add column lng double precision;
