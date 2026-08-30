-- Limpeza real de stories (apaga do banco de verdade, não só esconde):
-- 1) quando o produto/anúncio vinculado deixa de estar ativo (removido,
--    pausado) ou, no caso de produto, o estoque zera ("vendido");
-- 2) quando passam 24h (expires_at), via job agendado;
-- 3) apagar manualmente (o próprio usuário, estilo Instagram) é feito direto
--    pelo client — já coberto pela policy "stories_delete_own_or_admin".
--
-- A EXCLUSÃO DO ARQUIVO no Storage exige a API de Storage (não dá pra apagar
-- o objeto de verdade só com SQL) e a policy do bucket "stories" só deixa o
-- próprio dono apagar seus arquivos. Por isso o trigger/job abaixo apenas
-- apaga a LINHA da tabela `stories` e anota o caminho do arquivo em
-- `stories_pending_cleanup`; a própria sessão do vendedor (autenticada como
-- ele) varre essa fila e apaga os arquivos do Storage na próxima vez que ele
-- usa o app (ver `sweepMyPendingStoryCleanup` em packages/supabase).

create table public.stories_pending_cleanup (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index stories_pending_cleanup_seller_id_idx on public.stories_pending_cleanup (seller_id);

alter table public.stories_pending_cleanup enable row level security;

create policy "stories_pending_cleanup_select_own" on public.stories_pending_cleanup
  for select using (seller_id = auth.uid());

create policy "stories_pending_cleanup_delete_own" on public.stories_pending_cleanup
  for delete using (seller_id = auth.uid());

-- Apaga as stories de um produto e enfileira seus arquivos pra limpeza,
-- reutilizada pelo trigger de produto e pelo job de expiração.
create or replace function public.purge_stories(p_product_id uuid, p_only_expired boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.stories_pending_cleanup (seller_id, storage_path)
  select seller_id, substring(media_url from '/stories/(.*)$')
  from public.stories
  where (p_product_id is null or product_id = p_product_id)
    and (not p_only_expired or expires_at <= now());

  delete from public.stories
  where (p_product_id is null or product_id = p_product_id)
    and (not p_only_expired or expires_at <= now());
end;
$$;

-- Trigger: produto deixou de estar ativo, ou (sendo produto) o estoque
-- zerou — apaga as stories vinculadas na hora.
create or replace function public.cleanup_stories_on_product_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status <> 'active')
     or (coalesce(new.listing_type, 'produto') = 'produto' and new.stock <= 0) then
    perform public.purge_stories(new.id, false);
  end if;
  return new;
end;
$$;

create trigger trg_cleanup_stories_on_product_change
  after update on public.products
  for each row
  execute function public.cleanup_stories_on_product_change();

-- Job agendado: apaga stories com mais de 24h. Precisa da extensão pg_cron
-- habilitada no projeto (Database → Extensions, ou `create extension` abaixo
-- se o seu plano permitir rodar isso direto pelo SQL Editor).
create extension if not exists pg_cron;

create or replace function public.cleanup_expired_stories()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.purge_stories(null, true);
end;
$$;

select cron.schedule(
  'cleanup-expired-stories',
  '0 * * * *',
  $$select public.cleanup_expired_stories();$$
);
