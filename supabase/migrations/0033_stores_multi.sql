-- ============================================================
-- Lojas deixam de ser 1:1 com o perfil — um usuário pode ter várias
-- (limite de 15, checado na aplicação, não aqui).
-- ============================================================
alter table public.stores add column owner_id uuid references public.profiles (id) on delete cascade;
update public.stores set owner_id = id where owner_id is null;
alter table public.stores alter column owner_id set not null;

-- `id` era ao mesmo tempo PK e FK pro dono (1:1) — agora vira só um uuid
-- gerado, e quem aponta pro dono é `owner_id`.
alter table public.stores drop constraint stores_id_fkey;
alter table public.stores alter column id set default gen_random_uuid();

create index stores_owner_id_idx on public.stores (owner_id);

drop policy if exists "stores_insert_own" on public.stores;
drop policy if exists "stores_update_own" on public.stores;

create policy "stores_insert_own" on public.stores
  for insert with check (owner_id = auth.uid());

create policy "stores_update_own" on public.stores
  for update using (owner_id = auth.uid());

-- ---------------------------------------------------------------
-- products.in_store (boolean) -> products.store_id (aponta pra QUAL loja,
-- já que agora um vendedor pode ter mais de uma).
-- ---------------------------------------------------------------
alter table public.products add column store_id uuid references public.stores (id) on delete set null;

update public.products p
set store_id = (select s.id from public.stores s where s.owner_id = p.seller_id limit 1)
where p.in_store = true;

alter table public.products drop column in_store;

create index products_store_id_idx on public.products (store_id);
