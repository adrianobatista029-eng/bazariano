-- Suporte a múltiplas fotos e vídeos (estilo stories) por produto.
--
-- Antes disso, "vender" nunca teve upload de mídia nenhum — a coluna
-- products.photos ficava sempre vazia. Substituímos por uma tabela própria
-- (product_media), que permite várias fotos/vídeos por produto com ordem
-- definida, em vez de um array solto.

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  type text not null check (type in ('photo', 'video')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_media_product_id_idx on public.product_media (product_id, position);

alter table public.product_media enable row level security;

-- leitura segue a mesma regra de visibilidade do produto pai
create policy "product_media_select_via_product" on public.product_media
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_media.product_id
        and (p.status = 'active' or p.seller_id = auth.uid() or public.current_role() = 'admin')
    )
  );

create policy "product_media_insert_own" on public.product_media
  for insert with check (
    exists (
      select 1 from public.products p
      where p.id = product_media.product_id and p.seller_id = auth.uid()
    )
  );

create policy "product_media_update_own_or_admin" on public.product_media
  for update using (
    exists (
      select 1 from public.products p
      where p.id = product_media.product_id
        and (p.seller_id = auth.uid() or public.current_role() = 'admin')
    )
  );

create policy "product_media_delete_own_or_admin" on public.product_media
  for delete using (
    exists (
      select 1 from public.products p
      where p.id = product_media.product_id
        and (p.seller_id = auth.uid() or public.current_role() = 'admin')
    )
  );

-- products.photos nunca chegou a ser usado de verdade (upload nunca existiu);
-- a partir de agora a fonte de mídia é sempre product_media.
alter table public.products drop column photos;

-- ---------------------------------------------------------------
-- STORAGE: bucket público para as mídias de produto
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  52428800, -- 50MB
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
);

-- convenção de path: {seller_id}/{product_id}/{arquivo} — a primeira pasta
-- precisa bater com o auth.uid() de quem está enviando/apagando.
create policy "product_media_bucket_public_read" on storage.objects
  for select using (bucket_id = 'product-media');

create policy "product_media_bucket_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'product-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "product_media_bucket_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'product-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
