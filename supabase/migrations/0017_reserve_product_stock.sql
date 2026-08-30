-- Função pra ajustar o estoque de um produto de forma segura contra corrida
-- (dois compradores levando o último item ao mesmo tempo) e sem depender de
-- o comprador ter permissão de UPDATE na linha do produto (que ele não tem —
-- e não deveria ter, RLS de update de products é só pro dono/admin).
--
-- SECURITY DEFINER: roda com o dono da função (bypassa RLS), mas só faz uma
-- coisa estreita — ajusta `stock` dentro dos limites — nada mais do produto
-- pode ser alterado por aqui.
--
-- `p_delta` negativo reserva estoque (falha se não tiver o suficiente);
-- positivo devolve (usado quando um pedido não é concluído).
create or replace function public.reserve_product_stock(p_product_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_stock integer;
begin
  update public.products
  set stock = stock + p_delta
  where id = p_product_id
    and stock + p_delta >= 0
  returning stock into v_new_stock;

  if v_new_stock is null then
    raise exception 'estoque insuficiente';
  end if;

  return v_new_stock;
end;
$$;

grant execute on function public.reserve_product_stock(uuid, integer) to authenticated;
