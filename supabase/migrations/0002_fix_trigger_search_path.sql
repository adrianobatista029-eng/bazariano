-- Corrige "type user_role does not exist" no signup: a trigger em auth.users
-- roda sem "public" no search_path por padrão, então o cast para o enum
-- (definido em public) falhava. Fixamos o search_path e qualificamos o
-- schema explicitamente nas funções security definer.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'buyer_seller')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.current_role()
returns public.user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;
