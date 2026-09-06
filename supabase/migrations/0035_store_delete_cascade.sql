-- ============================================================
-- Apagar uma loja apaga os produtos dela junto (antes só desvinculava)
-- ============================================================
alter table public.products drop constraint if exists products_store_id_fkey;
alter table public.products add constraint products_store_id_fkey
  foreign key (store_id) references public.stores (id) on delete cascade;

-- Não existia policy de delete nenhuma em stores — sem isso o RLS barra
-- qualquer exclusão por padrão.
drop policy if exists "stores_delete_own" on public.stores;
create policy "stores_delete_own" on public.stores
  for delete using (owner_id = auth.uid());
