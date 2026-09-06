-- ============================================================
-- Seção rica embaixo da página do produto: especificações + galeria extra
-- ============================================================
alter table public.products add column if not exists specs jsonb not null default '[]'::jsonb;

alter table public.product_media add column if not exists section text not null default 'gallery';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_media_section_check'
  ) then
    alter table public.product_media
      add constraint product_media_section_check check (section in ('gallery', 'details'));
  end if;
end $$;
