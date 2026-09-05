-- ============================================================
-- Ponte com o sistema do entregador (agora um projeto Supabase à parte)
-- ============================================================
-- orders.courier_id passa a apontar pra um usuário que só existe no banco
-- do entregador — não dá mais pra manter FK pra public.profiles.
alter table public.orders drop constraint if exists orders_courier_id_fkey;

-- Denormalizado de propósito: o webhook abaixo manda o record inteiro do
-- `orders` pro entregador, e o banco dele não tem acesso a `profiles` (é
-- outro projeto) pra resolver o nome do vendedor via join.
alter table public.orders add column if not exists seller_name text;
alter table public.orders add column if not exists courier_lat double precision;
alter table public.orders add column if not exists courier_lng double precision;

update public.orders o
set seller_name = p.full_name
from public.profiles p
where p.id = o.seller_id and o.seller_name is null;

create or replace function public.set_order_seller_name()
returns trigger as $$
begin
  select full_name into new.seller_name from public.profiles where id = new.seller_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_orders_seller_name on public.orders;
create trigger set_orders_seller_name before insert on public.orders
  for each row execute procedure public.set_order_seller_name();

-- ---------------------------------------------------------------
-- Webhook marketplace → entregador: toda vez que um pedido é criado ou
-- muda, avisa a Edge Function sync-order do projeto do entregador, que
-- atualiza o espelho `deliveries` de lá.
--
-- Antes de aplicar esta migration, configure (uma vez, via SQL Editor do
-- Supabase deste projeto):
--   alter database postgres set app.settings.courier_sync_url =
--     'https://<PROJETO-ENTREGADOR>.functions.supabase.co/sync-order';
--   alter database postgres set app.settings.delivery_bridge_secret =
--     '<mesmo valor usado em DELIVERY_BRIDGE_SECRET nos dois lados>';
-- ---------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_courier_system()
returns trigger as $$
begin
  perform net.http_post(
    url := current_setting('app.settings.courier_sync_url', true),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-bridge-secret', current_setting('app.settings.delivery_bridge_secret', true)
    ),
    body := jsonb_build_object('type', TG_OP, 'record', row_to_json(new))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists notify_courier_system_on_order_change on public.orders;
create trigger notify_courier_system_on_order_change
  after insert or update on public.orders
  for each row execute procedure public.notify_courier_system();
