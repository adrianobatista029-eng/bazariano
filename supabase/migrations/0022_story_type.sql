-- Etiqueta de conteúdo do story (produto, vídeo, promoção, entrega, local),
-- escolhida pelo vendedor antes de postar — define o ícone e a animação do
-- anel na tray, independente do listing_type do anúncio vinculado.
alter table public.stories
  add column story_type text not null default 'produto'
  check (story_type in ('produto', 'video', 'promocao', 'entrega', 'local'));
