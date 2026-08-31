-- Guarda o preço original do anúncio (definido na criação) separado do
-- preço atual — assim dá pra mostrar "de X por Y" riscado quando o vendedor
-- baixa o preço, igual outros marketplaces. Um trigger garante que sempre
-- fica preenchido, mesmo que o código esqueça de mandar no insert.
alter table public.products add column original_price_cents integer;
update public.products set original_price_cents = price_cents where original_price_cents is null;
alter table public.products alter column original_price_cents set not null;

create or replace function public.set_product_original_price()
returns trigger
language plpgsql
as $$
begin
  if new.original_price_cents is null then
    new.original_price_cents := new.price_cents;
  end if;
  return new;
end;
$$;

create trigger trg_set_product_original_price
  before insert on public.products
  for each row
  execute function public.set_product_original_price();
