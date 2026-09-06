-- ============================================================
-- Lojas (Fase 1 da vitrine própria) — 1:1 com profiles
-- ============================================================
create table public.stores (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  banner_url text,
  primary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_slug_idx on public.stores (slug);

create trigger set_stores_updated_at before update on public.stores
  for each row execute procedure public.set_updated_at();

alter table public.stores enable row level security;

-- Página pública da loja: qualquer um vê; só o dono cria/edita a própria.
create policy "stores_select_all" on public.stores
  for select using (true);

create policy "stores_insert_own" on public.stores
  for insert with check (id = auth.uid());

create policy "stores_update_own" on public.stores
  for update using (id = auth.uid());
