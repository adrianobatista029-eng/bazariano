-- Stories reais (estilo Instagram): conteúdo efêmero postado deliberadamente
-- pelo vendedor, vinculado a um anúncio/produto ATIVO dele. Substitui o
-- comportamento anterior de reaproveitar automaticamente as fotos/vídeos de
-- qualquer anúncio como "story".

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index stories_seller_id_idx on public.stories (seller_id, created_at);
create index stories_product_id_idx on public.stories (product_id);

alter table public.stories enable row level security;

-- Visível enquanto não expirou (24h) e o anúncio vinculado continuar ativo —
-- se o anúncio for removido/vendido, a story some junto.
create policy "stories_select_active" on public.stories
  for select using (
    expires_at > now()
    and exists (
      select 1 from public.products p
      where p.id = stories.product_id and p.status = 'active'
    )
  );

-- Só posta story vinculada a um anúncio próprio que esteja ativo no momento.
create policy "stories_insert_own_active_product" on public.stories
  for insert with check (
    seller_id = auth.uid()
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = auth.uid() and p.status = 'active'
    )
  );

create policy "stories_delete_own_or_admin" on public.stories
  for delete using (seller_id = auth.uid() or public.current_role() = 'admin');

-- ---------------------------------------------------------------
-- STORAGE: bucket público para as mídias de stories
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stories',
  'stories',
  true,
  52428800, -- 50MB
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
);

-- convenção de path: {seller_id}/{arquivo} — a primeira pasta precisa bater
-- com o auth.uid() de quem está enviando/apagando.
create policy "stories_bucket_public_read" on storage.objects
  for select using (bucket_id = 'stories');

create policy "stories_bucket_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "stories_bucket_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
