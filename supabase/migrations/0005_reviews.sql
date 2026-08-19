-- Sistema de avaliação híbrido: comprador avalia vendedor, entregador e
-- produto(s); vendedor avalia comprador e entregador. Cada avaliação tem 3
-- notas de dimensão (1-5) + tags rápidas + comentário opcional.

create type review_target_type as enum ('seller', 'courier', 'buyer', 'product');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid references public.profiles (id) on delete cascade,
  target_type review_target_type not null,
  product_id uuid references public.products (id) on delete cascade,
  dimension_ratings jsonb not null default '{}'::jsonb,
  overall_rating numeric(2,1) not null check (overall_rating >= 1 and overall_rating <= 5),
  tags text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now()
);

create index reviews_reviewee_id_idx on public.reviews (reviewee_id);
create index reviews_product_id_idx on public.reviews (product_id);
create index reviews_order_id_idx on public.reviews (order_id);

-- Um review de vendedor/entregador/comprador por pedido+autor; um review de
-- produto por pedido+autor+produto (pedido pode ter vários produtos).
create unique index reviews_unique_non_product on public.reviews (order_id, reviewer_id, target_type)
  where target_type <> 'product';
create unique index reviews_unique_product on public.reviews (order_id, reviewer_id, product_id)
  where target_type = 'product';

alter table public.reviews enable row level security;

create policy "reviews_select_all" on public.reviews
  for select using (true);

create policy "reviews_insert_valid_participant" on public.reviews
  for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.status = 'delivered'
        and (
          (target_type = 'seller' and reviewer_id = o.buyer_id and reviewee_id = o.seller_id)
          or
          (target_type = 'buyer' and reviewer_id = o.seller_id and reviewee_id = o.buyer_id)
          or
          (target_type = 'courier' and o.courier_id is not null and reviewee_id = o.courier_id
            and reviewer_id in (o.buyer_id, o.seller_id))
          or
          (target_type = 'product' and reviewer_id = o.buyer_id
            and exists (
              select 1 from public.order_items oi
              where oi.order_id = o.id and oi.product_id = reviews.product_id
            ))
        )
    )
  );

-- Estatísticas públicas agregadas (não expõem os pedidos em si).
drop function if exists public.get_seller_public_stats(uuid);

create function public.get_seller_public_stats(p_seller_id uuid)
returns table (completed_orders bigint, avg_rating numeric, total_reviews bigint, top_tags text[])
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.orders where seller_id = p_seller_id and status = 'delivered'),
    coalesce((select round(avg(overall_rating), 1) from public.reviews
      where reviewee_id = p_seller_id and target_type = 'seller'), 0),
    coalesce((select count(*) from public.reviews
      where reviewee_id = p_seller_id and target_type = 'seller'), 0),
    coalesce((
      select array_agg(tag) from (
        select unnest(tags) as tag, count(*) as c
        from public.reviews
        where reviewee_id = p_seller_id and target_type = 'seller'
        group by tag
        order by c desc
        limit 5
      ) t
    ), '{}');
$$;

create function public.get_courier_public_stats(p_courier_id uuid)
returns table (completed_deliveries bigint, avg_rating numeric, total_reviews bigint, top_tags text[])
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.orders where courier_id = p_courier_id and status = 'delivered'),
    coalesce((select round(avg(overall_rating), 1) from public.reviews
      where reviewee_id = p_courier_id and target_type = 'courier'), 0),
    coalesce((select count(*) from public.reviews
      where reviewee_id = p_courier_id and target_type = 'courier'), 0),
    coalesce((
      select array_agg(tag) from (
        select unnest(tags) as tag, count(*) as c
        from public.reviews
        where reviewee_id = p_courier_id and target_type = 'courier'
        group by tag
        order by c desc
        limit 5
      ) t
    ), '{}');
$$;

create function public.get_product_public_stats(p_product_id uuid)
returns table (avg_rating numeric, total_reviews bigint, top_tags text[])
language sql
security definer
set search_path = public
as $$
  select
    coalesce((select round(avg(overall_rating), 1) from public.reviews
      where product_id = p_product_id and target_type = 'product'), 0),
    coalesce((select count(*) from public.reviews
      where product_id = p_product_id and target_type = 'product'), 0),
    coalesce((
      select array_agg(tag) from (
        select unnest(tags) as tag, count(*) as c
        from public.reviews
        where product_id = p_product_id and target_type = 'product'
        group by tag
        order by c desc
        limit 5
      ) t
    ), '{}');
$$;

grant execute on function public.get_seller_public_stats(uuid) to anon, authenticated;
grant execute on function public.get_courier_public_stats(uuid) to anon, authenticated;
grant execute on function public.get_product_public_stats(uuid) to anon, authenticated;
