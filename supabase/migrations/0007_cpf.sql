-- CPF no cadastro. Validação de verdade (dígitos verificadores), não só
-- "11 números" — tanto no banco (defesa contra bypass do client) quanto no
-- client (feedback imediato pro usuário).

create or replace function public.is_valid_cpf(p_cpf text)
returns boolean
language plpgsql
immutable
as $$
declare
  digits text;
  d1 int := 0;
  d2 int := 0;
  sum1 int := 0;
  sum2 int := 0;
  i int;
begin
  digits := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');

  if length(digits) <> 11 then
    return false;
  end if;

  -- rejeita sequências tipo 111.111.111-11 (matematicamente "válidas" pro
  -- cálculo do dígito verificador, mas nunca são CPFs reais)
  if digits ~ '^(\d)\1{10}$' then
    return false;
  end if;

  for i in 1..9 loop
    sum1 := sum1 + (substr(digits, i, 1)::int) * (11 - i);
  end loop;
  d1 := (sum1 * 10) % 11;
  if d1 = 10 then d1 := 0; end if;

  for i in 1..10 loop
    sum2 := sum2 + (substr(digits, i, 1)::int) * (12 - i);
  end loop;
  d2 := (sum2 * 10) % 11;
  if d2 = 10 then d2 := 0; end if;

  return digits = (substr(digits, 1, 9) || d1::text || d2::text);
end;
$$;

alter table public.profiles add column cpf text;
alter table public.profiles add constraint profiles_cpf_valid check (cpf is null or public.is_valid_cpf(cpf));
create unique index profiles_cpf_unique_idx on public.profiles (cpf) where cpf is not null;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, cpf)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'cpf', ''), '\D', '', 'g'), '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
