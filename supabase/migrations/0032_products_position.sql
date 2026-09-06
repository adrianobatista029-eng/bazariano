-- ============================================================
-- Ordem de exibição dos produtos dentro da loja (setas pra cima/baixo)
-- ============================================================
alter table public.products add column if not exists position integer not null default 0;
