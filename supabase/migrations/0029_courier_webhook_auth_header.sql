-- ============================================================
-- Corrige 401 "UNAUTHORIZED_NO_AUTH_HEADER" no webhook marketplace -> entregador
-- ============================================================
-- Edge Functions do Supabase exigem um Authorization válido (verificação de
-- JWT da própria plataforma) antes mesmo de rodar o código da function —
-- isso é separado do nosso x-bridge-secret, que continua sendo a
-- autorização de verdade dentro da função. Sem esse header, a plataforma
-- barrava a chamada com 401 antes de chegar no sync-order.
create or replace function public.notify_courier_system()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://oixngxhypizudmdxdgsd.supabase.co/functions/v1/sync-order',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer sb_publishable_7WkaE7RodA51UecemHqIlQ_An8iZKUe',
      'x-bridge-secret', '355e95bbd4cb2a291f07b95cff05bdeb8ada5031c8ab3c68e92f9b0a89f12c18'
    ),
    body := jsonb_build_object('type', TG_OP, 'record', row_to_json(new))
  );
  return new;
end;
$$ language plpgsql security definer;
