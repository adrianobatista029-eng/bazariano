-- Fecha uma brecha de segurança: o `role` de um novo usuário vinha direto do
-- metadata que o próprio cliente manda em supabase.auth.signUp() (options.data.role),
-- sem nenhuma checagem no servidor. Qualquer um com o devtools aberto podia se
-- auto-promover a 'admin' ou 'courier' só passando esse campo no cadastro.
--
-- A partir de agora:
--   1. Todo cadastro público sempre nasce 'buyer_seller', ignorando o metadata.
--   2. Virar entregador passa a ser uma ação explícita e controlada pelo banco
--      (register_as_courier), chamada só depois do signup, que só permite a
--      transição buyer_seller -> courier (nunca promove a admin).
--   3. Promoção a admin continua manual, direto no banco — nunca via fluxo público.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.register_as_courier(
  p_vehicle_type text,
  p_vehicle_plate text
)
returns public.couriers as $$
declare
  v_courier public.couriers;
begin
  update public.profiles
  set role = 'courier'
  where id = auth.uid() and role = 'buyer_seller';

  if not found then
    raise exception 'Só é possível virar entregador a partir de uma conta comum recém-criada.';
  end if;

  insert into public.couriers (id, vehicle_type, vehicle_plate)
  values (auth.uid(), p_vehicle_type, p_vehicle_plate)
  returning * into v_courier;

  return v_courier;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.register_as_courier(text, text) from public;
grant execute on function public.register_as_courier(text, text) to authenticated;
