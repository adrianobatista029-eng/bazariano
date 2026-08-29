-- Endereço estruturado do vendedor (rua, número, bairro, cidade, UF) +
-- coordenadas, no mesmo formato que orders.delivery_lat/delivery_lng —
-- necessário pro futuro cálculo de distância/frete usar a mesma lógica
-- pros dois casos (endereço do comprador no pedido e do vendedor aqui).

alter table public.profiles add column street text;
alter table public.profiles add column number text;
alter table public.profiles add column neighborhood text;
alter table public.profiles add column lat double precision;
alter table public.profiles add column lng double precision;
