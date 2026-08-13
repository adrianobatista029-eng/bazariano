-- ============================================================
-- Marketplace com Entregadores — schema inicial
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------
create type user_role as enum ('buyer_seller', 'admin', 'courier');
create type order_status as enum ('pending', 'accepted', 'picked_up', 'delivering', 'delivered', 'cancelled');
create type courier_status as enum ('offline', 'online', 'busy');

-- ---------------------------------------------------------------
-- PROFILES (1:1 com auth.users)
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'buyer_seller',
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cria profile automaticamente ao registrar usuário
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'buyer_seller')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------
-- COURIERS (extensão de profile para entregadores)
-- ---------------------------------------------------------------
create table public.couriers (
  id uuid primary key references public.profiles (id) on delete cascade,
  vehicle_type text,
  vehicle_plate text,
  document_url text,
  status courier_status not null default 'offline',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  photos text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'active' check (status in ('active', 'paused', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_seller_id_idx on public.products (seller_id);
create index products_status_idx on public.products (status);

-- ---------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  courier_id uuid references public.profiles (id) on delete set null,
  status order_status not null default 'pending',
  delivery_address text not null,
  delivery_lat double precision,
  delivery_lng double precision,
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_buyer_id_idx on public.orders (buyer_id);
create index orders_seller_id_idx on public.orders (seller_id);
create index orders_courier_id_idx on public.orders (courier_id);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

-- ---------------------------------------------------------------
-- COURIER LOCATIONS (rastreamento em tempo real)
-- ---------------------------------------------------------------
create table public.courier_locations (
  courier_id uuid primary key references public.couriers (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- updated_at helper trigger
-- ---------------------------------------------------------------
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_products_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();
create trigger set_orders_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();
create trigger set_courier_locations_updated_at before update on public.courier_locations
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------
-- HELPER: papel do usuário autenticado
-- ---------------------------------------------------------------
create function public.current_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.couriers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.courier_locations enable row level security;

-- PROFILES: todo mundo autenticado pode ler perfis (nome/avatar públicos),
-- mas só o próprio dono edita, exceto admin que edita qualquer um.
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.current_role() = 'admin');

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- COURIERS
create policy "couriers_select_own_or_admin" on public.couriers
  for select using (id = auth.uid() or public.current_role() = 'admin');

create policy "couriers_insert_own" on public.couriers
  for insert with check (id = auth.uid());

create policy "couriers_update_own_or_admin" on public.couriers
  for update using (id = auth.uid() or public.current_role() = 'admin');

-- PRODUCTS: leitura pública de produtos ativos; escrita só pelo dono ou admin
create policy "products_select_active_or_own_or_admin" on public.products
  for select using (
    status = 'active'
    or seller_id = auth.uid()
    or public.current_role() = 'admin'
  );

create policy "products_insert_own" on public.products
  for insert with check (seller_id = auth.uid());

create policy "products_update_own_or_admin" on public.products
  for update using (seller_id = auth.uid() or public.current_role() = 'admin');

create policy "products_delete_own_or_admin" on public.products
  for delete using (seller_id = auth.uid() or public.current_role() = 'admin');

-- ORDERS: comprador, vendedor, entregador designado, ou admin
create policy "orders_select_participant_or_admin" on public.orders
  for select using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or courier_id = auth.uid()
    or public.current_role() = 'admin'
    or (status = 'pending' and public.current_role() = 'courier')
  );

create policy "orders_insert_own_as_buyer" on public.orders
  for insert with check (buyer_id = auth.uid());

create policy "orders_update_participant_or_admin" on public.orders
  for update using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or courier_id = auth.uid()
    or public.current_role() = 'admin'
    or (status = 'pending' and public.current_role() = 'courier')
  );

-- ORDER_ITEMS: segue a visibilidade do pedido pai
create policy "order_items_select_via_order" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          o.buyer_id = auth.uid()
          or o.seller_id = auth.uid()
          or o.courier_id = auth.uid()
          or public.current_role() = 'admin'
        )
    )
  );

create policy "order_items_insert_via_order" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.buyer_id = auth.uid()
    )
  );

-- COURIER_LOCATIONS: o próprio entregador escreve; participantes do pedido ativo leem
create policy "courier_locations_upsert_own" on public.courier_locations
  for insert with check (courier_id = auth.uid());

create policy "courier_locations_update_own" on public.courier_locations
  for update using (courier_id = auth.uid());

create policy "courier_locations_select_participants" on public.courier_locations
  for select using (
    courier_id = auth.uid()
    or public.current_role() = 'admin'
    or exists (
      select 1 from public.orders o
      where o.courier_id = courier_locations.courier_id
        and o.status in ('picked_up', 'delivering')
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- habilita Realtime nas tabelas usadas para live tracking / pedidos
alter publication supabase_realtime add table public.courier_locations;
alter publication supabase_realtime add table public.orders;
