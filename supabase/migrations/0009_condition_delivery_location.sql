-- Campos novos pro fluxo de "Vender" em 2 passos (criar -> pré-visualizar):
-- condição do produto, opções de retirada/entrega independentes, e
-- localização do vendedor (mostrada na tela de criar anúncio).

alter table public.profiles add column city text;
alter table public.profiles add column state text check (state is null or char_length(state) = 2);

alter table public.products add column condition text not null default 'novo'
  check (condition in ('novo', 'seminovo', 'usado'));
alter table public.products add column allow_pickup boolean not null default true;
alter table public.products add column allow_delivery boolean not null default true;

-- não faz sentido um produto sem nenhuma forma de chegar até o comprador
alter table public.products add constraint products_delivery_option_required
  check (allow_pickup or allow_delivery);
