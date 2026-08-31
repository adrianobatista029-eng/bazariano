-- Reputação vinculada ao perfil (não ao anúncio): faltava a estatística
-- pública do lado "comprador" (o vendedor já avalia o comprador hoje, mas
-- não existia nenhuma função pra agregar isso).
create function public.get_buyer_public_stats(p_buyer_id uuid)
returns table (completed_orders bigint, avg_rating numeric, total_reviews bigint, top_tags text[])
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.orders where buyer_id = p_buyer_id and status = 'delivered'),
    coalesce((select round(avg(overall_rating), 1) from public.reviews
      where reviewee_id = p_buyer_id and target_type = 'buyer'), 0),
    coalesce((select count(*) from public.reviews
      where reviewee_id = p_buyer_id and target_type = 'buyer'), 0),
    coalesce((
      select array_agg(tag) from (
        select unnest(tags) as tag, count(*) as c
        from public.reviews
        where reviewee_id = p_buyer_id and target_type = 'buyer'
        group by tag
        order by c desc
        limit 5
      ) t
    ), '{}');
$$;

grant execute on function public.get_buyer_public_stats(uuid) to anon, authenticated;

-- Comentários no anúncio (tipo Q&A: "ainda disponível?", "aceita troca?") —
-- ao contrário das avaliações (que ficam no perfil do usuário), isso é
-- conteúdo do anúncio em si, sem nota.
create table public.product_comments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index product_comments_product_id_idx on public.product_comments (product_id, created_at);

alter table public.product_comments enable row level security;

create policy "product_comments_select_all" on public.product_comments
  for select using (true);

create policy "product_comments_insert_own" on public.product_comments
  for insert with check (author_id = auth.uid());

create policy "product_comments_delete_own_or_owner_or_admin" on public.product_comments
  for delete using (
    author_id = auth.uid()
    or public.current_role() = 'admin'
    or exists (
      select 1 from public.products p
      where p.id = product_comments.product_id and p.seller_id = auth.uid()
    )
  );
