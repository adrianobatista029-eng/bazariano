-- ============================================================
-- Ponte com o sistema do entregador (agora um projeto Supabase à parte)
-- ============================================================
-- orders.courier_id passa a apontar pra um usuário que só existe no banco
-- do entregador — não dá mais pra manter FK pra public.profiles.
alter table public.orders drop constraint if exists orders_courier_id_fkey;

-- Mesmo problema em reviews.reviewee_id quando target_type = 'courier': a
-- FK exigia que o avaliado existisse em profiles, mas entregador nunca mais
-- vai ter linha aqui. Sem isso, toda avaliação de entregador quebraria com
-- violação de FK assim que o corte pro banco novo acontecer de verdade. A
-- checagem de "quem pode ser avaliado" continua garantida pela policy
-- reviews_insert_valid_participant (0005_reviews.sql, compara reviewee_id
-- com orders.courier_id) — só a integridade referencial no Postgres é que
-- não dá mais pra manter pra esse caso.
alter table public.reviews drop constraint if exists reviews_reviewee_id_fkey;

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
-- A URL e o segredo ficam embutidos direto na função (em vez de
-- `current_setting`/`alter database ... set`) porque o Supabase hospedado
-- não dá permissão de superuser pra configurar parâmetros customizados no
-- banco — só o dono do projeto lê o código desta função mesmo assim.
-- Se o segredo mudar, é só rodar este `create or replace function` de novo
-- com o valor novo.
-- ---------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_courier_system()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://oixngxhypizudmdxdgsd.supabase.co/functions/v1/sync-order',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-bridge-secret', '355e95bbd4cb2a291f07b95cff05bdeb8ada5031c8ab3c68e92f9b0a89f12c18'
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
