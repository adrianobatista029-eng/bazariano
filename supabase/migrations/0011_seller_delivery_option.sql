-- Terceira modalidade de entrega: o próprio vendedor leva até o comprador
-- (sem entregador do app envolvido), além de retirada e envio pelo app.

alter table public.products add column allow_seller_delivery boolean not null default false;

alter table public.products drop constraint products_delivery_option_required;
alter table public.products add constraint products_delivery_option_required
  check (allow_pickup or allow_delivery or allow_seller_delivery);
