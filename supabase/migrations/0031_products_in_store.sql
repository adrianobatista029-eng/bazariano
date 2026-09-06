-- ============================================================
-- Produto só aparece na loja se o vendedor escolher colocar lá —
-- "Meus Anúncios" continua sendo a lista completa, independente disso.
-- ============================================================
alter table public.products add column if not exists in_store boolean not null default false;

create index products_in_store_idx on public.products (seller_id, in_store) where in_store;
